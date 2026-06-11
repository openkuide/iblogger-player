// Direct/Movie routing details and rendering

import { LANG, t, showLoader, showStatusText, showToast, toKhmerNumerals, formatPlaybackTime } from './utils.js';
import { playSource, setOnEnded, setOnProgress, seekWhenReady } from './player.js';
import {
  recordEpisodeSelection,
  saveEpisodeProgress,
  markEpisodeWatched,
  getResumePosition,
  getWatchedEpisodes,
  getLastWatchedEpisode
} from './watch-progress.js';

const EPISODES_PER_RANGE = 25;
const PROGRESS_SAVE_INTERVAL_SECONDS = 5;

export function startDirectMode(url, ttl) {
  const hintEl = document.getElementById("hint");
  if (hintEl) hintEl.style.display = "none";
  document.title = ttl ? ttl + " · iblogger player" : "iblogger Player";
  document.getElementById("title").textContent = ttl || "Now playing";
  document.getElementById("srcline").textContent = url;
  document.getElementById("source").style.display = "block";
  
  const backdropElement = document.getElementById("detailBackdrop");
  if (backdropElement) backdropElement.style.backgroundImage = "none";

  const videoEl = document.getElementById("video");
  playSource(url, videoEl);
}

export function startMovieMode(slug, epParam) {
  const hintEl = document.getElementById("hint");
  const metaEl = document.getElementById("meta");
  if (hintEl) hintEl.style.display = "none";
  if (metaEl) metaEl.style.display = "none"; // rich card used

  const safe = String(slug).replace(/[^a-z0-9-]/gi, "");
  showLoader("Loading…");

  fetch("db/" + safe + ".json")
    .then(r => {
      if (!r.ok) throw new Error("not found");
      return r.json();
    })
    .then(movie => {
      renderMovie(movie, epParam);
      loadIndexAndRelated(movie);
    })
    .catch(() => {
      showStatusText("⚠️ រកមិនឃើញរឿងនេះ (", safe, ")។", true);
    });
}

function removeFallbackPoster(infoElement) {
  const existing = infoElement.querySelector(".info-fallback-poster");
  if (existing) {
    existing.remove();
  }
}

function renderFallbackPoster(infoElement) {
  const existing = infoElement.querySelector(".info-fallback-poster");
  if (existing) return;
  const fb = document.createElement("div");
  fb.className = "info-fallback-poster";
  fb.innerHTML = `
    <svg class="fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
      <line x1="7" y1="2" x2="7" y2="22"></line>
      <line x1="17" y1="2" x2="17" y2="22"></line>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <line x1="2" y1="7" x2="7" y2="7"></line>
      <line x1="2" y1="17" x2="7" y2="17"></line>
      <line x1="17" y1="17" x2="22" y2="17"></line>
      <line x1="17" y1="7" x2="22" y2="7"></line>
    </svg>
  `;
  infoElement.insertBefore(fb, infoElement.firstChild);
}

function renderMoviePoster(movie, infoElement, posterElement) {
  removeFallbackPoster(infoElement);

  const backdropElement = document.getElementById("detailBackdrop");
  if (backdropElement) {
    if (movie.poster) {
      backdropElement.style.backgroundImage = `url('${movie.poster}')`;
    } else {
      backdropElement.style.backgroundImage = "none";
    }
  }

  if (movie.poster) {
    posterElement.src = movie.poster;
    posterElement.alt = t(movie.title);
    posterElement.style.display = "block";
    posterElement.onerror = () => {
      posterElement.style.display = "none";
      renderFallbackPoster(infoElement);
      if (backdropElement) backdropElement.style.backgroundImage = "none";
    };
  } else {
    posterElement.style.display = "none";
    renderFallbackPoster(infoElement);
  }
}

function createBadgeElement(text, className, parentElement, iconSvg) {
  const badge = document.createElement("span");
  badge.className = "badge-i" + (className ? " " + className : "");

  if (iconSvg) {
    const iconContainer = document.createElement("span");
    iconContainer.className = "badge-icon";
    iconContainer.innerHTML = iconSvg.trim();
    badge.appendChild(iconContainer);
  }

  const textNode = document.createElement("span");
  textNode.className = "badge-text";
  textNode.textContent = text;
  badge.appendChild(textNode);

  parentElement.appendChild(badge);
  return badge;
}

