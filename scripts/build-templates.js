#!/usr/bin/env node

// Suppress punycode deprecation warning
const originalEmit = process.emit;
process.emit = function (name, data) {
    if (name === 'warning' && data && data.name === 'DeprecationWarning' && data.message.includes('punycode')) {
        return false; // Suppress the warning
    }
    return originalEmit.apply(process, arguments);
};

const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const SpecificationParser = require('./parse-specification');

class TemplateBuilder {
    constructor() {
        this.srcDir = path.join(__dirname, '../src');
        this.buildDir = path.join(__dirname, '../build');
        this.templatesDir = path.join(this.srcDir, 'templates');
        this.partialsDir = path.join(this.templatesDir, 'partials');
        this.i18nDir = path.join(this.srcDir, 'i18n');
        this.dataDir = path.join(__dirname, '../data');
        
        this.translations = {};
        this.siteData = {};
        this.specificationData = {};
    }

    async init() {
        // Create build directory
        await this.ensureDir(this.buildDir);
        
        // Load translations
        await this.loadTranslations();
        
        // Load site data
        await this.loadSiteData();
        
        // Load specification data
        await this.loadSpecification();
        
        // Register Handlebars helpers
        this.registerHelpers();
        
        // Register partials
        await this.registerPartials();
    }

    async ensureDir(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
    }

    async loadTranslations() {
        try {
            const langs = ['en', 'da', 'nb', 'nn', 'sv', 'nordum'];
            
            for (const lang of langs) {
                const langFile = path.join(this.i18nDir, `${lang}.json`);
                try {
                    const content = await fs.readFile(langFile, 'utf-8');
                    this.translations[lang] = JSON.parse(content);
                } catch (error) {
                    console.warn(`Warning: Could not load translations for ${lang}`);
                    this.translations[lang] = {};
                }
            }
        } catch (error) {
            console.warn('Warning: Could not load translations directory');
            // Provide default translations to prevent build failures
            for (const lang of langs) {
                this.translations[lang] = {
                    site: { title: 'Nordum', description: 'Pan-Scandinavian Language' },
                    nav: { home: 'Home', about: 'About', grammar: 'Grammar', tools: 'Tools', resources: 'Resources', community: 'Community' }
                };
            }
        }
    }

    async loadSiteData() {
        try {
            const dataFile = path.join(this.dataDir, 'site.json');
            const content = await fs.readFile(dataFile, 'utf-8');
            this.siteData = JSON.parse(content);
        } catch (error) {
            console.warn('Warning: Could not load site data, using defaults');
            this.siteData = {
                title: 'Nordum',
                description: 'A pan-Scandinavian written language',
                url: 'https://nordum.org',
                version: '1.0.0'
            };
        }
    }

