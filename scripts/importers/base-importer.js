#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const csv = require('csv-parser');
const { createReadStream, createWriteStream } = require('fs');
const { getApiConfig } = require('./api-config');
const WiktionaryCache = require('./wiktionary-cache');

/**
 * Base class for dictionary importers with common functionality
 * including rate limiting, caching, error handling, and data validation
 */
class BaseImporter {
    constructor(language, options = {}) {
        this.language = language;
        this.apiConfig = getApiConfig();
        this.wiktionaryCache = new WiktionaryCache();

        this.options = {
            rateLimit: this.apiConfig.getRateLimit(),
            maxRetries: this.apiConfig.getMaxRetries(),
            timeout: this.apiConfig.getTimeout(),
            batchSize: this.apiConfig.getBatchSize(),
            cacheDirectory: path.join(__dirname, '../../data/cache'),
            outputDirectory: path.join(__dirname, '../../data/dictionary/sources'),
            ...options
        };

        this.requestQueue = [];
        this.processing = false;
        this.stats = {
            requested: 0,
            processed: 0,
            errors: 0,
            cached: 0,
            startTime: null
        };

        // Standard CSV columns for all importers
        this.csvColumns = [
            'word',
            'english',
            'pos',
            'gender',
            'frequency',
            'ipa',
            'definition'
        ];
    }

    /**
     * Initialize the importer - create directories, load cache, etc.
     */
    async init() {
        console.log(`Initializing ${this.language} importer...`);

        // Create necessary directories
        await this.ensureDirectories();

        // Initialize stats
        this.stats.startTime = Date.now();

        // Initialize Wiktionary cache
        await this.wiktionaryCache.init();

        console.log(`${this.language} importer ready`);
    }

    /**
     * Ensure all required directories exist
     */
    async ensureDirectories() {
        const directories = [
            this.options.cacheDirectory,
            this.options.outputDirectory,
            path.join(this.options.cacheDirectory, this.language)
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    /**
     * Make HTTP request with rate limiting and retry logic
     */
    async makeRequest(url, options = {}, service = null) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, options: { ...options, service }, resolve, reject });
            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process the request queue with rate limiting
     */
    async processQueue() {
        if (this.processing || this.requestQueue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();

            try {
                const result = await this._executeRequest(request.url, request.options);
                request.resolve(result);
                this.stats.requested++;
            } catch (error) {
                request.reject(error);
                this.stats.errors++;
            }

            // Rate limiting
            if (this.requestQueue.length > 0) {
                await this.sleep(this.options.rateLimit);
            }
        }

        this.processing = false;
    }

