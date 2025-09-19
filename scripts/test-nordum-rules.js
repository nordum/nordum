#!/usr/bin/env node

const DictionaryBuilder = require('./build-dictionary');

/**
 * Test script to verify the new Nordum rules are working correctly
 * Tests the fundamental changes: Bokmål/Danish preference, English loanwords,
 * Norwegian numbers, and Swedish-style question words
 */
class NordumRulesTest {
    constructor() {
        this.builder = new DictionaryBuilder();
        this.testCases = this.createTestCases();
        this.results = [];
    }

    createTestCases() {
        return {
            englishLoanwords: {
                description: 'English loanwords should remain unchanged (Danish practice)',
                cases: [
                    {
                        english: 'computer',
                        translations: {
                            norwegian: { word: 'datamaskin', pos: 'noun', frequency: 1000 },
                            danish: { word: 'computer', pos: 'noun', frequency: 2000 },
                            swedish: { word: 'dator', pos: 'noun', frequency: 1500 }
                        },
                        expected: 'computer',
                        reason: 'English loanword preserved (Danish practice)'
                    },
                    {
                        english: 'email',
                        translations: {
                            norwegian: { word: 'e-post', pos: 'noun', frequency: 800 },
                            danish: { word: 'email', pos: 'noun', frequency: 1800 },
                            swedish: { word: 'mejl', pos: 'noun', frequency: 1200 }
                        },
                        expected: 'email',
                        reason: 'English loanword preserved (Danish practice)'
                    },
                    {
                        english: 'software',
                        translations: {
                            norwegian: { word: 'programvare', pos: 'noun', frequency: 700 },
                            danish: { word: 'software', pos: 'noun', frequency: 1500 },
                            swedish: { word: 'mjukvara', pos: 'noun', frequency: 1000 }
                        },
                        expected: 'software',
                        reason: 'English loanword preserved (Danish practice)'
                    }
                ]
            },

            norwegianNumbers: {
                description: 'Norwegian number system should be preferred (most regular)',
                cases: [
                    {
                        english: 'fifty',
                        translations: {
                            norwegian: { word: 'femti', pos: 'numeral', frequency: 1000 },
                            danish: { word: 'halvtreds', pos: 'numeral', frequency: 1000 },
                            swedish: { word: 'femtio', pos: 'numeral', frequency: 1000 }
                        },
                        expected: 'femti',
                        reason: 'Norwegian number system (most regular)'
                    },
                    {
                        english: 'seventy',
                        translations: {
                            norwegian: { word: 'sytti', pos: 'numeral', frequency: 800 },
                            danish: { word: 'halvfjerds', pos: 'numeral', frequency: 800 },
                            swedish: { word: 'sjuttio', pos: 'numeral', frequency: 800 }
                        },
                        expected: 'sytti',
                        reason: 'Norwegian number system (most regular)'
                    }
                ]
            },

            questionWords: {
                description: 'Question words should use v- pattern (no silent H)',
                cases: [
                    {
                        english: 'what',
                        translations: {
                            norwegian: { word: 'hva', pos: 'pronoun', frequency: 2000 },
                            danish: { word: 'hvad', pos: 'pronoun', frequency: 2000 },
                            swedish: { word: 'vad', pos: 'pronoun', frequency: 2000 }
                        },
                        expected: 'vad',
                        alternatives: ['va'],
                        reason: 'Question word with v- (Swedish pattern, no silent H)'
                    },
                    {
                        english: 'where',
                        translations: {
                            norwegian: { word: 'hvor', pos: 'adverb', frequency: 1800 },
                            danish: { word: 'hvor', pos: 'adverb', frequency: 1800 },
                            swedish: { word: 'var', pos: 'adverb', frequency: 1800 }
                        },
                        expected: 'vor',
                        alternatives: ['var'],
                        reason: 'Question word with v- (Swedish pattern, no silent H)'
                    },
                    {
                        english: 'who',
                        translations: {
                            norwegian: { word: 'hvem', pos: 'pronoun', frequency: 1500 },
                            danish: { word: 'hvem', pos: 'pronoun', frequency: 1500 },
                            swedish: { word: 'vem', pos: 'pronoun', frequency: 1500 }
                        },
                        expected: 'vem',
                        reason: 'Question word with v- (Swedish pattern, no silent H)'
                    }
                ]
            },

            strategicSelection: {
                description: 'Strategic selection for optimal pan-Scandinavian clarity',
                cases: [
                    {
                        english: 'work',
                        translations: {
                            norwegian: { word: 'arbeider', pos: 'verb', frequency: 1500 },
                            danish: { word: 'arbejder', pos: 'verb', frequency: 1400 },
                            swedish: { word: 'arbetar', pos: 'verb', frequency: 1600 }
                        },
                        expected: 'arbeider',
                        reason: 'Bokmål/Danish agreement (preferred foundation)'
                    },
                    {
                        english: 'small',
                        translations: {
                            norwegian: { word: 'liten', pos: 'adjective', frequency: 1200 },
                            danish: { word: 'lille', pos: 'adjective', frequency: 1100 },
                            swedish: { word: 'liten', pos: 'adjective', frequency: 1300 }
                        },
                        expected: 'liten', // Norwegian/Swedish agreement
                        alternatives: ['lille'],
                        reason: 'Norwegian Bokmål form (preferred over Swedish)'
                    }
                ]
            },

            alternativeSpellings: {
                description: 'Alternative spellings should be supported for pronunciation variants',
                cases: [
                    {
                        english: 'what',
                        translations: {
                            norwegian: { word: 'hva', pos: 'pronoun', frequency: 2000 },
                            danish: { word: 'hvad', pos: 'pronoun', frequency: 2000 },
                            swedish: { word: 'vad', pos: 'pronoun', frequency: 2000 }
                        },
                        expected: 'vad',
                        alternatives: ['va'],
                        reason: 'Question word with v- (Swedish pattern, no silent H)'
                    }
                ]
            },

            phoneticAnalysis: {
                description: 'Phonetic considerations should influence spelling',
                cases: [
                    {
                        english: 'hear',
                        translations: {
                            norwegian: { word: 'høre', pos: 'verb', frequency: 1000 },
                            danish: { word: 'høre', pos: 'verb', frequency: 1000 },
                            swedish: { word: 'höra', pos: 'verb', frequency: 1000 }
                        },
                        expected: 'høre',
                        reason: 'Bokmål/Danish agreement (preferred foundation)'
                    }
                ]
            },

            morphologicalDistinctions: {
                description: 'Systematic morphological endings should distinguish grammatical categories',
                cases: [
                    {
                        english: 'works',
                        translations: {
                            norwegian: { word: 'arbeider', pos: 'verb', frequency: 1500 },
                            danish: { word: 'arbejder', pos: 'verb', frequency: 1500 },
                            swedish: { word: 'arbetar', pos: 'verb', frequency: 1500 }
                        },
                        expected: 'arbeider', // Norwegian/Danish arbeider preferred, but with -er ending confirmed
                        reason: 'Verb present tense: -er ending (systematic distinction from noun plurals)'
                    },
                    {
                        english: 'girls',
                        translations: {
                            norwegian: { word: 'jenter', pos: 'noun', frequency: 1200 },
                            danish: { word: 'piger', pos: 'noun', frequency: 1200 },
                            swedish: { word: 'flickor', pos: 'noun', frequency: 1200 }
                        },
                        expected: 'jentar', // Norwegian form preferred
                        reason: 'Noun plurals: -ar ending (systematic distinction from verbs)'
                    }
                ]
            },

            soundPatterns: {
                description: 'Sound pattern alternatives should be supported for pronunciation variants',
                cases: [
                    {
                        english: 'I',
                        translations: {
                            norwegian: { word: 'jeg', pos: 'pronoun', frequency: 2000 },
                            danish: { word: 'jeg', pos: 'pronoun', frequency: 2000 },
                            swedish: { word: 'jag', pos: 'pronoun', frequency: 2000 }
                        },
                        expected: 'jeg', // Primary form jeg (Norwegian/Danish)
                        alternatives: ['jei'], // jei should be available as alternative
                        reason: 'Bokmål/Danish agreement (preferred foundation)'
                    },
                    {
                        english: 'boy',
                        translations: {
                            danish: { word: 'dreng', pos: 'noun', frequency: 1200 }
                        },
                        expected: 'dreng', // No ej pattern here
                        reason: 'Danish form (preferred over Swedish)'
                    }
                ]
            }
        };
    }

