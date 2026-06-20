---
name: find-duplicates
description: Use when detecting movies that appear under multiple slugs or with near-identical titles/URLs. Triggered by /find-duplicates.
---

# find-duplicates

Scan the catalog for duplicate or near-duplicate movie entries and resolve them.

## Trigger

```
/find-duplicates
```

## Steps

### 1. Load index

```bash
python3 -c "import json; print(json.dumps(json.load(open('db/index.json')), indent=2))"
```

Build an in-memory list of all entries with `slug`, `title.en`, `title.km`.

### 2. Build normalized title index

For each `title.en`: lowercase → strip punctuation → remove stop words (`the a an of and in`).

### 3. Detect duplicate candidates

Run all four checks:

| Type          | Rule                                                              |
|---------------|-------------------------------------------------------------------|
| EXACT_TITLE   | Normalized EN titles are identical                                |
| FUZZY_TITLE   | Levenshtein distance ≤ 3 between normalized EN titles             |
| SAME_KM       | `title.km` strings are identical (exact)                          |
| SAME_URL      | `episodes[0].url` in two different `db/<slug>.json` files matches |

For SAME_URL: load each `db/<slug>.json` and compare first episode URLs.

### 4. Report findings

```
DUPLICATE CANDIDATES:
────────────────────
[EXACT_TITLE]  slug-a  "Happy Ghost"      ==  slug-b  "Happy Ghost"
[FUZZY_TITLE]  slug-a  "Big Mouth"        ≈≈  slug-b  "Big Mouth 2025"  (distance=3)
[SAME_KM]      slug-a  "ភ្លើងស្នេហ៍"     ==  slug-b  "ភ្លើងស្នេហ៍"
[SAME_URL]     slug-a  ep1-url            ==  slug-b  ep1-url

slug-a: year=2023  rating=7.1  episodes=20  genres=[DRAMA]
slug-b: year=2023  rating=7.3  episodes=22  genres=[DRAMA, ROMANCE]
```

### 5. Ask user for each group

Options per group: `keep both` / `merge` / `delete <slug>`.

### 6. Execute decision

**merge**: combine episode lists (deduplicate by URL), take higher rating, union of genre sets, keep the slug with more metadata. Update `db/index.json` and write merged `db/<slug>.json`. Delete the retired slug's JSON and index entry.

**delete**: remove entry from `db/index.json` array, delete `db/<slug>.json`.

**keep both**: skip.

### 7. Validate & commit

```bash
python3 -c "import json; json.load(open('db/index.json'))"
npm test
git add db/
git commit -m "fix: resolve N duplicate movie entries"
git push
```
