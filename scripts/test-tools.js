#!/usr/bin/env node

/**
 * Smoke tests for the working web tools.
 * Verifies dictionary data, translator lookup, and spellcheck logic.
 */

const fs = require('fs');
const path = require('path');

const dictionaryPath = path.join(__dirname, '../build/assets/data/dictionary.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf-8'));
const entries = Object.values(dictionary.entries);

let failures = 0;
function assert(condition, message) {
    if (!condition) {
        console.error('❌', message);
        failures++;
    } else {
        console.log('✅', message);
    }
}

console.log(`Loaded dictionary with ${entries.length} entries\n`);

// Basic dictionary sanity
assert(entries.length >= 400, 'Dictionary has at least 400 entries');
assert(entries.some(e => e.english === 'house' && e.pos === 'noun'), 'Has noun "house"');
assert(entries.some(e => e.english === 'work' && e.pos === 'verb'), 'Has verb "work"');
assert(entries.some(e => e.english === 'hello'), 'Has "hello"');
assert(entries.some(e => e.english === 'thanks'), 'Has "thanks"');
assert(entries.some(e => e.english === 'i' && e.pos === 'pronoun'), 'Has pronoun "I"');

// Build indexes for translation testing
const byEnglish = new Map();
const byNordum = new Map();
const bySource = { norwegian: new Map(), danish: new Map(), swedish: new Map() };

for (const entry of entries) {
    if (!entry.nordum) continue;
    byNordum.set(entry.nordum.toLowerCase(), entry);
    if (entry.english) byEnglish.set(entry.english.toLowerCase(), entry);
    for (const lang of ['norwegian', 'danish', 'swedish']) {
        const word = entry.sources?.[lang]?.word;
        if (word) bySource[lang].set(word.toLowerCase(), entry);
    }
}

function translateWord(word, fromLang, toLang) {
    const lower = word.toLowerCase().trim();
    let entry = null;
    if (fromLang === 'nordum') entry = byNordum.get(lower);
    else if (fromLang === 'english') entry = byEnglish.get(lower);
    else if (bySource[fromLang]) entry = bySource[fromLang].get(lower);

    if (!entry) return null;
    if (toLang === 'nordum') return entry.nordum;
    if (toLang === 'english') return entry.english;
    if (entry.sources?.[toLang]?.word) return entry.sources[toLang].word;
    return null;
}

// Translation tests
assert(translateWord('hus', 'nordum', 'english') === 'house', 'nordum "hus" -> english "house"');
assert(translateWord('house', 'english', 'nordum') === 'hus', 'english "house" -> nordum "hus"');
assert(translateWord('hus', 'nordum', 'norwegian') === 'hus', 'nordum "hus" -> norwegian "hus"');
assert(translateWord('hus', 'nordum', 'swedish') === 'hus', 'nordum "hus" -> swedish "hus"');
assert(translateWord('arbeide', 'nordum', 'english') === 'work', 'nordum "arbeide" -> english "work"');
assert(translateWord('hei', 'nordum', 'english') === 'hello', 'nordum "hei" -> english "hello"');
assert(translateWord('hej', 'nordum', 'english') === 'hello', 'nordum "hej" -> english "hello"');
assert(translateWord('takk', 'nordum', 'english') === 'thanks', 'nordum "takk" -> english "thanks"');

// Spellcheck logic test
const knownWords = new Set(entries.map(e => e.nordum.toLowerCase()));
assert(knownWords.has('hus'), 'Spellcheck knows "hus"');
assert(knownWords.has('arbeide'), 'Spellcheck knows "arbeide"');
assert(!knownWords.has('xyznonexistent'), 'Spellcheck rejects fake word');

if (failures === 0) {
    console.log('\n🎉 All tool smoke tests passed.');
    process.exit(0);
} else {
    console.log(`\n⚠️ ${failures} test(s) failed.`);
    process.exit(1);
}
