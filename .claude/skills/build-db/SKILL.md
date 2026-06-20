---
name: build-db
description: Rebuild the db/ movie catalog from the newest movies-export-*.json and verify the output integrity.
disable-model-invocation: true
---

# Build DB (regenerate catalog)

Regenerates `db/` — the published catalog — from the source export. `db/` is build output; this is the only sanctioned way to bulk-change it.

## Procedure

1. **Find the source.** `ls -t movies-export-*.json | head -1`. If none exists, stop and tell the user to place their export in the repo root (the pattern is gitignored on purpose).

2. **Snapshot before.** Record current counts for comparison:
   ```bash
   python3 -c "import json;d=json.load(open('db/index.json'));print('movies before:',len(d))"
   ls db/*.json | wc -l
   ```

3. **Build.** `python3 build-db.py <export-file>`

4. **Verify after.**
   - `python3 -m json.tool db/index.json > /dev/null` — index is valid JSON
   - Validate every `db/*.json` parses: `python3 -c "import json,glob;[json.load(open(f)) for f in glob.glob('db/*.json')];print('all valid')"`
   - Compare movie counts before/after and report the delta (added / removed slugs via `git status db/`).
   - Spot-check one new/changed movie file: has `slug`, bilingual `title`/`description` (`en` + `km`), `episodes` with `url`s.

5. **Report.** Movies before → after, files added/removed, validation result. Do NOT commit — show `git status` and let the user decide.
