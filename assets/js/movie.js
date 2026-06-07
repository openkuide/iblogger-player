// Direct/Movie routing details and rendering

import { LANG, t, showLoader, showStatusText } from './utils.js';
import { playSource, setOnEnded } from './player.js';

export function startDirectMode(url, ttl) {
  const hintEl = document.getElementById("hint");
  if (hintEl) hintEl.style.display = "none";
  document.title = ttl ? ttl + " · iblogger player" : "iblogger Player";
  document.getElementById("title").textContent = ttl || "Now playing";
  document.getElementById("srcline").textContent = url;
  document.getElementById("source").style.display = "block";
  
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

  if (movie.poster) {
    posterElement.src = movie.poster;
    posterElement.alt = t(movie.title);
    posterElement.style.display = "block";
    posterElement.onerror = () => {
      posterElement.style.display = "none";
      renderFallbackPoster(infoElement);
    };
  } else {
    posterElement.style.display = "none";
    renderFallbackPoster(infoElement);
  }
}

function createBadgeElement(text, className, parentElement) {
  const badge = document.createElement("span");
  badge.className = "badge-i" + (className ? " " + className : "");
  badge.textContent = text;
  parentElement.appendChild(badge);
  return badge;
}

function renderMovieBadges(movie, badgesElement) {
  badgesElement.textContent = "";

  if (movie.rating) {
    createBadgeElement("★ " + movie.rating, "star", badgesElement);
  }

  if (movie.year) {
    const yearBadge = createBadgeElement(String(movie.year), "clickable-year", badgesElement);
    yearBadge.title = "ស្វែងរករឿងឆ្នាំ " + movie.year + " (Find movies from " + movie.year + ")";
    yearBadge.addEventListener("click", () => {
      history.pushState(null, "", "?year=" + movie.year);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }

  if (movie.episodeCount) {
    createBadgeElement(movie.episodeCount + " ភាគ", "", badgesElement);
  }

  (movie.genres || []).slice(0, 4).forEach(genre => {
    createBadgeElement(genre, "", badgesElement);
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

function renderMovieEpisodes(movie, epParam, episodesWrapElement, episodesGridElement) {
  const episodes = movie.episodes || [];
  document.getElementById("epCount").textContent = "(" + episodes.length + ")";
  episodesGridElement.textContent = "";

  let startIdx = 0;
  if (epParam != null) {
    const byLabel = episodes.findIndex(e => String(e.ep) === String(epParam));
    startIdx = byLabel >= 0 ? byLabel : Math.max(0, Math.min(episodes.length - 1, (parseInt(epParam, 10) || 1) - 1));
  }

  const buttons = [];

  function selectEpisode(idx, pushStateChange) {
    if (idx < 0 || idx >= episodes.length) return;
    
    buttons.forEach((btn, i) => btn.classList.toggle("active", i === idx));
    buttons[idx].scrollIntoView({ block: "nearest", behavior: "smooth" });
    
    const videoEl = document.getElementById("video");
    playSource(episodes[idx].url, videoEl);
    
    document.title = t(episodes[idx].title) + " · " + t(movie.title);
    
    if (pushStateChange) {
      const u = new URL(location.href);
      u.searchParams.set("ep", episodes[idx].ep);
      history.replaceState(null, "", u);
    }
    
    setOnEnded(() => selectEpisode(idx + 1, true));
  }

  episodes.forEach((ep, i) => {
    const btn = document.createElement("button");
    btn.className = "ep-btn" + (ep.final ? " final" : "");
    btn.textContent = ep.ep || (i + 1);
    btn.title = t(ep.title) + (ep.final ? " (ភាគចុងក្រោយ)" : "");
    btn.addEventListener("click", () => selectEpisode(i, true));
    episodesGridElement.appendChild(btn);
    buttons.push(btn);
  });

  episodesWrapElement.style.display = "block";
  selectEpisode(startIdx, false);
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
