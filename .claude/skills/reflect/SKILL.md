---
name: reflect
description: >
  AI self-reflection, rule optimization, context compaction, and memory
  management. ACTIVATE when the user runs /reflect, asks the AI to "reflect",
  "improve your rules", "update yourself", or "compact context". Also activates
  automatically after a recurring error pattern is detected or when context
  approaches 80% of the token window.
---

# Reflect Skill — Self-Improvement & Context Management

## Purpose
This skill makes Claude Code a **self-improving agent**. After completing any
significant coding session or when invoked explicitly, run the four phases below
in order. The output of each phase feeds the next. Loop until all issues are
resolved and configuration files are clean.

---

## Phase 1 — Context Assessment (Memory Audit)

Scan the active conversation context for:

1. **Redundancy**: Are the same rules repeated in multiple configuration files
   (`CLAUDE.md`, `.cursorrules`, `.agents/AGENTS.md`, `copilot-instructions.md`)?
   Flag duplicates.
2. **Token Waste**: Are there large comment blocks, examples, or deprecated
   sections that inflate context without adding value?
3. **Stale Rules**: Are there rules that reference removed files, old module
   names, or patterns that no longer exist in the codebase?

**Output**: A bulleted list of findings per configuration file (path + line
number where possible).

---

## Phase 2 — Performance Review (Lesson Extraction)

Review the most recent set of edits and conversations:

1. **Clean Code Violations**: Compare edits against `docs/clean_code_guidelines.md`.
   Did any committed code violate SLA, DRY, cognitive complexity, or naming
   standards? What caused the violation?
2. **Test Failures**: Were there test failures that required multiple fix
   attempts? What was the root cause?
3. **Design Regressions**: Were any UI changes inconsistent with the premium
   aesthetic standards (Refactoring UI, Shibui, Wabi-Sabi)?
4. **Lesson Summary**: Produce a concise, actionable lesson statement for each
   finding (e.g., *"When extracting helpers, always run `node --check` before
   running `npm test` to catch syntax errors earlier"*).

**Output**: Numbered list of lessons learned, each with a proposed config
update to prevent recurrence.

---

## Phase 3 — Rule Refinement (Self-Update)

For each lesson identified in Phase 2, apply a targeted update to the relevant
configuration file(s). Follow this update protocol:

### Target Files (update ALL that apply)
| Scope | File |
|---|---|
| Claude Code rules | `CLAUDE.md` |
| Antigravity rules | `.agents/AGENTS.md` |
| Cursor rules | `.cursorrules` |
| Copilot/Codex rules | `.github/copilot-instructions.md` |
| Skill instructions | `.agents/skills/<skill>/SKILL.md` or `.claude/skills/<skill>/SKILL.md` |

### Update Protocol
1. **Minimal Diff**: Change only the sentences or bullet points that need
   updating. Do not rewrite whole files.
2. **Concise Language**: Rules must be imperative, ≤ 2 sentences each. Remove
   vague adjectives. Use verbs.
3. **Verify After Each Edit**: Run `node --check` on any modified JS file.
   For config markdown, re-read the file to confirm the edit landed correctly.
4. **No Zombie Rules**: If a rule is superseded by a clearer one, delete the
   old rule. Do not leave both.

**Output**: A diff-style summary of every rule change made, with a one-line
rationale for each.

---

## Phase 4 — Context Compaction (Memory Optimization)

After Phase 3, compact the conversation context to free up token budget for
future work:

1. **Summarize Completed Work**: Write a 3–5 sentence summary of what was
   accomplished in this session. Store it as a comment at the top of the
   relevant task or walkthrough artifact.
2. **Pin Active Goals**: Identify the 1–3 most important next actions and
   restate them as a clean, minimal TODO.
3. **Drop Resolved Context**: Any file contents, error messages, or research
   notes that are no longer needed for the next action should be flagged for
   removal from context.
4. **Recommend Compaction**: Suggest the user run `/compact` to free token
   budget before continuing to the next task.

**Output**: Compacted session summary + prioritized next-action list.

---

## Triggering Conditions

This skill activates automatically when any of the following occur:

- The user types `/reflect` or asks you to "update your rules", "improve
  yourself", or "learn from this".
- A **Diamond Iterative Loop** finds a recurring error pattern (same class of
  bug appears more than once in a session).
- A **test failure** required more than two fix attempts (indicating a blind
  spot in the current rules).
- A **rule contradiction** is found between two or more config files.
- The conversation is approaching **80% of the context window**.

---

## Self-Update Checklist

Before finishing this skill, confirm each item:

- [ ] All stale or redundant rules removed from config files
- [ ] All new lessons added as imperative rules (≤ 2 sentences)
- [ ] `node --check` passed for any JS files touched in this session
- [ ] `npm test` passed (or failures are documented with root cause)
- [ ] Compacted session summary written
- [ ] Next-action TODO is clear and minimal (≤ 3 items)

---

## References
- `docs/clean_code_guidelines.md` — Full coding standards
- `CLAUDE.md` — Claude Code primary rule set
- `.agents/AGENTS.md` — Antigravity rule set
- `.cursorrules` — Cursor IDE rule set
- `.github/copilot-instructions.md` — Copilot/Codex rule set
