#!/usr/bin/env node

const BaseImporter = require('./base-importer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Danish dictionary importer
 * Sources: Dansk Sprog- og Litteraturselskab (DSL) and ordnet.dk
 */
class DanishImporter extends BaseImporter {
    constructor(options = {}) {
        super('danish', {
            ...options,
            sources: {
                wiktionary: 'https://da.wiktionary.org/w/api.php'
            }
        });

        this.frequencyData = new Map();
        // Merge options with base class options
        this.options = {
            ...this.options,
            reset: false,
            overwrite: false,
            ...options
        };
    }

    async import() {
        console.log('Starting Danish dictionary import...');

        await this.init();

        try {
            // Handle reset option
            if (this.options.reset) {
                console.log('Resetting CSV file...');
                await this.writeToCSV([]);
            }

            // Load frequency data first
            await this.loadFrequencyData();

            // Import from Wiktionary using frequency data
            let wiktionaryEntries = await this.importFromWiktionary();

            // Fill missing English translations using external API
            wiktionaryEntries = await this.fillMissingTranslations(wiktionaryEntries);

            // Apply Nordum-specific processing
            const processedEntries = this.processForNordum(wiktionaryEntries);

            // Fix known translation and POS issues
            const fixedEntries = this.fixKnownIssues(processedEntries);

            // Load existing entries and merge
            const existingEntries = await this.loadFromCSV();
            const mergedEntries = this.options.overwrite
                ? this.overwriteEntries(existingEntries, fixedEntries)
                : this.mergeEntries(existingEntries, fixedEntries);

            // Write to CSV
            await this.writeToCSV(mergedEntries);

            this.stats.processed = mergedEntries.length;
            await this.printStats();

            console.log(`Danish import completed: ${mergedEntries.length} total entries`);

        } catch (error) {
            console.error('Danish import failed:', error);
            throw error;
        }
    }

    /**
     * Load frequency data from Danish frequency list
     */
    async loadFrequencyData() {
        console.log('Loading Danish frequency data...');

        try {
            // Load from frequency list file
            this.frequencyData = await this.loadFrequencyList();
            console.log(`Loaded frequency data for ${this.frequencyData.size} Danish words`);

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
            const frequencyPath = path.join(__dirname, '../../data/dictionary/sources/frequency/danish_frequency.csv');
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
     * Import from Danish Wiktionary using frequency data
     */
    async importFromWiktionary() {
        console.log('Importing from Danish Wiktionary...');

        let entries = [];

        try {
            // Get common Danish words from frequency list
            const searchTerms = Array.from(this.frequencyData.entries())
                .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
                .map(entry => entry[0]);

            if (this.options.limit) {
                searchTerms.length = this.options.limit;
            }

            console.log(`Fetching ${searchTerms.length} most frequent Danish words from Wiktionary`);

            for (const term of searchTerms) {
                try {
                    const wiktionaryEntries = await this.fetchWiktionaryEntry(term, 'da');
                    entries.push(...wiktionaryEntries);

                    // Rate limiting
                    await this.sleep(this.options.rateLimit);
                } catch (error) {
                    console.warn(`Failed to fetch Wiktionary entry for "${term}":`, error.message);
                }
            }

            console.log(`Imported ${entries.length} entries from Danish Wiktionary`);

            // Add fallback entries for common words not found in Wiktionary
            const fallbackEntries = await this.addFallbackEntries(searchTerms, entries);
            entries.push(...fallbackEntries);
            console.log(`Added ${fallbackEntries.length} fallback entries`);

        } catch (error) {
            console.error('Error importing from Danish Wiktionary:', error);
        }

        return entries;
    }

    /**
     * Add fallback entries for common words not found in Wiktionary
     */
    async addFallbackEntries(searchTerms, existingEntries) {
        const fallbackEntries = [];
        const existingWords = new Set(existingEntries.map(entry => entry.word.toLowerCase()));

        for (const term of searchTerms) {
            if (!existingWords.has(term.toLowerCase()) && this.translateToEnglish(term) !== term) {
                // This word is in our translation dictionary but wasn't found in Wiktionary
                const english = this.translateToEnglish(term);
                if (english && english !== term) {
                    const entry = {
                        word: term,
                        english: english,
                        pos: this.detectPOS(term, english),
                        gender: '',
                        frequency: this.frequencyData.get(term) || this.estimateFrequency(term),
                        ipa: this.estimateIPA(term),
                        definition: `${english} (${this.detectPOS(term, english)})`
                    };

                    const validationErrors = this.validateEntry(entry);
                    if (validationErrors.length === 0) {
                        fallbackEntries.push(entry);
                    }
                }
            }
        }

        return fallbackEntries;
    }

    /**
     * Fix known translation and POS issues in entries
     */
    fixKnownIssues(entries) {
        const knownCorrections = {
            // Pronouns
            'du': { english: 'you', pos: 'pronoun', definition: 'you (pronoun)' },
            'vi': { english: 'we', pos: 'pronoun', definition: 'we (pronoun)' },
            'han': { english: 'he', pos: 'pronoun', definition: 'he (pronoun)' },
            'så': { english: 'so', pos: 'adverb', definition: 'so (adverb)' },
            'der': { english: 'there', pos: 'adverb', definition: 'there (adverb)' },

            // Adverbs and conjunctions
            'og': { english: 'and', pos: 'conjunction', definition: 'and (conjunction)' },
            'eller': { english: 'or', pos: 'conjunction', definition: 'or (conjunction)' },
            'men': { english: 'but', pos: 'conjunction', definition: 'but (conjunction)' },
            'fordi': { english: 'because', pos: 'conjunction', definition: 'because (conjunction)' },
            'hvis': { english: 'if', pos: 'conjunction', definition: 'if (conjunction)' },

            // Prepositions
            'i': { english: 'in', pos: 'preposition', definition: 'in (preposition)' },
            'på': { english: 'on', pos: 'preposition', definition: 'on (preposition)' },
            'med': { english: 'with', pos: 'preposition', definition: 'with (preposition)' },
            'til': { english: 'to', pos: 'preposition', definition: 'to (preposition)' },
            'fra': { english: 'from', pos: 'preposition', definition: 'from (preposition)' },
            'for': { english: 'for', pos: 'preposition', definition: 'for (preposition)' },
            'mod': { english: 'against', pos: 'preposition', definition: 'against (preposition)' },
            'om': { english: 'about', pos: 'preposition', definition: 'about (preposition)' },
            'efter': { english: 'after', pos: 'preposition', definition: 'after (preposition)' },
            'før': { english: 'before', pos: 'preposition', definition: 'before (preposition)' },

            // Modal verbs
            'kan': { english: 'can', pos: 'verb', definition: 'can (verb)' },
            'skal': { english: 'shall', pos: 'verb', definition: 'shall (verb)' },
            'vil': { english: 'will', pos: 'verb', definition: 'will (verb)' },
            'må': { english: 'may', pos: 'verb', definition: 'may (verb)' },
            'bør': { english: 'should', pos: 'verb', definition: 'should (verb)' },
            'tør': { english: 'dare', pos: 'verb', definition: 'dare (verb)' }
        };

        const fixedEntries = entries.map(entry => {
            const correction = knownCorrections[entry.word.toLowerCase()];
            if (correction) {
                return {
                    ...entry,
                    english: correction.english || entry.english,
                    pos: correction.pos || entry.pos,
                    definition: correction.definition || entry.definition
                };
            }
            return entry;
        });

        return fixedEntries;
    }

    /**
     * Detect part of speech based on word characteristics and translation
     */
    detectPOS(word, english) {
        // Pronouns
        const pronouns = ['jeg', 'du', 'han', 'hun', 'det', 'vi', 'i', 'de', 'mig', 'dig', 'ham', 'hende', 'os', 'dem'];
        if (pronouns.includes(word.toLowerCase())) {
            return 'pronoun';
        }

        // Modal verbs
        const modalVerbs = ['kan', 'skal', 'vil', 'må', 'bør', 'tør'];
        if (modalVerbs.includes(word.toLowerCase())) {
            return 'verb';
        }

        // Check if English translation suggests pronoun (I, you, he, she, etc.)
        const englishPronouns = ['I', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
        if (englishPronouns.includes(english.toLowerCase())) {
            return 'pronoun';
        }

        // Common adverbs and particles
        const adverbs = ['og', 'eller', 'men', 'fordi', 'hvis', 'når', 'hvor', 'hvem', 'hvorfor', 'hvordan',
                         'ikke', 'ja', 'nej', 'måske', 'altid', 'aldrig', 'ofte', 'sjældent', 'nu', 'da',
                         'senere', 'tidligere', 'her', 'der', 'op', 'ned', 'ind', 'ud', 'frem', 'tilbage'];
        if (adverbs.includes(word.toLowerCase())) {
            return 'adverb';
        }

        // Prepositions
        const prepositions = ['i', 'på', 'under', 'over', 'ved', 'med', 'uden', 'til', 'fra', 'for', 'mod', 'om',
                             'efter', 'før', 'mellem', 'bag', 'foran'];
        if (prepositions.includes(word.toLowerCase())) {
            return 'preposition';
        }

        // Default to noun for most words
        return 'noun';
    }

    /**
     * Fetch a single entry from Wiktionary using enhanced caching
     */
    async fetchWiktionaryEntry(word, language = 'da') {
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
            const parsedEntries = this.parseWiktionaryContent(wikitext, word, language);
            entries.push(...parsedEntries);

        } catch (error) {
            console.warn(`Error fetching Wiktionary entry for "${word}":`, error.message);
        }

        return entries;
    }

    /**
     * Parse Wiktionary wikitext content
     */
    parseWiktionaryContent(wikitext, word, language) {
        const entries = [];

        try {
            // Look for Danish section
            const daSection = this.extractLanguageSection(wikitext, language);
            if (!daSection) return entries;

            // Extract IPA pronunciation
            const ipaMatch = daSection.match(/\{\{IPA\|([^}]+)\|lang=da\}\}/);
            const ipa = ipaMatch ? ipaMatch[1].replace(/\//g, '') : this.estimateIPA(word);

            // Prioritize external translation API for all words
            let englishTranslation = null; // Will be filled by external API in post-processing

            // Use local dictionary only for very common function words as fallback
            const commonWords = ['jeg', 'du', 'han', 'hun', 'det', 'vi', 'i', 'de', 'mig', 'dig', 'ham', 'hende', 'os', 'dem', 'og', 'eller', 'men', 'fordi', 'hvis', 'når', 'hvor', 'hvem', 'hvorfor', 'hvordan', 'ikke', 'ja', 'nej'];
            const dictionaryTranslation = this.translateToEnglish(word);

            // Only use dictionary translation as a final fallback for very common words
            if (commonWords.includes(word.toLowerCase()) && this.isValidEnglishTranslation(word, dictionaryTranslation)) {
                englishTranslation = `FALLBACK:${dictionaryTranslation}`; // Mark as fallback
            }

            // Extract noun definitions
            const nounMatches = daSection.match(/\{\{-noun-\|da\}\}(.*?)(?=\{\{-|$)/s);
            if (nounMatches) {
                const nounSection = nounMatches[1];
                const definitions = this.extractDefinitions(nounSection);

                // Extract gender information
                const genderMatch = nounSection.match(/\{\{([cn])\}\}/);
                const gender = genderMatch ? (genderMatch[1] === 'c' ? 'common' : 'neuter') : '';

                if (definitions.length > 0) {
                    entries.push({
                        word: word,
                        english: englishTranslation || '', // If null, will be filled later
                        pos: this.correctPOS(word, englishTranslation || '', 'noun'),
                        gender: gender,
                        frequency: this.frequencyData.get(word) || this.estimateFrequency(word),
                        ipa: `[${ipa}]`,
                        definition: definitions[0].definition
                    });
                }
            }

            // Extract verb definitions
            const verbMatches = daSection.match(/\{\{-verb-\|da\}\}(.*?)(?=\{\{-|$)/s);
            if (verbMatches) {
                const verbSection = verbMatches[1];
                const definitions = this.extractDefinitions(verbSection);

                if (definitions.length > 0) {
                    entries.push({
                        word: word,
                        english: englishTranslation || '',
                        pos: this.correctPOS(word, englishTranslation || '', 'verb'),
                        gender: '',
                        frequency: this.frequencyData.get(word) || this.estimateFrequency(word),
                        ipa: `[${ipa}]`,
                        definition: definitions[0].definition
                    });
                }
            }

            // Extract adjective definitions
            const adjMatches = daSection.match(/\{\{-adj-\|da\}\}(.*?)(?=\{\{-|$)/s);
            if (adjMatches) {
                const adjSection = adjMatches[1];
                const definitions = this.extractDefinitions(adjSection);

                if (definitions.length > 0) {
                    entries.push({
                        word: word,
                        english: englishTranslation || '',
                        pos: this.correctPOS(word, englishTranslation || '', 'adjective'),
                        gender: '',
                        frequency: this.frequencyData.get(word) || this.estimateFrequency(word),
                        ipa: `[${ipa}]`,
                        definition: definitions[0].definition
                    });
                }
            }

            // Extract pronoun definitions
            const pronounPatterns = [
                /\{\{-pron-\|da\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-pronomen-\|da\}\}(.*?)(?=\{\{-|$)/s,
                /===\s*Pronomen\s*===(.*?)(?====|===|\n==|$)/s,
                /===\s*Pronoun\s*===(.*?)(?====|===|\n==|$)/s
            ];

            for (const pattern of pronounPatterns) {
                const pronounMatches = daSection.match(pattern);
                if (pronounMatches) {
                    const pronounSection = pronounMatches[1];
                    const definitions = this.extractDefinitions(pronounSection);

                    if (definitions.length > 0) {
                        entries.push({
                            word: word,
                            english: englishTranslation || '',
                            pos: this.correctPOS(word, englishTranslation || '', 'pronoun'),
                            gender: '',
                            frequency: this.frequencyData.get(word) || this.estimateFrequency(word),
                            ipa: `[${ipa}]`,
                            definition: definitions[0].definition
                        });
                        break; // Found pronoun section, no need to check other patterns
                    }
                }
            }

            // Extract adverb definitions
            const adverbPatterns = [
                /\{\{-adv-\|da\}\}(.*?)(?=\{\{-|$)/s,
                /\{\{-adverb-\|da\}\}(.*?)(?=\{\{-|$)/s,
                /===\s*Adverbium\s*===(.*?)(?====|===|\n==|$)/s,
                /===\s*Adverb\s*===(.*?)(?====|===|\n==|$)/s
            ];

            for (const pattern of adverbPatterns) {
                const adverbMatches = daSection.match(pattern);
                if (adverbMatches) {
                    const adverbSection = adverbMatches[1];
                    const definitions = this.extractDefinitions(adverbSection);

                    if (definitions.length > 0) {
                        entries.push({
                            word: word,
                            english: englishTranslation || '',
                            pos: this.correctPOS(word, englishTranslation || '', 'adverb'),
                            gender: '',
                            frequency: this.frequencyData.get(word) || this.estimateFrequency(word),
                            ipa: `[${ipa}]`,
                            definition: definitions[0].definition
                        });
                        break; // Found adverb section, no need to check other patterns
                    }
                }
            }

        } catch (error) {
            console.warn(`Error parsing Wiktionary content for "${word}":`, error.message);
        }

        return entries;
    }

    /**
     * Validate English translation (not identical to source, alphabetic, reasonable length)
     */
    isValidEnglishTranslation(source, translation) {
        if (!translation || typeof translation !== 'string') return false;
        if (translation.toLowerCase() === source.toLowerCase()) return false;
        if (!/^[a-zA-Z]+$/.test(translation)) return false;
        return true;
    }

    /**
     * Post-process entries to get English translations primarily from external API
     */
    async fillMissingTranslations(entries) {
        console.log(`Fetching translations for ${entries.length} entries using external API...`);

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            // Always try external API first
            let translation = await this.fetchExternalTranslation(entry.word, 'da', 'en');

            console.log(`Translation for ${entry.word}: ${translation}`);

            if (this.isValidEnglishTranslation(entry.word, translation)) {
                entry.english = translation;
            } else if (entry.english && entry.english.startsWith('FALLBACK:')) {
                // Use dictionary fallback if API failed
                translation = entry.english.replace('FALLBACK:', '');
                entry.english = translation;
            } else {
                // Try local dictionary as last resort
                translation = this.translateToEnglish(entry.word);
                if (this.isValidEnglishTranslation(entry.word, translation)) {
                    entry.english = translation;
                } else {
                    // Mark for manual review
                    entry.english = 'NEEDS REVIEW';
                }
            }

            // Rate limiting for external API
            if (i < entries.length - 1) {
                await this.sleep(100); // Small delay between API calls
            }

            // Progress indicator
            if ((i + 1) % 10 === 0) {
                console.log(`Translated ${i + 1}/${entries.length} entries`);
            }
        }

        return entries;
    }

    /**
     * Fetch translation using improved translation API (inherits from BaseImporter)
     * This method is now handled by the base class with Google Translate, LibreTranslate, and MyMemory fallback
     */

    /**
     * Correct part of speech based on our dictionary knowledge
     */
    correctPOS(word, english, defaultPOS) {
        // Override POS for known common words
        const pronounWords = ['jeg', 'du', 'han', 'hun', 'det', 'vi', 'i', 'de', 'mig', 'dig', 'ham', 'hende', 'os', 'dem'];
        if (pronounWords.includes(word.toLowerCase())) {
            return 'pronoun';
        }

        const adverbWords = ['og', 'eller', 'men', 'fordi', 'hvis', 'når', 'hvor', 'hvem', 'hvorfor', 'hvordan', 'ikke', 'ja', 'nej', 'måske', 'altid', 'aldrig', 'ofte', 'sjældent', 'nu', 'da', 'senere', 'tidligere', 'her', 'der', 'op', 'ned', 'ind', 'ud', 'frem', 'tilbage'];
        if (adverbWords.includes(word.toLowerCase())) {
            return 'adverb';
        }

        const prepositionWords = ['i', 'på', 'under', 'over', 'ved', 'med', 'uden', 'til', 'fra', 'for', 'mod', 'om', 'efter', 'før', 'mellem', 'bag', 'foran'];
        if (prepositionWords.includes(word.toLowerCase())) {
            return 'preposition';
        }

        // Check if English translation suggests a specific POS
        const englishPronouns = ['I', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
        if (englishPronouns.includes(english.toLowerCase())) {
            return 'pronoun';
        }

        return defaultPOS;
    }

    /**
     * Extract language section from Wiktionary wikitext
     */
    extractLanguageSection(wikitext, language) {
        const langCode = language === 'da' ? 'da' : language;
        const sectionRegex = new RegExp(`\\{\\{=${langCode}=\\}\\}(.*?)(?=\\{\\{=\\w+=\\}\\}|$)`, 's');
        const match = wikitext.match(sectionRegex);
        return match ? match[1] : null;
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
        if (!wikitext) return null;

        // Look for English translation templates - Danish Wiktionary patterns
        const translationPatterns = [
            /\{\{t\|en\|([^}|]+)/,                   // {{t|en|word}}
            /\{\{t\+\|en\|([^}|]+)/,                 // {{t+|en|word}}
            /\{\{trad\|en\|([^}|]+)/,                // {{trad|en|word}} (Danish pattern)
            /\{\{oversættelse\|en\|([^}|]+)/,        // {{oversættelse|en|word}}
            /\{\{translation\|en\|([^}|]+)/,         // {{translation|en|word}}
            /{{en}}\s*:\s*([^\n{}]+)/,               // {{en}}: word
            /\{\{eng}}\s*:\s*([^\n{}]+)/,            // {{eng}}: word
            /\{\{engelsk}}\s*:\s*([^\n{}]+)/,        // {{engelsk}}: word
            /\{\{oversættelse}}\s*:\s*([^\n{}]+)/,   // {{oversættelse}}: word
            /{{t\|en}}\s*:\s*([^\n{}]+)/,            // {{t|en}}: word
            /{{trad\|en}}\s*:\s*([^\n{}]+)/,         // {{trad|en}}: word
            /{{translation\|en}}\s*:\s*([^\n{}]+)/,  // {{translation|en}}: word
            /{{en}}\s*=\s*([^\n{}]+)/,               // {{en}}=word
            /{{engelsk}}\s*=\s*([^\n{}]+)/,           // {{engelsk}}=word
            /{{oversættelse}}\s*=\s*([^\n{}]+)/,      // {{oversættelse}}=word
            /\{\{trad\|en\|([^}|]+)\}\}/,            // {{trad|en|word}}
            /\{\{overs\|en\|([^}|]+)\}\}/,           // {{overs|en|word}}
            /\{\{trans\|en\|([^}|]+)\}\}/            // {{trans|en|word}}
        ];

        // Also look for translation sections
        const translationSectionPatterns = [
            /===\s*Oversættelser\s*===(.*?)(?====|$)/s,
            /===\s*Translations\s*===(.*?)(?====|$)/s,
            /===\s*English\s*===(.*?)(?====|$)/s,
            /===\s*Engelsk\s*===(.*?)(?====|$)/s,
            /===\s*Oversættelse\s*===(.*?)(?====|$)/s,
            /===\s*Translation\s*===(.*?)(?====|$)/s
        ];

        // First try direct translation patterns
        for (const pattern of translationPatterns) {
            const match = wikitext.match(pattern);
            if (match) {
                const translation = match[1].trim();
                if (translation && translation.length > 1) {
                    return translation;
                }
            }
        }

        // If no direct patterns found, look for translation sections
        for (const pattern of translationSectionPatterns) {
            const match = wikitext.match(pattern);
            if (match) {
                const translationSection = match[1];
                // Look for English translations in the section
                const englishPatterns = [
                    /\*.*?en.*?:.*?\[\[([^\]]+)\]\]/,
                    /\*.*?engelsk.*?:.*?\[\[([^\]]+)\]\]/,
                    /en.*?:.*?([^\n]+)/,
                    /engelsk.*?:.*?([^\n]+)/
                ];

                for (const engPattern of englishPatterns) {
                    const engMatch = translationSection.match(engPattern);
                    if (engMatch) {
                        const translation = engMatch[1].trim();
                        if (translation && translation.length > 1) {
                            return translation;
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Simple Danish to English translation for common words
     */
    translateToEnglish(danishText) {
        if (!danishText) return '';

        const translations = {
            // Pronouns
            'jeg': 'I',
            'du': 'you',
            'han': 'he',
            'hun': 'she',
            'det': 'it',
            'vi': 'we',
            'i': 'you',
            'de': 'they',
            'mig': 'me',
            'dig': 'you',
            'ham': 'him',
            'hende': 'her',
            'os': 'us',
            'dem': 'them',

            // Common nouns
            'hus': 'house',
            'bil': 'car',
            'mand': 'man',
            'kvinde': 'woman',
            'barn': 'child',
            'arbejde': 'work',
            'arbejder': 'works',
            'skole': 'school',
            'bog': 'book',
            'sted': 'place',
            'tid': 'time',
            'dag': 'day',
            'nat': 'night',
            'år': 'year',
            'land': 'country',
            'by': 'city',
            'vand': 'water',
            'mad': 'food',
            'drik': 'drink',

            // Common adjectives
            'stor': 'big',
            'lille': 'small',
            'god': 'good',
            'dårlig': 'bad',
            'ny': 'new',
            'gammel': 'old',
            'ung': 'young',
            'glad': 'happy',
            'trist': 'sad',
            'rød': 'red',
            'blå': 'blue',
            'grøn': 'green',
            'gul': 'yellow',
            'sort': 'black',
            'hvid': 'white',
            'lang': 'long',
            'kort': 'short',
            'høj': 'high',
            'lav': 'low',

            // Common verbs
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
            'vågne': 'wake',
            'arbejde': 'work',
            'læse': 'read',
            'skrive': 'write',
            'løbe': 'run',
            'stå': 'stand',
            'sidde': 'sit',
            'ligge': 'lie',

            // Modal verbs
            'kan': 'can',
            'skal': 'shall',
            'vil': 'will',
            'må': 'may',
            'bør': 'should',
            'tør': 'dare',

            // Common adverbs and particles
            'og': 'and',
            'eller': 'or',
            'men': 'but',
            'fordi': 'because',
            'hvis': 'if',
            'når': 'when',
            'hvor': 'where',
            'hvem': 'who',
            'hvorfor': 'why',
            'hvordan': 'how',
            'ikke': 'not',
            'ja': 'yes',
            'nej': 'no',
            'måske': 'maybe',
            'altid': 'always',
            'aldrig': 'never',
            'ofte': 'often',
            'sjældent': 'rarely',
            'nu': 'now',
            'da': 'then',
            'senere': 'later',
            'tidligere': 'earlier',
            'her': 'here',
            'der': 'there',
            'op': 'up',
            'ned': 'down',
            'ind': 'in',
            'ud': 'out',
            'frem': 'forward',
            'tilbage': 'back',

            // Prepositions
            'i': 'in',
            'på': 'on',
            'under': 'under',
            'over': 'over',
            'ved': 'by',
            'med': 'with',
            'uden': 'without',
            'til': 'to',
            'fra': 'from',
            'for': 'for',
            'mod': 'against',
            'om': 'about',
            'efter': 'after',
            'før': 'before',
            'mellem': 'between',
            'bag': 'behind',
            'foran': 'in front of',

            // Numbers
            'en': 'one',
            'to': 'two',
            'tre': 'three',
            'fire': 'four',
            'fem': 'five',
            'seks': 'six',
            'syv': 'seven',
            'otte': 'eight',
            'ni': 'nine',
            'ti': 'ten',
            'hundrede': 'hundred',
            'tusind': 'thousand',

            // Other common words
            'bare': 'just',
            'lige': 'just',
            'alle': 'all',
            'noget': 'something',
            'intet': 'nothing',
            'alt': 'everything',
            'nogen': 'someone',
            'ingen': 'no one',
            'hver': 'each',
            'enhver': 'everyone',
            'selv': 'self',
            'samme': 'same',
            'anden': 'other',
            'første': 'first',
            'anden': 'second',
            'sidste': 'last'
        };

        // Simple word lookup - prioritize exact matches
        const cleanWord = danishText.toLowerCase().trim();
        if (translations[cleanWord]) {
            return translations[cleanWord];
        }

        // If no exact match, try splitting and looking for individual words
        const words = cleanWord.split(/\s+/);
        for (const word of words) {
            if (translations[word]) {
                return translations[word];
            }
        }

        return danishText;
    }

    /**
     * Estimate IPA transcription for Danish words
     */
    estimateIPA(word) {
        if (!word) return '';

        // Basic Danish phonetic patterns
        let ipa = word.toLowerCase();

        // Common Danish sound patterns
        ipa = ipa.replace(/kj/g, 'kʰ');
        ipa = ipa.replace(/d$/g, 'ð'); // Soft d at end
        ipa = ipa.replace(/d([^aeiouyæøå])/g, 'ð$1'); // Soft d before consonants
        ipa = ipa.replace(/g$/g, ''); // Silent g at end (often)
        ipa = ipa.replace(/r([^aeiouyæøå])/g, 'ɐ$1'); // Vocalized r
        ipa = ipa.replace(/y/g, 'y');
        ipa = ipa.replace(/ø/g, 'ø');
        ipa = ipa.replace(/å/g, 'ɔ');
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

        // Function words
        const functionWords = ['jeg', 'du', 'han', 'hun', 'det', 'vi', 'I', 'de', 'og', 'eller', 'men'];
        if (functionWords.includes(word)) freq += 2000;

        return Math.max(100, freq);
    }

    /**
     * Apply Nordum-specific processing to Danish entries
     */
    processForNordum(entries) {
        console.log('Processing Danish entries for Nordum compatibility...');

        const processed = entries.map(entry => {
            const processedEntry = { ...entry };

            // Apply Nordum rules:
            // 1. English loanwords stay unchanged (Danish practice)
            if (this.isEnglishLoanword(entry.word)) {
                processedEntry.nordum_note = 'English loanword preserved (Danish practice)';
            }

            // 2. Question words: remove 'hv' prefix
            if (entry.word.startsWith('hv') && ['pronoun', 'adverb'].includes(entry.pos)) {
                processedEntry.nordum_note = 'Question word - hv→v transformation needed';
            }

            // 3. Numbers: Danish vigesimal system will be replaced by Norwegian
            if (entry.pos === 'numeral' && this.isDanishVigesimalNumber(entry.word)) {
                processedEntry.nordum_note = 'Danish vigesimal number - will use Norwegian system';
            }

            // 4. Mark entries that strongly support Bokmål/Danish preference
            if (this.isBokmaalDanishForm(entry.word)) {
                processedEntry.nordum_priority = 'high';
            }

            return processedEntry;
        });

        console.log(`Processed ${processed.length} Danish entries for Nordum`);
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
            'arbejde', 'arbejder', 'køre', 'gøre', 'høre', 'være', 'lille', 'kaffe'
        ];

        return bokmaalDanishForms.includes(word.toLowerCase());
    }

    /**
     * Check if word is part of Danish vigesimal number system
     */
    isDanishVigesimalNumber(word) {
        const vigesimalNumbers = [
            'halvtreds', 'tres', 'halvfjerds', 'firs', 'halvfems'
        ];

        return vigesimalNumbers.includes(word.toLowerCase());
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

    const importer = new DanishImporter(options);

    importer.import()
        .then(() => {
            console.log('Danish import completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Danish import failed:', error);
            process.exit(1);
        });
}

module.exports = DanishImporter;
