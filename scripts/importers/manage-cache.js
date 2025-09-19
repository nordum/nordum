#!/usr/bin/env node

/**
 * Cache Management Script for Nordum Dictionary Importers
 * Provides easy commands to warm up, clean, and manage Wiktionary cache
 */

const WiktionaryCache = require('./wiktionary-cache');
const fs = require('fs').promises;
const path = require('path');

class CacheManager {
    constructor() {
        this.cache = new WiktionaryCache();
    }

    /**
     * Warm cache with frequency-based word lists
     */
    async warmCacheWithFrequencyData() {
        console.log('🔥 Warming cache with frequency data...\n');

        const languages = ['da', 'no', 'sv'];
        let totalWarmed = 0;

        for (const lang of languages) {
            console.log(`📚 Loading frequency data for ${lang}...`);
            
            try {
                const frequencyWords = await this.loadFrequencyWords(lang);
                if (frequencyWords.length === 0) {
                    console.log(`⚠️  No frequency data found for ${lang}, using common words`);
                    const commonWords = this.getCommonWords(lang);
                    await this.cache.warmCache(lang, commonWords);
                    totalWarmed += commonWords.length;
                } else {
                    // Use top 200 most frequent words
                    const topWords = frequencyWords.slice(0, 200);
                    console.log(`🚀 Warming cache with ${topWords.length} most frequent ${lang} words`);
                    await this.cache.warmCache(lang, topWords);
                    totalWarmed += topWords.length;
                }
            } catch (error) {
                console.error(`❌ Failed to warm cache for ${lang}:`, error.message);
                // Fallback to common words
                const commonWords = this.getCommonWords(lang);
                await this.cache.warmCache(lang, commonWords);
                totalWarmed += commonWords.length;
            }

            console.log(''); // Add spacing between languages
        }

        await this.cache.saveStats();
        console.log(`✅ Cache warming completed! Processed ${totalWarmed} words total.`);
        
        // Show final stats
        await this.cache.printStats();
    }

