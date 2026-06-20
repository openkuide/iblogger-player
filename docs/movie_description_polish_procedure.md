# Global Movie Description Polish & Audit Procedure

This document outlines the standardized, step-by-step procedure for writing, polishing, translating, and auditing movie descriptions in the database. Adhering to this procedure ensures that the descriptions are narrative-rich, emotionally engaging ("touching"), bilingual, and linguistically accurate in both English and Khmer.

---

## 📌 Table of Contents
1. [Phase 1: Emotional Narrative Expansion (English)](#1-phase-1-emotional-narrative-expansion-english)
2. [Phase 2: Khmer Natural Translation & Register](#2-phase-2-khmer-natural-translation--register)
3. [Phase 3: Technical Khmer Unicode Sequence Audit](#3-phase-3-technical-khmer-unicode-sequence-audit)
4. [Phase 4: Responsive Spacing & Browser Wrapping](#4-phase-4-responsive-spacing--browser-wrapping)
5. [Phase 5: JSON Formatting & Integration Checklist](#5-phase-5-json-formatting--integration-checklist)

---

## 1. Phase 1: Emotional Narrative Expansion (English)

Descriptions must draw in the audience by highlighting key characters, conflicts, and emotional turning points rather than just listing plot events.

* **Length**: Standardize on 2 to 3 paragraphs (approx. 100–180 words total).
* **Depth**: Cover the setup, the inciting incident, and the emotional stakes.
* **Flow**:
  - **Paragraph 1 (The Setup)**: Introduce the protagonist, their background, and their environment.
  - **Paragraph 2 (The Conflict)**: Explain the major challenge, dilemma, or tragedy they face.
  - **Paragraph 3 (The Stakes)**: Highlight what they stand to lose, the emotional tension, or the philosophical themes of the movie.

### Example comparison
* **❌ Bad (Dry Plot-Listing)**:
  > Jimmy Tong is a taxi driver. He becomes a driver for Clark Devlin. Clark Devlin gets injured. Jimmy puts on Clark's tuxedo. The tuxedo gives him superpowers. He has to stop a villain.
* **✅ Good (Narrative-Rich & Emotionally Engaging)**:
  > Jimmy Tong is a down-on-his-luck taxi driver whose rapid speed and quick reflexes land him a job chauffeuring the billionaire playboy Clark Devlin. When Devlin is hospitalized following a mysterious attack, Jimmy returns to the mansion and puts on Devlin's highly advanced tuxedo.
  > 
  > Suddenly gifted with extraordinary superpowers, Jimmy is thrown headfirst into a high-stakes world of international espionage. To save the world from an environmental catastrophe, he must find the courage to step out from the shadows of his ordinary life and become the hero he was always meant to be.

---

## 2. Phase 2: Khmer Natural Translation & Register

The Khmer description must read naturally to native speakers, avoiding literal word-for-word machine translation.

* **Formal Register**: Use formal literary vocabulary:
  - Use **ភរិយា** (wife) instead of **ប្រពន្ធ**.
  - Use **ស្វាមី** (husband) instead of **ប្ដី**.
  - Use **ទទួលមរណភាព** / **បាត់បង់ជីវិត** (passed away / lost life) instead of **ស្លាប់** or **ងាប់**.
  - Use **កុមារភាព** (childhood) instead of **ក្មេង**.
* **Bilingual Formatting**: For character names and proper locations, use `Khmer (English)` on first mention to maintain clarity.
  - **Example**: `ហាន ថេសាង (Han Tae Sang)`
* **Spelling & Compounds**: Cross-verify compound words against the standard Chuon Nath dictionary to prevent phonetic spelling mistakes (e.g. use **ភ្នក់ភ្លើង** for a pit of fire, never **ភ្នក្លើង**).

### Example comparison
* **❌ Bad (Literal Machine Translation)**:
  > ជីមី ថុង គឺជាអ្នកបើកបរតាក់ស៊ីសំណាងអាក្រក់។ គាត់ទទួលបានការងារធ្វើជាអ្នកបើកបរឱ្យ Clark Devlin។ Clark Devlin ចូលមន្ទីរពេទ្យដោយសារការវាយប្រហារ។ ជីមីពាក់អាវទូស៊ីដូ។
* **✅ Good (Polished Khmer Literary Register)**:
  > ជីមី ថុង (Jimmy Tong) គឺជាអ្នកបើកបរតាក់ស៊ីដ៏កំសត់ម្នាក់ ដែលជោគវាសនាបានផ្លាស់ប្តូរទាំងស្រុង នៅពេលដែលលោកទទួលបានឱកាសការងារជាអ្នកបើកបរផ្ទាល់ខ្លួនជូនមហាសេដ្ឋីល្បីឈ្មោះម្នាក់គឺលោក ខ្លាក ដេវលីន (Clark Devlin)។ បន្ទាប់ពីលោក ដេវលីន បានទទួលរងការវាយប្រហារយ៉ាងអាថ៌កំបាំងរហូតដល់សន្លប់បាត់ស្មារតី ជីមី សម្រេចចិត្តត្រឡប់មកកាន់វីឡា និងសាកល្បងគ្រងអាវធំទូស៊ីដូ (Tuxedo) ដ៏ចម្លែកមួយគ្រឿង...

---

## 3. Phase 3: Technical Khmer Unicode Sequence Audit

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

### Automated Audit Check
You can quickly check if a JSON file contains invalid Unicode ordering sequences in Khmer using command-line regex searches. For example, to check if a vowel occurs *after* a diacritic:
```bash
# Check if any dependent vowel follows a diacritic accent (like a nikahit ំ or cent ៍)
grep -P "[\x{17C6}\x{17C9}-\x{17D3}][\x{17B6}-\x{17C5}]" db/*.json
```

---

## 4. Phase 4: Responsive Spacing & Browser Wrapping

Because Khmer does not use spaces between words, browsers cannot wrap lines responsively, which leads to layout overflow on mobile screens. We solve this using a hybrid spacing strategy.

### Zero-Width Space (ZWSP / `\u200B`)
* **Rule**: Inject a Zero-Width Space (`\u200B`) at the boundary between words inside a clause or sentence.
* **Warning**: Do NOT place ZWSP inside a single word, between a consonant and its subscript, or between a consonant and its dependent vowel.
* **Why**: This tells the browser's rendering engine where it is safe to split a line, preventing clipped layout.

### Regular Space (` `)
* **Rule**: Use standard visible spaces *only* between clauses, sentences, list numbers, or list items.
* **Warning**: Never place a regular space between adjacent words inside a single clause.

---

## 5. Phase 5: JSON Formatting & Integration Checklist

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
4. **Validation**: Validate the updated JSON using `JSON.parse` or a linting script before committing:
   ```bash
   python3 -c "import json; json.load(open('db/movie-slug.json'))"
   ```
