---
name: clean-check
description: Read-only audit of a file (or the current diff) against docs/clean_code_guidelines.md. Reports violations with line numbers and suggested fixes — changes nothing. Use to review code quality before committing or to decide what to refactor next.
---

# Clean-Check (audit only — never edits)

This skill performs a read-only audit of a target file (or the current git diff) against the project's Clean Code guidelines. It lists violations with line numbers and suggested fixes. It does not modify any files.

## Procedure

1. Read `docs/clean_code_guidelines.md` completely.
2. Identify the target file(s) from arguments. If no arguments are provided, audit files in `git diff --name-only HEAD` (or from the latest commit if the working tree is clean).
3. Read each target file completely.
4. Score every function against the guidelines and produce the audit report below. Do NOT modify any file.

## Audit Checklist
- **§1 Naming**: intent-revealing names, camelCase for functions starting with verbs, camelCase for variables as nouns, SCREAMING_SNAKE_CASE constants, boolean prefixing.
- **§2 Functions**: size < 20 lines (max 30), single responsibility, max nesting depth 1-2, maximum 2 positional arguments.
- **§3 Abstraction**: Single Level of Abstraction (SLA). No raw DOM construction inside orchestration functions.
- **§4 DRY & boundaries**: no code duplication, shared helper reuse in `utils.js`, respect module boundaries.
- **§5 Comments**: explain why not what, zero zombie code.
- **§6 Error Handling**: exceptions over error codes/null, isolated try-catch blocks (bodies extracted into helper functions).
- **§7 Boy Scout & YAGNI**: surrounding cleanup opportunities, YAGNI constraints (no speculative abstractions).

## Report format

Produce a report in the following format:

```markdown
## Clean Code Audit — <file>

| # | Line | Rule (§ in guidelines) | Severity | Violation | Suggested fix |
|---|------|------------------------|----------|-----------|---------------|

Score: X/10
Top 3 wins: <the three fixes with best effort-to-impact ratio>
```

### Severity definitions:
- 🔴 **Must Fix (breaks a hard rule)**: function > 30 lines, zombie code, boundary leak, try-catch mix.
- 🟡 **Should Fix (bends a rule)**: function between 20-30 lines, minor naming issues.
- 🔵 **Polish**: small naming improvements, documentation clarifications.
