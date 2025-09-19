/**
 * Nordum - Main JavaScript Application
 * Pan-Scandinavian Language Project
 */

class NordumApp {
    constructor() {
        this.isInitialized = false;
        this.currentLanguage = document.documentElement.getAttribute('data-lang') || 'en';
        this.siteData = window.NORDUM_SITE || {};
        this.translations = window.NORDUM_I18N || {};
        this.dictionaryData = null;
        
        this.components = new Map();
        this.utils = {};
        
        this.init();
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // Initialize core functionality
            this.initUtils();
            this.initNavigation();
            this.initDropdowns();
            this.initLanguageSwitcher();
            this.initAccessibility();
            this.initPerformance();
            this.initAnalytics();
            
            // Load dictionary data
            await this.loadDictionary();
            
            // Create mock API for development
            this.createMockAPI();
            
            // Initialize page-specific components
            this.initPageComponents();
            this.initDictionaryTool();
            this.initSpellChecker();
            this.initTranslator();
            this.initEditor();
            
            this.isInitialized = true;
            console.log('Nordum app initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Nordum app:', error);
        }
    }

    initUtils() {
        this.utils = {
            // DOM utilities
            $: (selector, context = document) => context.querySelector(selector),
            $$: (selector, context = document) => Array.from(context.querySelectorAll(selector)),
            
            // Event utilities
            on: (element, event, handler, options = false) => {
                if (typeof element === 'string') {
                    element = this.utils.$(element);
                }
                if (element) {
                    element.addEventListener(event, handler, options);
                }
            },
            
            off: (element, event, handler) => {
                if (typeof element === 'string') {
                    element = this.utils.$(element);
                }
                if (element) {
                    element.removeEventListener(event, handler);
                }
            },
            
            // Animation utilities
            fadeIn: (element, duration = 300) => {
                element.style.opacity = '0';
                element.style.display = 'block';
                
                const start = performance.now();
                const animate = (currentTime) => {
                    const elapsed = currentTime - start;
                    const progress = Math.min(elapsed / duration, 1);
                    element.style.opacity = progress;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                };
                requestAnimationFrame(animate);
            },
            
            fadeOut: (element, duration = 300) => {
                const start = performance.now();
                const animate = (currentTime) => {
                    const elapsed = currentTime - start;
                    const progress = Math.min(elapsed / duration, 1);
                    element.style.opacity = 1 - progress;
                    
                    if (progress >= 1) {
                        element.style.display = 'none';
                    } else {
                        requestAnimationFrame(animate);
                    }
                };
                requestAnimationFrame(animate);
            },
            
            // Storage utilities
            store: {
                get: (key, defaultValue = null) => {
                    try {
                        const value = localStorage.getItem(`nordum_${key}`);
                        return value ? JSON.parse(value) : defaultValue;
                    } catch {
                        return defaultValue;
                    }
                },
                
                set: (key, value) => {
                    try {
                        localStorage.setItem(`nordum_${key}`, JSON.stringify(value));
                        return true;
                    } catch {
                        return false;
                    }
                },
                
                remove: (key) => {
                    localStorage.removeItem(`nordum_${key}`);
                }
            },
            
            // String utilities
            escapeHtml: (text) => {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },
            
            // Debounce utility
            debounce: (func, wait, immediate = false) => {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        timeout = null;
                        if (!immediate) func.apply(this, args);
                    };
                    const callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) func.apply(this, args);
                };
            },
            
            // Throttle utility
            throttle: (func, limit) => {
                let inThrottle;
                return function(...args) {
                    if (!inThrottle) {
                        func.apply(this, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                };
            }
        };
    }

    initNavigation() {
        // Mobile menu toggle
        const hamburger = this.utils.$('.hamburger');
        const navMenu = this.utils.$('.nav-menu');
        
        if (hamburger && navMenu) {
            this.utils.on(hamburger, 'click', () => {
                const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
                hamburger.setAttribute('aria-expanded', !isExpanded);
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking links
        this.utils.$$('.nav-link').forEach(link => {
            this.utils.on(link, 'click', () => {
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    hamburger.classList.remove('active');
                    hamburger.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Smooth scrolling for anchor links
        this.utils.$$('a[href^="#"]').forEach(link => {
            this.utils.on(link, 'click', (e) => {
                e.preventDefault();
                const target = this.utils.$(link.getAttribute('href'));
                if (target) {
                    const headerHeight = 80;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Header scroll effects
        let lastScrollY = window.scrollY;
        const header = this.utils.$('.header');
        
        const handleScroll = this.utils.throttle(() => {
            const currentScrollY = window.scrollY;
            
            if (header) {
                if (currentScrollY > 100) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
                
                // Hide/show header on scroll
                if (currentScrollY > lastScrollY && currentScrollY > 200) {
                    header.style.transform = 'translateY(-100%)';
                } else {
                    header.style.transform = 'translateY(0)';
                }
            }
            
            lastScrollY = currentScrollY;
        }, 100);
        
        this.utils.on(window, 'scroll', handleScroll);
    }

    initDropdowns() {
        // Handle tools dropdown
        const toolsDropdown = this.utils.$('.nav-dropdown');
        const toolsToggle = this.utils.$('.dropdown-toggle');
        const toolsMenu = this.utils.$('.dropdown-menu');
        
        if (toolsToggle && toolsMenu) {
            this.utils.on(toolsToggle, 'click', (e) => {
                e.preventDefault();
                const isExpanded = toolsToggle.getAttribute('aria-expanded') === 'true';
                toolsToggle.setAttribute('aria-expanded', !isExpanded);
                toolsMenu.classList.toggle('active');
            });
        }

        // Handle language dropdown
        const langToggle = this.utils.$('.lang-toggle');
        const langDropdown = this.utils.$('.lang-dropdown');
        
        if (langToggle && langDropdown) {
            this.utils.on(langToggle, 'click', (e) => {
                e.preventDefault();
                const isExpanded = langToggle.getAttribute('aria-expanded') === 'true';
                langToggle.setAttribute('aria-expanded', !isExpanded);
                langDropdown.classList.toggle('active');
            });
        }

        // Close dropdowns when clicking outside
        this.utils.on(document, 'click', (e) => {
            // Close tools dropdown
            if (toolsToggle && toolsMenu && !toolsDropdown.contains(e.target)) {
                toolsToggle.setAttribute('aria-expanded', 'false');
                toolsMenu.classList.remove('active');
            }
            
            // Close language dropdown
            if (langToggle && langDropdown && !langToggle.parentElement.contains(e.target)) {
                langToggle.setAttribute('aria-expanded', 'false');
                langDropdown.classList.remove('active');
            }
        });

        // Close dropdowns on escape key
        this.utils.on(document, 'keydown', (e) => {
            if (e.key === 'Escape') {
                if (toolsToggle && toolsMenu) {
                    toolsToggle.setAttribute('aria-expanded', 'false');
                    toolsMenu.classList.remove('active');
                }
                if (langToggle && langDropdown) {
                    langToggle.setAttribute('aria-expanded', 'false');
                    langDropdown.classList.remove('active');
                }
            }
        });
    }

    async loadDictionary() {
        try {
            const response = await fetch('/assets/data/dictionary.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.dictionaryData = await response.json();
            console.log(`Loaded dictionary with ${this.dictionaryData.metadata.entryCount} entries`);
        } catch (error) {
            console.error('Failed to load dictionary:', error);
            this.dictionaryData = { metadata: { entryCount: 0 }, entries: {} };
        }
    }

    searchDictionary(query, filter = 'all') {
        if (!this.dictionaryData || !query.trim()) {
            return [];
        }

        query = query.toLowerCase().trim();
        const entries = Object.values(this.dictionaryData.entries);
        const results = [];

        for (const entry of entries) {
            let matches = false;
            
            // Search in different fields based on filter
            if (filter === 'all' || filter === 'nordum') {
                if (entry.nordum && entry.nordum.toLowerCase().includes(query)) {
                    matches = true;
                }
            }
            
            if (filter === 'all' || filter === 'english') {
                if (entry.english && entry.english.toLowerCase().includes(query)) {
                    matches = true;
                }
            }
            
            if (filter === 'all') {
                // Also search in source languages
                if (entry.sources) {
                    for (const lang of Object.values(entry.sources)) {
                        if (lang.word && lang.word.toLowerCase().includes(query)) {
                            matches = true;
                            break;
                        }
                    }
                }
            }
            
            if (matches) {
                results.push(entry);
            }
        }
        
        // Sort by relevance (exact matches first, then by frequency)
        results.sort((a, b) => {
            const aExact = a.nordum.toLowerCase() === query || a.english.toLowerCase() === query;
            const bExact = b.nordum.toLowerCase() === query || b.english.toLowerCase() === query;
            
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            return (b.frequency || 0) - (a.frequency || 0);
        });
        
        return results.slice(0, 20); // Limit to 20 results
    }

    getWordsByLetter(letter) {
        if (!this.dictionaryData) {
            return [];
        }
        
        letter = letter.toLowerCase();
        const entries = Object.values(this.dictionaryData.entries);
        
        return entries
            .filter(entry => entry.nordum && entry.nordum.toLowerCase().startsWith(letter))
            .sort((a, b) => a.nordum.localeCompare(b.nordum))
            .slice(0, 50); // Limit to 50 results per letter
    }

    spellCheckText(text) {
        if (!this.dictionaryData || !text.trim()) {
            return {
                errors: [],
                suggestions: [],
                stats: { words: 0, characters: 0, sentences: 0 }
            };
        }
        
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const knownWords = new Set(Object.keys(this.dictionaryData.entries));
        
        const errors = [];
        const uniqueWords = new Set(words);
        
        for (const word of uniqueWords) {
            if (!knownWords.has(word)) {
                // Find potential suggestions
                const suggestions = this.findSuggestions(word);
                errors.push({
                    word,
                    suggestions: suggestions.slice(0, 3)
                });
            }
        }
        
        return {
            errors,
            stats: {
                words: words.length,
                characters: text.length,
                sentences: sentences.length
            }
        };
    }
    
    findSuggestions(word) {
        if (!this.dictionaryData) return [];
        
        const entries = Object.keys(this.dictionaryData.entries);
        const suggestions = [];
        
        for (const entry of entries) {
            const distance = this.levenshteinDistance(word, entry);
            if (distance <= 2 && distance > 0) {
                suggestions.push({ word: entry, distance });
            }
        }
        
        return suggestions
            .sort((a, b) => a.distance - b.distance)
            .map(s => s.word);
    }
    
    levenshteinDistance(a, b) {
        const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
        
        for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }
        
        return matrix[b.length][a.length];
    }

    initLanguageSwitcher() {
        const languageToggle = this.utils.$('.language-toggle');
        const languageMenu = this.utils.$('.language-menu');
        
        if (languageToggle && languageMenu) {
            this.utils.on(languageToggle, 'click', () => {
                const isExpanded = languageToggle.getAttribute('aria-expanded') === 'true';
                languageToggle.setAttribute('aria-expanded', !isExpanded);
                languageMenu.classList.toggle('active');
            });
            
            // Close when clicking outside
            this.utils.on(document, 'click', (e) => {
                if (!languageToggle.contains(e.target) && !languageMenu.contains(e.target)) {
                    languageToggle.setAttribute('aria-expanded', 'false');
                    languageMenu.classList.remove('active');
                }
            });
        }
    }

    initAccessibility() {
        // Skip link functionality
        const skipLink = this.utils.$('.skip-link');
        const mainContent = this.utils.$('#main-content');
        
        if (skipLink && mainContent) {
            this.utils.on(skipLink, 'click', (e) => {
                e.preventDefault();
                mainContent.focus();
                mainContent.scrollIntoView();
            });
        }

        // Keyboard navigation for dropdowns
        this.utils.$$('.dropdown-toggle').forEach(toggle => {
            this.utils.on(toggle, 'keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle.click();
                }
                
                if (e.key === 'Escape') {
                    const dropdown = toggle.closest('.nav-dropdown');
                    if (dropdown) {
                        dropdown.querySelector('.dropdown-menu').classList.remove('active');
                        toggle.setAttribute('aria-expanded', 'false');
                        toggle.focus();
                    }
                }
            });
        });

        // Announce dynamic content changes
        this.announcer = this.utils.$('#announcer') || this.createAnnouncer();
    }

    createAnnouncer() {
        const announcer = document.createElement('div');
        announcer.id = 'announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        document.body.appendChild(announcer);
        return announcer;
    }

    announce(message) {
        if (this.announcer) {
            this.announcer.textContent = message;
            setTimeout(() => {
                this.announcer.textContent = '';
            }, 1000);
        }
    }

    initPerformance() {
        // Intersection Observer for lazy loading
        if ('IntersectionObserver' in window) {
            const lazyImages = this.utils.$$('img[data-src]');
            
            if (lazyImages.length > 0) {
                const imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    });
                });
                
                lazyImages.forEach(img => imageObserver.observe(img));
            }
        }

        // Prefetch important pages
        const prefetchLinks = this.utils.$$('a[data-prefetch]');
        prefetchLinks.forEach(link => {
            this.utils.on(link, 'mouseenter', () => {
                this.prefetchPage(link.href);
            });
        });
    }

    prefetchPage(url) {
        if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
            return; // Already prefetched
        }
        
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
    }

    initAnalytics() {
        // Privacy-focused analytics
        if (this.siteData.analyticsId && window.gtag) {
            // Track page views
            gtag('config', this.siteData.analyticsId, {
                page_title: document.title,
                page_location: window.location.href,
                content_language: this.currentLanguage
            });

            // Track tool usage
            this.utils.$$('.tool-link').forEach(link => {
                this.utils.on(link, 'click', () => {
                    gtag('event', 'tool_usage', {
                        tool_name: link.textContent.trim(),
                        language: this.currentLanguage
                    });
                });
            });
        }
    }

    // Simple API endpoints for development
    createMockAPI() {
        // Mock API for dictionary lookups
        window.nordumAPI = {
            searchDictionary: (query, filter = 'all') => {
                return Promise.resolve(this.searchDictionary(query, filter));
            },
            getWordsByLetter: (letter) => {
                return Promise.resolve(this.getWordsByLetter(letter));
            },
            spellCheck: (text) => {
                return Promise.resolve(this.spellCheckText(text));
            },
            getDictionaryStats: () => {
                return Promise.resolve({
                    totalEntries: this.dictionaryData?.metadata.entryCount || 0,
                    languages: this.dictionaryData?.metadata.languages || [],
                    lastUpdated: this.dictionaryData?.metadata.generated || new Date().toISOString()
                });
            },
            // Future: Add translation endpoints
            translate: (text, fromLang, toLang) => {
                return Promise.resolve({
                    originalText: text,
                    translatedText: text, // Placeholder
                    fromLanguage: fromLang,
                    toLanguage: toLang,
                    confidence: 0.85
                });
            }
        };
    }

    initDictionaryTool() {
        const searchInput = this.utils.$('#dictionary-search');
        const searchResults = this.utils.$('#search-results');
        const welcomeMessage = this.utils.$('.welcome-message');
        const letterBtns = this.utils.$$('.letter-btn');
        
        if (!searchInput) return; // Not on dictionary page
        
        // Search functionality
        let searchTimeout;
        this.utils.on(searchInput, 'input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim();
                const filter = this.utils.$('input[name="search-filter"]:checked')?.value || 'all';
                
                if (query.length >= 2) {
                    this.performDictionarySearch(query, filter);
                } else {
                    this.showWelcomeMessage();
                }
            }, 300);
        });
        
        // Filter change
        this.utils.$$('input[name="search-filter"]').forEach(filter => {
            this.utils.on(filter, 'change', () => {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    this.performDictionarySearch(query, filter.value);
                }
            });
        });
        
        // Letter navigation
        letterBtns.forEach(btn => {
            this.utils.on(btn, 'click', () => {
                const letter = btn.dataset.letter;
                this.showWordsByLetter(letter);
                
                // Update active letter
                letterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Search button
        const searchBtn = this.utils.$('.search-button');
        if (searchBtn) {
            this.utils.on(searchBtn, 'click', () => {
                const query = searchInput.value.trim();
                const filter = this.utils.$('input[name="search-filter"]:checked')?.value || 'all';
                if (query.length >= 2) {
                    this.performDictionarySearch(query, filter);
                }
            });
        }
        
        // Update dictionary stats on load
        this.updateDictionaryStats();
    }
    
    performDictionarySearch(query, filter) {
        const results = this.searchDictionary(query, filter);
        this.displaySearchResults(results, query);
    }
    
    displaySearchResults(results, query) {
        const searchResults = this.utils.$('#search-results');
        const welcomeMessage = this.utils.$('.welcome-message');
        
        if (!searchResults) return;
        
        welcomeMessage.style.display = 'none';
        searchResults.style.display = 'block';
        
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <h3>No results found for "${query}"</h3>
                    <p>Try searching with a different term or browse by letter.</p>
                </div>
            `;
            return;
        }
        
        const resultsHtml = `
            <div class="results-header">
                <h3>Search Results for "${query}" (${results.length} found)</h3>
            </div>
            <div class="results-list">
                ${results.map(entry => `
                    <div class="word-entry">
                        <div class="word-header">
                            <h4 class="word-nordum">${entry.nordum}</h4>
                            <span class="word-pos">${entry.pos}</span>
                            ${entry.gender ? `<span class="word-gender">${entry.gender}</span>` : ''}
                        </div>
                        <div class="word-definition">
                            <strong>English:</strong> ${entry.english}
                        </div>
                        ${this.renderSourceLanguages(entry.sources)}
                    </div>
                `).join('')}
            </div>
        `;
        
        searchResults.innerHTML = resultsHtml;
    }
    
    showWordsByLetter(letter) {
        const results = this.getWordsByLetter(letter);
        const searchResults = this.utils.$('#search-results');
        const welcomeMessage = this.utils.$('.welcome-message');
        
        if (!searchResults) return;
        
        welcomeMessage.style.display = 'none';
        searchResults.style.display = 'block';
        
        const resultsHtml = `
            <div class="results-header">
                <h3>Words starting with "${letter.toUpperCase()}" (${results.length} found)</h3>
            </div>
            <div class="results-list">
                ${results.map(entry => `
                    <div class="word-entry">
                        <div class="word-header">
                            <h4 class="word-nordum">${entry.nordum}</h4>
                            <span class="word-pos">${entry.pos}</span>
                            ${entry.gender ? `<span class="word-gender">${entry.gender}</span>` : ''}
                        </div>
                        <div class="word-definition">
                            <strong>English:</strong> ${entry.english}
                        </div>
                        ${this.renderSourceLanguages(entry.sources)}
                    </div>
                `).join('')}
            </div>
        `;
        
        searchResults.innerHTML = resultsHtml;
    }
    
    showWelcomeMessage() {
        const searchResults = this.utils.$('#search-results');
        const welcomeMessage = this.utils.$('.welcome-message');
        
        if (searchResults) searchResults.style.display = 'none';
        if (welcomeMessage) welcomeMessage.style.display = 'block';
        
        // Reset active letter
        this.utils.$$('.letter-btn').forEach(btn => btn.classList.remove('active'));
    }
    
    renderSourceLanguages(sources) {
        if (!sources) return '';
        
        const sourcesList = Object.entries(sources)
            .map(([lang, data]) => `<span class="source-word">${lang}: ${data.word}</span>`)
            .join(', ');
            
        return `<div class="word-sources"><strong>Sources:</strong> ${sourcesList}</div>`;
    }
    
    initSpellChecker() {
        const textArea = this.utils.$('#spellcheck-text');
        const suggestionsContent = this.utils.$('#suggestions-content');
        const charCount = this.utils.$('#char-count');
        const wordCount = this.utils.$('#word-count');
        const sentenceCount = this.utils.$('#sentence-count');
        
        if (!textArea) return; // Not on spellcheck page
        
        let checkTimeout;
        this.utils.on(textArea, 'input', (e) => {
            clearTimeout(checkTimeout);
            checkTimeout = setTimeout(() => {
                this.performSpellCheck(e.target.value);
            }, 500);
        });
        
        // Clear button
        const clearBtn = this.utils.$('#clear-text');
        if (clearBtn) {
            this.utils.on(clearBtn, 'click', () => {
                textArea.value = '';
                this.performSpellCheck('');
            });
        }
        
        // Paste button
        const pasteBtn = this.utils.$('#paste-text');
        if (pasteBtn) {
            this.utils.on(pasteBtn, 'click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    textArea.value = text;
                    this.performSpellCheck(text);
                } catch (err) {
                    console.error('Failed to paste:', err);
                }
            });
        }
        
        // Sample text buttons
        this.utils.$$('.sample-btn').forEach(btn => {
            this.utils.on(btn, 'click', () => {
                const sample = this.getSampleText(btn.dataset.sample);
                textArea.value = sample;
                this.performSpellCheck(sample);
            });
        });
        
        // Initialize with empty check
        this.performSpellCheck('');
    }
    
    performSpellCheck(text) {
        const result = this.spellCheckText(text);
        this.updateSpellCheckDisplay(result);
        this.updateTextStats(result.stats);
    }
    
    updateSpellCheckDisplay(result) {
        const suggestionsContent = this.utils.$('#suggestions-content');
        if (!suggestionsContent) return;
        
        if (result.errors.length === 0) {
            suggestionsContent.innerHTML = `
                <div class="no-issues">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <p>No issues found!</p>
                    <small>Your text looks good.</small>
                </div>
            `;
        } else {
            const errorsHtml = result.errors.map(error => `
                <div class="spell-error">
                    <div class="error-word">"${error.word}"</div>
                    <div class="error-suggestions">
                        ${error.suggestions.length > 0 
                            ? `Suggestions: ${error.suggestions.join(', ')}` 
                            : 'No suggestions available'}
                    </div>
                </div>
            `).join('');
            
            suggestionsContent.innerHTML = `
                <div class="spell-errors">
                    <h4>${result.errors.length} issues found</h4>
                    ${errorsHtml}
                </div>
            `;
        }
    }
    
    updateTextStats(stats) {
        const charCount = this.utils.$('#char-count');
        const wordCount = this.utils.$('#word-count');
        const sentenceCount = this.utils.$('#sentence-count');
        
        if (charCount) charCount.textContent = stats.characters;
        if (wordCount) wordCount.textContent = stats.words;
        if (sentenceCount) sentenceCount.textContent = stats.sentences;
    }
    
    getSampleText(type) {
        const samples = {
            correct: "Jag arbetar i en stor by. Min vänner kommer från olika länder. Vi talar olika språk, men vi förstår varandra bra.",
            errors: "Jeg arbeder i en stor bby. Mine vener komme fra forskelige lander. Ve talar olika spreg, men we förstar varandra godt.",
            mixed: "I work in a stor by. My friends kommer from different countries. We speak olika språk but understand each other godt."
        };
        
        return samples[type] || samples.correct;
    }
    
    updateDictionaryStats() {
        // Update stats in dictionary tool
        const totalEntriesStat = this.utils.$('.dictionary-stats .stat-number');
        const coverageStat = this.utils.$$('.dictionary-stats .stat-number')[2];
        
        if (this.dictionaryData && totalEntriesStat) {
            totalEntriesStat.textContent = `${this.dictionaryData.metadata.entryCount}+`;
        }
        
        // Show real-time search results count
        const searchInput = this.utils.$('#dictionary-search');
        if (searchInput && this.dictionaryData) {
            // Update placeholder with total count
            const originalPlaceholder = searchInput.getAttribute('placeholder');
            if (!originalPlaceholder.includes('entries')) {
                searchInput.setAttribute('placeholder', 
                    `${originalPlaceholder} (${this.dictionaryData.metadata.entryCount} entries available)`);
            }
        }
        
        // Add live filtering demonstration
        this.demonstrateGrowingWordlist();
    }
    
    demonstrateGrowingWordlist() {
        // Show different word counts by category to demonstrate scalability
        if (!this.dictionaryData) return;
        
        const entries = Object.values(this.dictionaryData.entries);
        const stats = {
            nouns: entries.filter(e => e.pos === 'noun').length,
            verbs: entries.filter(e => e.pos === 'verb').length,
            adjectives: entries.filter(e => e.pos === 'adjective').length,
            total: entries.length
        };
        
        // Update the featured words section with dynamic stats
        const wordSamples = this.utils.$('.word-samples');
        if (wordSamples) {
            const dynamicInfo = document.createElement('div');
            dynamicInfo.className = 'dictionary-info';
            dynamicInfo.innerHTML = `
                <div class="info-stats">
                    <h4>Dictionary Coverage:</h4>
                    <div class="stat-grid">
                        <div class="stat">
                            <span class="number">${stats.nouns}</span>
                            <span class="label">Nouns</span>
                        </div>
                        <div class="stat">
                            <span class="number">${stats.verbs}</span>
                            <span class="label">Verbs</span>
                        </div>
                        <div class="stat">
                            <span class="number">${stats.adjectives}</span>
                            <span class="label">Adjectives</span>
                        </div>
                        <div class="stat">
                            <span class="number">${stats.total}</span>
                            <span class="label">Total</span>
                        </div>
                    </div>
                    <p class="growth-note">
                        🌱 Dictionary grows automatically as new Nordic language data is added
                    </p>
                </div>
            `;
            
            // Insert after word samples if it doesn't already exist
            if (!wordSamples.nextElementSibling?.classList.contains('dictionary-info')) {
                wordSamples.parentNode.insertBefore(dynamicInfo, wordSamples.nextSibling);
            }
        }
    }

    initPageComponents() {
        // Initialize components based on page content
        if (this.utils.$('.hero')) {
            this.initHeroAnimations();
        }
        
        if (this.utils.$('.community-stats')) {
            this.initStatsCounter();
        }
        
        if (this.utils.$('.newsletter-form')) {
            this.initNewsletterForm();
        }
        
        if (this.utils.$('.cookie-notice')) {
            this.initCookieNotice();
        }
    }

    initHeroAnimations() {
        const heroElements = this.utils.$$('.hero .fade-in');
        
        if ('IntersectionObserver' in window && heroElements.length > 0) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            }, { threshold: 0.1 });
            
            heroElements.forEach(el => observer.observe(el));
        }
    }

    initStatsCounter() {
        const stats = this.utils.$$('.stat-number[data-count]');
        
        if (stats.length > 0 && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                        this.animateCounter(entry.target);
                        entry.target.classList.add('counted');
                    }
                });
            }, { threshold: 0.5 });
            
            stats.forEach(stat => observer.observe(stat));
        }
    }

    animateCounter(element) {
        const target = parseInt(element.dataset.count);
        const duration = 2000;
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(progress * target);
            
            if (element.textContent.includes('%')) {
                element.textContent = current + '%';
            } else {
                element.textContent = current.toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }

    initNewsletterForm() {
        const form = this.utils.$('#newsletter-form');
        
        if (form) {
            this.utils.on(form, 'submit', async (e) => {
                e.preventDefault();
                
                const email = form.querySelector('input[name="email"]').value;
                const button = form.querySelector('button[type="submit"]');
                
                if (!this.isValidEmail(email)) {
                    this.showFormMessage(form, 'Please enter a valid email address.', 'error');
                    return;
                }
                
                button.disabled = true;
                button.textContent = 'Subscribing...';
                
                try {
                    // Simulate newsletter subscription
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    this.showFormMessage(form, 'Thank you for subscribing!', 'success');
                    form.reset();
                } catch (error) {
                    this.showFormMessage(form, 'Subscription failed. Please try again.', 'error');
                } finally {
                    button.disabled = false;
                    button.textContent = this.translations.newsletter?.subscribe || 'Subscribe';
                }
            });
        }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showFormMessage(form, message, type) {
        let messageEl = form.querySelector('.form-message');
        
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'form-message';
            form.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.className = `form-message ${type}`;
        
        this.announce(message);
        
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    initCookieNotice() {
        const cookieNotice = this.utils.$('#cookie-notice');
        const acceptBtn = this.utils.$('#cookie-accept');
        const declineBtn = this.utils.$('#cookie-decline');
        
        if (cookieNotice && !this.utils.store.get('cookies_accepted')) {
            cookieNotice.classList.remove('hidden');
            
            if (acceptBtn) {
                this.utils.on(acceptBtn, 'click', () => {
                    this.utils.store.set('cookies_accepted', true);
                    cookieNotice.classList.add('hidden');
                    this.initAnalytics();
                });
            }
            
            if (declineBtn) {
                this.utils.on(declineBtn, 'click', () => {
                    this.utils.store.set('cookies_accepted', false);
                    cookieNotice.classList.add('hidden');
                });
            }
        }
    }

    // Public API methods
    t(key) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) break;
        }
        
        return value || key;
    }

    showLoading() {
        const loader = this.utils.$('#loading-indicator');
        if (loader) {
            loader.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loader = this.utils.$('#loading-indicator');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    initTranslator() {
            const inputText = this.utils.$('#input-text');
            const outputText = this.utils.$('#output-text');
            const fromLang = this.utils.$('#from-lang');
            const toLang = this.utils.$('#to-lang');
            const swapBtn = this.utils.$('#swap-btn');
            const clearBtn = this.utils.$('#clear-input');
            const pasteBtn = this.utils.$('#paste-input');
            const copyBtn = this.utils.$('#copy-output');
            const speakBtn = this.utils.$('#speak-output');
        
            if (!inputText) return; // Not on translator page
        
            let translateTimeout;

            // Translation function
            this.utils.on(inputText, 'input', (e) => {
                clearTimeout(translateTimeout);
                const text = e.target.value;
                this.updateCharCount(text, 'input-char-count');
            
                if (text.trim()) {
                    translateTimeout = setTimeout(() => {
                        this.performTranslation(text, fromLang.value, toLang.value);
                    }, 500);
                } else {
                    this.clearOutput();
                }
            });

            // Language change handlers
            this.utils.on(fromLang, 'change', () => {
                const text = inputText.value.trim();
                if (text) {
                    this.performTranslation(text, fromLang.value, toLang.value);
                }
            });

            this.utils.on(toLang, 'change', () => {
                const text = inputText.value.trim();
                if (text) {
                    this.performTranslation(text, fromLang.value, toLang.value);
                }
            });

            // Swap languages
            this.utils.on(swapBtn, 'click', () => {
                if (fromLang.value === 'auto') return;
            
                const fromVal = fromLang.value;
                const toVal = toLang.value;
                const inputVal = inputText.value;
                const outputVal = outputText.textContent;
            
                fromLang.value = toVal;
                toLang.value = fromVal;
                inputText.value = outputVal;
                outputText.textContent = inputVal;
            
                this.updateCharCount(outputVal, 'input-char-count');
                this.updateCharCount(inputVal, 'output-char-count');
            });

            // Clear input
            this.utils.on(clearBtn, 'click', () => {
                inputText.value = '';
                this.clearOutput();
                this.updateCharCount('', 'input-char-count');
            });

            // Paste text
            this.utils.on(pasteBtn, 'click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    inputText.value = text;
                    this.updateCharCount(text, 'input-char-count');
                    if (text.trim()) {
                        this.performTranslation(text, fromLang.value, toLang.value);
                    }
                } catch (err) {
                    console.error('Failed to paste:', err);
                }
            });

            // Copy output
            this.utils.on(copyBtn, 'click', async () => {
                const text = outputText.textContent;
                if (text && text !== this.t('translator.outputPlaceholder')) {
                    try {
                        await navigator.clipboard.writeText(text);
                        this.showCopyFeedback(copyBtn);
                    } catch (err) {
                        console.error('Failed to copy:', err);
                    }
                }
            });

            // Text-to-speech
            this.utils.on(speakBtn, 'click', () => {
                const text = outputText.textContent;
                if (text && text !== this.t('translator.outputPlaceholder') && 'speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = this.getLanguageCode(toLang.value);
                    speechSynthesis.speak(utterance);
                }
            });

            // Quick phrase buttons
            this.utils.$$('.phrase-btn').forEach(btn => {
                this.utils.on(btn, 'click', () => {
                    const phrase = this.getQuickPhrase(btn.dataset.phrase);
                    inputText.value = phrase;
                    this.updateCharCount(phrase, 'input-char-count');
                    this.performTranslation(phrase, fromLang.value, toLang.value);
                });
            });

            // Clear history
            const clearHistoryBtn = this.utils.$('#clear-history');
            if (clearHistoryBtn) {
                this.utils.on(clearHistoryBtn, 'click', () => {
                    localStorage.removeItem('translator_history');
                    this.updateTranslationHistory();
                });
            }

            // Load translation history
            this.updateTranslationHistory();
        }

        performTranslation(text, fromLang, toLang) {
            // Auto-detect language if needed
            if (fromLang === 'auto') {
                fromLang = this.detectLanguage(text);
                this.showDetectedLanguage(fromLang);
            }

            // Simulate translation (in a real app, this would call a translation service)
            const translation = this.translateText(text, fromLang, toLang);
            const confidence = this.calculateConfidence(text, fromLang, toLang);

            this.displayTranslation(translation, confidence);
            this.updateCharCount(translation, 'output-char-count');
            this.addToHistory(text, translation, fromLang, toLang);
        }

        translateText(text, fromLang, toLang) {
            // Mock translation logic - in a real implementation, this would use a translation API
            const translations = {
                'hello': {
                    'nordum': 'hej',
                    'norwegian': 'hei',
                    'danish': 'hej',
                    'swedish': 'hej'
                },
                'thank you': {
                    'nordum': 'takk',
                    'norwegian': 'takk',
                    'danish': 'tak',
                    'swedish': 'tack'
                },
                'house': {
                    'nordum': 'hus',
                    'norwegian': 'hus',
                    'danish': 'hus',
                    'swedish': 'hus'
                }
            };

            const lowerText = text.toLowerCase().trim();
            if (translations[lowerText] && translations[lowerText][toLang]) {
                return translations[lowerText][toLang];
            }

            // Simple word-by-word mock translation
            return text.split(' ').map(word => {
                const lower = word.toLowerCase();
                if (translations[lower] && translations[lower][toLang]) {
                    return translations[lower][toLang];
                }
                return word; // Return original if no translation found
            }).join(' ');
        }

        detectLanguage(text) {
            // Mock language detection - in reality, this would use a language detection service
            const norwegianWords = ['jeg', 'du', 'han', 'hun', 'vi', 'dere', 'de', 'hei', 'takk'];
            const danishWords = ['jeg', 'du', 'han', 'hun', 'vi', 'I', 'de', 'hej', 'tak'];
            const swedishWords = ['jag', 'du', 'han', 'hon', 'vi', 'ni', 'de', 'hej', 'tack'];
        
            const words = text.toLowerCase().split(/\s+/);
        
            let norScore = 0;
            let danScore = 0;
            let sweScore = 0;
        
            words.forEach(word => {
                if (norwegianWords.includes(word)) norScore++;
                if (danishWords.includes(word)) danScore++;
                if (swedishWords.includes(word)) sweScore++;
            });
        
            if (sweScore > norScore && sweScore > danScore) return 'swedish';
            if (danScore > norScore) return 'danish';
            if (norScore > 0) return 'norwegian';
        
            return 'nordum'; // Default
        }

        calculateConfidence(text, fromLang, toLang) {
            // Mock confidence calculation
            return Math.floor(85 + Math.random() * 10); // 85-95%
        }

        displayTranslation(translation, confidence) {
            const outputText = this.utils.$('#output-text');
            const confidenceEl = this.utils.$('#confidence-value');
            const confidenceContainer = this.utils.$('#confidence');
        
            if (outputText) {
                outputText.textContent = translation;
                outputText.classList.remove('output-placeholder');
            }
        
            if (confidenceEl && confidenceContainer) {
                confidenceEl.textContent = confidence;
                confidenceContainer.style.display = 'block';
            }
        }

        showDetectedLanguage(language) {
            const detectedEl = this.utils.$('#detected-lang');
            const detectedNameEl = this.utils.$('#detected-lang-name');
        
            if (detectedEl && detectedNameEl) {
                detectedNameEl.textContent = this.getLanguageName(language);
                detectedEl.style.display = 'block';
            }
        }

        clearOutput() {
            const outputText = this.utils.$('#output-text');
            const confidenceContainer = this.utils.$('#confidence');
            const detectedEl = this.utils.$('#detected-lang');
        
            if (outputText) {
                outputText.innerHTML = '<span class="output-placeholder">' + this.t('translator.outputPlaceholder') + '</span>';
            }
        
            if (confidenceContainer) {
                confidenceContainer.style.display = 'none';
            }
        
            if (detectedEl) {
                detectedEl.style.display = 'none';
            }
        
            this.updateCharCount('', 'output-char-count');
        }

        updateCharCount(text, elementId) {
            const countEl = this.utils.$('#' + elementId);
            if (countEl) {
                countEl.textContent = text.length;
            }
        }

        getQuickPhrase(phraseKey) {
            const phrases = {
                'hello': 'Hello, how are you?',
                'thanks': 'Thank you for the help',
                'understand': "I don't understand",
                'help': 'Can you help me?',
                'cost': 'How much does it cost?',
                'goodbye': 'Take care / Goodbye'
            };
            return phrases[phraseKey] || '';
        }

        getLanguageCode(language) {
            const codes = {
                'nordum': 'no',
                'norwegian': 'no',
                'danish': 'da',
                'swedish': 'sv'
            };
            return codes[language] || 'en';
        }

        getLanguageName(language) {
            const names = {
                'nordum': this.t('translator.languages.nordum'),
                'norwegian': this.t('translator.languages.norwegian'),
                'danish': this.t('translator.languages.danish'),
                'swedish': this.t('translator.languages.swedish')
            };
            return names[language] || language;
        }

        showCopyFeedback(button) {
            const originalText = button.textContent;
            button.textContent = '✓';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 1000);
        }

        addToHistory(input, output, fromLang, toLang) {
            let history = JSON.parse(localStorage.getItem('translator_history') || '[]');
            const entry = {
                input,
                output,
                fromLang,
                toLang,
                timestamp: Date.now()
            };
        
            history.unshift(entry);
            history = history.slice(0, 10); // Keep only last 10 entries
        
            localStorage.setItem('translator_history', JSON.stringify(history));
            this.updateTranslationHistory();
        }

        updateTranslationHistory() {
            const historyContainer = this.utils.$('#translation-history');
            const historyList = this.utils.$('#history-list');
        
            if (!historyList) return;
        
            const history = JSON.parse(localStorage.getItem('translator_history') || '[]');
        
            if (history.length === 0) {
                historyList.innerHTML = '<p class="history-empty">' + this.t('translator.history.empty') + '</p>';
                if (historyContainer) historyContainer.style.display = 'none';
                return;
            }
        
            if (historyContainer) historyContainer.style.display = 'block';
        
            historyList.innerHTML = history.map(entry => `
                <div class="history-entry">
                    <div class="history-input">${entry.input}</div>
                    <div class="history-arrow">→</div>
                    <div class="history-output">${entry.output}</div>
                    <div class="history-meta">${this.getLanguageName(entry.fromLang)} → ${this.getLanguageName(entry.toLang)}</div>
                </div>
            `).join('');
        }

        initEditor() {
            const textarea = this.utils.$('#editor-textarea');
            const lineNumbers = this.utils.$('#line-numbers');
            const sidebar = this.utils.$('#editor-sidebar');
        
            if (!textarea) return; // Not on editor page
        
            // Editor state
            this.editorState = {
                content: '',
                history: [''],
                historyIndex: 0,
                fontSize: 14,
                spellCheckEnabled: true,
                isModified: false,
                cursorPosition: { line: 1, column: 1 }
            };

            // Text input handling
            this.utils.on(textarea, 'input', (e) => {
                this.updateEditorContent(e.target.value);
                this.updateLineNumbers();
                this.updateEditorStats();
                this.updateCursorPosition();
                this.performEditorSpellCheck(e.target.value);
            });

            // Cursor position tracking
            this.utils.on(textarea, 'selectionchange', () => {
                this.updateCursorPosition();
            });

            this.utils.on(textarea, 'click', () => {
                this.updateCursorPosition();
            });

            this.utils.on(textarea, 'keyup', () => {
                this.updateCursorPosition();
            });

            // Toolbar buttons
            this.utils.on(this.utils.$('#new-doc'), 'click', () => {
                if (this.editorState.isModified) {
                    if (confirm('You have unsaved changes. Create a new document anyway?')) {
                        this.newDocument();
                    }
                } else {
                    this.newDocument();
                }
            });

            this.utils.on(this.utils.$('#save-doc'), 'click', () => {
                this.saveDocument();
            });

            this.utils.on(this.utils.$('#undo-btn'), 'click', () => {
                this.undoEdit();
            });

            this.utils.on(this.utils.$('#redo-btn'), 'click', () => {
                this.redoEdit();
            });

            // Format buttons
            this.utils.$$('.format-btn').forEach(btn => {
                this.utils.on(btn, 'click', () => {
                    this.formatText(btn.dataset.command);
                });
            });

            // Font size
            this.utils.on(this.utils.$('#font-size'), 'change', (e) => {
                this.changeFontSize(parseInt(e.target.value));
            });

            // Spell check toggle
            this.utils.on(this.utils.$('#spell-check-toggle'), 'click', () => {
                this.toggleSpellCheck();
            });

            // Word count toggle
            this.utils.on(this.utils.$('#word-count-btn'), 'click', () => {
                this.toggleSidebar();
            });

            // Fullscreen toggle
            this.utils.on(this.utils.$('#fullscreen-btn'), 'click', () => {
                this.toggleFullscreen();
            });

            // Keyboard shortcuts
            this.utils.on(textarea, 'keydown', (e) => {
                this.handleKeyboardShortcuts(e);
            });

            // Initialize
            this.updateLineNumbers();
            this.updateEditorStats();
            this.updateCursorPosition();
        }

        updateEditorContent(content) {
            const oldContent = this.editorState.content;
            this.editorState.content = content;
        
            // Add to history if content changed significantly
            if (Math.abs(content.length - oldContent.length) > 5 || 
                content !== this.editorState.history[this.editorState.historyIndex]) {
                this.addToEditorHistory(content);
            }
        
            this.editorState.isModified = true;
            this.updateSaveStatus('modified');
        }

        addToEditorHistory(content) {
            // Remove any future history
            this.editorState.history = this.editorState.history.slice(0, this.editorState.historyIndex + 1);
        
            // Add new state
            this.editorState.history.push(content);
            this.editorState.historyIndex = this.editorState.history.length - 1;
        
            // Limit history size
            if (this.editorState.history.length > 50) {
                this.editorState.history.shift();
                this.editorState.historyIndex--;
            }
        }

        updateLineNumbers() {
            const textarea = this.utils.$('#editor-textarea');
            const lineNumbers = this.utils.$('#line-numbers');
        
            if (!textarea || !lineNumbers) return;
        
            const lines = textarea.value.split('\n').length;
            const numbers = [];
        
            for (let i = 1; i <= lines; i++) {
                numbers.push(i);
            }
        
            lineNumbers.textContent = numbers.join('\n');
        
            // Update line count in stats
            const lineCountEl = this.utils.$('#line-count');
            if (lineCountEl) {
                lineCountEl.textContent = lines;
            }
        }

        updateEditorStats() {
            const content = this.editorState.content;
        
            // Word count
            const words = content.trim() ? content.trim().split(/\s+/).length : 0;
            this.updateStatElement('word-count', words);
            this.updateStatElement('status-word-count', words);
        
            // Character counts
            const chars = content.length;
            const charsNoSpaces = content.replace(/\s/g, '').length;
            this.updateStatElement('char-count', chars);
            this.updateStatElement('char-count-no-spaces', charsNoSpaces);
            this.updateStatElement('status-char-count', chars);
        
            // Paragraph count
            const paragraphs = content.trim() ? content.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
            this.updateStatElement('paragraph-count', paragraphs);
        
            // Reading time (average 200 words per minute)
            const readingTime = Math.ceil(words / 200);
            const readingTimeEl = this.utils.$('#reading-time');
            if (readingTimeEl) {
                readingTimeEl.textContent = `${readingTime} ${this.t('editor.statistics.minutes')}`;
            }
        }

        updateStatElement(id, value) {
            const el = this.utils.$('#' + id);
            if (el) {
                el.textContent = value;
            }
        }

        updateCursorPosition() {
            const textarea = this.utils.$('#editor-textarea');
            if (!textarea) return;
        
            const start = textarea.selectionStart;
            const textBeforeCursor = textarea.value.substring(0, start);
            const line = (textBeforeCursor.match(/\n/g) || []).length + 1;
            const column = start - textBeforeCursor.lastIndexOf('\n');
        
            this.editorState.cursorPosition = { line, column };
        
            this.updateStatElement('current-line', line);
            this.updateStatElement('current-column', column);
        }

        newDocument() {
            const textarea = this.utils.$('#editor-textarea');
            if (textarea) {
                textarea.value = '';
                this.editorState.content = '';
                this.editorState.history = [''];
                this.editorState.historyIndex = 0;
                this.editorState.isModified = false;
            
                this.updateLineNumbers();
                this.updateEditorStats();
                this.updateCursorPosition();
                this.updateSaveStatus('saved');
                this.clearSpellCheckResults();
            }
        }

        saveDocument() {
            // Mock save operation - in a real app, this would save to a server or local file
            const content = this.editorState.content;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nordum-document.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        
            this.editorState.isModified = false;
            this.updateSaveStatus('saved');
        }

        undoEdit() {
            if (this.editorState.historyIndex > 0) {
                this.editorState.historyIndex--;
                const content = this.editorState.history[this.editorState.historyIndex];
                this.restoreEditorContent(content);
            }
        }

        redoEdit() {
            if (this.editorState.historyIndex < this.editorState.history.length - 1) {
                this.editorState.historyIndex++;
                const content = this.editorState.history[this.editorState.historyIndex];
                this.restoreEditorContent(content);
            }
        }

        restoreEditorContent(content) {
            const textarea = this.utils.$('#editor-textarea');
            if (textarea) {
                textarea.value = content;
                this.editorState.content = content;
                this.updateLineNumbers();
                this.updateEditorStats();
                this.updateCursorPosition();
                this.performEditorSpellCheck(content);
            }
        }

        formatText(command) {
            const textarea = this.utils.$('#editor-textarea');
            if (!textarea) return;
        
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
        
            if (!selectedText) return;
        
            let formattedText = selectedText;
        
            switch (command) {
                case 'bold':
                    formattedText = `**${selectedText}**`;
                    break;
                case 'italic':
                    formattedText = `*${selectedText}*`;
                    break;
                case 'underline':
                    formattedText = `__${selectedText}__`;
                    break;
            }
        
            const newContent = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
            textarea.value = newContent;
            this.updateEditorContent(newContent);
        
            // Restore selection
            const newEnd = start + formattedText.length;
            textarea.setSelectionRange(start, newEnd);
            textarea.focus();
        }

        changeFontSize(size) {
            const textarea = this.utils.$('#editor-textarea');
            if (textarea) {
                textarea.style.fontSize = size + 'px';
                this.editorState.fontSize = size;
            }
        }

        toggleSpellCheck() {
            const textarea = this.utils.$('#editor-textarea');
            const toggleBtn = this.utils.$('#spell-check-toggle');
        
            if (textarea && toggleBtn) {
                this.editorState.spellCheckEnabled = !this.editorState.spellCheckEnabled;
                textarea.spellcheck = this.editorState.spellCheckEnabled;
            
                if (this.editorState.spellCheckEnabled) {
                    toggleBtn.classList.add('active');
                    this.performEditorSpellCheck(textarea.value);
                } else {
                    toggleBtn.classList.remove('active');
                    this.clearSpellCheckResults();
                }
            }
        }

        toggleSidebar() {
            const sidebar = this.utils.$('#editor-sidebar');
            const btn = this.utils.$('#word-count-btn');
        
            if (sidebar && btn) {
                const isVisible = sidebar.style.display !== 'none';
                sidebar.style.display = isVisible ? 'none' : 'block';
                btn.classList.toggle('active', !isVisible);
            }
        }

        toggleFullscreen() {
            const editorTool = this.utils.$('.editor-tool');
            const btn = this.utils.$('#fullscreen-btn');
        
            if (editorTool && btn) {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                    btn.classList.remove('active');
                } else {
                    editorTool.requestFullscreen();
                    btn.classList.add('active');
                }
            }
        }

        handleKeyboardShortcuts(e) {
            // Ctrl/Cmd + S = Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveDocument();
            }
        
            // Ctrl/Cmd + Z = Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undoEdit();
            }
        
            // Ctrl/Cmd + Shift + Z = Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                this.redoEdit();
            }
        
            // Tab = Insert 4 spaces
            if (e.key === 'Tab') {
                e.preventDefault();
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
            
                textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            
                this.updateEditorContent(textarea.value);
            }
        }

        performEditorSpellCheck(text) {
            if (!this.editorState.spellCheckEnabled) return;
        
            const result = this.spellCheckText(text);
            this.updateEditorSpellCheckDisplay(result);
        }

        updateEditorSpellCheckDisplay(result) {
            const spellCheckResults = this.utils.$('#spell-check-results');
            if (!spellCheckResults) return;
        
            if (result.errors.length === 0) {
                spellCheckResults.innerHTML = '<p class="no-issues">' + this.t('spellcheck.suggestions.noIssues') + '</p>';
                return;
            }
        
            const errorsList = result.errors.map(error => `
                <div class="spell-error">
                    <span class="error-word">${error.word}</span>
                    <div class="error-suggestions">
                        ${error.suggestions.map(suggestion => 
                            `<button class="suggestion-btn" data-word="${error.word}" data-suggestion="${suggestion}">${suggestion}</button>`
                        ).join('')}
                    </div>
                </div>
            `).join('');
        
            spellCheckResults.innerHTML = errorsList;
        
            // Add click handlers for suggestions
            spellCheckResults.querySelectorAll('.suggestion-btn').forEach(btn => {
                this.utils.on(btn, 'click', () => {
                    this.replaceWord(btn.dataset.word, btn.dataset.suggestion);
                });
            });
        }

        replaceWord(oldWord, newWord) {
            const textarea = this.utils.$('#editor-textarea');
            if (!textarea) return;
        
            const content = textarea.value;
            const newContent = content.replace(new RegExp('\\b' + oldWord + '\\b', 'g'), newWord);
            textarea.value = newContent;
            this.updateEditorContent(newContent);
            this.performEditorSpellCheck(newContent);
        }

        clearSpellCheckResults() {
            const spellCheckResults = this.utils.$('#spell-check-results');
            if (spellCheckResults) {
                spellCheckResults.innerHTML = '<p class="no-issues">' + this.t('spellcheck.suggestions.noIssues') + '</p>';
            }
        }

        updateSaveStatus(status) {
            const saveStatusEl = this.utils.$('#save-status');
            if (saveStatusEl) {
                saveStatusEl.textContent = this.t(`editor.status.${status}`);
                saveStatusEl.className = 'status-item save-status ' + status;
            }
        }
    }

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.nordumApp = new NordumApp();
    });
} else {
    window.nordumApp = new NordumApp();
}

// Export for use by other modules
window.NordumApp = NordumApp;