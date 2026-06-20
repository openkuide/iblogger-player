// Watch progress persistence — resume positions, watched episodes, last-watched episode

const STORAGE_KEY = 'iblogger_watch_progress';
const WATCHED_THRESHOLD = 0.9;
const MIN_RESUME_SECONDS = 30;
const MAX_TRACKED_MOVIES = 30;

function loadAllProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveAllProgress(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function getOrCreateMovieEntry(all, slug) {
  if (!all[slug]) {
    all[slug] = { positions: {}, watched: [], lastEp: null, updatedAt: 0 };
  }
  return all[slug];
}

function touchEntry(entry, epKey) {
  entry.lastEp = epKey;
  entry.updatedAt = Date.now();
}

function pruneOldestMovies(all) {
  const slugs = Object.keys(all);
  if (slugs.length <= MAX_TRACKED_MOVIES) return;
  slugs
    .sort((a, b) => (all[a].updatedAt || 0) - (all[b].updatedAt || 0))
    .slice(0, slugs.length - MAX_TRACKED_MOVIES)
    .forEach(slug => delete all[slug]);
}

export function recordEpisodeSelection(slug, ep) {
  const all = loadAllProgress();
  touchEntry(getOrCreateMovieEntry(all, slug), String(ep));
  pruneOldestMovies(all);
  saveAllProgress(all);
}

export function saveEpisodeProgress(slug, ep, seconds, duration) {
  const finished = duration > 0 && seconds / duration >= WATCHED_THRESHOLD;
  if (!finished && seconds < MIN_RESUME_SECONDS) return false;

  const all = loadAllProgress();
  const entry = getOrCreateMovieEntry(all, slug);
  const epKey = String(ep);

  const becameWatched = finished && !entry.watched.includes(epKey);
  if (finished) {
    if (becameWatched) entry.watched.push(epKey);
    delete entry.positions[epKey];
  } else {
    entry.positions[epKey] = Math.floor(seconds);
  }

  touchEntry(entry, epKey);
  saveAllProgress(all);
  return becameWatched;
}

export function markEpisodeWatched(slug, ep) {
  const all = loadAllProgress();
  const entry = getOrCreateMovieEntry(all, slug);
  const epKey = String(ep);
  if (!entry.watched.includes(epKey)) entry.watched.push(epKey);
  delete entry.positions[epKey];
  touchEntry(entry, epKey);
  saveAllProgress(all);
}

export function getResumePosition(slug, ep) {
  const entry = loadAllProgress()[slug];
  const seconds = entry && entry.positions ? entry.positions[String(ep)] || 0 : 0;
  return seconds >= MIN_RESUME_SECONDS ? seconds : 0;
}

export function getWatchedEpisodes(slug) {
  const entry = loadAllProgress()[slug];
  return new Set(entry && entry.watched ? entry.watched : []);
}

export function getLastWatchedEpisode(slug) {
  const entry = loadAllProgress()[slug];
  return entry ? entry.lastEp : null;
}
