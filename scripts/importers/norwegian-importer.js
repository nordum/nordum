#!/usr/bin/env node

const BaseImporter = require('./base-importer');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

/**
 * Norwegian (Bokmål) dictionary importer
 * Sources: Språkrådet's official word list and NBU corpus data
 */
class NorwegianImporter extends BaseImporter {
    constructor(options = {}) {
        super('norwegian', {
            ...options,
            sources: {
                wiktionary: 'https://no.wiktionary.org/w/api.php'
                // Add external translation cache directory if needed
            }
        });

        this.frequencyData = new Map();
        this.morphologyData = new Map();
        // Merge options with base class options
        this.options = {
            ...this.options,
            reset: false,
            overwrite: false,
            ...options
        };
    }

    async import() {
        console.log('Starting Norwegian dictionary import...');

        await this.init();

        try {
            // Handle reset option
            if (this.options.reset) {
                console.log('Resetting CSV file...');
                await this.writeToCSV([]);
            }

            // Load frequency data first
            await this.loadFrequencyData();

            // Import from Wiktionary
            const wiktionaryEntries = await this.importFromWiktionary();

            // Use only Wiktionary entries
            let allEntries = wiktionaryEntries;

            // Apply Nordum-specific processing
            allEntries = this.processForNordum(allEntries);

            // Load existing entries and merge
            const existingEntries = await this.loadFromCSV();
            const mergedEntries = this.options.overwrite
                ? this.overwriteEntries(existingEntries, allEntries)
                : this.mergeEntries(existingEntries, allEntries);

            // Write to CSV
            await this.writeToCSV(mergedEntries);

            this.stats.processed = mergedEntries.length;
            await this.printStats();

            console.log(`Norwegian import completed: ${mergedEntries.length} total entries`);

        } catch (error) {
            console.error('Norwegian import failed:', error);
            throw error;
        }
    }

    /**
     * Load frequency data from Norwegian corpus
     */
    async loadFrequencyData() {
        console.log('Loading Norwegian frequency data...');

        try {
            // Load from frequency list file
            this.frequencyData = await this.loadFrequencyList();
            console.log(`Loaded frequency data for ${this.frequencyData.size} Norwegian words`);

        } catch (error) {
            console.warn('Could not load frequency data:', error.message);
            // Fallback to basic frequency estimation
            this.frequencyData = new Map();
        }
    }

