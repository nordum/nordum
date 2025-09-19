#!/usr/bin/env node

/**
 * Test script for API integrations
 * Tests all available dictionary APIs to ensure importers work correctly
 */

const DanishImporter = require('./danish-importer');
const NorwegianImporter = require('./norwegian-importer');
const SwedishImporter = require('./swedish-importer');
const { getApiConfig } = require('./api-config');

class ApiTester {
    constructor() {
        this.config = getApiConfig();
        this.results = {
            danish: {},
            norwegian: {},
            swedish: {}
        };
    }

    async runAllTests() {
        console.log('🔍 Testing Nordum Dictionary API Integrations');
        console.log('==============================================\n');
        
        // Show configuration summary
        console.log('📋 Configuration Summary:');
        this.config.printSummary();
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Test each language
        await this.testDanish();
        await this.testNorwegian();
        await this.testSwedish();
        
        // Print final results
        this.printFinalResults();
    }

    async testDanish() {
        console.log('🇩🇰 Testing Danish APIs...');
        console.log('---------------------------');
        
        const importer = new DanishImporter({
            batchSize: 5,
            rateLimit: 2000
        });
        
        await importer.init();
        
        // Test Wiktionary
        await this.testWiktionary(importer, 'danish', ['arbejde', 'hus']);
        
        // Test ordnet.dk (note: no public API)
        this.results.danish.ordnet = {
            available: false,
            reason: 'No public API available'
        };
        console.log('  ❌ ordnet.dk: No public API available');
        
        console.log('');
    }

    async testNorwegian() {
        console.log('🇳🇴 Testing Norwegian APIs...');
        console.log('-----------------------------');
        
        const importer = new NorwegianImporter({
            batchSize: 5,
            rateLimit: 2000
        });
        
        await importer.init();
        
        // Test Wiktionary
        await this.testWiktionary(importer, 'norwegian', ['arbeide', 'hus']);
        
        console.log('');
    }

    async testSwedish() {
        console.log('🇸🇪 Testing Swedish APIs...');
        console.log('---------------------------');
        
        const importer = new SwedishImporter({
            batchSize: 5,
            rateLimit: 2000
        });
        
        await importer.init();
        
        // Test Wiktionary
        await this.testWiktionary(importer, 'swedish', ['arbete', 'hus']);
        
        // Test Språkbanken (note: requires API key)
        this.results.swedish.spraakbanken = {
            available: false,
            reason: 'Requires API key or special access'
        };
        console.log('  ❓ Språkbanken: Requires API key or special access');
        
        console.log('');
    }

    async testWiktionary(importer, language, testWords) {
        const langCode = language === 'danish' ? 'da' : 
                        language === 'norwegian' ? 'no' : 'sv';
        
        console.log(`  🔍 Testing ${language} Wiktionary...`);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const word of testWords) {
            try {
                const entries = await importer.fetchWiktionaryEntry(word, langCode);
                
                if (entries && entries.length > 0) {
                    successCount++;
                    console.log(`    ✅ ${word}: Found ${entries.length} entries`);
                    
                    // Show sample entry
                    const sample = entries[0];
                    console.log(`       Sample: ${sample.word} (${sample.pos}) - ${sample.english}`);
                } else {
                    console.log(`    ⚠️  ${word}: No entries found`);
                }
                
                // Rate limiting
                await this.sleep(1000);
                
            } catch (error) {
                errorCount++;
                errors.push({ word, error: error.message });
                console.log(`    ❌ ${word}: ${error.message}`);
            }
        }
        
        this.results[language].wiktionary = {
            available: successCount > 0,
            tested: testWords.length,
            successful: successCount,
            errors: errorCount,
            errorDetails: errors
        };
        
