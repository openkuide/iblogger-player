// Main Application router and entry point

import { initAdBanner, initAdSlider } from './ads.js';
import { startDirectMode, startMovieMode } from './movie.js';
import { startHomeMode } from './home.js';

(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const src = params.get("src");
  const pageParam = params.get("page");

  const playerView = document.getElementById("playerView");
  const homeView = document.getElementById("homeView");
  const legalView = document.getElementById("legalView");
  const aboutView = document.getElementById("aboutView");
  const contactView = document.getElementById("contactView");
  const termsView = document.getElementById("termsView");

  // Initialize ads
  initAdBanner();
  initAdSlider();

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
})();
