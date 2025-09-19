#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function testCSVParsing() {
    const filePath = path.join(__dirname, '../data/dictionary/sources/swedish.csv');
    
    console.log('Testing CSV parsing for Swedish dictionary...');
    console.log(`File path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    if (!fs.existsSync(filePath)) {
        console.error('File does not exist!');
        return;
    }
    
    // Read the specific line where arbetare should be
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    console.log(`Total lines in file: ${lines.length}`);
    
    // Look for arbetare in the raw file content
    const arbetareLines = lines.filter(line => line.includes('arbetare'));
    console.log(`Lines containing 'arbetare': ${arbetareLines.length}`);
    
    if (arbetareLines.length > 0) {
        console.log('Raw arbetare lines:');
        arbetareLines.forEach((line, index) => {
            console.log(`${index + 1}: ${line}`);
        });
    }
    
    // Now test CSV parsing
    const parsedData = [];
    let arbetareFound = false;
    
    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    parsedData.push(row);
                    
                    // Check for arbetare in parsed data
                    if (row.word && row.word.includes('arbetare')) {
                        console.log(`✅ Found arbetare in parsed data: ${JSON.stringify(row)}`);
                        arbetareFound = true;
                    }
                })
                .on('end', () => {
                    console.log(`CSV parsing completed. Parsed ${parsedData.length} rows`);
                    
                    if (!arbetareFound) {
                        console.log('❌ arbetare not found in parsed data');
                        
                        // Check if any rows were parsed at all
                        if (parsedData.length > 0) {
                            console.log('First 5 parsed rows:');
                            parsedData.slice(0, 5).forEach((row, index) => {
                                console.log(`${index + 1}: ${JSON.stringify(row)}`);
                            });
                            
                            // Check for any parsing issues
                            const words = parsedData.map(row => row.word).filter(Boolean);
                            console.log(`Sample words from parsed data: ${words.slice(0, 10).join(', ')}`);
                        }
                    }
                    
                    resolve();
                })
                .on('error', (error) => {
                    console.error('CSV parsing error:', error);
                    reject(error);
                });
        });
    } catch (error) {
        console.error('Failed to parse CSV:', error);
    }
}

if (require.main === module) {
    testCSVParsing().catch(console.error);
}

module.exports = { testCSVParsing };