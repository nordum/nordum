# Nordum - Pan-Scandinavian Language Platform

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Build Status](https://github.com/nordum/nordum/actions/workflows/deploy.yml/badge.svg)](https://github.com/nordum/nordum/actions)
[![Website](https://img.shields.io/badge/Website-nordum.org-blue.svg)](https://nordum.org)

**Nordum** is a constructed pan-Scandinavian written language designed to maximize mutual intelligibility between Norwegian (Bokmål), Danish, and Swedish while maintaining systematic regularity and practical modern usage.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/nordum/nordum.git
cd nordum
npm install

# Setup fast caching (one-time, 5-10 minutes)
npm run cache:setup

# Import dictionary data (now 10-20x faster!)
npm run import:all --limit=1000

# Build dictionary with Nordum rules
npm run build:dictionary

# Parse language specification for web
npm run build:specification

# Build website
npm run build

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the platform in action.

## Language Overview

Nordum creates a balanced pan-Scandinavian written standard through:

- **Balanced selection** from Norwegian, Danish, and Swedish
- **English loanword preservation** for technical terms
- **Systematic morphology** with distinctive grammatical endings
- **Alternative spellings** supporting regional pronunciation variants
- **Regular number system** eliminating complexity

For complete language documentation, see [NORDUM_LANGUAGE_SPECIFICATION.md](NORDUM_LANGUAGE_SPECIFICATION.md) and the interactive web version at `/rules/language-specification/`.

## Single Source Documentation System ✅

**Key Innovation**: The language specification is maintained in **one markdown file** and automatically published to the website with professional formatting.

### How It Works
```
NORDUM_LANGUAGE_SPECIFICATION.md (source)
        ↓
scripts/parse-specification.js (parser)
        ↓  
data/specification.json (structured data)
        ↓
src/templates/rules/language-specification.hbs (template)
        ↓
build/rules/language-specification.html (final output)
```

### Making Changes to Language Rules
1. **Edit the source**: `nano NORDUM_LANGUAGE_SPECIFICATION.md`
2. **Build and test**: `npm run build`
3. **View results**: Check `/rules/language-specification/` in browser

The system automatically:
- ✅ Generates table of contents from markdown headers
- ✅ Creates responsive web pages in all 6 languages
- ✅ Maintains professional formatting and typography
- ✅ Provides anchor links for all sections
- ✅ Ensures consistency across all platforms

## Technical Architecture

### Build System

```bash
npm run dev         # Development server with live reload
npm run build       # Production build
npm run test        # Run linguistic validation tests
npm run deploy      # Deploy to production
```

### Project Structure

```
nordum/
├── src/
│   ├── templates/          # Handlebars templates
│   │   ├── partials/       # Reusable components
│   │   ├── tools/          # Interactive tools
│   │   └── rules/          # Language documentation pages
│   ├── i18n/              # 6-language internationalization
│   ├── styles/            # SCSS stylesheets
│   └── js/                # Frontend JavaScript
├── scripts/
│   ├── build-dictionary.js    # Dictionary generation engine
│   ├── parse-specification.js # Markdown to web parser
│   ├── import-dictionaries.js # Multi-source import system
│   ├── importers/             # Language-specific importers
│   └── test-nordum-rules.js   # Linguistic validation
├── data/
│   ├── dictionary/sources/    # Source CSV files
│   ├── specification.json    # Generated specification data
│   └── site.json             # Configuration
├── NORDUM_LANGUAGE_SPECIFICATION.md  # 📝 PRIMARY SOURCE
└── build/                    # Generated static site
```

### Dictionary Generation System

The core engine that creates Nordum from source languages:

```bash
# FIRST TIME: Setup caching for 10-20x faster imports
npm run cache:setup              # One-time setup (5-10 minutes)
npm run cache:stats              # Check cache performance

# Import from multiple sources (now lightning fast!)
npm run import:frequency         # Import frequency data first
npm run import:norwegian --limit=10000
npm run import:danish --limit=10000  
npm run import:swedish --limit=10000

# Or import all at once
npm run import:all --parallel --limit=10000

# Generate Nordum dictionary
npm run build:dictionary

# Parse language specification
npm run build:specification

# Validate linguistic rules
node scripts/test-nordum-rules.js
```

**Dictionary Sources**

The project ships with a curated core vocabulary (`data/dictionary/sources/`). These CSV files are the source of truth for the web dictionary and tools. To regenerate the web dictionary after editing them:

```bash
npm run build:dictionary
```

**Selection Algorithm:**
1. Load cognates from Norwegian, Danish, Swedish
2. Apply English loanword preservation
3. Transform question words (hv→v pattern)
4. Apply Norwegian number system
5. Use systematic morphological endings
6. Generate alternative spellings
7. Score for pan-Scandinavian intelligibility
8. Export in multiple formats

### Language Specification System

**Single Source Architecture:**
- **Primary Source**: `NORDUM_LANGUAGE_SPECIFICATION.md` (776+ lines)
- **Build Integration**: Automatic parsing and web publishing
- **Multi-language Output**: Available in all 6 supported languages
- **Professional Presentation**: Auto-generated TOC, responsive design

**Build Commands:**
```bash
# Development workflow
npm run dev                    # Watch all files including specification

# Manual building
npm run build:specification    # Parse markdown to JSON
npm run build:templates       # Generate web pages from data
npm run build                 # Build everything

# Watch specific components
npm run watch:specification   # Watch specification file changes
```

**File Structure Requirements:**
```markdown
# Nordum Language Specification

## 1. Introduction
Content here...

### 1.1 Core Philosophy
Subsection content...

## 2. Design Principles
More content...
```

- Use `## Section Title` for main sections (creates navigation)
- Use `### Subsection Title` for subsections (included in TOC)
- Keep consistent numbering for professional appearance
- Section titles are auto-converted to URL anchors

### Web Platform Features

**Modern Stack:**
- **Templates**: Handlebars with partials
- **Styling**: SCSS with CSS custom properties  
- **JavaScript**: ES6+ with webpack
- **i18n**: 6 languages (EN, DA, NB, NN, SV, Nordum)
- **Build**: Node.js static site generation

**Interactive Tools:**
- **Dictionary Browser** - Advanced search with etymology
- **Spell Checker** - Morphological analysis
- **Text Editor** - Integrated writing environment
- **Translation Tools** - Bidirectional conversion

### Internationalization & Translation

The platform supports 6 languages using GNU gettext PO/MO format:
- English (`en`) - Base language
- Danish (`da`) - Dansk  
- Norwegian Bokmål (`nb`) - Norsk (Bokmål)
- Norwegian Nynorsk (`nn`) - Norsk (Nynorsk)
- Swedish (`sv`) - Svenska
- Nordum (`nordum`) - Nordum

**Web Output URLs:**
- `nordum.org/` - English
- `nordum.org/da/` - Danish
- `nordum.org/sv/` - Swedish

#### Translation Workflow

Nordum uses standard PO/MO files for translations with professional tooling support:

**File Structure:**
```
src/
├── i18n/           # PO files (primary translation source)
│   ├── en.po       # English translations
│   ├── da.po       # Danish translations
│   ├── nb.po       # Norwegian Bokmål translations
│   ├── nn.po       # Norwegian Nynorsk translations
│   ├── sv.po       # Swedish translations
│   ├── nordum.po   # Nordum language translations
│   └── messages.pot # Translation template
└── templates/      # Handlebars templates with {{t 'key'}} calls
```

**Translation Management:**
```bash
# Extract new keys from templates and update POT file
npm run translations:convert

# Update language PO files from template
npm run translations:update

# Check translation coverage and missing keys
npm run translations:check

# Build compiled MO files for production
npm run build:i18n
```

**Translation Keys:**
Keys follow hierarchical dot notation: `category.subcategory.key`
- `site.title` - Website title
- `nav.home` - Navigation home link
- `faq.whatIsNordum` - FAQ question
- `tools.dictionary.title` - Tool title



## Development

### Requirements

- **Node.js** 16+
- **NPM** 8+
- **2GB RAM** (for building the site)

### Development Setup

```bash
npm install

# Build everything (includes specification parsing and curated dictionary)
npm run build

# Start development server
npm run dev
```

### Dictionary Maintenance

The web dictionary is built from curated source files in `data/dictionary/sources/`:
- `norwegian.csv`
- `danish.csv`
- `swedish.csv`

Edit these files and run `npm run build:dictionary` to update the dictionary used by the website tools.

Experimental importer scripts exist in `scripts/importers/`, but they are not required for the working site and may produce data that needs manual review.

### Version Management

**Semantic Versioning:**
```bash
npm run version              # Show current version
npm run version:minor        # Increment minor version
npm run version:major        # Increment major version
npm run version:patch        # Increment patch version
npm run version:history      # Show version changelog
```

Format: `MAJOR.MINOR.PATCH+BUILD` (e.g., `1.2.3+1634567890`)

### Quality Assurance

**Testing Framework:**
```bash
npm test                     # Full test suite
npm run test:cache           # Cache functionality tests
npm run test:apis            # API connectivity tests
```

**Validation Goals:**
- Systematic adherence to documented rules
- Cross-language recognition across Norwegian, Danish, and Swedish
- Alternative spelling support for pronunciation variants

## NPM Scripts Reference

### 🚀 Caching & Performance (experimental)
```bash
npm run cache:stats              # Show cache statistics
npm run cache:clean              # Remove expired cache entries
npm run cache:clear              # Clear all cache (with confirmation)
```

### 📚 Dictionary
```bash
npm run build:dictionary         # Generate web dictionary from curated CSV sources
```

### 🧪 Testing & Validation
```bash
npm run test                     # Full test suite
npm run test:cache               # Test cache functionality (quick)
npm run test:apis                # Test API connectivity (quick)
```

### 🔧 Build & Development
```bash
npm run dev                      # Development server with live reload
npm run build                    # Production build (includes translations)
npm run build:dictionary         # Generate Nordum dictionary
npm run build:specification      # Parse language specification
npm run build:i18n               # Build translation files only
npm run serve                    # Serve built site locally
npm run deploy                   # Deploy to production
```

### 📊 Version Management
```bash
npm run version                  # Show current version
npm run version:major            # Increment major version
npm run version:minor            # Increment minor version
npm run version:patch            # Increment patch version
npm run version:history          # Show version changelog
```

### 🌍 Translation Management
```bash
npm run translations:convert      # Extract keys from templates to POT
npm run translations:update       # Update language PO files
npm run translations:check        # Check translation coverage
```

- **Dictionary Entries**: 400+ core words with inflections

**Quality Assurance Framework:**
- **Rule Compliance**: Automated validation of documented morphological and orthographic rules
- **Cross-Language Consistency**: Alignment across Norwegian, Danish, and Swedish source forms
- **Alternative Spelling Consistency**: Systematic alternative generation verification
- **Technical Integration**: Tool functionality validation

### Build Process

**Development Build:**
```bash
npm run dev    # Watch mode with live reload
```

**Production Build:**
```bash
npm run build  # Optimized static site generation
```

**Dictionary Build:**
```bash
npm run build:dictionary  # Apply Nordum linguistic rules
```

The build process:
1. Parses `NORDUM_LANGUAGE_SPECIFICATION.md` into structured data
2. Processes Handlebars templates with i18n
3. Compiles SCSS to optimized CSS
4. Bundles and minifies JavaScript
5. Generates dictionary data for the web tools
6. Creates multilingual site structure
7. Copies static assets

## Implementation Notes

### Dictionary Generation Algorithm

**Multi-step Process:**
1. **Source Import**: Load Norwegian, Danish, Swedish dictionaries
2. **Cognate Analysis**: Calculate similarity scores using edit distance
3. **English Detection**: Identify and preserve technical loanwords
4. **Number Transformation**: Apply Norwegian decimal system
5. **Question Word Processing**: Apply hv→v transformations with alternatives
6. **Strategic Selection**: Choose optimal pan-Scandinavian forms
7. **Morphological Application**: Apply systematic distinctive endings
8. **Alternative Generation**: Create vowel and pronunciation variants
9. **Quality Validation**: Test against linguistic rules
10. **Export Processing**: Generate multiple output formats

### Alternative Spelling Generation

**Automatic Systems:**
- **Vowel Conversion**: æ/ø ↔ ä/ö systematic mapping
- **Sound Pattern Variants**: ej/ei, øj/øy, aj/ai transformations
- **Question Alternatives**: Full and short form generation
- **Pronunciation Support**: Regional variant accommodation

### Extensibility Framework

**Modular Architecture:**
- **Import System**: Pluggable importers for additional language sources
- **Rule Engine**: Configurable linguistic transformation rules
- **Alternative Generation**: Systematic variant creation algorithms
- **Export System**: Multiple output format support

**Community Contribution Support:**
- **Linguistic Rules**: Clear framework for proposing rule changes
- **Vocabulary Addition**: Systematic process for new word integration
- **Quality Validation**: Automated testing for all contributions
- **Documentation**: Comprehensive guidelines for contributors

## API Documentation

### Dictionary API

**Endpoints:**
```
GET /api/dictionary/search?q=word&lang=nordum
GET /api/dictionary/entry/{word}
GET /api/dictionary/random
GET /api/dictionary/stats
```

**Response Format:**
```json
{
  "word": "arbeider",
  "english": "works",
  "pos": "verb",
  "inflections": {
    "present": "arbeider",
    "past": "arbejdede",
    "supine": "arbejdet"
  },
  "etymology": {
    "norwegian": "arbeider",
    "danish": "arbejder",
    "swedish": "arbetar"
  },
  "selectionReason": "Systematic morphology: verbs end in -er",
  "alternatives": ["arbejder"],
  "cognateScore": 0.89
}
```

### Tools API

**Spell Check:**
```
POST /api/tools/spell-check
Content-Type: application/json

{
  "text": "jag arbeiter i dag",
  "language": "nordum"
}
```

## Contributing

### For Linguists

- **Vocabulary**: Suggest entries with etymological data
- **Rules**: Propose morphological improvements
- **Validation**: Participate in comprehension studies
- **Documentation**: Improve language explanations in `NORDUM_LANGUAGE_SPECIFICATION.md`

### For Developers

- **Tools**: Enhance spell checker, dictionary, translator
- **Website**: Improve UI/UX and accessibility
- **Build System**: Optimize development workflow
- **Testing**: Add validation tests

### Contributing Process

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Import** test data: `npm run import:all --limit=100`
4. **Make** changes and test: `npm test`
5. **Validate** linguistics: `node scripts/test-nordum-rules.js`
6. **Commit** changes: `git commit -m 'Add amazing feature'`
7. **Push** to branch: `git push origin feature/amazing-feature`
8. **Open** Pull Request

### Development Guidelines

**Code Style:**
- Use ESLint configuration
- Follow existing patterns
- Document new linguistic rules
- Add tests for new features

**Linguistic Changes:**
- Maintain pan-Scandinavian balance
- Provide clear rationale
- Test with readers familiar with Norwegian, Danish, and Swedish
- Update `NORDUM_LANGUAGE_SPECIFICATION.md` (the single source)

**Documentation Changes:**
- Edit `NORDUM_LANGUAGE_SPECIFICATION.md` for language content
- Edit this README.md for technical content
- Run `npm run build` to regenerate web content
- Test across all supported languages

## Deployment

### Production Deployment

```bash
# Build for production
npm run build

# Deploy to static hosting
npm run deploy

# Deploy with custom configuration
SITE_URL=https://nordum.org npm run deploy
```

### Environment Configuration

```bash
# Required environment variables
SITE_URL=https://nordum.org
NODE_ENV=production

# Optional API keys for experimental importer scripts
SPRAKRADET_API_KEY=your_key_here
ORDNET_API_KEY=your_key_here
```

## Performance

### Build Performance
- **Dictionary generation**: <30 seconds for 10,000 words
- **Specification parsing**: <1 second for full document
- **Site build**: <10 seconds for full site
- **Development rebuild**: <2 seconds for changes

### Runtime Performance  
- **Initial load**: <2 seconds
- **Dictionary search**: <100ms
- **Spell checking**: <50ms per word
- **Mobile responsive**: 60fps on mid-range devices

## Technical Specifications

### Browser Support
- **Modern browsers**: Chrome 80+, Firefox 75+, Safari 13+
- **Mobile**: iOS Safari, Chrome Mobile
- **Accessibility**: WCAG 2.1 AA compliant

### Data Formats
- **Dictionary**: JSON with full linguistic metadata
- **Import**: CSV source files
- **Export**: JSON and plaintext word lists
- **i18n**: GNU gettext PO/MO files
- **Specification**: Structured JSON from markdown parsing

### Single Source System Benefits

#### ✅ For Content Creators
- **Easy editing**: Standard markdown format
- **Focus on content**: No HTML/template syntax required
- **Immediate results**: Changes auto-publish to website
- **Professional output**: Automatic formatting and styling

#### ✅ For Developers
- **No duplication**: One source file to maintain
- **Automatic consistency**: Same content across all languages
- **Build integration**: Seamless with existing workflow
- **Future-proof**: Easy to extend and enhance

#### ✅ For Users
- **Always current**: Website always reflects latest specification
- **Professional presentation**: Academic-quality formatting
- **Multi-device support**: Responsive design for all screen sizes
- **Accessible**: Table of contents, anchor links, print support

## Troubleshooting

### Specification Not Updating on Website

1. **Check build process**:
   ```bash
   npm run build:specification
   npm run build:templates
   ```

2. **Verify file structure**: Ensure `##` headers are properly formatted

3. **Check for errors**: Look for parsing errors in console output

### Missing Sections in Navigation

- Verify section headers use exactly `## Title` format
- Check that sections have content (empty sections may be skipped)
- Ensure no special characters that break anchor generation

### Import Issues
```bash
# Check logs
tail -f logs/import-*.log

# Test single source
npm run import:norwegian --batch=100 --log-level=debug
```

### Build Problems  
```bash
# Clean and rebuild
npm run build:clean
npm run build:dictionary
npm run build:specification
npm run build
```

## License

This project is licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

You are free to:
- **Share** — copy and redistribute in any medium or format
- **Adapt** — remix, transform, and build upon the material

Under the terms:
- **Attribution** — You must give appropriate credit

See [LICENSE](LICENSE) for full details. Content is licensed under CC BY 4.0.

## Resources

### Documentation
- **[Language Specification](NORDUM_LANGUAGE_SPECIFICATION.md)** - Complete linguistic reference (single source)
- **[Web Specification](https://nordum.org/rules/language-specification/)** - Interactive version
- **[FAQ](FAQ.md)** - Frequently asked questions

### Community
- **Website**: [nordum.org](https://nordum.org)
- **Email**: [hello@nordum.org](mailto:hello@nordum.org)
- **GitHub**: [github.com/nordum/nordum](https://github.com/nordum/nordum)

### Statistics
- **Dictionary entries**: 400+ core words
- **Alternative spellings**: Pronunciation variant support
- **Languages supported**: 6 (including Nordum)
- **Specification sections**: 11 main sections with 40+ subsections

## Future Development Paths

**Planned Enhancements**:
- **Corpus Integration**: Large-scale text analysis for frequency data
- **Machine Learning**: Automated phonetic transcription and cognate analysis
- **Community Tools**: User contribution system for vocabulary expansion
- **Performance Optimization**: Faster processing for larger dictionaries
- **Advanced Alternatives**: More sophisticated pronunciation variant support

**Research Directions**:
- **Comprehension Studies**: Formal testing with readers from Norwegian, Danish, and Swedish backgrounds
- **Usage Analysis**: Real-world adoption patterns and user preferences
- **Regional Variation**: Dialectal and geographic usage differences
- **Diachronic Development**: Evolution of the language over time

---

**Nordum** - *Bygga broar genom språk* 🌉  
*Building bridges through language*

**Primary Source**: `NORDUM_LANGUAGE_SPECIFICATION.md`  
**Web Output**: All languages at `/rules/language-specification/`  
**Single Source**: One markdown file maintains entire language specification
