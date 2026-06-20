---
name: clean-check
description: Read-only audit of a file (or the current diff) against docs/clean_code_guidelines.md. Reports violations with line numbers and suggested fixes — changes nothing. Use to review code quality before committing or to decide what to refactor next.
argument-hint: [file or blank = files changed in git diff]
---

# Clean-Check (audit only — never edits)

Target: $ARGUMENTS (if blank, audit files shown in `git diff --name-only HEAD` — or, when the working tree is clean, the files in the latest commit).

## Procedure

1. Read `docs/clean_code_guidelines.md` — the project's five rule sections are the checklist.
2. Read each target file completely.
3. Score every function against the rules and produce the report below. Do NOT modify any file.

## Report format

```
## Clean Code Audit — <file>

| # | Line | Rule (§ in guidelines) | Violation | Suggested fix |
|---|------|------------------------|-----------|---------------|

Score: X/10
Top 3 wins: <the three fixes with best effort-to-impact ratio>
```

Rules checklist (from docs/clean_code_guidelines.md):
- **§1 Naming** — intention-revealing, pronounceable, searchable; verbs for functions, nouns for values
- **§2 Functions** — < 20 lines (max ~30), one thing only, ≤ 2 args (3rd must be an options object)
- **§3 Abstraction** — one level per function; no raw DOM construction inside orchestrators
- **§4 DRY & boundaries** — no duplication; shared code in `utils.js`; module responsibilities per CLAUDE.md table
- **§5 Comments** — explain why not what; zero zombie code
- **§6 Error Handling** — prefer exceptions over error codes/null; isolate try-catch blocks into distinct functions
- **§7 Boy Scout & YAGNI** — clean up surrounding code when modifying; no speculative abstractions or futuristic code

Severity: 🔴 breaks a hard rule (function > 30 lines, zombie code, boundary leak, try-catch mix) · 🟡 bends a rule · 🔵 polish.

End with: "Run `/refactor <file>` to fix these."
