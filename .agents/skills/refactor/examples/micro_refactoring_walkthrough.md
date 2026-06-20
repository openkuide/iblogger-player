# Walkthrough: Micro-Refactoring Example

This example demonstrates how to refactor a monolithic function violating clean code rules into small, single-responsibility functions following the Single Level of Abstraction (SLA).

---

## ❌ Before Refactoring (Mon monolithic block)

This function loads a movie and builds its episode interface. It mixes network requests, try-catch error handling, loader DOM manipulations, and low-level HTML element creation inside one function:

```javascript
// assets/js/movie.js
function loadAndRenderMovie(slug) {
  try {
    const loader = document.getElementById("loader");
    loader.style.display = "block";
    
    fetch(`db/${slug}.json`)
      .then(res => {
        if (!res.ok) return null; // Error code instead of throwing exception
        return res.json();
      })
      .then(movie => {
        loader.style.display = "none";
        if (!movie) {
          alert("Movie not found");
          return;
        }
        document.title = movie.title.en;
        
        const container = document.getElementById("episodes");
        container.innerHTML = ""; // XSS vulnerability and raw DOM clearing
        
        movie.episodes.forEach(episode => {
          const btn = document.createElement("button");
          btn.className = "ep-btn";
          btn.textContent = `EP ${episode.ep}: ${episode.title.en}`;
          btn.onclick = () => playStream(episode.url);
          container.appendChild(btn);
        });
      });
  } catch (err) {
    console.error("Failed to load movie", err);
    document.getElementById("loader").style.display = "none";
  }
}
```

---

## 🛠️ Step-by-Step Refactoring Steps

### Step 1: Isolate Try-Catch and Error Handling (§6)
Extract the core logic out of the error handling block so that the entry function does nothing but isolate the `try-catch` boundary.

```javascript
function loadAndRenderMovie(slug) {
  try {
    tryLoadAndRenderMovie(slug);
  } catch (err) {
    handleLoadError(err);
  }
}

async function tryLoadAndRenderMovie(slug) {
  showLoader();
  try {
    const movie = await fetchMovie(slug);
    displayMovie(movie);
  } finally {
    hideLoader();
  }
}

function handleLoadError(err) {
  console.error("Failed to load movie", err);
  alert("Movie not found or failed to load");
}
```

### Step 2: Throw Exceptions over Error Codes (§6)
Replace helper checks returning `null` or exit codes with explicit exceptions.

```javascript
async function fetchMovie(slug) {
  const response = await fetch(`db/${slug}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch movie data: ${response.status}`);
  }
  return response.json();
}
```

### Step 3: Extract Low-Level DOM Mechanics (§3)
Extract raw element construction and DOM styling into small, single-purpose functions.

```javascript
function showLoader() {
  document.getElementById("loader").style.display = "block";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

function displayMovie(movie) {
  document.title = movie.title.en;
  renderEpisodeButtons(movie.episodes);
}

function renderEpisodeButtons(episodes) {
  const container = document.getElementById("episodes");
  container.replaceChildren(); // Safe, clean alternative to innerHTML = ""
  
  episodes.forEach(episode => {
    container.appendChild(buildEpisodeButton(episode));
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

## ✅ After Refactoring (Clean, Composed Structure)

Every function now satisfies the Single Level of Abstraction (SLA), does exactly one thing, remains under 15 lines of code, and handles exceptions cleanly:

```javascript
// 1. High-Level Orchestrator (Isolates error boundary)
function loadAndRenderMovie(slug) {
  try {
    tryLoadAndRenderMovie(slug);
  } catch (err) {
    handleLoadError(err);
  }
}

// 2. Mid-Level Orchestrator (Coordinates flow)
async function tryLoadAndRenderMovie(slug) {
  showLoader();
  try {
    const movie = await fetchMovie(slug);
    displayMovie(movie);
  } finally {
    hideLoader();
  }
}

// 3. Low-Level Fetch Mechanics
async function fetchMovie(slug) {
  const response = await fetch(`db/${slug}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch movie: ${response.status}`);
  }
  return response.json();
}

// 4. Mid-Level UI Orchestrator
function displayMovie(movie) {
  updatePageTitle(movie.title.en);
  renderEpisodeButtons(movie.episodes);
}

// 5. Low-Level DOM Mechanics
function showLoader() {
  document.getElementById("loader").style.display = "block";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

function updatePageTitle(title) {
  document.title = title;
}

function renderEpisodeButtons(episodes) {
  const container = document.getElementById("episodes");
  container.replaceChildren();
  episodes.forEach(episode => {
    container.appendChild(buildEpisodeButton(episode));
  });
}

function buildEpisodeButton(episode) {
  const button = document.createElement("button");
  button.className = "ep-btn";
  button.textContent = `EP ${episode.ep}: ${episode.title.en}`;
  button.onclick = () => playStream(episode.url);
  return button;
}

function handleLoadError(err) {
  console.error("Failed to load movie", err);
  alert("Failed to load the requested movie.");
}
```