function renderMovieBadges(movie, badgesElement) {
  badgesElement.textContent = "";

  if (movie.rating) {
    const starSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
    createBadgeElement(String(movie.rating), "star", badgesElement, starSvg);
  }

  if (movie.year) {
    const calendarSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    const yearBadge = createBadgeElement(String(movie.year), "clickable-year", badgesElement, calendarSvg);
    yearBadge.title = "ស្វែងរករឿងឆ្នាំ " + movie.year + " (Find movies from " + movie.year + ")";
    yearBadge.addEventListener("click", () => {
      history.pushState(null, "", "?year=" + movie.year);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }

  if (movie.episodeCount) {
    const playSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M8 5v14l11-7z"/></svg>`;
    createBadgeElement((LANG === "km" ? toKhmerNumerals(movie.episodeCount) : movie.episodeCount) + " ភាគ", "episode-count", badgesElement, playSvg);
  }

  if (movie.country) {
    let countryKm = "";
    if (movie.country === "Hong Kong") countryKm = "ហុងកុង";
    else if (movie.country === "China") countryKm = "ចិន";
    else if (movie.country === "Korea") countryKm = "កូរ៉េ";
    else countryKm = movie.country;

    const countryText = LANG === "km" ? countryKm : movie.country;
    const globeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
    createBadgeElement(countryText, "country", badgesElement, globeSvg);
  }

  (movie.genres || []).slice(0, 4).forEach(genre => {
    let genreText = genre;
    if (LANG === "km") {
      const genreMap = {
        "ACTION": "វាយប្រហារ",
        "COMEDY": "កំប្លែង",
        "DRAMA": "មនោសញ្ចេតនា",
        "HORROR": "ភ័យរន្ធត់",
        "ROMANCE": "ស្នេហា",
        "THRILLER": "រន្ធត់",
        "FANTASY": "មហិទ្ធិរិទ្ធ",
        "DOCUMENTARY": "ឯកសារ",
        "SCI_FI": "វិទ្យាសាស្ត្រ",
        "ANIMATION": "គំនូរជីវចល"
      };
      genreText = genreMap[genre] || genre;
    }
    const tagSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
    createBadgeElement(genreText, "genre", badgesElement, tagSvg);
  });
}

function renderMovieDescription(movie, descriptionElement) {
  descriptionElement.textContent = "";
  
  let descKm = "";
  let descEn = "";
  if (movie.description) {
    if (typeof movie.description === "object") {
      descKm = movie.description.km || "";
      descEn = movie.description.en || "";
    } else {
      descKm = movie.description;
    }
  }

  if (descKm) {
    const pKm = document.createElement("p");
    pKm.className = "desc-km";
    pKm.textContent = descKm;
    descriptionElement.appendChild(pKm);
  }

  if (descEn && descEn.trim() !== descKm.trim()) {
    const pEn = document.createElement("p");
    pEn.className = "desc-en";
    pEn.textContent = descEn;
    descriptionElement.appendChild(pEn);
  }
}

function saveWatchHistory(movieData, episode) {
  try {
    const historyKey = "iblogger_watch_history";
    let historyList = [];
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        historyList = JSON.parse(stored);
      }
    } catch (e) {}
    if (!Array.isArray(historyList)) historyList = [];

    historyList = historyList.filter(item => item.slug !== movieData.slug);

    historyList.unshift({
      slug: movieData.slug,
      title: movieData.title,
      poster: movieData.poster,
      lastEpisode: episode.ep,
      timestamp: Date.now()
    });

    if (historyList.length > 10) {
      historyList = historyList.slice(0, 10);
    }

    localStorage.setItem(historyKey, JSON.stringify(historyList));
  } catch (e) {
    console.warn("Failed to save watch history:", e);
  }
}

function renderEpisodeCount(count) {
  const countText = LANG === "km" ? toKhmerNumerals(count) : count;
  document.getElementById("epCount").textContent = "(" + countText + ")";
}

function resolveStartIndex(movie, episodes, epParam) {
  const requested = epParam != null ? epParam : getLastWatchedEpisode(movie.slug);
  if (requested == null) return 0;
  const byLabel = episodes.findIndex(e => String(e.ep) === String(requested));
  if (byLabel >= 0) return byLabel;
  return Math.max(0, Math.min(episodes.length - 1, (parseInt(requested, 10) || 1) - 1));
}

