#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const natural = require('natural');
const NordumVersionManager = require('./version-manager');

class DictionaryBuilder {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.dictionaryDir = path.join(this.dataDir, 'dictionary');
        this.buildDir = path.join(__dirname, '../build/assets/data');
        this.sourceLanguages = ['norwegian', 'danish', 'swedish'];
        
        // Initialize version manager
        this.versionManager = new NordumVersionManager();
        
        // Linguistic rules from specification
        // Selection methodology - Balanced approach with alternative spellings
        this.orthographicRules = {
            // Primary vowel system: Norwegian/Danish æ/ø
            // Alternative spellings: Swedish/German ä/ö (both accepted)
            'æ': 'æ',      // Primary: Danish/Norwegian æ
            'ø': 'ø',      // Primary: Danish/Norwegian ø
            'ä': 'æ',      // Convert Swedish ä to primary æ (but ä remains valid alternative)
            'ö': 'ø',      // Convert Swedish ö to primary ø (but ö remains valid alternative)
            
            // Sound pattern transformations
            'ej': 'ei',    // Danish ej -> ei (systematic sound pattern)
            'øj': 'øy',    // Danish øj -> øy (if applicable)
            'aj': 'ai',    // Danish aj -> ai (systematic pattern)
            
            // Silent letter removal
            'dt$': 't',    // width -> vidt -> vid
            'ld$': 'l',    // world -> värld -> värl (when applicable)
            
            // Consonant standardization
            'ck': 'k',     // back -> bak
            'ph': 'f',     // phone -> fon
            'kj': 'kj',    // Keep Scandinavian kj sound
            'skj': 'skj',  // Keep Scandinavian skj sound
            
            // Question word transformation (Swedish v- pattern, no silent H)
            '^hv': 'v',    // hvad -> vad, hvor -> var, etc.
            
            // Regular endings
            'tion$': 'tion', // Keep international endings
            'sion$': 'sion'
        };
        
        // English loanwords to preserve unchanged
        this.englishLoanwords = new Set([
            'computer', 'internet', 'email', 'software', 'website', 'app', 'smartphone',
            'online', 'download', 'upload', 'login', 'password', 'browser', 'server',
            'database', 'backup', 'cloud', 'streaming', 'podcast', 'blog', 'chat',
            'social', 'media', 'digital', 'technology', 'system', 'network', 'platform'
        ]);
        
        // Norwegian number system (preferred)
        this.norwegianNumbers = new Map([
            ['femti', 'fifty'], ['seksti', 'sixty'], ['sytti', 'seventy'], ['åtti', 'eighty'], ['nitti', 'ninety'],
            ['tjue', 'twenty'], ['trettio', 'thirty'], ['førti', 'forty'], ['hundre', 'hundred'], ['tusen', 'thousand']
        ]);
        
