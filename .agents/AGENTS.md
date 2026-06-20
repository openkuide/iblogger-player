# Antigravity Workspace Rules for iblogger-player

These rules guide Antigravity and other AGY agents when operating in the `iblogger-player` workspace.

---

## 📌 Architecture & Design Principles

We maintain a zero-framework, zero-build vanilla ES modules architecture.
- Frontend entry is `index.html`.
- Router is `assets/js/app.js`.
- Modular JS files are separated by strict responsibilities.
- The data layer is stored in `db/` and built from catalog exports using `build-db.py`.
- Keep it purely static. Never introduce bundlers (Webpack, Vite), transpilers (Babel), or server-side logic dependencies.

### Module Responsibility Boundaries:
* `assets/js/app.js`: Main routing coordinator — decides which mode starts.
* `assets/js/home.js`: Catalog browse/search/filter (Vue app).
* `assets/js/movie.js`: Fetch and render movie detail and episode list.
* `assets/js/player.js`: Video.js instance configuration and playback only.
* `assets/js/shorts.js`: Shorts vertical feed + client-side recommendations.
* `assets/js/ads.js`: Ad slideshow / banner initialization only.
* `assets/js/watch-progress.js`: localStorage persistence of watch state (resume positions, watched episodes, last episode) — no DOM, no playback.
* `assets/js/utils.js`: Shared helpers (storage, fetch) — the only place for cross-module code.

### Static View Architecture (`index.html`):
Seven `display:none` view divs controlled by `app.js`. One view is shown per URL route:
`#homeView` (default) · `#playerView` (`?id=` / `?src=`) · `#shortsView` (`?mode=shorts`) · `#legalView` (`?page=legal`) · `#aboutView` (`?page=about`) · `#contactView` (`?page=contact`) · `#termsView` (`?page=terms`)

---

## 📏 Clean Code Standards (docs/clean_code_guidelines.md)

Always adhere to these standards:

### 1. Meaningful Naming
- **Functions**: camelCase, start with a verb (e.g. `renderMovieGrid`, `fetchMovieDetail`).
- **Variables & Parameters**: camelCase, nouns (e.g. `activeEpisodeUrl`, `currentSlug`).
- **Constants**: SCREAMING_SNAKE_CASE (e.g. `DEFAULT_PLAYBACK_RATE`, `MAX_RECOMMENDED_TITLES`).
- **Booleans**: prefix with `is`, `has`, `can`, or `should` (e.g. `isPlaying`, `hasEpisodes`).
- **Avoid Disinformation**: No noise words like `Info`, `Data`, or `Object` (e.g., use `movie` instead of `movieDataObj`).

### 2. Functions
- **Length**: Functions should ideally be under 20 lines, and must rarely exceed 30 lines.
- **Single Responsibility**: Do one thing and do it well. Extract helper functions for sub-tasks.
- **Nesting**: Max nesting depth of 1 or 2 levels of control flow (loops, conditionals).
- **Arguments**: Prefer 0 or 1 argument. Max 2 positional arguments. Use options/configuration objects for 3 or more.

### 3. Single Level of Abstraction (SLA)
- Every statement inside a function must be at the same level of abstraction.
- **High-Level (Orchestration)**: Coordinates flow control only (no raw DOM construction, no fetch promises).
- **Mid-Level (Business Logic)**: Operates on domain logic.
- **Low-Level (Mechanics)**: Directly manipulates APIs, DOM, or localStorage.
- Do not mix raw DOM work (e.g., `document.createElement`, `replaceChildren`) inside orchestration functions.

### 4. DRY (Don't Repeat Yourself) & boundaries
- Reusable helpers must live in `assets/js/utils.js` instead of being duplicated.
- Respect module boundaries. Do not cross playback logic with storage management, etc.

### 5. Comments
- Explain **why** (browser quirks, tick delays), never **what** the code does.
- Zero zombie code: Do not comment out code blocks. Delete them immediately.

### 6. Error Handling
- Prefer throwing exceptions (`throw new Error(...)`) over returning error codes or null.
- Isolate try-catch blocks. A function containing a `try-catch` block should do nothing else. Extract the bodies of try and catch into helper functions.

