---
name: build-db
description: Rebuild the db/ movie catalog from the newest movies-export-*.json and verify the output integrity.
disable-model-invocation: true
---

# Build DB (regenerate catalog)

This skill regenerates the published database files in `db/` from the source catalog export JSON file. The `db/` files are build outputs; this is the only sanctioned way to modify the catalog in bulk.

## Procedure

1. **Find the source**: `ls -t movies-export-*.json | head -1`. If no matching export file exists, stop and instruct the user to place the export JSON in the project root.
2. **Snapshot before**: Record current movie and file counts for comparison:
   ```bash
   python3 -c "import json;d=json.load(open('db/index.json'));print('movies before:',len(d))"
   ls db/*.json | wc -l
   ```
3. **Build**: Run the python generation script:
   ```bash
   python3 build-db.py <export-file>
   ```
4. **Verify after**:
   - Ensure `db/index.json` is valid JSON:
     ```bash
     python3 -m json.tool db/index.json > /dev/null
     ```
   - Ensure all `db/*.json` files successfully parse:
     ```bash
     python3 -c "import json,glob;[json.load(open(f)) for f in glob.glob('db/*.json')];print('all valid')"
     ```
   - Check movie count delta and output differences (`git status db/`).
   - Spot-check one modified movie details file: verify `slug`, bilingual `title` and `description` (both `en` and `km`), and `episodes` HLS streaming URLs.
5. **Report**: Output the before -> after counts, added/removed files list, and validation results. Do not commit changes automatically—let the user review `git status` first.
