---
name: add-season
description: Use when the user wants to append a full new season of episodes to an existing drama slug. Triggered by /add-season <slug> <first-ep-url> <episode-count>.
---

# add-season

Append a complete new season's episode list to an existing drama, continuing episode numbering from the current last.

## Input

```
/add-season <slug> <first-ep-url> <episode-count>
```

Example:
```
/add-season big-mouth https://raw.githubusercontent.com/user/repo/refs/heads/s2c1/x/index.single 20
```

## Step 1 — Load and display current state

Read `db/<slug>.json`. Show:

```
Title:       <title.en> / <title.km>
Current eps: <episodeCount>
Last ep URL: <last episode URL>
Final flag:  <true|false>
```

## Step 2 — Determine starting episode number

`startEp = current episodeCount + 1`

New episodes will be numbered `startEp` through `startEp + episode-count - 1`.

## Step 3 — Parse URL branch pattern

Inspect `<first-ep-url>` for the branch naming scheme:

| Pattern in URL | Increment rule |
|---|---|
| `s<S>c1` (e.g. `s2c1`) | `s2c1` → `s2c2` → … → `s2cN` |
| `c<N>` only (e.g. `c26`) | `c26` → `c27` → … |
| Unrecognised | Ask user: `Cannot detect pattern. Paste URL for ep <startEp+1>.` then derive. |

## Step 4 — Generate all episode objects

For each episode `i` from 1 to `episode-count`, ep number = `startEp + i - 1`:

```json
{
  "ep": "<ep-number>",
  "title": { "en": "Episode <ep-number>", "km": "ភាគទី<ep-number>" },
  "url": "<branch-incremented-url>",
  "type": "M3U8",
  "final": false
}
```

Set `"final": true` only on the last episode of the new batch. All others remain `false`.

## Step 5 — Update the detail file

In `db/<slug>.json`:
1. Set `"final": false` on the currently-last episode (if it has `final: true`)
2. Append all new episode objects to `episodes[]`
3. Set `episodeCount` = old count + `episode-count`

## Step 6 — Update the index file

In `db/index.json`, find `slug === "<slug>"` and set `episodeCount` to new total.

## Step 7 — Validate, test, commit

Validate both files are valid JSON. Run `npm test`. Commit:

```
feat: add season 2 for <slug>
```

(Adjust season number if determinable from the URL pattern, e.g. `s2` → "season 2".)

Push.

## Rules

- Episode numbering is **continuous** across seasons — do not restart at 1.
- Khmer episode titles use Arabic numerals: `ភាគទី26` not Khmer digits.
- `final: true` must appear on exactly one episode — the new season's last.
- Never modify `title`, `description`, `poster`, `year`, `rating`, `genres`, or `country`.
- Never drop the `km` side of any bilingual field while editing the array.
