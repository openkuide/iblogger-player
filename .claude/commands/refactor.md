---
name: refactor
description: Guided clean-code refactoring of a project file following docs/clean_code_guidelines.md — small verified steps, tests after every change.
---
Please perform a guided clean-code refactoring on the target file: $ARGUMENTS

You must strictly follow the refactoring procedure:
1. **Safety Net**: Run `npm test` before changing anything. If baseline tests fail, stop and report immediately.
2. **Audit target**: Read the target file and list every violation against `docs/clean_code_guidelines.md` (naming, functions > 20 lines, args > 2, mixed abstraction levels, DRY/boundaries, zombie code/comments, error handling try-catch isolation, Boy Scout/YAGNI).
3. **Decompose**: Refactor one violation at a time with tiny, behavior-preserving transformations.
4. **Syntax Check**: Run `node --check <file>` after each individual edit.
5. **Verify**: Run `npm test` after each change. Revert if tests fail.
6. **Report**: Summarize the changes (violation -> transformation -> guideline section).
