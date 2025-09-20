#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const PO = require('pofile');

class JsonToPoConverter {
    constructor() {
        this.srcDir = path.join(__dirname, '../src');
        this.templatesDir = path.join(this.srcDir, 'templates');
        this.i18nDir = path.join(this.srcDir, 'i18n');
        this.potPath = path.join(this.i18nDir, 'messages.pot');
    }

    async ensureDir(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
    }

    async findTemplateFiles() {
        const files = [];
        
        async function scanDirectory(currentDir) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (entry.name.endsWith('.hbs')) {
                    files.push(fullPath);
                }
            }
        }
        
        await scanDirectory(this.templatesDir);
        return files;
    }

    async findJsFiles() {
        const files = [];
        const jsDir = path.join(this.srcDir, 'js');
        
        async function scanDirectory(currentDir) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (entry.name.endsWith('.js')) {
                    files.push(fullPath);
                }
            }
        }
        
        await scanDirectory(jsDir);
        return files;
    }

    async extractTranslationKeys() {
        console.log('Extracting translation keys from templates and JavaScript files...');
        
        const templateFiles = await this.findTemplateFiles();
        const jsFiles = await this.findJsFiles();
        const keys = new Map(); // Use Map to track file references
        
        // Extract from Handlebars templates
        for (const file of templateFiles) {
            const relativePath = path.relative(this.srcDir, file);
            const content = await fs.readFile(file, 'utf-8');
            
            // Match {{t "key"}} and {{t "key" "default value"}} patterns
            const matches = content.matchAll(/{{t\s*['"]([^'"]+)['"](?:\s*['"][^'"]*['"])?}}/g);
            
            for (const match of matches) {
                const key = match[1];
                if (!keys.has(key)) {
                    keys.set(key, new Set());
                }
                keys.get(key).add(relativePath);
            }
        }
        
        // Extract from JavaScript files
        for (const file of jsFiles) {
            const relativePath = path.relative(this.srcDir, file);
            const content = await fs.readFile(file, 'utf-8');
            
            // Match t("key") and t('key') patterns
            const matches = content.matchAll(/\bt\(['"]([^'"]+)['"]\)/g);
            
            for (const match of matches) {
                const key = match[1];
                if (!keys.has(key)) {
                    keys.set(key, new Set());
                }
                keys.get(key).add(relativePath);
            }
        }
        
        return keys;
    }

    async loadExistingPot() {
        try {
            await fs.access(this.potPath);
            const content = await fs.readFile(this.potPath, 'utf-8');
            return PO.parse(content);
        } catch (error) {
            // Create new POT file
            const pot = new PO();
            pot.headers = {
                'Project-Id-Version': 'Nordum Pan-Scandinavian Language',
                'Report-Msgid-Bugs-To': 'https://github.com/nordum/nordum/issues',
                'POT-Creation-Date': new Date().toISOString(),
                'PO-Revision-Date': new Date().toISOString(),
                'Last-Translator': 'Nordum Project <hei@nordum.org>',
                'Language-Team': 'English <hei@nordum.org>',
                'Language': 'en',
                'MIME-Version': '1.0',
                'Content-Type': 'text/plain; charset=UTF-8',
                'Content-Transfer-Encoding': '8bit',
                'Plural-Forms': 'nplurals=2; plural=(n != 1);',
                'X-Generator': 'Nordum JSON to PO Converter'
            };
            return pot;
        }
    }

    getCategoryFromKey(key) {
        const parts = key.split('.');
        return parts.length > 1 ? parts[0] : 'general';
    }

    async convertJsonToPo() {
        console.log('Converting JSON translation keys to PO format...\n');
        
        await this.ensureDir(this.i18nDir);
        
        // Extract keys from templates
        const translationKeys = await this.extractTranslationKeys();
        console.log(`Found ${translationKeys.size} unique translation keys in templates`);
        
        // Load or create POT file
        const pot = await this.loadExistingPot();
        
        // Create map of existing keys for quick lookup
        const existingKeys = new Map();
        pot.items.forEach(item => {
            if (item.msgid) {
                existingKeys.set(item.msgid, item);
            }
        });
        
        let newKeysCount = 0;
        let updatedKeysCount = 0;
        
        // Add new keys to POT file
        for (const [key, fileReferences] of translationKeys) {
            const category = this.getCategoryFromKey(key);
            const fileList = Array.from(fileReferences).join(', ');
            
            if (existingKeys.has(key)) {
                // Update existing entry with new file references if needed
                const existingItem = existingKeys.get(key);
                
                // Check if we need to update from "Template reference" to actual file paths
                const hasTemplateReference = existingItem.extractedComments.some(
                    comment => comment.includes('Template reference')
                );
                
                if (hasTemplateReference) {
                    console.log(`Updating source for key: ${key} -> ${fileList}`);
                    
                    // Clean up duplicate comments first
                    const uniqueComments = [];
                    const seenComments = new Set();
                    
                    for (const comment of existingItem.extractedComments) {
                        const cleanComment = comment.replace(/^#\.\s*/, '').trim();
                        if (!seenComments.has(cleanComment)) {
                            seenComments.add(cleanComment);
                            uniqueComments.push(comment.includes('Template reference') 
                                ? `#. Source: ${fileList}`
                                : comment
                            );
                        }
                    }
                    
                    existingItem.extractedComments = uniqueComments;
                    updatedKeysCount++;
                } else {
                    const currentRefs = existingItem.extractedComments.join('\n');
                    if (!currentRefs.includes(fileList)) {
                        console.log(`Updating source for key: ${key} -> ${fileList}`);
                        existingItem.extractedComments.push(`#. Source: ${fileList}`);
                        updatedKeysCount++;
                    } else {
                        console.log(`Key already up to date: ${key}`);
                    }
                }
            } else {
                // Debug: Show what's happening with new keys
                console.log(`Creating new key: ${key} -> ${fileList}`);
                // Create new entry
                const item = new PO.Item();
                item.msgid = key;
                item.msgstr = [''];
                item.extractedComments = [
                    `#. Key: ${key}`,
                    `#. Source: ${fileList}`,
                    `#. Category: ${category}`
                ];
                pot.items.push(item);
                newKeysCount++;
            }
        }
        
        // Remove obsolete keys (keys that exist in POT but not in templates)
        const obsoleteKeys = pot.items.filter(item => 
            item.msgid && !translationKeys.has(item.msgid)
        );
        
        if (obsoleteKeys.length > 0) {
            console.log(`Found ${obsoleteKeys.length} obsolete keys (will be preserved with comments)`);
            
            // Mark obsolete keys with comments instead of removing them
            for (const item of obsoleteKeys) {
                if (!item.extractedComments.some(comment => comment.includes('#. Obsolete:'))) {
                    item.extractedComments.push('#. Obsolete: Key no longer used in templates');
                }
            }
        }
        
        // Sort items alphabetically by msgid
        pot.items.sort((a, b) => {
            if (!a.msgid) return -1;
            if (!b.msgid) return 1;
            return a.msgid.localeCompare(b.msgid);
        });
        
        // Update headers
        pot.headers['POT-Creation-Date'] = new Date().toISOString();
        pot.headers['PO-Revision-Date'] = new Date().toISOString();
        
        // Save POT file
        console.log(`Writing POT file to: ${this.potPath}`);
        const potContent = pot.toString();
        console.log(`POT content length: ${potContent.length} characters`);
        
        await fs.writeFile(this.potPath, potContent);
        console.log('POT file written successfully');
        
        console.log(`\n✅ Translation template updated:`);
        console.log(`   - Total keys: ${pot.items.length}`);
        console.log(`   - New keys: ${newKeysCount}`);
        console.log(`   - Updated keys: ${updatedKeysCount}`);
        console.log(`   - Obsolete keys: ${obsoleteKeys.length}`);
        console.log(`\n📁 Template file: ${this.potPath}`);
        
        // Verify the file was written
        try {
            const stats = await fs.stat(this.potPath);
            console.log(`📊 File stats: ${stats.size} bytes, modified: ${stats.mtime}`);
        } catch (error) {
            console.error('❌ Failed to verify file:', error.message);
        }
        
        if (newKeysCount > 0) {
            console.log('\n📋 Next steps:');
            console.log('1. Run: npm run translations:update  # Update language PO files');
            console.log('2. Open PO files in Poedit or similar editor');
            console.log('3. Translate the new keys');
            console.log('4. Run: npm run build:i18n          # Compile MO files');
        }
    }

    async run() {
        try {
            await this.convertJsonToPo();
        } catch (error) {
            console.error('❌ Conversion failed:', error);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const converter = new JsonToPoConverter();
    converter.run();
}

module.exports = JsonToPoConverter;