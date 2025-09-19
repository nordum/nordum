#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const NorwegianImporter = require('./importers/norwegian-importer');
const DanishImporter = require('./importers/danish-importer');
const SwedishImporter = require('./importers/swedish-importer');

/**
 * Main dictionary import runner
 * Coordinates import from all three source languages with proper error handling
 * and progress reporting
 */
class DictionaryImportRunner {
    constructor(options = {}) {
        this.options = {
            parallel: false,
            batchSize: 5000,
            limit: 10000,
            sources: ['norwegian', 'danish', 'swedish'],
            validateOnly: false,
            incrementalUpdate: false,
            outputFormat: 'csv',
            logLevel: 'info',
            ...options
        };
        
        this.importers = new Map();
        this.stats = {
            totalEntries: 0,
            entriesByLanguage: {},
            errors: [],
            startTime: null,
            endTime: null
        };
        
        this.logFile = null;
    }

    async init() {
        console.log('Initializing dictionary import runner...');
        
        // Create log file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join(__dirname, `../logs/import-${timestamp}.log`);
        
        try {
            await fs.mkdir(path.dirname(this.logFile), { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
        
        // Initialize importers
        this.importers.set('norwegian', new NorwegianImporter({
            batchSize: this.options.batchSize,
            limit: this.options.limit
        }));
        
        this.importers.set('danish', new DanishImporter({
            batchSize: this.options.batchSize,
            limit: this.options.limit
        }));
        
        this.importers.set('swedish', new SwedishImporter({
            batchSize: this.options.batchSize,
            limit: this.options.limit
        }));
        
        this.stats.startTime = Date.now();
        this.log('info', 'Import runner initialized');
    }

    async log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };
        
        // Console output
        if (this.options.logLevel === 'debug' || 
            (this.options.logLevel === 'info' && level !== 'debug') ||
            level === 'error') {
            console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
            if (data) console.log(JSON.stringify(data, null, 2));
        }
        
        // File logging
        if (this.logFile) {
            try {
                await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error.message);
            }
        }
    }