    /**
     * Load frequency words from CSV files
     */
    async loadFrequencyWords(language) {
        const languageMap = {
            'da': 'danish',
            'no': 'norwegian', 
            'sv': 'swedish'
        };

        const frequencyPath = path.join(__dirname, `../../data/dictionary/sources/frequency/${languageMap[language]}_frequency.csv`);
        
        try {
            const csvContent = await fs.readFile(frequencyPath, 'utf8');
            const lines = csvContent.split('\n').slice(1); // Skip header
            const words = [];

            for (const line of lines) {
                if (!line.trim()) continue;
                const [word, frequencyStr] = line.split(',');
                const cleanWord = word.replace(/"/g, '').trim();
                const frequency = parseInt(frequencyStr) || 0;

                if (cleanWord && this.isValidWord(cleanWord) && frequency > 0) {
                    words.push(cleanWord);
                }
            }

            // Sort by frequency (already sorted in CSV, but just in case)
            return words;

        } catch (error) {
            console.warn(`Could not load frequency file for ${language}:`, error.message);
            return [];
        }
    }

    /**
     * Check if word is valid for caching
     */
    isValidWord(word) {
        if (!word || word.length < 2 || word.length > 30) return false;
        return /^[a-zA-ZæøåÆØÅäöÄÖ\-']+$/.test(word);
    }

    /**
     * Get common words as fallback
     */
    getCommonWords(language) {
        const commonWords = {
            'da': [
                'og', 'i', 'at', 'det', 'er', 'til', 'en', 'af', 'den', 'for',
                'med', 'på', 'som', 'de', 'han', 'har', 'ikke', 'var', 'fra', 'hun',
                'arbejde', 'hus', 'bil', 'mand', 'kvinde', 'barn', 'skole', 'bog',
                'stor', 'lille', 'god', 'dårlig', 'ny', 'gammel', 'rød', 'blå',
                'være', 'have', 'gøre', 'komme', 'gå', 'se', 'høre', 'snakke',
                'spise', 'drikke', 'sove', 'arbejde', 'læse', 'skrive', 'køre'
            ],
            'no': [
                'og', 'i', 'jeg', 'det', 'at', 'en', 'å', 'til', 'er', 'som',
                'på', 'de', 'med', 'han', 'av', 'ikke', 'der', 'så', 'var', 'meg',
                'arbeid', 'hus', 'bil', 'mann', 'kvinne', 'barn', 'skole', 'bok',
                'stor', 'liten', 'god', 'dårlig', 'ny', 'gammel', 'rød', 'blå',
                'være', 'ha', 'gjøre', 'komme', 'gå', 'se', 'høre', 'snakke',
                'spise', 'drikke', 'sove', 'arbeide', 'lese', 'skrive', 'kjøre'
            ],
            'sv': [
                'och', 'i', 'att', 'det', 'som', 'en', 'på', 'är', 'av', 'för',
                'med', 'till', 'den', 'han', 'var', 'inte', 'från', 'de', 'så', 'har',
                'arbete', 'hus', 'bil', 'man', 'kvinna', 'barn', 'skola', 'bok',
                'stor', 'liten', 'bra', 'dålig', 'ny', 'gammal', 'röd', 'blå',
                'vara', 'ha', 'göra', 'komma', 'gå', 'se', 'höra', 'tala',
                'äta', 'dricka', 'sova', 'arbeta', 'läsa', 'skriva', 'köra'
            ]
        };
        
        return commonWords[language] || [];
    }

    /**
     * Quick warm-up with essential words only
     */
    async quickWarmup() {
        console.log('⚡ Quick cache warm-up with essential words...\n');

        const languages = ['da', 'no', 'sv'];
        let totalWarmed = 0;

        for (const lang of languages) {
            const essentialWords = this.getEssentialWords(lang);
            console.log(`🔥 Warming ${lang} cache with ${essentialWords.length} essential words`);
            await this.cache.warmCache(lang, essentialWords);
            totalWarmed += essentialWords.length;
        }

        await this.cache.saveStats();
        console.log(`✅ Quick warm-up completed! Processed ${totalWarmed} essential words.`);
    }

    /**
     * Get most essential words for quick warm-up
     */
    getEssentialWords(language) {
        const essentialWords = {
            'da': [
                'og', 'i', 'at', 'det', 'er', 'til', 'en', 'han', 'hun', 'ikke',
                'arbejde', 'hus', 'bil', 'mand', 'kvinde', 'barn', 'være', 'have',
                'gøre', 'komme', 'gå', 'se', 'stor', 'lille', 'god', 'ny'
            ],
            'no': [
                'og', 'i', 'jeg', 'det', 'at', 'en', 'han', 'hun', 'ikke', 'der',
                'arbeid', 'hus', 'bil', 'mann', 'kvinne', 'barn', 'være', 'ha',
                'gjøre', 'komme', 'gå', 'se', 'stor', 'liten', 'god', 'ny'
            ],
            'sv': [
                'och', 'i', 'att', 'det', 'som', 'en', 'han', 'hon', 'inte', 'var',
                'arbete', 'hus', 'bil', 'man', 'kvinna', 'barn', 'vara', 'ha',
                'göra', 'komma', 'gå', 'se', 'stor', 'liten', 'bra', 'ny'
            ]
        };
        
        return essentialWords[language] || [];
    }

    /**
     * Analyze cache performance
     */
    async analyzeCachePerformance() {
        console.log('📊 Analyzing cache performance...\n');

        const stats = await this.cache.getStats();
        
        console.log('Cache Performance Analysis');
        console.log('==========================');
        
        // Basic stats
        console.log(`📁 Cache location: ${stats.cacheDirectory}`);
        console.log(`📄 Total files: ${stats.totalFiles}`);
        console.log(`💾 Disk usage: ${(stats.totalSizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
        console.log(`⏰ Cache expiration: ${stats.expirationDays} days`);
        console.log('');

        // Performance metrics
        console.log('Performance Metrics:');
        console.log(`🎯 Hit rate: ${stats.hitRate}%`);
        console.log(`✅ Cache hits: ${stats.hits}`);
        console.log(`❌ Cache misses: ${stats.misses}`);
        console.log(`✏️  Cache writes: ${stats.writes}`);
        console.log(`⚠️  Errors: ${stats.errors}`);
        console.log('');

        // Analysis and recommendations
        console.log('Analysis & Recommendations:');
        
        if (stats.totalFiles === 0) {
            console.log('❌ Cache is empty!');
            console.log('💡 Run: node manage-cache.js warm-quick');
            console.log('💡 Or: node manage-cache.js warm-full');
        } else if (parseFloat(stats.hitRate) > 90) {
            console.log('🎉 Excellent cache performance!');
            console.log('✅ Your cache is working very well.');
        } else if (parseFloat(stats.hitRate) > 70) {
            console.log('✅ Good cache performance');
            console.log('💡 Consider warming cache for better performance.');
        } else if (parseFloat(stats.hitRate) > 50) {
            console.log('⚠️  Moderate cache performance');
            console.log('💡 Run cache warming to improve hit rate.');
        } else {
            console.log('❌ Poor cache performance');
            console.log('💡 Cache may not be used properly or needs warming.');
        }

        // Disk usage analysis
        const avgFileSize = stats.totalFiles > 0 ? stats.totalSizeOnDisk / stats.totalFiles : 0;
        console.log(`📏 Average file size: ${(avgFileSize / 1024).toFixed(2)} KB`);
        
        if (stats.totalSizeOnDisk > 100 * 1024 * 1024) { // > 100MB
            console.log('💿 Cache is quite large - consider cleaning expired entries.');
            console.log('💡 Run: node manage-cache.js clean');
        }
    }

    /**
     * Estimate cache warm-up time
     */
    async estimateWarmupTime() {
        console.log('⏱️  Estimating cache warm-up time...\n');

        const languages = ['da', 'no', 'sv'];
        let totalWords = 0;
        let estimatedTime = 0;

        for (const lang of languages) {
            try {
                const frequencyWords = await this.loadFrequencyWords(lang);
                const wordsToWarm = Math.min(frequencyWords.length, 200);
                totalWords += wordsToWarm * 2; // 2 API calls per word (search + content)
                
                console.log(`${lang}: ${wordsToWarm} words (${wordsToWarm * 2} API calls)`);
            } catch (error) {
                const commonWords = this.getCommonWords(lang);
                totalWords += commonWords.length * 2;
                console.log(`${lang}: ${commonWords.length} words (${commonWords.length * 2} API calls) - fallback`);
            }
        }

        // Estimate time: 1.5 seconds per API call (rate limiting)
        estimatedTime = totalWords * 1.5;

        console.log(`\n📊 Warm-up Estimation:`);
        console.log(`🔢 Total API calls: ${totalWords}`);
        console.log(`⏰ Estimated time: ${Math.round(estimatedTime / 60)} minutes ${Math.round(estimatedTime % 60)} seconds`);
        console.log(`📶 Rate: 1.5 seconds per API call (Wiktionary rate limiting)`);
        console.log('');
        console.log('💡 Tip: Use "warm-quick" for faster setup with essential words only.');
    }
}

// CLI interface
if (require.main === module) {
    const manager = new CacheManager();
    const command = process.argv[2];

    switch (command) {
        case 'warm-full':
            console.log('🔥 Starting full cache warm-up...\n');
            manager.warmCacheWithFrequencyData()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Cache warm-up failed:', error);
                    process.exit(1);
                });
            break;

        case 'warm-quick':
            manager.quickWarmup()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Quick warm-up failed:', error);
                    process.exit(1);
                });
            break;

        case 'stats':
            manager.cache.printStats()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Failed to get stats:', error);
                    process.exit(1);
                });
            break;

        case 'analyze':
            manager.analyzeCachePerformance()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Analysis failed:', error);
                    process.exit(1);
                });
            break;

        case 'estimate':
            manager.estimateWarmupTime()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Estimation failed:', error);
                    process.exit(1);
                });
            break;

        case 'clean':
            console.log('🧹 Cleaning expired cache entries...\n');
            manager.cache.cleanExpired()
                .then(result => {
                    console.log(`✅ Cleaned ${result.removedFiles} expired entries`);
                    return manager.cache.saveStats();
                })
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Cache cleaning failed:', error);
                    process.exit(1);
                });
            break;

        case 'clear':
            console.log('⚠️  This will delete ALL cached data!');
            console.log('Are you sure? This action cannot be undone.');
            
            // Simple confirmation
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Type "yes" to confirm: ', (answer) => {
                rl.close();
                
                if (answer.toLowerCase() === 'yes') {
                    manager.cache.clearAll()
                        .then(count => {
                            console.log(`✅ Cleared ${count} cache entries`);
                            process.exit(0);
                        })
                        .catch(error => {
                            console.error('❌ Cache clearing failed:', error);
                            process.exit(1);
                        });
                } else {
                    console.log('❌ Operation cancelled');
                    process.exit(0);
                }
            });
            break;

        case 'help':
        default:
            console.log('🗂️  Nordum Dictionary Cache Manager');
            console.log('====================================\n');
            console.log('📋 Available Commands:');
            console.log('');
            console.log('🔥 Warming Commands:');
            console.log('  warm-full    - Full cache warm-up with frequency data (recommended)');
            console.log('  warm-quick   - Quick warm-up with essential words only');
            console.log('');
            console.log('📊 Analysis Commands:');
            console.log('  stats        - Show cache statistics');
            console.log('  analyze      - Detailed performance analysis');
            console.log('  estimate     - Estimate warm-up time');
            console.log('');
            console.log('🧹 Maintenance Commands:');
            console.log('  clean        - Remove expired cache entries');
            console.log('  clear        - Clear all cache (with confirmation)');
            console.log('  help         - Show this help message');
            console.log('');
            console.log('💡 Quick Start:');
            console.log('  1. node manage-cache.js estimate    # See how long warm-up will take');
            console.log('  2. node manage-cache.js warm-quick  # Quick setup (5 minutes)');
            console.log('  3. node manage-cache.js stats       # Check performance');
            console.log('');
            console.log('🚀 For best performance, run warm-full (takes longer but caches more words)');
            process.exit(0);
    }
}

module.exports = CacheManager;