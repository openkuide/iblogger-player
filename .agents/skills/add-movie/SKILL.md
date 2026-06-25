---
name: add-movie
description: Use when the user wants to add a new movie or drama to the catalog. Triggered by a URL + Khmer/English title + optional hints (douyin, shortfilm, TVB, Korean drama, Chinese ancient, etc.).
---

# add-movie

Add a movie to `db/<slug>.json` and register it in `db/index.json`.

## Input Format

The user passes (in any order):
```
<ep1-url>  <Khmer title>  <English title or hints>
```
Example — Douyin short:
```
add new movie https://raw.githubusercontent.com/chamrong-thor/ishortvdos/refs/heads/d/x/index.single douyin ឆ្លងភពមកធ្វើជាសេដ្ឋីលំដាប់លេខ១ chinese ancient
```
Example — multi-episode drama:
```
add new movie https://raw.githubusercontent.com/.../refs/heads/c1/x/index.single 25 episodes TVB Big Mouth ប្ដីខ្ញុំជា "Big Mouth"
```

---

## Step 1 — Detect Movie Type

| Signal in input | Type |
|---|---|
| "douyin", "shortfilm", "short", single URL with no episode count | **SHORTFILM** |
| "TVB", "Korean", "drama", "Chinese drama", episode count given, URL has `c1` in branch | **DRAMA** |

---

## Step 2 — Generate Slug

Slug = English title in lowercase kebab-case. Strip special chars.

```
"Reborn as the Wealthiest Tycoon"  →  reborn-as-the-wealthiest-tycoon
"Big Mouth"                        →  big-mouth
```

If user gave no English title, derive one from the Khmer hint or research.

---

## Step 3A — SHORTFILM path (Douyin / vertical short)

**Research:** Use web search for the Khmer title to confirm English title, year, country, plot.

**Genres** — pick all that apply: `ACTION`, `DRAMA`, `ROMANCE`, `COMEDY`, `FANTASY`, `THRILLER`, `HORROR`, `SHORTFILM` (always include `SHORTFILM`).

**Typical Douyin sub-genres by hint:**

| Hint | Add genres |
|---|---|
| chinese ancient / 古装 | ACTION, DRAMA, FANTASY |
| cultivation / xianxia | ACTION, DRAMA, FANTASY |
| romance / sweet | ROMANCE, DRAMA |
| comedy | COMEDY, DRAMA |
| revenge / reborn | ACTION, DRAMA, FANTASY |

**Write `db/<slug>.json`:**
```json
{
  "slug": "<slug>",
  "title": { "en": "<English title>", "km": "<Khmer title>" },
  "description": {
    "en": "<3-4 sentence vivid English synopsis — what happens, why it is satisfying, what the hook is>",
    "km": "<same 3-4 sentences in natural Khmer — not word-for-word translation, feel native>"
  },
  "poster": "./assets/images/<slug>.png",
  "year": <year, default 2024>,
  "rating": 8.2,
  "genres": ["ACTION","DRAMA","FANTASY","SHORTFILM"],
  "language": "Khmer",
  "episodeCount": 1,
  "episodes": [
    {
      "ep": "1",
      "title": { "en": "Full Movie", "km": "មួយរឿងពេញ" },
      "url": "<the url>",
      "type": "M3U8",
      "final": true
    }
  ],
  "country": "China"
}
```

**Register in `db/index.json`** — prepend this object to the array:
```json
{
  "slug": "<slug>",
  "title": { "en": "<en>", "km": "<km>" },
  "poster": "./assets/images/<slug>.png",
  "year": <year>,
  "rating": 8.2,
  "genres": ["ACTION","DRAMA","FANTASY","SHORTFILM"],
  "episodeCount": 1,
  "country": "China"
}
```

---

## Step 3B — DRAMA path (TVB / Korean / Chinese long-form)

