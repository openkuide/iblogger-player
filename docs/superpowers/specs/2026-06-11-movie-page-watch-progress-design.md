# Movie Page: Resume Playback, Watched Markers, Episode Range Tabs — Design

**Date:** 2026-06-11 · **Status:** Approved (user picked recommendation 1+2+3) · **Scope:** `?id=<slug>` page

## Features

1. **Resume playback** — save the playback position per slug+episode every ~5s (localStorage). Reopening a movie auto-starts at the last-watched episode (when no `ep` URL param) and auto-seeks to the saved position with a toast ("បន្តចាក់ពី 31:05" / "Resuming from 31:05"). Positions under 30s are ignored; positions past 90% of duration mark the episode watched and clear the position.
2. **Watched-episode markers** — episode buttons get a `.watched` class (dimmed + ✓ badge) from stored history; updates live when an episode crosses 90% or ends.
3. **Episode range tabs** — when a movie has more than 25 episodes, pill tabs (`1–25`, `26–50`, … with Khmer numerals in km) filter the grid by toggling button visibility. Selecting an episode reveals its range automatically. (40 of 150 movies have 30+ episodes; max 182.)

## Architecture

New module `assets/js/watch-progress.js` — persistence only, one localStorage key `iblogger_watch_progress`:

```json
{ "<slug>": { "positions": { "<ep>": 1234 }, "watched": ["1","2"], "lastEp": "3", "updatedAt": 0 } }
```

Exports: `recordEpisodeSelection`, `saveEpisodeProgress` (returns true when the episode newly becomes watched), `markEpisodeWatched`, `getResumePosition`, `getWatchedEpisodes`, `getLastWatchedEpisode`. Pruned to the 30 most recent movies.

`player.js` gains two playback-domain hooks (mirroring existing `setOnEnded`): `setOnProgress(cb)` wired to Video.js `timeupdate`, and `seekWhenReady(seconds)` using a one-shot `loadedmetadata` listener.

`movie.js` consumes both; `renderMovieEpisodes` is decomposed into small single-purpose helpers (`createEpisodeButtons`, `setupRangeTabs`, `applyWatchedMarkers`, `updateUpNextPanel`, `resolveStartIndex`, …) per clean code guidelines. Existing `iblogger_watch_history` (home-page rail) is untouched.

`utils.js` gains `formatPlaybackTime(seconds)` → `M:SS` / `H:MM:SS`.

## URL contract

Unchanged. `?ep=` still wins over stored `lastEp`.

## Tests

Seed `iblogger_watch_progress` via localStorage, open `?id=demi-gods-and-semi-devils` (50 eps): assert 2 range tabs, 25 visible buttons, 2 `.watched` buttons, active episode = stored `lastEp`, resume toast text present.
