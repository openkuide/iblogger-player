// Main Application router and entry point

import { initAdBanner, initAdSlider } from './ads.js';
import { startDirectMode, startMovieMode } from './movie.js';
import { startHomeMode } from './home.js';
import { startShortsMode } from './shorts.js';
import { showToast, LANG } from './utils.js';

(function () {
  const playerView = document.getElementById("playerView");
  const homeView = document.getElementById("homeView");
  const shortsView = document.getElementById("shortsView");
  const legalView = document.getElementById("legalView");
  const aboutView = document.getElementById("aboutView");
  const contactView = document.getElementById("contactView");
  const termsView = document.getElementById("termsView");

  const views = [playerView, homeView, shortsView, legalView, aboutView, contactView, termsView];

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

    // Set language classes on body for CSS language block visibility
    document.body.classList.toggle("lang-en", currentLang === "en");
    document.body.classList.toggle("lang-km", currentLang === "km");

    // Update logo link to preserve lang
    const logoLink = document.querySelector(".logo");
    if (logoLink) {
      logoLink.href = currentLang === "en" ? "./?lang=en" : "./";
    }

    // Translate footer content dynamically
    const footer = document.querySelector("footer");
    if (footer) {
      if (currentLang === "km") {
        footer.innerHTML = `
          បង្កើតឡើងដោយ <a href="https://videojs.com" target="_blank" rel="noopener">Video.js</a> ·
          <a href="?page=about" id="aboutLink">អំពីយើង</a> ·
          <a href="?page=contact" id="contactLink">ទាក់ទងមកយើង</a> ·
          <a href="?page=terms" id="termsLink">លក្ខខណ្ឌប្រើប្រាស់</a> ·
          <a href="?page=legal" id="legalLink">ឯកជនភាព និង DMCA</a>
        `;
      } else {
        footer.innerHTML = `
          Built with <a href="https://videojs.com" target="_blank" rel="noopener">Video.js</a> ·
          <a href="?page=about" id="aboutLink">About Us</a> ·
          <a href="?page=contact" id="contactLink">Contact Us</a> ·
          <a href="?page=terms" id="termsLink">Terms of Service</a> ·
          <a href="?page=legal" id="legalLink">Privacy & DMCA</a>
        `;
      }
    }
  }
  initLanguageToggle();

  // Initialize Theater Mode toggling
  function initTheaterMode() {
    const btn = document.getElementById("theaterToggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      document.body.classList.toggle("theater-mode");
      btn.classList.toggle("active");
    });
  }
  initTheaterMode();

  // Initialize Copy Link action
  function initCopyLink() {
    const btn = document.getElementById("copyLinkBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(location.href)
        .then(() => {
          showToast(LANG === "km" ? "ចម្លងតំណភ្ជាប់ជោគជ័យ! (Link copied!)" : "Link copied to clipboard!");
        })
        .catch(() => {
          showToast("Failed to copy link");
        });
    });
  }
  initCopyLink();

  function route() {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const src = params.get("src");
    const pageParam = params.get("page");
    const modeParam = params.get("mode");

    // Hide all views first
    views.forEach(v => {
      if (v) v.style.display = "none";
    });

    // Clear theater mode on route switch
    document.body.classList.remove("theater-mode");
    const theaterBtn = document.getElementById("theaterToggle");
    if (theaterBtn) theaterBtn.classList.remove("active");

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
      if (legalView) {
        legalView.style.display = "block";
        const title = legalView.querySelector("h1");
        if (title) title.textContent = LANG === "km" ? "គោលការណ៍ឯកជនភាព និង ការបដិសេធ DMCA" : "Privacy Policy & DMCA Disclaimer";
      }
      document.title = LANG === "km" ? "iblogger player · ឯកជនភាព និង DMCA" : "iblogger player · Privacy & DMCA";
    } else if (pageParam === "about") {
      if (aboutView) {
        aboutView.style.display = "block";
        const title = aboutView.querySelector("h1");
        if (title) title.textContent = LANG === "km" ? "អំពីយើង" : "About Us";
      }
      document.title = LANG === "km" ? "iblogger player · អំពីយើង" : "iblogger player · About Us";
    } else if (pageParam === "contact") {
      if (contactView) {
        contactView.style.display = "block";
        const title = contactView.querySelector("h1");
        if (title) title.textContent = LANG === "km" ? "ទាក់ទងមកយើង" : "Contact Us";
      }
      document.title = LANG === "km" ? "iblogger player · ទាក់ទងមកយើង" : "iblogger player · Contact Us";
    } else if (pageParam === "terms") {
      if (termsView) {
        termsView.style.display = "block";
        const title = termsView.querySelector("h1");
        if (title) title.textContent = LANG === "km" ? "លក្ខខណ្ឌប្រើប្រាស់" : "Terms of Service";
      }
      document.title = LANG === "km" ? "iblogger player · លក្ខខណ្ឌប្រើប្រាស់" : "iblogger player · Terms of Service";
    } else if (id) {
      if (playerView) playerView.style.display = "block";
      startMovieMode(id, params.get("ep"));
    } else if (src) {
      if (playerView) playerView.style.display = "block";
      startDirectMode(src, params.get("title"));
    } else if (modeParam === "shorts") {
      if (shortsView) shortsView.style.display = "block";
      startShortsMode();
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
    const isShortsClose = anchor.id === "closeShortsBtn";

    if (isLocal && !isExternal && !isLogo && !isShortsClose) {
      e.preventDefault();
      
      const url = new URL(anchor.href, location.href);
      
      // Preserve language state in search parameters
      const params = new URLSearchParams(location.search);
      const lang = params.get("lang");
      if (lang) {
        url.searchParams.set("lang", lang);
      } else {
        url.searchParams.delete("lang");
      }

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