    async runTests() {
        console.log('🧪 Testing Nordum Rules Implementation');
        console.log('=====================================\n');

        let totalTests = 0;
        let passedTests = 0;

        for (const [categoryName, category] of Object.entries(this.testCases)) {
            console.log(`📝 ${category.description}`);
            console.log('-'.repeat(50));

            for (const testCase of category.cases) {
                totalTests++;
                const result = await this.runSingleTest(testCase, categoryName);

                if (result.passed) {
                    console.log(`✅ ${testCase.english}: ${result.actual} (${result.reason})`);
                    passedTests++;
                } else {
                    console.log(`❌ ${testCase.english}: Expected "${testCase.expected}", got "${result.actual}"`);
                    console.log(`   Reason: ${result.reason}`);
                }

                this.results.push({
                    category: categoryName,
                    test: testCase.english,
                    expected: testCase.expected,
                    actual: result.actual,
                    passed: result.passed,
                    reason: result.reason
                });
            }
            console.log('');
        }

        // Summary
        console.log('📊 Test Summary');
        console.log('===============');
        console.log(`Total tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
        console.log(`Failed: ${totalTests - passedTests}`);

        if (passedTests === totalTests) {
            console.log('\n🎉 All tests passed! Nordum rules are working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Review the implementation.');
        }

        return {
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            results: this.results
        };
    }

    async runSingleTest(testCase, category) {
        try {
            // Initialize the builder
            await this.builder.init();

            // Test the selection logic
            const selectedForm = this.builder.selectNordumForm(testCase.translations, testCase.english);
            const reason = this.builder.getSelectionReason(selectedForm, testCase.translations, testCase.english);

            // Check if main form or any alternative matches
            let passed = selectedForm === testCase.expected;
            if (!passed && testCase.alternatives) {
                passed = testCase.alternatives.includes(selectedForm);
            }

            return {
                actual: selectedForm,
                passed: passed,
                reason: reason
            };

        } catch (error) {
            return {
                actual: 'ERROR',
                passed: false,
                reason: `Test error: ${error.message}`
            };
        }
    }

    // Additional method to test orthographic rules
    testOrthographicRules() {
        console.log('🔤 Testing Orthographic Rules');
        console.log('=============================\n');

        const orthographicTests = [
            {
                input: 'hvad',
                expected: 'vad',
                rule: 'hv → v transformation'
            },
            {
                input: 'hvor',
                expected: 'var',
                rule: 'hv → v transformation'
            },
            {
                input: 'hvilken',
                expected: 'vilken',
                rule: 'hv → v transformation'
            }
        ];

        orthographicTests.forEach(test => {
            const result = this.builder.applyNordumRules(test.input, 'universal', null);
            const passed = result === test.expected;

            if (passed) {
                console.log(`✅ ${test.input} → ${result} (${test.rule})`);
            } else {
                console.log(`❌ ${test.input} → ${result}, expected ${test.expected} (${test.rule})`);
            }
        });

        console.log('');
    }

    // Method to demonstrate the philosophy behind the changes
    explainPhilosophy() {
        console.log('🎯 Nordum Philosophy Changes');
        console.log('============================\n');

        console.log('1. 🇳🇴🇩🇰🇸🇪 Balanced Scandinavian Foundation');
        console.log('   - Equal respect for Norwegian, Danish, and Swedish');
        console.log('   - Strategic selection for optimal pan-Scandinavian clarity');
        console.log('   - Creates natural bridge across all three languages\n');

        console.log('2. 🔤 English Loanwords (Practical Integration)');
        console.log('   - Keep "computer", "email", "software" unchanged');
        console.log('   - Practical for modern multilingual communication');
        console.log('   - Follows established Scandinavian practice for tech terms\n');

        console.log('3. 🔢 Norwegian Numbers (Most Regular)');
        console.log('   - Use "femti" not "halvtreds" or "femtio"');
        console.log('   - Avoid Danish vigesimal complexity');
        console.log('   - Clear decimal system for all users\n');

        console.log('4. ❓ Question Words (Clear Pronunciation)');
        console.log('   - Use "vad", "var", "vem" with alternatives like "va", "vorfor"');
        console.log('   - Eliminate silent letters for phonetic clarity');
        console.log('   - Multiple spelling variants accommodate pronunciation differences\n');

        console.log('5. 🎤 Alternative Spellings & Phonetic Integration');
        console.log('   - Support both æ/ø and ä/ö vowel variants');
        console.log('   - Multiple valid spellings for pronunciation variants');
        console.log('   - IPA-guided decisions with regional flexibility\n');

        console.log('6. 🔧 Systematic Morphological Distinctions');
        console.log('   - Verbs ALWAYS use -er endings (arbeiter, not arbeitar)');
        console.log('   - Noun plurals ALWAYS use -ar endings (jentar, flickar)');
        console.log('   - Adjective comparatives use -ere (større, not större)');
        console.log('   - Clear grammatical category identification through endings\n');
    }
}

// CLI interface
if (require.main === module) {
    const tester = new NordumRulesTest();

    const runTest = async () => {
        try {
            // Explain the philosophy first
            tester.explainPhilosophy();

            // Test orthographic rules
            tester.testOrthographicRules();

            // Run main rule tests
            const results = await tester.runTests();

            // Exit with appropriate code
            process.exit(results.failed === 0 ? 0 : 1);

        } catch (error) {
            console.error('Test execution failed:', error);
            process.exit(1);
        }
    };

    runTest();
}

module.exports = NordumRulesTest;
