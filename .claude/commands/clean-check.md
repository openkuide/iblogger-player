---
name: clean-check
description: Read-only audit of a file (or the current diff) against docs/clean_code_guidelines.md. Reports violations with line numbers and suggested fixes — changes nothing.
---
Please audit the target file: $ARGUMENTS

You must strictly perform a read-only audit:
1. **Target Identification**: If blank, audit files shown in `git diff --name-only HEAD` (or from the latest commit if the working tree is clean).
2. **Read Guidelines**: Read `docs/clean_code_guidelines.md` first.
3. **Analyze**: Read each target file completely and check every function against the rules.
4. **Report**: Produce a clean code audit table detailing Line, Rule Section, Violation explanation, and Suggested Fix.
5. **No Modifications**: Do not edit any files.
