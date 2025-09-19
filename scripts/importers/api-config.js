#!/usr/bin/env node

/**
 * API Configuration for Dictionary Importers
 * Handles API keys, rate limiting, and endpoint configurations
 */

const path = require('path');
const fs = require('fs');

class ApiConfig {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        const configPath = path.join(__dirname, '../../config/api-config.json');
        const envConfigPath = path.join(__dirname, '../../.env');

        let config = {
            // Default configuration
            rateLimit: {
                default: 10,
                wiktionary: 15,
                ordbokene: 20,
                spraakbanken: 30
            },

            endpoints: {
                danish: {
                    wiktionary: 'https://da.wiktionary.org/w/api.php',
                    ordnet: null, // No public API
                    korpusDK: null // Requires special access
                },

                norwegian: {
                    wiktionary: 'https://no.wiktionary.org/w/api.php',
                    ordbokene: 'https://ord.uib.no/api',
                    spraakraadet: null, // No direct API
                    nbCorpus: null // Requires special access
                },

                swedish: {
                    wiktionary: 'https://sv.wiktionary.org/w/api.php',
                    saol: null, // No public API
                    spraakbanken: 'https://spraakbanken.gu.se/ws'
                },

                translation: {
                    googleTranslate: 'https://translation.googleapis.com/language/translate/v2',
                    libreTranslate: 'https://libretranslate.de/translate',
                    mymemory: 'https://api.mymemory.translated.net/get' // Fallback option
                }
            },

            userAgent: 'Nordum Dictionary Importer/1.0 (https://nordum.org; contact@nordum.org)',

            timeout: 30000,
            maxRetries: 3,

            batchSize: 50,
            maxConcurrent: 3,

            cacheEnabled: true,
            cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours

            apiKeys: {
                // API keys would be loaded from environment or config file
                spraakbanken: null,
                ordnet: null,
                korpus: null,
                googleTranslate: null,
                libreTranslate: null // LibreTranslate can work without API key but has rate limits
            }
        };

        // Try to load from config file
        try {
            if (fs.existsSync(configPath)) {
                const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                config = this.mergeConfig(config, fileConfig);
            }
        } catch (error) {
            console.warn('Could not load API config file:', error.message);
        }

        // Load API keys from environment variables
        config.apiKeys.spraakbanken = process.env.SPRAAKBANKEN_API_KEY || config.apiKeys.spraakbanken;
        config.apiKeys.ordnet = process.env.ORDNET_API_KEY || config.apiKeys.ordnet;
        config.apiKeys.korpus = process.env.KORPUS_API_KEY || config.apiKeys.korpus;
        config.apiKeys.googleTranslate = process.env.GOOGLE_TRANSLATE_API_KEY || config.apiKeys.googleTranslate;
        config.apiKeys.libreTranslate = process.env.LIBRETRANSLATE_API_KEY || config.apiKeys.libreTranslate;