        if (successCount > 0) {
            console.log(`  ✅ Wiktionary: ${successCount}/${testWords.length} words successfully fetched`);
        } else {
            console.log(`  ❌ Wiktionary: All requests failed`);
        }
    }

    async testFullImport(language, wordLimit = 10) {
        console.log(`\n🔄 Testing full ${language} import (${wordLimit} words)...`);
        
        let importer;
        switch (language) {
            case 'danish':
                importer = new DanishImporter({ batchSize: wordLimit });
                break;
            case 'norwegian':
                importer = new NorwegianImporter({ batchSize: wordLimit });
                break;
            case 'swedish':
                importer = new SwedishImporter({ batchSize: wordLimit });
                break;
            default:
                console.log(`  ❌ Unknown language: ${language}`);
                return;
        }
        
        try {
            const startTime = Date.now();
            await importer.import();
            const elapsed = Date.now() - startTime;
            
            console.log(`  ✅ ${language} import completed in ${(elapsed / 1000).toFixed(1)}s`);
            importer.printStats();
            
        } catch (error) {
            console.log(`  ❌ ${language} import failed: ${error.message}`);
        }
    }

    printFinalResults() {
        console.log('📊 Final Test Results');
        console.log('====================\n');
        
        for (const [language, services] of Object.entries(this.results)) {
            console.log(`${language.charAt(0).toUpperCase() + language.slice(1)}:`);
            
            for (const [service, result] of Object.entries(services)) {
                if (result.available === true) {
                    console.log(`  ✅ ${service}: Working (${result.successful}/${result.tested} successful)`);
                } else if (result.available === false && result.reason) {
                    console.log(`  ❌ ${service}: ${result.reason}`);
                } else {
                    console.log(`  ❌ ${service}: Not working`);
                }
            }
            console.log('');
        }
        
        // Overall summary
        const totalServices = Object.values(this.results).reduce((sum, lang) => sum + Object.keys(lang).length, 0);
        const workingServices = Object.values(this.results).reduce((sum, lang) => {
            return sum + Object.values(lang).filter(service => service.available === true).length;
        }, 0);
        
        console.log(`Overall: ${workingServices}/${totalServices} services working`);
        
        if (workingServices === 0) {
            console.log('\n⚠️  No APIs are currently working. This could be due to:');
            console.log('   - Network connectivity issues');
            console.log('   - API endpoints being down');
            console.log('   - Missing API keys');
            console.log('   - Rate limiting restrictions');
            console.log('\n💡 Recommendation: Use fallback data or implement local dictionaries');
        } else if (workingServices < totalServices) {
            console.log('\n⚠️  Some APIs are not working. Dictionary imports will use available sources.');
        } else {
            console.log('\n✅ All APIs are working correctly!');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI interface
if (require.main === module) {
    const tester = new ApiTester();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'quick':
            console.log('Running quick API tests...\n');
            tester.runAllTests()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Test failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'full':
            console.log('Running full API tests including imports...\n');
            tester.runAllTests()
                .then(() => tester.testFullImport('danish', 5))
                .then(() => tester.testFullImport('norwegian', 5))
                .then(() => tester.testFullImport('swedish', 5))
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Test failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'config':
            console.log('Showing API configuration...\n');
            const config = getApiConfig();
            config.printSummary();
            break;
            
        case 'danish':
        case 'norwegian':
        case 'swedish':
            console.log(`Testing ${command} APIs only...\n`);
            tester[`test${command.charAt(0).toUpperCase() + command.slice(1)}`]()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Test failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node test-apis.js [command]');
            console.log('Commands:');
            console.log('  quick      - Quick test of all APIs');
            console.log('  full       - Full test including sample imports');
            console.log('  config     - Show API configuration');
            console.log('  danish     - Test Danish APIs only');
            console.log('  norwegian  - Test Norwegian APIs only');
            console.log('  swedish    - Test Swedish APIs only');
            console.log('\nExamples:');
            console.log('  node test-apis.js quick');
            console.log('  node test-apis.js full');
            console.log('  node test-apis.js danish');
    }
}

module.exports = ApiTester;