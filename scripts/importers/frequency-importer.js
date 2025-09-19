#!/usr/bin/env node

const BaseImporter = require('./base-importer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Frequency word list importer for Nordic languages
 * Imports the most common words from various frequency lists and corpora
 */
class FrequencyImporter extends BaseImporter {
    constructor(options = {}) {
        super('frequency', {
            ...options,
            sources: {
                // Online frequency lists
                danishFreq: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/da/da_50k.txt',
                norwegianFreq: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/no/no_50k.txt',
                swedishFreq: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/sv/sv_50k.txt',
                
                // Alternative sources
                danishWiktionary: 'https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Danish',
                norwegianWiktionary: 'https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Norwegian',
                swedishWiktionary: 'https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Swedish'
            }
        });
        
        this.frequencyLists = {
            danish: new Map(),
            norwegian: new Map(),
            swedish: new Map()
        };
    }

    async import() {
        console.log('Starting frequency word list import...');
        
        await this.init();
        
        try {
            // Import frequency lists for each language
            await this.importDanishFrequency();
            await this.importNorwegianFrequency();
            await this.importSwedishFrequency();
            
            // Generate combined frequency data
            await this.generateCombinedFrequencyList();
            
            // Export frequency data files
            await this.exportFrequencyData();
            
            this.printStats();
            console.log('Frequency import completed successfully');
            
        } catch (error) {
            console.error('Frequency import failed:', error);
            throw error;
        }
    }

    /**
     * Import Danish frequency words
     */
    async importDanishFrequency() {
        console.log('Importing Danish frequency words...');
        
        try {
            // Try to get from online source first
            const onlineWords = await this.fetchFrequencyList('danishFreq');
            if (onlineWords.length > 0) {
                this.frequencyLists.danish = new Map(onlineWords);
                console.log(`Loaded ${onlineWords.length} Danish frequency words from online source`);
                return;
            }
        } catch (error) {
            console.warn('Failed to load Danish words from online source:', error.message);
        }
        
        // Fallback to curated list
        const curatedWords = this.getCuratedDanishWords();
        this.frequencyLists.danish = new Map(curatedWords);
        console.log(`Loaded ${curatedWords.length} Danish frequency words from curated list`);
    }

    /**
     * Import Norwegian frequency words
     */
    async importNorwegianFrequency() {
        console.log('Importing Norwegian frequency words...');
        
        try {
            // Try to get from online source first
            const onlineWords = await this.fetchFrequencyList('norwegianFreq');
            if (onlineWords.length > 0) {
                this.frequencyLists.norwegian = new Map(onlineWords);
                console.log(`Loaded ${onlineWords.length} Norwegian frequency words from online source`);
                return;
            }
        } catch (error) {
            console.warn('Failed to load Norwegian words from online source:', error.message);
        }
        
        // Fallback to curated list
        const curatedWords = this.getCuratedNorwegianWords();
        this.frequencyLists.norwegian = new Map(curatedWords);
        console.log(`Loaded ${curatedWords.length} Norwegian frequency words from curated list`);
    }

    /**
     * Import Swedish frequency words
     */
    async importSwedishFrequency() {
        console.log('Importing Swedish frequency words...');
        
        try {
            // Try to get from online source first
            const onlineWords = await this.fetchFrequencyList('swedishFreq');
            if (onlineWords.length > 0) {
                this.frequencyLists.swedish = new Map(onlineWords);
                console.log(`Loaded ${onlineWords.length} Swedish frequency words from online source`);
                return;
            }
        } catch (error) {
            console.warn('Failed to load Swedish words from online source:', error.message);
        }
        
        // Fallback to curated list
        const curatedWords = this.getCuratedSwedishWords();
        this.frequencyLists.swedish = new Map(curatedWords);
        console.log(`Loaded ${curatedWords.length} Swedish frequency words from curated list`);
    }

    /**
     * Fetch frequency list from online source
     */
    async fetchFrequencyList(source) {
        const words = [];
        
        try {
            const url = this.options.sources[source];
            if (!url) return words;
            
            console.log(`Fetching frequency list from ${url}`);
            const response = await this.makeRequest(url);
            
            if (!response || response.trim() === '') {
                console.warn(`Empty response from ${source}`);
                return words;
            }
            
            // Parse the frequency list (format: word frequency)
            const lines = response.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 2) {
                    const word = parts[0].toLowerCase();
                    const freq = parseInt(parts[1]) || 1;
                    
                    // Basic word validation
                    if (this.isValidWord(word)) {
                        words.push([word, freq]);
                    }
                }
            }
            
            // Sort by frequency (descending)
            words.sort((a, b) => b[1] - a[1]);
            
            console.log(`Parsed ${words.length} valid words from ${source}`);
            
        } catch (error) {
            console.warn(`Error fetching frequency list from ${source}:`, error.message);
        }
        
        return words;
    }

    /**
     * Check if word is valid for frequency list
     */
    isValidWord(word) {
        if (!word || word.length < 2 || word.length > 30) return false;
        
        // Must contain only letters and common Nordic characters
        if (!/^[a-zA-ZæøåÆØÅäöÄÖ\-']+$/.test(word)) return false;
        
        // Skip obvious non-words
        const skipPatterns = [
            /^\d+$/, // Pure numbers
            /^[A-Z]+$/, // All caps (likely acronyms)
            /^[a-z]{1}$/, // Single letters
            /^www\.|\.com$|\.org$/, // Web addresses
            /^[^a-zA-Z]/ // Starting with non-letter
        ];
        
        for (const pattern of skipPatterns) {
            if (pattern.test(word)) return false;
        }
        
        return true;
    }

    /**
     * Generate combined frequency list for Nordum
     */
    async generateCombinedFrequencyList() {
        console.log('Generating combined frequency list for Nordum...');
        
        const nordumFreq = new Map();
        
        // Combine frequencies from all languages with Nordum rules
        const languages = ['danish', 'norwegian', 'swedish'];
        
        for (const lang of languages) {
            const langFreq = this.frequencyLists[lang];
            const multiplier = this.getLanguageMultiplier(lang);
            
            for (const [word, freq] of langFreq) {
                const adjustedFreq = freq * multiplier;
                
                if (nordumFreq.has(word)) {
                    // Word exists in multiple languages - combine frequencies
                    nordumFreq.set(word, nordumFreq.get(word) + adjustedFreq);
                } else {
                    nordumFreq.set(word, adjustedFreq);
                }
            }
        }
        
        // Apply Nordum-specific transformations
        const processedFreq = this.applyNordumTransformations(nordumFreq);
        
        this.frequencyLists.nordum = processedFreq;
        console.log(`Generated ${processedFreq.size} words in combined Nordum frequency list`);
    }

    /**
     * Get language multiplier for Nordum preferences
     */
    getLanguageMultiplier(language) {
        // Danish/Norwegian Bokmål preferred over Swedish
        switch (language) {
            case 'danish': return 1.2;      // Danish gets slight boost
            case 'norwegian': return 1.3;   // Norwegian Bokmål preferred
            case 'swedish': return 0.8;     // Swedish gets lower priority
            default: return 1.0;
        }
    }

    /**
     * Apply Nordum-specific transformations to frequency list
     */
    applyNordumTransformations(freqMap) {
        const processed = new Map();
        
        for (const [word, freq] of freqMap) {
            let nordumWord = word;
            let nordumFreq = freq;
            
            // Apply question word transformation: hv → v
            if (word.startsWith('hv')) {
                const transformedWord = 'v' + word.substring(2);
                nordumWord = transformedWord;
                
                // If both forms exist, combine their frequencies
                if (freqMap.has(transformedWord)) {
                    nordumFreq += freqMap.get(transformedWord);
                }
            }
            
            // Boost frequency for words that align with Nordum principles
            if (this.isNordumAlignedWord(word)) {
                nordumFreq *= 1.1;
            }
            
            // Lower frequency for uniquely Swedish words
            if (this.isUniquelySwedish(word)) {
                nordumFreq *= 0.7;
            }
            
            processed.set(nordumWord, Math.round(nordumFreq));
        }
        
        return processed;
    }

    /**
     * Check if word aligns with Nordum principles
     */
    isNordumAlignedWord(word) {
        // English loanwords (preserved in Nordum)
        const englishLoanwords = [
            'computer', 'internet', 'email', 'software', 'website', 'app',
            'smartphone', 'online', 'download', 'upload', 'password'
        ];
        
        // Question words with v- (preferred in Nordum)
        const vQuestionWords = ['vad', 'var', 'vem', 'varför', 'vilken'];
        
        // Norwegian number system (preferred over Danish vigesimal)
        const norwegianNumbers = [
            'tjue', 'trettio', 'førti', 'femti', 'seksti', 'sytti', 'åtti', 'nitti'
        ];
        
        return englishLoanwords.includes(word) || 
               vQuestionWords.includes(word) || 
               norwegianNumbers.includes(word);
    }

    /**
     * Check if word is uniquely Swedish
     */
    isUniquelySwedish(word) {
        const swedishSpecific = [
            'dator', 'mejl', 'mjukvara', 'webbsida', 'också', 'två', 'fyra', 
            'sex', 'sju', 'åtta', 'nio', 'tio', 'sjuttio', 'åttio', 'nittio'
        ];
        
        return swedishSpecific.includes(word);
    }

    /**
     * Export frequency data to files
     */
    async exportFrequencyData() {
        console.log('Exporting frequency data files...');
        
        const outputDir = path.join(this.options.outputDirectory, 'frequency');
        await fs.mkdir(outputDir, { recursive: true });
        
        // Export each language list
        for (const [lang, freqMap] of Object.entries(this.frequencyLists)) {
            const outputPath = path.join(outputDir, `${lang}_frequency.csv`);
            
            // Convert to sorted array
            const sortedWords = Array.from(freqMap.entries())
                .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
                .slice(0, 10000); // Top 10k words
            
            // Create CSV content
            const csvContent = [
                'word,frequency,rank',
                ...sortedWords.map((item, index) => `"${item[0]}",${item[1]},${index + 1}`)
            ].join('\n');
            
            await fs.writeFile(outputPath, csvContent, 'utf8');
            console.log(`Exported ${sortedWords.length} ${lang} frequency words to ${outputPath}`);
        }
        
        // Also export JSON format for easy programmatic access
        const jsonOutputPath = path.join(outputDir, 'frequency_data.json');
        const jsonData = {};
        
        for (const [lang, freqMap] of Object.entries(this.frequencyLists)) {
            jsonData[lang] = Object.fromEntries(freqMap);
        }
        
        await fs.writeFile(jsonOutputPath, JSON.stringify(jsonData, null, 2), 'utf8');
        console.log(`Exported complete frequency data to ${jsonOutputPath}`);
    }

    /**
     * Get curated Danish frequency words (fallback)
     */
    getCuratedDanishWords() {
        return [
            ['og', 50000], ['i', 48000], ['at', 45000], ['det', 42000], ['er', 40000],
            ['til', 38000], ['en', 36000], ['af', 34000], ['den', 32000], ['for', 30000],
            ['med', 28000], ['på', 26000], ['som', 24000], ['de', 22000], ['han', 20000],
            ['har', 18000], ['ikke', 16000], ['var', 14000], ['fra', 12000], ['hun', 10000],
            ['man', 9500], ['så', 9000], ['jeg', 8500], ['kan', 8000], ['vil', 7500],
            ['have', 7000], ['men', 6500], ['når', 6000], ['være', 5500], ['der', 5000],
            ['arbejde', 2000], ['hus', 1800], ['bil', 1600], ['stor', 1400], ['lille', 1200],
            ['god', 1000], ['dårlig', 950], ['ny', 900], ['gammel', 850], ['rød', 800],
            ['blå', 750], ['gul', 700], ['grøn', 650], ['sort', 600], ['hvid', 550],
            ['hvad', 3000], ['hvor', 2800], ['hvem', 2600], ['hvorfor', 2400], ['hvilken', 2200]
        ];
    }

    /**
     * Get curated Norwegian frequency words (fallback)
     */
    getCuratedNorwegianWords() {
        return [
            ['og', 50000], ['i', 48000], ['jeg', 45000], ['det', 42000], ['at', 40000],
            ['en', 38000], ['å', 36000], ['til', 34000], ['er', 32000], ['som', 30000],
            ['på', 28000], ['de', 26000], ['med', 24000], ['han', 22000], ['av', 20000],
            ['ikke', 18000], ['der', 16000], ['så', 15000], ['var', 14000], ['meg', 13000],
            ['seg', 12000], ['men', 11000], ['ett', 10000], ['har', 9500], ['om', 9000],
            ['vi', 8500], ['min', 8000], ['mitt', 7500], ['ha', 7000], ['hadde', 6500],
            ['arbeid', 2000], ['hus', 1800], ['bil', 1600], ['stor', 1400], ['liten', 1200],
            ['god', 1000], ['dårlig', 950], ['ny', 900], ['gammel', 850], ['rød', 800],
            ['blå', 750], ['gul', 700], ['grønn', 650], ['svart', 600], ['hvit', 550],
            ['hva', 3000], ['hvor', 2800], ['hvem', 2600], ['hvorfor', 2400], ['hvilken', 2200]
        ];
    }

    /**
     * Get curated Swedish frequency words (fallback)
     */
    getCuratedSwedishWords() {
        return [
            ['och', 50000], ['i', 48000], ['att', 45000], ['det', 42000], ['som', 40000],
            ['en', 38000], ['på', 36000], ['är', 34000], ['av', 32000], ['för', 30000],
            ['med', 28000], ['till', 26000], ['den', 24000], ['han', 22000], ['var', 20000],
            ['inte', 18000], ['från', 16000], ['de', 15000], ['så', 14000], ['har', 13000],
            ['jag', 12000], ['men', 11000], ['ett', 10000], ['om', 9500], ['vid', 9000],
            ['hade', 8500], ['vi', 8000], ['kan', 7500], ['du', 7000], ['skulle', 6500],
            ['arbete', 2000], ['hus', 1800], ['bil', 1600], ['stor', 1400], ['liten', 1200],
            ['bra', 1000], ['dålig', 950], ['ny', 900], ['gammal', 850], ['röd', 800],
            ['blå', 750], ['gul', 700], ['grön', 650], ['svart', 600], ['vit', 550],
            ['vad', 3000], ['var', 2800], ['vem', 2600], ['varför', 2400], ['vilken', 2200]
        ];
    }

    /**
     * Print statistics
     */
    printStats() {
        console.log('\nFrequency Import Statistics:');
        console.log('============================');
        
        for (const [lang, freqMap] of Object.entries(this.frequencyLists)) {
            console.log(`${lang.charAt(0).toUpperCase() + lang.slice(1)}: ${freqMap.size} words`);
        }
        
        const elapsed = Date.now() - this.stats.startTime;
        console.log(`\nElapsed: ${(elapsed / 1000).toFixed(1)} seconds`);
    }
}

// CLI interface
if (require.main === module) {
    const importer = new FrequencyImporter();
    
    const options = {};
    
    // Parse command line arguments
    process.argv.forEach(arg => {
        if (arg.startsWith('--limit=')) {
            options.limit = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--language=')) {
            options.language = arg.split('=')[1];
        } else if (arg.startsWith('--output=')) {
            options.outputDirectory = arg.split('=')[1];
        }
    });
    
    importer.import()
        .then(() => {
            console.log('Frequency word import completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Frequency word import failed:', error);
            process.exit(1);
        });
}

module.exports = FrequencyImporter;