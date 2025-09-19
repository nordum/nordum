#!/usr/bin/env node

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { getApiConfig } = require('./api-config');

/**
 * Debug script to test Wiktionary parsing for specific words
 * Helps identify issues with the importers
 */

class WiktionaryDebugger {
    constructor() {
        this.problemWords = [
            'jeg', 'vi', 'kan', 'var', 'bare', 'må', 'gør', 'alle', 'lige', 'går', 'bliver'
        ];
        this.apiConfig = getApiConfig();
        
        // Proper User-Agent header as required by Wikimedia
        this.userAgent = this.apiConfig.getUserAgent();
    }

    async run() {
        console.log('Testing Wiktionary parsing for problematic words...\n');
        
        for (const word of this.problemWords) {
            console.log(`=== Testing word: ${word} ===`);
            
            try {
                // Test Danish Wiktionary
                await this.testDanishWiktionary(word);
                
                // Add some spacing
                console.log('');
                await this.sleep(1000);
                
            } catch (error) {
                console.error(`Error testing "${word}":`, error.message);
            }
        }
    }

    async testDanishWiktionary(word) {
        try {
            // Fetch the Wiktionary page
            const wikitext = await this.fetchWiktionaryPage(word, 'da');
            
            if (!wikitext) {
                console.log(`  No Danish Wiktionary page found for "${word}"`);
                return;
            }

            console.log(`  Danish Wiktionary page found for "${word}"`);
            
            // Extract language section
            const daSection = this.extractLanguageSection(wikitext, 'da');
            if (!daSection) {
                console.log(`  No Danish section found for "${word}"`);
                return;
            }

            console.log(`  Danish section found (${daSection.length} chars)`);
            
            // Extract English translation
            const englishTranslation = this.extractEnglishTranslation(wikitext);
            console.log(`  English translation: ${englishTranslation || 'Not found'}`);
            
            // Extract IPA
            const ipa = this.extractIPA(daSection);
            console.log(`  IPA: ${ipa || 'Not found'}`);
            
            // Extract definitions
            const definitions = this.extractDefinitions(daSection);
            console.log(`  Definitions found: ${definitions.length}`);
            
            for (let i = 0; i < Math.min(definitions.length, 3); i++) {
                console.log(`    ${i + 1}. ${definitions[i].definition}`);
                if (definitions[i].english) {
                    console.log(`       → ${definitions[i].english}`);
                }
            }
            
            // Check for different parts of speech
            this.checkPartsOfSpeech(daSection);
            
        } catch (error) {
            console.error(`  Error testing Danish Wiktionary for "${word}":`, error.message);
        }
    }

