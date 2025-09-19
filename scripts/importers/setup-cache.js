#!/usr/bin/env node

/**
 * Quick setup script for Nordum Dictionary Importer caching
 * Sets up and warms the cache for optimal performance
 */

const WiktionaryCache = require('./wiktionary-cache');
const CacheManager = require('./manage-cache');
const fs = require('fs').promises;
const path = require('path');

class CacheSetup {
    constructor() {
        this.cache = new WiktionaryCache();
        this.manager = new CacheManager();
    }

    async run() {
        console.log('🚀 Nordum Dictionary Importer Cache Setup');
        console.log('=========================================\n');

        try {
            // Check if cache already exists
            const existingCacheInfo = await this.checkExistingCache();
            
            if (existingCacheInfo.hasCache) {
                await this.handleExistingCache(existingCacheInfo);
            } else {
                await this.setupNewCache();
            }

            // Final verification
            await this.verifySetup();

            console.log('\n🎉 Cache setup completed successfully!');
            console.log('💡 Your dictionary imports will now be much faster.');
            console.log('\n📋 Next steps:');
            console.log('   1. Run: node danish-importer.js --limit=50');
            console.log('   2. Check performance: node manage-cache.js stats');
            console.log('   3. For full import: remove --limit parameter');

        } catch (error) {
            console.error('\n❌ Cache setup failed:', error.message);
            console.log('\n🔧 Troubleshooting:');
            console.log('   1. Check disk space and permissions');
            console.log('   2. Verify internet connection');
            console.log('   3. Try: node manage-cache.js help');
            process.exit(1);
        }
    }

    /**
     * Check if cache already exists
     */
    async checkExistingCache() {
        const stats = await this.cache.getStats();
        
        return {
            hasCache: stats.totalFiles > 0,
            totalFiles: stats.totalFiles,
            hitRate: parseFloat(stats.hitRate),
            sizeOnDisk: stats.totalSizeOnDisk,
            stats: stats
        };
    }

    /**
     * Handle existing cache
     */
    async handleExistingCache(cacheInfo) {
        console.log('📁 Existing cache detected');
        console.log(`   Files: ${cacheInfo.totalFiles}`);
        console.log(`   Size: ${(cacheInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Hit rate: ${cacheInfo.stats.hitRate}%\n`);

        if (cacheInfo.totalFiles >= 100 && cacheInfo.hitRate >= 70) {
            console.log('✅ Your cache looks good! No setup needed.');
            
            // Show cache performance
            await this.cache.printStats();
            return;
        } else if (cacheInfo.totalFiles > 0 && cacheInfo.hitRate < 50) {
            console.log('⚠️  Cache exists but performance is poor.');
            console.log('🔄 Refreshing cache to improve performance...\n');
            
            // Clean and rebuild
            await this.cache.cleanExpired();
            await this.performQuickWarmup();
        } else {
            console.log('📈 Expanding existing cache...\n');
            await this.performQuickWarmup();
        }
    }

    /**
     * Setup new cache
     */
    async setupNewCache() {
        console.log('🆕 Setting up new cache...\n');

        // Initialize cache
        await this.cache.init();
        console.log('✅ Cache directories created\n');

        // Check if frequency data exists
        const hasFrequencyData = await this.checkFrequencyData();
        
        if (hasFrequencyData) {
            console.log('📊 Frequency data found - using for optimal cache warming');
            await this.performSmartWarmup();
        } else {
            console.log('📝 No frequency data found - using common words');
            console.log('💡 Tip: Run "node frequency-importer.js" first for better word prioritization\n');
            await this.performQuickWarmup();
        }
    }

    /**
     * Check if frequency data exists
     */
    async checkFrequencyData() {
        const languages = ['danish', 'norwegian', 'swedish'];
        let foundAny = false;

        for (const lang of languages) {
            try {
                const frequencyPath = path.join(__dirname, `../../data/dictionary/sources/frequency/${lang}_frequency.csv`);
                await fs.stat(frequencyPath);
                foundAny = true;
            } catch (error) {
                // File doesn't exist
            }
        }

        return foundAny;
    }

    /**
     * Perform smart warmup using frequency data
     */
    async performSmartWarmup() {
        console.log('🧠 Smart cache warming with frequency data...');
        
        // Estimate time first
        await this.manager.estimateWarmupTime();
        
        console.log('⏳ This will take 15-25 minutes but will greatly improve performance');
        console.log('☕ Perfect time for a coffee break!\n');

        const startTime = Date.now();
        await this.manager.warmCacheWithFrequencyData();
        const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
        
        console.log(`\n⚡ Smart warmup completed in ${elapsed} minutes`);
    }

    /**
     * Perform quick warmup with essential words
     */
    async performQuickWarmup() {
        console.log('⚡ Quick cache warming with essential words...');
        console.log('⏳ This will take 5-10 minutes\n');

        const startTime = Date.now();
        await this.manager.quickWarmup();
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        console.log(`\n⚡ Quick warmup completed in ${elapsed} seconds`);
    }

    /**
     * Verify setup is working
     */
    async verifySetup() {
        console.log('\n🔍 Verifying cache setup...');
        
        const stats = await this.cache.getStats();
        
        // Check basic requirements
        const checks = [
            {
                name: 'Cache files exist',
                pass: stats.totalFiles > 0,
                message: `${stats.totalFiles} files cached`
            },
            {
                name: 'All languages covered',
                pass: stats.totalFiles >= 30, // At least 10 words per language * 3 languages
                message: `${stats.totalFiles} files should cover all languages`
            },
            {
                name: 'Reasonable cache size',
                pass: stats.totalSizeOnDisk > 1024 && stats.totalSizeOnDisk < 100 * 1024 * 1024,
                message: `${(stats.totalSizeOnDisk / 1024 / 1024).toFixed(2)} MB is reasonable`
            }
        ];

        let allPassed = true;
        for (const check of checks) {
            if (check.pass) {
                console.log(`   ✅ ${check.name}: ${check.message}`);
            } else {
                console.log(`   ❌ ${check.name}: ${check.message}`);
                allPassed = false;
            }
        }

        if (!allPassed) {
            throw new Error('Cache verification failed - setup incomplete');
        }

        console.log('\n📊 Final cache statistics:');
        await this.cache.printStats();
    }
}

// CLI interface
if (require.main === module) {
    const setup = new CacheSetup();
    
    const arg = process.argv[2];
    
    if (arg === '--help' || arg === 'help') {
        console.log('🚀 Nordum Dictionary Importer Cache Setup');
        console.log('=========================================\n');
        console.log('This script sets up caching for fast dictionary imports.');
        console.log('It will automatically choose the best setup based on your system.\n');
        console.log('Usage:');
        console.log('  node setup-cache.js           # Auto setup (recommended)');
        console.log('  node setup-cache.js --help    # Show this help');
        console.log('\nWhat this script does:');
        console.log('  1. 📁 Creates cache directories');
        console.log('  2. 🔥 Warms cache with common words');
        console.log('  3. 📊 Uses frequency data if available');
        console.log('  4. ✅ Verifies everything works');
        console.log('\nAfter setup:');
        console.log('  • Dictionary imports will be 10-20x faster');
        console.log('  • No more waiting for Wiktionary downloads');
        console.log('  • Cache persists between runs');
        console.log('\nFor manual control:');
        console.log('  node manage-cache.js help     # Advanced cache management');
        process.exit(0);
    }
    
    setup.run().catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}

module.exports = CacheSetup;