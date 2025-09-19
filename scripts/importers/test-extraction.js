#!/usr/bin/env node

/**
 * Test script to verify English translation extraction patterns
 * from Wiktionary content
 */

const fs = require('fs').promises;
const path = require('path');

class TranslationExtractionTester {
    constructor() {
        this.testCases = [
            {
                name: 'Danish hus',
                wikitext: `{{-trans-}}
{{top}}
* {{en}}: {{t|en|house}}
* {{eo}}: {{t|eo|domo}}`,
                expected: 'house'
            },
            {
                name: 'Norwegian hus',
                wikitext: `{{-trans-}}
{{top}}
* {{en}}: {{t|en|house}}
* {{sv}}: {{t|sv|hus|n}}`,
                expected: 'house'
            },
            {
                name: 'Swedish hus',
                wikitext: `{{-trans-}}
{{top}}
* {{en}}: {{t|en|house}}
* {{da}}: {{t|da|hus|n}}`,
                expected: 'house'
            },
            {
                name: 'Multiple patterns',
                wikitext: `{{-trans-}}
{{top}}
* {{en}}: {{t+|en|building}}
* {{oversættelse|en|house}}
{{translation|en|home}}`,
                expected: 'building' // Should match first pattern
            },
            {
                name: 'No translation section',
                wikitext: `{{-noun-|da}}
{{pn}} {{n}}
# en bolig`,
                expected: null
            },
            {
                name: 'English section',
                wikitext: `{{=en=}}
: house, home, building`,
                expected: 'house'
            }
        ];
    }

    /**
     * Extract English translation from wikitext using multiple patterns
     */
    extractEnglishTranslation(wikitext) {
        if (!wikitext) return null;

        // Look for English translation templates
        const translationPatterns = [
            /\{\{t\|en\|([^}|]+)/,           // {{t|en|word}}
            /\{\{t\+\|en\|([^}|]+)/,         // {{t+|en|word}}
            /\{\{trad\|en\|([^}|]+)/,        // {{trad|en|word}} (Danish pattern)
            /\{\{overs\|en\|([^}|]+)/,       // {{overs|en|word}} (Norwegian pattern)
            /\{\{ö\|en\|([^}|]+)/,           // {{ö|en|word}} (Swedish pattern)
            /\{\{ö\+\|en\|([^}|]+)/,         // {{ö+|en|word}} (Swedish pattern)
            /\{\{oversættelse\|en\|([^}|]+)/, // {{oversættelse|en|word}}
            /\{\{oversettelse\|en\|([^}|]+)/, // {{oversettelse|en|word}}
            /\{\{översättning\|en\|([^}|]+)/, // {{översättning|en|word}}
            /\{\{translation\|en\|([^}|]+)/,  // {{translation|en|word}}
            /{{en}}\s*:\s*([^\n{}]+)/         // {{en}}: word
        ];

        for (const pattern of translationPatterns) {
            const match = wikitext.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return null;
    }

    /**
     * Run all test cases
     */
    async runTests() {
        console.log('🧪 Testing English Translation Extraction Patterns');
        console.log('==================================================\n');

        let passed = 0;
        let failed = 0;

        for (const testCase of this.testCases) {
            const result = this.extractEnglishTranslation(testCase.wikitext);
            const success = result === testCase.expected;

            console.log(`📝 ${testCase.name}:`);
            console.log(`   Expected: ${testCase.expected}`);
            console.log(`   Got:      ${result}`);
            console.log(`   Status:   ${success ? '✅ PASS' : '❌ FAIL'}`);
            console.log('');

            if (success) {
                passed++;
            } else {
                failed++;
            }
        }

        console.log('📊 Test Results:');
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📈 Total:  ${passed + failed}`);
        console.log('');

        if (failed === 0) {
            console.log('🎉 All tests passed! The extraction patterns are working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the patterns and test cases.');
        }

        return failed === 0;
    }

    /**
     * Test with actual Wiktionary API data
     */
    async testWithRealData() {
        console.log('\n🔍 Testing with Real Wiktionary Data');
        console.log('==================================\n');

        const testWords = [
            { word: 'hus', lang: 'da', expected: 'house' },
            { word: 'arbejde', lang: 'da', expected: 'work' },
            { word: 'bil', lang: 'da', expected: 'car' },
            { word: 'bok', lang: 'no', expected: 'book' },
            { word: 'arbete', lang: 'sv', expected: 'work' }
        ];

        for (const test of testWords) {
            try {
                const url = `https://${test.lang}.wiktionary.org/w/api.php?action=query&format=json&prop=revisions&titles=${encodeURIComponent(test.word)}&rvprop=content&rvslots=main`;
                
                console.log(`🌐 Fetching ${test.word} from ${test.lang}.wiktionary.org...`);
                
                // Use curl or http request to get actual data
                const { exec } = require('child_process');
                const response = await new Promise((resolve, reject) => {
                    exec(`curl -s "${url}"`, (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve(stdout);
                    });
                });

                const data = JSON.parse(response);
                const pages = data.query?.pages;
                if (!pages) {
                    console.log(`   ❌ No data found for ${test.word}`);
                    continue;
                }

                const page = Object.values(pages)[0];
                if (!page.revisions) {
                    console.log(`   ❌ No revisions found for ${test.word}`);
                    continue;
                }

                const wikitext = page.revisions[0].slots.main['*'];
                
                // Debug: show if translation patterns exist
                const hasTranslation = /trad\|en|t\|en|overs\|en|ö\|en/.test(wikitext);
                console.log(`   🔍 Translation patterns found: ${hasTranslation}`);
                
                if (hasTranslation) {
                    // Show the actual translation section
                    const translationMatch = wikitext.match(/\{\{-trans-\}\}.*?(\{\{|\n==)/s);
                    if (translationMatch) {
                        console.log(`   📋 Translation section: ${translationMatch[0].substring(0, 200)}...`);
                    }
                    
                    // Debug: test each pattern individually
                    const patterns = [
                        /\{\{t\|en\|([^}|]+)/,
                        /\{\{t\+\|en\|([^}|]+)/,
                        /\{\{trad\|en\|([^}|]+)/,
                        /\{\{overs\|en\|([^}|]+)/,
                        /\{\{ö\|en\|([^}|]+)/,
                        /\{\{ö\+\|en\|([^}|]+)/
                    ];
                    
                    for (let i = 0; i < patterns.length; i++) {
                        const match = wikitext.match(patterns[i]);
                        if (match) {
                            console.log(`   🎯 Pattern ${i} matched: ${match[0]} -> ${match[1]}`);
                        }
                    }
                }
                
                const translation = this.extractEnglishTranslation(wikitext);

                console.log(`   📝 ${test.word}:`);
                console.log(`      Expected: ${test.expected}`);
                console.log(`      Found:    ${translation}`);
                console.log(`      Status:   ${translation === test.expected ? '✅ MATCH' : '❌ MISMATCH'}`);
                console.log('');

            } catch (error) {
                console.log(`   ❌ Error fetching ${test.word}: ${error.message}`);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// CLI interface
if (require.main === module) {
    const tester = new TranslationExtractionTester();
    
    const command = process.argv[2];
    
    if (command === 'real') {
        tester.testWithRealData()
            .then(() => process.exit(0))
            .catch(error => {
                console.error('Test failed:', error);
                process.exit(1);
            });
    } else {
        tester.runTests()
            .then(success => process.exit(success ? 0 : 1))
            .catch(error => {
                console.error('Test failed:', error);
                process.exit(1);
            });
    }
}

module.exports = TranslationExtractionTester;