    registerHelpers() {
        // Translation helper
        Handlebars.registerHelper('t', (key, options) => {
            // Handle case where options might be undefined or missing data
            let lang = 'en';
            if (options && options.data && options.data.root && options.data.root.lang) {
                lang = options.data.root.lang;
            }
            
            const translation = this.translations[lang] || this.translations['en'] || {};
            
            // Support nested keys like 'nav.home'
            const keys = (key || '').split('.');
            let value = translation;
            
            for (const k of keys) {
                value = value?.[k];
                if (value === undefined) break;
            }
            
            return value || key || 'Missing Translation';
        });

        // Date formatting helper
        Handlebars.registerHelper('formatDate', (date, format) => {
            const d = new Date(date);
            if (format === 'year') return d.getFullYear();
            if (format === 'short') return d.toLocaleDateString();
            return d.toISOString().split('T')[0];
        });

        // JSON helper for data attributes
        Handlebars.registerHelper('json', (context) => {
            return JSON.stringify(context);
        });

        // Equals helper
        Handlebars.registerHelper('eq', (a, b) => a === b);

        // Unless equals helper
        Handlebars.registerHelper('unless', function(conditional, options) {
            if (arguments.length < 2) {
                throw new Error('unless requires at least one argument');
            }
            if (!conditional) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        // String concatenation helper
        Handlebars.registerHelper('concat', function() {
            let result = '';
            for (let i = 0; i < arguments.length - 1; i++) {
                result += arguments[i];
            }
            return result;
        });

        // Lookup helper for dynamic property access
        Handlebars.registerHelper('lookup', function(obj, field) {
            return obj && obj[field];
        });

        // Language-specific CSS classes
        Handlebars.registerHelper('langClass', (lang) => {
            return `lang-${lang}`;
        });

        // Asset path helper
        Handlebars.registerHelper('asset', (assetPath) => {
            return `/assets/${assetPath}`;
        });

        // Current year helper
        Handlebars.registerHelper('currentYear', () => {
            return new Date().getFullYear();
        });

        // Pluralization helper
        Handlebars.registerHelper('plural', (count, singular, plural) => {
            return count === 1 ? singular : (plural || singular + 's');
        });

        // Each with index
        Handlebars.registerHelper('eachWithIndex', function(context, options) {
            let ret = '';
            for (let i = 0, j = context.length; i < j; i++) {
                ret = ret + options.fn(Object.assign({}, context[i], { index: i }));
            }
            return ret;
        });

        // If condition helper
        Handlebars.registerHelper('if', function(conditional, options) {
            if (arguments.length < 2) {
                throw new Error('if requires at least one argument');
            }
            if (conditional) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        // Greater than helper
        Handlebars.registerHelper('gt', (a, b) => a > b);

        // Less than helper
        Handlebars.registerHelper('lt', (a, b) => a < b);

        // And helper
        Handlebars.registerHelper('and', function() {
            for (let i = 0; i < arguments.length - 1; i++) {
                if (!arguments[i]) return false;
            }
            return true;
        });

        // Or helper
        Handlebars.registerHelper('or', function() {
            for (let i = 0; i < arguments.length - 1; i++) {
                if (arguments[i]) return true;
            }
            return false;
        });
    }

    async registerPartials() {
        try {
            const partialFiles = await fs.readdir(this.partialsDir);
            
            for (const file of partialFiles) {
                if (!file.endsWith('.hbs')) continue;
                
                const partialName = path.basename(file, '.hbs');
                const partialPath = path.join(this.partialsDir, file);
                const partialContent = await fs.readFile(partialPath, 'utf-8');
                
                Handlebars.registerPartial(partialName, partialContent);
            }
        } catch (error) {
            console.warn('Warning: Could not load partials directory');
        }
    }

    async loadSpecification() {
        try {
            const parser = new SpecificationParser();
            this.specificationData = await parser.parseSpecification();
            console.log('✅ Loaded specification data');
        } catch (error) {
            console.warn('⚠️  Could not load specification data:', error.message);
            this.specificationData = {
                tableOfContents: [],
                sections: {},
                generatedAt: new Date().toISOString(),
                sourceFile: 'NORDUM_LANGUAGE_SPECIFICATION.md'
            };
        }
    }

    async buildTemplate(templatePath, outputPath, data = {}) {
        try {
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const template = Handlebars.compile(templateContent);
            
            const context = {
                ...this.siteData,
                ...data,
                specification: this.specificationData,
                buildTime: new Date().toISOString(),
                lang: data.lang || 'en',
                currentPath: data.currentPath || '/',
                env: process.env.NODE_ENV || 'development'
            };
            
            const html = template(context);
            
            // Ensure output directory exists
            await this.ensureDir(path.dirname(outputPath));
            
            await fs.writeFile(outputPath, html, 'utf-8');
            console.log(`Built: ${path.relative(this.buildDir, outputPath)}`);
        } catch (error) {
            console.error(`Error building template ${templatePath}:`, error.message);
            throw error;
        }
    }

    async buildAllTemplates() {
        const languages = ['en', 'da', 'nb', 'nn', 'sv', 'nordum'];  // All supported languages
        const pages = [
            { template: 'index.hbs', output: 'index.html' },
            { template: 'tools/dictionary.hbs', output: 'tools/dictionary.html' },
            { template: 'tools/spellcheck.hbs', output: 'tools/spellcheck.html' },
            { template: 'tools/translator.hbs', output: 'tools/translator.html' },
            { template: 'tools/editor.hbs', output: 'tools/editor.html' },
            { template: 'rules/index.hbs', output: 'rules/index.html' },
            { template: 'rules/language-specification.hbs', output: 'rules/language-specification.html' },
            { template: 'faq.hbs', output: 'faq.html' }
        ];

        for (const lang of languages) {
            console.log(`Building templates for language: ${lang}`);
            
            for (const page of pages) {
                const templatePath = path.join(this.templatesDir, page.template);
                
                // Check if template exists
                try {
                    await fs.access(templatePath);
                } catch (error) {
                    console.warn(`Template not found: ${page.template}, skipping`);
                    continue;
                }
                
                let outputPath;
                if (lang === 'en') {
                    // English is the default, no language prefix
                    outputPath = path.join(this.buildDir, page.output);
                } else {
                    // Other languages get a prefix
                    outputPath = path.join(this.buildDir, lang, page.output);
                }
                
                await this.buildTemplate(templatePath, outputPath, { 
                    lang,
                    currentPath: '/' + page.output.replace('index.html', ''),
                    currentPage: page.template.split('/')[0] || 'home'
                });
            }
        }
    }

    async copyStaticAssets() {
        const assetsDir = path.join(this.srcDir, 'static');
        
        try {
            const copyRecursive = async (src, dest) => {
                const stat = await fs.lstat(src);
                
                if (stat.isDirectory()) {
                    await this.ensureDir(dest);
                    const files = await fs.readdir(src);
                    
                    for (const file of files) {
                        await copyRecursive(
                            path.join(src, file),
                            path.join(dest, file)
                        );
                    }
                } else {
                    await fs.copyFile(src, dest);
                }
            };
            
            await copyRecursive(assetsDir, path.join(this.buildDir, 'assets'));
            console.log('Copied static assets');
        } catch (error) {
            console.warn('Warning: Could not copy static assets');
        }
    }

    async generateSitemap() {
        const languages = ['en', 'da', 'nb', 'nn', 'sv', 'nordum'];
        const pages = [
            '',
            'tools/dictionary.html',
            'tools/spellcheck.html',
            'tools/translator.html',
            'tools/editor.html',
            'faq.html'
        ];

        const urls = [];
        const baseUrl = this.siteData.url || 'https://nordum.org';

        for (const lang of languages) {
            for (const page of pages) {
                let url;
                if (lang === 'en') {
                    url = `${baseUrl}/${page}`;
                } else {
                    url = `${baseUrl}/${lang}/${page}`;
                }
                
                urls.push({
                    url: url.replace(/\/$/, ''), // Remove trailing slash
                    lang: lang,
                    lastmod: new Date().toISOString().split('T')[0]
                });
            }
        }

        // Generate XML sitemap
        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(url => `    <url>
        <loc>${url.url}</loc>
        <lastmod>${url.lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
        ${languages.map(lang => 
            `<xhtml:link rel="alternate" hreflang="${lang}" href="${url.url.replace(/\/(da|nb|nn|sv|nordum)\//, lang === 'en' ? '/' : `/${lang}/`)}" />`
        ).join('\n        ')}
    </url>`).join('\n')}
</urlset>`;

        await fs.writeFile(path.join(this.buildDir, 'sitemap.xml'), sitemapXml);
        console.log('Generated sitemap.xml');
    }

    async build() {
        console.log('Starting template build...');
        
        try {
            await this.init();
            await this.buildAllTemplates();
            await this.copyStaticAssets();
            await this.generateSitemap();
            
            console.log('Template build completed successfully!');
        } catch (error) {
            console.error('Template build failed:', error);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const builder = new TemplateBuilder();
    builder.build();
}

module.exports = TemplateBuilder;