#!/usr/bin/env node

/**
 * Test script for the enhanced Wiktionary caching system
 * Verifies that caching works correctly and improves performance
 */

const WiktionaryCache = require('./wiktionary-cache');
const fs = require('fs').promises;
const path = require('path');

class CacheTest {
    constructor() {
        this.cache = new WiktionaryCache({
            cacheDirectory: path.join(__dirname, '../../data/cache/wiktionary-test'),
            cacheExpiration: 5 * 60 * 1000 // 5 minutes for testing
        });
        this.testResults = [];
    }

    /**
     * Run all cache tests
     */
    async runAllTests() {
        console.log('🧪 Testing Enhanced Wiktionary Caching System');
        console.log('===============================================\n');

        try {
            // Clean up any existing test cache
            await this.cleanupTestCache();

            await this.testCacheInitialization();
            await this.testBasicCaching();
            await this.testCacheHitPerformance();
            await this.testCacheExpiration();
            await this.testCacheStatistics();
            await this.testRealWiktionaryData();

            // Print final results
            this.printTestResults();

            // Cleanup
            await this.cleanupTestCache();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    /**
     * Test cache initialization
     */
    async testCacheInitialization() {
        console.log('1️⃣  Testing cache initialization...');
        
        try {
            await this.cache.init();
            
            // Check if directories were created
            const cacheDir = this.cache.options.cacheDirectory;
            const stats = await fs.stat(cacheDir);
            
            if (stats.isDirectory()) {
                this.recordSuccess('Cache initialization', 'Directories created successfully');
            } else {
                throw new Error('Cache directory not created');
            }
            
            // Check language subdirectories
            const languages = ['da', 'no', 'sv', 'en'];
            for (const lang of languages) {
                const langDir = path.join(cacheDir, lang);
                const langStats = await fs.stat(langDir);
                if (!langStats.isDirectory()) {
                    throw new Error(`Language directory ${lang} not created`);
                }
            }
            
            this.recordSuccess('Cache structure', 'All language directories created');
            
        } catch (error) {
            this.recordFailure('Cache initialization', error.message);
        }
        
        console.log('');
    }

    /**
     * Test basic caching functionality
     */
    async testBasicCaching() {
        console.log('2️⃣  Testing basic caching functionality...');
        
        try {
            const testData = '{"test": "data", "cached": true}';
            const language = 'da';
            const apiType = 'search';
            const word = 'test';
            
            // Test cache miss
            const missResult = await this.cache.get(language, apiType, word);
            if (missResult !== null) {
                throw new Error('Expected cache miss, but got data');
            }
            this.recordSuccess('Cache miss', 'Correctly returned null for non-existent data');
            
            // Test cache set
            await this.cache.set(language, apiType, word, testData);
            this.recordSuccess('Cache set', 'Data stored successfully');
            
            // Test cache hit
            const hitResult = await this.cache.get(language, apiType, word);
            if (hitResult !== testData) {
                throw new Error(`Expected cached data, got: ${hitResult}`);
            }
            this.recordSuccess('Cache hit', 'Correctly returned cached data');
            
            // Test cache key uniqueness
            await this.cache.set(language, 'content', word, 'different data');
            const contentResult = await this.cache.get(language, 'content', word);
            if (contentResult === testData) {
                throw new Error('Cache keys are not unique between API types');
            }
            this.recordSuccess('Cache key uniqueness', 'Different API types have separate cache entries');
            
        } catch (error) {
            this.recordFailure('Basic caching', error.message);
        }
        
        console.log('');
    }

    /**
     * Test cache hit performance
     */
    async testCacheHitPerformance() {
        console.log('3️⃣  Testing cache hit performance...');
        
        try {
            const testData = '{"performance": "test", "size": "medium"}';
            const language = 'no';
            const apiType = 'search';
            const word = 'performance';
            
            // Store test data
            await this.cache.set(language, apiType, word, testData);
            
            // Measure cache hit performance
            const iterations = 100;
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                const result = await this.cache.get(language, apiType, word);
                if (result !== testData) {
                    throw new Error(`Cache hit failed on iteration ${i}`);
                }
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTime = totalTime / iterations;
            
            if (avgTime > 10) { // Should be much faster than 10ms per hit
                throw new Error(`Cache hits too slow: ${avgTime}ms average`);
            }
            
            this.recordSuccess('Cache hit performance', `${iterations} hits in ${totalTime}ms (${avgTime.toFixed(2)}ms avg)`);
            
        } catch (error) {
            this.recordFailure('Cache hit performance', error.message);
        }
        
        console.log('');
    }

    /**
     * Test cache expiration
     */
    async testCacheExpiration() {
        console.log('4️⃣  Testing cache expiration...');
        
        try {
            // Create a temporary cache with very short expiration
            const shortCache = new WiktionaryCache({
                cacheDirectory: path.join(this.cache.options.cacheDirectory, 'expiration-test'),
                cacheExpiration: 1000 // 1 second
            });
            
            await shortCache.init();
            
            const testData = '{"expiration": "test"}';
            const language = 'sv';
            const apiType = 'content';
            const word = 'expiration';
            
            // Store data
            await shortCache.set(language, apiType, word, testData);
            
            // Immediate retrieval should work
            const immediateResult = await shortCache.get(language, apiType, word);
            if (immediateResult !== testData) {
                throw new Error('Immediate cache retrieval failed');
            }
            this.recordSuccess('Cache storage', 'Data stored and immediately retrievable');
            
            // Wait for expiration
            await this.sleep(1500);
            
            // Should now be expired
            const expiredResult = await shortCache.get(language, apiType, word);
            if (expiredResult !== null) {
                throw new Error('Cache did not expire as expected');
            }
            this.recordSuccess('Cache expiration', 'Data correctly expired after timeout');
            
        } catch (error) {
            this.recordFailure('Cache expiration', error.message);
        }
        
        console.log('');
    }

    /**
     * Test cache statistics
     */
    async testCacheStatistics() {
        console.log('5️⃣  Testing cache statistics...');
        
        try {
            // Reset stats
            this.cache.stats = {
                hits: 0,
                misses: 0,
                writes: 0,
                errors: 0,
                totalSize: 0
            };
            
            const language = 'da';
            const apiType = 'search';
            
            // Generate some cache activity
            await this.cache.get(language, apiType, 'nonexistent1'); // miss
            await this.cache.get(language, apiType, 'nonexistent2'); // miss
            await this.cache.set(language, apiType, 'word1', 'data1'); // write
            await this.cache.set(language, apiType, 'word2', 'data2'); // write
            await this.cache.get(language, apiType, 'word1'); // hit
            await this.cache.get(language, apiType, 'word2'); // hit
            
            const stats = await this.cache.getStats();
            
            if (stats.misses !== 2) {
                throw new Error(`Expected 2 misses, got ${stats.misses}`);
            }
            if (stats.writes !== 2) {
                throw new Error(`Expected 2 writes, got ${stats.writes}`);
            }
            if (stats.hits !== 2) {
                throw new Error(`Expected 2 hits, got ${stats.hits}`);
            }
            
            const expectedHitRate = 50.0; // 2 hits out of 4 total requests
            if (parseFloat(stats.hitRate) !== expectedHitRate) {
                throw new Error(`Expected hit rate ${expectedHitRate}%, got ${stats.hitRate}%`);
            }
            
            this.recordSuccess('Cache statistics', `Correctly tracked ${stats.hits} hits, ${stats.misses} misses, ${stats.writes} writes`);
            
        } catch (error) {
            this.recordFailure('Cache statistics', error.message);
        }
        
        console.log('');
    }

    /**
     * Test with real Wiktionary data
     */
    async testRealWiktionaryData() {
        console.log('6️⃣  Testing with real Wiktionary data...');
        
        try {
            const word = 'hus'; // Simple word that should exist in all Nordic Wiktionaries
            const languages = ['da', 'no', 'sv'];
            
            for (const lang of languages) {
                console.log(`   Testing ${lang}.wiktionary.org...`);
                
                // Test search API
                const searchUrl = `https://${lang}.wiktionary.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(word)}&srlimit=1`;
                
                // First call should be a miss (fetch from API)
                const startTime1 = Date.now();
                const searchData1 = await this.cache.fetchWiktionaryData(lang, 'search', word, searchUrl);
                const time1 = Date.now() - startTime1;
                
                // Second call should be a hit (from cache)
                const startTime2 = Date.now();
                const searchData2 = await this.cache.fetchWiktionaryData(lang, 'search', word, searchUrl);
                const time2 = Date.now() - startTime2;
                
                if (searchData1 !== searchData2) {
                    throw new Error(`Cached data doesn't match original for ${lang}`);
                }
                
                if (time2 >= time1) {
                    console.warn(`   ⚠️  Cache didn't improve performance for ${lang}: ${time1}ms vs ${time2}ms`);
                } else {
                    this.recordSuccess(`${lang} caching`, `Performance improved: ${time1}ms → ${time2}ms`);
                }
                
                // Verify we got actual JSON data
                try {
                    const parsed = JSON.parse(searchData1);
                    if (!parsed.query) {
                        throw new Error('Invalid Wiktionary API response');
                    }
                } catch (parseError) {
                    throw new Error(`Invalid JSON from ${lang}.wiktionary.org: ${parseError.message}`);
                }
                
                // Rate limiting to be nice to Wiktionary
                await this.sleep(1000);
            }
            
            this.recordSuccess('Real Wiktionary data', 'Successfully cached and retrieved data from all languages');
            
        } catch (error) {
            this.recordFailure('Real Wiktionary data', error.message);
        }
        
        console.log('');
    }

    /**
     * Record a successful test
     */
    recordSuccess(testName, message) {
        this.testResults.push({
            name: testName,
            status: 'PASS',
            message: message
        });
        console.log(`   ✅ ${testName}: ${message}`);
    }

    /**
     * Record a failed test
     */
    recordFailure(testName, message) {
        this.testResults.push({
            name: testName,
            status: 'FAIL',
            message: message
        });
        console.log(`   ❌ ${testName}: ${message}`);
    }

    /**
     * Print final test results
     */
    printTestResults() {
        console.log('📊 Test Results Summary');
        console.log('=======================\n');
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;
        
        console.log(`Total tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success rate: ${((passed / total) * 100).toFixed(1)}%\n`);
        
        if (failed > 0) {
            console.log('Failed tests:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(result => {
                    console.log(`  ❌ ${result.name}: ${result.message}`);
                });
            console.log('');
        }
        
        if (passed === total) {
            console.log('🎉 All tests passed! The caching system is working correctly.');
            console.log('💡 You can now use the importers with confidence that caching will speed up your work.');
        } else if (passed > total / 2) {
            console.log('⚠️  Most tests passed, but there are some issues to address.');
        } else {
            console.log('❌ Many tests failed. The caching system needs attention.');
        }
    }

    /**
     * Clean up test cache directory
     */
    async cleanupTestCache() {
        try {
            const cacheDir = this.cache.options.cacheDirectory;
            
            // Remove all files in cache directory
            const languages = ['da', 'no', 'sv', 'en'];
            for (const lang of languages) {
                const langDir = path.join(cacheDir, lang);
                try {
                    const files = await fs.readdir(langDir);
                    for (const file of files) {
                        await fs.unlink(path.join(langDir, file));
                    }
                    await fs.rmdir(langDir);
                } catch (error) {
                    // Directory might not exist
                }
            }
            
            // Remove expiration test directory if it exists
            const expirationTestDir = path.join(cacheDir, 'expiration-test');
            try {
                const files = await fs.readdir(path.join(expirationTestDir, 'sv'));
                for (const file of files) {
                    await fs.unlink(path.join(expirationTestDir, 'sv', file));
                }
                await fs.rmdir(path.join(expirationTestDir, 'sv'));
                await fs.rmdir(expirationTestDir);
            } catch (error) {
                // Directory might not exist
            }
            
            // Remove main test directory
            try {
                await fs.rmdir(cacheDir);
            } catch (error) {
                // Directory might not be empty or might not exist
            }
            
        } catch (error) {
            console.warn('⚠️  Could not fully clean up test cache:', error.message);
        }
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI interface
if (require.main === module) {
    const tester = new CacheTest();
    
    const command = process.argv[2];
    
    if (command === 'quick') {
        console.log('Running quick cache tests (no real API calls)...\n');
        
        // Run tests without real Wiktionary data
        const originalMethod = tester.testRealWiktionaryData;
        tester.testRealWiktionaryData = async () => {
            console.log('6️⃣  Skipping real Wiktionary data test (quick mode)...');
            tester.recordSuccess('Real Wiktionary data', 'Skipped in quick mode');
            console.log('');
        };
        
        tester.runAllTests()
            .then(() => {
                const failed = tester.testResults.filter(r => r.status === 'FAIL').length;
                process.exit(failed > 0 ? 1 : 0);
            });
    } else {
        console.log('Running full cache tests (including real API calls)...\n');
        console.log('⚠️  This will make requests to Wiktionary APIs\n');
        
        tester.runAllTests()
            .then(() => {
                const failed = tester.testResults.filter(r => r.status === 'FAIL').length;
                process.exit(failed > 0 ? 1 : 0);
            });
    }
}

module.exports = CacheTest;