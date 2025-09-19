#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const https = require('https');

/**
 * Enhanced caching system specifically for Wiktionary data
 * Provides persistent, efficient caching with long expiration times
 * since Wiktionary content is essentially static
 */
class WiktionaryCache {
    constructor(options = {}) {
        this.options = {
            cacheDirectory: path.join(__dirname, '../../data/cache/wiktionary'),
            // Wiktionary content rarely changes, so cache for a long time
            cacheExpiration: 30 * 24 * 60 * 60 * 1000, // 30 days
            compressionEnabled: true,
            ...options
        };
        
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            errors: 0,
            totalSize: 0
        };
        
        this.initialized = false;
    }

    /**
     * Initialize cache directories
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Create cache directory structure
            await fs.mkdir(this.options.cacheDirectory, { recursive: true });
            
            // Create language-specific subdirectories
            const languages = ['da', 'no', 'sv', 'en'];
            for (const lang of languages) {
                await fs.mkdir(path.join(this.options.cacheDirectory, lang), { recursive: true });
            }
            
            // Load existing cache statistics
            await this.loadStats();
            
            this.initialized = true;
            console.log(`Wiktionary cache initialized: ${this.options.cacheDirectory}`);
            
        } catch (error) {
            console.error('Failed to initialize Wiktionary cache:', error.message);
            throw error;
        }
    }

    /**
     * Generate cache key for Wiktionary API request
     */
    generateCacheKey(language, apiType, word) {
        // Normalize the word to ensure consistent caching
        // Remove common variations that should be treated as the same word
        const normalizedWord = word.toLowerCase()
            .trim()
            .replace(/\s+/g, ' '); // Normalize whitespace
        
        const keyData = `${language}:${apiType}:${normalizedWord}`;
        const hash = crypto.createHash('md5').update(keyData).digest('hex');
        return `${language}_${apiType}_${hash}`;
    }

    /**
     * Get cached Wiktionary data
     */
    async get(language, apiType, word) {
        await this.init();
        
        const cacheKey = this.generateCacheKey(language, apiType, word);
        const cacheFile = path.join(this.options.cacheDirectory, language, `${cacheKey}.json`);
        
        try {
            const stats = await fs.stat(cacheFile);
            
            // Check if cache is fresh
            const isExpired = Date.now() - stats.mtime.getTime() > this.options.cacheExpiration;
            if (isExpired) {
                this.stats.misses++;
                return null;
            }
            
            const data = await fs.readFile(cacheFile, 'utf8');
            const parsed = JSON.parse(data);
            
            this.stats.hits++;
            return parsed.content;
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.stats.errors++;
                console.warn(`Cache read error for ${cacheKey}:`, error.message);
            }
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Store data in cache
     */
    async set(language, apiType, word, data) {
        await this.init();
        
        if (!data) return;
        
        const cacheKey = this.generateCacheKey(language, apiType, word);
        const cacheFile = path.join(this.options.cacheDirectory, language, `${cacheKey}.json`);
        
        try {
            const cacheData = {
                key: cacheKey,
                language: language,
                apiType: apiType,
                word: word,
                content: data,
                cached: new Date().toISOString(),
                size: data.length
            };
            
            const jsonData = JSON.stringify(cacheData, null, 2);
            await fs.writeFile(cacheFile, jsonData, 'utf8');
            
            this.stats.writes++;
            this.stats.totalSize += jsonData.length;
            
        } catch (error) {
            this.stats.errors++;
            console.warn(`Cache write error for ${cacheKey}:`, error.message);
        }
    }

    /**
     * Make cached Wiktionary API request
     */
    async fetchWiktionaryData(language, apiType, word, url) {
        // Try cache first
        const cached = await this.get(language, apiType, word);
        if (cached) {
            return cached;
        }
        
        // Fetch from API
        try {
            const data = await this.makeHttpRequest(url);
            
            // Cache the result using the same word key
            await this.set(language, apiType, word, data);
            
            return data;
            
        } catch (error) {
            console.error(`Failed to fetch ${apiType} for "${word}" from ${language}.wiktionary.org:`, error.message);
            throw error;
        }
    }

    /**
     * Make HTTP request with proper headers
     */
    makeHttpRequest(url) {
        return new Promise((resolve, reject) => {
            const headers = {
                'User-Agent': 'Nordum Dictionary Importer/1.0 (https://nordum.org; contact@nordum.org)',
                'Accept': 'application/json'
            };
            
            const request = https.get(url, { headers }, (response) => {
                let data = '';
                
                response.setEncoding('utf8');
                response.on('data', chunk => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}: ${data.substring(0, 200)}...`));
                    }
                });
                
                response.on('error', reject);
            });
            
            request.on('error', reject);
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Batch fetch common words to warm up cache
     */
    async warmCache(language, commonWords) {
        console.log(`Warming cache for ${language} with ${commonWords.length} words...`);
        
        let warmed = 0;
        let skipped = 0;
        
        for (let i = 0; i < commonWords.length; i++) {
            const word = commonWords[i];
            
            try {
                // Check if search is already cached
                const searchCached = await this.get(language, 'search', word);
                if (!searchCached) {
                    const searchUrl = `https://${language}.wiktionary.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(word)}&srlimit=1`;
                    await this.fetchWiktionaryData(language, 'search', word, searchUrl);
                    warmed++;
                } else {
                    skipped++;
                }
                
                // Check if content is already cached
                // Use the same word as the cache key to maintain consistency
                const contentCached = await this.get(language, 'content', word);
                if (!contentCached) {
                    const contentUrl = `https://${language}.wiktionary.org/w/api.php?action=query&format=json&prop=revisions&titles=${encodeURIComponent(word)}&rvprop=content&rvslots=main`;
                    await this.fetchWiktionaryData(language, 'content', word, contentUrl);
                    warmed++;
                } else {
                    skipped++;
                }
                
                // Progress indicator
                if ((i + 1) % 10 === 0) {
                    console.log(`  Warmed ${i + 1}/${commonWords.length} words (${warmed} new, ${skipped} cached)`);
                }
                
                // Rate limiting - be gentle with Wiktionary
                await this.sleep(1500);
                
            } catch (error) {
                console.warn(`Failed to warm cache for "${word}":`, error.message);
            }
        }
        
        console.log(`Cache warming completed: ${warmed} new entries, ${skipped} already cached`);
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        await this.init();
        
        // Count files in cache
        let totalFiles = 0;
        let totalSizeOnDisk = 0;
        const languages = ['da', 'no', 'sv', 'en'];
        
        for (const lang of languages) {
            const langDir = path.join(this.options.cacheDirectory, lang);
            try {
                const files = await fs.readdir(langDir);
                totalFiles += files.length;
                
                for (const file of files) {
                    const filePath = path.join(langDir, file);
                    const stat = await fs.stat(filePath);
                    totalSizeOnDisk += stat.size;
                }
            } catch (error) {
                // Directory might not exist or be empty
            }
        }
        
        return {
            ...this.stats,
            totalFiles,
            totalSizeOnDisk,
            hitRate: this.stats.hits + this.stats.misses > 0 ? 
                (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) : '0.0',
            cacheDirectory: this.options.cacheDirectory,
            expirationDays: this.options.cacheExpiration / (24 * 60 * 60 * 1000)
        };
    }

    /**
     * Load cache statistics from file
     */
    async loadStats() {
        const statsFile = path.join(this.options.cacheDirectory, 'cache_stats.json');
        
        try {
            const data = await fs.readFile(statsFile, 'utf8');
            const savedStats = JSON.parse(data);
            
            // Merge with current stats
            this.stats = {
                ...this.stats,
                ...savedStats
            };
            
        } catch (error) {
            // File doesn't exist yet, use default stats
        }
    }

    /**
     * Save cache statistics to file
     */
    async saveStats() {
        const statsFile = path.join(this.options.cacheDirectory, 'cache_stats.json');
        
        try {
            const stats = await this.getStats();
            await fs.writeFile(statsFile, JSON.stringify(stats, null, 2), 'utf8');
        } catch (error) {
            console.warn('Failed to save cache statistics:', error.message);
        }
    }

    /**
     * Clean expired cache entries
     */
    async cleanExpired() {
        await this.init();
        
        console.log('Cleaning expired cache entries...');
        
        let removedFiles = 0;
        let totalFiles = 0;
        const languages = ['da', 'no', 'sv', 'en'];
        
        for (const lang of languages) {
            const langDir = path.join(this.options.cacheDirectory, lang);
            
            try {
                const files = await fs.readdir(langDir);
                totalFiles += files.length;
                
                for (const file of files) {
                    const filePath = path.join(langDir, file);
                    
                    try {
                        const stat = await fs.stat(filePath);
                        const isExpired = Date.now() - stat.mtime.getTime() > this.options.cacheExpiration;
                        
                        if (isExpired) {
                            await fs.unlink(filePath);
                            removedFiles++;
                        }
                    } catch (error) {
                        console.warn(`Error processing cache file ${filePath}:`, error.message);
                    }
                }
            } catch (error) {
                // Directory might not exist
            }
        }
        
        console.log(`Cleaned ${removedFiles} expired entries out of ${totalFiles} total`);
        return { removedFiles, totalFiles };
    }

    /**
     * Clear all cache
     */
    async clearAll() {
        await this.init();
        
        console.log('Clearing all cache...');
        
        const languages = ['da', 'no', 'sv', 'en'];
        let removedFiles = 0;
        
        for (const lang of languages) {
            const langDir = path.join(this.options.cacheDirectory, lang);
            
            try {
                const files = await fs.readdir(langDir);
                
                for (const file of files) {
                    const filePath = path.join(langDir, file);
                    await fs.unlink(filePath);
                    removedFiles++;
                }
            } catch (error) {
                // Directory might not exist
            }
        }
        
        // Reset stats
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            errors: 0,
            totalSize: 0
        };
        
        await this.saveStats();
        
        console.log(`Cleared ${removedFiles} cache entries`);
        return removedFiles;
    }

    /**
     * Print cache statistics
     */
    async printStats() {
        const stats = await this.getStats();
        
        console.log('Wiktionary Cache Statistics');
        console.log('===========================');
        console.log(`Cache directory: ${stats.cacheDirectory}`);
        console.log(`Total files: ${stats.totalFiles}`);
        console.log(`Total size on disk: ${(stats.totalSizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Cache expiration: ${stats.expirationDays} days`);
        console.log('');
        console.log('Session Statistics:');
        console.log(`  Hits: ${stats.hits}`);
        console.log(`  Misses: ${stats.misses}`);
        console.log(`  Hit rate: ${stats.hitRate}%`);
        console.log(`  Writes: ${stats.writes}`);
        console.log(`  Errors: ${stats.errors}`);
        console.log('');
        
        if (stats.totalFiles === 0) {
            console.log('💡 Cache is empty. Consider running cache warming for better performance.');
        } else if (parseFloat(stats.hitRate) > 80) {
            console.log('✅ Cache is performing well!');
        } else if (parseFloat(stats.hitRate) > 50) {
            console.log('⚠️  Cache hit rate could be improved. Consider warming cache.');
        } else {
            console.log('❌ Low cache hit rate. Check if cache is being used properly.');
        }
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Get common words for cache warming
 */
function getCommonWords(language) {
    const commonWords = {
        'da': [
            'og', 'i', 'at', 'det', 'er', 'til', 'en', 'af', 'den', 'for',
            'med', 'på', 'som', 'de', 'han', 'har', 'ikke', 'var', 'fra', 'hun',
            'arbejde', 'hus', 'bil', 'mand', 'kvinde', 'barn', 'skole', 'bog',
            'stor', 'lille', 'god', 'dårlig', 'ny', 'gammel', 'være', 'have',
            'gøre', 'komme', 'gå', 'se', 'høre', 'snakke', 'spise', 'drikke'
        ],
        'no': [
            'og', 'i', 'jeg', 'det', 'at', 'en', 'å', 'til', 'er', 'som',
            'på', 'de', 'med', 'han', 'av', 'ikke', 'der', 'så', 'var', 'meg',
            'arbeid', 'hus', 'bil', 'mann', 'kvinne', 'barn', 'skole', 'bok',
            'stor', 'liten', 'god', 'dårlig', 'ny', 'gammel', 'være', 'ha',
            'gjøre', 'komme', 'gå', 'se', 'høre', 'snakke', 'spise', 'drikke'
        ],
        'sv': [
            'och', 'i', 'att', 'det', 'som', 'en', 'på', 'är', 'av', 'för',
            'med', 'till', 'den', 'han', 'var', 'inte', 'från', 'de', 'så', 'har',
            'arbete', 'hus', 'bil', 'man', 'kvinna', 'barn', 'skola', 'bok',
            'stor', 'liten', 'bra', 'dålig', 'ny', 'gammal', 'vara', 'ha',
            'göra', 'komma', 'gå', 'se', 'höra', 'tala', 'äta', 'dricka'
        ]
    };
    
    return commonWords[language] || [];
}

// CLI interface
if (require.main === module) {
    const cache = new WiktionaryCache();
    const command = process.argv[2];
    const language = process.argv[3];
    
    switch (command) {
        case 'stats':
            cache.printStats()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Failed to get stats:', error);
                    process.exit(1);
                });
            break;
            
        case 'warm':
            if (!language || !['da', 'no', 'sv'].includes(language)) {
                console.log('Usage: node wiktionary-cache.js warm <language>');
                console.log('Languages: da, no, sv');
                process.exit(1);
            }
            
            const commonWords = getCommonWords(language);
            cache.warmCache(language, commonWords)
                .then(() => cache.saveStats())
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Cache warming failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'warm-all':
            (async () => {
                for (const lang of ['da', 'no', 'sv']) {
                    console.log(`\nWarming cache for ${lang}...`);
                    const words = getCommonWords(lang);
                    await cache.warmCache(lang, words);
                }
                await cache.saveStats();
                console.log('\nCache warming completed for all languages');
            })()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Cache warming failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'clean':
            cache.cleanExpired()
                .then(() => cache.saveStats())
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Cache cleaning failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'clear':
            cache.clearAll()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('Cache clearing failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Wiktionary Cache Manager');
            console.log('Usage: node wiktionary-cache.js <command> [options]');
            console.log('');
            console.log('Commands:');
            console.log('  stats                    - Show cache statistics');
            console.log('  warm <language>          - Warm cache with common words (da/no/sv)');
            console.log('  warm-all                 - Warm cache for all languages');
            console.log('  clean                    - Remove expired cache entries');
            console.log('  clear                    - Clear all cache');
            console.log('');
            console.log('Examples:');
            console.log('  node wiktionary-cache.js stats');
            console.log('  node wiktionary-cache.js warm da');
            console.log('  node wiktionary-cache.js warm-all');
            process.exit(0);
    }
}

module.exports = WiktionaryCache;