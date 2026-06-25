---
name: enrich-movie
description: Use when the user wants to improve, update, or fix existing movie metadata — descriptions, year, rating, genres, poster images. Handles Douyin shorts (description rewrite only) and official dramas (full web research). Triggered by /enrich-movie.
---

# enrich-movie

Improve existing `db/<slug>.json` entries. Official dramas get full metadata refresh from web research. Douyin shorts get a punchy description rewrite. Both get a generated SVG poster if one is missing.

## Input

```
/enrich-movie <slug>       ← improve one specific movie
/enrich-movie --all        ← scan all entries (max 10 per run, report rest as skipped)
```

---

## Step 1 — Read current data

Read `db/<slug>.json`. Detect type:

| Condition | Type |
|---|---|
| `genres` includes `SHORTFILM` | **Douyin short** |
| Otherwise | **Official drama** |

---

## Step 2A — Douyin Short path

**What to touch:** description only. Everything else stays exactly as-is.

**Rewrite `description.en`** — hook-first, punchy, 3-4 sentences, Douyin/trailer energy:
- Sentence 1: Drop the viewer into the most satisfying/surprising moment
- Sentence 2-3: Explain the premise and what makes it addictive
- Sentence 4: Tease the payoff without spoiling it
- Tone: confident, exciting — like a caption that makes someone stop scrolling

**Good example tone:**
> "He went from broke and disgraced to the most feared man in ancient China — overnight. Armed with modern knowledge and zero patience for corrupt nobles, this transmigrated CEO rewrites the rules of every dynasty that ever underestimated him. The era just got a new boss. Watch him collect debts."

**Rewrite `description.km`** — not a word-for-word translation. Write it fresh in natural Khmer that flows the same way. Same energy, same structure.

**Poster check** — if `poster` is missing, is a `.svg` file/placeholder, or the referenced image file does not exist on disk:
→ Generate a premium high-quality cinematic PNG poster using the `generate_image` tool, ensuring the prompt explicitly asks to include the stylized English title of the movie written clearly on the poster (e.g. as a main title text overlay).
→ Save the generated PNG to `assets/images/<slug>.png`.
→ Update `poster` field to `./assets/images/<slug>.png`.

---

## Step 2B — Official Drama path

**Web research** — search: `"<title.en>" drama site:mydramalist.com OR site:imdb.com`

Update these fields from official sources:

| Field | Rule |
|---|---|
| `title.en` | Official romanized/English title |
| `title.km` | Keep existing Khmer title unless clearly wrong |
| `year` | Confirmed first-air / release year |
| `rating` | IMDb or MDL score, 1 decimal (e.g. `8.5`) |
| `genres` | From MDL/IMDb — `SCREAMING_SNAKE_CASE`, e.g. `["ACTION","ROMANCE","DRAMA"]` |
| `country` | From official source (`Korea`, `China`, `HongKong`, `Thailand`, `Japan`) |
| `description.en` | Rich 4-6 sentence synopsis — introduce leads, central conflict, tone, hook — not a spoiler dump |
| `description.km` | Natural flowing Khmer — same structure, native-feeling, not dictionary-translated |
| `poster` | Direct image URL from IMDb (`m.media-amazon.com/images/...`) or MDL |

**Never change:** `slug`, `language`, `episodeCount`, `episodes`

**Poster** — search: `"<title.en>" poster filetype:jpg site:imdb.com`
Use `m.media-amazon.com` direct image links. If search fails, leave existing poster.

---

## Step 3 — SVG Poster Template

Use this when a Douyin short has a missing local poster file.
Fill in `KM_TITLE`, `EN_TITLE`, `YEAR`, `COUNTRY`. Truncate to 22 chars + `…` if longer.

```svg
<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f0c29"/>
      <stop offset="50%" stop-color="#302b63"/>
      <stop offset="100%" stop-color="#24243e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="300" height="450" fill="url(#bg)"/>
  <rect x="0" y="0" width="300" height="4" fill="url(#accent)"/>
  <!-- Film frame marks -->
  <rect x="10" y="14" width="12" height="18" rx="2" fill="none" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
  <rect x="278" y="14" width="12" height="18" rx="2" fill="none" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
  <!-- Play icon -->
  <circle cx="150" cy="175" r="46" fill="none" stroke="url(#accent)" stroke-width="2" opacity="0.6"/>
  <polygon points="138,156 138,194 176,175" fill="url(#accent)" opacity="0.85"/>
  <!-- Khmer title -->
  <text x="150" y="262" font-family="sans-serif" font-size="14" fill="#ffffff" text-anchor="middle" font-weight="600">KM_TITLE</text>
  <!-- English title -->
  <text x="150" y="284" font-family="sans-serif" font-size="10" fill="#a78bfa" text-anchor="middle">EN_TITLE</text>
  <!-- Divider -->
  <line x1="60" y1="302" x2="240" y2="302" stroke="url(#accent)" stroke-width="0.5" opacity="0.4"/>
  <!-- Year · Country -->
  <text x="150" y="322" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">YEAR · COUNTRY · SHORTFILM</text>
  <rect x="0" y="446" width="300" height="4" fill="url(#accent)"/>
</svg>
```

---

## Step 4 — Write files

1. **`db/<slug>.json`** — write updated compact JSON (single line, no pretty-print).
2. **`db/index.json`** — find entry by `slug`, update: `title`, `year`, `rating`, `genres`, `poster`. Keep all other entries untouched.
3. **`assets/images/<slug>.svg`** — only if SVG was generated in Step 2A.

---

## Step 5 — Report changes

```
✓ db/<slug>.json updated
✓ db/index.json entry patched
✓ assets/images/<slug>.svg generated   ← only if SVG was created

Changes made:
  year:        2022 → 2023
  rating:      8.0 → 8.4
  poster:      ./assets/images/... → https://m.media-amazon.com/...
  description: rewritten (EN + KM)
```

If `--all` mode: list the first 10 processed and note how many remain.

---

## Rules

- **Never drop `km`** — both `en` and `km` are required on every bilingual field.
- **Never change `slug`** — it is the URL key; changing it breaks existing links.
- **Never touch `episodes`** — the URL list is managed separately.
- **Compact JSON only** — no pretty-printing; write as a single-line object.
- **For Douyin shorts** — only the description changes. Year, genres, title, country stay.
- **Rating default** — if no reliable source found, keep existing rating; never guess.
- **Poster fallback** — if no image URL found via search, keep the existing poster value.
