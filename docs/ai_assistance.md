# AI Assistance & Tooling Guide

This document outlines how to effectively use AI coding assistants and autonomous agents—specifically **Antigravity**, **Claude**, **Cursor**, and **Codex / Copilot**—to develop, refactor, and maintain the `iblogger-player` codebase.

---

## 📌 Table of Contents
1. [Google DeepMind Antigravity](#1-google-deepmind-antigravity)
2. [Anthropic Claude](#2-anthropic-claude)
3. [Cursor IDE](#3-cursor-ide)
4. [GitHub Copilot & Codex](#4-github-copilot--codex)
5. [Summary of Prompts & Workflow](#5-summary-of-prompts--workflow)

---

## 1. Google DeepMind Antigravity

Antigravity is a powerful, planning-aware agentic assistant. It works exceptionally well with our structured codebase for execution, testing, and multi-file refactoring.

### Best Practices for Antigravity:
* **Workflow Loop**: Antigravity is equipped with terminal execution tools. After editing JS files, instruct it to run `npm test` immediately to verify there are no syntax or Puppeteer integration failures.
* **Planning Mode**: For complex features (e.g., adding a new player view or restructuring modules), allow Antigravity to generate an `implementation_plan.md` to map out boundaries and dependencies.
* **Refactoring Prompts**:
  > "Review assets/js/player.js against docs/clean_code_guidelines.md and refactor any functions exceeding 20 lines into small, single-responsibility helper functions."

---

## 2. Anthropic Claude

Claude excels at long-context reasoning, logical explanations, and document auditing.

### Best Practices for Claude:
* **Context Loading**: When working with Claude, feed it `CLAUDE.md` and `docs/clean_code_guidelines.md` as system context files. These documents define the "laws" of our repository.
* **Data Auditing**: Ask Claude to audit JSON datasets in `db/` to ensure English and Khmer descriptions match exactly in structure and key alignment.
* **Refactoring Prompts**:
  > "Using the rules in docs/clean_code_guidelines.md, split the following Javascript function into separate functions at a single level of abstraction (SLA). Show the refactored code."

---

## 3. Cursor IDE

Cursor is an AI-first editor that indexes the codebase, allowing you to use context-aware chat, Composer (`Cmd+I`), and inline editing (`Cmd+K`).

### Best Practices for Cursor:
* **Context Referencing (@)**: Use the `@` symbol to reference the exact guidelines and schemas. E.g., `@docs/clean_code_guidelines.md` or `@db/index.json`.
* **Atomic JSON Generation**: When manually adding a new movie, use Composer to generate both the full detail file and the index entry in one step:
  > "Create a new movie entry for 'The Tuxedo' following the schema in @docs/movie_description_polish_procedure.md. Generate both db/the-tuxedo.json and append the slim index entry to @db/index.json."
* **Rules Customization**: You can add `.cursorrules` to the root folder pointing directly to `docs/clean_code_guidelines.md` so Cursor always conforms to our naming and function length limits.

---

## 4. GitHub Copilot & Codex

GitHub Copilot and OpenAI Codex are optimized for fast inline code completions and comment-to-code generation.

### Best Practices for Copilot:
* **Intentional Naming**: Because our code uses highly descriptive, verb-based function names (`renderMovieGrid`, `calculateGenreOverlap`), Copilot can accurately guess function bodies. Start typing the signature and let it autocomplete the logic.
* **Comment-Driven Development**: Write the descriptive *why* comment first, and Codex will generate the implementation that fits.
  * *Example*:
    ```js
    // Video.js re-adds the active classes on a separate thread,
    // so we must defer the HUD state update by a tick to prevent flashing.
    ```
    *(Copilot will autocomplete the `setTimeout` code immediately)*

---

## 5. Summary of Prompts & Workflow

| Tool | Focus Area | Recommended Prompt |
| :--- | :--- | :--- |
| **Antigravity** | Execution & Verification | `"Implement feature X and run npm test to verify there are no console errors."` |
| **Claude** | Refactoring & Logic | `"Audit the following code against the Single Level of Abstraction (SLA) rule in @clean_code_guidelines.md"` |
| **Cursor** | Context-aware files | `"Add a new movie database entry using @movie_description_polish_procedure.md rules"` |
| **Copilot** | Inline completions | Write the verb function signature (e.g. `function buildEpisodeButton()`) and tab-complete. |
