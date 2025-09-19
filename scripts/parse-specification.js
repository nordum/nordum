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
const MarkdownIt = require('markdown-it');

class SpecificationParser {
    constructor() {
        this.md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
        });
        
        this.specPath = path.join(__dirname, '../NORDUM_LANGUAGE_SPECIFICATION.md');
        this.outputPath = path.join(__dirname, '../build/specification.json');
    }

    async parseSpecification() {
        try {
            // Ensure build directory exists
            await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
            
            // Read the markdown file
            const content = await fs.readFile(this.specPath, 'utf8');
            
            // Split into sections based on ## headers
            const sections = this.splitIntoSections(content);
            
            // Parse each section
            const parsedSections = {};
            
            for (const [sectionId, sectionContent] of Object.entries(sections)) {
                parsedSections[sectionId] = {
                    title: this.extractTitle(sectionContent),
                    html: this.addAnchorIdsToHtml(this.md.render(sectionContent), sectionId),
                    markdown: sectionContent,
                    subsections: this.extractSubsections(sectionContent)
                };
            }
            
            // Generate table of contents with proper subsection links
            const tableOfContents = this.generateTableOfContents(parsedSections);
            
            const result = {
                tableOfContents,
                sections: parsedSections,
                generatedAt: new Date().toISOString(),
                sourceFile: 'NORDUM_LANGUAGE_SPECIFICATION.md'
            };
            
            // Write to output file
            await fs.writeFile(this.outputPath, JSON.stringify(result, null, 2));
            
            console.log(`✅ Parsed specification into ${Object.keys(parsedSections).length} sections`);
            console.log(`📄 Output saved to: ${this.outputPath}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error parsing specification:', error);
            throw error;
        }
    }
    
    splitIntoSections(content) {
        const sections = {};
        const lines = content.split('\n');
        let currentSection = null;
        let currentContent = [];
        
        for (const line of lines) {
            // Check if this is a main section header (## but not ###)
            const headerMatch = line.match(/^## (\d+\.?\s*)?(.+)$/);
            
            if (headerMatch) {
                // Save previous section if exists
                if (currentSection && currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n').trim();
                }
                
                // Start new section
                const title = headerMatch[2];
                currentSection = this.titleToId(title);
                currentContent = [line]; // Include the header in the content
            } else {
                // Add line to current section
                if (currentSection) {
                    currentContent.push(line);
                }
            }
        }
        
        // Don't forget the last section
        if (currentSection && currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
        }
        
        return sections;
    }
    
    extractTitle(sectionContent) {
        const lines = sectionContent.split('\n');
        const headerLine = lines.find(line => line.match(/^## /));
        if (headerLine) {
            return headerLine.replace(/^## (\d+\.?\s*)?/, '').trim();
        }
        return 'Untitled Section';
    }
    
    extractSubsections(sectionContent) {
        const subsections = [];
        const lines = sectionContent.split('\n');
        
        for (const line of lines) {
            const subsectionMatch = line.match(/^### (.+)$/);
            if (subsectionMatch) {
                const title = subsectionMatch[1];
                subsections.push({
                    id: this.titleToId(title),
                    title: title
                });
            }
        }
        
        return subsections;
    }
    
    generateTableOfContents(sections) {
        const toc = [];
        
        for (const [sectionId, section] of Object.entries(sections)) {
            const tocItem = {
                id: sectionId,
                title: section.title,
                subsections: section.subsections.map(subsection => ({
                    id: subsection.id,
                    title: subsection.title,
                    link: `#${sectionId}-${subsection.id}` // Proper link format
                }))
            };
            toc.push(tocItem);
        }
        
        return toc;
    }
    
    addAnchorIdsToHtml(html, sectionId) {
        // Add anchor IDs to h3 headers (subsections)
        return html.replace(/<h3>(.+?)<\/h3>/g, (match, headerText) => {
            const cleanText = headerText.replace(/<[^>]*>/g, '').trim();
            const subsectionId = this.titleToId(cleanText);
            return `<h3 id="${sectionId}-${subsectionId}">${headerText}</h3>`;
        });
    }
    
    titleToId(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-')     // Replace spaces with hyphens
            .replace(/-+/g, '-')      // Replace multiple hyphens with single
            .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
    }
}

// CLI usage
if (require.main === module) {
    const parser = new SpecificationParser();
    parser.parseSpecification().catch(error => {
        console.error('Failed to parse specification:', error);
        process.exit(1);
    });
}

module.exports = SpecificationParser;