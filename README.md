<div align="center">

<img src=".github/logo.svg" alt="iblogger player logo" width="96" height="96" />

<h1>iblogger <sub>player</sub></h1>

<img src=".github/banner.svg" alt="iblogger-player" width="100%" />

<br/>

**A single-page, static HLS video player & movie catalog — no backend, no build step, GitHub Pages ready.**

<br/>

[![Made with Video.js](https://img.shields.io/badge/player-Video.js-007aff?style=flat-square)](https://github.com/videojs/video.js)
[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-181717?style=flat-square&logo=github)](https://pages.github.com/)
[![No backend](https://img.shields.io/badge/backend-none-21c36b?style=flat-square)](#)
![Status](https://img.shields.io/badge/status-live-success?style=flat-square)

<a href="https://openkuide.github.io/iblogger-player/" target="_blank"><strong>Live demo</strong></a> · [Usage](#usage) · [How it works](#how-it-works) · [Deploy](#deploy-github-pages) · [Build the catalog](#building-the-catalog)

</div>

---

## Features

### 🎬 User Experience
- **Dual Presentation Modes** – Combines a browsable movie catalog and a focused player view on a single page.
- **Retro CRT Aesthetic** – Dark, glassy Apple-inspired UI elements with a CRT-TV bezel, subtle scanlines, and a power LED.
- **Bilingual Content Support** – Full native support for English and Khmer (ខ្មែរ) titles, descriptions, and UI localization.
- **Dynamic Recommendations** – Computes related titles dynamically using shared genres.

### ⚡ Playback & Engine
- **Native HLS Streaming** – Powered by [Video.js](https://github.com/videojs/video.js) for robust streaming and standard video controls.
- **Advanced Controls** – Integrates custom video quality menus, playback speed selection, picture-in-picture (PiP), and full-screen modes.
- **Continuous Playback** – Smart episode queues featuring finale indicators (`END` badges) and auto-playing the next episode.

### 🔌 Architecture & Security
- **Serverless & Static** – Runs purely on `index.html` and static JSON datasets in `db/` with zero runtime build tooling or server backend.
- **Lightweight Architecture** – Split-database design (53 KB index vs. 2 MB full source export) for instant catalog loading and on-demand detail fetching.
- **XSS Security** – All dynamic data renders via `textContent`; query parameters and remote endpoints are strictly sanitized to prevent injection.

---

## Usage

The application runs in two primary modes determined by the URL query string:

### 1. Catalog Mode (Default)
Open the site without parameters to browse the full catalog:
* **Demo URL:** <a href="https://openkuide.github.io/iblogger-player/" target="_blank">openkuide.github.io/iblogger-player</a>

Search, filter by genre, sort, and select titles to play.

### 2. Player Mode (Catalog ID)
Directly load and play a title using its slug:
* **Format:** `https://openkuide.github.io/iblogger-player/?id=<SLUG>`
* **Behavior:** Fetches data from `db/<slug>.json`, initializes the episode list, and starts playing the first episode.

### 3. Player Mode (Direct Stream)
Bypass the catalog and play any external `.m3u8` stream directly:
* **Format:** `https://openkuide.github.io/iblogger-player/?src=<M3U8_URL>&title=<TITLE>`
* **Behavior:** Serves as a standalone player for any `.m3u8` stream. The title parameter is optional and is displayed in the UI and browser tab.

### Parameters Reference

| Param | Mode | Required | Meaning |
| :--- | :--- | :---: | :--- |
| `id` | catalog | — | Movie slug; loads `db/<id>.json` |
| `src` | direct | — | URL of the `.m3u8` (HLS) stream to play |
| `title` | direct | optional | Title shown above the player and in the tab |

> **Example (direct):** `?src=https://example.com/stream/index.m3u8&title=Episode%201`

---

## How it works

```
┌─────────────────────────────────────────────────────────┐
│  index.html  (UI · routing · player · catalog logic)     │
│      │                                                    │
│      ├─ no params ──► fetch db/index.json ──► catalog grid│
│      ├─ ?id=slug  ──► fetch db/<slug>.json ─► episode list│
│      └─ ?src=url  ──► play stream directly                │
│                                                           │
│  Video.js (CDN, SRI-pinned) ──► plays media & custom skin │
└─────────────────────────────────────────────────────────┘
```

- **Client-Side Routing** – Page transitions and data loading are managed dynamically via URL query parameters, enabling deployment on purely static hosts.
- **On-Demand Data** – Data is split between `db/index.json` (a slim index for rapid initial catalog loading) and individual `db/<slug>.json` files (containing full details and episode lists loaded on demand).
- **Subresource Integrity (SRI)** – External CDN dependencies (such as Video.js and Google Fonts) are loaded securely with cryptographic pinning.
- **Subpath Portability** – All database and asset paths are relative (`db/...` instead of `/db/...`), allowing the player to be hosted under project subfolders (e.g. GitHub Pages project pages).

---

## Project structure

```
iblogger-player/
├── index.html          # the entire app (markup + styles + logic)
├── build-db.py          # splits the source export into db/
├── db/
│   ├── index.json       # slim catalog: slug, title, poster, year, rating, genres, episodeCount
│   └── <slug>.json      # full detail: + description, language, episodes[]
├── .github/banner.svg   # README banner
├── .github/openkuide.svg # OpenKuide logo
└── README.md
```

**Genres:** `ACTION` · `ANIMATION` · `COMEDY` · `DOCUMENTARY` · `DRAMA` · `FANTASY` · `HORROR` · `ROMANCE` · `SCI_FI` · `THRILLER`

---

## Building the catalog

The `db/` folder is generated from a single exported JSON by `build-db.py`:

```bash
python3 build-db.py movies-export-YYYY-MM-DDThh-mm-ss.json
```

This writes `db/index.json` and one `db/<slug>.json` per title. The source export is **input only** — it is not deployed (and is `.gitignore`d). Re-run this whenever the catalog changes.

---

## Deploy (GitHub Pages)

1. Commit `index.html`, `db/`, and `build-db.py`, then push.
2. **Settings → Pages → Source: `main` (or `master`) / root**.
3. Your player goes live at `https://<user>.github.io/iblogger-player/`.

> [!NOTE]
> No `.nojekyll` file is required, as the project does not contain any underscore-prefixed directories.

---

## Known limitation: Stream CORS

> [!WARNING]
> Browsers restrict playback of HLS streams if the host serving the `.m3u8` file lacks proper Cross-Origin Resource Sharing (CORS) headers (specifically `Access-Control-Allow-Origin`).
> 
> Because this is a static client-side application, it cannot bypass CORS restrictions. If a stream fails with a "could not load" error, it is almost always due to the host's CORS policy or the link being offline, rather than a bug in the player itself.

## AI Assistance & Tooling

To develop, refactor, or contribute to this codebase using AI assistants (such as Antigravity, Claude, Cursor, or GitHub Copilot), please refer to our [AI Assistance & Tooling Guide](docs/ai_assistance.md) for custom prompts, setup context, and recommended workflows.

---

## License & Credit

This project was implemented and is maintained by **[OpenKuide](https://github.com/openkuide)**.

<p align="center">
  <a href="https://github.com/openkuide">
    <img src=".github/openkuide.svg" alt="OpenKuide Logo" width="300" />
  </a>
</p>

---

## Built with

[Video.js](https://videojs.com) · [Inter](https://rsms.me/inter/) + [Kantumruy Pro](https://fonts.google.com/specimen/Kantumruy+Pro) fonts · GitHub Pages

<div align="center">

<sub>Static · no backend · GitHub Pages friendly</sub>

</div>
