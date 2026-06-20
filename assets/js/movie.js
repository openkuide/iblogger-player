// Direct/Movie routing details and rendering

import { LANG, t, showLoader, showStatusText, showToast, toKhmerNumerals, formatPlaybackTime, playSparkleSound, playRetroClickSound, translateGenre, triggerOsd, triggerCrtStatic } from './utils.js';
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

let currentMovie = null;

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

  const params = new URLSearchParams(location.search);
  const tParam = params.get("t");
  if (tParam) {
    const time = parseInt(tParam, 10);
    if (!isNaN(time) && time >= 0) {
      seekWhenReady(time);
    }
  }
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
      setupDetailsNudgeListeners();
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
    const userRatingKey = `user_rating_${movie.slug}`;
    const userRating = localStorage.getItem(userRatingKey);
    const displayRating = userRating ? `${userRating}.0 (${LANG === "km" ? "ខ្ញុំ" : "Me"})` : String(movie.rating);
    const badge = createBadgeElement(displayRating, "star interactive-rating", badgesElement, starSvg);
    badge.title = LANG === "km" ? "វាយតម្លៃរឿងនេះ (Rate Movie)" : "Rate this Movie";
    badge.tabIndex = 0;
    badge.setAttribute("role", "button");
    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      showRatingDialog(badge, movie.slug);
    });
    badge.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        showRatingDialog(badge, movie.slug);
      }
    });
  }

  if (movie.year) {
    const calendarSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    const yearBadge = createBadgeElement(String(movie.year), "clickable-year", badgesElement, calendarSvg);
    yearBadge.title = "ស្វែងរករឿងឆ្នាំ " + movie.year + " (Find movies from " + movie.year + ")";
    yearBadge.tabIndex = 0;
    yearBadge.setAttribute("role", "button");
    yearBadge.addEventListener("click", () => {
      history.pushState(null, "", "?year=" + movie.year);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    yearBadge.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        history.pushState(null, "", "?year=" + movie.year);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
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
    const genreText = translateGenre(genre);
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

function createEpisodeButtons(episodes, episodesGridElement, onSelect, slug) {
  return episodes.map((ep, i) => {
    const btn = document.createElement("button");
    btn.className = "ep-btn" + (ep.final ? " final" : "");
    btn.textContent = LANG === "km" ? toKhmerNumerals(ep.ep || (i + 1)) : (ep.ep || (i + 1));
    btn.title = t(ep.title) + (ep.final ? " (ភាគចុងក្រោយ)" : "");
    
    // Anchoring: First episode START visual cue
    if (i === 0) {
      btn.classList.add("ep-first");
      btn.setAttribute("data-label", LANG === "km" ? "ផ្ដើម" : "START");
    }

    // Sunk Cost / Zeigarnik: In-progress indicator
    const resumePos = getResumePosition(slug, ep.ep);
    if (resumePos > 0) {
      btn.classList.add("in-progress");
    }

    btn.addEventListener("click", () => onSelect(i));
    episodesGridElement.appendChild(btn);
    return btn;
  });
}

function markButtonWatched(button) {
  button.classList.add("watched");
  button.classList.remove("in-progress");
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

    // Chunking / Miller's Law: Contextual framing for active range
    const start = range * EPISODES_PER_RANGE + 1;
    const end = Math.min((range + 1) * EPISODES_PER_RANGE, episodes.length);
    const countEl = document.getElementById("epCount");
    if (countEl) {
      const startText = LANG === "km" ? toKhmerNumerals(start) : start;
      const endText = LANG === "km" ? toKhmerNumerals(end) : end;
      const totalText = LANG === "km" ? toKhmerNumerals(episodes.length) : episodes.length;
      countEl.textContent = `(${startText}–${endText} នៃ ${totalText})`;
    }
  }

  return { reveal: idx => showRange(Math.floor(idx / EPISODES_PER_RANGE)) };
}

function updateEpisodeUrlParam(ep) {
  const u = new URL(location.href);
  u.searchParams.set("ep", ep);
  history.replaceState(null, "", u);
}

function resumeIfSaved(slug, ep) {
  const params = new URLSearchParams(location.search);
  const tParam = params.get("t");
  if (tParam) {
    const time = parseInt(tParam, 10);
    if (!isNaN(time) && time >= 0) {
      seekWhenReady(time);
      return;
    }
  }

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
    const titleText = t(nextEp.title) || (LANG === "km" ? `ភាគ ${toKhmerNumerals(nextEp.ep)}` : `Episode ${nextEp.ep}`);
    
    // Typewriter effect (Curiosity Gap)
    nextTitleEl.textContent = "";
    if (nextTitleEl._typewriterInterval) clearInterval(nextTitleEl._typewriterInterval);
    
    let charIdx = 0;
    nextTitleEl._typewriterInterval = setInterval(() => {
      if (charIdx < titleText.length) {
        nextTitleEl.textContent += titleText.charAt(charIdx);
        charIdx++;
      } else {
        clearInterval(nextTitleEl._typewriterInterval);
      }
    }, 40);
  }
  const nextEpBtn = document.getElementById("nextEpBtn");
  if (nextEpBtn) {
    const newBtn = nextEpBtn.cloneNode(true);
    nextEpBtn.parentNode.replaceChild(newBtn, nextEpBtn);
    newBtn.addEventListener("click", () => {
      if (nextTitleEl && nextTitleEl._typewriterInterval) {
        clearInterval(nextTitleEl._typewriterInterval);
      }
      selectEpisode(idx + 1, true);
    });
  }
}

function renderMovieEpisodes(movie, epParam, episodesWrapElement, episodesGridElement) {
  const episodes = movie.episodes || [];
  renderEpisodeCount(episodes.length);
  episodesGridElement.textContent = "";

  const buttons = createEpisodeButtons(episodes, episodesGridElement, idx => selectEpisode(idx, true), movie.slug);
  const rangeTabs = setupRangeTabs(episodes, buttons, episodesWrapElement, episodesGridElement);
  applyWatchedMarkers(movie.slug, episodes, buttons);

  function updateWatchedMeta() {
    const watched = getWatchedEpisodes(movie.slug);
    let meta = document.getElementById("epGridMeta");
    if (!meta) {
      meta = document.createElement("div");
      meta.id = "epGridMeta";
      meta.className = "ep-grid-meta";
      episodesWrapElement.insertBefore(meta, episodesGridElement);
    }
    const wCount = watched.size;
    const total = episodes.length;
    meta.innerHTML = wCount > 0
      ? `<span class="watched-count">✓ ${LANG === "km" ? toKhmerNumerals(wCount) : wCount}</span> / ${LANG === "km" ? toKhmerNumerals(total) : total} ភាគបានមើល (watched)`
      : `${LANG === "km" ? toKhmerNumerals(total) : total} ភាគ · ចាប់ផ្ដើមមើលពី ភាគ ១`;
  }

  function selectEpisode(idx, pushStateChange) {
    if (idx < 0 || idx >= episodes.length) return;
    if (pushStateChange) {
      playRetroClickSound();
      triggerCrtStatic();
      const epNum = episodes[idx].ep;
      const chLabel = String(epNum).padStart(2, '0');
      triggerOsd(`CH ${LANG === "km" ? toKhmerNumerals(chLabel) : chLabel}`);
    }
    removeNextEpisodeCountdown();
    buttons.forEach((btn, i) => {
      const isActive = i === idx;
      btn.classList.toggle("active", isActive);
      const existingEq = btn.querySelector(".ep-eq");
      if (isActive) {
        if (!existingEq) {
          const eqEl = document.createElement("span");
          eqEl.className = "ep-eq";
          eqEl.innerHTML = "<span></span><span></span><span></span>";
          btn.prepend(eqEl);
        }
      } else {
        if (existingEq) {
          existingEq.remove();
        }
      }
    });
    buttons[idx].scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (rangeTabs) rangeTabs.reveal(idx);

    playEpisode(movie, episodes[idx]);
    document.title = t(episodes[idx].title) + " · " + t(movie.title);
    if (pushStateChange) updateEpisodeUrlParam(episodes[idx].ep);

    saveWatchHistory(movie, episodes[idx]);
    recordEpisodeSelection(movie.slug, episodes[idx].ep);
    renderResumeCTA(movie);
    
    trackEpisodeProgress(movie, episodes[idx], () => {
      markButtonWatched(buttons[idx]);
      updateWatchedMeta();
    });
    updateUpNextPanel(episodes, idx, selectEpisode);
    setOnEnded(() => {
      markEpisodeWatched(movie.slug, episodes[idx].ep);
      markButtonWatched(buttons[idx]);
      updateWatchedMeta();
      const nextIdx = idx + 1;
      if (nextIdx < episodes.length) {
        startNextEpisodeCountdown(nextIdx);
      } else {
        showCompletionOverlay();
      }
    });
  }

  function removeNextEpisodeCountdown() {
    const overlay = document.querySelector(".vjs-countdown-overlay");
    if (overlay) {
      if (overlay._interval) clearInterval(overlay._interval);
      overlay.remove();
    }
  }

  function startNextEpisodeCountdown(nextIdx) {
    const playerEl = window.player ? window.player.el() : null;
    if (!playerEl) {
      selectEpisode(nextIdx, true);
      return;
    }
    
    removeNextEpisodeCountdown();
    
    const nextEp = episodes[nextIdx];
    const nextEpTitle = nextEp.title[LANG] || nextEp.title.en || nextEp.title.km || `Episode ${nextEp.ep}`;
    
    const overlay = document.createElement("div");
    overlay.className = "vjs-countdown-overlay";
    overlay.innerHTML = `
      <div class="vjs-countdown-card">
        <div class="vjs-countdown-title">
          <span class="lang-km-block">ភាគបន្ទាប់នឹងចាក់ក្នុងរយៈពេល</span>
          <span class="lang-en-block">Next Episode In</span>
        </div>
        <div class="vjs-countdown-number">5</div>
        <div class="vjs-countdown-next-title">${nextEpTitle}</div>
        <div class="vjs-countdown-actions">
          <button class="vjs-countdown-btn play-now-btn">
            <span class="lang-km-block">ចាក់ឥឡូវនេះ</span>
            <span class="lang-en-block">Play Now</span>
          </button>
          <button class="vjs-countdown-btn cancel-btn">
            <span class="lang-km-block">បោះបង់</span>
            <span class="lang-en-block">Cancel</span>
          </button>
        </div>
      </div>
    `;
    
    playerEl.appendChild(overlay);
    
    let countdownSeconds = 5;
    const numberEl = overlay.querySelector(".vjs-countdown-number");
    
    const countdownInterval = setInterval(() => {
      countdownSeconds--;
      if (numberEl) numberEl.textContent = countdownSeconds;
      
      if (countdownSeconds <= 0) {
        clearInterval(countdownInterval);
        removeNextEpisodeCountdown();
        selectEpisode(nextIdx, true);
      }
    }, 1000);
    
    overlay._interval = countdownInterval;
    
    overlay.querySelector(".play-now-btn").addEventListener("click", () => {
      clearInterval(countdownInterval);
      removeNextEpisodeCountdown();
      selectEpisode(nextIdx, true);
    });
    
    overlay.querySelector(".cancel-btn").addEventListener("click", () => {
      clearInterval(countdownInterval);
      removeNextEpisodeCountdown();
    });
  }

  function showCompletionOverlay() {
    const playerEl = window.player ? window.player.el() : null;
    if (!playerEl) return;

    removeNextEpisodeCountdown();

    const overlay = document.createElement("div");
    overlay.className = "vjs-countdown-overlay vjs-completion-overlay";
    overlay.innerHTML = `
      <div class="vjs-countdown-card vjs-completion-card">
        <div class="vjs-completion-icon" style="font-size: 48px; margin-bottom: 12px; display: inline-block; animation: bounce-scale 0.6s ease infinite alternate;">🎉</div>
        <div class="vjs-countdown-title" style="color: var(--accent, #0a84ff);">
          <span class="lang-km-block">រឿងភាគនេះត្រូវបានបញ្ចប់!</span>
          <span class="lang-en-block">Series Completed!</span>
        </div>
        <div class="vjs-countdown-next-title" style="margin-top: 8px; margin-bottom: 24px;">
          ${movie.title[LANG] || movie.title.en || movie.title.km}
        </div>
        <div class="vjs-countdown-actions">
          <button class="vjs-countdown-btn play-now-btn back-home-overlay-btn">
            <span class="lang-km-block">ត្រឡប់ទៅទំព័រដើម</span>
            <span class="lang-en-block">Back to Browse</span>
          </button>
          <button class="vjs-countdown-btn cancel-btn rate-series-overlay-btn">
            <span class="lang-km-block">★ វាយតម្លៃរឿងនេះ</span>
            <span class="lang-en-block">★ Rate Series</span>
          </button>
        </div>
      </div>
    `;
    playerEl.appendChild(overlay);
    
    playSparkleSound();

    setTimeout(() => {
      const iconEl = overlay.querySelector(".vjs-completion-icon");
      if (iconEl) {
        triggerStarExplosion(iconEl);
        setTimeout(() => triggerStarExplosion(iconEl), 150);
        setTimeout(() => triggerStarExplosion(iconEl), 300);
      }
    }, 100);

    overlay.querySelector(".back-home-overlay-btn").addEventListener("click", () => {
      removeNextEpisodeCountdown();
      const backLink = document.querySelector(".back-btn");
      if (backLink) backLink.click();
    });

    overlay.querySelector(".rate-series-overlay-btn").addEventListener("click", () => {
      removeNextEpisodeCountdown();
      const ratingBadge = document.querySelector(".interactive-rating");
      if (ratingBadge) {
        ratingBadge.click();
      }
    });
  }

  updateWatchedMeta();
  episodesWrapElement.style.display = "block";
  selectEpisode(resolveStartIndex(movie, episodes, epParam), false);
}

function renderMovie(movie, epParam) {
  currentMovie = movie;
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

  // Self-determination Theory: Keyboard shortcut hint bar
  let kbBar = document.getElementById("kbHints");
  if (!kbBar) {
    kbBar = document.createElement("div");
    kbBar.id = "kbHints";
    kbBar.className = "kb-hints";
    
    const labelPlay = LANG === "km" ? "ចាក់/ផ្អាក" : "Play/Pause";
    const labelFs = LANG === "km" ? "ពេញអេក្រង់" : "Fullscreen";
    const labelSeek = LANG === "km" ? "សារថយក្រោយ/ទៅមុខ ១០វិ" : "Seek 10s";
    const labelMute = LANG === "km" ? "បិទ/បើកសំឡេង" : "Mute";

    kbBar.innerHTML = `
      <span class="kb-hint"><kbd class="kb-key">K</kbd> / <kbd class="kb-key">Space</kbd> ${labelPlay}</span>
      <span class="kb-hint"><kbd class="kb-key">F</kbd> ${labelFs}</span>
      <span class="kb-hint"><kbd class="kb-key">←</kbd><kbd class="kb-key">→</kbd> ${labelSeek}</span>
      <span class="kb-hint"><kbd class="kb-key">M</kbd> ${labelMute}</span>
    `;
    const tvFeetEl = document.querySelector(".tv-feet");
    if (tvFeetEl && tvFeetEl.parentNode) {
      tvFeetEl.parentNode.insertBefore(kbBar, tvFeetEl.nextSibling);
    }
  }

  // Aesthetic-Usability Effect: Subtle 3D tilt on poster hover
  const infoEl = document.getElementById("info");
  const posterEl = document.getElementById("poster");
  if (infoEl && posterEl) {
    if (infoEl._tiltMoveHandler) {
      infoEl.removeEventListener("mousemove", infoEl._tiltMoveHandler);
      infoEl.removeEventListener("mouseleave", infoEl._tiltLeaveHandler);
    }
    
    infoEl._tiltMoveHandler = (e) => {
      const rect = posterEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const tiltX = Math.max(-10, Math.min(10, -dy * 10));
      const tiltY = Math.max(-10, Math.min(10, dx * 10));
      posterEl.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.04, 1.04, 1.04)`;
    };
    
    infoEl._tiltLeaveHandler = () => {
      posterEl.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    };
    
    infoEl.addEventListener("mousemove", infoEl._tiltMoveHandler);
    infoEl.addEventListener("mouseleave", infoEl._tiltLeaveHandler);
  }

  renderMovieEpisodes(movie, epParam, episodesWrapElement, episodesGridElement);
  renderResumeCTA(movie);
  setupChannelKnob(movie);
}

function renderResumeCTA(movie) {
  const actionsContainer = document.querySelector(".info-actions");
  if (!actionsContainer) return;

  const existingBtn = document.getElementById("resumeCtaBtn");
  if (existingBtn) existingBtn.remove();

  const bannerEl = document.getElementById("resumeBanner");
  if (bannerEl) {
    bannerEl.style.display = "none";
    bannerEl.innerHTML = "";
  }

  const episodes = movie.episodes || [];
  if (episodes.length === 0) return;

  const lastEp = getLastWatchedEpisode(movie.slug);
  let targetEp = null;
  let targetIdx = 0;
  let isResume = false;
  let resumeTime = 0;

  if (lastEp) {
    const idx = episodes.findIndex(e => String(e.ep) === String(lastEp));
    if (idx !== -1) {
      resumeTime = getResumePosition(movie.slug, lastEp);
      if (resumeTime > 0) {
        targetEp = episodes[idx];
        targetIdx = idx;
        isResume = true;
      } else if (idx + 1 < episodes.length) {
        targetEp = episodes[idx + 1];
        targetIdx = idx + 1;
      } else {
        targetEp = episodes[0];
        targetIdx = 0;
      }
    }
  }

  if (!targetEp) {
    targetEp = episodes[0];
    targetIdx = 0;
  }

  if (isResume && bannerEl) {
    // Render floating resume banner
    const formattedTime = formatPlaybackTime(resumeTime);
    const titleText = LANG === "km" ? "បន្តទស្សនា (Resume Watching)" : "Resume Watching";
    const bodyText = LANG === "km"
      ? `អ្នកបានទស្សនាភាគ ${toKhmerNumerals(targetEp.ep)} ដល់នាទី ${toKhmerNumerals(formattedTime)}។ តើអ្នកចង់បន្តទស្សនាដែរឬទេ?`
      : `You left off watching Episode ${targetEp.ep} at ${formattedTime}. Would you like to resume?`;
    
    const resumeLabel = LANG === "km" ? "បន្តមើល (Resume)" : "Resume";

    bannerEl.innerHTML = `
      <div class="resume-banner-header">
        <span class="resume-banner-title">${titleText}</span>
        <button class="resume-banner-close" aria-label="Dismiss">✕</button>
      </div>
      <div class="resume-banner-body">${bodyText}</div>
      <div class="resume-banner-footer">
        <button class="resume-banner-btn primary">${resumeLabel}</button>
      </div>
    `;

    // Bind close
    bannerEl.querySelector(".resume-banner-close").addEventListener("click", () => {
      playRetroClickSound();
      bannerEl.style.display = "none";
    });

    // Bind resume action
    bannerEl.querySelector(".resume-banner-btn.primary").addEventListener("click", () => {
      playSparkleSound();
      bannerEl.style.display = "none";
      const tvEl = document.querySelector(".tv");
      if (tvEl) {
        tvEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const epButtons = document.querySelectorAll("#episodes .ep-btn");
      if (epButtons && epButtons[targetIdx]) {
        epButtons[targetIdx].click();
      }
    });

    bannerEl.style.display = "flex";
  }

  // Render normal button in actionsContainer for standard navigation flow
  const btn = document.createElement("button");
  btn.id = "resumeCtaBtn";
  btn.className = "action-btn resume-cta-btn";

  const playSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="margin-right:6px;"><path d="M8 5v14l11-7z"/></svg>`;
  
  let labelText = "";
  if (isResume) {
    const formattedTime = formatPlaybackTime(resumeTime);
    labelText = LANG === "km"
      ? `បន្តទស្សនាភាគ ${toKhmerNumerals(targetEp.ep)} ត្រង់ ${toKhmerNumerals(formattedTime)}`
      : `Resume Episode ${targetEp.ep} at ${formattedTime}`;
  } else if (lastEp) {
    if (targetIdx === 0) {
      labelText = LANG === "km"
        ? "មើលឡើងវិញ ភាគ ១"
        : "Replay Episode 1";
    } else {
      labelText = LANG === "km"
        ? `មើលភាគបន្ត ភាគ ${toKhmerNumerals(targetEp.ep)}`
        : `Play Next: Episode ${targetEp.ep}`;
    }
  } else {
    labelText = LANG === "km"
      ? `ចាប់ផ្ដើមមើល ភាគ ${toKhmerNumerals(targetEp.ep)}`
      : `Start Watching: Episode ${targetEp.ep}`;
  }

  btn.innerHTML = `${playSvg}<span>${labelText}</span>`;
  btn.addEventListener("click", () => {
    if (isResume && bannerEl) bannerEl.style.display = "none";
    const tvEl = document.querySelector(".tv");
    if (tvEl) {
      tvEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const epButtons = document.querySelectorAll("#episodes .ep-btn");
    if (epButtons && epButtons[targetIdx]) {
      epButtons[targetIdx].click();
    }
  });

  actionsContainer.insertBefore(btn, actionsContainer.firstChild);
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

      // Mimetic Desire: Social watching cues for related movies title
      const relTitle = document.querySelector("#relatedWrap .section-title");
      if (relTitle) {
        relTitle.textContent = LANG === "km" ? "អ្នកទស្សនាបានមើល (Viewers also watched)" : "Viewers also watched";
      }

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

function showRatingDialog(badge, slug) {
  let dialog = document.getElementById("ratingDialog");
  
  const destroyDialog = () => {
    const existing = document.getElementById("ratingDialog");
    if (existing) existing.remove();
    document.removeEventListener("click", destroyDialog);
    document.removeEventListener("keydown", handleGlobalEsc);
  };

  const handleGlobalEsc = (e) => {
    if (e.key === "Escape") {
      destroyDialog();
    }
  };

  destroyDialog();
  
  dialog = document.createElement("div");
  dialog.id = "ratingDialog";
  dialog.className = "rating-dialog";
  
  const labelText = LANG === "km" ? "វាយតម្លៃរឿងនេះ (Rate Movie)" : "Rate this Movie";
  dialog.innerHTML = `
    <div class="rating-dialog-title">${labelText}</div>
    <div class="rating-dialog-stars">
      <span class="rating-star" data-value="1" tabindex="0" role="button" aria-label="1 Star">★</span>
      <span class="rating-star" data-value="2" tabindex="0" role="button" aria-label="2 Stars">★</span>
      <span class="rating-star" data-value="3" tabindex="0" role="button" aria-label="3 Stars">★</span>
      <span class="rating-star" data-value="4" tabindex="0" role="button" aria-label="4 Stars">★</span>
      <span class="rating-star" data-value="5" tabindex="0" role="button" aria-label="5 Stars">★</span>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  const rect = badge.getBoundingClientRect();
  dialog.style.left = `${rect.left + window.scrollX}px`;
  dialog.style.top = `${rect.bottom + window.scrollY + 8}px`;
  
  const stars = dialog.querySelectorAll(".rating-star");
  const userRatingKey = `user_rating_${slug}`;
  const currentVal = parseInt(localStorage.getItem(userRatingKey)) || 0;
  
  const highlightStars = (val) => {
    stars.forEach((star, idx) => {
      star.classList.toggle("active", idx < val);
    });
  };
  
  highlightStars(currentVal);
  
  const selectRating = (val) => {
    localStorage.setItem(userRatingKey, val);
    
    const badgeText = badge.querySelector(".badge-text");
    if (badgeText) {
      badgeText.textContent = `${val}.0 (${LANG === "km" ? "ខ្ញុំ" : "Me"})`;
    }
    
    playSparkleSound();
    triggerStarExplosion(badge);
    destroyDialog();
  };

  stars.forEach((star) => {
    star.addEventListener("mouseenter", () => {
      highlightStars(parseInt(star.dataset.value));
    });
    
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      selectRating(parseInt(star.dataset.value));
    });

    star.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        selectRating(parseInt(star.dataset.value));
      }
    });
  });
  
  dialog.addEventListener("mouseleave", () => {
    const val = parseInt(localStorage.getItem(userRatingKey)) || 0;
    highlightStars(val);
  });
  
  setTimeout(() => {
    document.addEventListener("click", destroyDialog);
    document.addEventListener("keydown", handleGlobalEsc);
  }, 50);
}

function triggerStarExplosion(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 + window.scrollX;
  const cy = rect.top + rect.height / 2 + window.scrollY;
  
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("div");
    p.className = "star-particle";
    p.textContent = "★";
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.color = "#ffd60a";
    p.style.fontSize = `${Math.floor(Math.random() * 8) + 10}px`;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 40 + 20;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    
    p.style.setProperty("--dx", `${dx}px`);
    p.style.setProperty("--dy", `${dy}px`);
    
    document.body.appendChild(p);
    
    setTimeout(() => {
      p.remove();
    }, 600);
  }
}

function setupChannelKnob(movie) {
  const dial = document.getElementById("channelDial");
  if (!dial) return;

  if (dial.dataset.bound) {
    let rotation = parseInt(localStorage.getItem(`channel_dial_rot_${movie.slug}`)) || 0;
    dial.style.setProperty("--channel-rotate", `${rotation}deg`);
    return;
  }
  dial.dataset.bound = 'true';

  let rotation = parseInt(localStorage.getItem(`channel_dial_rot_${movie.slug}`)) || 0;
  dial.style.setProperty("--channel-rotate", `${rotation}deg`);

  const rotateDial = (direction) => {
    if (!currentMovie) return;
    const epButtons = Array.from(document.querySelectorAll("#episodes .ep-btn"));
    if (epButtons.length === 0) return;

    const activeIdx = epButtons.findIndex(btn => btn.classList.contains("active"));
    if (activeIdx === -1) return;

    let targetIdx = activeIdx + direction;
    if (targetIdx >= 0 && targetIdx < epButtons.length) {
      let rot = parseInt(localStorage.getItem(`channel_dial_rot_${currentMovie.slug}`)) || 0;
      rot += direction * 30;
      localStorage.setItem(`channel_dial_rot_${currentMovie.slug}`, rot);
      dial.style.setProperty("--channel-rotate", `${rot}deg`);
      epButtons[targetIdx].click();
    }
  };

  dial.addEventListener("wheel", (e) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? 1 : -1;
    rotateDial(direction);
  }, { passive: false });

  let isDragging = false;
  let startAngle = 0;

  dial.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging || !currentMovie) return;
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const diff = currentAngle - startAngle;

    if (Math.abs(diff) > 0.45) {
      const direction = diff > 0 ? 1 : -1;
      rotateDial(direction);
      startAngle = currentAngle;
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  dial.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      rotateDial(1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      rotateDial(-1);
    }
  });
}

// ── Detail Page Psychology-driven Wiggling Nudges (Hick's Law / Evolutionary Attention) ──
let detailsIdleTimer = null;
let epHoverTimer = null;
let activeHoverElement = null;

function clearDetailsIdleTimer() {
  if (detailsIdleTimer) {
    clearTimeout(detailsIdleTimer);
    detailsIdleTimer = null;
  }
}

function resetDetailsIdleTimer() {
  // Clear any existing nudge-active classes on elements
  const activeNudges = document.querySelectorAll("#resumeCtaBtn.nudge-active, #episodes .ep-btn.nudge-active, #nextEpBtn.nudge-active");
  activeNudges.forEach(el => el.classList.remove("nudge-active"));

  clearDetailsIdleTimer();

  // If user is actively hovering/focusing on an element, disable the idle wiggler
  if (activeHoverElement) {
    return;
  }

  // Trigger wiggling nudge on primary detail actions after 6s of complete page inactivity
  detailsIdleTimer = setTimeout(() => {
    if (activeHoverElement) return;

    const resumeCta = document.getElementById("resumeCtaBtn");
    if (resumeCta) {
      resumeCta.classList.add("nudge-active");
    } else {
      const firstEp = document.querySelector("#episodes .ep-btn");
      if (firstEp) {
        firstEp.classList.add("nudge-active");
      }
    }

    const nextEpBtn = document.getElementById("nextEpBtn");
    if (nextEpBtn && nextEpBtn.style.display !== "none") {
      nextEpBtn.classList.add("nudge-active");
    }
  }, 6000);
}

function handleMouseOverDelegate(e) {
  const target = e.target.closest(".ep-btn, .resume-cta-btn");
  if (!target) return;

  if (activeHoverElement === target) return;

  if (epHoverTimer) clearTimeout(epHoverTimer);
  if (activeHoverElement) activeHoverElement.classList.remove("nudge-active");

  activeHoverElement = target;
  epHoverTimer = setTimeout(() => {
    if (activeHoverElement) {
      activeHoverElement.classList.add("nudge-active");
    }
  }, 1500);
}

function handleMouseOutDelegate(e) {
  const target = e.target.closest(".ep-btn, .resume-cta-btn");
  if (!target) return;

  if (epHoverTimer) {
    clearTimeout(epHoverTimer);
    epHoverTimer = null;
  }
  target.classList.remove("nudge-active");
  if (activeHoverElement === target) {
    activeHoverElement = null;
  }
}

function setupDetailsNudgeListeners() {
  teardownDetailsNudgeListeners();

  // Register page inactivity events
  window.addEventListener("mousemove", resetDetailsIdleTimer);
  window.addEventListener("mousedown", resetDetailsIdleTimer);
  window.addEventListener("keydown", resetDetailsIdleTimer);
  window.addEventListener("scroll", resetDetailsIdleTimer);
  window.addEventListener("touchstart", resetDetailsIdleTimer);

  resetDetailsIdleTimer();

  // Episode grid hover delegation
  const epWrap = document.getElementById("episodes");
  if (epWrap) {
    epWrap.addEventListener("mouseover", handleMouseOverDelegate);
    epWrap.addEventListener("mouseout", handleMouseOutDelegate);
  }

  // Info actions list hover delegation
  const actionsWrap = document.querySelector(".info-actions");
  if (actionsWrap) {
    actionsWrap.addEventListener("mouseover", handleMouseOverDelegate);
    actionsWrap.addEventListener("mouseout", handleMouseOutDelegate);
  }
}

function teardownDetailsNudgeListeners() {
  window.removeEventListener("mousemove", resetDetailsIdleTimer);
  window.removeEventListener("mousedown", resetDetailsIdleTimer);
  window.removeEventListener("keydown", resetDetailsIdleTimer);
  window.removeEventListener("scroll", resetDetailsIdleTimer);
  window.removeEventListener("touchstart", resetDetailsIdleTimer);

  clearDetailsIdleTimer();
  if (epHoverTimer) {
    clearTimeout(epHoverTimer);
    epHoverTimer = null;
  }
  activeHoverElement = null;

  const epWrap = document.getElementById("episodes");
  if (epWrap) {
    epWrap.removeEventListener("mouseover", handleMouseOverDelegate);
    epWrap.removeEventListener("mouseout", handleMouseOutDelegate);
  }

  const actionsWrap = document.querySelector(".info-actions");
  if (actionsWrap) {
    actionsWrap.removeEventListener("mouseover", handleMouseOverDelegate);
    actionsWrap.removeEventListener("mouseout", handleMouseOutDelegate);
  }
}

export function stopMovieMode() {
  teardownDetailsNudgeListeners();
}
