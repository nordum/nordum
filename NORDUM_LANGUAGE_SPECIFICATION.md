# Nordum Language Specification

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Principles](#2-design-principles)
3. [Orthography and Phonology](#3-orthography-and-phonology)
4. [Morphological System](#4-morphological-system)
5. [Lexical Selection Rules](#5-lexical-selection-rules)
6. [Syntax](#6-syntax)
7. [Alternative Spellings](#7-alternative-spellings)
8. [Examples and Usage](#8-examples-and-usage)
9. [Quality Metrics](#9-quality-metrics)
10. [Norwegian Writers: Key Differences](#10-norwegian-writers-key-differences)
11. [Danish Writers: Key Differences](#11-danish-writers-key-differences)
12. [Swedish Writers: Key Differences](#12-swedish-writers-key-differences)

---

## 1. Introduction

**Nordum** is a constructed pan-Scandinavian written language designed to maximize mutual intelligibility between Norwegian (Bokmål), Danish, and Swedish while maintaining systematic regularity and practical modern usage.

### 1.1 Core Philosophy

Nordum creates a balanced linguistic bridge that:
- **Respects all three source languages equally** without favoring any single tradition
- **Accommodates regional pronunciation differences** through alternative spellings
- **Integrates modern practicality** with English loanword preservation
- **Maintains systematic regularity** while supporting linguistic variation
- **Provides transparency** in all linguistic decision-making

### 1.2 Target Audience

- **Native Speakers**: Norwegian, Danish, and Swedish speakers seeking a shared written standard
- **Language Learners**: Students of Scandinavian languages
- **Researchers**: Linguists studying pan-regional constructed languages
- **Developers**: Building tools and applications for Scandinavian communication

---

## 2. Design Principles

### 2.1 Balanced Pan-Scandinavian Selection

**Principle**: Equal respect for all three source languages with strategic selection for optimal clarity.

**Implementation**:
- Norwegian, Danish, and Swedish contribute as equal partners
- Selection based on pan-Scandinavian intelligibility optimization
- No language treated as subordinate or "less important"
- Strategic decisions favor forms that work best across all three languages

**Examples**:

```

arbeider (selected for majority agreement Norwegian/Danish on "d" form preferred over Swedish "arbetar" for verb consistency, "ei" over "ej" for [aj].)
liten (selected for majority agreement and compatibility with comparative/superlative forms)
høre (retained for pan-Scandinavian recognition; Swedish "höra" adapted via vowel alternatives)
```

### 2.2 Loanword Integration

**Principle**: Modern technical terms preserved unchanged following established Scandinavian practice.

**Rule**: Loanwords in technical, digital, and contemporary domains remain unmodified.

**Examples from English**:

```

computer → computer (not datamaskin/dator)
internet → internet
email → email (not e-post/mejl)
software → software (not programvare/mjukvara)
website → website (not nettside/webbsida)
app → app
smartphone → smartphone
browser → browser
password → password
check → check
chocolate → chocolate
social media → social media
basketball → basketball
```

**Examples from other languages**:

```

Schokolade → schokolade
Doppelgänger → doppelgänger
Zeitgeist → zeitgeist
mosquito → mosquito
patio → patio
baguette → baguette
```

**Rationale**: Follows established Danish/Norwegian practice for technical terminology, making Nordum immediately practical for modern multilingual communication. Note that sometimes there are multiple possible ways of spelling a word depending on which loanword one chooses (e.g., "chocolate" vs. "schokolade") or whether to use a word in native Nordum ("sjokolade"), but in all cases, the same rules of capitalization apply, even for proper nouns.

### 2.3 Systematic Morphological Distinctions

**Principle**: Each grammatical category has distinctive endings to prevent confusion and enable clear parsing.

**Core System**:
- **Verbs (present)**: Always `-er` ending (except irregulars: er, har, går)
- **Noun plurals**: Usually `-ar` ending — invariant for common neuter nouns (hus, barn, øye, ben, år)
- **Adjective comparatives**: Usually `-ere` ending (except irregulars: god→bedre, liten→mindre)
- **Adjective superlatives**: Usually `-est` ending (except irregulars: god→bedst, liten→mindst)

**Benefits**:
- Immediate grammatical category identification
- No confusion between verbs and noun plurals
- Clear parsing for humans and machines
- Systematic learning patterns

### 2.4 Regular Number System

**Principle**: Use the most regular decimal system to eliminate complexity.

**Implementation**: Norwegian number system adopted for maximum regularity.

**Numbers**:

```

50 → femti (not halvtreds/femtio)
60 → seksti (not tres/sextio)
70 → sytti (not halvfjerds/sjuttio)
80 → åtti (not firs/åttio)
90 → nitti (not halvfems/nittio)
100 → hundre
1000 → tusen
```

**Rationale**: Eliminates Danish vigesimal complexity while remaining clear to Swedish speakers.

### 2.5 Phonetic Transparency

**Principle**: Spelling should consistently reflect pronunciation with systematic sound-symbol correspondence.

**Implementation**:
- Eliminate silent letters where possible
- Clear question word patterns (v- without silent h)
- Systematic vowel representations
- Alternative spellings for pronunciation variants

---

## 3. Orthography and Phonology

### 3.1 Alphabet

**Basic Latin**: A-Z (26 letters)
**Scandinavian Extensions**: Å or Aa (universal), plus alternative vowel systems:
- **Primary**: Æ, Ø (Norwegian/Danish pattern)
- **Alternative**: Ä, Ö (Swedish/German pattern) or Ae, Oe (International).

**Policy**: The choice of æ/ø, ä/ö, aa/ae/oe has **no grammatical consequences** — it is purely orthographic. Text books and official documents should use the primary vowel system. When keyboard layouts do not support these characters, they should be substituted with their primary counterparts.

### 3.2 Vowel System

#### 3.2.1 Primary Vowels (Phonemic Representation)
| Letter | Phoneme | Common Realizations (IPA) | Examples | Notes |
| A, a | /a/ | [ɑ], [a], [æ] | katt, hav | Realization depends on dialect (e.g., Danish [æ] in 'mad'). |
| E, e | /e/ | [e], [ɛ], [ə] | hest, tre | Often [e] stressed, [ə] unstressed. |
| I, i | /i/ | [i], [ɪ] | bil, tid | Always [i], never [ɪ]. |
| O, o | /o/ | [o], [ɔ], [ʊ] | bok, stor | Always [o], never [ɔ]. |
| U, u | /u/ | [u], [ʊ], [ʉ] | hus, tur | Always [u], never [ʊ]. |
| Y, y | /y/ | [y] | ny, fyra | Retained from all three. |
| Å, å | /oː/ | [oː] | år, båt | Long close-mid back vowel. |
| Æ, æ | /æ/ | [æ], [ɛ] | kær, hæst | Open front vowel. |
| Ø, ø | /ø/ | [ø], [œ] | hør, rød | Close-mid front rounded. |

**Policy:** The orthography represents phonemes (distinct sound units). The precise pronunciation (phonetic realization) of these phonemes varies by regional accent. All common regional variations are accepted and considered correct. For example, the phoneme /a/ can be pronounced as a back [ɑ] (Norwegian/Standard Swedish), a central [a] (Finnish Swedish), or a front [æ] (Danish).

#### 3.2.2 Alternative Vowel Spellings (Swedish/German)

| Primary | Alternative | Examples |
|---------|-------------|----------|
| æ | ä | hæst/häst (horse) |
| ø | ö | dørr/dörr (door) |
| ø | ö | grønnsaker/grönnsaker (vegetables) |
| ø | ö | brød/bröd (bread) |

**Policy**: Both forms accepted as valid. Users may choose preferred system. **No other grammatical or lexical elements change based on this choice.**

### 3.3 Consonant System

| Letter | IPA | Examples | Rules |
|--------|-----|----------|-------|
| B, b | [b] | bil, god | Never silent |
| C, c | [k]/[s] | computer, centrum | Loanwords only |
| D, d | [d]/[ð] | dag, god | Silent d eliminated |
| F, f | [f] | fisk, kaffe | Consistent |
| G, g | [g] | god, lag | Always hard [g] |
| H, h | [h] | hus, hånd | Never silent (eliminated in question words) |
| J, j | [j] | ja, arbeide | Consistent [j] sound |
| K, k | [k] | katt, kjøpe | Replaces ck combinations |
| L, l | [l] | liten, fall | Clear lateral |
| M, m | [m] | mann, komme | Bilabial nasal |
| N, n | [n] | ny, ingen | Alveolar nasal |
| P, p | [p] | penge, kop | Consistent |
| R, r | [r]/[ʁ] | rød, vor | Regional variation |
| S, s | [s] | stor, hus | Unvoiced sibilant |
| T, t | [t]/[ð] | tid, hat, heter | Clear stop |
| V, v | [v] | vad, have | Used in question words |
| W, w | [v]/[w] | website | English loanwords |
| X, x | [ks] | taxi | Rare, loanwords |
| Z, z | [s]/[z] | zoo | Loanwords only |

#### 3.3.1 Special Note: The Letter d and Regional Pronunciation

In cases where the letter `d` is used in all three languages, it is always written in its standard orthographic position, regardless of whether it is pronounced as a voiced dental fricative [ð], an alveolar stop [d], or a bilabial stop [t] in different regional variations. Regional variation is accepted and expected:

Danish speakers: May pronounce d as voiced dental fricative [ð], especially between vowels or word-finally.
Norwegian speakers: Typically pronounce d as alveolar stop [d].
Swedish speakers: Typically pronounce d as [d], but may devoice to [t] in casual or final position.

#### 3.3.2 Clarification: When to Use d vs t

The letter d is retained in words spelled with d across all or most source languages (e.g., mad, god, ved), with regional pronunciation accepted.

However, in lexical items where Norwegian and Swedish consistently use `t` and Danish uses `d` for the same meaning and morphological position (e.g., heter), Nordum adopts `t` to align with majority usage and pronunciation clarity.

This is a lexical selection decision, not a phonetic one. It ensures Nordum remains intuitive and recognizable to all users.

In cases where the letter `t` is used as the primary spelling for what is a [ð]-sound in Danish, it is a secondary option to spell it with `d`.

### 3.4 Special Combinations

| Combination | IPA | Examples | Origin |
|-------------|-----|----------|--------|
| sk | [sk] | skog, fisk | Before front vowels |
| skj | [ʃ] | skjorte | Norwegian pattern |
| sj | [ʃ] | sjokolade | Danish/Norwegian pattern |
| tj | [ç] | tjæne | Swedish pattern |
| kj | [ç] | kjær | Norwegian pattern |
| ng | [ŋ] | ring, sang | Final position |

### 3.5 Question Words (V- Pattern)

**Rule**: Eliminate silent H, use clear v- pattern with pronunciation variants.

**Transformations**:

```

hvad/hva → vad/va (what)
hvor → var (where)
hvem → vem (who)
hvorfor → varför/vorfor (why)
hvilken → vilken (which)
hvornår → ven/vornår/når/när (when)
```

**Alternative Forms**:
- `va` - Short form of `vad` (common in speech)
- `vorfor` - Norwegian/Danish pronunciation variant
- `vornår` - Full form variant (Danish hvornår → vornår)
- `när` - Swedish pronunciation variant
- `når` - Norwegian pronunciation variant

### 3.6 Sound Pattern Transformations

**Sound Pattern Normalization**:
- **ej → ei**: jeg → jei, vejr → veir, nej → nei (wherever the [ej] sound appears)
- **aj → ei**: maj → mei (wherever the [aj] sound appears, using ei instead of aj)
- **øj → øi**: høj → høi (wherever the [øj] sound appears, using øi instead of øj)
- **øy → øi**: høy → høi (wherever the [øy] sound appears, using øi instead of øy)

Both original and transformed forms accepted as alternatives. The normalized forms (ei, øi) are recommended for consistency and phonetic clarity, while traditional spellings (ej, øj, aj, øy) are preserved as valid alternatives for those accustomed to them.

---

## 4. Morphological System

### 4.1 Systematic Distinctions Principle

**Core Innovation**: Each grammatical category has distinctive endings to eliminate ambiguity and improve parsing.

### 4.2 Verb System

#### 4.2.1 Present Tense: Always `-er`

**Rule**: All verbs in present tense end in `-er`, never `-ar` — except irregulars.

**Rationale**: Clear distinction from noun plurals which always end in `-ar`.

```

Infinitive → Present
arbeide → arbeider (work → works)
snakke → snakker (speak → speaks)
komme → kommer (come → comes)
være → er (be → is)
```

**Irregular Verbs**:
- `være → er`
- `ha → har`
- `gå → går`

#### 4.2.2 Complete Verb Paradigm

```

Infinitive:        arbeide
Present:           arbeider (systematic -er)
Past (formal):     arbeidede (regular -ede)
Past (informal):   arbeida (regular -a)
Supine:            arbeidet (regular -et)
Past Participle:   arbeidet (regular -et)
Present Participle: arbeidende (-ende)
Imperative:        arbeid! (stem form)
```

**Note**: `-ede` remains the primary form, but the shorter `-a` past (arbeida) is **accepted as an optional secondary form**, reflecting widespread Scandinavian colloquial use.

#### 4.2.3 Infinitive Marker: Distinction between "å" and "att"

**Principle**: Nordum maintains a clear distinction between "å" (the infinitive marker) and "att" (the conjunction meaning "that"), similar to the Norwegian distinction between "å" and "at".

**Implementation**:
- **å**: Used exclusively as the infinitive marker before verbs
- **att**: Used exclusively as the conjunction meaning "that"

**Examples**:

```

Infinitive:        å arbeide (to work)
Conjunction:       Jei vet att hun arbeider. (I know that she works.)

Infinitive:        å snakke (to speak)
Conjunction:       Hun sier att hun kan snakke nordum. (She says that she can speak Nordum.)

Infinitive:        å lære (to learn)
Conjunction:       Det er viktig att lære språket. (It is important to learn the language.)
```

**Rationale**: This distinction provides clarity and prevents ambiguity, especially for Norwegian speakers who are accustomed to the "å"/"at" distinction. It also aligns with the systematic approach of Nordum to maintain clear grammatical distinctions.

#### 4.2.4 Swedish Verb Transformation

Swedish `-ar` verbs become `-er` in Nordum:
- `arbeta` → `arbeide` → `arbeider`
- `tala` → `tale` → `snakker` (strategic lexical selection)
- `köra` → `kjøre` → `kører`

### 4.3 Noun System

#### 4.3.1 Plural: Usually `-ar`

**Rule**: Most noun plurals end in `-ar`. Common neuter nouns (hus, barn, øye, ben, år) are invariant.
**Rationale**: Clear distinction from verb present tense which always ends in `-er`.

```

Singular → Plural
flikka → flikkar (girl → girls)
jente → jentar (girl → girls)
hus → husar (house → houses - also accepted: hus)
barn → barnar (child → children - also accepted: barn/børn)
```

#### 4.3.2 Complete Noun Inflection

**Common Gender (en-words)**:

```

Indefinite singular:  flikka
Definite singular:    flikkan
Indefinite plural:    flikkar
Definite plural:      flikkarna
```

```

Indefinite singular:  jente
Definite singular:    jenten
Indefinite plural:    jentar
Definite plural:      jentarna
```

```

Indefinite singular:  pije (Danish: pige)
Definite singular:    pijen
Indefinite plural:    pijar
Definite plural:      pijarna
```

**Neuter Gender (ett-words)**:

```

Indefinite singular:  hus
Definite singular:    huset
Indefinite plural:    husar (also accepted: hus - irregular)
Definite plural:      husarna
```

#### 4.3.3 Gender System (Simplified)

**Common Gender (en)**:
- Animates (people, animals)
- Most concrete objects
- Abstract concepts ending in -het, -skap

**Neuter Gender (ett)**:
- Collective nouns
- Materials and substances
- Infinitives used as nouns
- Words ending in -ande, -ende

### 4.4 Adjective System

#### 4.4.1 Comparative: Always `-ere`

```

Positive → Comparative → Superlative
stor → større → størst (big → bigger → biggest)
liten → mindre → mindst (small → smaller → smallest)
god → bedre → bedst (good → better → best)
```

#### 4.4.2 Adjective Agreement

```

Positive Forms:
Common:    stor bil (big car)
Neuter:    stort hus (big house)
Plural:    store bilar (big cars)
Definite:  den store bilen (the big car)
```

### 4.5 Morphological Examples

#### 4.5.1 Clear Grammatical Distinctions

```

arbeider (verb) = "works" (present tense -er)
arbeidere (noun) = "workers" (if this word existed, -ere ending)
jentar (noun plural) = "girls" (-ar ending)
større (adj comparative) = "bigger" (-ere ending)
størst (adj superlative) = "biggest" (-est ending)
```

#### 4.5.2 Sentence Analysis

```

De store jentar arbeider i huset.
The big girls work in the house.

Analysis:
- de = definite article (plural)
- store = adjective plural (-e ending)
- jentar = noun plural (-ar ending)
- arbeider = verb present (-er ending)
- i = preposition
- huset = definite neuter (-et ending)
```

## 4.6 Pronoun System

**Principle**: Personal pronouns are standardized to forms that maximize pan-Scandinavian intelligibility and consistency, following the lexical selection rules outlined in Section 5.2.

### 4.6.1 Personal Pronouns

The standard forms of personal pronouns in Nordum are as follows:

| Person | Subject Form | Object Form | Possessive Adjective | Possessive Pronoun |
|--------|--------------|-------------|----------------------|---------------------|
| 1st sing. | jei (I) | mei (me) | min/mitt/mina (my) | min/mitt/mina (mine) |
| 2nd sing. | du (you) | dei (you) | din/ditt/dina (your) | din/ditt/dina (yours) |
| 3rd sing. masc. | han (he) | ham (him) | hans (his) | hans (his) |
| 3rd sing. fem. | hun (she) | henne (her) | hennas (her) | hennas (hers) |
| 3rd sing. common | den (it) | den (it) | dens (its) | dens (its) |
| 3rd sing. neuter | det (it) | det (it) | dets (its) | dets (its) |
| 1st plur. | vi (we) | oss (us) | vår/vårt/våra (our) | vår/vårt/våra (ours) |
| 2nd plur. | ni (you) | er (you) | er/ert/era (your) | er/ert/era (yours) |
| 3rd plur. | de (they) | dem (them) | deras (their) | deras (theirs) |

**Notes and Explanations**:
- **Subject and Object Forms**: The object forms are used when the pronoun is the object of a verb or preposition. For example: "Jei ser dei" (I see you), "Hun jælper mig" (She helps me).
- **Possessive Forms**: Possessive adjectives modify nouns (e.g., "min bil" for "my car"), while possessive pronouns stand alone (e.g., "Bilen er min" for "The car is mine"). The forms agree with the gender and number of the noun they reference:
  - `min` (common gender singular), `mitt` (neuter gender singular), `mina` (plural).
  - Similarly for `din`, `vår`, `er`, etc.
- **Intelligibility Considerations**: The forms chosen are based on majority usage across Norwegian, Danish, and Swedish. For example:
  - `jei` is derived from Norwegian/Danish `jeg` with the [ej] → `ei` transformation.
  - `mei`/`dei` is derived from Danish/Swedish `mig`/`dig` with the [ej] → `ei` transformation.
  - `ni` for the second person plural subject is adopted from Swedish and is widely understood in Danish and Norwegian contexts.
  - `er` for the second person plural object is from Swedish, and is recognizable to Norwegian and Danish speakers.

#### 4.6.2 Reflexive Pronouns

**Principle**: Reflexive pronouns are used when the subject and object of a verb are the same entity. Nordum standardizes these forms for clarity and consistency across all persons, except the 1st and 2nd person plural which often use the possessive adjective reflexively.

| Person | Reflexive Pronoun | Example (with verb) | Example (with preposition) |
| :--- | :--- | :--- | :--- |
| 1st sing. | **mei** (myself) | Jei vasker **mei**. (I wash myself.) | Hun snakker till **mei**. (She talks to me.) |
| 2nd sing. | **dei** (yourself) | Du kjeder **dei**. (You bore yourself.) | Det er en gave till **dei**. (It's a gift for you.) |
| 3rd sing. | **sei** (himself/herself/itself) | Han ser **sei** i speilet. (He sees himself in the mirror.) | Hun lagde mat till **sei** selv. (She made food for herself.) |
| 1st plur. | **vår** (our/ourselves) | Vi vasker **vår** bil. (We wash our car.) | Vi må gjøre det for **oss** selv. (We must do it for ourselves.) |
| 2nd plur. | **er** (your/yourselves) | Ni låner **er** bok. (You borrow your book.) | Tenk på **er** selv! (Think of yourselves!) |
| 3rd plur. | **sei** (themselves) | De beskytter **sei**. (They protect themselves.) | De bygde ett hus till **sei** selv. (They built a house for themselves.) |

**Notes and Explanations**:
*   **Standardization**: The forms `mei`, `dei`, and `sei` are chosen for their high intelligibility across all three source languages (cf. Norwegian `meg/deg/seg`, Danish `mig/dig/sig`, Swedish `mig/dig/sig`).
*   **`Sei` for 3rd Person**: The pronoun `sei` is used for all third-person singular and plural reflexive contexts, identical to the pattern in Norwegian and Danish.
*   **Possessive vs. Reflexive in 1st/2nd Plural**: Note the distinction:
    *   **Vår/er** is used as a possessive adjective (*our car*, *your book*).
    *   **Oss selv/er selv** is the reflexive form used with prepositions (*for ourselves*, *of yourselves*). The form `selv` (self) is added for emphasis and clarity, following Scandinavian patterns.
*   **Ambiguity Avoidance**: The systematic use of `sei` prevents confusion that can arise from the Swedish use of `sig` (reflexive) vs. `deras` (non-reflexive, their).

### 4.6.3 Examples in Sentences

- **Subject**: "Ni arbeider her" (You work here).
- **Object**: "Jei ser er" (I see you all).
- **Possessive Adjective**: "Vår bil er rød" (Our car is red).
- **Possessive Pronoun**: "Computerene er våra" (The computers are ours).
- **Reflexive**: "De må vaske sei selv" (They must wash themselves).

This standardization ensures clarity and reduces ambiguity in written Nordum, aligning with the design principles of mutual intelligibility and systematic regularity.


## 5. Lexical Selection Rules

### 5.1 Selection Priority System

When variants exist across Norwegian, Danish, and Swedish:

1. **English loanword detection** → preserve unchanged
2. **Norwegian number system** → apply systematic replacement
3. **Question word transformation** → hv→v pattern with alternatives
4. **Strategic pan-Scandinavian selection** → optimize for mutual intelligibility
5. **Alternative spelling generation** → accommodate pronunciation variants
6. **Morphological systematization** → apply distinctive endings

### 5.2 Cognate Analysis Process

#### 5.2.1 Perfect Cognates
Words identical across all three languages:

```

hus (house) - unanimous form adopted directly
bil (car) - unanimous form adopted directly
```

#### 5.2.2 Near Cognates
Minor spelling differences resolved systematically:

```

arbeta/arbeide/arbejde → arbeide (systematic morphology + strategic selection)
liten/lille/liten → liten (majority form with regular inflection preferred, lille is accepted)
```

#### 5.2.3 Divergent Forms
When all three languages differ in spelling, prefer most systematic and secondly the form that maximizes mutual intelligibility and matches majority pronunciation:

```

Swedish: kör, Norwegian: kjører, Danish: kører → kører (systematic + majority)
Swedish: talar, Norwegian: snakker, Danish: snakker/taler → taler/snakker (systematic + majority)
Danish: hedder, Norwegian: heter, Swedish: heter → heter (majority form, clearer pronunciation alignment)
Danish: ikke, Norwegian: ikke, Swedish: inte → ikke (majority form, preserves Danish/Norwegian unity)
```

Note: In cases where Danish uses d for [ð] but Norwegian/Swedish use t for the same morpheme (e.g., hedder/heter), Nordum selects t to align with majority spelling and avoid forcing non-native pronunciations on Norwegian/Swedish speakers. This does not contradict the general d-pronunciation rule — it reflects lexical selection for optimal intelligibility.

### 5.3 Frequency and Usage Considerations

**Weighting System**:
- **Common vocabulary**: Higher priority for systematic forms
- **Technical terms**: Preserve English where established
- **Regional variants**: Support through alternative spellings
- **Historical forms**: Modernize systematically

### 5.4 Quality Scoring

Each lexical decision scored on:
- **Mutual intelligibility**: 0-1 scale across three languages
- **Systematic regularity**: Adherence to morphological patterns
- **Practical utility**: Modern usage and learnability
- **Pan-Scandinavian balance**: Equal treatment of source languages

### 5.5 Treatment of Geographic Names

**Principle**: Geographic place names (toponyms) shall, as a default, retain their most common endonym (name used within that place) to promote international recognition and neutrality, following the precedent set by modern Norwegian. A limited set of well-established exonyms (locally used names for foreign places) is permitted.

#### 5.5.1 General Rule: Use of Endonyms

The primary name for a country, region, or major city should be its common endonym, not a Scandinavian exonym.

**Examples:**
*   `Argentina` (not *Argentinien*)
*   `Hellas` (not *Grækenland*)
*   `España` (not *Spanien*)
*   `Italia` (not *Italien*)
*   `Nederland` (not *Holland*)
*   `Deutschland` (primary form, see exception below)
*   `Praha` (not *Prag*)
*   `Bruxelles` (not *Bryssel*)

#### 5.5.2 Permitted Exonyms

A short list of common, pan-Scandinavian exonyms are permitted as official alternatives. The most notable exceptions are:
*   `Tyskland` (as an accepted alternative to `Deutschland`)
*   `Østerrike` (for `Österreich`)


#### 5.5.3 Historical and Regional Variants

For places with multiple valid historical names or names that vary by Scandinavian dialect, multiple forms are acceptable. This often applies to regions with shared cultural history.

**Examples:**
*   `Slesvig` or `Schleswig`
*   `Flensborg` or `Flensburg`
*   `Hamborg` or `Hamburg`
*   `Kjøbenhavn` or `København`
*   `Göteborg` (endonym) / `Gøteborg` (Danish/Nordum primary) / `Gothenburg`

**Policy**: The choice between endonyms, permitted exonyms, or historical variants is considered an orthographic preference and has no grammatical consequences. Consistency within a single text is encouraged.

## 6. Syntax

### 6.1 Word Order

#### 6.1.1 Main Clauses (V2 Rule)

**Basic**: Subject + Verb + Object

```

Jei læser en bok/bog.
I read a book.
```

**V2 with adverbial**: Adverbial + Verb + Subject + ...

```

I dag arbeider jei jemme/hemma.
Today I work at home.
```

#### 6.1.2 Subordinate Clauses

**Pattern**: Conjunction + Subject + Verb + ...

```

Jei vet att hun arbeider.
I know that she works.
```

#### 6.1.3 Questions

**Yes/No Questions**: Verb + Subject + ...

```

Arbeider du i dag?
Do you work today?
```

**Wh-Questions**: Question word + Verb + Subject + ...

```

Vor/var arbeider du? (Where do you work?)
Vad/va gør du? (What do you do?)
Vem kommer? (Who is coming?)
```

### 6.2 Negation

**Main Clauses**: `ikke` after finite verb

```

Jei arbeider ikke.
I don't work.

Hun kan ikke komme.
She can't come.
```

**Subordinate Clauses**: `ikke` before main verb

```

Jei vet att hun ikke arbeider.
I know that she doesn't work.
```

### 6.3 Article System

| Type | Common | Neuter | Plural |
|------|--------|--------|--------|
| Indefinite | en | ett | - |
| Definite (bound) | -en | -et | -arna |
| Definite (free) | den | det | de |

**Examples**:

```

en bil → bilen → bilar → bilarna
ett hus → huset → husar → husarna
den store bilen (the big car)
det store huset (the big house)
```

Preserved: option of using indefinite versions with den/det:

```

den store bil (the big car)
det store hus (the big house)
```

## 7. Alternative Spellings

### 7.1 Vowel System Alternatives

**Philosophy**: Support both Scandinavian vowel traditions as valid alternatives.

**Primary System (Norwegian/Danish)**:
- Uses æ, ø following Norwegian and Danish orthographic tradition
- Familiar to Norwegian and Danish speakers
- Traditional Scandinavian appearance

**Alternative System (Swedish/German)**:
- Uses ä, ö following Swedish and German orthographic tradition
- Familiar to Swedish speakers and German language learners
- International Germanic appearance

**Examples**:

```

Primary:     Alternative:
hæst        häst (horse)
døra        döra (door)
grønnsaker  grönsaker (vegetables)
brød        bröd (bread)
høj         höj (high)
```

### 7.2 Question Word Alternatives

**Multiple valid forms to accommodate regional pronunciation**:

```

Primary → Alternatives
vad     → va (short form, common in speech)
varför  → vorfor (Norwegian/Danish pronunciation)
ven     → vornår, når, när (multiple "when" variants)
```

**Rationale**: Recognizes that different Scandinavian speakers pronounce question words differently, providing flexibility while maintaining the systematic v- pattern.

### 7.3 Sound Pattern Alternatives

**Danish Sound Pattern Support**:

```

Normalized: Preserved Alternative:
jei        jeg (Danish ej pattern)
vær       vejr (Danish ej pattern)
nei        nej (Danish ej pattern)
```

**Both forms accepted**: Speakers can choose between normalized (phonetic) and traditional (etymological) spellings.

### 7.4 Alternative Spelling Policy

**Implementation Principles**:
1. **Morphological consistency preserved**: Alternative spellings don't affect grammatical endings
2. **Recognition over production**: All forms recognized, one form recommended for learning
3. **Regional accommodation**: Reflects natural pronunciation differences
4. **Systematic application**: Alternatives generated systematically, not ad-hoc
5. **User choice**: Individuals can choose preferred spelling system

## 8. Examples and Usage

### 8.1 Basic Sentences

```

Jei arbeider i Stockholm.
I work in Stockholm.

De store jentar snakker nordum.
The big girls speak Nordum.

Kan du jælpe mig?
Can you help me?

Vi skal køpe en ny computer.
We will buy a new computer.

Vi gamer hele natta.
We game all night.

Hun streamer på Twitch.
She streams on Twitch.

De sender memes i chatten.
They send memes in the chat.

Han spiller e-sport turnering på helga/i weekenden.
He plays an e-sports tournament on the weekend.

Vi chatter og lager/laver content på TikTok.
We chat and create content on TikTok.

Jei vil å lære nordum.
I want to learn Nordum.

Det er lett å snakke språket.
It is easy to speak the language.

Hun begynte å arbeide i går.
She began to work yesterday.

Vi skal prøve å skrive en email.
We will try to write an email.

De liker å game om kvelden.
They like to game in the evening.
```

### 8.2 Alternative Spelling Examples

**Using Primary Vowels (æ/ø)**:
```

Jei køber/køper en hæst till døren.
I buy a horse for the door.

Å køpe en ny computer er viktig.
To buy a new computer is important.

Det er gøy å lære nordum.
It is fun to learn Nordum.
```

**Using Alternative Vowels (ä/ö)**:
```

Jei köber/köper en häst till dören.
I buy a horse for the door.

Å köpe en ny computer er viktig.
To buy a new computer is important.

Det är göy å läre nordum.
It is fun to learn Nordum.
```

**Using Question Word Variants**:
```

Vad/Va gør du?
What do you do?

Varfør/Vorfor kommer du?
Why are you coming?
```

### 8.3 Technical Communication

**English Loanword Integration**:
```

Jei arbeider med software development på min computer.
I work with software development on my computer.

Kan du sende en email till teamet?
Can you send an email to the team?

Vi skal downloade den nye app fra websitet.
We will download the new app from the website.
```

### 8.4 Morphological Distinctions in Context

Verb vs Noun Plural:

```

Kvinnan arbeider. (The woman works - VERB)
Jentar arbeider hær. (Girls work here - NOUN + VERB)
```

Adjective Comparison:

```

Huset er stort. (The house is big)
Huset er større æn bilen. (The house is bigger than the car)
Det er det største huset. (It is the biggest house)
```

### 8.5 Numbers in Context

```

Jei er femti år gammel. (I am fifty years old)
Vi har seksti studenter. (We have sixty students)
Hun bor på syttiende gatan. (She lives on seventieth street)
```

### 8.6 Comprehensive Text Example

```

I dag arbeider de store jentar i huset med sina nya computere.
De snakker nordum mykket bra och kann skrive email på språket.
Varfør lærer de nordum? Fordi det er en praktisk språk for alla skandinavere.
Vad tykker du om det?

Today the big girls work in the house with their new computers.
They speak Nordum very well and can write email in the language.
Why do they learn Nordum? Because it is a practical language for all Scandinavians.
What do you think about it?
```

**Alternative Spelling Version**:

```

I dag arbeider de stora jäntar i huset med sina nya computere.
De snakker nordum mykket bra og kann skrive email på språket.
Vorfor lærer de nordum? Fordi det er ett praktisk språk for alle skandinavare.
Va tykker du om det?
```

## 9. Key Differences for native speakers

### 9.1 Norwegian Writers

- Past tense forms: `arbeidede` may feel Danish/archaic; optional `arbeida` is closer to spoken Norwegian.
- Plural forms of nouns: `jentar` may look odd initially.
- Articles: Bound definite suffixes (`-en, -et`) function much like Bokmål, but plural definite `-arna` differs from Norwegian `-ene`.
- Question words: `va, vor, når` instead of Norwegian `hva, hvor, når`.
- English loanwords: `computer` and `internet` rather than `datamaskin` and `internett`.


---

### 9.2 Danish Writers

- Numbers: Uses `sytti, åtti, nitti` instead of Danish `halvfjerds, firs, halvfems`.
- Past tense: `arbeidede` matches Danish well, but optional `arbeida` reflects Norwegian/Swedish youth usage.
- Plural forms: `flikkar`/`jentar`/`pijar` vs Danish `piger`; expect more -ar endings than in Danish.
- Question words: `va, vorfor, vornår` instead of Danish `hvad, hvorfor, hvornår`.
- Double consonants: Are allowed even at the end of words for consistency. So `katt, skakk` instead of `kat, skak`. Note: The conjunction "att" (meaning "that") is spelled with double t to distinguish it from the infinitive marker "å".
- Some cases of [ð] will always spelled with `d` while others will have a primary spelling with `t` (`flod` vs `heter`). These are not always consistent with Danish pronounciation as Norwegian/Swedish pronounciation determine which spelling is used. Spelling with `d` is allowed as a secondary option when `t` is the primary spelling.

---

### 9.3 Swedish Writers

- Present tense verbs: Always `-er` (e.g. `arbeider`) instead of Swedish `-ar` (`arbetar`).
- Plural forms: `pijar`, `jentar` or `flikkar` instead of Swedish `flickor`.
- Definite plural suffix: `-arna` is familiar but may appear after unfamiliar stems.
- Numbers: `sytti, åtti, nitti` instead of Swedish `sjuttio, åttio, nittio`.
- Question words: `va, var, varfor, när`—close to Swedish but even Dansih/Norwegian versions may appear (`vor, vorfor, når`).
- English loanwords: `computer` and `cool` rather than `dator` and `kul`.
- `kk` instead of `ck`

## 10 Version Control

**Semantic Versioning Implementation**:
- Current version: MAJOR.MINOR.PATCH+timestamp format
- Change tracking: Complete changelog with rationale
- Breaking change identification: Clear version increment rules
- Release stability: Production-ready version management

---

**Document Version**: 0.9.1
**Last Updated**: 2025-09-19
**Status**: Complete Linguistic Reference
**Language Version**: Nordum 0.9.0+production

This specification serves as the authoritative reference for the Nordum pan-Scandinavian language, covering all linguistic features, rules, and usage patterns. For technical implementation details, build systems, and development information, see the project README.md and developer documentation.
