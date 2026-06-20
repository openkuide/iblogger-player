# Example: Catalog Rebuild Run

This example demonstrates the step-by-step terminal commands and output logs when rebuilding the movie catalog database using the `build-db` skill.

---

## 1. Locate the Export File
Find the most recent export JSON file in the project root:
```bash
$ ls -t movies-export-*.json | head -1
movies-export-2026-05-30T03-55-41.json
```

## 2. Check Database Count Before Build
Record the initial state of the movie catalog index:
```bash
$ python3 -c "import json;d=json.load(open('db/index.json'));print('movies before:',len(d))"
movies before: 24
```

## 3. Run Rebuild Command
Execute the database regeneration script with the export file:
```bash
$ python3 build-db.py movies-export-2026-05-30T03-55-41.json
[INFO] Reading export movies-export-2026-05-30T03-55-41.json...
[INFO] Parsed 26 movie entries.
[INFO] Re-generating db/ index and detail files...
[INFO] Wrote db/index.json
[INFO] Wrote 26 individual movie files to db/
[SUCCESS] Database rebuild complete.
```

## 4. Verify Integrity and JSON Syntax
Ensure the generated JSON files parse correctly and contain no syntax errors:
```bash
$ python3 -m json.tool db/index.json > /dev/null
$ python3 -c "import json,glob;[json.load(open(f)) for f in glob.glob('db/*.json')];print('all valid')"
all valid
```

## 5. Review Movie Count Delta
Confirm the changes made to the database directories:
```bash
$ python3 -c "import json;d=json.load(open('db/index.json'));print('movies after:',len(d))"
movies after: 26
$ git status db/
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
	modified:   db/index.json
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	db/sun-tzu-war.json
	db/legend-of-the-condors.json
```
