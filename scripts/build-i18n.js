#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class I18nBuilder {
    constructor() {
        this.srcDir = path.join(__dirname, '../src');
        this.buildDir = path.join(__dirname, '../build');
        this.i18nDir = path.join(this.srcDir, 'i18n');
    }

    async build() {
        console.log('Starting i18n build...');
        
        try {
            // Copy i18n files to build directory
            await this.ensureDir(path.join(this.buildDir, 'assets', 'i18n'));
            
            try {
                const files = await fs.readdir(this.i18nDir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const sourcePath = path.join(this.i18nDir, file);
                        const destPath = path.join(this.buildDir, 'assets', 'i18n', file);
                        await fs.copyFile(sourcePath, destPath);
                        console.log(`Copied: ${file}`);
                    }
                }
            } catch (error) {
                console.warn('No i18n files found, creating default translations...');
                
                // Create default English translations
                const defaultTranslations = {
                    site: {
                        title: 'Nordum - A Pan-Scandinavian Language',
                        description: 'A unified written language for Scandinavia'
                    },
                    nav: {
                        home: 'Home',
                        about: 'About',
                        grammar: 'Grammar',
                        tools: 'Tools',
                        resources: 'Resources',
                        community: 'Community'
                    }
                };
                
                const defaultPath = path.join(this.buildDir, 'assets', 'i18n', 'en.json');
                await fs.writeFile(defaultPath, JSON.stringify(defaultTranslations, null, 2));
                console.log('Created default translations');
            }
            
            console.log('I18n build completed successfully!');
        } catch (error) {
            console.error('I18n build failed:', error);
            process.exit(1);
        }
    }

    async ensureDir(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const builder = new I18nBuilder();
    builder.build();
}

module.exports = I18nBuilder;