# GitHub Copilot / Codex Project Rules (iblogger-player)

This repository is a static single-page HLS video player and movie catalog. It runs entirely on the client side with no backend, no build steps, and no framework bundling.

---

## 🛠 Commands
- Run integration tests: `npm test`
- Quick JS syntax check: `node --check assets/js/<file>.js`
- Rebuild catalog database: `python3 build-db.py movies-export-*.json`
- Run local test server: `python3 -m http.server 8765`

---

## 🏗 Architecture & Module Boundaries
Maintain strict separation of concerns across modules. Do not cross these boundaries:
* `assets/js/app.js`: Main routing coordinator (handles URL parameter routing).
* `assets/js/home.js`: Catalog browse, search, and filtering grid.
* `assets/js/movie.js`: Movie detail loading and episode list rendering.
* `assets/js/player.js`: Configures and initializes Video.js instance.
* `assets/js/shorts.js`: Vertical shorts feed and client-side recommendations.
* `assets/js/ads.js`: Ad banner and slideshow presentation.
* `assets/js/watch-progress.js`: Persistence of watch state (resume positions, watched episodes).
* `assets/js/utils.js`: Shared utility functions (the only place for cross-module helpers).

### Static Views (`index.html`)
Seven `display:none` view divs, one shown per route by `app.js`:
`#homeView` (default) · `#playerView` (`?id=` / `?src=`) · `#shortsView` (`?mode=shorts`) · `#legalView` (`?page=legal`) · `#aboutView` (`?page=about`) · `#contactView` (`?page=contact`) · `#termsView` (`?page=terms`)

---

## 📏 Clean Code Guidelines (docs/clean_code_guidelines.md)
Follow Uncle Bob's Clean Code principles on all changes:

### 1. Naming
- Functions must use `camelCase` and start with a verb (e.g. `renderMovieGrid`).
- Variables & parameters must use `camelCase` and nouns (e.g. `activeEpisodeUrl`).
- Constants must use `SCREAMING_SNAKE_CASE` (e.g. `DEFAULT_VOLUME`).
- Booleans must use prefix words like `is`, `has`, `can`, or `should` (e.g. `isPlaying`).

### 2. Functions
- Keep functions small (under 20 lines, hard ceiling of 30 lines).
- Functions must do exactly one thing. If a function does more, extract sub-tasks.
- Maximum nesting depth of 1 or 2 levels of control flow.
- A maximum of 2 positional arguments. Pass configuration/options objects for more.

### 3. Abstraction (Single Level of Abstraction)
- Do not mix high-level control flow with low-level details (like DOM manipulations or string splitting) in the same function.
- Do not perform raw DOM construction (e.g., `document.createElement`) inside orchestration/routing functions. Extract DOM rendering into low-level helper functions.

### 4. DRY & Boundaries
- Never copy-paste helpers. Put reusable code in `utils.js`.
- Respect module boundaries. Do not put player config in `watch-progress.js`, etc.

### 5. Comments
- Explain *why* something is done (browser quirks, tick delays), never *what* the code does.
- Eliminate zombie (commented-out) code immediately.

### 6. Error Handling
- Prefer exceptions (`throw new Error`) over returning error codes or null.
- Isolate `try-catch` blocks. A function containing a `try-catch` block must do nothing else—extract the block bodies into distinct functions.