function createEpisodeButtons(episodes, episodesGridElement, onSelect) {
  return episodes.map((ep, i) => {
    const btn = document.createElement("button");
    btn.className = "ep-btn" + (ep.final ? " final" : "");
    btn.textContent = LANG === "km" ? toKhmerNumerals(ep.ep || (i + 1)) : (ep.ep || (i + 1));
    btn.title = t(ep.title) + (ep.final ? " (ភាគចុងក្រោយ)" : "");
    btn.addEventListener("click", () => onSelect(i));
    episodesGridElement.appendChild(btn);
    return btn;
  });
}

function markButtonWatched(button) {
  button.classList.add("watched");
}

function applyWatchedMarkers(slug, episodes, buttons) {
  const watched = getWatchedEpisodes(slug);
  episodes.forEach((ep, i) => {
    if (watched.has(String(ep.ep))) markButtonWatched(buttons[i]);
  });
}

function createRangeTabButton(range, totalEpisodes, onClick) {
  const start = range * EPISODES_PER_RANGE + 1;
  const end = Math.min((range + 1) * EPISODES_PER_RANGE, totalEpisodes);
  const label = LANG === "km"
    ? toKhmerNumerals(start) + "–" + toKhmerNumerals(end)
    : start + "–" + end;

  const tab = document.createElement("button");
  tab.className = "ep-range-tab";
  tab.textContent = label;
  tab.addEventListener("click", onClick);
  return tab;
}

function setupRangeTabs(episodes, buttons, episodesWrapElement, episodesGridElement) {
  const existing = document.getElementById("episodeRangeTabs");
  if (existing) existing.remove();
  if (episodes.length <= EPISODES_PER_RANGE) return null;

  const tabsEl = document.createElement("div");
  tabsEl.id = "episodeRangeTabs";
  tabsEl.className = "ep-range-tabs";

  const rangeCount = Math.ceil(episodes.length / EPISODES_PER_RANGE);
  const tabButtons = [];
  for (let range = 0; range < rangeCount; range++) {
    const tab = createRangeTabButton(range, episodes.length, () => showRange(range));
    tabButtons.push(tab);
    tabsEl.appendChild(tab);
  }
  episodesWrapElement.insertBefore(tabsEl, episodesGridElement);

  function showRange(range) {
    tabButtons.forEach((tab, r) => tab.classList.toggle("active", r === range));
    buttons.forEach((btn, i) => {
      btn.style.display = Math.floor(i / EPISODES_PER_RANGE) === range ? "" : "none";
    });
  }

  return { reveal: idx => showRange(Math.floor(idx / EPISODES_PER_RANGE)) };
}

function updateEpisodeUrlParam(ep) {
  const u = new URL(location.href);
  u.searchParams.set("ep", ep);
  history.replaceState(null, "", u);
}

function resumeIfSaved(slug, ep) {
  const resumeAt = getResumePosition(slug, ep);
  if (!resumeAt) return;
  seekWhenReady(resumeAt);
  const prefix = LANG === "km" ? "បន្តចាក់ពី " : "Resuming from ";
  showToast(prefix + formatPlaybackTime(resumeAt));
}

function playEpisode(movie, episode) {
  const videoEl = document.getElementById("video");
  playSource(episode.url, videoEl);
  resumeIfSaved(movie.slug, episode.ep);
}

let lastSavedSecond = -Infinity;

function trackEpisodeProgress(movie, episode, onBecameWatched) {
  lastSavedSecond = -Infinity;
  setOnProgress((seconds, duration) => {
    if (Math.abs(seconds - lastSavedSecond) < PROGRESS_SAVE_INTERVAL_SECONDS) return;
    lastSavedSecond = seconds;
    if (saveEpisodeProgress(movie.slug, episode.ep, seconds, duration)) {
      onBecameWatched();
    }
  });
}

function updateUpNextPanel(episodes, idx, selectEpisode) {
  const nextEpPanel = document.getElementById("nextEpPanel");
  if (!nextEpPanel) return;
  if (idx >= episodes.length - 1) {
    nextEpPanel.style.display = "none";
    return;
  }

  nextEpPanel.style.display = "flex";
  const nextEp = episodes[idx + 1];
  const nextTitleEl = document.getElementById("nextEpTitle");
  if (nextTitleEl) {
    nextTitleEl.textContent = t(nextEp.title) || (LANG === "km" ? `ភាគ ${toKhmerNumerals(nextEp.ep)}` : `Episode ${nextEp.ep}`);
  }
  const nextEpBtn = document.getElementById("nextEpBtn");
  if (nextEpBtn) {
    const newBtn = nextEpBtn.cloneNode(true);
    nextEpBtn.parentNode.replaceChild(newBtn, nextEpBtn);
    newBtn.addEventListener("click", () => selectEpisode(idx + 1, true));
  }
}

