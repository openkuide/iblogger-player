// Main Application router and entry point

import { initAdBanner, initAdSlider } from './ads.js';
import { startDirectMode, startMovieMode } from './movie.js';
import { startHomeMode } from './home.js';

(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const src = params.get("src");

  const playerView = document.getElementById("playerView");
  const homeView = document.getElementById("homeView");

  // Initialize ads
  initAdBanner();
  initAdSlider();

  // Route based on URL parameters
  if (id) {
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
