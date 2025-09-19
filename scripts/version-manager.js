#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Nordum Version Management System
 * 
 * Implements semantic versioning (MAJOR.MINOR.PATCH) for dictionary releases
 * with additional build metadata and change tracking capabilities.
 */
class NordumVersionManager {
    constructor() {
        this.versionFile = path.join(__dirname, '../data/version.json');
        this.changelogFile = path.join(__dirname, '../CHANGELOG.md');
        this.packageFile = path.join(__dirname, '../package.json');
        
        this.currentVersion = null;
        this.changelog = [];
    }

    /**
     * Initialize version management system
     */
    async init() {
        await this.ensureVersionFile();
        await this.loadCurrentVersion();
    }

    /**
     * Load current version from version file
     */
    async loadCurrentVersion() {
        try {
            const versionData = await fs.readFile(this.versionFile, 'utf8');
            this.currentVersion = JSON.parse(versionData);
        } catch (error) {
            console.warn('Could not load version file, creating new one');
            this.currentVersion = this.createInitialVersion();
            await this.saveVersion();
        }
    }

    /**
     * Create initial version structure
     */
    createInitialVersion() {
        return {
            major: 1,
            minor: 0,
            patch: 0,
            build: Date.now(),
            prerelease: null,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            features: {
                balancedPanScandinavian: true,
                englishLoanwords: true,
                norwegianNumbers: true,
                questionWordsV: true,
                alternativeSpellings: true,
                morphologicalDistinctions: true,
                soundPatterns: true
            },
            statistics: {
                totalEntries: 0,
                alternativeSpellings: 0,
                languages: ['norwegian', 'danish', 'swedish'],
                ruleCompliance: 100.0
            },
            changelog: []
        };
    }

    /**
     * Ensure version file exists
     */
    async ensureVersionFile() {
        try {
            await fs.access(this.versionFile);
        } catch (error) {
            console.log('Creating initial version file...');
            const initialVersion = this.createInitialVersion();
            await fs.writeFile(this.versionFile, JSON.stringify(initialVersion, null, 2));
        }
    }

    /**
     * Increment version based on change type
     */
    async incrementVersion(type, description, breakingChanges = false) {
        if (!this.currentVersion) {
            await this.loadCurrentVersion();
        }

        const oldVersion = this.getVersionString();
        
        switch (type.toLowerCase()) {
            case 'major':
                this.currentVersion.major++;
                this.currentVersion.minor = 0;
                this.currentVersion.patch = 0;
                break;
                
            case 'minor':
                this.currentVersion.minor++;
                this.currentVersion.patch = 0;
                break;
                
            case 'patch':
                this.currentVersion.patch++;
                break;
                
            case 'build':
                // Only update build number and timestamp
                break;
                
            default:
                throw new Error(`Invalid version type: ${type}. Use 'major', 'minor', 'patch', or 'build'.`);
        }
        
        // Update metadata
        this.currentVersion.build = Date.now();
        this.currentVersion.lastModified = new Date().toISOString();
        
        // Add changelog entry
        const changeEntry = {
            version: this.getVersionString(),
            date: new Date().toISOString().split('T')[0],
            type,
            description,
            breakingChanges,
            oldVersion
        };
        
        this.currentVersion.changelog.unshift(changeEntry);
        
        await this.saveVersion();
        await this.updateChangelog(changeEntry);
        
        console.log(`Version updated: ${oldVersion} → ${this.getVersionString()}`);
        return this.getVersionString();
    }

    /**
     * Set prerelease identifier
     */
    async setPrerelease(identifier) {
        if (!this.currentVersion) {
            await this.loadCurrentVersion();
        }
        
        this.currentVersion.prerelease = identifier;
        this.currentVersion.lastModified = new Date().toISOString();
        
        await this.saveVersion();
        console.log(`Prerelease set: ${this.getVersionString()}`);
    }

    /**
     * Remove prerelease identifier (promote to stable)
     */
    async promoteToStable() {
        if (!this.currentVersion) {
            await this.loadCurrentVersion();
        }
        
        this.currentVersion.prerelease = null;
        this.currentVersion.lastModified = new Date().toISOString();
        
        await this.saveVersion();
        console.log(`Promoted to stable: ${this.getVersionString()}`);
    }

