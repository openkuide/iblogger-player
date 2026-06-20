// Main Application router and entry point

import { initAdBanner, initAdSlider } from './ads.js';
import { startDirectMode, startMovieMode, stopMovieMode } from './movie.js';
import { startHomeMode, stopHomeMode } from './home.js';
import { startShortsMode, stopShortsMode } from './shorts.js';
import { bindPlayerKeys, unbindPlayerKeys } from './player.js';
import { showToast, LANG, playRetroClickSound, playPopSound } from './utils.js';
import { initQuest, teardownQuest } from './quests.js';

(function () {
  const playerView = document.getElementById("playerView");
  const homeView = document.getElementById("homeView");
  const shortsView = document.getElementById("shortsView");
  const legalView = document.getElementById("legalView");
  const aboutView = document.getElementById("aboutView");
  const contactView = document.getElementById("contactView");
  const termsView = document.getElementById("termsView");



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

    const timeBtn = document.getElementById("copyLinkTimeBtn");
    if (!timeBtn) return;
    timeBtn.addEventListener("click", () => {
      let url = new URL(location.href);
      if (window.player) {
        const t = Math.floor(window.player.currentTime());
        if (t > 0) {
          url.searchParams.set("t", t);
        }
      }
      navigator.clipboard.writeText(url.toString())
        .then(() => {
          showToast(LANG === "km" ? "ចម្លងតំណភ្ជាប់ជាមួយពេលវេលាជោគជ័យ!" : "Link with time copied to clipboard!");
        })
        .catch(() => {
          showToast("Failed to copy link");
        });
    });
  }
  initCopyLink();

  const routes = [
    {
      match: (params) => params.get("page") === "legal",
      view: legalView,
      title: () => LANG === "km" ? "iblogger player · ឯកជនភាព និង DMCA" : "iblogger player · Privacy & DMCA",
      enter: () => {
        if (legalView) {
          const title = legalView.querySelector("h1");
          if (title) title.textContent = LANG === "km" ? "គោលការណ៍ឯកជនភាព និង ការបដិសេធ DMCA" : "Privacy Policy & DMCA Disclaimer";
        }
        initQuest("legal");
      },
      exit: () => teardownQuest()
    },
    {
      match: (params) => params.get("page") === "about",
      view: aboutView,
      title: () => LANG === "km" ? "iblogger player · អំពីយើង" : "iblogger player · About Us",
      enter: () => {
        if (aboutView) {
          const title = aboutView.querySelector("h1");
          if (title) title.textContent = LANG === "km" ? "អំពីយើង" : "About Us";
        }
        initQuest("about");
      },
      exit: () => teardownQuest()
    },
    {
      match: (params) => params.get("page") === "contact",
      view: contactView,
      title: () => LANG === "km" ? "iblogger player · ទាក់ទងមកយើង" : "iblogger player · Contact Us",
      enter: () => {
        if (contactView) {
          const title = contactView.querySelector("h1");
          if (title) title.textContent = LANG === "km" ? "ទាក់ទងមកយើង" : "Contact Us";
        }
        initQuest("contact");
      },
      exit: () => teardownQuest()
    },
    {
      match: (params) => params.get("page") === "terms",
      view: termsView,
      title: () => LANG === "km" ? "iblogger player · លក្ខខណ្ឌប្រើប្រាស់" : "iblogger player · Terms of Service",
      enter: () => {
        if (termsView) {
          const title = termsView.querySelector("h1");
          if (title) title.textContent = LANG === "km" ? "លក្ខខណ្ឌប្រើប្រាស់" : "Terms of Service";
        }
        initQuest("terms");
      },
      exit: () => teardownQuest()
    },
    {
      match: (params) => params.get("mode") === "shorts",
      view: shortsView,
      title: () => LANG === "km" ? "iblogger player · វីដេអូខ្លី" : "iblogger player · Shorts",
      enter: () => startShortsMode(),
      exit: () => stopShortsMode()
    },
    {
      match: (params) => params.has("id"),
      view: playerView,
      enter: (params) => {
        bindPlayerKeys();
        startMovieMode(params.get("id"), params.get("ep"));
      },
      exit: () => {
        unbindPlayerKeys();
        stopMovieMode();
      }
    },
    {
      match: (params) => params.has("src"),
      view: playerView,
      enter: (params) => {
        bindPlayerKeys();
        startDirectMode(params.get("src"), params.get("title"));
      },
      exit: () => unbindPlayerKeys()
    },
    {
      match: () => true, // default fallback
      view: homeView,
      title: () => LANG === "km" ? "iblogger player · រឿងទាំងអស់" : "iblogger player · Browse Movies",
      enter: () => startHomeMode(),
      exit: () => stopHomeMode()
    }
  ];

  let activeRoute = null;

  function route() {
    const params = new URLSearchParams(location.search);
    
    // Find matching route configuration
    const nextRoute = routes.find(r => r.match(params));
    if (!nextRoute) return;

    // 1. Exit active route and cleanup its resources
    if (activeRoute && typeof activeRoute.exit === "function") {
      try {
        activeRoute.exit();
      } catch (e) {
        console.warn("Error exiting route:", e);
      }
    }

    // 2. Hide all other views
    routes.forEach(r => {
      if (r.view && r.view !== nextRoute.view && r.view.style.display !== "none") {
        r.view.style.display = "none";
      }
    });

    // 3. Pause player if we are leaving the playerView
    if (activeRoute && activeRoute.view === playerView && nextRoute.view !== playerView) {
      if (window.player && typeof window.player.pause === 'function') {
        try {
          window.player.pause();
        } catch (e) {
          console.warn("Error pausing player:", e);
        }
      }
    }

    // 4. Clear common UI states like theater mode
    document.body.classList.remove("theater-mode");
    const theaterBtn = document.getElementById("theaterToggle");
    if (theaterBtn) theaterBtn.classList.remove("active");

    // 5. Show matching view
    if (nextRoute.view) {
      nextRoute.view.style.display = "block";
    }

    // 6. Set page title
    if (typeof nextRoute.title === "function") {
      document.title = nextRoute.title(params);
    } else {
      document.title = "iblogger player";
    }

    // 7. Enter next route
    if (typeof nextRoute.enter === "function") {
      try {
        nextRoute.enter(params);
      } catch (e) {
        console.warn("Error entering route:", e);
      }
    }

    activeRoute = nextRoute;

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
    const isBackBtn = anchor.classList.contains("back-btn") || anchor.classList.contains("clear-chip");

    if (isBackBtn) {
      e.preventDefault();
      playRetroClickSound();
      const params = new URLSearchParams(location.search);
      const lang = params.get("lang");
      location.href = lang ? `./?lang=${lang}` : `./`;
      return;
    }

    if (isLocal && !isExternal && !isLogo && !isShortsClose) {
      e.preventDefault();
      playRetroClickSound();
      
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

  // Handle click to copy email functionality
  document.addEventListener("click", e => {
    if (e.target.classList.contains("clickable-copy-email")) {
      const email = e.target.textContent;
      navigator.clipboard.writeText(email).then(() => {
        playPopSound();
        showToast(LANG === "km" ? "ចម្លងអ៊ីមែលជោគជ័យ!" : "Email copied to clipboard!");
      });
    }
  });

  // Initialize Disclaimer Overlay (Non-profit & Experimental notice)
  function initDisclaimer() {
    const overlay = document.getElementById("disclaimerOverlay");
    const acceptBtn = document.getElementById("acceptDisclaimerBtn");
    if (!overlay || !acceptBtn) return;

    const accepted = localStorage.getItem("iblogger_disclaimer_accepted") === "true";
    if (!accepted) {
      overlay.style.display = "flex";
      document.body.style.overflow = "hidden";
    }

    acceptBtn.addEventListener("click", () => {
      playPopSound();
      localStorage.setItem("iblogger_disclaimer_accepted", "true");
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.3s ease";
      setTimeout(() => {
        overlay.style.display = "none";
        document.body.style.overflow = "";
      }, 300);
    });
  }
  initDisclaimer();

  // Run initial route
  route();
})();
