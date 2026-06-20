# Refactoring Patterns & Best Practices

Reference guide for common code refactoring transformations applied to maintain Uncle Bob's Clean Code principles and the Single Level of Abstraction (SLA).

---

## 1. Extract Function (Fowler: Extract Method)
When a function is too long (> 20-30 lines) or performs multiple tasks:
- **Action**: Extract a cohesive block of code into a new, smaller helper function.
- **Rules**:
  - Name the new function using `camelCase` starting with a verb (e.g. `calculateDuration`).
  - Pass only necessary parameters (prefer 0 or 1, maximum 2).
  - Ensure the extracted code represents exactly **one** single responsibility.

---

## 2. Rename Variable / Function
If names are cryptic, abbreviated, or do not reveal intent:
- **Action**: Rename to explain *why* it exists, *what* it holds, or *how* it behaves.
- **Rules**:
  - Functions: verb prefix (`fetchDetail` instead of `detail`).
  - Variables: nouns (`activeMovie` instead of `movieObj`).
  - Booleans: prefix with helper verbs (`isPlaying`, `hasEpisodes`, `canResume`).
  - Constants: uppercase snake case (`DEFAULT_TIMEOUT`).
  - Avoid noise words (`movieData`, `movieInfo`, `movieObject`).

---

## 3. Isolate Try-Catch Block (§6)
When error handling is mixed with business execution logic:
- **Action**: Extract the bodies of `try` and `catch` into helper functions, leaving the main function to act purely as the error handler boundary.
- **Rules**:
  - The entry function contains *only* the `try-catch` structure.
  - Success path is delegated to a helper (e.g. `tryExecute()`).
  - Failure/recovery path is delegated to an error handler (e.g. `handleExecuteError(err)`).

---

## 4. Replace Magic Numbers with Constants
When hardcoded numbers, timeout ticks, or limits are embedded in code:
- **Action**: Declare a configuration constant at the top of the file.
- **Rules**:
  - Use `SCREAMING_SNAKE_CASE`.
  - Place constant declarations at the file-level scope above execution blocks.
  - Example: `const INACTIVITY_NUDGE_MS = 8000;`.

---

## 5. Separate Mechanics from Orchestration (SLA - §3)
When low-level APIs (e.g., `localStorage.setItem`, `document.createElement`, `replaceChildren`) are mixed inside high-level routing or control-flow code:
- **Action**: Pull mechanics out into dedicated functions.
- **Rules**:
  - **High-Level**: Coordinates flow control only (e.g. `loadAndRenderPage`).
  - **Mid-Level**: Handles business logic processing (e.g. `filterCatalog`).
  - **Low-Level**: Interacts with the DOM or Browser APIs directly (e.g. `clearList`).