### 7. Boy Scout Rule & YAGNI
- Leave the campground cleaner than you found it. Clean up nearby bad names, formatting issues, or comments while working.
- YAGNI (You Aren't Gonna Need It): Do not build speculative hooks or features.

### 8. Data Layer & Bilingual Support
- All user-facing text must preserve bilingual `{ en: "...", km: "..." }` properties. Never drop the Khmer translation.

### 9. Recommended Reading List
Follow the engineering disciplines and principles from these books:
- **Clean Code** — *Robert C. Martin (Uncle Bob)*
- **The Clean Coder** — *Robert C. Martin (Uncle Bob)*
- **Clean Architecture** — *Robert C. Martin (Uncle Bob)*
- **Clean Craftsmanship** — *Robert C. Martin (Uncle Bob)*
- **Refactoring** — *Martin Fowler*
- **The Pragmatic Programmer** — *David Thomas & Andrew Hunt*
- **Working Effectively with Legacy Code** — *Michael Feathers*

### 10. SonarQube Core Rules for Developers
Common JavaScript quality and security standards that must be strictly enforced:
- **No Direct innerHTML**: Avoid XSS vulnerabilities; use `replaceChildren` or `textContent` for safe DOM updates.
- **Cognitive Complexity**: Keep control nesting low (maximum 1 or 2 levels). Extract complex conditional logic.
- **Unused Code**: Delete unused imports, functions, parameters, or variables (YAGNI).
- **Strict Equality**: Always use `===` and `!==` instead of `==` and `!=`.
- **Declaring Variables**: Always declare variables using `const` or `let`. Never use `var` or implicit global scopes.
- **Console Log Prevention**: Do not commit `console.log` statements in production code. Use `console.error` / `console.warn` for errors only.
- **Promise Rejections**: Always handle promise errors explicitly.

### 11. Self-Refinement & Learning
- If you identify a bug, fix a test failure, or discover a process/code quality improvement (either by user feedback or your own checking), you MUST immediately update the workspace instruction files (`CLAUDE.md`, `.cursorrules`, `.agents/AGENTS.md`, and skills) to permanently persist this lesson so it is not repeated.

### 12. Design, Aesthetics, & Usability
- For UI/UX changes, enforce premium aesthetics (vibrant dark modes, HSL/color harmony, Outfit/Inter typography, clean glassmorphism, smooth micro-animations). Audit visual designs using the following:
  - **Books**: *The Design of Everyday Things* (Norman), *Don't Make Me Think* (Krug), *Refactoring UI* (Schoger & Wathan).
  - **Psychology**: *Aesthetic-Usability Effect* (beautiful is perceived usable), *Fitts's Law* (accessible target sizes), *Hick's Law* (minimize choices), *Miller's Law* (chunk options under $7 \pm 2$).
  - **Philosophy**: *Zen Minimalism / Shibui* (simple, unobtrusive beauty), *Occam's Razor* (simplest layout is best), *Wabi-Sabi* (appreciate natural flow/authenticity).

### 13. Testing, TDD, & Bug Prevention
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

## 🧪 Testing and Verification

- Run `npm test` after any modifications to verify integration tests pass.
- Verify syntax using `node --check assets/js/<file>.js` after editing JS files.
- The test suite is modularized:
  - `tests/catalog.test.js`: Validates search, pagination, and filters.
  - `tests/player.test.js`: Validates playback detail rendering and progress saving.
  - `tests/shorts.test.js`: Validates the vertical feed, speed, keyboard shortcuts, and nudge overlays.
  - `tests/routing.test.js`: Validates static page routing.
  - `tests/integration.test.js`: Orchestrates the server and browser setups, importing and executing the modular test blocks.

### 💎 Workflow: The Diamond Iterative Process
Before staging or pushing code, run this strict loop to iteratively audit and improve code quality:

1. **Check**: Run `node --check assets/js/<file>.js` and `npm test` at baseline. Spot any code standard violations or test failures.
2. **Plan**: Design small, behavior-preserving transformations (Extract Function, Rename, etc.) to address the issues.
3. **Execute**: Make exactly ONE edit. Check syntax immediately with `node --check`.
4. **Review**: Run `npm test` and review git diffs. If any issues are found or test coverage fails, return to step 1 and loop until 100% clean and correct.


---

## 🛠️ Antigravity Customization Capabilities

The workspace customization root (`.agents/`) supports the following customization components to extend Antigravity's capabilities:

### 1. Style Guidelines & Rules (`AGENTS.md`)
- This file defines project-scoped behavioral boundaries, coding rules, and constraints that are automatically loaded at the start of every pair programming session.

### 2. Custom Task Workflows (Skills)
Skills are defined under `.agents/skills/<skill_name>/` and can include:
- **`SKILL.md`** (Required): Contains YAML frontmatter defining name/description, and detailed instructions for the task.
- **`scripts/`** (Optional): Supporting scripts, linters, or command line utilities to automate task execution.
- **`examples/`** (Optional): Reference implementations showing how the task is solved.
- **`resources/`** (Optional): File templates or static assets required by the skill.
- **`references/`** (Optional): Extended documentation or guidelines.

### 3. Model Context Protocol Integration (`mcp_config.json`)
You can expose custom external tools and services to Antigravity at the project level by creating `.agents/mcp_config.json` defining MCP servers:
```json
{
  "mcpServers": {
    "my-helper-tools": {
      "command": "node",
      "args": ["./scripts/mcp-server.js"]
    }
  }
}
```

### 4. Custom Subagents
You can define, configure, and orchestrate specialized subagents using `define_subagent` and `invoke_subagent` tools to delegate parallel coding or research tasks.

---

## 🧩 Skills Reference

Skills live in `.agents/skills/`. Invoke the relevant skill when the task matches:

| Trigger | When to use | Description |
|---|---|---|
| `/refactor <file>` | Refactoring JS modules | Guided clean-code refactor following Uncle Bob rules and module boundaries |
| `/clean-check [file]` | Auditing code quality | Read-only audit of a JS file against `docs/clean_code_guidelines.md` |
| `/build-db` | Rebuilding catalog | Runs `python3 build-db.py` to regenerate `db/` from a catalog export |
| `/reflect` | End of session | Captures session learnings and updates AI config files |
| `/e2e-test` | Writing or extending tests | Puppeteer e2e suite authoring — structure, assertions, screenshots, wiring into `integration.test.js` |
| `/add-movie <url> <title> <hints>` | Adding a movie to catalog | Writes `db/<slug>.json` and registers in `db/index.json` |