**Research with web search** — search `"<title>" drama site:mydramalist.com OR site:imdb.com` and gather:
- Original title, English title, year, country
- Episode count (confirm or use what user said)
- Genres, cast, plot summary
- Poster image URL (IMDB or MDL — use direct image URL)

**Episode URL pattern** — URL has `c1` in the branch name. Generate all episodes by incrementing:
```
base:    https://raw.githubusercontent.com/USER/REPO/refs/heads/c1/x/index.single
ep N:    replace "c1" → "cN"
```
Set `"final": true` only on the last episode. All others `"final": false`.

**Episode Khmer title:** `"km": "ភាគទី<N>"` (Arabic numerals, not Khmer numerals).

**Write `db/<slug>.json`:**
```json
{
  "slug": "<slug>",
  "title": { "en": "<en>", "km": "<km>" },
  "description": {
    "en": "<rich 4-6 sentence plot synopsis in English — introduce leads, central conflict, tone, hook>",
    "km": "<same in natural flowing Khmer — parallel structure but native-feeling, not a dictionary translation>"
  },
  "poster": "<imdb/mdl direct image url or ./assets/images/<slug>.png>",
  "year": <year>,
  "rating": <imdb/mdl rating, round to 1 decimal — default 8.0 if unknown>,
  "genres": [<researched genres in SCREAMING_SNAKE_CASE>],
  "language": "Khmer",
  "episodeCount": <N>,
  "episodes": [
    { "ep": "1",  "title": { "en": "Episode 1",  "km": "ភាគទី1"  }, "url": "...c1...",  "type": "M3U8", "final": false },
    { "ep": "2",  "title": { "en": "Episode 2",  "km": "ភាគទី2"  }, "url": "...c2...",  "type": "M3U8", "final": false },
    ...
    { "ep": "<N>","title": { "en": "Episode <N>","km": "ភាគទី<N>" }, "url": "...c<N>...","type": "M3U8", "final": true  }
  ],
  "country": "<Korea|China|HongKong|Thailand|Japan>"
}
```

**Register in `db/index.json`** — prepend:
```json
{
  "slug": "<slug>",
  "title": { "en": "<en>", "km": "<km>" },
  "poster": "<poster url>",
  "year": <year>,
  "rating": <rating>,
  "genres": [<genres>],
  "episodeCount": <N>,
  "country": "<country>"
}
```

---

## Step 4 — Write files

1. **`db/<slug>.json`** — write the full detail JSON (compact, no pretty-print).
2. **`db/index.json`** — read current array, prepend the new index entry, write back (compact).

Both must be valid JSON. Run a mental parse before writing. Never drop the `km` side.

---

## Step 5 — Confirm to user

Report:
```
✓ db/<slug>.json created (<N> episode(s))
✓ db/index.json updated — "<English title>" prepended at position 0
Poster needed: ./assets/images/<slug>.png  ← add manually or link an image URL
```

---

## Rules

- **Both `en` and `km` are mandatory** on every bilingual field. Never drop Khmer.
- **`db/` is written output** — write files directly, do not run `build-db.py`.
- **Slug must be unique** — grep `db/index.json` for the slug before writing.
- **Descriptions must be compelling** — not a plot spoiler dump. Think movie trailer narration.
- **`rating`** — use research source if available; default 8.2 for Douyin shorts, 8.0 for dramas.
- **`language`** — always `"Khmer"` (all content is Khmer-dubbed on this platform).
- **Poster** — For official dramas, if no URL is available, use `"./assets/images/<slug>.png"` and remind the user to add it. For Douyin Chinese short movies, always generate a high-quality cinematic PNG poster using the `generate_image` tool, save it locally to `assets/images/<slug>.png`, and reference it in the metadata. The prompt should specify a cinematic ancient/modern Chinese drama poster style with character actions, clothing, lighting, palace/modern settings, and must explicitly request to include the stylized English title of the movie written clearly on the poster (e.g. as a main title text overlay).
