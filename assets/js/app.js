// Main Application router and entry point

import { initAdBanner, initAdSlider } from './ads.js';
import { startDirectMode, startMovieMode } from './movie.js';
import { startHomeMode } from './home.js';

(function () {
  const playerView = document.getElementById("playerView");
  const homeView = document.getElementById("homeView");
  const legalView = document.getElementById("legalView");
  const aboutView = document.getElementById("aboutView");
  const contactView = document.getElementById("contactView");
  const termsView = document.getElementById("termsView");

  const views = [playerView, homeView, legalView, aboutView, contactView, termsView];

  // Initialize ads
  initAdBanner();
  initAdSlider();

  // Initialize manual theme toggling
  function initTheme() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    const sunIcon = btn.querySelector(".sun-icon");
    const moonIcon = btn.querySelector(".moon-icon");

    let theme = localStorage.getItem("iblogger_theme");
    if (!theme) {
      theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    applyTheme(theme);

    btn.addEventListener("click", () => {
      const currentTheme = document.body.classList.contains("light-theme") ? "light" : "dark";
      const nextTheme = currentTheme === "light" ? "dark" : "light";
      applyTheme(nextTheme);
    });

    function applyTheme(t) {
      if (t === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        if (sunIcon) sunIcon.style.display = "none";
        if (moonIcon) moonIcon.style.display = "block";
      } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        if (sunIcon) sunIcon.style.display = "block";
        if (moonIcon) moonIcon.style.display = "none";
      }
      localStorage.setItem("iblogger_theme", t);
    }
  }
  initTheme();

  // Initialize bilingual language toggling
  function initLanguageToggle() {
    const btn = document.getElementById("langToggle");
    if (!btn) return;

    const label = btn.querySelector(".lang-label");
    const params = new URLSearchParams(location.search);
    const currentLang = (params.get("lang") || "km").toLowerCase() === "en" ? "en" : "km";

    if (label) {
      label.textContent = currentLang === "km" ? "EN" : "ខ្មែរ";
    }

    btn.addEventListener("click", () => {
      const nextLang = currentLang === "km" ? "en" : "km";
      const u = new URL(location.href);
      if (nextLang === "en") {
        u.searchParams.set("lang", "en");
      } else {
        u.searchParams.delete("lang");
      }
      location.href = u.href;
    });
  }
  initLanguageToggle();

  function route() {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const src = params.get("src");
    const pageParam = params.get("page");

    // Hide all views first
    views.forEach(v => {
      if (v) v.style.display = "none";
    });

    // Pause player if we are leaving the player view
    if (window.player && typeof window.player.pause === 'function') {
      try {
        window.player.pause();
      } catch (e) {
        console.warn("Error pausing player:", e);
      }
    }

    // Route based on URL parameters
    if (pageParam === "legal") {
      if (legalView) legalView.style.display = "block";
      document.title = "iblogger player · Privacy & DMCA";
    } else if (pageParam === "about") {
      if (aboutView) aboutView.style.display = "block";
      document.title = "iblogger player · About Us";
    } else if (pageParam === "contact") {
      if (contactView) contactView.style.display = "block";
      document.title = "iblogger player · Contact Us";
    } else if (pageParam === "terms") {
      if (termsView) termsView.style.display = "block";
      document.title = "iblogger player · Terms of Service";
    } else if (id) {
      if (playerView) playerView.style.display = "block";
      startMovieMode(id, params.get("ep"));
    } else if (src) {
      if (playerView) playerView.style.display = "block";
      startDirectMode(src, params.get("title"));
    } else {
      if (homeView) homeView.style.display = "block";
      startHomeMode();
    }

    // Reset scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Set up local navigation link click interception
  document.addEventListener("click", e => {
    const anchor = e.target.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // Check if it's a local query/route link
    const isLocal = href.startsWith("?") || href.startsWith("./") || href.startsWith("index.html");
    const isExternal = anchor.getAttribute("target") === "_blank";
    const isLogo = anchor.classList.contains("logo");

    if (isLocal && !isExternal && !isLogo) {
      e.preventDefault();
      
      const url = new URL(anchor.href, location.href);
      if (url.search !== location.search || url.pathname !== location.pathname) {
        history.pushState(null, "", url.href);
        route();
      }
    }
  });

  // Handle browser back/forward history navigation
  window.addEventListener("popstate", route);

  // Run initial route
  route();
})();