    /**
     * Update statistics after dictionary build
     */
    async updateStatistics(stats) {
        if (!this.currentVersion) {
            await this.loadCurrentVersion();
        }
        
        this.currentVersion.statistics = {
            ...this.currentVersion.statistics,
            ...stats,
            lastUpdated: new Date().toISOString()
        };
        
        this.currentVersion.lastModified = new Date().toISOString();
        await this.saveVersion();
    }

    /**
     * Get current version as string
     */
    getVersionString() {
        if (!this.currentVersion) return '1.0.0';
        
        const { major, minor, patch, prerelease, build } = this.currentVersion;
        let version = `${major}.${minor}.${patch}`;
        
        if (prerelease) {
            version += `-${prerelease}`;
        }
        
        version += `+${build}`;
        return version;
    }

    /**
     * Get version info for dictionary export
     */
    getVersionInfo() {
        if (!this.currentVersion) return null;
        
        return {
            version: this.getVersionString(),
            major: this.currentVersion.major,
            minor: this.currentVersion.minor,
            patch: this.currentVersion.patch,
            build: this.currentVersion.build,
            prerelease: this.currentVersion.prerelease,
            created: this.currentVersion.created,
            lastModified: this.currentVersion.lastModified,
            features: this.currentVersion.features,
            statistics: this.currentVersion.statistics
        };
    }

    /**
     * Save version to file
     */
    async saveVersion() {
        await fs.writeFile(this.versionFile, JSON.stringify(this.currentVersion, null, 2));
        
        // Also update package.json version
        try {
            const packageData = await fs.readFile(this.packageFile, 'utf8');
            const packageJson = JSON.parse(packageData);
            packageJson.version = this.getVersionString();
            await fs.writeFile(this.packageFile, JSON.stringify(packageJson, null, 2));
        } catch (error) {
            console.warn('Could not update package.json version:', error.message);
        }
    }

    /**
     * Update changelog file
     */
    async updateChangelog(changeEntry) {
        try {
            let changelog = '';
            
            // Try to read existing changelog
            try {
                changelog = await fs.readFile(this.changelogFile, 'utf8');
            } catch (error) {
                // Create new changelog
                changelog = `# Nordum Changelog\n\nAll notable changes to the Nordum dictionary will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n`;
            }
            
            // Add new entry
            const newEntry = this.formatChangelogEntry(changeEntry);
            
            // Insert after the header
            const lines = changelog.split('\n');
            const headerEnd = lines.findIndex(line => line.startsWith('## '));
            
            if (headerEnd === -1) {
                // No existing entries, add after initial header
                changelog += newEntry;
            } else {
                // Insert before first existing entry
                lines.splice(headerEnd, 0, ...newEntry.split('\n'));
                changelog = lines.join('\n');
            }
            
            await fs.writeFile(this.changelogFile, changelog);
            
        } catch (error) {
            console.warn('Could not update changelog:', error.message);
        }
    }

    /**
     * Format changelog entry
     */
    formatChangelogEntry(changeEntry) {
        const { version, date, type, description, breakingChanges, oldVersion } = changeEntry;
        
        let entry = `## [${version}] - ${date}\n\n`;
        
        if (breakingChanges) {
            entry += `### ⚠️ BREAKING CHANGES\n${description}\n\n`;
        } else {
            switch (type) {
                case 'major':
                    entry += `### 🚀 Major Changes\n${description}\n\n`;
                    break;
                case 'minor':
                    entry += `### ✨ New Features\n${description}\n\n`;
                    break;
                case 'patch':
                    entry += `### 🐛 Bug Fixes\n${description}\n\n`;
                    break;
                default:
                    entry += `### 📝 Changes\n${description}\n\n`;
            }
        }
        
        entry += `**Upgraded from**: ${oldVersion}\n\n`;
        return entry;
    }

    /**
     * List all versions
     */
    async listVersions() {
        if (!this.currentVersion) {
            await this.loadCurrentVersion();
        }
        
        console.log('\n📋 Version History:');
        console.log('==================');
        
        this.currentVersion.changelog.forEach(entry => {
            const status = entry.breakingChanges ? '⚠️' : 
                         entry.type === 'major' ? '🚀' :
                         entry.type === 'minor' ? '✨' : '🐛';
            
            console.log(`${status} v${entry.version} (${entry.date})`);
            console.log(`   ${entry.description}`);
            if (entry.breakingChanges) {
                console.log('   ⚠️  Breaking changes');
            }
            console.log('');
        });
    }

