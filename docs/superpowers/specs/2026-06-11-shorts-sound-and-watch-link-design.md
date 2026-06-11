# Shorts: Sound Toggle + Watch Full Movie Link — Design

**Date:** 2026-06-11 · **Status:** Approved (user) · **Scope:** `?mode=shorts` feed

## Problem

1. Shorts videos are permanently silent: `createVideoElement()` sets `muted="true"` (required for browser autoplay policy) and no UI exists to unmute.
2. There is no path from a short to the full movie page (`?id=<slug>`).

## Decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Tap on video | Keeps current pause/play toggle |
| Navigation to movie | "▶ Watch Full Movie" pill + clickable title, both real `<a href="?id=<slug>">` |
| Mute control placement | Speaker button in the right action rail (with Like/Comment/Share) |
| Sound policy | Start muted (autoplay-safe); unmute once → applies to all shorts; persisted in `localStorage` (`shorts_sound`); muted fallback + "Tap 🔊 for sound" toast when the browser blocks unmuted playback |

## Behavior spec

- One module-level `soundOn` flag, initialized from `localStorage.shorts_sound === 'on'`.
- Every short's action rail renders a sound button reflecting the **global** state (speaker / slashed speaker + "Muted" label).
- When a video starts playing, apply `player.muted(!soundOn)`.
- If `play()` rejects after unmuting (fresh page load, no gesture yet): re-mute, retry playback, sync all sound buttons to muted, show one-time toast hint via existing `showToast`. Stored preference is NOT overwritten by the fallback.
- Toggling the sound button updates ALL live players and ALL rail icons, and persists the choice.
- Clicking title or Watch button calls `boostGenres(movie.genres)` (strong interest signal) before native anchor navigation.
- Bilingual labels (en/km) per project rules.

## Files

- `assets/js/shorts.js` — sound state, toggle, fallback, watch links (small single-purpose functions per `docs/clean_code_guidelines.md`)
- `assets/css/style.css` — `.short-watch-btn`, muted button styling
- `tests/integration.test.js` — sound button exists + toggles `muted`; watch link href = `?id=<slug>`

## Non-goals

No changes to tap-to-pause, recommendation scoring, `index.html` markup, or dependencies.