        return config;
    }

    mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };

        for (const key in userConfig) {
            if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
                merged[key] = { ...defaultConfig[key], ...userConfig[key] };
            } else {
                merged[key] = userConfig[key];
            }
        }

        return merged;
    }

    getRateLimit(service = 'default') {
        return this.config.rateLimit[service] || this.config.rateLimit.default;
    }

    getEndpoint(language, service) {
        return this.config.endpoints[language]?.[service];
    }

    getApiKey(service) {
        return this.config.apiKeys[service];
    }

    getUserAgent() {
        return this.config.userAgent;
    }

    getTimeout() {
        return this.config.timeout;
    }

    getMaxRetries() {
        return this.config.maxRetries;
    }

    getBatchSize() {
        return this.config.batchSize;
    }

    getMaxConcurrent() {
        return this.config.maxConcurrent;
    }

    isCacheEnabled() {
        return this.config.cacheEnabled;
    }

    getCacheExpiration() {
        return this.config.cacheExpiration;
    }

    /**
     * Get request headers for a specific service
     */
    getHeaders(service = null, extraHeaders = {}) {
        const headers = {
            'User-Agent': this.getUserAgent(),
            'Accept': 'application/json',
            ...extraHeaders
        };

        // Add API key if available
        if (service && this.getApiKey(service)) {
            headers['Authorization'] = `Bearer ${this.getApiKey(service)}`;
        }

        return headers;
    }

    /**
     * Validate API configuration
     */
    validate() {
        const issues = [];

        // Check for missing endpoints
        for (const [language, services] of Object.entries(this.config.endpoints)) {
            for (const [service, endpoint] of Object.entries(services)) {
                if (!endpoint && this.isRequiredService(service)) {
                    issues.push(`Missing endpoint for ${language}:${service}`);
                }
            }
        }

        // Check rate limits
        for (const [service, limit] of Object.entries(this.config.rateLimit)) {
            if (limit < 10) {
                issues.push(`Rate limit for ${service} is very low (${limit}ms) - may cause issues`);
            }
        }

        return issues;
    }

    isRequiredService(service) {
        // Only Wiktionary is truly required as it has public APIs
        return service === 'wiktionary';
    }

    /**
     * Create a sample configuration file
     */
    createSampleConfig() {
        const sampleConfig = {
            "$schema": "./api-config.schema.json",
            "description": "API Configuration for Nordum Dictionary Importers",

            "rateLimit": {
                "default": 10,
                "wiktionary": 15,
                "ordbokene": 20,
                "spraakbanken": 30,
                "comment": "Rate limits in milliseconds between requests"
            },

            "endpoints": {
                "danish": {
                    "wiktionary": "https://da.wiktionary.org/w/api.php",
                    "ordnet": null,
                    "korpusDK": null
                },
                "norwegian": {
                    "wiktionary": "https://no.wiktionary.org/w/api.php",
                    "ordbokene": "https://ord.uib.no/api",
                    "spraakraadet": null,
                    "nbCorpus": null
                },
                "swedish": {
                    "wiktionary": "https://sv.wiktionary.org/w/api.php",
                    "saol": null,
                    "spraakbanken": "https://spraakbanken.gu.se/ws"
                },
                "translation": {
                    "googleTranslate": "https://translation.googleapis.com/language/translate/v2",
                    "libreTranslate": "https://libretranslate.de/translate",
                    "mymemory": "https://api.mymemory.translated.net/get"
                }
            },

            "userAgent": "Nordum Dictionary Importer/1.0 (https://nordum.org; contact@nordum.org)",
            "timeout": 30000,
            "maxRetries": 3,
            "batchSize": 50,
            "maxConcurrent": 3,

            "cacheEnabled": true,
            "cacheExpiration": 86400000,

            "apiKeys": {
                "spraakbanken": null,
                "ordnet": null,
                "korpus": null,
                "googleTranslate": null,
                "libreTranslate": null,
                "comment": "API keys should be set via environment variables"
            },

            "comments": {
                "setup": "Set API keys as environment variables:",
                "variables": [
                    "export SPRAAKBANKEN_API_KEY=your_key_here",
                    "export ORDNET_API_KEY=your_key_here",
                    "export KORPUS_API_KEY=your_key_here",
                    "export GOOGLE_TRANSLATE_API_KEY=your_key_here",
                    "export LIBRETRANSLATE_API_KEY=your_key_here"
                ],
                "note": "Most services don't have public APIs - Wiktionary is the main reliable source"
            }
        };

        const configPath = path.join(__dirname, '../../config/api-config.json');
        const configDir = path.dirname(configPath);

        try {
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
            console.log(`Sample configuration created at: ${configPath}`);

            return configPath;
        } catch (error) {
            console.error('Failed to create sample config:', error.message);
            return null;
        }
    }

    /**
     * Get service-specific configuration
     */
    getServiceConfig(language, service) {
        return {
            endpoint: this.getEndpoint(language, service),
            rateLimit: this.getRateLimit(service),
            apiKey: this.getApiKey(service),
            headers: this.getHeaders(service),
            timeout: this.getTimeout(),
            maxRetries: this.getMaxRetries()
        };
    }

    /**
     * Check if a service is available
     */
    isServiceAvailable(language, service) {
        const endpoint = this.getEndpoint(language, service);

        // Wiktionary is always available
        if (service === 'wiktionary') {
            return true;
        }

        // Other services need endpoints and possibly API keys
        if (!endpoint) {
            return false;
        }

        // Services that require API keys
        const requiresApiKey = ['spraakbanken', 'ordnet', 'korpus', 'googleTranslate'];
        if (requiresApiKey.includes(service)) {
            return !!this.getApiKey(service);
        }

        // LibreTranslate works without API key but with rate limits
        if (service === 'libreTranslate') {
            return true;
        }

        return true;
    }

    /**
     * Print configuration summary
     */
    printSummary() {
        console.log('API Configuration Summary:');
        console.log('========================');

        for (const [language, services] of Object.entries(this.config.endpoints)) {
            console.log(`\n${language.charAt(0).toUpperCase() + language.slice(1)}:`);

            for (const [service, endpoint] of Object.entries(services)) {
                const available = this.isServiceAvailable(language, service);
                const status = available ? '✓' : '✗';
                const rateLimit = this.getRateLimit(service);

                console.log(`  ${status} ${service}: ${endpoint || 'not available'} (${rateLimit}ms)`);
            }
        }

        // Show translation services status
        console.log('\nTranslation Services:');
        const translationServices = this.config.endpoints.translation || {};
        for (const [service, endpoint] of Object.entries(translationServices)) {
            const available = this.isServiceAvailable('translation', service);
            const status = available ? '✓' : '✗';
            const rateLimit = this.getRateLimit(service);
            console.log(`  ${status} ${service}: ${endpoint || 'not available'} (${rateLimit}ms)`);
        }

        console.log('\nCache:', this.isCacheEnabled() ? 'enabled' : 'disabled');
        console.log('Batch size:', this.getBatchSize());
        console.log('Max concurrent:', this.getMaxConcurrent());

        const issues = this.validate();
        if (issues.length > 0) {
            console.log('\nConfiguration Issues:');
            issues.forEach(issue => console.log(`  ! ${issue}`));
        }
    }
}

// Singleton instance
let instance = null;

function getApiConfig() {
    if (!instance) {
        instance = new ApiConfig();
    }
    return instance;
}

// CLI interface for configuration management
if (require.main === module) {
    const config = getApiConfig();

    const command = process.argv[2];

    switch (command) {
        case 'validate':
            console.log('Validating API configuration...');
            const issues = config.validate();
            if (issues.length === 0) {
                console.log('✓ Configuration is valid');
            } else {
                console.log('✗ Configuration issues found:');
                issues.forEach(issue => console.log(`  ${issue}`));
                process.exit(1);
            }
            break;

        case 'summary':
        case 'status':
            config.printSummary();
            break;

        case 'create-sample':
            console.log('Creating sample configuration...');
            config.createSampleConfig();
            break;

        case 'test':
            console.log('Testing API endpoints...');
            // TODO: Implement endpoint testing
            console.log('Endpoint testing not yet implemented');
            break;

        default:
            console.log('Usage: node api-config.js [command]');
            console.log('Commands:');
            console.log('  validate      - Validate configuration');
            console.log('  summary       - Show configuration summary');
            console.log('  create-sample - Create sample config file');
            console.log('  test          - Test API endpoints');
    }
}

module.exports = { ApiConfig, getApiConfig };