    async fetchWiktionaryPage(word, language = 'da') {
        return new Promise((resolve, reject) => {
            const searchUrl = `https://${language}.wiktionary.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(word)}&srlimit=1`;
            
            const headers = this.apiConfig.getHeaders('wiktionary');
            console.log(`  Headers: ${JSON.stringify(headers)}`);
            
            https.get(searchUrl, { headers }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        console.log(`  Search API response status: ${res.statusCode}`);
                        if (res.statusCode !== 200) {
                            console.log(`  Search API response: ${data.substring(0, 200)}...`);
                            resolve(null);
                            return;
                        }
                        
                        const searchData = JSON.parse(data);
                        if (!searchData.query?.search?.length) {
                            console.log(`  No search results for "${word}"`);
                            resolve(null);
                            return;
                        }
                        
                        const pageTitle = searchData.query.search[0].title;
                        console.log(`  Found page: ${pageTitle}`);
                        const contentUrl = `https://${language}.wiktionary.org/w/api.php?action=query&format=json&prop=revisions&titles=${encodeURIComponent(pageTitle)}&rvprop=content&rvslots=main`;
                        
                        https.get(contentUrl, { headers }, (res2) => {
                            let contentData = '';
                            res2.on('data', chunk => contentData += chunk);
                            res2.on('end', () => {
                                try {
                                    console.log(`  Content API response status: ${res2.statusCode}`);
                                    if (res2.statusCode !== 200) {
                                        console.log(`  Content API response: ${contentData.substring(0, 200)}...`);
                                        resolve(null);
                                        return;
                                    }
                                    
                                    const contentJson = JSON.parse(contentData);
                                    const pages = contentJson.query?.pages;
                                    if (!pages) {
                                        console.log(`  No pages in content response`);
                                        resolve(null);
                                        return;
                                    }
                                    
                                    const page = Object.values(pages)[0];
                                    if (!page.revisions) {
                                        console.log(`  No revisions in page`);
                                        resolve(null);
                                        return;
                                    }
                                    
                                    resolve(page.revisions[0].slots.main['*']);
                                } catch (error) {
                                    console.log(`  Content API parse error: ${error.message}`);
                                    console.log(`  Content data: ${contentData.substring(0, 200)}...`);
                                    reject(error);
                                }
                            });
                        }).on('error', (error) => {
                            console.log(`  Content API request error: ${error.message}`);
                            reject(error);
                        });
                    } catch (error) {
                        console.log(`  Search API parse error: ${error.message}`);
                        console.log(`  Search data: ${data.substring(0, 200)}...`);
                        reject(error);
                    }
                });
            }).on('error', (error) => {
                console.log(`  Search API request error: ${error.message}`);
                reject(error);
            });
        });
    }

    extractLanguageSection(wikitext, language) {
        const langCode = language === 'da' ? 'da' : language;
        const sectionRegex = new RegExp(`\\{\\{=${langCode}=\\}\\}(.*?)(?=\\{\\{=\\w+=\\}\\}|$)`, 's');
        const match = wikitext.match(sectionRegex);
        return match ? match[1] : null;
    }

    extractEnglishTranslation(wikitext) {
        const translationPatterns = [
            /\{\{t\|en\|([^}|]+)/,           // {{t|en|word}}
            /\{\{t\+\|en\|([^}|]+)/,         // {{t+|en|word}}
            /\{\{trad\|en\|([^}|]+)/,        // {{trad|en|word}} (Danish pattern)
            /\{\{oversættelse\|en\|([^}|]+)/, // {{oversættelse|en|word}}
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

    extractIPA(sectionText) {
        const ipaPatterns = [
            /\{\{IPA\|([^}]+)\|lang=da\}\}/,
            /\{\{uttal\|([^}]+)\}\}/,
            /\/([^\/]+)\//
        ];

        for (const pattern of ipaPatterns) {
            const match = sectionText.match(pattern);
            if (match) {
                return match[1].replace(/\//g, '');
            }
        }

        return null;
    }

    extractDefinitions(sectionText) {
        const definitions = [];

        // Look for numbered definitions
        const defMatches = sectionText.match(/#([^#\n]+)/g);
        if (defMatches) {
            for (const defMatch of defMatches) {
                const definition = defMatch.substring(1).trim();
                // Remove wikitext formatting
                const cleanDef = definition
                    .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
                    .replace(/\{\{[^}]+\}\}/g, '')
                    .replace(/'''([^']+)'''/g, '$1')
                    .replace(/''([^']+)''/g, '$1')
                    .trim();

                if (cleanDef && !cleanDef.startsWith(':')) {
                    definitions.push({
                        definition: cleanDef,
                        english: this.translateToEnglish(cleanDef) || cleanDef
                    });
                }
            }
        }

        return definitions;
    }

    translateToEnglish(danishText) {
        if (!danishText) return '';

        const translations = {
            'hus': 'house',
            'bil': 'car',
            'mand': 'man',
            'kvinde': 'woman',
            'barn': 'child',
            'arbejde': 'work',
            'arbejder': 'works',
            'skole': 'school',
            'bog': 'book',
            'stor': 'big',
            'lille': 'small',
            'god': 'good',
            'dårlig': 'bad',
            'ny': 'new',
            'gammel': 'old',
            'være': 'be',
            'have': 'have',
            'gøre': 'do',
            'komme': 'come',
            'gå': 'go',
            'se': 'see',
            'høre': 'hear',
            'snakke': 'speak',
            'spise': 'eat',
            'drikke': 'drink',
            'sove': 'sleep',
            'vågen': 'awake',
            'glad': 'happy',
            'trist': 'sad',
            'rød': 'red',
            'blå': 'blue',
            'grøn': 'green',
            'gul': 'yellow',
            'sort': 'black',
            'hvid': 'white'
        };

        // Simple word lookup
        const words = danishText.toLowerCase().split(/\s+/);
        for (const word of words) {
            if (translations[word]) {
                return translations[word];
            }
        }

        return danishText;
    }

    checkPartsOfSpeech(sectionText) {
        const posPatterns = {
            noun: /\{\{-noun-\|da\}\}/,
            verb: /\{\{-verb-\|da\}\}/,
            adjective: /\{\{-adj-\|da\}\}/,
            adverb: /\{\{-adv-\|da\}\}/
        };

        const foundPOS = [];
        for (const [pos, pattern] of Object.entries(posPatterns)) {
            if (sectionText.match(pattern)) {
                foundPOS.push(pos);
            }
        }

        if (foundPOS.length > 0) {
            console.log(`  Parts of speech: ${foundPOS.join(', ')}`);
        } else {
            console.log(`  No parts of speech templates found`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the debugger
if (require.main === module) {
    const debuggerInstance = new WiktionaryDebugger();
    debuggerInstance.run()
        .then(() => {
            console.log('\nDebug completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Debug failed:', error);
            process.exit(1);
        });
}

module.exports = WiktionaryDebugger;