---
name: refactor
description: Guided clean-code refactoring of a project file following docs/clean_code_guidelines.md — small verified steps, tests after every change. Use when the user asks to refactor, clean up, or simplify a file.
---

# Refactor (Clean Code discipline)

This skill guides the refactoring of a project file using a sequence of tiny, behavior-preserving transformations, verifying correctness at each step. Never do a big-bang rewrite.

## Procedure

1. **Load the law**: Read `docs/clean_code_guidelines.md` in full. Its rules override general coding instincts.
2. **Establish the safety net**: Run `npm test` before modifying any code. If baseline tests fail, stop and report immediately. Never refactor on a red baseline.
3. **Audit the target**: Read the target file completely and list every violation, ordered by severity:
   - Functions > 20 lines or doing more than one thing.
   - Functions with > 2 positional arguments.
   - Mixed abstraction levels (raw DOM work inside orchestration functions).
   - Duplication within the file or against other modules (belongs in `utils.js`).
   - Names that don't reveal intent; magic numbers without named constants.
   - Zombie (commented-out) code, "what"-comments.
   - Responsibility leaks across module boundaries (see CLAUDE.md/AGENTS.md).
   - Try-catch block pollution (mixing try-catch blocks with execution logic).
   - Error handling via error codes or null instead of exceptions.
   - Speculative abstractions or unused elements (YAGNI violations).
   - Boy Scout cleaning opportunities in the vicinity.
4. **Refactor one violation at a time**:
   - Apply exactly **one** behavior-preserving transformation (extract function, rename variable, replace magic number, pull up to `utils.js`, etc.).
   - Run `node --check <file>` after the edit to check JS syntax.
   - Keep public behavior identical (same exports, same DOM results, same URL parameters).
5. **Verify**: Run `npm test` after the final step (and at intermediate milestones). If a step breaks tests, revert that step—do not pile fixes on top.
6. **Report**: Summarize changes as a table: violation → transformation applied → guideline section it satisfies. Note anything intentionally left (with why).

## Hard rules
- Do NOT change behavior, rename public exports, or alter URL/query-param contracts.
- Do NOT add libraries, build steps, or new files unless extracting shared code into `utils.js`.
- Do NOT leave commented-out code behind — delete it.
