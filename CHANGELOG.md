# Nordum Changelog

All notable changes to the Nordum dictionary will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ✨ New Features
Implemented approved orthographic and morphological rules (ck→kk, ks→x, c→k/s, ld→ll, ph→f, skj→sk, hv→v, lower-case, compounds, verb -e, adjective -t); curated dictionary now 442 entries

**Upgraded from**: 0.9.0+1758124142536


### Added
- `mykket` and `meget` are accepted spelling variants of `mye`, recorded as alternative entries and included in the generated word list.
- Regression tests pin the `ks` → `x` rule on numerals (`seks` → `sex`, `seksten` → `sexten`, `sekstende` → `sextende`); the rule has no numeral exemption.
- Implemented approved orthographic and morphological rules: `ck` → `kk`, `ks` → `x`, established Scandinavian `c` → `k`/`s`, `ld` → `ll`, `ph` → `f`, Norwegian `skj` → `sk`, `hv-` → `v-`, lower-case only, compounds by simple concatenation, verb infinitive always `-e`, and adjective neuter always `-t`.
- Added curated source entries for `bicycle`, `centre`, and `circle` to demonstrate the `c` regularization rules.

### Fixed
- Replaced unreliable scraped dictionary data with a curated 400+ word core vocabulary, making the dictionary, spellchecker, and translator actually usable.
- Rewrote the translator to perform real dictionary-based word lookup instead of returning placeholder output.
- Removed dead social links (Discord, Reddit) and non-existent pages (API docs, Contributing Guide) from templates and documentation.
- Fixed broken `http://README.md` link generated from the language specification.
- Corrected inflated or unsupported claims in README, AGENTS.md, FAQ.md, templates, and site.json (entry counts, intelligibility percentages, contributor numbers, native-speaker validation claims).
- Removed stale cache files containing an exposed third-party API key.
- Added a LICENSE file and made `npm test` run the project's actual test scripts.
- Specification: rule 5 example is `forskjell` → `forskell` (doubled `l` after the short vowel), the definite singular follows the general `-en` ending (`flikken`), and the compound seam keeps doubled consonants (`tunn` + `skiva` → `tunnskiva`).
- Irregular verbs `være`/`ha`/`gå` no longer run through the regular verb paradigm: the dictionary now generates `er`, `har` and `går` (with the `ha` lemma) instead of `gåer`, `gåede`, `gået`, `haver` and `havede`.
- Removed the `K/J/G rules` claim (`søke` → `søge`, `gjenstand` → `genstand`) from the rules page; the specification does not define these rules.
- Irregular verbs now carry their past/supine forms in the specification and the generator: `være` → `var`/`vært`, `ha` → `hadde`/`hatt`, `gå` → `gikk`/`gått`.
- Specification: the `å`/`att` example now reads `Det er viktig att hun lærer språket.` — the conjunction `att` introduces a full clause, so the previous example was missing its subject.

## [0.9.0] - 2025-09-18

Initial release
