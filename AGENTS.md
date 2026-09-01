# AGENTS.md - AI Assistant Guide for Nordum

This document provides comprehensive guidance for AI coding assistants working on the Nordum project.

## Project Overview

**Nordum** is a constructed pan-Scandinavian written language platform designed to maximize mutual intelligibility between Norwegian (Bokmål), Danish, and Swedish. This is both a linguistic project and a sophisticated web platform with dictionary generation, internationalization, and documentation systems.

### Key Facts
- **Type**: Constructed language platform with web interface
- **Stack**: Node.js, Handlebars templates, SCSS, Webpack
- **Languages Supported**: 6 (Nordum, English, Norwegian, Danish, Swedish, Esperanto)
- **License**: CC BY 4.0
- **Website**: https://nordum.org

## Project Architecture

### Core Components

1. **Dictionary Generation System**
   - Imports data from Norwegian, Danish, and Swedish dictionaries
   - Applies Nordum linguistic rules to create unified vocabulary
   - Generates cognate scores and selection reasons
   - Supports alternative spellings for regional pronunciation variants

2. **Language Specification System**
   - Single-source documentation in `NORDUM_LANGUAGE_SPECIFICATION.md`
   - Automated parsing to structured JSON format
   - Multi-language web rendering via Handlebars templates
   - Auto-generated table of contents and navigation

3. **Internationalization System**
   - GNU gettext PO/MO source files in `src/i18n/`
   - Compilation to MO format for runtime use
   - Translation validation and consistency checking
   - Support for 6 languages across all templates

4. **Build System**
   - Webpack for JavaScript bundling
   - SASS for CSS compilation
   - Handlebars for HTML template generation
   - Automated favicon generation from SVG sources

### Directory Structure

```
nordum/
├── src/
│   ├── templates/          # Handlebars templates
│   │   ├── partials/       # Reusable UI components
│   │   ├── tools/          # Interactive language tools
│   │   └── rules/          # Language documentation pages
│   ├── i18n/              # Translation files (JSON format)
│   ├── styles/            # SCSS stylesheets
│   ├── js/                # JavaScript modules
│   └── static/            # Static assets (images, fonts)
├── scripts/               # Build and utility scripts
│   ├── importers/         # Dictionary import modules
│   ├── build-*.js         # Individual build steps
│   ├── parse-specification.js  # Spec parser
│   └── version-manager.js # Version control
├── data/
│   ├── dictionary/        # Source dictionary data (CSV)
│   ├── specification.json # Parsed language spec
│   └── [various caches]   # Performance optimization
├── config/                # Configuration files
├── build/                 # Output directory (generated)
└── [root documentation]   # README, FAQ, CHANGELOG, etc.
```

## Development Workflow

### Common Tasks

#### 1. Modifying Language Rules
```bash
# Edit the source specification
nano NORDUM_LANGUAGE_SPECIFICATION.md

# Rebuild and test
npm run build:specification
npm run build:templates
npm run build
```

**Files to modify:**
- `NORDUM_LANGUAGE_SPECIFICATION.md` - Single source of truth for all language rules

**Files auto-generated (DO NOT edit manually):**
- `data/specification.json` - Structured data
- `build/rules/language-specification.html` - Final web output

#### 2. Adding/Modifying Translations
```bash
# Edit translation source
nano src/i18n/[language].json

# Rebuild i18n system
npm run build:i18n
npm run build:templates
```

**Translation files:**
- `src/i18n/nordum.json` - Nordum translations
- `src/i18n/en.json` - English
- `src/i18n/no.json` - Norwegian
- `src/i18n/da.json` - Danish
- `src/i18n/sv.json` - Swedish
- `src/i18n/eo.json` - Esperanto

#### 3. Dictionary Operations
```bash
# Setup caching (first time only, 5-10 minutes)
npm run cache:setup

# Import dictionary data (with caching, 10-20x faster)
npm run import:all --limit=1000

# Build Nordum dictionary from source data
npm run build:dictionary

# Test dictionary generation rules
npm run test:morphological
npm run test:nordum-rules
```

**Key files:**
- `scripts/import-dictionaries.js` - Main import orchestrator
- `scripts/importers/` - Individual language importers
- `scripts/build-dictionary.js` - Dictionary generation with Nordum rules
- `data/dictionary/` - Source CSV files

#### 4. Template Development
```bash
# Watch for changes during development
npm run watch:templates

# Or build once
npm run build:templates
```

**Template system:**
- `src/templates/*.hbs` - Main page templates
- `src/templates/partials/*.hbs` - Reusable components
- Uses Handlebars with i18n helper functions
- Auto-generates pages for all 6 languages

#### 5. Styling Changes
```bash
# Watch SCSS during development
npm run watch:styles

# Or build once
npm run build:styles
```

**Style architecture:**
- `src/styles/main.scss` - Main entry point
- Compiles to `build/assets/css/main.css`
- Uses SCSS features (variables, nesting, mixins)

### Build Commands Reference

#### Development
```bash
npm run dev              # Start dev server with live reload
npm run build            # Full production build
npm run watch            # Watch all sources for changes
```