    /**
     * Load frequency list from CSV file
     */
    async loadFrequencyList() {
        const frequencyMap = new Map();

        try {
            const frequencyPath = path.join(__dirname, '../../data/dictionary/sources/frequency/norwegian_frequency.csv');
            const csvContent = await fs.readFile(frequencyPath, 'utf8');
            const lines = csvContent.split('\n').slice(1); // Skip header

            for (const line of lines) {
                if (!line.trim()) continue;
                const [word, frequencyStr] = line.split(',');
                const cleanWord = word.replace(/"/g, '').trim();
                const frequency = parseInt(frequencyStr) || 1000;

                if (cleanWord && this.isValidWord(cleanWord)) {
                    frequencyMap.set(cleanWord, frequency);
                }
            }

        } catch (error) {
            console.warn('Could not load frequency list file:', error.message);
        }

        return frequencyMap;
    }

    /**
     * Check if word is valid for import
     */
    isValidWord(word) {
        if (!word || word.length < 2 || word.length > 30) return false;
        return /^[a-zA-ZæøåÆØÅäöÄÖ\-']+$/.test(word);
    }

    /**
     * Load most frequent Norwegian words
     */
    async loadFrequencyWordsFromList() {
        try {
            // Top 1000 most frequent Norwegian words with estimated frequencies
            const frequentWords = [
                // Top 100 most common
                { word: 'og', freq: 50000 }, { word: 'i', freq: 48000 }, { word: 'jeg', freq: 45000 },
                { word: 'det', freq: 42000 }, { word: 'at', freq: 40000 }, { word: 'en', freq: 38000 },
                { word: 'å', freq: 36000 }, { word: 'til', freq: 34000 }, { word: 'er', freq: 32000 },
                { word: 'som', freq: 30000 }, { word: 'på', freq: 28000 }, { word: 'de', freq: 26000 },
                { word: 'med', freq: 24000 }, { word: 'han', freq: 22000 }, { word: 'av', freq: 20000 },
                { word: 'ikke', freq: 18000 }, { word: 'ikkje', freq: 17000 }, { word: 'der', freq: 16000 },
                { word: 'så', freq: 15000 }, { word: 'var', freq: 14000 }, { word: 'meg', freq: 13000 },
                { word: 'seg', freq: 12000 }, { word: 'men', freq: 11000 }, { word: 'ett', freq: 10000 },
                { word: 'har', freq: 9500 }, { word: 'om', freq: 9000 }, { word: 'vi', freq: 8500 },
                { word: 'min', freq: 8000 }, { word: 'mitt', freq: 7500 }, { word: 'ha', freq: 7000 },
                { word: 'hadde', freq: 6500 }, { word: 'hun', freq: 6000 }, { word: 'nå', freq: 5500 },
                { word: 'over', freq: 5000 }, { word: 'da', freq: 4800 }, { word: 'ved', freq: 4600 },
                { word: 'fra', freq: 4400 }, { word: 'du', freq: 4200 }, { word: 'ut', freq: 4000 },
                { word: 'sin', freq: 3800 }, { word: 'dem', freq: 3600 }, { word: 'oss', freq: 3400 },
                { word: 'opp', freq: 3200 }, { word: 'man', freq: 3000 }, { word: 'kan', freq: 2800 },
                { word: 'hans', freq: 2600 }, { word: 'hvor', freq: 2400 }, { word: 'eller', freq: 2200 },
                { word: 'hva', freq: 2000 }, { word: 'skal', freq: 1900 }, { word: 'selv', freq: 1800 },
                { word: 'sjøl', freq: 1700 }, { word: 'her', freq: 1600 }, { word: 'alle', freq: 1500 },

                // Common nouns
                { word: 'år', freq: 1400 }, { word: 'måte', freq: 1300 }, { word: 'dag', freq: 1200 },
                { word: 'tid', freq: 1100 }, { word: 'person', freq: 1000 }, { word: 'sted', freq: 950 },
                { word: 'del', freq: 900 }, { word: 'hand', freq: 850 }, { word: 'øye', freq: 800 },
                { word: 'mann', freq: 750 }, { word: 'kvinne', freq: 700 }, { word: 'barn', freq: 650 },
                { word: 'hus', freq: 600 }, { word: 'dør', freq: 550 }, { word: 'rom', freq: 500 },
                { word: 'bil', freq: 480 }, { word: 'vei', freq: 460 }, { word: 'land', freq: 440 },
                { word: 'by', freq: 420 }, { word: 'gruppe', freq: 400 }, { word: 'problem', freq: 380 },

                // Common verbs
                { word: 'være', freq: 1800 }, { word: 'få', freq: 1600 }, { word: 'si', freq: 1400 },
                { word: 'komme', freq: 1200 }, { word: 'ville', freq: 1000 }, { word: 'kunne', freq: 950 },
                { word: 'skulle', freq: 900 }, { word: 'måtte', freq: 850 }, { word: 'gå', freq: 800 },
                { word: 'ta', freq: 750 }, { word: 'se', freq: 700 }, { word: 'gi', freq: 650 },
                { word: 'arbeide', freq: 600 }, { word: 'gjøre', freq: 550 }, { word: 'tenke', freq: 500 },
                { word: 'snakke', freq: 480 }, { word: 'høre', freq: 460 }, { word: 'lese', freq: 440 },
                { word: 'skrive', freq: 420 }, { word: 'spise', freq: 400 }, { word: 'drikke', freq: 380 },

                // Common adjectives
                { word: 'stor', freq: 650 }, { word: 'liten', freq: 600 }, { word: 'god', freq: 550 },
                { word: 'dårlig', freq: 500 }, { word: 'ny', freq: 480 }, { word: 'gammel', freq: 460 },
                { word: 'lang', freq: 440 }, { word: 'kort', freq: 420 }, { word: 'høy', freq: 400 },
                { word: 'lav', freq: 380 }, { word: 'rask', freq: 360 }, { word: 'langsom', freq: 340 },

                // Numbers
                { word: 'en', freq: 800 }, { word: 'ett', freq: 800 }, { word: 'to', freq: 600 },
                { word: 'tre', freq: 500 }, { word: 'fire', freq: 400 }, { word: 'fem', freq: 380 },
                { word: 'seks', freq: 360 }, { word: 'syv', freq: 340 }, { word: 'åtte', freq: 320 },
                { word: 'ni', freq: 300 }, { word: 'ti', freq: 280 }, { word: 'hundre', freq: 200 },
                { word: 'tusen', freq: 180 }
            ];

            frequentWords.forEach(item => {
                this.frequencyData.set(item.word, item.freq);
            });

            console.log(`Loaded frequency data for ${frequentWords.length} Norwegian words`);

        } catch (error) {
            console.warn('Could not load Norwegian frequency word list:', error.message);
        }
    }

    /**
     * Import from Språkrådet (Norwegian Language Council)
     */
    async importFromSpraakraadet() {
        console.log('Importing from Språkrådet...');

        const entries = [];

        try {
            // Note: Språkrådet doesn't have a public API
            console.log('Språkrådet API access requires special permissions - skipping');

        } catch (error) {
            console.error('Error importing from Språkrådet:', error);
        }

        return entries;
    }

    /**
     * Fetch a single entry from Wiktionary using enhanced caching
     */
    async fetchWiktionaryEntry(word, language = 'no') {
        const entries = [];

        try {
            // First, search for the page using cached method
            const searchResponse = await this.fetchWiktionarySearch(word, language);
            const searchData = this.parseJSON(searchResponse);

            if (!searchData.query?.search?.length) {
                return entries;
            }

            const pageTitle = searchData.query.search[0].title;

            // Get the page content using cached method (pass original word for cache consistency)
            const contentResponse = await this.fetchWiktionaryContent(pageTitle, language, word);
            const contentData = this.parseJSON(contentResponse);

            const pages = contentData.query?.pages;
            if (!pages) return entries;

            const page = Object.values(pages)[0];
            if (!page.revisions) return entries;

            const wikitext = page.revisions[0].slots.main['*'];

            // Parse Wiktionary content
            const parsedEntries = await this.parseWiktionaryContent(wikitext, word, language);
            entries.push(...parsedEntries);

        } catch (error) {
            console.warn(`Error fetching Wiktionary entry for "${word}":`, error.message);
        }

        return entries;
    }

    /**
     * Parse Wiktionary wikitext content
     * Now uses external translation API if no English translation is found.
     * Validates Wiktionary translation before accepting.
     */
    async parseWiktionaryContent(wikitext, word, language) {
        const entries = [];
        try {
            // Look for Norwegian section (try both 'no' and 'nb' for Bokmål)
            let noSection = this.extractLanguageSection(wikitext, 'no');
            if (!noSection) {
                noSection = this.extractLanguageSection(wikitext, 'nb');
            }
            if (!noSection) {
                return entries;
            }

            // Extract IPA pronunciation (try multiple patterns)
            let ipa = this.estimateIPA(word);

            // Primary source: external translation API
            let englishTranslation = await this.fetchExternalTranslation(word, 'no', 'en');

            // Fallback to local dictionary for very common function words if API fails
            if (!this.isValidEnglishTranslation(word, englishTranslation)) {
                const functionWords = ['jeg', 'du', 'han', 'hun', 'det', 'vi', 'dere', 'de', 'og', 'eller', 'men', 'ikke', 'er', 'har', 'kan', 'skal', 'vil', 'må'];
                if (functionWords.includes(word.toLowerCase())) {
                    englishTranslation = this.translateToEnglish(word);
                }
            }

            // Last resort: try Wiktionary translation
            if (!this.isValidEnglishTranslation(word, englishTranslation)) {
                englishTranslation = this.extractEnglishTranslation(wikitext);
            }

            // Final validation
            if (!this.isValidEnglishTranslation(word, englishTranslation)) {
                englishTranslation = '';
            }

            const ipaPatterns = [
                /\{\{IPA\|([^}]+)\|lang=no\}\}/,
                /\{\{IPA\|([^}]+)\|lang=nb\}\}/,
                /\{\{uttal\|([^}]+)\}\}/,
                /\/([^\/]+)\//
            ];

            for (const pattern of ipaPatterns) {
                const match = noSection.match(pattern);
                if (match) {
                    ipa = match[1].replace(/\//g, '');
                    break;
                }
            }

            // Extract noun definitions (try multiple section headers)
            const nounPatterns = [
                /===\s*Substantiv\s*===(.*?)(?====|===|\n==|$)/s,
                /===\s*Noun\s*===(.*?)(?====|===|\n==|$)/s,
                /\{\{-noun-\|no\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-noun-\|nb\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-substantiv-\|no\}\}(.*?)(?=\{\{-|$)/s
            ];

            for (const pattern of nounPatterns) {
                const nounMatches = noSection.match(pattern);
                if (nounMatches) {
                    const nounSection = nounMatches[1];
                    const definitions = this.extractDefinitions(nounSection);

                    // Extract gender information (try multiple patterns)
                    let gender = '';
                    const genderPatterns = [
                        /\{\{no-sub\|n\}\}/,
                        /\{\{no-sub\|m\}\}/,
                        /\{\{no-sub\|f\}\}/,
                        /\{\{([mnf])\}\}/,
                        /\{\{intetkjønn\}\}/,
                        /\{\{hankjønn\}\}/,
                        /\{\{hunkjønn\}\}/
                    ];

                    for (const gPattern of genderPatterns) {
                        const gMatch = nounSection.match(gPattern);
                        if (gMatch) {
                            if (gMatch[0].includes('no-sub|n') || gMatch[0].includes('intetkjønn') || gMatch[1] === 'n') gender = 'neuter';
                            else if (gMatch[0].includes('no-sub|m') || gMatch[0].includes('no-sub|f') || gMatch[0].includes('hankjønn') || gMatch[0].includes('hunkjønn') || gMatch[1] === 'm' || gMatch[1] === 'f') gender = 'common';
                            break;
                        }
                    }

                    if (definitions.length > 0) {
                        entries.push({
                            word: word,
                            english: englishTranslation || this.translateToEnglish(definitions[0].definition) || definitions[0].definition,
                            pos: 'noun',
                            gender: gender,
                            frequency: this.frequencyData.get(word) || this.estimateFrequency(word),
                            ipa: `[${ipa}]`,
                            definition: definitions[0].definition
                        });
                    }
                    break;
                }
            }


            // Extract verb definitions
            const verbPatterns = [
                /===\s*Verb\s*===(.*?)(?====|===|\n==|$)/s,
                /\{\{-verb-\|no\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-verb-\|nb\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-verb-\}\}(.*?)(?=\{\{-|$)/s
            ];

            for (const pattern of verbPatterns) {
                const verbMatches = noSection.match(pattern);
                if (verbMatches) {
                    const verbSection = verbMatches[1];
                    const definitions = this.extractDefinitions(verbSection);

                    if (definitions.length > 0) {
                        entries.push({
                            word: word,
                            english: englishTranslation || this.translateToEnglish(definitions[0].definition) || definitions[0].definition,
                            pos: 'verb',
                            gender: '',
                            frequency: this.frequencyData.get(word) || this.estimateFrequency(word),
                            ipa: `[${ipa}]`,
                            definition: definitions[0].definition
                        });
                    }
                    break;
                }
            }

            // Extract adjective definitions
            const adjPatterns = [
                /===\s*Adjektiv\s*===(.*?)(?====|===|\n==|$)/s,
                /===\s*Adjective\s*===(.*?)(?====|===|\n==|$)/s,
                /\{\{-adj-\|no\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-adj-\|nb\}\}(.*?)(?=\{\{-|$)/s
            ];

            for (const pattern of adjPatterns) {
                const adjMatches = noSection.match(pattern);
                if (adjMatches) {
                    const adjSection = adjMatches[1];
                    const definitions = this.extractDefinitions(adjSection);

                    if (definitions.length > 0) {
                        entries.push({
                            word: word,
                            english: englishTranslation || this.translateToEnglish(definitions[0].definition) || definitions[0].definition,
                            pos: 'adjective',
                            gender: '',
                            frequency: this.frequencyData.get(word) || this.estimateFrequency(word),
                            ipa: `[${ipa}]`,
                            definition: definitions[0].definition
                        });
                    }
                    break;
                }
            }

        } catch (error) {
            console.warn(`Error parsing Wiktionary content for "${word}":`, error.message);
        }

        return entries;
    }

    /**
     * Extract language section from Wiktionary wikitext
     */
    extractLanguageSection(wikitext, language) {
        // Simple approach: find the language section and capture until next language section or end
        const languageHeaders = {
            'no': ['==Norsk==', '==Bokmål==', '==Riksmål=='],
            'nb': ['==Bokmål==', '==Riksmål==', '==Norsk=='],
            'nn': ['==Nynorsk==']
        };

        const headers = languageHeaders[language] || [`==${language.charAt(0).toUpperCase() + language.slice(1)}==`];

        for (const header of headers) {
            // Find the language section header
            const headerIndex = wikitext.indexOf(header);
            if (headerIndex === -1) continue;

            // Find the start of the next language section (look for any == header)
            let nextLanguageStart = -1;

            // Look for next language section after current header
            const searchStart = headerIndex + header.length;
            const nextHeaderMatch = wikitext.substring(searchStart).match(/\n==[A-ZÆØÅ]/);

            if (nextHeaderMatch) {
                nextLanguageStart = searchStart + nextHeaderMatch.index;
            }

            if (nextLanguageStart !== -1) {
                // Extract content until next language section
                const content = wikitext.substring(searchStart, nextLanguageStart);
                if (content.trim().length > 10) {
                    return content;
                }
            } else {
                // Extract content until end of text
                const content = wikitext.substring(searchStart);
                if (content.trim().length > 10) {
                    return content;
                }
            }
        }

        return null;
    }

    /**
     * Extract definitions from a Wiktionary section
     */
    extractDefinitions(sectionText) {
        const definitions = [];

        // Look for numbered definitions (# at start of line, not #:)
        const defMatches = sectionText.match(/^#\s+([^:#\n][^#\n]*)/gm);

        if (defMatches) {
            for (const defMatch of defMatches) {
                const definition = defMatch.substring(1).trim(); // Remove the #

                // Remove wikitext formatting
                const cleanDef = definition
                    .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
                    .replace(/\{\{[^}]+\}\}/g, '')
                    .replace(/'''([^']+)'''/g, '$1')
                    .replace(/''([^']+)''/g, '$1')
                    .replace(/:\s*''.*?''/g, '') // Remove example sentences
                    .trim();

                if (cleanDef && !cleanDef.startsWith(':') && cleanDef.length > 2) {
                    definitions.push({
                        definition: cleanDef,
                        english: this.translateToEnglish(cleanDef) || cleanDef
                    });
                }
            }
        }

        return definitions;
    }

    /**
     * Extract English translation from wikitext
     */
    extractEnglishTranslation(wikitext) {
        // Look for English translation templates
        const translationPatterns = [
            /\{\{t\|en\|([^}|]+)/,           // {{t|en|word}}
            /\{\{t\+\|en\|([^}|]+)/,         // {{t+|en|word}}
            /\{\{overs\|en\|([^}|]+)/,       // {{overs|en|word}} (Norwegian pattern)
            /\{\{oversettelse\|en\|([^}|]+)/, // {{oversettelse|en|word}}
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
     * Simple Norwegian to English translation for common words
     */
    translateToEnglish(norwegianText) {
        if (!norwegianText) return '';

        const translations = {
            'hus': 'house',
            'bil': 'car',
            'mann': 'man',
            'kvinne': 'woman',
            'barn': 'child',
            'arbeid': 'work',
            'arbeide': 'work',
            'skole': 'school',
            'bok': 'book',
            'stor': 'big',
            'liten': 'small',
            'god': 'good',
            'dårlig': 'bad',
            'ny': 'new',
            'gammel': 'old',
            'være': 'be',
            'ha': 'have',
            'gjøre': 'do',
            'komme': 'come',
            'gå': 'go',
            'se': 'see',
            'høre': 'hear',
            'snakke': 'speak'
        };

        // Simple word lookup
        const words = norwegianText.toLowerCase().split(/\s+/);
        for (const word of words) {
            if (translations[word]) {
                return translations[word];
            }
        }

        return norwegianText;
    }

    /**
     * Validate if an English translation is acceptable
     */
    isValidEnglishTranslation(source, translation) {
        if (!translation || typeof translation !== 'string') return false;
        if (translation.toLowerCase() === source.toLowerCase()) return false;
        if (!/^[a-zA-Z]+$/.test(translation)) return false;
        return true;
    }

    /**
     * Fetch translation using improved translation API (inherits from BaseImporter)
     * This method is now handled by the base class with Google Translate, LibreTranslate, and MyMemory fallback
     */

    /**
     * Import from Norwegian Wiktionary
     */
    async importFromWiktionary() {
        console.log('Importing from Norwegian Wiktionary...');

        const entries = [];

        try {
            // Get common Norwegian words from frequency list
            const searchTerms = Array.from(this.frequencyData.entries())
                .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
                .map(entry => entry[0]);

            if (this.options.limit) {
                searchTerms.length = this.options.limit;
            }

            console.log(`Fetching ${searchTerms.length} most frequent Norwegian words from Wiktionary`);

            for (const term of searchTerms) {
                try {
                    const wiktionaryEntries = await this.fetchWiktionaryEntry(term, 'no');
                    entries.push(...wiktionaryEntries);

                    // Rate limiting
                    await this.sleep(this.options.rateLimit);
                } catch (error) {
                    console.warn(`Failed to fetch Wiktionary entry for "${term}":`, error.message);
                }
            }

            console.log(`Imported ${entries.length} entries from Norwegian Wiktionary`);

        } catch (error) {
            console.error('Error importing from Norwegian Wiktionary:', error);
        }

        return entries;
    }

    /**
     * Estimate IPA transcription for Norwegian words
     */
    estimateIPA(word) {
        if (!word) return '';

        // Basic Norwegian phonetic patterns
        let ipa = word.toLowerCase();

        // Common Norwegian sound patterns
        ipa = ipa.replace(/kj/g, 'ç');
        ipa = ipa.replace(/skj/g, 'ʃ');
        ipa = ipa.replace(/sk([eiy])/g, 'ʃ$1');
        ipa = ipa.replace(/rs/g, 'ʃ');
        ipa = ipa.replace(/ng/g, 'ŋ');
        ipa = ipa.replace(/y/g, 'y');
        ipa = ipa.replace(/ø/g, 'ø');
        ipa = ipa.replace(/å/g, 'oː');
        ipa = ipa.replace(/æ/g, 'æ');

        // Add word boundaries
        return `[${ipa}]`;
    }

    /**
     * Estimate frequency based on word characteristics
     */
    estimateFrequency(word) {
        if (!word) return 100;

        // Very rough frequency estimation
        let freq = 1000;

        // Short words tend to be more frequent
        if (word.length <= 3) freq += 500;
        else if (word.length <= 5) freq += 200;
        else if (word.length > 10) freq -= 300;

        // Common endings
        if (word.endsWith('ing')) freq += 100;
        if (word.endsWith('het')) freq += 50;
        if (word.endsWith('tion')) freq += 150;

        // Function words
        const functionWords = ['jeg', 'du', 'han', 'hun', 'det', 'vi', 'dere', 'de', 'og', 'eller', 'men'];
        if (functionWords.includes(word)) freq += 2000;

        return Math.max(100, freq);
    }

    /**
     * Combine entries from multiple sources
     */
    combineEntries(entryArrays) {
        const combined = [];
        const seenWords = new Set();

        for (const entries of entryArrays) {
            for (const entry of entries) {
                const key = `${entry.word}:${entry.pos}`;
                if (!seenWords.has(key)) {
                    combined.push(entry);
                    seenWords.add(key);
                }
            }
        }

        return combined;
    }

    /**
     * Apply Nordum-specific processing to Norwegian entries
     */
    processForNordum(entries) {
        console.log('Processing entries for Nordum compatibility...');

        const processed = entries.map(entry => {
            const processedEntry = { ...entry };

            // Apply Nordum rules:
            // 1. English loanwords stay unchanged
            if (this.isEnglishLoanword(entry.word)) {
                // Keep as-is, already in English form
                processedEntry.nordum_note = 'English loanword preserved';
            }

            // 2. Question words: remove 'hv' prefix
            if (entry.word.startsWith('hv') && ['pronoun', 'adverb'].includes(entry.pos)) {
                // This will be handled in the main dictionary builder
                // where Norwegian 'hva' becomes Nordum 'vad' etc.
                processedEntry.nordum_note = 'Question word - hv→v transformation needed';
            }

            // 3. Numbers: Norwegian system is already preferred
            if (entry.pos === 'numeral') {
                processedEntry.nordum_note = 'Norwegian number system preferred';
            }

            // 4. Mark entries that strongly support Bokmål/Danish preference
            if (this.isBokmaalDanishForm(entry.word)) {
                processedEntry.nordum_priority = 'high';
            }

            return processedEntry;
        });

        console.log(`Processed ${processed.length} entries for Nordum`);
        return processed;
    }

    /**
     * Check if word is an English loanword
     */
    isEnglishLoanword(word) {
        const englishLoanwords = [
            'computer', 'internet', 'email', 'software', 'website', 'app', 'smartphone',
            'online', 'download', 'upload', 'login', 'password', 'browser', 'server',
            'database', 'backup', 'cloud', 'streaming', 'podcast', 'blog', 'chat'
        ];

        return englishLoanwords.includes(word.toLowerCase());
    }

    /**
     * Check if word represents Bokmål/Danish preference
     */
    isBokmaalDanishForm(word) {
        // Words that are shared between Norwegian Bokmål and Danish
        // vs. Swedish variants
        const bokmaalDanishForms = [
            'arbeider', 'kjøre', 'gjøre', 'høre', 'være', 'lille', 'kaffe'
        ];

        return bokmaalDanishForms.includes(word.toLowerCase());
    }

    /**
     * Overwrite existing entries with new ones
     */
    overwriteEntries(existing, newEntries) {
        const existingWords = new Set(existing.map(entry => entry.word.toLowerCase()));
        const merged = [...existing];

        for (const entry of newEntries) {
            const existingIndex = merged.findIndex(e => e.word.toLowerCase() === entry.word.toLowerCase());

            if (existingIndex !== -1) {
                // Replace existing entry
                merged[existingIndex] = entry;
            } else {
                // Add new entry
                merged.push(entry);
                existingWords.add(entry.word.toLowerCase());
            }
        }

        // Sort by frequency (descending) then alphabetically
        merged.sort((a, b) => {
            const freqA = parseInt(a.frequency) || 0;
            const freqB = parseInt(b.frequency) || 0;

            if (freqA !== freqB) {
                return freqB - freqA;
            }

            return a.word.localeCompare(b.word);
        });

        return merged;
    }
}

// CLI interface
if (require.main === module) {
    const options = {};

    // Parse command line arguments
    process.argv.forEach(arg => {
        if (arg.startsWith('--batch=')) {
            options.batchSize = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--limit=')) {
            options.limit = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--source=')) {
            options.source = arg.split('=')[1];
        } else if (arg === '--reset') {
            options.reset = true;
        } else if (arg === '--overwrite') {
            options.overwrite = true;
        }
    });

    const importer = new NorwegianImporter(options);

    importer.import()
        .then(() => {
            console.log('Norwegian import completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Norwegian import failed:', error);
            process.exit(1);
        });
}

module.exports = NorwegianImporter;
