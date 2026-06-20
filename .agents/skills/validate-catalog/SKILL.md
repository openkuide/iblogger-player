---
name: validate-catalog
description: Use when the user wants to audit the catalog for broken streams, missing fields, count mismatches, orphan files, or missing final tags. Triggered by /validate-catalog.
---

# validate-catalog

Scan every `db/*.json` file for integrity issues and output an actionable fix-list.

## Step 1 — Load catalog

Read `db/index.json` to get the full slug list. List every file matching `db/*.json` (skip `db/index.json`). Build two sets: `indexSlugs` (from index) and `fileSlugs` (from files on disk).

## Step 2 — Per-movie checks

For each detail file `db/<slug>.json`, check:

| Check | Issue tag |
|---|---|
| `title.en` or `title.km` missing/empty | `[MISSING_FIELD]` |
| `description.en` or `description.km` missing/empty | `[MISSING_FIELD]` |
| `poster` field missing or empty string | `[MISSING_FIELD]` |
| `genres` missing or empty array | `[MISSING_FIELD]` |
| `year`, `rating`, or `country` missing | `[MISSING_FIELD]` |
| `episodes[].length` ≠ `episodeCount` in `db/index.json` | `[COUNT_MISMATCH]` |
| Last episode in `episodes[]` does not have `final: true` | `[NO_FINAL_TAG]` |
| Any non-last episode has `final: true` | `[SPURIOUS_FINAL]` |

## Step 3 — Cross-reference orphans

- Slug in `indexSlugs` but not in `fileSlugs` → `[ORPHAN_INDEX]`
- Slug in `fileSlugs` but not in `indexSlugs` → `[ORPHAN_FILE]`

## Step 4 — HTTP stream check (first episode only)

For each movie, run `curl -I --silent --max-time 5 <ep1.url>` and check HTTP status. Non-2xx or connection error → `[DEAD_STREAM]`. Skip if URL is empty.

## Step 5 — Print report

```
CATALOG AUDIT REPORT
────────────────────
✓ N movies scanned

ISSUES FOUND (N):
[MISSING_FIELD]   <slug>  →  missing: poster
[DEAD_STREAM]     <slug>  →  ep1 URL returned 404
[COUNT_MISMATCH]  <slug>  →  index says 24, detail has 22 episodes
[NO_FINAL_TAG]    <slug>  →  last episode missing final:true
[SPURIOUS_FINAL]  <slug>  →  episode N has final:true but is not last
[ORPHAN_FILE]     <slug>  →  db/<slug>.json has no entry in index.json
[ORPHAN_INDEX]    <slug>  →  index.json entry has no db/<slug>.json
```

If zero issues: print `✓ Catalog clean — no issues found.` and stop.

## Step 6 — Offer auto-fix

Ask: `Fix automatically? (y/n)`

If yes, auto-fix only these safe types:
- `[COUNT_MISMATCH]` → update `episodeCount` in `db/index.json` to match `episodes[].length`
- `[NO_FINAL_TAG]` → add `"final": true` to last episode; remove from any non-last episode (`[SPURIOUS_FINAL]`)

Flag these for **manual attention only** (do not auto-fix):
- `[DEAD_STREAM]` — stream URL is broken; user must supply a new URL
- `[MISSING_FIELD]` — field value is unknown; user must supply it
- `[ORPHAN_FILE]` / `[ORPHAN_INDEX]` — user must decide to register or delete

## Step 7 — Validate, test, commit

After any auto-fixes: validate all edited files are valid JSON, run `npm test`, commit `fix: catalog integrity fixes from validate-catalog`, push.

## Rules

- Never overwrite `DEAD_STREAM` URLs with empty strings.
- Never drop the `km` side of any bilingual field.
- All JSON edits must leave files valid — run mental parse before writing.