        this.cognateData = new Map();
        this.nordumDictionary = new Map();
        this.inflectionRules = new Map();
    }

    async init() {
        await this.ensureDirectories();
        await this.loadInflectionRules();
        await this.versionManager.init();
    }

    async ensureDirectories() {
        for (const dir of [this.dataDir, this.dictionaryDir, this.buildDir]) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
            }
        }
    }

    async loadInflectionRules() {
        // Load Nordum inflection patterns
        this.inflectionRules.set('noun', {
            common: {
                singular: { indefinite: '', definite: '-en' },
                plural: { indefinite: '-ar', definite: '-arna' }  // Simplified -arna ending
            },
            neuter: {
                singular: { indefinite: '', definite: '-et' },
                plural: { indefinite: '-ar', definite: '-arna' }  // Consistent -ar/-arna for all nouns
            }
        });

        this.inflectionRules.set('adjective', {
            positive: { common: '', neuter: '-t', plural: '-e', definite: '-e' },  // -e for adjective plurals/definite
            comparative: '-ere',  // -ere for comparative (distinct from verb -er)
            superlative: '-est'   // -est for superlative (distinct from other forms)
        });

        this.inflectionRules.set('verb', {
            infinitive: '-a',
            present: '-er',     // ALWAYS -er for verbs (never -ar)
            past: '-ede',       // -ede for past tense (distinct from adjectives)
            supine: '-et',      // -et for supine (neuter-like ending)
            pastParticiple: '-et',  // -et for past participle (matches supine ending)
            presentParticiple: '-ende', // -ende for present participle (distinct from other forms)
            imperative: ''      // Bare stem for imperative
        });
    }

    // Cognate analysis methods
    calculateCognateScore(words) {
        if (!words || words.length < 2) return 0;
        
        const distances = [];
        for (let i = 0; i < words.length; i++) {
            for (let j = i + 1; j < words.length; j++) {
                const distance = natural.LevenshteinDistance(
                    this.normalizeForComparison(words[i]),
                    this.normalizeForComparison(words[j])
                );
                const maxLen = Math.max(words[i].length, words[j].length);
                distances.push(1 - (distance / maxLen));
            }
        }
        
        return distances.reduce((sum, score) => sum + score, 0) / distances.length;
    }

    normalizeForComparison(word) {
        return word.toLowerCase()
            .replace(/æ/g, 'ä')
            .replace(/ø/g, 'ö')
            .replace(/ck/g, 'k')
            .replace(/dt$/, 't')
            .replace(/[^a-zäöå]/g, '');
    }

    // Apply Nordum orthographic rules
    applyOrthographicRules(word, sourceLanguage) {
        if (!word || typeof word !== 'string') return word;
        
        let nordumWord = word.toLowerCase();
        
        // Language-specific preprocessing
        if (sourceLanguage === 'danish' || sourceLanguage === 'norwegian') {
            nordumWord = nordumWord.replace(/æ/g, 'ä').replace(/ø/g, 'ö');
        }
        
        // Apply systematic rules
        for (const [pattern, replacement] of Object.entries(this.orthographicRules)) {
            if (pattern.endsWith('$')) {
                // End-of-word pattern
                const regex = new RegExp(pattern);
                nordumWord = nordumWord.replace(regex, replacement);
            } else {
                // General pattern
                nordumWord = nordumWord.replace(new RegExp(pattern, 'g'), replacement);
            }
        }
        
        return nordumWord;
    }

    // Select best Nordum form from cognate set - prioritizing Bokmål/Danish
    selectNordumForm(cognateSet, english) {
        if (!cognateSet || typeof cognateSet !== 'object') return null;
        
        // Check for English loanwords first
        if (english && this.englishLoanwords.has(english.toLowerCase())) {
            return english.toLowerCase();
        }
        
        // Check for Norwegian numbers
        for (const [norNum, engNum] of this.norwegianNumbers.entries()) {
            if (english && english.toLowerCase() === engNum) {
                return norNum;
            }
        }
        
        // Priority system: Bokmål/Danish > Swedish
        let selectedWord = null;
        let selectedSource = null;
        let maxScore = -1;
        
        for (const [language, wordObj] of Object.entries(cognateSet)) {
            if (!wordObj || !wordObj.word) continue;
            
            let score = 0;
            
            // Scoring system favoring Bokmål/Danish
            if (language === 'norwegian') score += 3;
            if (language === 'danish') score += 3;
            if (language === 'swedish') score += 1;
            
            // Bonus for frequency
            const frequency = parseInt(wordObj.frequency) || 0;
            score += Math.log10(frequency + 1) * 0.5;
            
            // Bonus for regularity
            score += this.calculateRegularityScore(wordObj.word);
            
            if (score > maxScore) {
                maxScore = score;
                selectedWord = wordObj.word;
                selectedSource = language;
            }
        }
        
        if (!selectedWord) return null;
        
        // Apply Nordum-specific transformations
        return this.applyNordumRules(selectedWord, selectedSource, english, this.selectBestPOS(
            Object.values(cognateSet).map(w => w.pos).filter(Boolean), cognateSet
        ));
    }
    
    // Apply Nordum-specific rules
    applyNordumRules(word, sourceLanguage, english, pos) {
        let nordumWord = word.toLowerCase();
        
        // 1. English loanwords stay unchanged
        if (english && this.englishLoanwords.has(english.toLowerCase())) {
            return english.toLowerCase();
        }
        
        // 2. Norwegian number system
        for (const [norNum, engNum] of this.norwegianNumbers.entries()) {
            if (english && english.toLowerCase() === engNum) {
                return norNum;
            }
        }
        
        // 3. Question words: hv -> v (Swedish pattern) with alternative spellings
        if (word.startsWith('hv')) {
            // Specific transformations based on the word
            if (word === 'hva' || word === 'hvad') return 'vad';
            if (word === 'hvor') return 'var';
            if (word === 'hvem') return 'vem';
            if (word === 'hvorfor') return 'varför';
            if (word === 'hvilken') return 'vilken';
            if (word === 'hvornår') return 'ven';
            
            // General hv -> v transformation for other cases
            nordumWord = nordumWord.replace(/^hv/, 'v');
        }
        
        // 4. Apply systematic morphological rules
        nordumWord = this.applyMorphologicalTransformation(nordumWord, pos);
        
        // 5. Apply systematic sound pattern transformations
        nordumWord = this.applySoundPatterns(nordumWord);
        
        // 6. Apply other orthographic rules
        for (const [pattern, replacement] of Object.entries(this.orthographicRules)) {
            if (pattern.startsWith('^')) {
                // Start-of-word pattern
                const regex = new RegExp(pattern);
                nordumWord = nordumWord.replace(regex, replacement);
            } else if (pattern.endsWith('$')) {
                // End-of-word pattern
                const regex = new RegExp(pattern);
                nordumWord = nordumWord.replace(regex, replacement);
            } else if (!['ej', 'øj', 'aj'].includes(pattern)) {
                // General pattern (skip sound patterns, handled separately)
                nordumWord = nordumWord.replace(new RegExp(pattern, 'g'), replacement);
            }
        }
        
        return nordumWord;
    }

    calculateRegularityScore(word) {
        let score = 1.0;
        
        // Penalize irregular patterns
        if (word.includes('ck')) score -= 0.1;
        if (word.includes('ph')) score -= 0.1;
        if (word.endsWith('dt')) score -= 0.2;
        if (word.includes('silent')) score -= 0.3; // Placeholder for silent letter detection
        
        // Reward regular patterns
        if (word.match(/^[a-zäöå]+$/)) score += 0.1; // Only standard letters
        if (word.length <= 8) score += 0.05; // Reasonable length
        
        return Math.max(0, score);
    }

    // Generate inflected forms
    generateInflections(baseForm, partOfSpeech, gender = null) {
        const rules = this.inflectionRules.get(partOfSpeech);
        if (!rules) return {};
        
        const inflections = {};
        
        switch (partOfSpeech) {
            case 'noun':
                const nounRules = gender === 'neuter' ? rules.neuter : rules.common;
                inflections.singular = {
                    indefinite: baseForm,
                    definite: baseForm + nounRules.singular.definite
                };
                inflections.plural = {
                    indefinite: baseForm + nounRules.plural.indefinite,  // Always -ar for noun plurals
                    definite: baseForm + nounRules.plural.definite       // Always -arna for definite plurals
                };
                break;
                
            case 'adjective':
                inflections.positive = {
                    common: baseForm,
                    neuter: baseForm + rules.positive.neuter,
                    plural: baseForm + rules.positive.plural,
                    definite: baseForm + rules.positive.definite
                };
                inflections.comparative = baseForm + rules.comparative;
                inflections.superlative = baseForm + rules.superlative;
                break;
                
            case 'verb':
                const stem = baseForm.replace(/a$/, ''); // Remove infinitive ending
                inflections.infinitive = stem + rules.infinitive;
                inflections.present = stem + rules.present;  // Now uses -er ending
                inflections.past = stem + rules.past;
                inflections.supine = stem + rules.supine;
                inflections.pastParticiple = stem + rules.pastParticiple;
                inflections.presentParticiple = stem + rules.presentParticiple;
                inflections.imperative = stem;
                break;
        }
        
        return inflections;
    }

    // Load source dictionaries
    async loadSourceDictionaries() {
        const sourceData = {};
        
        for (const lang of this.sourceLanguages) {
            const filePath = path.join(this.dictionaryDir, 'sources', `${lang}.csv`);
            
            try {
                const data = [];
                await new Promise((resolve, reject) => {
                    require('fs').createReadStream(filePath)
                        .pipe(csv())
                        .on('data', (row) => data.push(row))
                        .on('end', resolve)
                        .on('error', reject);
                });
                
                sourceData[lang] = data;
                console.log(`Loaded ${data.length} entries for ${lang}`);
            } catch (error) {
                console.warn(`Could not load ${lang} dictionary: ${error.message}`);
                sourceData[lang] = [];
            }
        }
        
        return sourceData;
    }

    // Analyze cognates across languages
    async analyzeCognates(sourceData) {
        console.log('Analyzing cognates...');
        
        // Create concept map (English meanings to translations)
        const conceptMap = new Map();
        
        for (const [lang, entries] of Object.entries(sourceData)) {
            for (const entry of entries) {
                const english = entry.english?.toLowerCase();
                if (!english) continue;
                
                if (!conceptMap.has(english)) {
                    conceptMap.set(english, {});
                }
                
                conceptMap.get(english)[lang] = {
                    word: entry.word,
                    pos: entry.pos,
                    gender: entry.gender,
                    frequency: parseInt(entry.frequency) || 0
                };
            }
        }
        
        // Analyze each concept using new Nordum selection rules
        for (const [english, translations] of conceptMap.entries()) {
            // Skip if no valid translations
            const langCount = Object.keys(translations).length;
            if (langCount < 1) continue;
            
            // Select best Nordum form using new priority system
            const nordumForm = this.selectNordumForm(translations, english);
            if (!nordumForm) continue;
            
            // Determine best part of speech with Norwegian/Danish preference
            const posOptions = Object.values(translations).map(t => t.pos).filter(Boolean);
            const pos = this.selectBestPOS(posOptions, translations) || 'noun';
            
            // Determine best gender with Norwegian/Danish preference
            const genderOptions = Object.values(translations).map(t => t.gender).filter(Boolean);
            const gender = pos === 'noun' ? this.selectBestGender(genderOptions, translations) : null;
            
            // Calculate weighted frequency favoring Norwegian/Danish
            const avgFrequency = this.calculateWeightedFrequency(translations);
            
            // Calculate cognate score based on cross-language similarity
            const cognateScore = this.calculateCognateScore(
                Object.values(translations).map(t => t.word).filter(Boolean)
            );
            
            // Generate inflections for this entry
            const inflections = this.generateInflections(nordumForm, pos, gender);
            
            this.nordumDictionary.set(nordumForm, {
                nordum: nordumForm,
                english,
                pos,
                gender,
                cognateScore: Math.max(cognateScore, 0.5), // Minimum reasonable score
                langCount,
                frequency: avgFrequency,
                sources: translations,
                inflections: inflections,
                selectionReason: this.getSelectionReason(nordumForm, translations, english)
            });
        }
        
        console.log(`Generated ${this.nordumDictionary.size} Nordum entries`);
        
        // Generate alternative spellings
        const entriesArray = Array.from(this.nordumDictionary.values());
        const entriesWithAlternatives = this.generateAlternativeSpellings(entriesArray);
        
        // Add alternatives back to dictionary
        for (const entry of entriesWithAlternatives) {
            if (entry.alternativeOf && !this.nordumDictionary.has(entry.nordum)) {
                this.nordumDictionary.set(entry.nordum, entry);
            }
        }
        

        console.log(`Added ${this.nordumDictionary.size - entriesArray.length} alternative spellings`);
    }

    selectMostCommonValue(values) {
        if (!values.length) return null;
        
        const counts = {};
        values.forEach(v => counts[v] = (counts[v] || 0) + 1);
        
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    // Select best POS with Norwegian/Danish preference
    selectBestPOS(posOptions, translations) {
        if (!posOptions.length) return 'noun';
        
        // Weight by source language preference
        const weightedCounts = {};
        
        for (const [lang, trans] of Object.entries(translations)) {
            if (!trans.pos) continue;
            
            const weight = (lang === 'norwegian' || lang === 'danish') ? 2 : 1;
            const pos = trans.pos;
            
            weightedCounts[pos] = (weightedCounts[pos] || 0) + weight;
        }
        
        if (Object.keys(weightedCounts).length === 0) {
            return this.selectMostCommonValue(posOptions);
        }
        
        return Object.entries(weightedCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    // Select best gender with Norwegian/Danish preference
    selectBestGender(genderOptions, translations) {
        if (!genderOptions.length) return 'common';
        
        // Weight by source language preference
        const weightedCounts = {};
        
        for (const [lang, trans] of Object.entries(translations)) {
            if (!trans.gender) continue;
            
            const weight = (lang === 'norwegian' || lang === 'danish') ? 2 : 1;
            const gender = this.normalizeGender(trans.gender);
            
            if (gender) {
                weightedCounts[gender] = (weightedCounts[gender] || 0) + weight;
            }
        }
        
        if (Object.keys(weightedCounts).length === 0) {
            return this.selectMostCommonValue(genderOptions.map(g => this.normalizeGender(g)).filter(Boolean));
        }
        
        return Object.entries(weightedCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    // Calculate weighted frequency favoring Norwegian/Danish
    calculateWeightedFrequency(translations) {
        const frequencies = [];
        
        for (const [lang, trans] of Object.entries(translations)) {
            if (trans.frequency && trans.frequency > 0) {
                const weight = (lang === 'norwegian' || lang === 'danish') ? 1.5 : 1.0;
                frequencies.push(trans.frequency * weight);
            }
        }
        
        if (frequencies.length === 0) return 1000;
        
        return Math.round(frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length);
    }
    
    // Normalize gender values
    normalizeGender(gender) {
        if (!gender) return null;
        
        const normalized = gender.toLowerCase();
        const mapping = {
            'en': 'common',
            'ett': 'neuter',
            'et': 'neuter',
            'masculine': 'common',
            'feminine': 'common',
            'm': 'common',
            'f': 'common',
            'n': 'neuter',
            'c': 'common'
        };
        
        return mapping[normalized] || normalized;
    }
    
    // Get explanation for why this Nordum form was selected
    getSelectionReason(nordumForm, translations, english) {
        if (english && this.englishLoanwords.has(english.toLowerCase())) {
            return 'English loanword preserved (Danish practice)';
        }
        
        for (const [norNum, engNum] of this.norwegianNumbers.entries()) {
            if (english && english.toLowerCase() === engNum) {
                return 'Norwegian number system (most regular)';
            }
        }
        
        if (nordumForm.match(/^v(ad|ar|em|arför|ilken)/)) {
            return 'Question word with v- (Swedish pattern, no silent H)';
        }
        
        const hasNorwegian = translations.norwegian && translations.norwegian.word;
        const hasDanish = translations.danish && translations.danish.word;
        
        if (hasNorwegian && hasDanish) {
            return 'Bokmål/Danish agreement (preferred foundation)';
        } else if (hasNorwegian) {
            return 'Norwegian Bokmål form (preferred over Swedish)';
        } else if (hasDanish) {
            return 'Danish form (preferred over Swedish)';
        }
        
        return 'Selected based on regularity and frequency';
    }
    
    // Generate alternative spellings for pronunciation variants
    generateAlternativeSpellings(entries) {
        const entriesWithAlternatives = [...entries];
        
        for (const entry of entries) {
            const alternatives = this.getAlternativeSpellings(entry.nordum, entry.english);
            
            for (const alt of alternatives) {
                // Create alternative entry
                const altEntry = {
                    ...entry,
                    nordum: alt.spelling,
                    alternativeOf: entry.nordum,
                    alternativeReason: alt.reason,
                    frequency: Math.round(entry.frequency * 0.7) // Lower frequency for alternatives
                };
                
                entriesWithAlternatives.push(altEntry);
            }
        }
        
        return entriesWithAlternatives;
    }
    
    // Get alternative spellings for a word
    getAlternativeSpellings(nordumWord, english) {
        const alternatives = [];
        
        // Question word alternatives based on pronunciation variants
        const questionAlternatives = {
            'vad': [
                { spelling: 'va', reason: 'Short form variant (common in speech)' }
            ],
            'varför': [
                { spelling: 'vorfor', reason: 'Norwegian/Danish pronunciation variant' }
            ],
            'ven': [
                { spelling: 'vornår', reason: 'Full form variant (Danish hvornår → vornår)' },
                { spelling: 'när', reason: 'Swedish pronunciation variant' },
                { spelling: 'når', reason: 'Norwegian pronunciation variant' }
            ]
        };
        
        if (questionAlternatives[nordumWord]) {
            alternatives.push(...questionAlternatives[nordumWord]);
        }
        
        // Sound pattern alternatives: ej/ei, øj/øy, aj/ai variants
        if (nordumWord.includes('ej')) {
            const eiVariant = nordumWord.replace(/ej/g, 'ei');
            alternatives.push({
                spelling: eiVariant,
                reason: 'Sound pattern variant (ej→ei)'
            });
        }
        
        if (nordumWord.includes('ei')) {
            const ejVariant = nordumWord.replace(/ei/g, 'ej');
            alternatives.push({
                spelling: ejVariant,
                reason: 'Sound pattern variant (ei→ej)'
            });
        }
        
        if (nordumWord.includes('øj')) {
            const øyVariant = nordumWord.replace(/øj/g, 'øy');
            alternatives.push({
                spelling: øyVariant,
                reason: 'Sound pattern variant (øj→øy)'
            });
        }
        
        if (nordumWord.includes('aj')) {
            const aiVariant = nordumWord.replace(/aj/g, 'ai');
            alternatives.push({
                spelling: aiVariant,
                reason: 'Sound pattern variant (aj→ai)'
            });
        }
        
        // Vowel alternatives: æ/ø vs ä/ö variants
        let altSpelling = nordumWord;
        let hasVowelAlternative = false;
        
        if (nordumWord.includes('æ')) {
            altSpelling = altSpelling.replace(/æ/g, 'ä');
            hasVowelAlternative = true;
        }
        if (nordumWord.includes('ø')) {
            altSpelling = altSpelling.replace(/ø/g, 'ö');
            hasVowelAlternative = true;
        }
        
        if (hasVowelAlternative && altSpelling !== nordumWord) {
            alternatives.push({
                spelling: altSpelling,
                reason: 'Swedish/German vowel variant (ä/ö)'
            });
        }
        
        // Reverse: ä/ö to æ/ø variants
        altSpelling = nordumWord;
        hasVowelAlternative = false;
        
        if (nordumWord.includes('ä')) {
            altSpelling = altSpelling.replace(/ä/g, 'æ');
            hasVowelAlternative = true;
        }
        if (nordumWord.includes('ö')) {
            altSpelling = altSpelling.replace(/ö/g, 'ø');
            hasVowelAlternative = true;
        }
        
        if (hasVowelAlternative && altSpelling !== nordumWord) {
            alternatives.push({
                spelling: altSpelling,
                reason: 'Norwegian/Danish vowel variant (æ/ø)'
            });
        }
        
        return alternatives;
    }
    
    // Apply morphological transformation during word selection
    applyMorphologicalTransformation(word, pos) {
        let transformedWord = word;
        
        switch (pos) {
            case 'verb':
                // Verbs: ensure present tense uses -er (never -ar)
                if (transformedWord.endsWith('ar')) {
                    transformedWord = transformedWord.slice(0, -2) + 'er';
                }
                // Apply to specific Swedish verb forms
                if (word === 'arbetar') {
                    transformedWord = 'arbeider'; // arbetar -> arbeider (keep Norwegian/Danish form)
                }
                break;
                
            case 'noun':
                // Nouns: transform Norwegian -er plurals to Nordum -ar plurals
                if (transformedWord.endsWith('er')) {
                    transformedWord = transformedWord.slice(0, -2) + 'ar';
                }
                break;
                
            case 'adjective':
                // Adjectives: base form unchanged, comparatives handled in inflection
                break;
        }
        
        return transformedWord;
    }
    
    // Apply systematic sound pattern transformations
    applySoundPatterns(word) {
        let transformedWord = word;
        
        // Danish ej -> ei transformation (systematic)
        transformedWord = transformedWord.replace(/ej/g, 'ei');
        
        // Danish øj -> øy transformation
        transformedWord = transformedWord.replace(/øj/g, 'øy');
        
        // Danish aj -> ai transformation  
        transformedWord = transformedWord.replace(/aj/g, 'ai');
        
        // Additional sound clarifications
        // Swedish/Norwegian y vs Danish y patterns
        // (These might need refinement based on actual usage)
        
        return transformedWord;
    }

    // Export dictionary formats
    async exportDictionaries() {
        console.log('Exporting dictionary formats...');
        
        // Sort by frequency and cognate score, with alternatives after main entries
        const sortedEntries = Array.from(this.nordumDictionary.values())
            .sort((a, b) => {
                // Main entries first, then alternatives
                if (a.alternativeOf && !b.alternativeOf) return 1;
                if (!a.alternativeOf && b.alternativeOf) return -1;
                
                // Then by frequency and cognate score
                return (b.cognateScore * b.langCount) - (a.cognateScore * a.langCount);
            });
        
        // Get version information
        const versionInfo = this.versionManager.getVersionInfo();
        
        // JSON format for web tools
        const jsonDict = {
            metadata: {
                version: versionInfo.version,
                generated: new Date().toISOString(),
                entryCount: sortedEntries.length,
                languages: ['nordum', 'english', 'norwegian', 'danish', 'swedish'],
                buildInfo: {
                    ...versionInfo,
                    rules: {
                        soundPatterns: ['ej→ei', 'øj→øy', 'aj→ai'],
                        morphology: ['verbs:-er', 'plurals:-ar', 'comparative:-ere'],
                        alternatives: ['æ/ø↔ä/ö', 'question-variants', 'pronunciation-forms']
                    }
                }
            },
            entries: sortedEntries.reduce((acc, entry) => {
                acc[entry.nordum] = entry;
                return acc;
            }, {})
        };
        
        await fs.writeFile(
            path.join(this.buildDir, 'dictionary.json'),
            JSON.stringify(jsonDict, null, 2)
        );
        
        // Compact format for spell checking
        const spellCheckList = sortedEntries.map(entry => {
            const words = [entry.nordum];
            
            // Add inflected forms
            if (entry.inflections && typeof entry.inflections === 'object') {
                const addFormsRecursively = (forms) => {
                    if (typeof forms === 'string' && forms !== entry.nordum) {
                        words.push(forms);
                    } else if (typeof forms === 'object' && forms !== null) {
                        Object.values(forms).forEach(addFormsRecursively);
                    }
                };
                Object.values(entry.inflections).forEach(addFormsRecursively);
            }
            
            return [...new Set(words)]; // Remove duplicates
        }).flat();
        
        await fs.writeFile(
            path.join(this.buildDir, 'wordlist.txt'),
            Array.from(new Set(spellCheckList)).join('\n')
        );
        
        // Statistics
        const stats = {
            totalEntries: sortedEntries.length,
            byPartOfSpeech: {},
            averageCognateScore: 0,
            coverageByLanguage: {},
            regularityScore: 0
        };
        
        sortedEntries.forEach(entry => {
            stats.byPartOfSpeech[entry.pos] = (stats.byPartOfSpeech[entry.pos] || 0) + 1;
            stats.averageCognateScore += entry.cognateScore;
        });
        
        stats.averageCognateScore /= sortedEntries.length;
        
        await fs.writeFile(
            path.join(this.buildDir, 'statistics.json'),
            JSON.stringify(stats, null, 2)
        );
        
        // Update version statistics
        const alternativeCount = sortedEntries.filter(e => e.alternativeOf).length;
        await this.versionManager.updateStatistics({
            totalEntries: sortedEntries.length,
            alternativeSpellings: alternativeCount,
            averageCognateScore: stats.averageCognateScore,
            lastBuild: new Date().toISOString()
        });
        
        console.log(`Exported dictionary with ${sortedEntries.length} entries`);
        console.log(`Average cognate score: ${stats.averageCognateScore.toFixed(3)}`);
        console.log(`Version: ${this.versionManager.getVersionString()}`);
    }

    async build() {
        console.log('Starting dictionary build...');
        
        try {
            await this.init();
            
            const sourceData = await this.loadSourceDictionaries();
            await this.analyzeCognates(sourceData);
            await this.exportDictionaries();
            
            console.log('Dictionary build completed successfully!');
        } catch (error) {
            console.error('Dictionary build failed:', error);
            process.exit(1);
        }
    }
}

// CLI interface
if (require.main === module) {
    const builder = new DictionaryBuilder();
    
    if (process.argv.includes('--analyze-only')) {
        // Just analyze without building
        console.log('Analyzing cognates only...');
    }
    
    builder.build();
}

module.exports = DictionaryBuilder;