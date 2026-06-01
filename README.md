# 🎬 iblogger-player

A **single-page, static HLS video player** for GitHub Pages. It reads an `.m3u8` stream URL from a query parameter and plays it — no backend, no build step.

> Companion to the **[iblogger-movies](../iblogger-movies/)** catalog, whose episode links point here.

---

## Usage

```
https://<user>.github.io/iblogger-player/?src=<M3U8_URL>&title=<TITLE>
```

| Param | Required | Meaning |
|:------|:--------:|:--------|
| `src` | ✅ | URL of the `.m3u8` (HLS) stream to play |
| `title` | optional | Title shown above the player + in the tab |

**Example:**
```
?src=https://example.com/stream/index.m3u8&title=Episode%201
```

---

## How it works
- One `index.html` + [hls.js](https://github.com/video-dev/hls.js) (loaded from CDN, pinned with Subresource Integrity).
- On Safari, falls back to native HLS.
- `src`/`title` are rendered with `textContent` (no HTML injection) — safe against XSS from crafted URLs.

## Deploy (GitHub Pages)
1. Push this repo to GitHub.
2. **Settings → Pages → Source: `main` / root**.
3. Your player is live at `https://<user>.github.io/iblogger-player/`.

---

## ⚠️ Known limitation: CORS
The browser can only play a stream if the **m3u8 host sends `Access-Control-Allow-Origin`** headers. A static page on GitHub Pages cannot proxy around this. If a stream shows a "could not load" error, it's almost always the source server's CORS policy (or the link is offline) — not a bug in the player.

---

*Static · no backend · GitHub Pages friendly*
