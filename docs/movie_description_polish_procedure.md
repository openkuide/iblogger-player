# Global Movie Description Polish & Audit Procedure

This document outlines the standardized, step-by-step procedure for writing, polishing, translating, and auditing movie descriptions in the database. Adhering to this procedure ensures that the descriptions are narrative-rich, emotionally engaging ("touching"), bilingual, and linguistically accurate in both English and Khmer.

---

## 📌 មាតិកា (Table of Contents)
1. [Phase 1: Emotional Narrative Expansion (English)](#1)
2. [Phase 2: Khmer Natural Translation & Register](#2)
3. [Phase 3: Technical Khmer Unicode Sequence Audit](#3)
4. [Phase 4: Responsive Spacing & Browser Wrapping](#4)
5. [Phase 5: JSON Formatting & Integration checklist](#5)

---

<a id="1"></a>
## ១. Phase 1: Emotional Narrative Expansion (English)

Descriptions must draw in the audience by highlighting key characters, conflicts, and emotional turning points rather than just listing plot events.

* **Length**: Standardize on 2 to 3 paragraphs (approx. 100–180 words total).
* **Depth**: Cover the setup, the inciting incident, and the emotional stakes.
* **Flow**:
  - **Paragraph 1 (The Setup)**: Introduce the protagonist, their background, and their environment.
  - **Paragraph 2 (The Conflict)**: Explain the major challenge, dilemma, or tragedy they face.
  - **Paragraph 3 (The Stakes)**: Highlight what they stand to lose, the emotional tension, or the philosophical themes of the movie.

---

<a id="2"></a>
## ២. Phase 2: Khmer Natural Translation & Register

The Khmer description must read naturally to native speakers, avoiding literal word-for-word machine translation.

* **Formal Register**: Use formal literary vocabulary:
  - Use **ភរិយា** (wife) instead of **ប្រពន្ធ**.
  - Use **ស្វាមី** (husband) instead of **ប្ដី**.
  - Use **ទទួលមរណភាព** / **បាត់បង់ជីវិត** (passed away / lost life) instead of **ស្លាប់** or **ងាប់**.
  - Use **កុមារភាព** (childhood) instead of **ក្មេង**.
* **Bilingual Formatting**: For character names and proper locations, use `Khmer (English)` on first mention to maintain clarity.
  - **Example**: `ហាន ថេសាង (Han Tae Sang)`
* **Spelling & Compounds**: Cross-verify compound words against the standard Chuon Nath dictionary to prevent phonetic spelling mistakes (e.g. use **ភ្នក់ភ្លើង** for a pit of fire, never **ភ្នក្លើង**).

---

<a id="3"></a>
## ៣. Phase 3: Technical Khmer Unicode Sequence Audit

Khmer Unicode characters must be inputted in their strict logical sequence to prevent search failures and cross-browser rendering bugs.

### The Correct Order of Input:
For every syllable or character cluster, type in this sequence:
1. **Consonant** (or Independent Vowel, e.g. `ក`, `ខ`, `ឥ`, `ឪ`)
2. **Subscript** (`្` + Subscript Consonant, e.g. `្` + `ម` ➔ `្ម`)
3. **Dependent Vowel** (e.g. `ា`, `ិ`, `ី`, `ុ`, `ូ`, `ោ`, `ៅ`)
4. **Diacritic / Accent** (e.g. `ំ`, `ៈ`, `័`, `៍`, `៌`, `៏`)

> [!WARNING]
> **Common Ordering Mistakes**:
> - **Incorrect**: Consonant ➔ Dependent Vowel ➔ Subscript (e.g., `ក` + `ា` + `្` + `ម` ➔ `កា្ម` ❌)
> - **Correct**: Consonant ➔ Subscript ➔ Dependent Vowel (e.g., `ក` + `្` + `ម` + `ា` ➔ `ក្មា` ✅)
> - **Incorrect**: Diacritic before vowel (e.g., `ក` + `ំ` + `ុ` ❌)
> - **Correct**: Vowel before diacritic (e.g., `ក` + `ុ` + `ំ` ➔ `កុំ` ✅)

---

<a id="4"></a>
## ៤. Phase 4: Responsive Spacing & Browser Wrapping

Because Khmer does not use spaces between words, browsers cannot wrap lines responsively, which leads to layout overflow on mobile screens. We solve this using a hybrid spacing strategy.

### Zero-Width Space (ZWSP / `\u200B`)
* **Rule**: Inject a Zero-Width Space (`\u200B`) at the boundary between words inside a clause or sentence.
* **Warning**: Do NOT place ZWSP inside a single word, between a consonant and its subscript, or between a consonant and its dependent vowel.
* **Why**: This tells the browser's rendering engine where it is safe to split a line, preventing clipped layout.

### Regular Space (` `)
* **Rule**: Use standard visible spaces *only* between clauses, sentences, list numbers, or list items.
* **Warning**: Never place a regular space between adjacent words inside a single clause.

---

<a id="5"></a>
## ៥. Phase 5: JSON Formatting & Integration checklist

When writing descriptions back to a movie JSON file:

1. **Escaping**: Escape double quotes (`\"`) inside the description text.
2. **Paragraph Breaks**: Use `\n\n` for paragraph breaks inside the string.
3. **Structure**: Keep the standard schema intact:
   ```json
   {
     "slug": "movie-slug",
     "title": {
       "en": "English Title",
       "km": "Khmer Title"
     },
     "description": {
       "en": "Expanded English description...",
       "km": "Polished, audited Khmer description..."
     },
     ...
   }
   ```
4. **Validation**: Validate the updated JSON using `JSON.parse` or a linting script before committing.
