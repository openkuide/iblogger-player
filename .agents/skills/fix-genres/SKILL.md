---
name: fix-genres
description: Use when the user wants to audit or correct genre tags on one movie or the entire catalog. Triggered by /fix-genres <slug> or /fix-genres --all.
---

# fix-genres

Infer correct genres from title and description, diff against current values, confirm, then write.

## Valid genre values

`ACTION` `ANIMATION` `COMEDY` `DOCUMENTARY` `DRAMA` `FANTASY` `HORROR` `ROMANCE` `SCI_FI` `THRILLER` `SHORTFILM`

## Step 1 — Collect targets

- `/fix-genres --all` → read every slug from `db/index.json`
- `/fix-genres <slug>` → just that one movie

## Step 2 — Load movie data

For each movie read from `db/<slug>.json`: `title.en`, `title.km`, `description.en`, current `genres`, `episodeCount`.

## Step 3 — Infer genres

Apply keyword matching to title + description (case-insensitive):

| Keywords | Genres |
|---|---|
| kung fu, martial, fight, sword, warrior, battle | ACTION |
| love, wife, husband, heart, romance, sweet, devoted | ROMANCE |
| ghost, horror, demon, haunted, spirit, curse | HORROR |
| emperor, ancient, dynasty, palace, kingdom, xianxia, cultivation | FANTASY, DRAMA |
| comedy, laugh, silly, funny, hilarious, prank | COMEDY |
| spy, agent, mission, assassin, undercover | THRILLER |
| detective, police, crime, murder, investigation | THRILLER, DRAMA |
| magic, system, transmigrate, reborn, isekai, reincarnate | FANTASY |
| documentary, real, history, biography | DOCUMENTARY |
| cartoon, animation, anime, animated | ANIMATION |
| space, robot, future, sci-fi, cyberpunk, alien | SCI_FI |

- Always add `DRAMA` when the story has character arcs (multi-episode series default to DRAMA unless purely comedy/action).
- Keep `SHORTFILM` if `episodeCount === 1`.
- If title + description signals are ambiguous, use web search: `MDL "<title.en>"` or `IMDb "<title.en>"` to confirm genre.

## Step 4 — Show diff and confirm

For each movie where inferred ≠ current, show:

```
<slug>
  current:  [ACTION, DRAMA]
  proposed: [ACTION, DRAMA, ROMANCE]
  reason:   description mentions "devoted husband" and "love"
```

If no change needed for a movie, skip silently.

- Single movie: ask `Apply this change? (y/n)` before writing.
- `--all` with many changes: show full batch diff, then ask `Apply all N changes? (y/n)` (or `y/n` per movie).

## Step 5 — Write changes

For each confirmed change:
1. Update `genres` in `db/<slug>.json`
2. Update `genres` in the matching entry in `db/index.json`

Both files must stay valid JSON. Never drop `km` fields while editing.

## Step 6 — Validate, test, commit

Validate JSON, run `npm test`, commit `fix: update genres for N movies`, push.

## Rules

- Never invent a genre not in the valid list above.
- Prefer specificity: 2–4 genres is ideal; avoid tagging everything as DRAMA+ACTION.
- If the movie is already correct, report `✓ <slug> genres look correct` and skip.
