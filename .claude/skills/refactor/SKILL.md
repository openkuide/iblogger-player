---
name: refactor
description: Guided clean-code refactoring of a project file following docs/clean_code_guidelines.md — small verified steps, tests after every change. Use when the user asks to refactor, clean up, or simplify a file.
argument-hint: <file to refactor, e.g. assets/js/movie.js>
---

# Refactor (Clean Code discipline)

Target: $ARGUMENTS

Refactor the target file the way *Refactoring* (Fowler) and *Clean Code* (Uncle Bob) prescribe: a sequence of tiny, behavior-preserving transformations, each verified before the next. Never a big-bang rewrite.

## Procedure

1. **Load the law.** Read `docs/clean_code_guidelines.md` in full. Its rules override any general instinct.

2. **Establish the safety net.** Run `npm test` BEFORE touching anything. If tests fail at baseline, STOP and report — never refactor on a red baseline.

3. **Audit the target.** Read the whole file and list every violation, ordered by severity:
   - Functions > 20 lines or doing more than one thing
   - Functions with > 2 positional arguments
   - Mixed abstraction levels (raw DOM work inside orchestration functions)
   - Duplication within the file or against other modules (belongs in `utils.js`)
   - Names that don't reveal intent; magic numbers without named constants
   - Zombie (commented-out) code, "what"-comments
   - Responsibility leaks across module boundaries (see module table in CLAUDE.md)
   - Try-catch block pollution (mixing try-catch logic with execution logic - §6)
   - Error handling via error codes or null instead of exceptions (§6)
   - Speculative abstractions or unused elements (YAGNI violations - §7)
   - Boy Scout cleaning opportunities in the vicinity (§7)

4. **Refactor one violation at a time.** For each step:
   - Apply exactly ONE transformation (extract function, rename, replace magic number, pull up to utils.js, …).
   - Run `node --check <file>` after the edit.
   - Keep public behavior identical — same exports, same DOM result, same URLs.

5. **Verify.** Run `npm test` after the final step (and at intermediate milestones for long sessions). If a step breaks tests, revert that step — don't pile fixes on top.

6. **Report.** Summarize as a table: violation → transformation applied → guideline section it satisfies. Note anything intentionally left (with why).

## Hard rules

- Do NOT change behavior, rename public exports, or alter URL/query-param contracts.
- Do NOT add libraries, build steps, or new files unless extracting shared code into `utils.js`.
- Do NOT leave commented-out code behind — delete it.
- Commit message, if asked to commit: `refactor: <what> in <file> per clean code guidelines`.
