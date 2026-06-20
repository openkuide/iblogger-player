# iblogger-player

Single-page static HLS video player + movie catalog. **No backend, no build step, no framework bundling** — plain ES modules served as-is from GitHub Pages. Keep it that way: never introduce a bundler, transpiler, or server-side dependency.

## Commands

```bash
npm test                                  # Puppeteer integration tests (tests/integration.test.js)
python3 build-db.py movies-export-*.json  # Regenerate db/ from a catalog export
python3 -m http.server 8765               # Serve locally → http://localhost:8765
node --check assets/js/<file>.js          # Quick syntax check (no linter configured)
```

## Architecture

One page (`index.html`) with three modes routed by `app.js` via URL params: **home** (catalog grid), **movie** (detail + player), **shorts** (vertical feed).

| Module | Single responsibility |
|---|---|
| `assets/js/app.js` | Main routing coordinator — decides which mode starts |
| `assets/js/home.js` | Catalog browse/search/filter (Vue app) |
| `assets/js/movie.js` | Fetch + render movie detail and episode list |
| `assets/js/player.js` | Video.js instance config and playback only |
| `assets/js/shorts.js` | Shorts vertical feed + client-side recommendations |
| `assets/js/ads.js` | Ad slideshow / banner init only |
| `assets/js/watch-progress.js` | localStorage persistence of watch state (resume positions, watched episodes, last episode) — no DOM, no playback |
| `assets/js/utils.js` | Shared helpers (storage, fetch) — the only place for cross-module code |

**Do not cross these boundaries.** If two modules need the same logic, it goes in `utils.js`.

## Views (`index.html`)

Seven static `display:none` view divs; `app.js` shows exactly one per route:

| View ID | URL pattern |
|---|---|
| `#homeView` | default (no params) |
| `#playerView` | `?id=<slug>[&ep=<n>]` or `?src=<m3u8>` |
| `#shortsView` | `?mode=shorts` |
| `#legalView` | `?page=legal` |
| `#aboutView` | `?page=about` |
| `#contactView` | `?page=contact` |
| `#termsView` | `?page=terms` |

## Data layer (`db/`)

- `db/index.json` — slim catalog index (slug, titles, poster, year, rating, genres, episodeCount).
- `db/<slug>.json` — full movie detail incl. bilingual description and HLS episode URLs.
- **`db/` is generated output** of `build-db.py`. Bulk changes go through the export file + rebuild. Single-movie manual edits are allowed (see CONTRIBUTING.md) but must update **both** `db/<slug>.json` and `db/index.json`, and must be valid JSON.
- All user-facing text is bilingual: `{ "en": "...", "km": "..." }`. Never drop the Khmer (`km`) side.

## Code standards — MANDATORY

`docs/clean_code_guidelines.md` is the law of this repo. Read it before writing or refactoring code. Summary:

1. **Functions < 20 lines** (hard ceiling ~30), do **one thing**, max 2 args (3rd = options object).
2. **Single level of abstraction** per function — no raw DOM building inside orchestration functions.
3. **Intention-revealing names** — verbs for functions (`renderMovie`), nouns for values (`MOVIES_PER_PAGE`).
4. **DRY** — shared logic lives in `utils.js`, never copy-pasted between modules.
5. **Comments explain *why*, never *what*. No commented-out (zombie) code — delete it; git remembers.**
6. **Boy Scout Rule** — leave the codebase cleaner than you found it. Clean up nearby mess as you go.
7. **Error Handling** — prefer Exceptions over Return Codes, and isolate `try-catch` blocks completely.
8. **YAGNI** — keep it simple/static; no speculative abstractions or futuristic features.
9. **Self-Refinement & Learning** — If you identify a bug, fix a test failure, or discover a process/code quality improvement (either by user feedback or your own checking), you MUST immediately update the workspace instruction files (CLAUDE.md, .cursorrules, .agents/AGENTS.md, and skills) to permanently persist this lesson so it is not repeated.
10. **Design, Aesthetics, & Usability** — For UI/UX changes, enforce premium aesthetics (vibrant dark modes, HSL/color harmony, Outfit/Inter typography, clean glassmorphism, smooth micro-animations). Audit visual designs using the following:
    - **Books**: *The Design of Everyday Things* (Norman), *Don't Make Me Think* (Krug), *Refactoring UI* (Schoger & Wathan).
    - **Psychology**: *Aesthetic-Usability Effect* (beautiful is perceived usable), *Fitts's Law* (accessible target sizes), *Hick's Law* (minimize choices), *Miller's Law* (chunk options under $7 \pm 2$).
    - **Philosophy**: *Zen Minimalism / Shibui* (simple, unobtrusive beauty), *Occam's Razor* (simplest layout is best), *Wabi-Sabi* (appreciate natural flow/authenticity).
11. **Testing, TDD, & Bug Prevention** — When testing, refactoring, or fixing bugs, follow strict quality policies:
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


### Recommended Reading List:
- **Clean Code** — *Robert C. Martin (Uncle Bob)*
- **The Clean Coder** — *Robert C. Martin (Uncle Bob)*
- **Clean Architecture** — *Robert C. Martin (Uncle Bob)*
- **Clean Craftsmanship** — *Robert C. Martin (Uncle Bob)*
- **Refactoring** — *Martin Fowler*
- **The Pragmatic Programmer** — *David Thomas & Andrew Hunt*
- **Working Effectively with Legacy Code** — *Michael Feathers*

### SonarQube Core Rules for Developers:
- **No Direct innerHTML**: Avoid XSS risks; use `replaceChildren` or `textContent` (safe DOM updates).
- **Cognitive Complexity**: Keep control nesting low (max 1 or 2 levels). No complex conditional logic.
- **Unused Code**: Delete unused imports, functions, parameters, or variables (YAGNI).
- **Strict Equality**: Always use `===` and `!==` instead of `==` and `!=`.
- **Declaring Variables**: Always declare variables using `const` or `let`. Never use `var` or implicit global scopes.
- **Console Log Prevention**: Do not commit `console.log` statements in production code. Use `console.error` / `console.warn` for errors only.
- **Promise Rejections**: Always handle promise errors explicitly.

---

## Workflow: The Diamond Iterative Process
Before making any changes or pushing to remote, follow this strict loop to refine your code:

1. **Check**: Run `node --check assets/js/<file>.js` and `npm test` at baseline. Spot any code standard violations or test failures.
2. **Plan**: Design small, behavior-preserving transformations (Extract Function, Rename, etc.) to address the issues.
3. **Execute**: Make exactly ONE edit. Check syntax immediately with `node --check`.
4. **Review**: Run `npm test` and review git diffs. If any issues are found or test coverage fails, return to step 1 and loop until 100% clean and correct.

- Commits: conventional format — `feat:`, `fix:`, `refactor:`, `docs:`, `test:`.
- `/refactor <file>` — guided clean-code refactoring; `/clean-check [file]` — audit only; `/build-db` — rebuild catalog; `/e2e-test` — write or extend Puppeteer e2e tests.
- `/add-movie <url> <title> <hints>` — add a Douyin short or multi-episode drama to `db/` and register in `db/index.json`.
- `.claude/settings.local.json`, `.remember/`, and this file are gitignored on purpose (everything in the repo root is published to GitHub Pages).

## Diagnosing `index.html` issues

- For any ambiguous HTML fix request, run `git diff index.html` first to understand the current modified state.
- To recover original content at a line range: `git show HEAD:index.html | sed -n '<start>,<end>p'`