#### Individual Build Steps
```bash
npm run build:clean           # Clean build directory
npm run build:specification   # Parse language specification
npm run build:i18n            # Build translation system
npm run build:templates       # Generate HTML from templates
npm run build:styles          # Compile SCSS to CSS
npm run build:scripts         # Bundle JavaScript
npm run build:dictionary      # Generate Nordum dictionary
npm run build:assets          # Copy static assets
npm run build:favicons        # Generate favicons from SVG
```

#### Testing & Validation
```bash
npm run test                  # Run all tests
npm run test:apis             # Test external API connections
npm run test:cache            # Test caching system
npm run test:morphological    # Test word generation rules
npm run test:nordum-rules     # Test Nordum linguistic rules
```

#### Caching & Performance
```bash
npm run cache:setup      # Initial cache setup (one-time)
npm run cache:warm       # Quick cache warming
npm run cache:stats      # View cache statistics
npm run cache:analyze    # Analyze cache performance
npm run cache:clean      # Clean old cache entries
npm run cache:clear      # Clear entire cache
```

#### Version Management
```bash
npm run version          # Show current version
npm run version:patch    # Increment patch version
npm run version:minor    # Increment minor version
npm run version:major    # Increment major version
npm run version:history  # Show version history
```

## Linguistic System

### Core Principles

1. **Balanced Selection**: Equal respect for Norwegian, Danish, and Swedish
2. **Intelligibility First**: Choose forms recognizable across all three languages
3. **Systematic Regularity**: Predictable patterns, minimal exceptions
4. **Alternative Spellings**: Support for regional pronunciation variants
5. **Loanword Preservation**: Keep English technical terms unchanged

### Dictionary Generation Algorithm

The system analyzes cognates from all three source languages and:

1. **Calculates cognate scores** based on phonetic and orthographic similarity
2. **Applies selection rules** defined in the specification
3. **Generates alternative spellings** for pronunciation variants
4. **Creates systematic inflections** for verbs and adjectives
5. **Documents selection reasoning** for transparency

**Key script:** `scripts/build-dictionary.js`

### Word Selection Hierarchy

1. Forms shared across all three languages (highest priority)
2. Forms shared by two languages with intelligibility to the third
3. Forms from one language if systematically superior
4. English loanwords for technical/modern terms
5. Newly constructed forms only when necessary (rare)

## Code Style & Conventions

### JavaScript
- Use modern ES6+ syntax
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names
- Add comments for complex linguistic logic
- Handle errors gracefully with try-catch

### Handlebars Templates
- Use semantic HTML5 elements
- Include lang attributes for accessibility
- Use translation helpers: `{{t "key"}}`
- Keep logic minimal in templates
- Use partials for reusable components

### SCSS
- Follow BEM naming convention where appropriate
- Use variables for colors, fonts, spacing
- Mobile-first responsive design
- Group related styles together
- Comment complex selectors

### File Naming
- Kebab-case for files: `build-dictionary.js`
- CamelCase for classes and functions
- UPPERCASE for constants
- Descriptive names that indicate purpose

## Important Patterns

### 1. Single Source of Truth Pattern

