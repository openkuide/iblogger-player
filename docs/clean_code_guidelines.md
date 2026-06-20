# Clean Code Guidelines

This document establishes the Clean Code and Refactoring standards for the `iblogger-player` project. Adherence to these guidelines is mandatory for all contributors. Following these principles ensures that our codebase remains readable, maintainable, and easy to extend—even as a purely static, framework-less, single-page application.

---

## 📌 Table of Contents
1. [Meaningful Naming Standards](#1-meaningful-naming-standards)
2. [Function Rules & Design](#2-function-rules--design)
3. [Single Level of Abstraction (SLA)](#3-single-level-of-abstraction-sla)
   - [3.1 The Three Levels of Abstraction](#31-the-three-levels-of-abstraction)
   - [3.2 The Step-Down Rule](#32-the-step-down-rule)
   - [3.3 Case Study: Refactoring the Movie Recommendation System](#33-case-study-refactoring-the-movie-recommendation-system)
4. [DRY & Separation of Concerns](#4-dry--separation-of-concerns)
5. [Comments & Documentation Rules](#5-comments--documentation-rules)
6. [Error Handling & Exceptions](#6-error-handling--exceptions)
7. [The Boy Scout Rule & YAGNI](#7-the-boy-scout-rule--yagni)
8. [Recommended Reading & Inspiration](#8-recommended-reading--inspiration)

---

## 1. Meaningful Naming Standards

Names are the primary way we communicate intent. A good name should answer: why it exists, what it does, and how it is used.

### 1.1 Intent-Revealing Names
Avoid generic, ambiguous, or single-letter names. A variable name should describe the data it holds, not just its type.
* **Bad**: `const x = 24;`, `let d = new Date();`, `const data = [];`
* **Good**: `const MOVIES_PER_PAGE = 24;`, `let currentDate = new Date();`, `const movieCatalog = [];`

### 1.2 Naming Conventions
* **Functions**: Must use **camelCase** and begin with a verb or verb phrase (e.g., `renderMovieGrid`, `fetchMovieDetail`, `initializePlayer`).
* **Variables & Parameters**: Must use **camelCase** and use nouns or noun phrases (e.g., `activeEpisodeUrl`, `currentSlug`).
* **Constants**: Must use **SCREAMING_SNAKE_CASE** (e.g., `DEFAULT_PLAYBACK_RATE`, `MAX_RECOMMENDED_TITLES`).
* **Booleans**: Must use intention-revealing prefixes such as `is`, `has`, `can`, or `should` (e.g., `isPlaying`, `hasEpisodes`, `canResumePlayback`).
  * **Bad**: `const active = true;`, `const end = false;`
  * **Good**: `const isActive = true;`, `const isFinalEpisode = false;`

### 1.3 Avoid Disinformation and Noise
* **Disinformation**: Avoid naming a collection suffix as `List` if it is actually a `Set` or `Map`. Use `movieMap` instead of `movieList` for key-value stores.
* **Noise Words**: Avoid adding meaningless suffixes like `Info`, `Data`, or `Object` to names.
  * **Bad**: `const movieDataObj = {};`, `function getMovieInfo() {}`
  * **Good**: `const movie = {};`, `function getMovie() {}`

### 1.4 Contextual Naming
Do not add redundant context to variable names if the context is already implied by the surrounding scope or module.
* **Bad** (inside `movie.js`): `const movieSlug = "the-tuxedo";`, `function renderMovieTitle(movieTitle) {}`
* **Good**: `const slug = "the-tuxedo";`, `function renderTitle(title) {}`

---

## 2. Function Rules & Design

Functions should be the smallest units of execution in our code.

### 2.1 The Two Rules of Functions (Uncle Bob)
1. **Functions must be small**: They should ideally be under 20 lines of code, and rarely exceed 30 lines.
2. **Functions must do one thing**: They should do it well, and they should do it only. If a function contains steps that can be divided into distinct sub-tasks, extract them.

### 2.2 Nesting and Indentation
Keep function complexity low. A function should have a **maximum nesting depth of 1 or 2 levels** of control flow (loops or conditionals). If you need deeply nested `if` or `for` loops, extract the inner loops into their own named functions.

### 2.3 Function Arguments (Monadic to Diadic)
* **Ideal**: 0 arguments (niladic) or 1 argument (monadic).
* **Acceptable**: 2 arguments (diadic).
* **Maximum**: 3 arguments (triadic) is the absolute limit. If a function requires 3 or more arguments, wrap them in a single options/configuration object.
  * **Bad**: `function createPlayer(id, url, autoplay, mute, volume) {}`
  * **Good**: `function createPlayer(id, options) {}`

### 2.4 Pure Functions & Side Effects
A function should not perform hidden mutations or side effects. If a function is named `getMovieTitle(movie)`, it should only return the title and must not modify the `movie` object or touch the DOM.

### 2.5 Before & After Extraction Example
```js
// ❌ Bad — too long, does multiple things, mixes DOM logic and rendering
function loadAndRenderMovie(slug) {
  const loader = document.getElementById("loader");
  loader.style.display = "block";
  
  fetch(`db/${slug}.json`)
    .then(res => res.json())
    .then(movie => {
      loader.style.display = "none";
      document.title = movie.title.en;
      
      const container = document.getElementById("episodes");
      container.innerHTML = ""; // XSS vulnerability warning if innerHTML was misused later
      
      movie.episodes.forEach(episode => {
        const btn = document.createElement("button");
        btn.className = "ep-btn";
        btn.textContent = `EP ${episode.ep}: ${episode.title.en}`;
        btn.onclick = () => playStream(episode.url);
        container.appendChild(btn);
      });
    });
}

// ✅ Good — functions are small, do one thing, and are highly readable
async function loadMovieDetail(slug) {
  showLoader();
  try {
    const response = await fetch(`db/${slug}.json`);
    const movie = await response.json();
    return movie;
  } finally {
    hideLoader();
  }
}

function displayMovie(movie) {
  updatePageTitle(movie.title.en);
  renderEpisodeButtons(movie.episodes);
}

function renderEpisodeButtons(episodes) {
  const container = document.getElementById("episodes");
  container.replaceChildren(); // Safe, clean alternative to innerHTML = ""
  
  episodes.forEach(episode => {
    const button = buildEpisodeButton(episode);
    container.appendChild(button);
  });
}

function buildEpisodeButton(episode) {
  const button = document.createElement("button");
  button.className = "ep-btn";
  button.textContent = `EP ${episode.ep}: ${episode.title.en}`;
  button.onclick = () => playStream(episode.url);
  return button;
}
```

---

## 3. Single Level of Abstraction (SLA)

Every statement inside a function must be at the **same level of abstraction**. Mixing high-level flow control with low-level details (like DOM operations or string parsing) ruins readability.

### 3.1 The Three Levels of Abstraction
* **High-Level (Orchestration)**: Coordinates the program logic and high-level actions.
  * *Example*: `startMovieMode(slug)` calling `loadMovieDetail()` and `displayMovie()`.
* **Mid-Level (Business/Domain Logic)**: Operates on domain concepts.
  * *Example*: `filterCatalogByGenre(genre)` or `calculateWatchPercentage(current, total)`.
* **Low-Level (Mechanics/Implementation)**: Directly manipulates APIs, strings, network requests, or the DOM.
  * *Example*: `element.style.display = "none"` or `localStorage.setItem(key, val)`.

### 3.2 The Step-Down Rule
Read the code from top to bottom. Every function should be followed by the functions at the next level of abstraction down, reading like a narrative.

### 3.3 Case Study: Refactoring the Movie Recommendation System

To see Single Level of Abstraction in action, let's examine the movie recommendation system. It matches movies based on genre overlaps, sorts them, and displays cards.

#### ❌ Bad (Mixed Levels of Abstraction)
This single function handles the fetch promise, calculates genre scores, sorts, slices, sets up fallback SVG images, creates DOM elements, and updates the display styles:

```js
function loadIndexAndRelated(movie) {
  fetch("db/index.json")
    .then(r => (r.ok ? r.json() : []))
    .then(all => {
      const genres = new Set(movie.genres || []);
      const related = all
        .filter(m => m.slug !== movie.slug)
        .map(m => {
          const overlap = (m.genres || []).filter(g => genres.has(g)).length;
          return { m: m, score: overlap };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(x => x.m);

      if (!related.length) return;

      const relTitle = document.querySelector("#relatedWrap .section-title");
      if (relTitle) {
        relTitle.textContent = LANG === "km" ? "អ្នកទស្សនាបានមើល" : "Viewers also watched";
      }

      const wrap = document.getElementById("related");
      wrap.textContent = "";
      related.forEach(m => {
        const a = document.createElement("a");
        a.className = "rel-card";
        a.href = "?id=" + encodeURIComponent(m.slug);
        
        // ... (DOM construction lines for poster image, fallback SVG icon, title caption)
        
        wrap.appendChild(a);
      });
      document.getElementById("relatedWrap").style.display = "block";
    });
}
```

#### ✅ Good (Clean Levels of Abstraction)
By decomposing the task, each function handles exactly one level of abstraction, making the business logic testable and the DOM rendering simple:

```js
// 1. High-Level Orchestrator (Orchestrates flow only)
async function loadAndRenderRelatedMovies(currentMovie) {
  try {
    const catalog = await fetchCatalogIndex();
    const related = computeRelatedMovies(currentMovie, catalog);
    if (related.length > 0) {
      renderRelatedSection(related);
    }
  } catch (error) {
    console.error("Failed to load recommendations:", error);
  }
}

// 2. Mid-Level Business Logic (Pure data processing)
function computeRelatedMovies(currentMovie, catalog, limit = 12) {
  const currentGenres = new Set(currentMovie.genres || []);
  return catalog
    .filter(movie => movie.slug !== currentMovie.slug)
    .map(movie => ({
      movie,
      score: calculateGenreOverlap(movie.genres || [], currentGenres)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.movie);
}

function calculateGenreOverlap(movieGenres, currentGenresSet) {
  return movieGenres.filter(genre => currentGenresSet.has(genre)).length;
}

// 3. Low-Level Mechanics (DOM manipulations)
function renderRelatedSection(relatedMovies) {
  updateSectionTitle();
  const container = document.getElementById("related");
  container.replaceChildren();
  
  relatedMovies.forEach(movie => {
    container.appendChild(buildRelatedCard(movie));
  });
  
  document.getElementById("relatedWrap").style.display = "block";
}
```

---

## 4. DRY & Separation of Concerns

### 4.1 DRY (Don't Repeat Yourself)
Duplication is the root of all software evil. If you find the same logic written in two modules (e.g., getting query parameters or accessing `localStorage`), extract it into `utils.js`.

### 4.2 Separation of Concerns
Each JavaScript module has **one clear responsibility**. Respect boundaries:
* `app.js` is the router/bootstrapper only. No DOM building.
* `home.js` controls the movie catalog. No player configurations.
* `movie.js` handles detail parsing and episode lists. No ad management.
* `player.js` interacts with the Video.js player API. No storage management.
* `watch-progress.js` operates the watch state persistence. No direct DOM updates.
* `utils.js` houses pure helper utilities.

---

## 5. Comments & Documentation Rules

### 5.1 Explain the "Why", Not the "What"
* Do not write comments that describe *what* a line of code does. The code itself must be clear enough to explain its action.
* Use comments to explain *why* something is done in an unusual way (e.g., browser bugs, performance limits, or external API quirks).
* **Bad**:
  ```js
  // Check if count is greater than 10
  if (count > 10) { ... }
  ```
* **Good**:
  ```js
  // Video.js requires a tick delay to ensure the DOM element is fully 
  // registered before initializing custom event listeners.
  setTimeout(() => initPlayerListeners(), 0);
  ```

### 5.2 Elimination of Zombie Code
Do not comment out code blocks and leave them in the repository. If code is no longer needed, **delete it**. Git remembers all commit history, making recovery simple.

---

## 6. Error Handling & Exceptions

Clean code handles errors gracefully without cluttering the primary flow.

### 6.1 Prefer Exceptions over Error Codes
Returning error codes or `null` forces the caller to immediately write conditional statements, leading to messy nested blocks. Use `throw new Error()` instead.

### 6.2 Separating Try-Catch Blocks
A function containing a `try-catch` block should do *nothing else*. The block bodies should be extracted into their own helper functions.

```js
// ❌ Bad — mixing error handling, storage, and logic in one function
function resumePlayback(slug) {
  try {
    const raw = localStorage.getItem(`progress_${slug}`);
    if (!raw) return;
    const progress = JSON.parse(raw);
    player.currentTime(progress.time);
  } catch (err) {
    console.warn("Failed to resume playback", err);
    player.currentTime(0);
  }
}

// ✅ Good — error handling is cleanly isolated from execution logic
function resumePlayback(slug) {
  try {
    tryResumePlayback(slug);
  } catch (err) {
    handleResumeError(err);
  }
}

function tryResumePlayback(slug) {
  const progress = getSavedProgress(slug);
  if (progress) {
    player.currentTime(progress.time);
  }
}

function handleResumeError(err) {
  console.warn("Failed to resume playback", err);
  player.currentTime(0);
}
```

---

## 7. The Boy Scout Rule & YAGNI

### 7.1 The Boy Scout Rule
> *"Always leave the campground cleaner than you found it."*
> — Uncle Bob

You don't need to rewrite entire modules, but when editing a function, clean up poor names, decompose long blocks, remove commented code, or fix minor format issues in the file. Micro-improvements prevent codebase decay over time.

### 7.2 YAGNI (You Aren't Gonna Need It)
Do not build speculative code, hooks, or complex configurations under the assumption that they will be needed "in the future." Keep implementation minimal, static, and focused on current requirements. Speculative complexity makes future refactoring harder.

---

## 8. Recommended Reading & Inspiration

To align your mindset with the engineering culture of this repository, we highly recommend reading:

1. **Clean Code: A Handbook of Agile Software Craftsmanship** — *Robert C. Martin (Uncle Bob)*
   * The core handbook for writing clean, intention-revealing, and maintainable functions and systems.
2. **The Clean Coder: A Code of Conduct for Professional Programmers** — *Robert C. Martin (Uncle Bob)*
   * Focuses on code craftsmanship discipline, professionalism, estimating, and saying "no" to bad design.
3. **Clean Architecture: A Craftsman's Guide to Software Structure and Design** — *Robert C. Martin (Uncle Bob)*
   * Crucial guidelines on drawing boundaries and keeping systems decoupled and testable.
4. **Clean Craftsmanship: Disciplines, Standards, and Ethics** — *Robert C. Martin (Uncle Bob)*
   * Deeper look into Test-Driven Development (TDD), micro-refactoring, and design patterns.
5. **Refactoring: Improving the Design of Existing Code** — *Martin Fowler*
   * Teaches step-by-step techniques to improve code design through safe, behavior-preserving micro-transformations.
6. **The Pragmatic Programmer: Your Journey to Mastery** — *David Thomas & Andrew Hunt*
   * Excellent concepts on avoiding duplication (DRY), keeping code orthoganal, and maintaining flexibility.
7. **Working Effectively with Legacy Code** — *Michael Feathers*
   * Teaches strategies to safely refactor and change codebases that lack test suites.