function renderMovieEpisodes(movie, epParam, episodesWrapElement, episodesGridElement) {
  const episodes = movie.episodes || [];
  renderEpisodeCount(episodes.length);
  episodesGridElement.textContent = "";

  const buttons = createEpisodeButtons(episodes, episodesGridElement, idx => selectEpisode(idx, true));
  const rangeTabs = setupRangeTabs(episodes, buttons, episodesWrapElement, episodesGridElement);
  applyWatchedMarkers(movie.slug, episodes, buttons);

  function selectEpisode(idx, pushStateChange) {
    if (idx < 0 || idx >= episodes.length) return;
    buttons.forEach((btn, i) => btn.classList.toggle("active", i === idx));
    buttons[idx].scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (rangeTabs) rangeTabs.reveal(idx);

    playEpisode(movie, episodes[idx]);
    document.title = t(episodes[idx].title) + " · " + t(movie.title);
    if (pushStateChange) updateEpisodeUrlParam(episodes[idx].ep);

    saveWatchHistory(movie, episodes[idx]);
    recordEpisodeSelection(movie.slug, episodes[idx].ep);
    trackEpisodeProgress(movie, episodes[idx], () => markButtonWatched(buttons[idx]));
    updateUpNextPanel(episodes, idx, selectEpisode);
    setOnEnded(() => {
      markEpisodeWatched(movie.slug, episodes[idx].ep);
      markButtonWatched(buttons[idx]);
      selectEpisode(idx + 1, true);
    });
  }

  episodesWrapElement.style.display = "block";
  selectEpisode(resolveStartIndex(movie, episodes, epParam), false);
}

function renderMovie(movie, epParam) {
  document.title = t(movie.title) + " · iblogger player";

  const infoElement = document.getElementById("info");
  const posterElement = document.getElementById("poster");
  const badgesElement = document.getElementById("infoBadges");
  const descriptionElement = document.getElementById("infoDesc");
  const episodesWrapElement = document.getElementById("episodesWrap");
  const episodesGridElement = document.getElementById("episodes");

  renderMoviePoster(movie, infoElement, posterElement);
  
  document.getElementById("infoTitle").textContent = t(movie.title);
  const subTitle = LANG === "km" ? (movie.title.en || "") : (movie.title.km || "");
  document.getElementById("infoSubtitle").textContent = subTitle;

  renderMovieBadges(movie, badgesElement);
  renderMovieDescription(movie, descriptionElement);

  infoElement.style.display = "flex";

  renderMovieEpisodes(movie, epParam, episodesWrapElement, episodesGridElement);
}

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
      const wrap = document.getElementById("related");
      wrap.textContent = "";
      related.forEach(m => {
        const a = document.createElement("a");
        a.className = "rel-card";
        a.href = "?id=" + encodeURIComponent(m.slug) + (LANG === "en" ? "&lang=en" : "");
        const posterWrap = document.createElement("div");
        posterWrap.className = "rel-poster-wrap";
        
        const img = document.createElement("img");
        img.className = "rel-poster";
        img.loading = "lazy";
        img.alt = t(m.title);

        function renderRelFallback() {
          posterWrap.classList.add("img-failed");
          const fb = document.createElement("div");
          fb.className = "rel-fallback-poster";
          fb.innerHTML = `
            <svg class="fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="2" y1="7" x2="7" y2="7"></line>
              <line x1="2" y1="17" x2="7" y2="17"></line>
              <line x1="17" y1="17" x2="22" y2="17"></line>
              <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
          `;
          posterWrap.appendChild(fb);
          img.remove();
        }

        if (m.poster) {
          img.src = m.poster;
          img.onerror = () => renderRelFallback();
          posterWrap.appendChild(img);
        } else {
          renderRelFallback();
        }

        const cap = document.createElement("div");
        cap.className = "rel-title";
        cap.textContent = t(m.title);
        a.appendChild(posterWrap);
        a.appendChild(cap);
        wrap.appendChild(a);
      });
      document.getElementById("relatedWrap").style.display = "block";
    })
    .catch(() => {});
}
