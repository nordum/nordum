#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class PoUpdater {
    constructor() {
        this.srcDir = path.join(__dirname, '../src');
        this.poDir = path.join(this.srcDir, 'i18n');
        this.templatePath = path.join(this.poDir, 'messages.pot');
    }

    async ensureDir(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
    }

    async checkGettextTools() {
        try {
            execSync('which msgmerge', { stdio: 'pipe' });
            execSync('which msgfmt', { stdio: 'pipe' });
            return true;
        } catch (error) {
            return false;
        }
    }

    async updatePoFiles() {
        console.log('Updating PO files from template...\n');

        // Check if gettext tools are available
        const hasGettextTools = await this.checkGettextTools();
        if (!hasGettextTools) {
            console.warn('⚠️  gettext tools (msgmerge, msgfmt) not found in PATH');
            console.warn('Please install gettext tools for your system:');
            console.warn('  Ubuntu/Debian: sudo apt-get install gettext');
            console.warn('  macOS: brew install gettext');
            console.warn('  Windows: Download from GNU gettext for Windows');
            console.warn('\nFalling back to JavaScript implementation...\n');
            return this.updatePoFilesJs();
        }

        const languages = ['en', 'da', 'nb', 'nn', 'sv', 'nordum'];
        let updatedCount = 0;

        for (const lang of languages) {
            const poPath = path.join(this.poDir, `${lang}.po`);

            try {
                // Check if PO file exists
                await fs.access(poPath);

                // Update PO file using msgmerge
                execSync(`msgmerge --update --backup=simple ${poPath} ${this.templatePath}`, {
                    stdio: 'pipe'
                });

                console.log(`✅ Updated: ${lang}.po`);
                updatedCount++;

            } catch (error) {
                if (error.code === 'ENOENT') {
                    // PO file doesn't exist, create from template
                    execSync(`msginit --no-translator --locale=${lang} --input=${this.templatePath} --output=${poPath}`, {
                        stdio: 'pipe'
                    });
                    console.log(`✅ Created: ${lang}.po (from template)`);
                    updatedCount++;
                } else {
                    console.error(`❌ Failed to update ${lang}.po:`, error.message);
                }
            }
        }

        console.log(`\n✅ Updated ${updatedCount} PO files`);
        console.log('\nNext steps:');
        console.log('1. Open PO files in your preferred editor (Poedit recommended)');
        console.log('2. Translate any new or fuzzy entries');
        console.log('3. Run: npm run build:i18n to compile MO files');
        console.log('4. Test translations: npm run build');
    }

    async updatePoFilesJs() {
        console.log('Using JavaScript implementation to update PO files...\n');

        const PO = require('pofile');
        const languages = ['en', 'da', 'nb', 'nn', 'sv', 'nordum'];
        let updatedCount = 0;

        try {
            // Load template
            const templateContent = await fs.readFile(this.templatePath, 'utf-8');
            const template = PO.parse(templateContent);

            for (const lang of languages) {
                const poPath = path.join(this.poDir, `${lang}.po`);

                try {
                    // Load existing PO file
                    const poContent = await fs.readFile(poPath, 'utf-8');
                    const po = PO.parse(poContent);

                    // Update existing entries and add new ones
                    const existingEntries = new Map();
                    po.items.forEach(item => {
                        if (item.msgid) {
                            existingEntries.set(item.msgid, item);
                        }
                    });

                    // Add new entries from template
                    for (const templateItem of template.items) {
                        if (templateItem.msgid && !existingEntries.has(templateItem.msgid)) {
                            const newItem = new PO.Item();
                            newItem.msgid = templateItem.msgid;
                            newItem.msgstr = [''];
                            newItem.extractedComments = templateItem.extractedComments || [];
                            newItem.flags = { fuzzy: true };
                            po.items.push(newItem);
                        }
                    }

                    // Save updated PO file
                    await fs.writeFile(poPath, po.toString());
                    console.log(`✅ Updated: ${lang}.po (${po.items.length} entries)`);
                    updatedCount++;

                } catch (error) {
                    if (error.code === 'ENOENT') {
                        // Create new PO file from template
                        const newPo = new PO();
                        newPo.headers = {
                            ...template.headers,
                            'Language': lang === 'nordum' ? 'x-nordum' : lang,
                            'PO-Revision-Date': new Date().toISOString(),
                            'Last-Translator': 'FULL NAME <EMAIL@ADDRESS>'
                        };

                        // Copy items from template
                        newPo.items = template.items.map(item => {
                            const newItem = new PO.Item();
                            newItem.msgid = item.msgid;
                            newItem.msgstr = [''];
                            newItem.extractedComments = item.extractedComments || [];
                            newItem.flags = { fuzzy: true };
                            return newItem;
                        });

                        await fs.writeFile(poPath, newPo.toString());
                        console.log(`✅ Created: ${lang}.po (${newPo.items.length} entries)`);
                        updatedCount++;
                    } else {
                        console.error(`❌ Failed to update ${lang}.po:`, error.message);
                    }
                }
            }

            console.log(`\n✅ Updated ${updatedCount} PO files using JavaScript`);
            console.log('\nNote: For better results, install gettext tools:');
            console.log('  Ubuntu/Debian: sudo apt-get install gettext');
            console.log('  macOS: brew install gettext');

        } catch (error) {
            console.error('❌ Failed to update PO files:', error.message);
        }
    }

    async run() {
        try {
            await this.ensureDir(this.poDir);

            // Check if template exists
            try {
                await fs.access(this.templatePath);
            } catch (error) {
                console.error('❌ Template file not found:', this.templatePath);
                console.log('Please run: node scripts/json-to-po.js first');
                process.exit(1);
            }

            await this.updatePoFiles();

        } catch (error) {
            console.error('❌ Update failed:', error);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const updater = new PoUpdater();
    updater.run();
}

module.exports = PoUpdater;
