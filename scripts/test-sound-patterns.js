#!/usr/bin/env node

const DictionaryBuilder = require('./build-dictionary');

async function testSoundPatterns() {
    const builder = new DictionaryBuilder();
    await builder.init();
    
    console.log('Testing sound pattern transformations:');
    console.log('======================================');
    
    // Test cases for sound pattern transformations
    const testCases = [
        { input: 'arbejder', expected: 'arbeider', description: 'Danish arbejder -> arbeider (ej -> ei)' },
        { input: 'jeg', expected: 'jei', description: 'Danish jeg -> jei (ej -> ei)' },
        { input: 'nej', expected: 'nei', description: 'Danish nej -> nei (ej -> ei)' },
        { input: 'vejr', expected: 'veir', description: 'Danish vejr -> veir (ej -> ei)' },
        { input: 'høj', expected: 'høy', description: 'Danish høj -> høy (øj -> øy)' },
        { input: 'maj', expected: 'mai', description: 'Danish maj -> mai (aj -> ai)' },
        { input: 'arbeider', expected: 'arbeider', description: 'Norwegian arbeider (no transformation needed)' },
        { input: 'arbetar', expected: 'arbetar', description: 'Swedish arbetar (no sound pattern transformation)' },
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        const result = builder.applySoundPatterns(testCase.input);
        const isCorrect = result === testCase.expected;
        
        if (isCorrect) {
            console.log(`✅ ${testCase.description}`);
            console.log(`   Input: ${testCase.input} -> Output: ${result}`);
            passed++;
        } else {
            console.log(`❌ ${testCase.description}`);
            console.log(`   Input: ${testCase.input} -> Output: ${result}, Expected: ${testCase.expected}`);
            failed++;
        }
        console.log('');
    }
    
    console.log('Testing full applyNordumRules with sound patterns:');
    console.log('==================================================');
    
    // Test the full applyNordumRules method with sound patterns
    const fullTestCases = [
        { word: 'arbejder', source: 'danish', english: 'work', pos: 'verb', expected: 'arbeider' },
        { word: 'jeg', source: 'danish', english: 'i', pos: 'pronoun', expected: 'jei' },
        { word: 'nej', source: 'danish', english: 'no', pos: 'interjection', expected: 'nei' },
    ];
    
    for (const testCase of fullTestCases) {
        const result = builder.applyNordumRules(testCase.word, testCase.source, testCase.english, testCase.pos);
        const isCorrect = result === testCase.expected;
        
        if (isCorrect) {
            console.log(`✅ ${testCase.word} (${testCase.source}) -> ${result}`);
            passed++;
        } else {
            console.log(`❌ ${testCase.word} (${testCase.source}) -> ${result}, Expected: ${testCase.expected}`);
            failed++;
        }
    }
    
    console.log('');
    console.log('Results:');
    console.log(`Passed: ${passed}, Failed: ${failed}`);
    
    if (failed > 0) {
        console.log('\n❌ Some tests failed - sound pattern transformation may not be working correctly');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed - sound pattern transformation is working correctly');
    }
}

if (require.main === module) {
    testSoundPatterns().catch(console.error);
}

module.exports = { testSoundPatterns };