#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const PO = require('pofile');

class TranslationChecker {
    constructor() {
        this.srcDir = path.join(__dirname, '../src');
        this.i18nDir = path.join(this.srcDir, 'i18n');
        this.templatesDir = path.join(this.srcDir, 'templates');
    }

    async extractTranslationKeys() {
        console.log('Extracting translation keys from templates and JavaScript files...');
        
        const keys = new Set();
        
        // Extract from Handlebars templates
        const templateFiles = await this.findFiles(this.templatesDir, '.hbs');
        for (const file of templateFiles) {
            const content = await fs.readFile(file, 'utf-8');
            // Match {{t "key"}} and {{t "key" "default value"}} patterns
            const templateMatches = content.matchAll(/{{t\s*['"]([^'"]+)['"](?:\s*['"][^'"]*['"])?}}/g);
            for (const match of templateMatches) {

                keys.add(match[1]);
            }
        }
        
        // Extract from JavaScript files
        const jsFiles = await this.findFiles(this.srcDir, '.js');
        for (const file of jsFiles) {
            const content = await fs.readFile(file, 'utf-8');
            // Match t("key") and t('key') patterns
            const jsMatches = content.matchAll(/\bt\(['"]([^'"]+)['"]\)/g);
            for (const match of jsMatches) {

                keys.add(match[1]);
            }
        }
        
        return Array.from(keys).sort();
    }

    async loadPoFile(lang) {
        try {
            const filePath = path.join(this.i18nDir, `${lang}.po`);
            const content = await fs.readFile(filePath, 'utf-8');
            return PO.parse(content);
        } catch (error) {
            console.warn(`Warning: Could not load ${lang}.po`);
            return null;
        }
    }

    async getTranslatedKeysFromPo(po) {
        if (!po) return [];
        
        const translatedKeys = [];
        
        for (const item of po.items) {
            if (item.msgid && item.msgstr && item.msgstr[0] && item.msgstr[0].trim()) {
                // Check if this is a translated string (not empty and not just whitespace)
                translatedKeys.push(item.msgid);
            }
        }
        
        return translatedKeys;
    }

    async getFuzzyKeysFromPo(po) {
        if (!po) return [];
        
        const fuzzyKeys = [];
        
        for (const item of po.items) {
            if (item.msgid && item.flags && item.flags.fuzzy) {
                fuzzyKeys.push(item.msgid);
            }
        }
        
        return fuzzyKeys;
    }

    async getObsoleteKeysFromPo(po) {
        if (!po) return [];
        
        const obsoleteKeys = [];
        
        for (const item of po.items) {
            if (item.msgid && item.extractedComments) {
                const hasObsoleteComment = item.extractedComments.some(comment => 
                    comment.includes('Obsolete:') || comment.includes('UNUSED - Not found in templates')
                );
                if (hasObsoleteComment) {
                    obsoleteKeys.push(item.msgid);
                }
            }
        }
        
        return obsoleteKeys;
    }

    async findFiles(dir, extension) {
        const files = [];
        
        async function scanDirectory(currentDir) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (entry.name.endsWith(extension)) {
                    files.push(fullPath);
                }
            }
        }
        
        await scanDirectory(dir);
        return files;
    }

    async checkTranslations() {
        console.log('Checking translations...\n');
        
        // Extract all keys used in templates
        const templateKeys = await this.extractTranslationKeys();
        console.log(`Found ${templateKeys.length} translation keys in templates\n`);
        
        // Load all PO files
        const languages = ['en', 'da', 'nb', 'nn', 'sv', 'nordum'];
        const poFiles = {};
        
        for (const lang of languages) {
            poFiles[lang] = await this.loadPoFile(lang);
        }
        
        // Check translation coverage
        const results = {};
        
        for (const lang of languages) {
            const po = poFiles[lang];
            
            if (!po) {
                results[lang] = {
                    totalKeys: 0,
                    translatedKeys: 0,
                    missingKeys: templateKeys,
                    fuzzyKeys: [],
                    coverage: '0.0'
                };
                continue;
            }
            
            const translatedKeys = await this.getTranslatedKeysFromPo(po);
            const fuzzyKeys = await this.getFuzzyKeysFromPo(po);
            const obsoleteKeys = await this.getObsoleteKeysFromPo(po);
            
            const missingKeys = templateKeys.filter(key => !translatedKeys.includes(key));
            const coverage = ((templateKeys.length - missingKeys.length) / templateKeys.length * 100).toFixed(1);
            
            results[lang] = {
                totalKeys: po.items.filter(item => item.msgid).length,
                translatedKeys: translatedKeys.length,
                missingKeys,
                fuzzyKeys,
                obsoleteKeys,
                coverage
            };
        }
        
        // Display results
        for (const [lang, data] of Object.entries(results)) {
            console.log(`=== ${lang.toUpperCase()} ===`);
            console.log(`Total keys in PO: ${data.totalKeys}`);
            console.log(`Translated template keys: ${templateKeys.length - data.missingKeys.length}/${templateKeys.length}`);
            console.log(`Coverage: ${data.coverage}%`);
            
            if (data.fuzzyKeys.length > 0) {
                console.log(`\n${data.fuzzyKeys.length} fuzzy translations (need review):`);
                data.fuzzyKeys.forEach(key => console.log(`  - ${key}`));
            }
            
            if (data.missingKeys.length > 0) {
                console.log(`\nMissing ${data.missingKeys.length} translations:`);
                data.missingKeys.forEach(key => console.log(`  - ${key}`));
            }
            
            if (data.obsoleteKeys.length > 0) {
                console.log(`\n${data.obsoleteKeys.length} obsolete keys (can be removed):`);
                data.obsoleteKeys.forEach(key => console.log(`  - ${key}`));
            }
            
            console.log('\n' + '='.repeat(30) + '\n');
        }
        
        // Generate summary
        console.log('=== SUMMARY ===');
        for (const [lang, data] of Object.entries(results)) {
            console.log(`${lang.toUpperCase()}: ${data.coverage}% coverage (${data.missingKeys.length} missing, ${data.fuzzyKeys.length} fuzzy, ${data.obsoleteKeys.length} obsolete)`);
        }
        
        // Check if any language has complete coverage
        const completeCoverage = Object.values(results).filter(result => result.coverage === '100.0');
        if (completeCoverage.length > 0) {
            console.log(`\n✅ ${completeCoverage.length} language(s) have complete coverage!`);
        }
        
        return results;
    }
}

// Run if called directly
if (require.main === module) {
    const checker = new TranslationChecker();
    checker.checkTranslations().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = TranslationChecker;