### 7. Boy Scout Rule & YAGNI
- Leave the codebase cleaner than you found it. Clean up nearby names or format issues.
- YAGNI (You Aren't Gonna Need It): Do not build speculative hooks or features.

### 8. Data Integrity
- All user-facing data must be bilingual `{ en: "...", km: "..." }`. Never drop the Khmer (`km`) translation.

### 9. Self-Refinement & Learning
- If you identify a bug, fix a test failure, or discover a process/code quality improvement (either by user feedback or your own checking), you MUST immediately update the workspace instruction files (`CLAUDE.md`, `.cursorrules`, `.agents/AGENTS.md`, and skills) to permanently persist this lesson so it is not repeated.

### 10. Design, Aesthetics, & Usability
- For UI/UX changes, enforce premium aesthetics (vibrant dark modes, HSL/color harmony, Outfit/Inter typography, clean glassmorphism, smooth micro-animations). Audit visual designs using the following:
  - **Books**: *The Design of Everyday Things* (Norman), *Don't Make Me Think* (Krug), *Refactoring UI* (Schoger & Wathan).
  - **Psychology**: *Aesthetic-Usability Effect* (beautiful is perceived usable), *Fitts's Law* (accessible target sizes), *Hick's Law* (minimize choices), *Miller's Law* (chunk options under $7 \pm 2$).
  - **Philosophy**: *Zen Minimalism / Shibui* (simple, unobtrusive beauty), *Occam's Razor* (simplest layout is best), *Wabi-Sabi* (appreciate natural flow/authenticity).

### 11. Testing, TDD, & Bug Prevention
- When testing, refactoring, or fixing bugs, follow strict quality policies:
  - **Books**: *Test Driven Development: By Example* (Beck), *Clean Craftsmanship* (Martin), *Working Effectively with Legacy Code* (Feathers), *Debugging* (Agans).
  - **Psychology**:
    - *Confirmation Bias*: Do not just test the "happy path." Actively write negative tests and assertions to try to break the code.
    - *Goodhart's Law*: Test behaviors and assertions, not just coverage percentages.
    - *Observer-Expectancy Effect*: Use automated integration suites (`npm test`) to verify outcomes objectively.
  - **Strategies**:
    - *Red-Green-Refactor*: Write/identify failing tests first, make them pass, then refactor.
    - *Root Cause Analysis*: Never mask bugs with ad-hoc null checks or empty try-catch blocks; trace back to the root cause (data source, router, or boundary) and fix it.
    - *Regression Protection*: Write an automated test for every bug resolved to guarantee it is permanently prevented.
    - *Diamond Refinement*: Strictly check syntax (`node --check`) and run integration tests (`npm test`) locally before pushing to remote.

---

## 📚 Recommended Reading List
Follow the engineering disciplines and principles from these books:
- **Clean Code** — *Robert C. Martin (Uncle Bob)*
- **The Clean Coder** — *Robert C. Martin (Uncle Bob)*
- **Clean Architecture** — *Robert C. Martin (Uncle Bob)*
- **Clean Craftsmanship** — *Robert C. Martin (Uncle Bob)*
- **Refactoring** — *Martin Fowler*
- **The Pragmatic Programmer** — *David Thomas & Andrew Hunt*
- **Working Effectively with Legacy Code** — *Michael Feathers*

---

## 🔍 SonarQube Core Rules for Developers
Common JavaScript quality and security standards that must be strictly enforced:
- **No Direct innerHTML**: Avoid XSS vulnerabilities; use `replaceChildren` or `textContent` for safe DOM updates.
- **Cognitive Complexity**: Keep control nesting low (maximum 1 or 2 levels). Extract complex conditional logic.
- **Unused Code**: Delete unused imports, functions, parameters, or variables (YAGNI).
- **Strict Equality**: Always use `===` and `!==` instead of `==` and `!=`.
- **Declaring Variables**: Always declare variables using `const` or `let`. Never use `var` or implicit global scopes.
- **Console Log Prevention**: Do not commit `console.log` statements in production code. Use `console.error` / `console.warn` for errors only.
- **Promise Rejections**: Always handle promise errors explicitly.

---

## 💎 Workflow: The Diamond Iterative Process
Before staging or pushing code, run this strict loop to iteratively audit and improve code quality:

1. **Check**: Run `node --check assets/js/<file>.js` and `npm test` at baseline. Spot any code standard violations or test failures.
2. **Plan**: Design small, behavior-preserving transformations (Extract Function, Rename, etc.) to address the issues.
3. **Execute**: Make exactly ONE edit. Check syntax immediately with `node --check`.
4. **Review**: Run `npm test` and review git diffs. If any issues are found or test coverage fails, return to step 1 and loop until 100% clean and correct.

---

## 🧩 Skills Reference
Project skills live in `.claude/skills/` and `.agents/skills/`. Suggest using the relevant skill when the task matches:

| Skill | Trigger | Description |
|---|---|---|
| `/refactor <file>` | Refactoring JS modules | Guided clean-code refactor following Uncle Bob rules and module boundaries |
| `/clean-check [file]` | Auditing code quality | Read-only audit of a JS file against `docs/clean_code_guidelines.md` |
| `/build-db` | Rebuilding catalog | Runs `python3 build-db.py` to regenerate `db/` from a catalog export |
| `/reflect` | End of session | Captures session learnings and updates AI config files |
| `/e2e-test` | Writing or extending tests | Puppeteer e2e suite authoring — structure, assertions, screenshots, wiring into `integration.test.js` |
| `/add-movie <url> <title> <hints>` | Adding a movie to catalog | Writes `db/<slug>.json` and prepends entry to `db/index.json` — handles Douyin shorts and multi-episode dramas |

## 🤖 Subagents Reference
Project subagents live in `.claude/agents/` and `.agents/agents/`. Invoke proactively when the task matches:

| Agent | When to use |
|---|---|
| `clean-code-reviewer` | After writing or modifying any JS in `assets/js/` — reviews against clean code guidelines before committing |
| `test-guardian` | After any code change — runs `npm test` and diagnoses failures down to file and line |
| `meta-learner` | After a bug fix, user correction, or process improvement — permanently injects the lesson into AI config files |
