---
name: translate-desc
description: Use when a movie is missing its Khmer or English description or title translation. Triggered by /translate-desc <slug> or /translate-desc --all.
---

# translate-desc

Fill in whichever side of a bilingual description or title is absent.

## Trigger

```
/translate-desc <slug>     # one movie
/translate-desc --all      # every movie with a missing side
```

## Steps

### 1. Load detail file

```bash
cat db/<slug>.json
```

### 2. Normalise description shape

If `description` is a plain string (not `{en, km}`): rewrite it as `{"en": <value>, "km": ""}`.

### 3. Determine what's missing

| State                                        | Action           |
|----------------------------------------------|------------------|
| `description.en` present, `description.km` blank/missing | Translate EN → KM |
| `description.km` present, `description.en` blank/missing | Translate KM → EN |
| Both present and non-empty                   | Report "Both sides present — nothing to do" and exit |

Apply same logic to `title.en` / `title.km`.

### 4. Translation rules

**EN → KM**
- Write in natural Khmer — not word-for-word.
- Use Khmer numerals for numbers.
- Keep proper nouns and the movie title in quotes (« »).
- Match the 3–4 sentence structure of the English source.
- Tone: engaging and cinematic.

**KM → EN**
- Translate naturally; keep character names in their original form + romanized in parentheses on first use.
- Match sentence count of the Khmer source.
- Tone: engaging and cinematic — not a dry plot summary.

### 5. Write updated file

Update `db/<slug>.json` with the completed `description` and `title` objects. Do not alter any other fields.

### 6. Validate

```bash
python3 -c "import json; json.load(open('db/<slug>.json'))"
```

### 7. Batch mode (`--all`)

Process every movie in `db/index.json` where either side of `description` or `title` is blank. Complete all files, then run a single validation pass and single commit.

### 8. Test & commit

```bash
npm test
git add db/
git commit -m "feat: fill missing translations for N movies"
git push
```

Single-movie commit message: `feat: fill missing translations for <slug>`.
