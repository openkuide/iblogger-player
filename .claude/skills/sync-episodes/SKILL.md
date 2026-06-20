---
name: sync-episodes
description: Use when a drama is still airing and the user wants to append new episodes to an existing series. Triggered by /sync-episodes <slug>.
---

# sync-episodes

Append newly released episodes to an existing drama without touching metadata.

## Step 1 — Load and display current state

Read `db/<slug>.json`. Show:

```
Title:      <title.en> / <title.km>
Episodes:   <episodeCount>
Last ep:    ep <N> — <last episode URL>
Final flag: <true|false on last episode>
```

## Step 2 — Ask how many to add

Prompt: `How many new episodes to add? Current last is ep <N>.`

Wait for the user's answer (e.g. `3`).

## Step 3 — Generate new episode URLs

Inspect the last episode URL for the branch segment pattern:

- Pattern `cN` (e.g. `refs/heads/c25/`) → increment: `c26`, `c27`, …
- Pattern `s<S>c<N>` (e.g. `refs/heads/s2c10/`) → increment the `cN` part only: `s2c11`, …
- Unknown pattern → ask user: `Cannot detect URL pattern. Please paste the URL for ep <N+1>.` Then increment from that base.

## Step 4 — Build new episode objects

For each new episode (ep numbers continue from current last):

```json
{
  "ep": "<N>",
  "title": { "en": "Episode <N>", "km": "ភាគទី<N>" },
  "url": "<incremented-url>",
  "type": "M3U8",
  "final": false
}
```

Set `"final": true` only on the very last new episode. Set `"final": false` on all others, including the previously-last episode if it had `"final": true`.

## Step 5 — Update the detail file

In `db/<slug>.json`:
1. Remove `final: true` from the old last episode (set to `false`)
2. Append all new episode objects to `episodes[]`
3. Update `episodeCount` to new total

## Step 6 — Update the index file

In `db/index.json`, find the entry where `slug === "<slug>"` and update `episodeCount` to the new total.

## Step 7 — Validate, test, commit

Validate both files are valid JSON. Run `npm test`. Commit:

```
feat: sync episodes for <slug> (ep <old-last>→<new-last>)
```

Push.

## Rules

- Khmer episode titles use Arabic numerals: `ភាគទី26` not Khmer digits.
- Never modify `title`, `description`, `poster`, `year`, `rating`, `genres`, or `country`.
- `final: true` must appear on exactly one episode — the new last one.
- Never drop the `km` side of any bilingual field while editing the array.
