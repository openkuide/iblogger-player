---
name: audit-links
description: Use when checking HLS stream URLs for reachability across the catalog or a single movie. Triggered by /audit-links or /audit-links <slug>.
---

# audit-links

Probe every HLS stream URL in the catalog and report dead or unreachable streams.

## Trigger

```
/audit-links              # fast scan: first episode of every movie
/audit-links <slug>       # all episodes of one movie
```

## Steps

### 1. Collect URLs

**Single slug**: load `db/<slug>.json`, extract all `episodes[*].url`.

**Full catalog** (no slug): load `db/index.json`, collect `episodes[0].url` from each `db/<slug>.json`.  
After the fast scan, ask: "Also check all remaining episodes? (slow)" — proceed only if the user agrees.

### 2. Probe each URL

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 8 --head "<url>"
```

Classify the HTTP code:

| Code      | Status                                      |
|-----------|---------------------------------------------|
| 200 / 206 | ✓ Live                                      |
| 403       | ⚠ CORS-blocked (may still work in browser)  |
| 404 / 410 | ✗ Dead                                      |
| 000 / timeout | ✗ Unreachable                           |

Print live progress as each URL resolves (one line per URL).

### 3. Final report

```
LINK AUDIT REPORT
─────────────────
✓  142 live
⚠    8 CORS-blocked (may work in browser)
✗    6 dead / unreachable

DEAD STREAMS:
slug-name  ep1  https://example.com/stream.m3u8  → 404
...
```

### 4. Prompt for action on dead streams

For each dead stream:
- "Remove episode from catalog? (y/n)"  
- "Or mark as unavailable? (u)"

**Remove**: delete the episode object from `db/<slug>.json` episodes array.  
**Mark unavailable**: add `"unavailable": true` to the episode object.  
If the movie has no remaining available episodes, ask whether to remove it from `db/index.json` too.

### 5. Validate & commit

```bash
python3 -c "import json; json.load(open('db/index.json'))"
# validate each modified slug file too
npm test
git add db/
git commit -m "fix: mark N dead streams as unavailable"
git push
```

If no dead streams found: report clean results and do not commit.
