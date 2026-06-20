---
name: build-db
description: Rebuild the db/ movie catalog from the newest movies-export-*.json and verify the output integrity.
---
Please execute the build-db procedure:
1. **Find Export**: Look for the newest source export file using `ls -t movies-export-*.json | head -1`.
2. **Snapshot**: Record the count of movies and files in `db/` before executing the rebuild.
3. **Build**: Run the python rebuild command: `python3 build-db.py <export-file>`.
4. **Validate**:
   - Verify `db/index.json` is valid JSON.
   - Verify all individual movie database files are valid JSON.
   - Print counts/diff of added/removed movies.
5. **Report**: Output the differences and integrity check results. Do not auto-commit the changes.