    /**
     * Compare two versions
     */
    compareVersions(v1, v2) {
        const parseVersion = (v) => {
            const [version, build] = v.split('+');
            const [core, prerelease] = version.split('-');
            const [major, minor, patch] = core.split('.').map(Number);
            return { major, minor, patch, prerelease, build: parseInt(build) || 0 };
        };
        
        const a = parseVersion(v1);
        const b = parseVersion(v2);
        
        if (a.major !== b.major) return a.major - b.major;
        if (a.minor !== b.minor) return a.minor - b.minor;
        if (a.patch !== b.patch) return a.patch - b.patch;
        
        // Handle prerelease
        if (a.prerelease && !b.prerelease) return -1;
        if (!a.prerelease && b.prerelease) return 1;
        if (a.prerelease && b.prerelease) {
            return a.prerelease.localeCompare(b.prerelease);
        }
        
        return a.build - b.build;
    }
}

// CLI interface
if (require.main === module) {
    const versionManager = new NordumVersionManager();
    const args = process.argv.slice(2);
    
    const command = args[0];
    
    const runCommand = async () => {
        try {
            await versionManager.init();
            
            switch (command) {
                case 'current':
                case 'show':
                    console.log(`Current version: ${versionManager.getVersionString()}`);
                    const info = versionManager.getVersionInfo();
                    console.log(`Created: ${info.created}`);
                    console.log(`Last modified: ${info.lastModified}`);
                    console.log(`Features: ${Object.keys(info.features).join(', ')}`);
                    break;
                    
                case 'major':
                    const majorDesc = args[1] || 'Major version update';
                    await versionManager.incrementVersion('major', majorDesc, args.includes('--breaking'));
                    break;
                    
                case 'minor':
                    const minorDesc = args[1] || 'Minor version update';
                    await versionManager.incrementVersion('minor', minorDesc);
                    break;
                    
                case 'patch':
                    const patchDesc = args[1] || 'Patch version update';
                    await versionManager.incrementVersion('patch', patchDesc);
                    break;
                    
                case 'build':
                    const buildDesc = args[1] || 'Build update';
                    await versionManager.incrementVersion('build', buildDesc);
                    break;
                    
                case 'prerelease':
                    const identifier = args[1];
                    if (!identifier) {
                        console.error('Please specify prerelease identifier (alpha, beta, rc1, etc.)');
                        process.exit(1);
                    }
                    await versionManager.setPrerelease(identifier);
                    break;
                    
                case 'stable':
                    await versionManager.promoteToStable();
                    break;
                    
                case 'list':
                case 'history':
                    await versionManager.listVersions();
                    break;
                    
                case 'stats':
                    if (args[1] && args[2]) {
                        const stats = JSON.parse(args[1]);
                        await versionManager.updateStatistics(stats);
                        console.log('Statistics updated');
                    } else {
                        const info = versionManager.getVersionInfo();
                        console.log('Current statistics:', info.statistics);
                    }
                    break;
                    
                default:
                    console.log(`
Nordum Version Manager

Usage:
  node version-manager.js <command> [options]

Commands:
  current                    Show current version
  major <description>        Increment major version (breaking changes)
  minor <description>        Increment minor version (new features)
  patch <description>        Increment patch version (bug fixes)
  build <description>        Update build number only
  prerelease <identifier>    Set prerelease identifier (alpha, beta, rc1)
  stable                     Remove prerelease identifier
  list                       List version history
  stats [json]               Show/update statistics

Examples:
  node version-manager.js current
  node version-manager.js minor "Added alternative spellings support"
  node version-manager.js major "New morphological system" --breaking
  node version-manager.js prerelease beta
  node version-manager.js stable
  node version-manager.js stats '{"totalEntries":172,"alternativeSpellings":15}'
                    `);
            }
            
        } catch (error) {
            console.error('Version management failed:', error.message);
            process.exit(1);
        }
    };
    
    runCommand();
}

module.exports = NordumVersionManager;