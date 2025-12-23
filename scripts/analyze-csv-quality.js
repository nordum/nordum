#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class CSVQualityAnalyzer {
    constructor() {
        this.dictionaryDir = path.join(__dirname, '..', 'data', 'dictionary', 'sources');
        this.sourceLanguages = ['danish', 'norwegian', 'swedish'];
        this.issues = {
            danish: [],
            norwegian: [],
            swedish: []
        };
        this.stats = {
            danish: { total: 0, clean: 0, issues: 0 },
            norwegian: { total: 0, clean: 0, issues: 0 },
            swedish: { total: 0, clean: 0, issues: 0 }
        };
        this.duplicates = {
            danish: {},
            norwegian: {},
            swedish: {}
        };
    }

    hasWiktionaryMarkup(text) {
        if (!text) return false;

        const patterns = [
            /\{\{[^}]+\}\}/,              // {{template}}
            /\[\[[^\]]+\]\]/,             // [[wikilink]]
            /====.*====/,                 // Wiktionary headers
            /\{\|/,                       // Wiki table start
            /\|\}/,                       // Wiki table end
            /'''.*'''/,                   // Bold markup
            /''.*''/,                     // Italic markup
            /^\*/m,                       // List items
            /^\#/m,                       // Numbered lists
            /{{overs-/,                   // Translation sections
            /{{ö[+-]?\|/,                 // Swedish translation templates
            />.*</,                       // XML-like content
            /^\|/m,                       // Table rows
            /^\:/m,                       // Definition indents
            /\[\[Fil:/i,                  // File links
            /\[Category:/i,               // Category links
            /no\.wiktionary\.org/,        // Wiktionary URLs
            /en\.wiktionary\.org/,
            /sv\.wiktionary\.org/
        ];

        return patterns.some(pattern => pattern.test(text));
    }

    hasExcessiveLength(text, maxLength = 500) {
        return text && text.length > maxLength;
    }

    validatePOSConsistency(word, pos, definition) {
        if (!pos) return true;

        // Check if definition indicates it's a verb form but marked as noun
        const verbPastIndicators = ['preteritum', 'nutid', 'past tense', 'præteritum'];
        const isVerbForm = verbPastIndicators.some(ind =>
            definition && definition.toLowerCase().includes(ind)
        );

        if (isVerbForm && pos !== 'verb') {
            return false;
        }

        // Check if word appears to be inflected but marked as base form
        if (word.endsWith('er') && pos === 'noun') {
            // Could be inflected, needs review
        }

        return true;
    }

    hasSuspiciousData(entry) {
        const issues = [];

        // Check for Wiktionary markup in any field
        if (this.hasWiktionaryMarkup(entry.word)) {
            issues.push('Word contains Wiktionary markup');
        }
        if (this.hasWiktionaryMarkup(entry.english)) {
            issues.push('English translation contains markup');
        }
        if (this.hasWiktionaryMarkup(entry.definition)) {
            issues.push('Definition contains Wiktionary markup');
        }
        if (this.hasWiktionaryMarkup(entry.ipa)) {
            issues.push('IPA contains markup');
        }

        // Check for missing essential fields
        if (!entry.word || entry.word.trim() === '') {
            issues.push('Missing word');
        }
        if (!entry.english || entry.english.trim() === '') {
            issues.push('Missing English translation');
        }

        // Check for excessively long fields (likely contains markup)
        if (entry.definition && entry.definition.length > 500) {
            issues.push('Definition suspiciously long (likely contains markup)');
        }
        if (entry.ipa && entry.ipa.length > 100) {
            issues.push('IPA suspiciously long (likely contains markup)');
        }

        // Check for incorrect POS
        if (!this.validatePOSConsistency(entry.word, entry.pos, entry.definition)) {
            issues.push('Possible POS mismatch');
        }

        // Check for URL fragments
        if (entry.definition && /wiktionary\.org|http:|https:/.test(entry.definition)) {
            issues.push('Definition contains URL');
        }

        return issues;
    }

    checkForDuplicates(lang, word, lineNumber) {
        if (!this.duplicates[lang][word]) {
            this.duplicates[lang][word] = [];
        }
        this.duplicates[lang][word].push(lineNumber);
    }

    async analyzeFile(lang) {
        const filePath = path.join(this.dictionaryDir, `${lang}.csv`);
        console.log(`\nAnalyzing ${lang}.csv...`);

        return new Promise((resolve, reject) => {
            let lineNumber = 1; // Header is line 1
            const entries = [];

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    lineNumber++;
                    this.stats[lang].total++;
                    entries.push({ row, lineNumber });

                    const word = row.word || '';
                    const english = row.english || '';
                    const pos = row.pos || '';
                    const definition = row.definition || '';
                    const ipa = row.ipa || '';

                    // Track duplicates
                    this.checkForDuplicates(lang, word, lineNumber);

                    const issuesForEntry = [];

                    // Check for Wiktionary markup in any field
                    if (this.hasWiktionaryMarkup(definition)) {
                        issuesForEntry.push('Definition contains Wiktionary markup');
                    }

                    if (this.hasWiktionaryMarkup(ipa)) {
                        issuesForEntry.push('IPA field contains Wiktionary markup');
                    }

                    if (this.hasWiktionaryMarkup(word)) {
                        issuesForEntry.push('Word field contains Wiktionary markup');
                    }

                    if (this.hasWiktionaryMarkup(english)) {
                        issuesForEntry.push('English field contains Wiktionary markup');
                    }

                    // Check for excessive length
                    if (this.hasExcessiveLength(definition, 500)) {
                        issuesForEntry.push('Definition is excessively long (likely contains markup)');
                    }

                    if (this.hasExcessiveLength(ipa, 200)) {
                        issuesForEntry.push('IPA field is excessively long (likely contains markup)');
                    }

                    // Check for POS consistency
                    if (!this.validatePOSConsistency(word, pos, definition)) {
                        issuesForEntry.push('POS may be incorrect (verb marked as noun?)');
                    }

                    // Check for missing critical fields
                    if (!word.trim()) {
                        issuesForEntry.push('Missing word');
                    }

                    if (!english.trim()) {
                        issuesForEntry.push('Missing English translation');
                    }

                    if (issuesForEntry.length > 0) {
                        this.stats[lang].issues++;
                        this.issues[lang].push({
                            line: lineNumber,
                            word,
                            english,
                            pos,
                            issues: issuesForEntry,
                            definition: definition.substring(0, 100) + (definition.length > 100 ? '...' : '')
                        });
                    } else {
                        this.stats[lang].clean++;
                    }
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', reject);
        });
    }

    async analyze() {
        console.log('='.repeat(80));
        console.log('CSV DATA QUALITY ANALYSIS');
        console.log('='.repeat(80));

        for (const lang of this.sourceLanguages) {
            await this.analyzeFile(lang);
        }

        this.generateReport();
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('SUMMARY STATISTICS');
        console.log('='.repeat(80));

        for (const lang of this.sourceLanguages) {
            const stats = this.stats[lang];
            const percentage = stats.total > 0 ? ((stats.issues / stats.total) * 100).toFixed(2) : 0;

            console.log(`\n${lang.toUpperCase()}:`);
            console.log(`  Total entries: ${stats.total}`);
            console.log(`  Clean entries: ${stats.clean}`);
            console.log(`  Entries with issues: ${stats.issues} (${percentage}%)`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('DUPLICATE WORDS');
        console.log('='.repeat(80));

        for (const lang of this.sourceLanguages) {
            const duplicates = Object.entries(this.duplicates[lang])
                .filter(([word, lines]) => lines.length > 1)
                .sort((a, b) => b[1].length - a[1].length);

            if (duplicates.length > 0) {
                console.log(`\n${lang.toUpperCase()} - ${duplicates.length} duplicate words:`);
                duplicates.slice(0, 10).forEach(([word, lines]) => {
                    console.log(`  "${word}" appears ${lines.length} times (lines: ${lines.join(', ')})`);
                });
                if (duplicates.length > 10) {
                    console.log(`  ... and ${duplicates.length - 10} more duplicates`);
                }
            } else {
                console.log(`\n${lang.toUpperCase()}: No duplicate words found`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('DETAILED ISSUES');
        console.log('='.repeat(80));

        for (const lang of this.sourceLanguages) {
            if (this.issues[lang].length > 0) {
                console.log(`\n${lang.toUpperCase()} - Top 20 issues:`);

                this.issues[lang].slice(0, 20).forEach(issue => {
                    console.log(`\n  Line ${issue.line}: "${issue.word}" (${issue.english})`);
                    console.log(`  POS: ${issue.pos}`);
                    issue.issues.forEach(i => console.log(`  ⚠ ${i}`));
                    if (issue.definition) {
                        console.log(`  Definition preview: ${issue.definition}`);
                    }
                });

                if (this.issues[lang].length > 20) {
                    console.log(`\n  ... and ${this.issues[lang].length - 20} more issues`);
                }
            }
        }

        // Save detailed report to file
        const reportPath = path.join(__dirname, '..', 'reports', 'csv-quality-report.json');
        const reportDir = path.dirname(reportPath);

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            stats: this.stats,
            duplicates: this.duplicates,
            issues: this.issues
        }, null, 2));

        console.log(`\nDetailed report saved to: ${reportPath}`);
    }
}

// Run the analyzer
const analyzer = new CSVQualityAnalyzer();
analyzer.analyze().catch(error => {
    console.error('Error during analysis:', error);
    process.exit(1);
});
