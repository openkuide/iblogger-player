# Contributing to iblogger-player

Thank you for taking the time to contribute to **iblogger-player** — a pure static, single-page HLS video player and bilingual movie catalog built to be lightweight, maintainable, and deployable via GitHub Pages without a build step.

> [!IMPORTANT]
> Before contributing any code, read this document fully. It defines the behavioral contract for all contributions. Code that does not meet these standards will be declined — not because we want to gatekeep, but because we want every contributor to leave the codebase better than they found it.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
   - [1.1 Recommended Reading & Inspiration](#11-recommended-reading--inspiration)
2. [Architecture Overview](#2-architecture-overview)
3. [Code Standards — Clean Code Rules](#3-code-standards--clean-code-rules)
   - [3.1 Naming](#31-naming)
   - [3.2 Functions](#32-functions)
   - [3.3 Single Level of Abstraction](#33-single-level-of-abstraction)
   - [3.4 DRY — Don't Repeat Yourself](#34-dry--dont-repeat-yourself)
   - [3.5 Comments](#35-comments)
   - [3.6 Security](#36-security)
   - [3.7 Bilingual Requirement](#37-bilingual-requirement)
   - [3.8 The Boy Scout Rule](#38-the-boy-scout-rule)
   - [3.9 Error Handling & Exception Separation](#39-error-handling--exception-separation)
   - [3.10 YAGNI (You Aren't Gonna Need It)](#310-yagni-you-arent-gonna-need-it)
   - [3.11 Formatting & Readability](#311-formatting--readability)
4. [Data Contributions — Adding Movies](#4-data-contributions--adding-movies)
5. [Code Contributions — UI, Logic, Features](#5-code-contributions--ui-logic-features)
6. [Commit Convention](#6-commit-convention)
7. [Pull Request Process](#7-pull-request-process)
8. [What We Will Never Accept](#8-what-we-will-never-accept)

---

## 1. Philosophy

This project is guided by the principles of **Clean Code** as defined by Robert C. Martin (Uncle Bob). The underlying belief is simple:

> *"The only way to go fast is to go well."*
> — Robert C. Martin

Code is read far more often than it is written. Every function, variable name, and comment is a message to a future developer — including yourself. Write for the reader, not the compiler.

Three principles shape every decision in this codebase:

- **Clarity over Cleverness** — A clear, simple solution beats a clever, compact one every time.
- **Single Responsibility** — Every unit of code (function, module, file) does exactly one thing.
- **Honesty** — Code should say what it does and do what it says. No surprises.

### 1.1 Recommended Reading & Inspiration

To align with the craftsmanship standards and philosophy of this repository, all contributors are highly encouraged to read and draw inspiration from the following literature:

* **Clean Code: A Handbook of Agile Software Craftsmanship** by *Robert C. Martin (Uncle Bob)*
  * *Why:* The core foundation of this project's code quality rules. It teaches meaningful naming, small single-responsibility functions, and clean formatting.
* **The Clean Coder: A Code of Conduct for Professional Programmers** by *Robert C. Martin (Uncle Bob)*
  * *Why:* Establishes what it means to be a professional developer—handling estimates, saying "no", and taking responsibility for code quality.
* **Clean Architecture: A Craftsman's Guide to Software Structure and Design** by *Robert C. Martin (Uncle Bob)*
  * *Why:* Teaches clean boundaries, separation of concerns, and keeping core policies independent of UI/database details.
* **Clean Craftsmanship: Disciplines, Standards, and Ethics** by *Robert C. Martin (Uncle Bob)*
  * *Why:* A deeper dive into TDD, refactoring, simple design, and the ethical standards of software craftsmanship.
* **Refactoring: Improving the Design of Existing Code** by *Martin Fowler*
  * *Why:* Essential instruction on how to clean up code using small, safe, and verifiable behavior-preserving steps.
* **The Pragmatic Programmer: Your Journey to Mastery** by *David Thomas & Andrew Hunt*
  * *Why:* Offers practical advice on staying adaptable, keeping your code DRY, and avoiding broken windows in your project.
* **Working Effectively with Legacy Code** by *Michael Feathers*
  * *Why:* Crucial techniques for modifying and refactoring existing code safely without breaking features.

---

## 2. Architecture Overview

The application is a single HTML file (`index.html`) with three URL-driven modes, routed by `assets/js/app.js`:

| Mode | URL Trigger | Entry Module |
| :--- | :--- | :--- |
| **Catalog** (home grid) | No params | `home.js` |
| **Movie** (detail + player) | `?id=<slug>` | `movie.js` |
| **Shorts** (vertical feed) | `?mode=shorts` | `shorts.js` |

### Module Boundaries

Each module has **one and only one responsibility**. Do not cross these boundaries.

| Module | Responsibility |
| :--- | :--- |
| `app.js` | URL routing — reads params, bootstraps the correct mode |
| `home.js` | Catalog browse, search, filter, sort, pagination (Vue app) |
| `movie.js` | Fetch and render movie detail, episode list, resume logic |
| `player.js` | Video.js instance — configuration and playback hooks only |
| `shorts.js` | Vertical shorts feed and client-side recommendations |
| `watch-progress.js` | localStorage persistence — no DOM access, no playback |
| `ads.js` | Ad slideshow and banner initialization only |
| `utils.js` | Shared helpers — the **only** place for cross-module code |

> [!WARNING]
> If you find yourself importing from `movie.js` inside `home.js`, or building DOM nodes inside `app.js`, you are violating the architecture. Shared logic belongs in `utils.js`. No exceptions.

### Data Layer

```
db/
├── index.json        # Slim catalog index (slug, title, poster, year, rating, genres, episodeCount)
└── <slug>.json       # Full movie detail: description, language, episodes[]
```

`db/` is **generated output** from `build-db.py`. Bulk changes go through the export file and a rebuild. Manual single-movie edits are allowed but must update **both** `db/<slug>.json` and `db/index.json` atomically.

---

## 3. Code Standards — Clean Code Rules

These are not suggestions. They are enforced during code review.

### 3.1 Naming

> *"The name of a variable, function, or class should answer all the big questions. It should tell you why it exists, what it does, and how it is used."*
> — Uncle Bob

| Rule | Bad | Good |
| :--- | :--- | :--- |
| Use intention-revealing names | `const x = 24;` | `const MOVIES_PER_PAGE = 24;` |
| Use pronounceable, searchable names | `const cLst = [];` | `const catalogList = [];` |
| Functions: use verb phrases | `function start() {}` | `function initCatalogMode() {}` |
| Constants: use SCREAMING_SNAKE_CASE | `const moviesPerPage = 24;` | `const MOVIES_PER_PAGE = 24;` |
| Booleans: use `is`, `has`, `can` prefix | `let visible = true;` | `let isVisible = true;` |
| Avoid disinformation | `const movieList = {};` | `const movieMap = {};` |

### 3.2 Functions

> *"The first rule of functions is that they should be small. The second rule of functions is that they should be smaller than that."*
> — Uncle Bob

- **Hard ceiling: 20 lines.** Rarely up to 30. If a function grows beyond that, extract.
- **Do one thing.** If you can describe a function's purpose using the word "and", split it.
- **Maximum 2 arguments.** A 3rd argument must be wrapped in an options object. Never use 4+.
- **No side effects.** A function named `getMovieTitle()` must not mutate state or touch the DOM.

```js
// ❌ Bad — does too many things, too many arguments
function loadMovie(id, lang, isAutoPlay, showRelated, callback) {
  const data = fetch(`db/${id}.json`);
  document.title = data.title[lang];
  renderEpisodes(data.episodes);
  if (showRelated) renderRelated(data.genres);
  if (isAutoPlay) player.play();
  callback(data);
}

// ✅ Good — single responsibility, delegates clearly
async function loadMovieData(slug) {
  const res = await fetch(`db/${slug}.json`);
  return res.json();
}

function applyMovieToPage(movie) {
  setPageTitle(movie.title);
  renderEpisodeList(movie.episodes);
  renderRelatedTitles(movie.genres);
}
```

### 3.3 Single Level of Abstraction

Every function should contain statements at the **same level of abstraction**. Do not mix high-level orchestration with low-level DOM manipulation in the same function.

```js
// ❌ Bad — mixes routing logic with raw DOM building
function startMovieMode(slug) {
  fetch(`db/${slug}.json`).then(r => r.json()).then(data => {
    const el = document.createElement('div');
    el.className = 'movie-title';
    el.textContent = data.title.en;
    document.getElementById('movieView').appendChild(el);
  });
}

// ✅ Good — each function operates at one level
async function startMovieMode(slug) {
  const movie = await loadMovieData(slug);
  renderMovieDetail(movie);
}

function renderMovieDetail(movie) {
  const titleEl = buildTitleElement(movie.title);
  document.getElementById('movieView').appendChild(titleEl);
}

function buildTitleElement(title) {
  const el = document.createElement('div');
  el.className = 'movie-title';
  el.textContent = title.en;
  return el;
}
```

### 3.4 DRY — Don't Repeat Yourself

> *"Duplication is the primary enemy of a well-designed system."*
> — Uncle Bob

- If the same logic appears in two places, it belongs in `utils.js`.
- If the same DOM pattern is used in two modules, extract it into a shared builder function.
- Copy-paste is a red flag — always pause and ask: "Where does this truly belong?"

### 3.5 Comments

> *"Don't comment bad code — rewrite it."*
> — Uncle Bob

Comments must explain the **why**, never the **what**.

```js
// ❌ Bad — restates what the code already says
// Set the display to none
el.style.display = 'none';

// ✅ Good — explains a non-obvious reason
// Video.js re-adds the `vjs-playing` class asynchronously after `.pause()`,
// so we defer the UI state update by one tick to avoid a flash.
setTimeout(() => updatePlaybackUI(), 0);
```

**No zombie code.** Commented-out source code must be deleted. Git remembers everything — use `git log` to recover it.

### 3.6 Security

- **Never use `innerHTML`** with any user-supplied or API-sourced text. Use `textContent` or `createElement`.
- All external CDN assets (Video.js, Google Fonts) must be loaded with **Subresource Integrity (SRI)** hashes.
- Never inject raw URL parameters into the DOM.

### 3.7 Bilingual Requirement

Every user-facing string must be bilingual:

```json
{ "en": "Episode 1", "km": "ភាគទី១" }
```

Never add English-only text to the UI. Never drop the Khmer (`km`) key from any data object.

### 3.8 The Boy Scout Rule

> *"Always leave the campground cleaner than you found it."*
> — Uncle Bob

If you see messy code while making your changes (e.g., long functions, poor variable names, commented-out code, or duplicate logic), clean it up. Even a tiny improvement keeps the codebase healthy and prevents technical debt from accumulating.

### 3.9 Error Handling & Exception Separation

- **Prefer Exceptions over Return Codes**: Use JS exceptions (`throw new Error(...)`) rather than returning error status codes or `null` values which force calling functions to immediately handle the error.
- **Extract Try-Catch Blocks**: Error handling is *one thing*. A function containing a `try-catch` block should do nothing else. Extract the body of the `try` and `catch` blocks into separate helper functions to keep the core logic readable.

```js
// ❌ Bad — mixes business logic and error handling
function loadConfig() {
  try {
    const raw = localStorage.getItem('config');
    const parsed = JSON.parse(raw);
    applyConfig(parsed);
  } catch (err) {
    console.error('Failed to load config', err);
    useDefaultConfig();
  }
}

// ✅ Good — error handling is isolated
function loadConfig() {
  try {
    tryLoadConfig();
  } catch (err) {
    handleConfigError(err);
  }
}

function tryLoadConfig() {
  const raw = localStorage.getItem('config');
  applyConfig(JSON.parse(raw));
}

function handleConfigError(err) {
  console.error('Failed to load config', err);
  useDefaultConfig();
}
```

### 3.10 YAGNI (You Aren't Gonna Need It)

Keep it static, keep it simple. Never implement features, abstractions, or configurations based on speculative future needs. Only write the code necessary to fulfill the current, concrete requirements. This keeps the single-page application lightweight and easy to maintain.

### 3.11 Formatting & Readability

- **Variable Declarations**: Declare variables close to their usage. Do not group all variable declarations at the top of a large function if they are only used near the bottom.
- **File Length**: Keep files small and focused. If a helper module or client file exceeds 500 lines, it is likely doing too many things and should be refactored into smaller, focused modules.
- **Line Length**: Keep lines under 100 characters to ensure readability on split-screen views.

---

## 4. Data Contributions — Adding Movies

### Option A: Manual Entry (Single Movie)

**Step 1 — Create the movie detail file:**

```
db/<movie-slug>.json
```

The slug must be lowercase and hyphen-separated, e.g., `the-tuxedo.json`.

```json
{
  "slug": "the-tuxedo",
  "title": { "en": "The Tuxedo", "km": "វិរៈជនអាវទូស៊ីដូ" },
  "description": {
    "en": "Jimmy Tong is a taxi driver who gets a job as a chauffeur...",
    "km": "ជីមី ថុង គឺជាអ្នកបើកបរតាក់ស៊ីម្នាក់..."
  },
  "poster": "https://example.com/poster.jpg",
  "year": 2002,
  "rating": 5.4,
  "genres": ["ACTION", "COMEDY", "FANTASY"],
  "language": "English",
  "episodeCount": 1,
  "episodes": [
    {
      "ep": "1",
      "title": { "en": "Episode 1", "km": "ភាគទី1" },
      "url": "https://example.com/stream/index.m3u8",
      "type": "M3U8",
      "final": true
    }
  ]
}
```

**Step 2 — Register in the index:**

Add a slim entry to `db/index.json`:

```json
{
  "slug": "the-tuxedo",
  "title": { "en": "The Tuxedo", "km": "វិរៈជនអាវទូស៊ីដូ" },
  "poster": "https://example.com/poster.jpg",
  "year": 2002,
  "rating": 5.4,
  "genres": ["ACTION", "COMEDY", "FANTASY"],
  "episodeCount": 1
}
```

> [!NOTE]
> The `slug`, `title`, `year`, `rating`, `genres`, and `episodeCount` fields must be **identical** in both files. A mismatch causes broken catalog filters.

**Step 3 — Validate before committing:**

```bash
# Check for duplicate slug
ls db/ | grep "the-tuxedo"

# Validate JSON syntax
python3 -c "import json, sys; json.load(open('db/the-tuxedo.json'))"
python3 -c "import json, sys; json.load(open('db/index.json'))"
```

Valid genres are: `ACTION` · `ANIMATION` · `COMEDY` · `DOCUMENTARY` · `DRAMA` · `FANTASY` · `HORROR` · `ROMANCE` · `SCI_FI` · `THRILLER`

### Option B: Bulk Import (Rebuild from Export)

For large catalog imports, use the build script:

```bash
python3 build-db.py movies-export-YYYY-MM-DD.json
```

This regenerates `db/index.json` and all `db/<slug>.json` files from a single source export.

---

## 5. Code Contributions — UI, Logic, Features

### Running Locally

```bash
# Clone the repository
git clone https://github.com/openkuide/iblogger-player.git
cd iblogger-player

# Serve locally (required to avoid browser CORS restrictions on local fetch)
python3 -m http.server 8765

# Open in browser
open http://localhost:8765
```

### Validation Checklist

Run these before every commit involving JavaScript:

```bash
# Syntax check (no linter configured — keep it lightweight)
node --check assets/js/app.js
node --check assets/js/home.js
node --check assets/js/movie.js
node --check assets/js/player.js
node --check assets/js/shorts.js
node --check assets/js/utils.js

# Integration tests (requires Chrome installed)
npm test
```

### UI & Design Rules

| Rule | Detail |
| :--- | :--- |
| **Design tokens** | Use CSS custom properties from `:root` — never hardcode colors or radii (`--bg`, `--fg`, `--accent`, `--hairline`, `--radius`, `--blur`) |
| **Responsive** | All layout changes must work at `max-width: 560px` (mobile) |
| **Bilingual UI** | Every label must use `.lang-en-block` / `.lang-km-block` pattern |
| **Zero dependencies** | No new npm packages. No bundlers. No frameworks beyond Vue 3 (CDN, SRI-pinned) |
| **Accessibility** | Interactive elements need `aria-label` or `title` attributes |

---

## 6. Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <short imperative description>
```

| Type | When to use |
| :--- | :--- |
| `feat` | A new feature or movie entry |
| `fix` | A bug fix |
| `refactor` | Code restructure without behavior change |
| `style` | Formatting, spacing, visual-only changes |
| `docs` | Documentation only |
| `test` | Tests only |
| `chore` | Tooling, config, gitignore |

**Examples:**

```bash
git commit -m "feat: add the-tuxedo movie with bilingual description"
git commit -m "fix: prevent XSS in episode title rendering"
git commit -m "refactor: extract buildEpisodeButton from renderEpisodeList"
git commit -m "docs: update CONTRIBUTING with clean code rules"
```

> [!IMPORTANT]
> Commit messages must be in the imperative mood: *"add"*, not *"added"* or *"adds"*.

---

## 7. Pull Request Process

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/add-the-tuxedo
   ```

2. **Make your changes** following all standards in this document.

3. **Validate** your changes (see Section 5 checklist).

4. **Push** to your fork:
   ```bash
   git push origin feat/add-the-tuxedo
   ```

5. **Open a Pull Request** targeting the `main` branch with:
   - A clear title using the commit convention format.
   - A description of what changed and why.
   - Screenshots for any visual changes.

6. A maintainer will review for Clean Code compliance, bilingual completeness, and functional correctness before merging.

---

## 8. What We Will Never Accept

The following will result in an immediate PR rejection without further review:

| Violation | Reason |
| :--- | :--- |
| `innerHTML` with dynamic content | XSS vulnerability |
| A build step, bundler, or transpiler | Breaks the zero-dependency contract |
| Functions exceeding ~30 lines without discussion | Violates Single Responsibility |
| Copy-pasted logic across modules | Violates DRY |
| English-only UI text | Breaks bilingual contract |
| Commented-out (zombie) code | Violates clean code standards |
| `db/index.json` changes without matching `db/<slug>.json` | Breaks catalog integrity |
| CDN assets without SRI hashes | Security regression |
| Hardcoded colors or sizes (not using CSS tokens) | Breaks design system consistency |

---

*This document is the law of this repository. It is inspired by and derived from the principles in **Clean Code** by Robert C. Martin. If in doubt, ask — we would rather answer a question upfront than review broken code later.*
