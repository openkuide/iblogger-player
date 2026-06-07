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