    async importLanguage(language) {
        this.log('info', `Starting ${language} import`);
        
        const importer = this.importers.get(language);
        if (!importer) {
            throw new Error(`No importer found for language: ${language}`);
        }
        
        try {
            const startTime = Date.now();
            await importer.import();
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            // Get final statistics
            const entries = await importer.loadFromCSV();
            const entryCount = entries.length;
            
            this.stats.entriesByLanguage[language] = entryCount;
            this.stats.totalEntries += entryCount;
            
            this.log('info', `${language} import completed`, {
                entries: entryCount,
                duration: `${duration.toFixed(1)}s`
            });
            
            return { success: true, entries: entryCount, duration };
            
        } catch (error) {
            this.log('error', `${language} import failed: ${error.message}`, error);
            this.stats.errors.push({ language, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async importAll() {
        this.log('info', 'Starting dictionary import for all languages');
        
        const results = {};
        const selectedSources = this.options.sources.filter(lang => 
            this.importers.has(lang)
        );
        
        if (this.options.parallel) {
            this.log('info', 'Running parallel import');
            
            const promises = selectedSources.map(async (language) => {
                const result = await this.importLanguage(language);
                return { language, result };
            });
            
            const parallelResults = await Promise.allSettled(promises);
            
            parallelResults.forEach(({ status, value, reason }) => {
                if (status === 'fulfilled') {
                    results[value.language] = value.result;
                } else {
                    this.log('error', `Parallel import failed`, reason);
                }
            });
            
        } else {
            this.log('info', 'Running sequential import');
            
            for (const language of selectedSources) {
                results[language] = await this.importLanguage(language);
                
                // Small delay between imports to be respectful
                await this.sleep(1000);
            }
        }
        
        this.stats.endTime = Date.now();
        return results;
    }

    async validateImports() {
        this.log('info', 'Validating imported dictionaries');
        
        const validationResults = {};
        
        for (const language of this.options.sources) {
            try {
                const importer = this.importers.get(language);
                const entries = await importer.loadFromCSV();
                
                const validation = {
                    totalEntries: entries.length,
                    validEntries: 0,
                    invalidEntries: 0,
                    errors: []
                };
                
                for (const entry of entries) {
                    const errors = importer.validateEntry(entry);
                    if (errors.length === 0) {
                        validation.validEntries++;
                    } else {
                        validation.invalidEntries++;
                        validation.errors.push({
                            word: entry.word,
                            errors
                        });
                    }
                }
                
                validationResults[language] = validation;
                
                this.log('info', `${language} validation complete`, {
                    valid: validation.validEntries,
                    invalid: validation.invalidEntries,
                    errorSample: validation.errors.slice(0, 5)
                });
                
            } catch (error) {
                this.log('error', `${language} validation failed: ${error.message}`);
                validationResults[language] = { error: error.message };
            }
        }
        
        return validationResults;
    }

    async analyzeImports() {
        this.log('info', 'Analyzing imported dictionaries');
        
        const analysis = {
            coverage: {},
            overlap: {},
            quality: {},
            recommendations: []
        };
        
        const allEntries = {};
        
        // Load all entries
        for (const language of this.options.sources) {
            try {
                const importer = this.importers.get(language);
                const entries = await importer.loadFromCSV();
                allEntries[language] = entries;
                
                // Coverage analysis
                analysis.coverage[language] = {
                    total: entries.length,
                    byPOS: this.analyzeByPOS(entries),
                    highFrequency: entries.filter(e => parseInt(e.frequency) > 1000).length,
                    withIPA: entries.filter(e => e.ipa && e.ipa.length > 0).length
                };
                
            } catch (error) {
                this.log('error', `Failed to analyze ${language}: ${error.message}`);
            }
        }
        
        // Overlap analysis
        const englishToLanguages = new Map();
        
        for (const [language, entries] of Object.entries(allEntries)) {
            for (const entry of entries) {
                if (!entry.english) continue;
                
                if (!englishToLanguages.has(entry.english)) {
                    englishToLanguages.set(entry.english, new Set());
                }
                englishToLanguages.get(entry.english).add(language);
            }
        }
        
        // Calculate overlap statistics
        let allThree = 0;
        let anyTwo = 0;
        let onlyOne = 0;
        
        englishToLanguages.forEach((languages, english) => {
            if (languages.size === 3) allThree++;
            else if (languages.size === 2) anyTwo++;
            else onlyOne++;
        });
        
        analysis.overlap = {
            allThreeLanguages: allThree,
            anyTwoLanguages: anyTwo,
            onlyOneLanguage: onlyOne,
            totalConcepts: englishToLanguages.size
        };
        
        // Quality recommendations
        if (allThree < anyTwo) {
            analysis.recommendations.push(
                'Low three-way overlap suggests need for more comprehensive source data'
            );
        }
        
        if (analysis.coverage.norwegian?.withIPA < analysis.coverage.norwegian?.total * 0.5) {
            analysis.recommendations.push(
                'Norwegian entries need more IPA transcriptions for phonetic analysis'
            );
        }
        
        this.log('info', 'Import analysis complete', analysis);
        return analysis;
    }

    analyzeByPOS(entries) {
        const posCounts = {};
        entries.forEach(entry => {
            const pos = entry.pos || 'unknown';
            posCounts[pos] = (posCounts[pos] || 0) + 1;
        });
        return posCounts;
    }

    async generateReport() {
        this.log('info', 'Generating import report');
        
        const duration = this.stats.endTime - this.stats.startTime;
        const analysis = await this.analyzeImports();
        
        const report = {
            summary: {
                totalEntries: this.stats.totalEntries,
                entriesByLanguage: this.stats.entriesByLanguage,
                duration: `${(duration / 1000).toFixed(1)}s`,
                errors: this.stats.errors.length,
                successRate: `${(100 * (3 - this.stats.errors.length) / 3).toFixed(1)}%`
            },
            analysis,
            errors: this.stats.errors,
            recommendations: [
                ...analysis.recommendations,
                this.stats.totalEntries < 25000 ? 
                    'Consider increasing batch sizes or adding more data sources' : null,
                this.stats.errors.length > 0 ? 
                    'Review and fix import errors before proceeding with dictionary generation' : null
            ].filter(Boolean),
            nextSteps: [
                'Run "npm run build:dictionary" to generate Nordum dictionary',
                'Run "npm run validate:dictionary" to check linguistic consistency',
                'Review generated dictionary for manual corrections'
            ]
        };
        
        // Write report to file
        const reportPath = path.join(__dirname, '../reports/import-report.json');
        try {
            await fs.mkdir(path.dirname(reportPath), { recursive: true });
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            this.log('info', `Report saved to ${reportPath}`);
        } catch (error) {
            this.log('error', `Failed to save report: ${error.message}`);
        }
        
        return report;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async run() {
        try {
            await this.init();
            
            if (this.options.validateOnly) {
                this.log('info', 'Running validation only');
                const validation = await this.validateImports();
                console.log('\nValidation Results:');
                console.table(validation);
                return;
            }
            
            const results = await this.importAll();
            const report = await this.generateReport();
            
            console.log('\n=== IMPORT SUMMARY ===');
            console.log(`Total entries imported: ${this.stats.totalEntries}`);
            console.log(`Languages processed: ${Object.keys(this.stats.entriesByLanguage).length}`);
            console.log(`Duration: ${((this.stats.endTime - this.stats.startTime) / 1000).toFixed(1)}s`);
            console.log(`Success rate: ${(100 * (3 - this.stats.errors.length) / 3).toFixed(1)}%`);
            
            if (this.stats.errors.length > 0) {
                console.log('\nErrors:');
                this.stats.errors.forEach(error => {
                    console.log(`  ${error.language}: ${error.error}`);
                });
            }
            
            console.log('\nNext steps:');
            report.nextSteps.forEach(step => {
                console.log(`  • ${step}`);
            });
            
            return report;
            
        } catch (error) {
            this.log('error', `Import runner failed: ${error.message}`, error);
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const runner = new DictionaryImportRunner();
    
    // Parse command line arguments
    process.argv.forEach(arg => {
        if (arg === '--parallel') {
            runner.options.parallel = true;
        } else if (arg === '--validate-only') {
            runner.options.validateOnly = true;
        } else if (arg === '--incremental') {
            runner.options.incrementalUpdate = true;
        } else if (arg.startsWith('--batch=')) {
            runner.options.batchSize = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--limit=')) {
            runner.options.limit = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--sources=')) {
            runner.options.sources = arg.split('=')[1].split(',');
        } else if (arg.startsWith('--log-level=')) {
            runner.options.logLevel = arg.split('=')[1];
        }
    });
    
    runner.run()
        .then((report) => {
            console.log('\nImport completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nImport failed:', error.message);
            process.exit(1);
        });
}

module.exports = DictionaryImportRunner;