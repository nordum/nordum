#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const PO = require('pofile');

// Dynamic import for ESM module
let gettextParser;

class I18nPoBuilder {
    constructor() {
        this.srcDir = path.join(__dirname, '../src');
        this.buildDir = path.join(__dirname, '../build');
        this.poDir = path.join(this.srcDir, 'i18n');
        this.i18nDir = path.join(this.buildDir, 'assets', 'i18n');
    }

    async ensureDir(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
    }

    async compileMoFiles() {
        console.log('Compiling MO files...');

        await this.ensureDir(this.i18nDir);

        const languages = ['en', 'da', 'nb', 'nn', 'sv', 'nordum'];

        for (const lang of languages) {
            try {
                const poPath = path.join(this.poDir, `${lang}.po`);
                const moPath = path.join(this.i18nDir, `${lang}.mo`);

                // Load and compile PO to MO using gettext-parser
                const poContent = await fs.readFile(poPath, 'utf-8');
                const po = gettextParser.po.parse(poContent);

                // Convert to MO using gettext-parser
                const mo = gettextParser.mo.compile(po);

                // Write MO file
                await fs.writeFile(moPath, mo);
                console.log(`✅ Compiled: ${lang}.mo`);

            } catch (error) {
                console.error(`❌ Failed to compile ${lang}.mo:`, error.message);
            }
        }
    }

    async copyPoFiles() {
        console.log('Copying PO files for development...');

        await this.ensureDir(this.i18nDir);

        const languages = ['en', 'da', 'nb', 'nn', 'sv', 'nordum'];

        for (const lang of languages) {
            try {
                const sourcePath = path.join(this.poDir, `${lang}.po`);
                const destPath = path.join(this.i18nDir, `${lang}.po`);

                await fs.copyFile(sourcePath, destPath);
                console.log(`✅ Copied: ${lang}.po`);

            } catch (error) {
                console.error(`❌ Failed to copy ${lang}.po:`, error.message);
            }
        }
    }

    async build() {
        console.log('Starting i18n PO/MO build...');

        try {
            // Load gettext-parser dynamically
            const gettextParserModule = await import('gettext-parser');
            gettextParser = gettextParserModule.default;

            await this.compileMoFiles();
            await this.copyPoFiles();

            console.log('I18n PO/MO build completed successfully!');
        } catch (error) {
            console.error('I18n build failed:', error);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const builder = new I18nPoBuilder();
    builder.build();
}

module.exports = I18nPoBuilder;
