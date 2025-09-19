#!/usr/bin/env node

const BaseImporter = require('./base-importer');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

/**
 * Swedish dictionary importer
 * Sources: SAOL (Svenska Akademiens ordlista) and Språkbanken
 */
class SwedishImporter extends BaseImporter {
    constructor(options = {}) {
        super('swedish', {
            ...options,
            sources: {
                wiktionary: 'https://sv.wiktionary.org/w/api.php'
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

    /**
     * Fetch translation using improved translation API (inherits from BaseImporter)
     * This method is now handled by the base class with Google Translate, LibreTranslate, and MyMemory fallback
     */

    /**
     * Validate if a translation is a good English word and not just a copy or non-English
     */
    isValidEnglishTranslation(source, translation) {
        if (!translation || typeof translation !== 'string') return false;
        if (translation.toLowerCase() === source.toLowerCase()) return false;
        if (!/^[a-zA-Z]+$/.test(translation)) return false;
        // Optionally, add more checks or a whitelist here
        return true;
    }

    async import() {
        console.log('Starting Swedish dictionary import...');

        await this.init();

        try {
            // Handle reset option
            if (this.options.reset) {
                console.log('Resetting CSV file...');
                await this.writeToCSV([]);
            }

            // Load frequency data first
            await this.loadFrequencyData();

            // Import from working sources
            const wiktionaryEntries = await this.importFromWiktionary();

            // Use only working sources
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

            console.log(`Swedish import completed: ${mergedEntries.length} total entries`);

        } catch (error) {
            console.error('Swedish import failed:', error);
            throw error;
        }
    }

    /**
     * Load frequency data from Swedish corpus
     */
    async loadFrequencyData() {
        console.log('Loading Swedish frequency data...');

        try {
            // Load from frequency list file
            this.frequencyData = await this.loadFrequencyList();
            console.log(`Loaded frequency data for ${this.frequencyData.size} Swedish words`);

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
            const frequencyPath = path.join(__dirname, '../../data/dictionary/sources/frequency/swedish_frequency.csv');
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
     * Import from SAOL (Svenska Akademiens ordlista)
     */
    async importFromSAOL() {
        console.log('Importing from SAOL...');

        const entries = [];

        try {
            // Note: SAOL doesn't have a public API, but we can use Språkbanken resources
            console.log('Using Språkbanken and curated Swedish word list for SAOL data');

            // Try to fetch from Språkbanken first
            const spraakbankenEntries = await this.fetchFromSpraakbanken();
            entries.push(...spraakbankenEntries);

            // Fallback to curated word list for core vocabulary
            const coreWords = [
                { word: 'arbetar', english: 'works', pos: 'verb', gender: null },
                { word: 'arbete', english: 'work', pos: 'noun', gender: 'neuter' },
                { word: 'arbetare', english: 'worker', pos: 'noun', gender: 'common' },
                { word: 'stor', english: 'big', pos: 'adjective', gender: null },
                { word: 'liten', english: 'small', pos: 'adjective', gender: null },
                { word: 'bra', english: 'good', pos: 'adjective', gender: null },
                { word: 'dålig', english: 'bad', pos: 'adjective', gender: null },
                { word: 'hus', english: 'house', pos: 'noun', gender: 'neuter' },
                { word: 'bil', english: 'car', pos: 'noun', gender: 'common' },
                { word: 'man', english: 'man', pos: 'noun', gender: 'common' },
                { word: 'kvinna', english: 'woman', pos: 'noun', gender: 'common' },
                { word: 'barn', english: 'child', pos: 'noun', gender: 'neuter' },
                { word: 'skola', english: 'school', pos: 'noun', gender: 'common' },
                { word: 'lärare', english: 'teacher', pos: 'noun', gender: 'common' },
                { word: 'student', english: 'student', pos: 'noun', gender: 'common' },
                { word: 'bok', english: 'book', pos: 'noun', gender: 'common' },
                { word: 'läsa', english: 'read', pos: 'verb', gender: null },
                { word: 'skriva', english: 'write', pos: 'verb', gender: null },
                { word: 'tala', english: 'speak', pos: 'verb', gender: null },
                { word: 'höra', english: 'hear', pos: 'verb', gender: null },
                { word: 'se', english: 'see', pos: 'verb', gender: null },
                { word: 'komma', english: 'come', pos: 'verb', gender: null },
                { word: 'gå', english: 'go', pos: 'verb', gender: null },
                { word: 'vara', english: 'be', pos: 'verb', gender: null },
                { word: 'ha', english: 'have', pos: 'verb', gender: null },
                { word: 'göra', english: 'do', pos: 'verb', gender: null },
                // Numbers (Swedish decimal system - preferred by Nordum)
                { word: 'en', english: 'one', pos: 'numeral', gender: 'common' },
                { word: 'ett', english: 'one', pos: 'numeral', gender: 'neuter' },
                { word: 'två', english: 'two', pos: 'numeral', gender: null },
                { word: 'tre', english: 'three', pos: 'numeral', gender: null },
                { word: 'fyra', english: 'four', pos: 'numeral', gender: null },
                { word: 'fem', english: 'five', pos: 'numeral', gender: null },
                { word: 'sex', english: 'six', pos: 'numeral', gender: null },
                { word: 'sju', english: 'seven', pos: 'numeral', gender: null },
                { word: 'åtta', english: 'eight', pos: 'numeral', gender: null },
                { word: 'nio', english: 'nine', pos: 'numeral', gender: null },
                { word: 'tio', english: 'ten', pos: 'numeral', gender: null },
                { word: 'tjugo', english: 'twenty', pos: 'numeral', gender: null },
                { word: 'trettio', english: 'thirty', pos: 'numeral', gender: null },
                { word: 'fyrtio', english: 'forty', pos: 'numeral', gender: null },
                { word: 'femtio', english: 'fifty', pos: 'numeral', gender: null },
                { word: 'sextio', english: 'sixty', pos: 'numeral', gender: null },
                { word: 'sjuttio', english: 'seventy', pos: 'numeral', gender: null },
                { word: 'åttio', english: 'eighty', pos: 'numeral', gender: null },
                { word: 'nittio', english: 'ninety', pos: 'numeral', gender: null },
                { word: 'hundra', english: 'hundred', pos: 'numeral', gender: null },
                { word: 'tusen', english: 'thousand', pos: 'numeral', gender: null },
                // Question words with 'v' (will be kept in Nordum)
                { word: 'vad', english: 'what', pos: 'pronoun', gender: null },
                { word: 'var', english: 'where', pos: 'adverb', gender: null },
                { word: 'när', english: 'when', pos: 'adverb', gender: null },
                { word: 'vem', english: 'who', pos: 'pronoun', gender: null },
                { word: 'varför', english: 'why', pos: 'adverb', gender: null },
                { word: 'vilken', english: 'which', pos: 'pronoun', gender: null },
                // Common adjectives
                { word: 'ny', english: 'new', pos: 'adjective', gender: null },
                { word: 'gammal', english: 'old', pos: 'adjective', gender: null },
                { word: 'ung', english: 'young', pos: 'adjective', gender: null },
                { word: 'snabb', english: 'fast', pos: 'adjective', gender: null },
                { word: 'långsam', english: 'slow', pos: 'adjective', gender: null },
                { word: 'hög', english: 'high', pos: 'adjective', gender: null },
                { word: 'låg', english: 'low', pos: 'adjective', gender: null },
                { word: 'lång', english: 'long', pos: 'adjective', gender: null },
                { word: 'kort', english: 'short', pos: 'adjective', gender: null },
                { word: 'bred', english: 'wide', pos: 'adjective', gender: null },
                { word: 'smal', english: 'narrow', pos: 'adjective', gender: null },
                // Modern terms (will stay English in Nordum)
                { word: 'dator', english: 'computer', pos: 'noun', gender: 'common' }, // Swedish term, but English preferred
                { word: 'internet', english: 'internet', pos: 'noun', gender: 'neuter' },
                { word: 'mejl', english: 'email', pos: 'noun', gender: 'common' }, // Swedish form, but English preferred
                { word: 'mjukvara', english: 'software', pos: 'noun', gender: 'common' }, // Swedish term, but English preferred
                { word: 'webbsida', english: 'website', pos: 'noun', gender: 'common' }, // Swedish term, but English preferred
                { word: 'app', english: 'app', pos: 'noun', gender: 'common' },
                { word: 'smartphone', english: 'smartphone', pos: 'noun', gender: 'common' }
            ];

            for (const wordData of coreWords) {
                const entry = {
                    word: wordData.word,
                    english: wordData.english,
                    pos: this.normalizePOS(wordData.pos),
                    gender: wordData.gender || '',
                    frequency: this.frequencyData.get(wordData.word) || this.estimateFrequency(wordData.word),
                    ipa: this.estimateIPA(wordData.word),
                    definition: `${wordData.english} (${wordData.pos})`
                };

                const validationErrors = this.validateEntry(entry);
                if (validationErrors.length === 0) {
                    entries.push(entry);
                } else {
                    console.warn(`Invalid entry for "${entry.word}":`, validationErrors);
                }
            }

            console.log(`Imported ${entries.length} entries from SAOL`);

        } catch (error) {
            console.error('Error importing from SAOL:', error);
        }

        return entries;
    }

    /**
     * Fetch entries from Språkbanken
     */
    async fetchFromSpraakbanken() {
        const entries = [];

        try {
            // Språkbanken has various APIs - we'll try to use their word frequency data
            // Note: This is a simplified approach - real implementation would use proper API endpoints
            console.log('Språkbanken API integration would require specific endpoint access');

            // For now, return empty array as this requires API keys/permissions
            return entries;

        } catch (error) {
            console.warn('Error fetching from Språkbanken:', error.message);
            return entries;
        }
    }

    /**
     * Import from Swedish Wiktionary
     */
    async importFromWiktionary() {
        console.log('Importing from Swedish Wiktionary...');

        const entries = [];

        try {
            // Get common Swedish words from frequency list
            const searchTerms = Array.from(this.frequencyData.entries())
                .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
                .map(entry => entry[0]);

            if (this.options.limit) {
                searchTerms.length = this.options.limit;
            }

            console.log(`Fetching ${searchTerms.length} most frequent Swedish words from Wiktionary`);

            for (const term of searchTerms) {
                try {
                    const wiktionaryEntries = await this.fetchWiktionaryEntry(term, 'sv');
                    entries.push(...wiktionaryEntries);

                    // Rate limiting
                    await this.sleep(this.options.rateLimit);
                } catch (error) {
                    console.warn(`Failed to fetch Wiktionary entry for "${term}":`, error.message);
                }
            }

            console.log(`Imported ${entries.length} entries from Swedish Wiktionary`);

        } catch (error) {
            console.error('Error importing from Swedish Wiktionary:', error);
        }

        return entries;
    }

    /**
     * Fetch a single entry from Wiktionary using enhanced caching
     */
    async fetchWiktionaryEntry(word, language = 'sv') {
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
     * Now validates Wiktionary translation and falls back to local dictionary or external API if invalid.
     */
    async parseWiktionaryContent(wikitext, word, language) {
        const entries = [];

        try {
            // Look for Swedish section (try multiple patterns)
            let svSection = this.extractLanguageSection(wikitext, 'sv');
            if (!svSection) {
                svSection = this.extractLanguageSection(wikitext, 'svenska');
            }
            if (!svSection) return entries;

            // Extract IPA pronunciation (try multiple patterns)
            let ipa = this.estimateIPA(word);

            // Use external translation API as primary source
            let englishTranslation = await this.fetchExternalTranslation(word, 'sv', 'en');

            // Validate external API result
            if (!this.isValidEnglishTranslation(word, englishTranslation)) {
                // Fallback to local dictionary for common function words
                englishTranslation = this.translateToEnglish(word);
            }

            // If still invalid, try Wiktionary as last resort
            if (!this.isValidEnglishTranslation(word, englishTranslation)) {
                englishTranslation = this.extractEnglishTranslation(wikitext);
            }

            // Final validation - mark for review if nothing worked
            if (!this.isValidEnglishTranslation(word, englishTranslation)) {
                englishTranslation = `REVIEW_${word}`; // Mark for manual review
            }

            const ipaPatterns = [
                /\{\{IPA\|([^}]+)\|lang=sv\}\}/,
                /\{\{uttal\|([^}]+)\}\}/,
                /\/([^\/]+)\//
            ];

            for (const pattern of ipaPatterns) {
                const match = svSection.match(pattern);
                if (match) {
                    ipa = match[1].replace(/\//g, '');
                    break;
                }
            }

            // Extract noun definitions (try multiple section headers)
            const nounPatterns = [
                /\{\{-noun-\|sv\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-substantiv-\|sv\}\}(.*?)(?=\{\{-|$)/s,
                /===\s*Substantiv\s*===(.*?)(?====|$)/s
            ];

            for (const pattern of nounPatterns) {
                const nounMatches = svSection.match(pattern);
                if (nounMatches) {
                    const nounSection = nounMatches[1];
                    const definitions = this.extractDefinitions(nounSection);

                    // Extract gender information (try multiple patterns)
                    let gender = '';
                    const genderPatterns = [
                        /\{\{([cn])\}\}/,
                        /\{\{neutrum\}\}/,
                        /\{\{utrum\}\}/
                    ];

                    for (const gPattern of genderPatterns) {
                        const gMatch = nounSection.match(gPattern);
                        if (gMatch) {
                            if (gMatch[0].includes('neutrum') || gMatch[1] === 'n') gender = 'neuter';
                            else if (gMatch[0].includes('utrum') || gMatch[1] === 'c') gender = 'common';
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
                /\{\{-verb-\|sv\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-verb-\}\}(.*?)(?=\{\{-|$)/s,
                /===\s*Verb\s*===(.*?)(?====|$)/s
            ];

            for (const pattern of verbPatterns) {
                const verbMatches = svSection.match(pattern);
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
                /\{\{-adj-\|sv\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-adjektiv-\|sv\}\}(.*?)(?=\{\{-|$)/s,
                /===\s*Adjektiv\s*===(.*?)(?====|$)/s
            ];

            for (const pattern of adjPatterns) {
                const adjMatches = svSection.match(pattern);
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
            'sv': ['==Svenska==', '==Svensk=='],
            'svenska': ['==Svenska==', '==Svensk==']
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

    /**
     * Estimate IPA transcription for Swedish words
     */
    estimateIPA(word) {
        if (!word) return '';

        // Basic Swedish phonetic patterns
        let ipa = word.toLowerCase();

        // Common Swedish sound patterns
        ipa = ipa.replace(/kj/g, 'ç');
        ipa = ipa.replace(/tj/g, 'ç');
        ipa = ipa.replace(/skj/g, 'ɧ');
        ipa = ipa.replace(/sk([eiy])/g, 'ɧ$1');
        ipa = ipa.replace(/rs/g, 'ʂ');
        ipa = ipa.replace(/rt/g, 'ʈ');
        ipa = ipa.replace(/rd/g, 'ɖ');
        ipa = ipa.replace(/rn/g, 'ɳ');
        ipa = ipa.replace(/rl/g, 'ɭ');
        ipa = ipa.replace(/ng/g, 'ŋ');
        ipa = ipa.replace(/y/g, 'ʏ');
        ipa = ipa.replace(/ö/g, 'ø');
        ipa = ipa.replace(/å/g, 'oː');
        ipa = ipa.replace(/ä/g, 'æ');

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
        const functionWords = ['jag', 'du', 'han', 'hon', 'det', 'vi', 'ni', 'de', 'och', 'eller', 'men'];
        if (functionWords.includes(word)) freq += 2000;

        return Math.max(100, freq);
    }

    /**
     * Extract definitions from a Wiktionary section
     */
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

    /**
     * Simple Swedish to English translation for common words
     */
    translateToEnglish(swedishText) {
        if (!swedishText) return '';

        const translations = {
            'hus': 'house',
            'bil': 'car',
            'man': 'man',
            'kvinna': 'woman',
            'barn': 'child',
            'arbete': 'work',
            'arbeta': 'work',
            'skola': 'school',
            'bok': 'book',
            'stor': 'big',
            'liten': 'small',
            'bra': 'good',
            'dålig': 'bad',
            'ny': 'new',
            'gammal': 'old',
            'vara': 'be',
            'ha': 'have',
            'göra': 'do',
            'komma': 'come',
            'gå': 'go',
            'se': 'see',
            'höra': 'hear',
            'tala': 'speak'
        };

        // Simple word lookup
        const words = swedishText.toLowerCase().split(/\s+/);
        for (const word of words) {
            if (translations[word]) {
                return translations[word];
            }
        }

        return swedishText;
    }

    /**
     * Extract English translation from wikitext
     */
    extractEnglishTranslation(wikitext) {
        // Look for English translation templates - Swedish Wiktionary patterns
        const translationPatterns = [
            /\{\{t\|en\|([^}|]+)/,           // {{t|en|word}}
            /\{\{t\+\|en\|([^}|]+)/,         // {{t+|en|word}}
            /\{\{ö\|en\|([^}|]+)/,           // {{ö|en|word}} (Swedish pattern)
            /\{\{ö\+\|en\|([^}|]+)/,         // {{ö+|en|word}} (Swedish pattern)
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
     * Apply Nordum-specific processing to Swedish entries
     */
    processForNordum(entries) {
        console.log('Processing Swedish entries for Nordum compatibility...');

        const processed = entries.map(entry => {
            const processedEntry = { ...entry };

            // Apply Nordum rules:
            // 1. English loanwords preferred over Swedish translations
            if (this.hasEnglishEquivalent(entry.word, entry.english)) {
                processedEntry.nordum_note = 'English form preferred over Swedish translation';
                processedEntry.nordum_priority = 'low'; // Swedish forms get lower priority
            }

            // 2. Question words: Swedish v- pattern is preferred in Nordum
            if (entry.word.match(/^v(ad|ar|em|arför|ilken)/) && ['pronoun', 'adverb'].includes(entry.pos)) {
                processedEntry.nordum_note = 'Swedish v- question word pattern (preferred in Nordum)';
                processedEntry.nordum_priority = 'high';
            }

            // 3. Numbers: Swedish decimal system less preferred than Norwegian
            if (entry.pos === 'numeral' && this.isSwedishNumberForm(entry.word)) {
                processedEntry.nordum_note = 'Swedish number - Norwegian system preferred';
                processedEntry.nordum_priority = 'low';
            }

            // 4. Mark entries that are uniquely Swedish (lower priority in Nordum)
            if (this.isUniquelySwedish(entry.word)) {
                processedEntry.nordum_priority = 'low';
                processedEntry.nordum_note = 'Uniquely Swedish form - Bokmål/Danish preferred';
            }

            return processedEntry;
        });

        console.log(`Processed ${processed.length} Swedish entries for Nordum`);
        return processed;
    }

    /**
     * Check if Swedish word has English equivalent that should be preferred
     */
    hasEnglishEquivalent(swedishWord, englishMeaning) {
        const swedishToEnglish = {
            'dator': 'computer',
            'mejl': 'email',
            'mjukvara': 'software',
            'webbsida': 'website',
            'nedladdning': 'download',
            'uppladdning': 'upload',
            'lösenord': 'password',
            'webbläsare': 'browser'
        };

        return swedishToEnglish[swedishWord.toLowerCase()] === englishMeaning?.toLowerCase();
    }

    /**
     * Check if word is uniquely Swedish (not shared with Norwegian/Danish)
     */
    isUniquelySwedish(word) {
        // Words that are distinctly Swedish vs. Norwegian/Danish forms
        const uniquelySwedish = [
            'arbetar', 'kör', 'gör', 'hör', 'är', 'bra', 'kaffe', 'flicka', 'pojke',
            'dator', 'mjukvara', 'webbsida', 'mejl', 'hemma', 'också'
        ];

        return uniquelySwedish.includes(word.toLowerCase());
    }

    /**
     * Check if word is a Swedish number form
     */
    isSwedishNumberForm(word) {
        const swedishNumbers = [
            'två', 'fyra', 'sex', 'sju', 'åtta', 'nio', 'tio', 'tjugo', 'trettio',
            'fyrtio', 'femtio', 'sextio', 'sjuttio', 'åttio', 'nittio', 'hundra'
        ];

        return swedishNumbers.includes(word.toLowerCase());
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

    const importer = new SwedishImporter(options);

    importer.import()
        .then(() => {
            console.log('Swedish import completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Swedish import failed:', error);
            process.exit(1);
        });
}

module.exports = SwedishImporter;
