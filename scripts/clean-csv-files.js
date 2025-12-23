#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class CSVCleaner {
    constructor() {
        this.dictionaryDir = path.join(__dirname, '..', 'data', 'dictionary', 'sources');
        this.backupDir = path.join(__dirname, '..', 'data', 'dictionary', 'sources', 'backup');
        this.sourceLanguages = ['danish', 'norwegian', 'swedish'];
        this.stats = {
            danish: { total: 0, cleaned: 0, removed: 0, errors: 0 },
            norwegian: { total: 0, cleaned: 0, removed: 0, errors: 0 },
            swedish: { total: 0, cleaned: 0, removed: 0, errors: 0 }
        };
    }

    /**
     * Remove Wiktionary template syntax like {{template}}
     */
    removeTemplates(text) {
        if (!text) return '';
        
        // Remove nested templates - do multiple passes
        let cleaned = text;
        let maxIterations = 10;
        let iteration = 0;
        
        while (iteration < maxIterations && /\{\{/.test(cleaned)) {
            // Remove templates with any content including empty ones
            cleaned = cleaned.replace(/\{\{[^{}]*\}\}/g, '');
            // Also remove completely empty templates or ones with just whitespace/pipes
            cleaned = cleaned.replace(/\{\{\s*[|:]*\s*\}\}/g, '');
            iteration++;
        }
        
        return cleaned;
    }

    /**
     * Remove and clean wiki links [[link|text]] or [[link]]
     */
    cleanWikiLinks(text) {
        if (!text) return '';
        
        let cleaned = text;
        
        // [[link|display text]] -> display text
        cleaned = cleaned.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
        
        // [[link]] -> link
        cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, '$1');
        
        // Remove incomplete wikilinks (opening [[ without closing ]])
        cleaned = cleaned.replace(/\[\[[^\]]*$/g, '');
        cleaned = cleaned.replace(/\[\[[^\]]*(?=\s|$)/g, '');
        
        return cleaned;
    }

    /**
     * Remove section headers like ====Header====
     */
    removeSectionHeaders(text) {
        if (!text) return '';
        
        // Remove wiki section headers (any number of = signs)
        return text.replace(/={2,}[^=]+={2,}/g, '');
    }

    /**
     * Remove HTML tags
     */
    removeHtmlTags(text) {
        if (!text) return '';
        
        // Remove complete HTML tags
        let cleaned = text.replace(/<[^>]+>/g, '');
        
        // Remove incomplete HTML tags (edge cases)
        cleaned = cleaned.replace(/<[^>]*$/g, ''); // Incomplete closing tag at end
        cleaned = cleaned.replace(/^[^<]*>/g, ''); // Incomplete opening tag at start
        cleaned = cleaned.replace(/\[ref>/gi, ''); // Specific patterns
        cleaned = cleaned.replace(/<br\s*\/?>/gi, '');
        
        return cleaned;
    }

    /**
     * Remove wiki table markup
     */
    removeTableMarkup(text) {
        if (!text) return '';
        
        let cleaned = text;
        
        // Remove table start/end
        cleaned = cleaned.replace(/\{\|[^\n]*/g, '');
        cleaned = cleaned.replace(/\|\}/g, '');
        
        // Remove table rows starting with |
        cleaned = cleaned.replace(/^\|[^{]/gm, '');
        
        return cleaned;
    }

    /**
     * Remove list markup (* and #)
     */
    removeListMarkup(text) {
        if (!text) return '';
        
        let cleaned = text;
        
        // Remove bullet points and numbering at line start
        cleaned = cleaned.replace(/^\*+\s*/gm, '');
        cleaned = cleaned.replace(/^#+\s*/gm, '');
        
        // Remove definition indents
        cleaned = cleaned.replace(/^:+\s*/gm, '');
        
        // Remove bold/italic wiki markup
        cleaned = cleaned.replace(/'{2,}/g, '');
        
        return cleaned;
    }

    /**
     * Clean IPA field - extract only phonetic notation
     */
    cleanIPA(ipa) {
        if (!ipa) return '';
        
        // First remove all markup
        let cleaned = this.removeAllMarkup(ipa);
        
        // Remove HTML entities
        cleaned = cleaned.replace(/&nbsp;/gi, ' ');
        cleaned = cleaned.replace(/&[a-z]+;/gi, '');
        cleaned = cleaned.replace(/&#\d+;/gi, '');
        
        // Remove any remaining template-like patterns (including incomplete ones)
        cleaned = cleaned.replace(/\{\{[^}]*\}\}/g, '');
        cleaned = cleaned.replace(/\}\}[^{]*/g, ''); // Incomplete template closings
        cleaned = cleaned.replace(/[^}]*\{\{/g, ''); // Incomplete template openings
        
        // Remove incomplete brackets and HTML fragments
        cleaned = cleaned.replace(/\[ref>/gi, '');
        cleaned = cleaned.replace(/\[>/g, '');
        cleaned = cleaned.replace(/<[^\]]*\]/g, '');
        cleaned = cleaned.replace(/>\s*\[/g, '');
        
        // Remove incomplete double brackets (wikilinks without closing)
        cleaned = cleaned.replace(/\[\[[^\]]*$/g, '');
        cleaned = cleaned.replace(/\[\[[^\]]{0,20}(?=\s|$)/g, '');
        
        // Remove URLs in IPA field
        cleaned = cleaned.replace(/https?:\/\/[^\s\]]+/gi, '');
        cleaned = cleaned.replace(/\w+\.(wiktionary|wikisource)\.org[^\s\]]*/gi, '');
        
        // Extract content from brackets [...]
        const bracketMatches = cleaned.match(/\[([^\]]+)\]/g);
        if (bracketMatches && bracketMatches.length > 0) {
            // Take the first bracket content that looks like IPA
            for (const match of bracketMatches) {
                const content = match.slice(1, -1); // Remove brackets
                // Check if it looks like IPA (contains IPA-like characters)
                // Reject if it contains HTML fragments, wiki markup, or is too long
                if (content.length < 100 && 
                    !/\s{3,}/.test(content) &&
                    !/</.test(content) &&
                    !/>/.test(content) &&
                    !/'''/.test(content) &&
                    !/\{\{/.test(content) &&
                    !/\[\[/.test(content) &&
                    !/\|/.test(content)) {
                    return `[${content}]`;
                }
            }
        }
        
        // If no valid bracket found, return cleaned text if short enough and valid
        cleaned = cleaned.trim();
        if (cleaned.length > 0 && cleaned.length < 50 && 
            !/</.test(cleaned) && !/>/.test(cleaned) &&
            !/\[/.test(cleaned) && !/\]/.test(cleaned) &&
            !/\{/.test(cleaned) && !/\}/.test(cleaned) &&
            !/\|/.test(cleaned)) {
            return cleaned;
        }
        
        return '';
    }

    /**
     * Clean definition field - extract primary definition only
     */
    cleanDefinition(definition) {
        if (!definition) return '';
        
        // Remove all markup first
        let cleaned = this.removeAllMarkup(definition);
        
        // Remove HTML entities
        cleaned = cleaned.replace(/&nbsp;/gi, ' ');
        cleaned = cleaned.replace(/&[a-z]+;/gi, '');
        cleaned = cleaned.replace(/&#\d+;/gi, '');
        
        // Remove bold/italic markers that might remain
        cleaned = cleaned.replace(/'{2,}/g, '');
        
        // Remove parenthetical markup remnants like ('''')
        cleaned = cleaned.replace(/\(['"]{2,}\)/g, '');
        
        // Remove incomplete wikilinks at end of text
        cleaned = cleaned.replace(/\[\[[^\]]*$/g, '');
        
        // Remove template remnants with pipes (like |color)
        cleaned = cleaned.replace(/\|[^|]*\}\}/g, '');
        cleaned = cleaned.replace(/\{\{[^|]*\|/g, '');
        
        // Remove color codes and template fragments
        cleaned = cleaned.replace(/[A-F0-9]{6}\|/g, '');
        
        // Take only the first sentence or clause (before markup indicators)
        // Split on common section indicators
        const splits = cleaned.split(/\n{2,}|====|===|Etymologi|Översättningar|Grammatikk|Uttale|Synonymer|Antonymer/i);
        cleaned = splits[0].trim();
        
        // Remove excessive whitespace
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        // Remove patterns like "af ." or "of ." that indicate incomplete definitions
        cleaned = cleaned.replace(/\s+(af|of|av)\s*\.\s*$/i, '');
        
        // If definition is too short or looks invalid, return empty
        if (cleaned.length < 3 || /^[\(\)'".\s]+$/.test(cleaned)) {
            return '';
        }
        
        // Limit length to reasonable definition size
        if (cleaned.length > 500) {
            // Try to cut at sentence boundary
            const sentenceEnd = cleaned.substring(0, 500).lastIndexOf('.');
            if (sentenceEnd > 100) {
                cleaned = cleaned.substring(0, sentenceEnd + 1);
            } else {
                cleaned = cleaned.substring(0, 500) + '...';
            }
        }
        
        return cleaned.trim();
    }

    /**
     * Remove all types of markup
     */
    removeAllMarkup(text) {
        if (!text) return '';
        
        let cleaned = text;
        
        // Apply all cleaning functions
        cleaned = this.removeTemplates(cleaned);
        cleaned = this.cleanWikiLinks(cleaned);
        cleaned = this.removeSectionHeaders(cleaned);
        cleaned = this.removeHtmlTags(cleaned);
        cleaned = this.removeTableMarkup(cleaned);
        cleaned = this.removeListMarkup(cleaned);
        
        // Remove HTML entities
        cleaned = cleaned.replace(/&nbsp;/gi, ' ');
        cleaned = cleaned.replace(/&[a-z]+;/gi, '');
        cleaned = cleaned.replace(/&#\d+;/gi, '');
        
        // Remove URLs
        cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
        cleaned = cleaned.replace(/\w+\.wiktionary\.org[^\s]*/g, '');
        
        // Remove reference markers and fragments
        cleaned = cleaned.replace(/\[ref>/gi, '');
        cleaned = cleaned.replace(/<ref[^>]*>/gi, '');
        cleaned = cleaned.replace(/<\/ref>/gi, '');
        
        // Remove stray brackets and incomplete markup
        cleaned = cleaned.replace(/\[>/g, '');
        cleaned = cleaned.replace(/<\]/g, '');
        
        // Remove excessive whitespace
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        return cleaned.trim();
    }

    /**
     * Validate if entry should be kept
     */
    shouldKeepEntry(entry) {
        // Remove entries that are pure markup or empty
        if (!entry.word || entry.word.trim() === '') {
            return false;
        }
        
        // Remove entries that are just section headers
        if (/^={2,}/.test(entry.word)) {
            return false;
        }
        
        // Remove entries that are template syntax
        if (/^\{\{/.test(entry.word)) {
            return false;
        }
        
        // Remove entries without English translation
        if (!entry.english || entry.english.trim() === '') {
            return false;
        }
        
        // Remove entries where word is just punctuation or symbols
        if (/^[\[\]{}|:*#]+$/.test(entry.word)) {
            return false;
        }
        
        // Remove entries with invalid or too-short definitions
        if (entry.definition && entry.definition.trim().length < 3) {
            return false;
        }
        
        // Remove entries where definition is just markup remnants
        if (entry.definition && /^[\(\)'".\s]+$/.test(entry.definition.trim())) {
            return false;
        }
        
        // Remove entries where word field contains Wiktionary markup patterns
        if (/\{\{/.test(entry.word) || /\[\[/.test(entry.word)) {
            return false;
        }
        
        // Remove entries where word field contains citation markers
        if (/^#:/.test(entry.word) || /\|titel=/.test(entry.word)) {
            return false;
        }
        
        // Remove entries where word field starts with # or * (list markers)
        if (/^[#*]/.test(entry.word)) {
            return false;
        }
        
        // Remove entries where word field contains URLs or wiki links
        if (/https?:\/\//.test(entry.word) || /\.wiktionary\./.test(entry.word) || /\.wikisource\./.test(entry.word)) {
            return false;
        }
        
        // Remove entries where word has multiple quotes in a row (malformed CSV)
        if (/"{2,}/.test(entry.word)) {
            return false;
        }
        
        // Remove entries where word contains newlines or excessive spaces (malformed)
        if (/\n/.test(entry.word) || /\s{3,}/.test(entry.word)) {
            return false;
        }
        
        // Remove entries that look like sentence fragments (contain spaces and punctuation typical of sentences)
        if (entry.word && /^[A-ZÅÄÖ]/.test(entry.word) && /\s+\w+\s+\w+/.test(entry.word) && /[.,!?;:]/.test(entry.word)) {
            return false;
        }
        
        // Remove entries where word contains brackets or parentheses (likely fragments)
        if (/[\[\]<>]/.test(entry.word)) {
            return false;
        }
        
        // Remove entries where English field is empty but word looks like a phrase
        if (!entry.english && entry.word && entry.word.split(/\s+/).length > 3) {
            return false;
        }
        
        return true;
    }

    /**
     * Clean a single entry
     */
    cleanEntry(entry) {
        // Clean word field more aggressively
        let word = entry.word ? entry.word.trim() : '';
        
        // Remove any remaining markup from word field
        word = word.replace(/\{\{[^}]*\}\}/g, '');
        word = word.replace(/\[\[[^\]]*\]\]/g, '');
        word = word.replace(/'''*/g, '');
        word = word.replace(/^#:+/g, '');
        word = word.replace(/<[^>]*>/g, '');
        word = word.trim();
        
        const cleaned = {
            word: word,
            english: entry.english ? this.removeAllMarkup(entry.english) : '',
            pos: entry.pos ? entry.pos.trim().toLowerCase() : '',
            gender: entry.gender ? entry.gender.trim().toLowerCase() : '',
            frequency: entry.frequency ? entry.frequency.trim() : '',
            ipa: entry.ipa ? this.cleanIPA(entry.ipa) : '',
            definition: entry.definition ? this.cleanDefinition(entry.definition) : ''
        };
        
        // Validate POS
        const validPOS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 
                          'conjunction', 'interjection', 'article', 'determiner', 'numeral'];
        if (cleaned.pos && !validPOS.includes(cleaned.pos)) {
            // Try to map common variations
            const posMap = {
                'substantiv': 'noun',
                'verbum': 'verb',
                'adjektiv': 'adjective',
                'adverbium': 'adverb',
                'pronomen': 'pronoun',
                'preposisjon': 'preposition',
                'konjunktion': 'conjunction',
                'interjektion': 'interjection',
                'artikel': 'article'
            };
            cleaned.pos = posMap[cleaned.pos] || cleaned.pos;
        }
        
        // Validate gender
        const validGender = ['common', 'neuter', 'masculine', 'feminine', 'c', 'n', 'm', 'f'];
        if (cleaned.gender && !validGender.includes(cleaned.gender)) {
            // Map common variations
            const genderMap = {
                'en': 'common',
                'et': 'neuter',
                'ett': 'neuter',
                'fælles': 'common',
                'intetkøn': 'neuter'
            };
            cleaned.gender = genderMap[cleaned.gender] || '';
        }
        
        return cleaned;
    }

    /**
     * Detect duplicates in entries
     */
    removeDuplicates(entries) {
        const seen = new Map();
        const unique = [];
        
        for (const entry of entries) {
            const key = entry.word.toLowerCase();
            
            if (!seen.has(key)) {
                seen.set(key, entry);
                unique.push(entry);
            } else {
                // Keep the entry with more complete information
                const existing = seen.get(key);
                
                // Score entries based on completeness
                const scoreEntry = (e) => {
                    let score = 0;
                    if (e.definition && e.definition.length > 10) score += 3;
                    if (e.ipa && e.ipa.length > 2) score += 2;
                    if (e.frequency && parseInt(e.frequency) > 0) score += 1;
                    if (e.pos) score += 1;
                    return score;
                };
                
                if (scoreEntry(entry) > scoreEntry(existing)) {
                    // Replace with better entry
                    seen.set(key, entry);
                    const index = unique.findIndex(e => e.word.toLowerCase() === key);
                    if (index !== -1) {
                        unique[index] = entry;
                    }
                }
            }
        }
        
        return unique;
    }

    /**
     * Escape CSV field (wrap in quotes if needed, escape internal quotes)
     */
    escapeCsvField(field) {
        if (field === null || field === undefined) {
            return '""';
        }
        
        const str = String(field);
        
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        
        // Otherwise wrap in quotes for consistency with original format
        return `"${str}"`;
    }

    /**
     * Backup original file
     */
    async backupFile(lang) {
        const sourcePath = path.join(this.dictionaryDir, `${lang}.csv`);
        const backupPath = path.join(this.backupDir, `${lang}.csv.backup.${Date.now()}`);
        
        // Create backup directory if it doesn't exist
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        // Copy file
        fs.copyFileSync(sourcePath, backupPath);
        console.log(`  ✓ Backed up to: ${backupPath}`);
    }

    /**
     * Clean a single language file
     */
    async cleanFile(lang) {
        console.log(`\nProcessing ${lang.toUpperCase()}...`);
        
        const filePath = path.join(this.dictionaryDir, `${lang}.csv`);
        const entries = [];
        
        // Read entries
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    this.stats[lang].total++;
                    entries.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });
        
        console.log(`  Read ${entries.length} entries`);
        
        // Backup original file
        await this.backupFile(lang);
        
        // Clean entries
        const cleaned = [];
        for (const entry of entries) {
            try {
                const cleanedEntry = this.cleanEntry(entry);
                
                if (this.shouldKeepEntry(cleanedEntry)) {
                    cleaned.push(cleanedEntry);
                    this.stats[lang].cleaned++;
                } else {
                    this.stats[lang].removed++;
                }
            } catch (error) {
                console.error(`  ✗ Error cleaning entry "${entry.word}": ${error.message}`);
                this.stats[lang].errors++;
            }
        }
        
        // Remove duplicates
        const beforeDedup = cleaned.length;
        const unique = this.removeDuplicates(cleaned);
        const duplicatesRemoved = beforeDedup - unique.length;
        
        if (duplicatesRemoved > 0) {
            console.log(`  ✓ Removed ${duplicatesRemoved} duplicate entries`);
            this.stats[lang].removed += duplicatesRemoved;
        }
        
        // Sort by frequency (descending) then alphabetically
        unique.sort((a, b) => {
            const freqA = parseInt(a.frequency) || 0;
            const freqB = parseInt(b.frequency) || 0;
            if (freqB !== freqA) return freqB - freqA;
            return a.word.localeCompare(b.word);
        });
        
        // Write cleaned file
        const csvLines = [];
        
        // Add header
        csvLines.push('word,english,pos,gender,frequency,ipa,definition');
        
        // Add data rows
        for (const entry of unique) {
            const row = [
                this.escapeCsvField(entry.word),
                this.escapeCsvField(entry.english),
                this.escapeCsvField(entry.pos),
                this.escapeCsvField(entry.gender),
                this.escapeCsvField(entry.frequency),
                this.escapeCsvField(entry.ipa),
                this.escapeCsvField(entry.definition)
            ];
            csvLines.push(row.join(','));
        }
        
        fs.writeFileSync(filePath, csvLines.join('\n'), 'utf8');
        
        console.log(`  ✓ Wrote ${unique.length} cleaned entries`);
        console.log(`  ✓ Removed: ${this.stats[lang].removed} entries`);
        console.log(`  ✓ Errors: ${this.stats[lang].errors} entries`);
    }

    /**
     * Clean all files
     */
    async clean() {
        console.log('='.repeat(80));
        console.log('CSV CLEANING SCRIPT');
        console.log('='.repeat(80));
        console.log('\nThis script will:');
        console.log('  1. Backup original CSV files');
        console.log('  2. Remove Wiktionary markup');
        console.log('  3. Clean IPA and definition fields');
        console.log('  4. Remove invalid/empty entries');
        console.log('  5. Remove duplicate words');
        console.log('  6. Normalize POS and gender values');
        
        // Ask for confirmation in interactive mode
        if (process.stdin.isTTY) {
            console.log('\nPress Ctrl+C to cancel, or Enter to continue...');
            await new Promise(resolve => {
                process.stdin.once('data', resolve);
            });
        }
        
        console.log('\nStarting cleanup...');
        
        for (const lang of this.sourceLanguages) {
            try {
                await this.cleanFile(lang);
            } catch (error) {
                console.error(`\n✗ Error processing ${lang}: ${error.message}`);
                console.error(error.stack);
            }
        }
        
        this.printSummary();
    }

    /**
     * Print summary statistics
     */
    printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('CLEANING SUMMARY');
        console.log('='.repeat(80));
        
        let totalRead = 0;
        let totalCleaned = 0;
        let totalRemoved = 0;
        let totalErrors = 0;
        
        for (const lang of this.sourceLanguages) {
            const stats = this.stats[lang];
            totalRead += stats.total;
            totalCleaned += stats.cleaned;
            totalRemoved += stats.removed;
            totalErrors += stats.errors;
            
            const percentage = stats.total > 0 
                ? ((stats.cleaned / stats.total) * 100).toFixed(1)
                : 0;
            
            console.log(`\n${lang.toUpperCase()}:`);
            console.log(`  Original entries: ${stats.total}`);
            console.log(`  Cleaned entries:  ${stats.cleaned} (${percentage}%)`);
            console.log(`  Removed entries:  ${stats.removed}`);
            console.log(`  Errors:           ${stats.errors}`);
        }
        
        const totalPercentage = totalRead > 0 
            ? ((totalCleaned / totalRead) * 100).toFixed(1)
            : 0;
        
        console.log('\n' + '-'.repeat(80));
        console.log('TOTALS:');
        console.log(`  Original entries: ${totalRead}`);
        console.log(`  Cleaned entries:  ${totalCleaned} (${totalPercentage}%)`);
        console.log(`  Removed entries:  ${totalRemoved}`);
        console.log(`  Errors:           ${totalErrors}`);
        
        console.log('\n' + '='.repeat(80));
        console.log('NEXT STEPS:');
        console.log('='.repeat(80));
        console.log('\n1. Review cleaned CSV files in data/dictionary/sources/');
        console.log('2. Check backups in data/dictionary/sources/backup/');
        console.log('3. Rebuild dictionary: node scripts/build-dictionary.js');
        console.log('4. Verify in webapp that issues are resolved');
        console.log('\nIf you need to restore backups:');
        console.log('  cp data/dictionary/sources/backup/[file] data/dictionary/sources/');
        console.log();
    }
}

// Run the cleaner
const cleaner = new CSVCleaner();
cleaner.clean().catch(error => {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
});