# Clean Code Guidelines

This document establishes the Clean Code and Refactoring standards for the `iblogger-player` project. Following these guidelines ensures the codebase remains maintainable, readable, and easy to extend as new features or players are introduced.

---

## 📌 មាតិកា (Table of Contents)
1. [Meaningful Naming Standards](#1)
2. [Function Length & Scope (Uncle Bob's Rules)](#2)
3. [Single Level of Abstraction](#3)
4. [DRY (Don't Repeat Yourself) & Separation of Concerns](#4)
5. [Comments & Documentation Standards](#5)

---

<a id="1"></a>
## ១. Meaningful Naming Standards

* **Use Intention-Revealing Names**: Names of variables, functions, and files must describe what they represent or do.
  - **Bad**: `const x = 24;`, `function start() {}`
  - **Good**: `const MOVIES_PER_PAGE = 24;`, `function startMovieMode() {}`
* **Use Pronounceable & Searchable Names**: Avoid cryptic abbreviations.
  - **Bad**: `const cList = [];`
  - **Good**: `const catalogList = [];`
* **Function Naming**: Use verbs or verb phrases.
  - **Example**: `renderMovie()`, `hideLoader()`, `playSource()`
* **Variable/Constant Naming**: Use nouns or noun phrases.
  - **Example**: `homeAppInstance`, `LANG`, `views`

---

<a id="2"></a>
## ២. Function Length & Scope (Uncle Bob's Rules)

According to Uncle Bob's *Clean Code*:
* **Rule 1: Functions should be very small**: Ideally under 20 lines, and rarely exceeding 30 lines.
* **Rule 2: Functions should do one thing**: If a function contains steps that can be grouped into a separate concern, extract it.
  - **Example**: A function that renders a page should not also fetch data, construct lists, and add event listeners. It should delegate those to sub-renderers.
* **Rule 3: Minimal Arguments**: Functions should accept 0 to 2 arguments. 3 is a maximum. If more arguments are needed, wrap them in a single configurations/options object.

---

<a id="3"></a>
## ៣. Single Level of Abstraction

A function should contain statements that are at the same level of abstraction.
* **High-Level Abstraction**: Program flow and routing (e.g. `startMovieMode()`).
* **Intermediate-Level Abstraction**: Component logic (e.g. `renderMovieEpisodes()`).
* **Low-Level Abstraction**: Direct DOM manipulation and styling (e.g. `el.style.display = "block"`).

> [!WARNING]
> **Mixing Levels**: Avoid mixing direct DOM operations (like `document.createElement('div')`) inside a high-level function that orchestrates movie loading or network calls. Extract low-level DOM builders into helper functions.

---

<a id="4"></a>
## ៤. DRY (Don't Repeat Yourself) & Separation of Concerns

* **No Code Duplication**: Extract common operations (like local storage gets/sets or network fetches) into shared modules (like `utils.js`).
* **Module Independence**: Keep modules focused:
  - `ads.js`: Deals strictly with ad slideshow and banner initialization.
  - `player.js`: Deals strictly with Video.js instance configuration and playback.
  - `movie.js`: Deals strictly with fetching and rendering movie details and episode lists.
  - `home.js`: Deals strictly with the catalog search/filtering Vue app.
  - `app.js`: Main routing coordinator.

---

<a id="5"></a>
## ៥. Comments & Documentation Standards

* **Don't Comment Bad Code—Rewrite It**: Code should be self-documenting. If you need a comment to explain *what* a line of code does, rename the variables or functions instead.
* **Explain the "Why", Not the "What"**: Comments should only be used to explain:
  - Complex algorithms or math formulas.
  - Non-obvious workarounds for browser-specific bugs.
  - Design decisions or legacy constraints.
* **No Zombie Code**: Never leave commented-out source code blocks in production files. Delete them immediately; git maintains history if they need to be recovered.