    /**
     * Execute a single HTTP request with retry logic
     */
    async _executeRequest(url, options = {}, retryCount = 0) {
        return new Promise((resolve, reject) => {
            // Check cache first
            const cacheKey = this.getCacheKey(url + JSON.stringify(options.body || ''));

            this.getFromCache(cacheKey)
                .then(cached => {
                    if (cached) {
                        this.stats.cached++;
                        resolve(cached);
                        return;
                    }

                    // Make actual request
                    const protocol = url.startsWith('https:') ? https : http;

                    const requestOptions = {
                        timeout: this.options.timeout,
                        headers: this.apiConfig.getHeaders(options.service, options.headers),
                        method: options.method || 'GET',
                        ...options
                    };

                    // Handle POST requests with body
                    if (options.method === 'POST' && options.body) {
                        const req = protocol.request(url, requestOptions, (res) => {
                            let data = '';

                            res.setEncoding('utf8');
                            res.on('data', chunk => {
                                data += chunk;
                            });

                            res.on('end', () => {
                                if (res.statusCode >= 200 && res.statusCode < 300) {
                                    // Cache successful response
                                    this.setCache(cacheKey, data);
                                    resolve(data);
                                } else if (res.statusCode >= 400 && retryCount < this.options.maxRetries) {
                                    // Retry on client/server errors
                                    setTimeout(() => {
                                        this._executeRequest(url, options, retryCount + 1)
                                            .then(resolve)
                                            .catch(reject);
                                    }, Math.pow(2, retryCount) * 1000);
                                } else {
                                    reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}...`));
                                }
                            });

                            res.on('error', (error) => {
                                reject(new Error(`Response error: ${error.message}`));
                            });
                        });

                        req.on('timeout', () => {
                            req.destroy();
                            if (retryCount < this.options.maxRetries) {
                                setTimeout(() => {
                                    this._executeRequest(url, options, retryCount + 1)
                                        .then(resolve)
                                        .catch(reject);
                                }, Math.pow(2, retryCount) * 1000);
                            } else {
                                reject(new Error('Request timeout'));
                            }
                        });

                        req.on('error', (error) => {
                            if (retryCount < this.options.maxRetries) {
                                setTimeout(() => {
                                    this._executeRequest(url, options, retryCount + 1)
                                        .then(resolve)
                                        .catch(reject);
                                }, Math.pow(2, retryCount) * 1000);
                            } else {
                                reject(error);
                            }
                        });

                        req.setTimeout(this.options.timeout);
                        req.write(options.body);
                        req.end();

                    } else {
                        // Handle GET requests
                        const req = protocol.get(url, requestOptions, (res) => {
                            let data = '';

                            res.setEncoding('utf8');
                            res.on('data', chunk => {
                                data += chunk;
                            });

                            res.on('end', () => {
                                if (res.statusCode >= 200 && res.statusCode < 300) {
                                    // Cache successful response
                                    this.setCache(cacheKey, data);
                                    resolve(data);
                                } else if (res.statusCode >= 400 && retryCount < this.options.maxRetries) {
                                    // Retry on client/server errors
                                    setTimeout(() => {
                                        this._executeRequest(url, options, retryCount + 1)
                                            .then(resolve)
                                            .catch(reject);
                                    }, Math.pow(2, retryCount) * 1000);
                                } else {
                                    reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}...`));
                                }
                            });

                            res.on('error', (error) => {
                                reject(new Error(`Response error: ${error.message}`));
                            });
                        });

                        req.on('timeout', () => {
                            req.destroy();
                            if (retryCount < this.options.maxRetries) {
                                setTimeout(() => {
                                    this._executeRequest(url, options, retryCount + 1)
                                        .then(resolve)
                                        .catch(reject);
                                }, Math.pow(2, retryCount) * 1000);
                            } else {
                                reject(new Error('Request timeout'));
                            }
                        });

                        req.on('error', (error) => {
                            if (retryCount < this.options.maxRetries) {
                                setTimeout(() => {
                                    this._executeRequest(url, options, retryCount + 1)
                                        .then(resolve)
                                        .catch(reject);
                                }, Math.pow(2, retryCount) * 1000);
                            } else {
                                reject(error);
                            }
                        });

                        req.setTimeout(this.options.timeout);
                    }
                })
                .catch(reject);
        });
    }

    /**
     * Generate cache key from URL
     */
    getCacheKey(url) {
        return url.replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Get data from cache
     */
    async getFromCache(cacheKey) {
        if (!this.apiConfig.isCacheEnabled()) {
            return null;
        }

        try {
            const cacheFile = path.join(this.options.cacheDirectory, this.language, `${cacheKey}.cache`);
            const stats = await fs.stat(cacheFile);

            // Check if cache is fresh
            const isExpired = Date.now() - stats.mtime.getTime() > this.apiConfig.getCacheExpiration();
            if (isExpired) {
                return null;
            }

            const data = await fs.readFile(cacheFile, 'utf8');
            return data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Store data in cache
     */
    async setCache(cacheKey, data) {
        if (!this.apiConfig.isCacheEnabled()) {
            return;
        }

        try {
            const cacheFile = path.join(this.options.cacheDirectory, this.language, `${cacheKey}.cache`);
            await fs.writeFile(cacheFile, data, 'utf8');
        } catch (error) {
            console.warn(`Failed to cache data: ${error.message}`);
        }
    }

    /**
     * Parse JSON safely
     */
    parseJSON(text) {
        try {
            if (!text || text.trim() === '') {
                return {};
            }
            return JSON.parse(text);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
    }

    /**
     * Parse XML using simple regex (for basic XML structures)
     */
    parseXML(text) {
        const entries = [];
        const entryRegex = /<entry[^>]*>(.*?)<\/entry>/gs;
        let match;

        while ((match = entryRegex.exec(text)) !== null) {
            const entry = {};
            const content = match[1];

            // Extract common fields
            const wordMatch = content.match(/<word[^>]*>(.*?)<\/word>/s);
            const posMatch = content.match(/<pos[^>]*>(.*?)<\/pos>/s);
            const defMatch = content.match(/<definition[^>]*>(.*?)<\/definition>/s);
            const ipaMatch = content.match(/<ipa[^>]*>(.*?)<\/ipa>/s);

            if (wordMatch) {
                entry.word = this.cleanText(wordMatch[1]);
                entry.pos = posMatch ? this.cleanText(posMatch[1]) : '';
                entry.definition = defMatch ? this.cleanText(defMatch[1]) : '';
                entry.ipa = ipaMatch ? this.cleanText(ipaMatch[1]) : '';
                entries.push(entry);
            }
        }

        return entries;
    }

    /**
     * Clean text content - remove HTML tags, normalize whitespace
     */
    cleanText(text) {
        if (!text) return '';

        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Validate word entry
     */
    validateEntry(entry) {
        const errors = [];

        // Required fields
        if (!entry.word || entry.word.trim().length === 0) {
            errors.push('Missing word');
        }

        // Word should only contain valid characters
        if (entry.word && !/^[a-zA-ZäöåÄÖÅæøÆØ\-']+$/.test(entry.word)) {
            errors.push('Invalid characters in word');
        }

        // POS should be valid
        const validPOS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'article'];
        if (entry.pos && !validPOS.includes(entry.pos.toLowerCase())) {
            // Don't error, just normalize
            entry.pos = this.normalizePOS(entry.pos);
        }

        // Gender should be valid for nouns
        if (entry.pos === 'noun' && entry.gender && !['common', 'neuter', 'masculine', 'feminine'].includes(entry.gender)) {
            errors.push('Invalid gender for noun');
        }

        // Frequency should be numeric if present
        if (entry.frequency && isNaN(parseInt(entry.frequency))) {
            errors.push('Invalid frequency value');
        }

        return errors;
    }

    /**
     * Normalize part of speech
     */
    normalizePOS(pos) {
        if (!pos) return 'noun';

        const normalized = pos.toLowerCase();
        const mapping = {
            'substantiv': 'noun',
            'navneord': 'noun',
            'n': 'noun',
            'sb': 'noun',
            'verbum': 'verb',
            'udsagnsord': 'verb',
            'v': 'verb',
            'vb': 'verb',
            'adjektiv': 'adjective',
            'tillægsord': 'adjective',
            'adj': 'adjective',
            'a': 'adjective',
            'adverbium': 'adverb',
            'biord': 'adverb',
            'adv': 'adverb',
            'pronomen': 'pronoun',
            'pron': 'pronoun',
            'præposition': 'preposition',
            'forholdsord': 'preposition',
            'prep': 'preposition',
            'konjunktion': 'conjunction',
            'bindeord': 'conjunction',
            'konj': 'conjunction',
            'interjektion': 'interjection',
            'udråbsord': 'interjection',
            'interj': 'interjection'
        };

        return mapping[normalized] || normalized;
    }

    /**
     * Write entries to CSV file
     */
    async writeToCSV(entries, filename = null) {
        if (!filename) {
            filename = `${this.language}.csv`;
        }

        const outputPath = path.join(this.options.outputDirectory, filename);
        const csvContent = [];

        // Add header
        csvContent.push(this.csvColumns.join(','));

        // Add entries
        for (const entry of entries) {
            const row = this.csvColumns.map(col => {
                const value = entry[col] || '';
                // Escape quotes and commas
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvContent.push(row.join(','));
        }

        await fs.writeFile(outputPath, csvContent.join('\n'), 'utf8');
        console.log(`Wrote ${entries.length} entries to ${outputPath}`);
    }

    /**
     * Load existing CSV file
     */
    async loadFromCSV(filename = null) {
        if (!filename) {
            filename = `${this.language}.csv`;
        }

        const inputPath = path.join(this.options.outputDirectory, filename);

        try {
            const entries = [];

            await new Promise((resolve, reject) => {
                createReadStream(inputPath)
                    .pipe(csv())
                    .on('data', (row) => {
                        entries.push(row);
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            return entries;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Merge new entries with existing ones
     */
    mergeEntries(existing, newEntries) {
        const existingWords = new Set(existing.map(entry => entry.word.toLowerCase()));
        const merged = [...existing];

        for (const entry of newEntries) {
            if (!existingWords.has(entry.word.toLowerCase())) {
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

    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Print progress statistics including Wiktionary cache stats
     */
    async printStats() {
        const elapsed = Date.now() - this.stats.startTime;
        const rate = this.stats.processed / (elapsed / 1000);

        console.log(`\n${this.language} Import Statistics:`);
        console.log(`  Processed: ${this.stats.processed}`);
        console.log(`  Requested: ${this.stats.requested}`);
        console.log(`  Cached: ${this.stats.cached}`);
        console.log(`  Errors: ${this.stats.errors}`);
        console.log(`  Rate: ${rate.toFixed(2)} entries/second`);
        console.log(`  Elapsed: ${(elapsed / 1000).toFixed(1)} seconds`);

        // Show Wiktionary cache statistics
        const cacheStats = await this.wiktionaryCache.getStats();
        console.log(`\nWiktionary Cache Performance:`);
        console.log(`  Cache hits: ${cacheStats.hits}`);
        console.log(`  Cache misses: ${cacheStats.misses}`);
        console.log(`  Hit rate: ${cacheStats.hitRate}%`);
        console.log(`  Total cached files: ${cacheStats.totalFiles}`);

        // Save cache stats
        await this.wiktionaryCache.saveStats();
    }

    /**
     * Check if a service is available for this language
     */
    isServiceAvailable(service) {
        return this.apiConfig.isServiceAvailable(this.language, service);
    }

    /**
     * Get service-specific configuration
     */
    getServiceConfig(service) {
        return this.apiConfig.getServiceConfig(this.language, service);
    }

    /**
     * Make a request to a specific service with proper rate limiting
     */
    async makeServiceRequest(service, url, options = {}) {
        const serviceConfig = this.getServiceConfig(service);

        if (!this.isServiceAvailable(service)) {
            throw new Error(`Service ${service} is not available for language ${this.language}`);
        }

        // Override rate limiting for this service
        const originalRateLimit = this.options.rateLimit;
        this.options.rateLimit = serviceConfig.rateLimit;

        try {
            const response = await this.makeRequest(url, {
                ...options,
                headers: serviceConfig.headers,
                timeout: serviceConfig.timeout
            }, service);

            return response;
        } finally {
            // Restore original rate limit
            this.options.rateLimit = originalRateLimit;
        }
    }

    /**
     * Fetch translation from external API (Google Translate, LibreTranslate, or MyMemory fallback)
     */
    async fetchExternalTranslation(word, sourceLang, targetLang = 'en') {
        if (!word || !sourceLang) return null;

        const cacheKey = `translation_${sourceLang}_${targetLang}_${word}`;
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                if (data.translatedText || data.responseData?.translatedText) {
                    return data.translatedText || data.responseData.translatedText;
                }
            } catch (e) {}
        }

        // Try Google Translate first (most reliable)
        if (this.apiConfig.isServiceAvailable('translation', 'googleTranslate')) {
            try {
                const translation = await this.fetchGoogleTranslate(word, sourceLang, targetLang);
                if (translation) {
                    await this.setCache(cacheKey, JSON.stringify({ translatedText: translation, source: 'google' }));
                    return translation;
                }
            } catch (error) {
                console.warn(`Google Translate failed for "${word}":`, error.message);
            }
        }

        // Try LibreTranslate as fallback (open source)
        if (this.apiConfig.isServiceAvailable('translation', 'libreTranslate')) {
            try {
                const translation = await this.fetchLibreTranslate(word, sourceLang, targetLang);
                if (translation) {
                    await this.setCache(cacheKey, JSON.stringify({ translatedText: translation, source: 'libre' }));
                    return translation;
                }
            } catch (error) {
                console.warn(`LibreTranslate failed for "${word}":`, error.message);
            }
        }

        // MyMemory as last resort fallback
        try {
            const translation = await this.fetchMyMemoryTranslate(word, sourceLang, targetLang);
            if (translation) {
                await this.setCache(cacheKey, JSON.stringify({ translatedText: translation, source: 'mymemory' }));
                return translation;
            }
        } catch (error) {
            console.warn(`MyMemory fallback failed for "${word}":`, error.message);
        }

        return null;
    }

    /**
     * Fetch translation from Google Translate API
     */
    async fetchGoogleTranslate(word, sourceLang, targetLang = 'en') {
        const apiKey = this.apiConfig.getApiKey('googleTranslate');
        if (!apiKey) {
            throw new Error('Google Translate API key not configured');
        }

        const endpoint = this.apiConfig.getEndpoint('translation', 'googleTranslate');
        const url = `${endpoint}?key=${apiKey}`;

        const postData = JSON.stringify({
            q: word,
            source: sourceLang,
            target: targetLang,
            format: 'text'
        });

        try {
            const response = await this.makeRequest(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                body: postData
            }, 'googleTranslate');

            const data = JSON.parse(response);
            if (data.data && data.data.translations && data.data.translations.length > 0) {
                return data.data.translations[0].translatedText;
            }
        } catch (error) {
            throw new Error(`Google Translate API error: ${error.message}`);
        }

        return null;
    }

    /**
     * Fetch translation from LibreTranslate API
     */
    async fetchLibreTranslate(word, sourceLang, targetLang = 'en') {
        const endpoint = this.apiConfig.getEndpoint('translation', 'libreTranslate');
        const apiKey = this.apiConfig.getApiKey('libreTranslate'); // Optional

        const postData = JSON.stringify({
            q: word,
            source: sourceLang,
            target: targetLang,
            format: 'text',
            ...(apiKey && { api_key: apiKey })
        });

        try {
            const response = await this.makeRequest(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                body: postData
            }, 'libreTranslate');

            const data = JSON.parse(response);
            if (data.translatedText) {
                return data.translatedText;
            }
        } catch (error) {
            throw new Error(`LibreTranslate API error: ${error.message}`);
        }

        return null;
    }

    /**
     * Fetch translation from MyMemory API (fallback)
     */
    async fetchMyMemoryTranslate(word, sourceLang, targetLang = 'en') {
        const endpoint = this.apiConfig.getEndpoint('translation', 'mymemory');
        const url = `${endpoint}?q=${encodeURIComponent(word)}&langpair=${sourceLang}|${targetLang}`;

        try {
            const response = await this.makeRequest(url);
            const data = JSON.parse(response);
            if (data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            }
        } catch (error) {
            throw new Error(`MyMemory API error: ${error.message}`);
        }

        return null;
    }

    /**
     * Fetch Wiktionary data with enhanced caching
     * This method provides fast, persistent caching for Wiktionary API calls
     */
    async fetchWiktionarySearch(word, language) {
        const url = `https://${language}.wiktionary.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(word)}&srlimit=1`;
        return await this.wiktionaryCache.fetchWiktionaryData(language, 'search', word, url);
    }

    /**
     * Fetch Wiktionary page content with enhanced caching
     * Uses original word as cache key for consistency, regardless of pageTitle variations
     */
    async fetchWiktionaryContent(pageTitle, language, originalWord = null) {
        const url = `https://${language}.wiktionary.org/w/api.php?action=query&format=json&prop=revisions&titles=${encodeURIComponent(pageTitle)}&rvprop=content&rvslots=main`;
        // Use originalWord for cache key if provided, otherwise use pageTitle
        const cacheKey = originalWord || pageTitle;
        return await this.wiktionaryCache.fetchWiktionaryData(language, 'content', cacheKey, url);
    }

    /**
     * Validate if an English translation is acceptable
     */
    isValidEnglishTranslation(source, translation) {
        if (!translation || typeof translation !== 'string') return false;
        if (translation.toLowerCase() === source.toLowerCase()) return false;
        // Only accept alphabetic words, no diacritics, no spaces
        if (!/^[a-zA-Z]+$/.test(translation)) return false;
        if (translation.length < 2) return false;

        // Filter out common false cognates and non-English words
        const badTranslations = ['har', 'gør', 'bare', 'wed', 'vi', 'du', 'jeg', 'han', 'hun', 'det'];
        if (badTranslations.includes(translation.toLowerCase())) return false;

        return true;
    }

    /**
     * Get the best available English translation for a word
     * Prioritizes external API, falls back to local dictionary for common words
     */
    async getTranslation(word, sourceLang, localTranslateFunction) {
        // First try external API
        const externalTranslation = await this.fetchExternalTranslation(word, sourceLang, 'en');
        if (this.isValidEnglishTranslation(word, externalTranslation)) {
            return externalTranslation;
        }

        // Fallback to local dictionary for very common words
        const localTranslation = localTranslateFunction ? localTranslateFunction(word) : null;
        if (this.isValidEnglishTranslation(word, localTranslation)) {
            return localTranslation;
        }

        // No valid translation found
        return null;
    }

    /**
     * Abstract method - must be implemented by subclasses
     */
    async import() {
        throw new Error('import() method must be implemented by subclass');
    }
}

module.exports = BaseImporter;
