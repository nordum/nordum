#!/usr/bin/env node

const DictionaryBuilder = require('./build-dictionary');

async function testMorphologicalTransformation() {
    const builder = new DictionaryBuilder();
    await builder.init();
    
    console.log('Testing morphological transformation for verbs:');
    console.log('===============================================');
    
    // Test cases for verb transformation
    const testCases = [
        { input: 'arbetar', pos: 'verb', expected: 'arbeider', description: 'Swedish arbetar -> arbeider' },
        { input: 'arbeider', pos: 'verb', expected: 'arbeider', description: 'Norwegian arbeider (already correct)' },
        { input: 'arbejder', pos: 'verb', expected: 'arbeider', description: 'Danish arbejder -> arbeider' },
        { input: 'snakkar', pos: 'verb', expected: 'snakker', description: 'Hypothetical snakkar -> snakker' },
        { input: 'kommar', pos: 'verb', expected: 'kommer', description: 'Hypothetical kommar -> kommer' },
        { input: 'arbetar', pos: 'noun', expected: 'arbetar', description: 'Noun should not be transformed' },
        { input: 'flickar', pos: 'noun', expected: 'flikkar', description: 'Noun plural should remain -ar' },
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        const result = builder.applyMorphologicalTransformation(testCase.input, testCase.pos);
        const isCorrect = result === testCase.expected;
        
        if (isCorrect) {
            console.log(`✅ ${testCase.description}`);
            console.log(`   Input: ${testCase.input} (${testCase.pos}) -> Output: ${result}`);
            passed++;
        } else {
            console.log(`❌ ${testCase.description}`);
            console.log(`   Input: ${testCase.input} (${testCase.pos}) -> Output: ${result}, Expected: ${testCase.expected}`);
            failed++;
        }
        console.log('');
    }
    
    console.log('Testing applyNordumRules with verb context:');
    console.log('===========================================');
    
    // Test the full applyNordumRules method
    const fullTestCases = [
        { word: 'arbetar', source: 'swedish', english: 'work', pos: 'verb', expected: 'arbeider' },
        { word: 'arbejder', source: 'danish', english: 'work', pos: 'verb', expected: 'arbeider' },
        { word: 'arbeider', source: 'norwegian', english: 'work', pos: 'verb', expected: 'arbeider' },
    ];
    
    for (const testCase of fullTestCases) {
        const result = builder.applyNordumRules(testCase.word, testCase.source, testCase.english, testCase.pos);
        const isCorrect = result === testCase.expected;
        
        if (isCorrect) {
            console.log(`✅ ${testCase.word} (${testCase.source}, ${testCase.pos}) -> ${result}`);
            passed++;
        } else {
            console.log(`❌ ${testCase.word} (${testCase.source}, ${testCase.pos}) -> ${result}, Expected: ${testCase.expected}`);
            failed++;
        }
    }
    
    console.log('');
    console.log('Results:');
    console.log(`Passed: ${passed}, Failed: ${failed}`);
    
    if (failed > 0) {
        console.log('\n❌ Some tests failed - morphological transformation may not be working correctly');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed - morphological transformation is working correctly');
    }
}

if (require.main === module) {
    testMorphologicalTransformation().catch(console.error);
}

module.exports = { testMorphologicalTransformation };