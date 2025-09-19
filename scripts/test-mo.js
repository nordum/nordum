#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const PO = require('pofile');
let gettextParser;
(async () => {
    gettextParser = await import('gettext-parser');
})();

async function testMoCompilation() {
    const gettextParser = await import('gettext-parser');
    try {
        const poPath = path.join(__dirname, '../src/i18n/en.po');
        const poContent = await fs.readFile(poPath, 'utf-8');
        const po = PO.parse(poContent);

        console.log('PO items count:', po.items.length);
        console.log('First few items:');

        for (let i = 0; i < Math.min(5, po.items.length); i++) {
            const item = po.items[i];
            console.log(`  ${i + 1}. msgid: "${item.msgid}"`);
            console.log(`     msgstr: "${item.msgstr[0]}"`);
        }

        // Test gettext-parser compilation
        const mo = gettextParser.mo.compile(po);
        console.log('\nMO buffer length:', mo.length);
        console.log('MO buffer (first 100 bytes):', mo.slice(0, 100));

    } catch (error) {
        console.error('Error:', error);
    }
}

testMoCompilation();
