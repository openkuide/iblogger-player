# Contributing to iblogger-player

Thank you for your interest in contributing to **iblogger-player**! This project is a pure static single-page HLS video player and movie catalog designed to be lightweight, fast, and easily deployable via GitHub Pages.

There are two primary ways you can contribute:
1. **Adding New Movies** to the catalog database.
2. **Improving the Site Design or Player** (UI/UX).

---

## 1. Adding New Movies

The movie catalog runs on a simple static database located in the `db/` folder:
* `db/index.json` – A lightweight index of all movies (titles, genres, poster, year, rating, and episode count) used for the browse grid.
* `db/<slug>.json` – Full detail for a specific movie, including its bilingual description and HLS stream URLs.

### Option A: Manual Entry (Direct file edits)

If you only want to add a single movie, you can modify the database files directly:

1. **Create the Movie File:**
   Create a new file `db/<movie-slug>.json`. The filename must match your slug in lowercase, hyphen-separated format (e.g., `the-tuxedo.json`). Use this structure:
   ```json
   {
     "slug": "the-tuxedo",
     "title": {
       "en": "The Tuxedo",
       "km": "វិរៈជនអាវទិព្វទូស៊ីដូ"
     },
     "description": {
       "en": "Jimmy Tong is a taxi driver who gets a job as a chauffeur for the mysterious and wealthy Clark Devlin. When Devlin is hospitalized after an attack, Jimmy tries on his boss's high-tech tuxedo, discovering it grants supernatural abilities.",
       "km": "ជីមី ថុង គឺជាអ្នកបើកបរតាក់ស៊ីម្នាក់ដែលទទួលបានការងារជាអ្នកបើកបរផ្ទាល់ខ្លួនជូនមហាសេដ្ឋី ខ្លាក ដេវលីន។ ក្រោយពេលដេវលីនរងការវាយប្រហារនិងសម្រាកព្យាបាលនៅមន្ទីរពេទ្យ ជីមី បានសាកល្បងពាក់អាវធំទូស៊ីដូដ៏ទំនើបរបស់ចៅហ្វាយ ដែលវាផ្តល់នូវសមត្ថភាពពិសេសអស្ចារ្យ។"
     },
     "poster": "https://example.com/poster-url.jpg",
     "year": 2002,
     "rating": 5.4,
     "genres": ["ACTION", "COMEDY", "FANTASY", "ROMANCE", "THRILLER", "SCI_FI"],
     "language": "English",
     "episodeCount": 1,
     "episodes": [
       {
         "ep": "1",
         "title": {
           "en": "Episode 1",
           "km": "ភាគទី1"
         },
         "url": "https://example.com/stream/index.m3u8",
         "type": "M3U8",
         "final": true
       }
     ]
   }
   ```

2. **Register in the Index:**
   Open `db/index.json` and add a new entry to the array with the basic metadata of your movie:
   ```json
   {
     "slug": "the-tuxedo",
     "title": {
       "en": "The Tuxedo",
       "km": "វិរៈជនអាវទិព្វទូស៊ីដូ"
     },
     "poster": "https://example.com/poster-url.jpg",
     "year": 2002,
     "rating": 5.4,
     "genres": ["ACTION", "COMEDY", "FANTASY", "ROMANCE", "THRILLER", "SCI_FI"],
     "episodeCount": 1
   }
   ```

> [!NOTE]
> Make sure both files have matching attributes (slug, titles, year, rating, genres, episodeCount) to keep the search filters and catalog in sync. Also, ensure the movie `slug` is completely unique and does not collide with any existing file in the `db/` folder.

### Option B: Automatic Rebuild (For bulk import)

If you have a large database export, you can regenerate the `db/` folder using the database builder script:
1. Put your source JSON export in the root folder.
2. Run the script:
   ```bash
   python3 build-db.py movies-export-YYYY-MM-DD.json
   ```
   This will automatically generate `db/index.json` and all individual `db/<slug>.json` files.

---

## 2. Improving the Site Design / Player

The entire web application UI is located inside a single file: [index.html](file:///Users/chamrong/Documents/Projects/github/ichamrong/iblogger-player/index.html).

- **Markup & Layout**: Structured in HTML5 within the `<body>`.
- **Styling**: Tailored in Vanilla CSS under `<style>`. It implements an Apple-inspired dark/light design system with a retro CRT TV bezel, scanlines, and glow details.
- **Client Logic**: Vanilla JavaScript handles router-free query parameter navigation (`?id=slug` or `?src=url`), fetches JSON metadata, manages Plyr control overlays, and handles catalog search/sorting/pagination.

### Running Locally for Development

Since there is no compilation step, you can run and test your changes instantly:

1. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/iblogger855/iblogger-player.git
   cd iblogger-player
   ```
2. Start a simple local server to bypass browser CORS restrictions for local file fetching:
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Or using Node.js
   npx live-server
   ```
3. Open `http://localhost:8000` in your web browser.

### UI Guidelines

* **Bilingual Support**: All user-facing UI labels and elements should support English and Khmer (ខ្មែរ).
* **Responsive Design**: Ensure any layout changes work perfectly on mobile screens (max-width `560px`).
* **Design Tokens**: When changing colors or shadows, use the predefined CSS custom properties in `:root`:
  - `--bg`, `--fg`, `--accent`, `--hairline`, `--radius`, `--blur`.
* **Zero Dependencies**: Keep the app framework-free. External libraries like `hls.js` and `plyr` should only be loaded over CDN with Subresource Integrity (SRI) pins.

---

## Submitting Contributions

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-contribution`.
3. **Check for Duplicate Slugs**: Ensure the new movie slug does not already exist by checking if `db/<slug>.json` exists, or run:
   ```bash
   ls db/ | grep "<slug>"
   ```
4. Commit your changes: `git commit -m "feat: add movie X"` or `git commit -m "design: improve player layout"`.
5. Push to your branch: `git push origin feature/my-contribution`.
6. Open a **Pull Request** against the `main` branch.
