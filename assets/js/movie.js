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

function renderMovie(movie, epParam) {
  document.title = t(movie.title) + " · iblogger player";

  const info = document.getElementById("info");
  const poster = document.getElementById("poster");

  function renderInfoFallback() {
    const existing = info.querySelector(".info-fallback-poster");
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
    info.insertBefore(fb, info.firstChild);
  }

  const existingFb = info.querySelector(".info-fallback-poster");
  if (existingFb) existingFb.remove();

  if (movie.poster) {
    poster.src = movie.poster;
    poster.alt = t(movie.title);
    poster.style.display = "block";
    poster.onerror = () => {
      poster.style.display = "none";
      renderInfoFallback();
    };
  } else {
    poster.style.display = "none";
    renderInfoFallback();
  }

  document.getElementById("infoTitle").textContent = t(movie.title);
  const sub = LANG === "km" ? (movie.title.en || "") : (movie.title.km || "");
  document.getElementById("infoSubtitle").textContent = sub;

  const badges = document.getElementById("infoBadges");
  badges.textContent = "";

  function chip(text, cls) {
    const s = document.createElement("span");
    s.className = "badge-i" + (cls ? " " + cls : "");
    s.textContent = text;
    badges.appendChild(s);
    return s;
  }

  if (movie.rating) chip("★ " + movie.rating, "star");
  if (movie.year) {
    const yb = chip(String(movie.year), "clickable-year");
    yb.title = "ស្វែងរករឿងឆ្នាំ " + movie.year + " (Find movies from " + movie.year + ")";
    yb.addEventListener("click", () => {
      window.location.href = "?year=" + movie.year;
    });
  }
  if (movie.episodeCount) chip(movie.episodeCount + " ភាគ");
  (movie.genres || []).slice(0, 4).forEach(g => chip(g));

  const infoDesc = document.getElementById("infoDesc");
  infoDesc.textContent = "";
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
    infoDesc.appendChild(pKm);
  }
  if (descEn && descEn.trim() !== descKm.trim()) {
    const pEn = document.createElement("p");
    pEn.className = "desc-en";
    pEn.textContent = descEn;
    infoDesc.appendChild(pEn);
  }

  info.style.display = "flex";

  const eps = movie.episodes || [];
  document.getElementById("epCount").textContent = "(" + eps.length + ")";
  const grid = document.getElementById("episodes");
  grid.textContent = "";

  let startIdx = 0;
  if (epParam != null) {
    const byLabel = eps.findIndex(e => String(e.ep) === String(epParam));
    startIdx = byLabel >= 0 ? byLabel : Math.max(0, Math.min(eps.length - 1, (parseInt(epParam, 10) || 1) - 1));
  }

  const buttons = [];
  function selectEp(idx, push) {
    if (idx < 0 || idx >= eps.length) return;
    buttons.forEach((b, i) => b.classList.toggle("active", i === idx));
    buttons[idx].scrollIntoView({ block: "nearest", behavior: "smooth" });
    
    const videoEl = document.getElementById("video");
    playSource(eps[idx].url, videoEl);
    
    document.title = t(eps[idx].title) + " · " + t(movie.title);
    if (push) {
      const u = new URL(location.href);
      u.searchParams.set("ep", eps[idx].ep);
      history.replaceState(null, "", u);
    }
    setOnEnded(() => selectEp(idx + 1, true));
  }

  eps.forEach((ep, i) => {
    const b = document.createElement("button");
    b.className = "ep-btn" + (ep.final ? " final" : "");
    b.textContent = ep.ep || (i + 1);
    b.title = t(ep.title) + (ep.final ? " (ភាគចុងក្រោយ)" : "");
    b.addEventListener("click", () => selectEp(i, true));
    grid.appendChild(b);
    buttons.push(b);
  });
  document.getElementById("episodesWrap").style.display = "block";

  selectEp(startIdx, false);
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
