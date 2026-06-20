---
name: generate-poster
description: Use when generating SVG poster art for one or all movies. Triggered by /generate-poster <slug> or /generate-poster --missing.
---

# generate-poster

Generate a 300×450px SVG poster for a movie and wire it into the catalog.

## Trigger

```
/generate-poster <slug>          # one movie, overwrite if exists
/generate-poster --missing       # batch all movies where poster is absent
```

## Steps

### 1. Load data

```bash
cat db/<slug>.json
```

Extract: `title.km`, `title.en`, `genres[0]` (primary), `year`, `rating`.

### 2. Decide overwrite

- `<slug>` form: always overwrite.
- `--missing` form: skip if `poster` is already set.

### 3. Pick design by primary genre

| Genre       | bg        | accent / motif                                   |
|-------------|-----------|--------------------------------------------------|
| ACTION      | `#0d1117` | red/orange diagonal slash, bold title, sword icon |
| HORROR      | `#0a0a0a` | blood-red drip gradient, eerie green glow, skull  |
| ROMANCE     | `#1a0a0f` | pink-to-gold gradient, heart motif, soft glow     |
| FANTASY     | `#0a0a1a` | purple-to-cyan gradient, star dots, magic circle  |
| COMEDY      | `#1a1000` | bright yellow accent, rounded shapes              |
| THRILLER    | `#111111` | cold blue-grey, sharp diagonal lines, eye motif   |
| DRAMA       | `#0a1a1a` | silver/white gradient, letterbox bars top+bottom  |
| DOCUMENTARY | `#111a1a` | muted gold, film-strip border                     |
| ANIMATION   | dark purple | rainbow gradient arc, star burst               |
| SCI_FI      | `#000008` | neon cyan grid lines, hexagon pattern             |
| SHORTFILM   | genre-matched | accent color, "SHORT" badge top-right         |
| _(default)_ | `#1a1a1a` | gradient accent, primary color                    |

### 4. Required elements in every SVG

- Khmer title: top 2/3, large white text, word-wrapped (`<text>` with `<tspan>` lines)
- English title: below Khmer, smaller, muted (opacity 0.7)
- Year badge: bottom-left rectangle
- Rating badge: bottom-right (e.g. `★ 8.2`), only if `rating` present
- Watermark: `iblogger` bottom-center, tiny, semi-transparent (opacity 0.3)

### 5. Write files

```bash
mkdir -p db/posters
# write SVG string to:
db/posters/<slug>.svg
```

### 6. Update JSON

In `db/<slug>.json`: set `"poster": "db/posters/<slug>.svg"`.
In `db/index.json`: find the entry with matching `slug`, set same `poster` value.

### 7. Validate

```bash
node --check assets/js/app.js   # sanity; catalog is JSON not JS but catches env issues
python3 -c "import json; json.load(open('db/<slug>.json'))"
python3 -c "import json; json.load(open('db/index.json'))"
```

### 8. Test & commit

```bash
npm test
git add db/posters/<slug>.svg db/<slug>.json db/index.json
git commit -m "feat: generate SVG poster for <slug>"
git push
```

For `--missing` batch: commit message `feat: generate SVG posters for N movies`.
