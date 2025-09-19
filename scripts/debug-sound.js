#!/usr/bin/env node

const DictionaryBuilder = require('./build-dictionary');

async function debugSoundPatterns() {
    const builder = new DictionaryBuilder();
    await builder.init();
    
    console.log('Debugging sound pattern transformation for "jeg":');
    console.log('=================================================');
    
    const word = 'jeg';
    console.log(`Original word: ${word}`);
    
    // Test each step individually
    console.log('\n1. Testing applySoundPatterns directly:');
    const soundResult = builder.applySoundPatterns(word);
    console.log(`   applySoundPatterns("${word}") -> "${soundResult}"`);
    
    console.log('\n2. Testing applyMorphologicalTransformation:');
    const morphResult = builder.applyMorphologicalTransformation(word, 'pronoun');
    console.log(`   applyMorphologicalTransformation("${word}", "pronoun") -> "${morphResult}"`);
    
    console.log('\n3. Testing full applyNordumRules:');
    const fullResult = builder.applyNordumRules(word, 'danish', 'i', 'pronoun');
    console.log(`   applyNordumRules("${word}", "danish", "i", "pronoun") -> "${fullResult}"`);
    
    console.log('\n4. Debugging applySoundPatterns step by step:');
    let testWord = word;
    console.log(`   Starting with: "${testWord}"`);
    
    // Test ej -> ei transformation
    testWord = testWord.replace(/ej/g, 'ei');
    console.log(`   After ej->ei: "${testWord}"`);
    
    // Test øj -> øy transformation
    testWord = testWord.replace(/øj/g, 'øy');
    console.log(`   After øj->øy: "${testWord}"`);
    
    // Test aj -> ai transformation
    testWord = testWord.replace(/aj/g, 'ai');
    console.log(`   After aj->ai: "${testWord}"`);
    
    console.log('\n5. Testing regex pattern matching:');
    console.log(`   /ej/.test("${word}") -> ${/ej/.test(word)}`);
    console.log(`   "jeg".includes("ej") -> ${word.includes('ej')}`);
    console.log(`   "jeg".match(/ej/) -> ${JSON.stringify(word.match(/ej/))}`);
    
    console.log('\n6. Testing case sensitivity:');
    const upperWord = 'JEG';
    console.log(`   applySoundPatterns("${upperWord}") -> "${builder.applySoundPatterns(upperWord)}"`);
    
    console.log('\n7. Testing similar words:');
    const testWords = ['nej', 'vejr', 'arbejder', 'høj', 'maj'];
    for (const testWord of testWords) {
        const result = builder.applySoundPatterns(testWord);
        console.log(`   "${testWord}" -> "${result}"`);
    }
}

if (require.main === module) {
    debugSoundPatterns().catch(console.error);
}

module.exports = { debugSoundPatterns };