**The specification is maintained in ONE markdown file:**
- `NORDUM_LANGUAGE_SPECIFICATION.md` is the authoritative source
- Never edit `data/specification.json` manually (it's generated)
- Never edit language rule HTML files manually (they're generated)

### 2. Internationalization Pattern

**Translations are maintained in PO files:**
```
src/i18n/*.po → build process → MO files → templates
```

Always edit the PO source files in `src/i18n/`, never the generated MO files in `build/assets/i18n/`.

### 3. Dictionary Build Pipeline

**Curated sources → Process → Generate:**
```
data/dictionary/sources/*.csv → build-dictionary.js → Nordum rules → Final dictionary
```

Use caching to avoid repeated API calls (respectful to external services).

### 4. Template Rendering Pattern

**Data + Template = Multi-language Pages:**
```javascript
// Each template renders in all 6 languages
const languages = ['nordum', 'en', 'no', 'da', 'sv', 'eo'];
languages.forEach(lang => {
  // Render with i18n helper
  const html = template({ lang, data, t: i18nHelper });
});
```

## Common Pitfalls & Solutions

### Problem: Specification changes not appearing on website
**Solution:** Run the full build chain:
```bash
npm run build:specification
npm run build:templates
```

### Problem: Translation missing in one language
**Solution:** Check the source JSON file in `src/i18n/` and rebuild:
```bash
npm run build:i18n
npm run build:templates
```

### Problem: Dictionary import is very slow
**Solution:** Use the caching system:
```bash
npm run cache:setup    # One-time setup
npm run import:all     # Now 10-20x faster
```

### Problem: Build fails with file not found
**Solution:** Ensure you're building in correct order:
```bash
npm run build:clean
npm run build          # Runs all steps in order
```

### Problem: Webpack bundle size too large
**Solution:** Check for unnecessary imports and use code splitting for large dependencies.

## Testing Guidelines

### When to Add Tests

1. **Linguistic Rules**: Any new word selection or morphological rule
2. **Dictionary Generation**: Changes to cognate scoring or alternative spellings
3. **Data Processing**: Import scripts and parsers
4. **API Integration**: External service connections

### Test Files Location
- `scripts/test-*.js` - Utility test scripts
- Add new test files in `scripts/` directory
- Use descriptive names: `test-[feature].js`

### Running Tests
```bash
npm run test              # All tests
npm run test:morphological  # Word generation rules
npm run test:nordum-rules   # Linguistic rules
npm run test:apis         # External APIs (quick)
npm run test:cache        # Caching system
```

## Performance Considerations

### Build Performance
- Use caching for dictionary imports (10-20x speedup)
- Limit initial imports with `--limit` flag during development
- Webpack production mode optimizes JavaScript bundles
- SCSS compression reduces CSS file size

### Runtime Performance
- Minimal client-side JavaScript
- Static HTML generation for fast page loads
- Optimized images and assets
- Responsive design without heavy frameworks

### Cache Management
```bash
npm run cache:stats    # Monitor cache size and hit rates
npm run cache:clean    # Remove old entries
npm run cache:estimate # Estimate cache build time
```

## External Dependencies

### Critical Dependencies
- **handlebars**: Template engine for HTML generation
- **sass**: CSS preprocessing
- **webpack**: JavaScript bundling
- **markdown-it**: Markdown parsing for specifications
- **natural**: NLP library for linguistic analysis
- **papaparse**: CSV parsing for dictionary data

### API Services
- Norwegian dictionary API (Ordbøkene)
- Danish dictionary API (Den Danske Ordbog)
- Swedish dictionary API (Språkbanken)

**Important**: Always use caching to minimize API calls and respect rate limits.

## Deployment

### Production Build
```bash
npm run build     # Creates production-ready build/
npm run deploy    # Deploys to GitHub Pages
```

### What Gets Deployed
- `build/` directory contains complete static site
- All 6 language versions of every page
- Compiled CSS and JavaScript
- Dictionary data as JSON
- Static assets (images, fonts)

### Environment
- Static site (no server-side rendering)
- Hosted on GitHub Pages
- No environment variables needed for frontend
- API keys only needed for dictionary import (development)

## Documentation

### Key Documentation Files
- `README.md` - Project overview and quick start
- `NORDUM_LANGUAGE_SPECIFICATION.md` - Complete language rules
- `FAQ.md` - Frequently asked questions
- `CHANGELOG.md` - Version history
- `AGENTS.md` - This file

### When to Update Documentation

1. **Language Changes**: Update `NORDUM_LANGUAGE_SPECIFICATION.md`
2. **Build System Changes**: Update `README.md` and this file
3. **New Features**: Update `README.md` and add to `CHANGELOG.md`
4. **Breaking Changes**: Document in `CHANGELOG.md` with clear migration guide

## Git Workflow

### Branch Strategy
- `main` - Production-ready code
- Feature branches for development
- Clear, descriptive commit messages

### Commit Message Guidelines
```
feat: Add new dictionary import caching system
fix: Correct verb conjugation for -er endings
docs: Update language specification with new rules
style: Improve responsive design for mobile
refactor: Simplify template rendering logic
test: Add tests for cognate scoring algorithm
```

## Getting Help

### Resources
- **Documentation**: All `.md` files in root directory
- **Code Comments**: Inline documentation in complex scripts
- **Issue Tracker**: GitHub issues for bugs and features
- **Community**: See README for community links

### Before Asking for Help
1. Check existing documentation
2. Search GitHub issues
3. Review relevant script files
4. Test with minimal reproduction

## Quick Reference

### Project Structure Commands
```bash
# View project structure
tree -L 2 -d

# Find files
find . -name "*.js" -o -name "*.hbs"

# Search code
grep -r "function name" src/
```

### Most Commonly Modified Files
1. `NORDUM_LANGUAGE_SPECIFICATION.md` - Language rules
2. `src/i18n/*.json` - Translations
3. `src/templates/*.hbs` - Page templates
4. `scripts/build-dictionary.js` - Dictionary generation
5. `src/styles/*.scss` - Styling

### Most Important Scripts
1. `scripts/parse-specification.js` - Parses language spec
2. `scripts/build-dictionary.js` - Generates Nordum dictionary
3. `scripts/build-templates.js` - Renders all HTML pages
4. `scripts/import-dictionaries.js` - Imports source data
5. `scripts/version-manager.js` - Manages versioning

## Philosophy for AI Assistants

When working on Nordum:

1. **Respect the linguistic integrity** - This is a constructed language with specific rules
2. **Maintain the single-source pattern** - Don't duplicate data or rules
3. **Preserve multi-language support** - All changes must work across 6 languages
4. **Document linguistic decisions** - Transparency is a core principle
5. **Be conservative with changes** - Language consistency matters
6. **Test thoroughly** - Linguistic bugs are hard to catch
7. **Think about maintainability** - Future contributors should understand your code

### When in Doubt
- Check the specification first
- Follow existing patterns in the codebase
- Ask for clarification on linguistic decisions
- Test with multiple languages
- Document your reasoning

---

**Version**: 0.9.0  
**Last Updated**: 2024  
**Maintainer**: Nordum Project Contributors