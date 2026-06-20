// Catalog / Home Vue 3 application

import { LANG, toKhmerNumerals, playPopSound, playSparkleSound, translateGenre } from './utils.js';
import { getResumePosition } from './watch-progress.js';

let homeApp = null;

export function stopHomeMode() {
  if (homeApp) {
    try {
      homeApp.unmount();
    } catch (e) {
      console.warn("Unmount warning:", e);
    }
    homeApp = null;
  }
}

export function startHomeMode() {
  document.title = "iblogger player · រឿងទាំងអស់";
  if (homeApp) {
    try {
      homeApp.unmount();
    } catch (e) {
      console.warn("Unmount warning:", e);
    }
  }
  const LANG_HOME = LANG;
  const PER_PAGE = 24;

  const SORTS = [
    { value: "title",    label: "ឈ្មោះ A-Z" },
    { value: "year",     label: "ឆ្នាំថ្មី" },
    { value: "rating",   label: "Rating ↓" },
    { value: "episodes", label: "ភាគច្រើន" },
  ];
  const YEARS = [
    { value: "",      label: "គ្រប់ឆ្នាំ" },
    { value: "2020+", label: "2020+" },
    { value: "2010",  label: "2010–2019" },
    { value: "old",   label: "មុន 2010" },
  ];
  const RATINGS = [
    { value: 0, label: "ទាំងអស់" },
    { value: 7, label: "★ 7+" },
    { value: 8, label: "★ 8+" },
  ];

  const COUNTRIES = [
    { value: "", label: "ទាំងអស់" },
    { value: "Hong Kong", label: "ហុងកុង" },
    { value: "China", label: "ចិន" },
    { value: "Korea", label: "កូរ៉េ" },
    { value: "Other", label: "ផ្សេងៗ" }
  ];

  const params = new URLSearchParams(location.search);
  const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

  const app = createApp({
    setup() {
      const all           = ref([]);
      const loading       = ref(true);
      const search        = ref("");
      const activeGenres  = ref([]);
      const sort          = ref("title");
      const yearFilter    = ref(params.get("year") || "");
      const minRating     = ref(0);
      const countryFilter = ref("");
      const page          = ref(1);
      const listView      = ref(false);
      const showFilters   = ref(!!params.get("year"));

      // Carousel, history, and quick tags state
      const currentSlide     = ref(0);
      const watchHistory     = ref([]);
      const currentQuickTag  = ref("");

      // Psychology-driven idle nudges state
      const nudgeSurprise    = ref(false);
      const nudgeTrending    = ref(false);
      const nudgeSearch      = ref(false);
      const nudgedCardSlug   = ref("");
      const isHoveringCard   = ref(false);

      // Psychology-driven search suggestion state
      const searchFocused   = ref(false);
      const recentSearches  = ref([]);
      const trendingSuggestions = ref(
        LANG_HOME === "km"
          ? ["វាយប្រហារ", "កំប្លែង", "ភ័យរន្ធត់", "ស្នេហា", "គំនូរជីវចល"]
          : ["Action", "Comedy", "Horror", "Romance", "Animation"]
      );

      const MOODS = ref([
        {
          icon: "🍿",
          label: { en: "Sweet & Chill", km: "ស្នេហា និង កំប្លែង" },
          genres: ["ROMANCE", "COMEDY"]
        },
        {
          icon: "⚔️",
          label: { en: "Epic & Martial", km: "វាយប្រហារ និង មហិទ្ធិឫទ្ធិ" },
          genres: ["ACTION", "FANTASY"]
        },
        {
          icon: "😱",
          label: { en: "Dark & Thrilling", km: "ភ័យរន្ធត់ និង រន្ធត់" },
          genres: ["HORROR", "THRILLER"]
        },
        {
          icon: "📜",
          label: { en: "Nostalgic Retro", km: "រឿងបុរាណ" },
          isClassic: true
        }
      ]);

      const searchPlaceholder = ref(LANG_HOME === "km" ? "ស្វែងរករឿង…" : "Search movies...");
      const placeholdersKM = [
        "ស្វែងរករឿង...",
        "សាកល្បងស្វែងរក 'វាយប្រហារ'...",
        "ស្វែងរក 'Against the Blade'...",
        "ស្វែងរក 'Happy Ghost'...",
        "សាកល្បងស្វែងរក 'កំប្លែង'..."
      ];
      const placeholdersEN = [
        "Search movies...",
        "Try searching 'Action'...",
        "Search 'Against the Blade'...",
        "Search 'Happy Ghost'...",
        "Try searching 'Comedy'..."
      ];

      let placeholderTimer = null;
      let placeholderIdx = 0;

      function startPlaceholderCycle() {
        placeholderTimer = setInterval(() => {
          placeholderIdx = (placeholderIdx + 1) % placeholdersKM.length;
          searchPlaceholder.value = LANG_HOME === "km" ? placeholdersKM[placeholderIdx] : placeholdersEN[placeholderIdx];
        }, 5000);
      }

      function loadRecentSearches() {
        try {
          const stored = localStorage.getItem("iblogger_recent_searches");
          if (stored) {
            recentSearches.value = JSON.parse(stored);
          }
        } catch (e) {
          console.warn("Failed to load recent searches:", e);
        }
      }

      function saveSearchQuery(query) {
        const q = query ? query.trim() : "";
        if (!q) return;
        let list = [...recentSearches.value];
        list = list.filter(item => item !== q);
        list.unshift(q);
        if (list.length > 5) list = list.slice(0, 5);
        recentSearches.value = list;
        localStorage.setItem("iblogger_recent_searches", JSON.stringify(list));
      }

      function deleteRecentSearch(query) {
        let list = recentSearches.value.filter(item => item !== query);
        recentSearches.value = list;
        localStorage.setItem("iblogger_recent_searches", JSON.stringify(list));
        playPopSound();
      }

      function clearRecentSearches() {
        recentSearches.value = [];
        localStorage.removeItem("iblogger_recent_searches");
        playPopSound();
      }

      function selectSearchSuggestion(query) {
        search.value = query;
        saveSearchQuery(query);
        searchFocused.value = false;
        const searchEl = document.getElementById("searchInput");
        if (searchEl) searchEl.blur();
        playPopSound();
      }

      function selectMood(mood) {
        clearAll();
        if (mood.isClassic) {
          yearFilter.value = "old";
          sort.value = "title";
          currentQuickTag.value = "classic";
        } else if (mood.genres) {
          activeGenres.value = [...mood.genres];
          sort.value = "rating";
        }
        searchFocused.value = false;
        const searchEl = document.getElementById("searchInput");
        if (searchEl) searchEl.blur();
        playSparkleSound();
      }


      const featuredMovies = computed(() => {
        if (!all.value || !Array.isArray(all.value)) return [];
        return all.value
          .filter(m => m && m.rating >= 7.8 && m.poster)
          .slice()
          .sort((a, b) => (b.year || 0) - (a.year || 0) || (b.rating || 0) - (a.rating || 0))
          .slice(0, 5);
      });

      let slideTimer = null;
      function startSlideTimer() {
        stopSlideTimer();
        slideTimer = setInterval(() => {
          if (featuredMovies.value.length > 0) {
            currentSlide.value = (currentSlide.value + 1) % featuredMovies.value.length;
          }
        }, 6000);
      }
      function stopSlideTimer() {
        if (slideTimer) {
          clearInterval(slideTimer);
          slideTimer = null;
        }
      }
      function setSlide(idx) {
        currentSlide.value = idx;
        startSlideTimer();
      }

      function loadWatchHistory() {
        try {
          const stored = localStorage.getItem("iblogger_watch_history");
          const progressAll = (() => {
            try { return JSON.parse(localStorage.getItem('iblogger_watch_progress')) || {}; } catch { return {}; }
          })();
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              // Zeigarnik Effect: calculate progress percentage based on all watched episodes + total count
              watchHistory.value = parsed.map(item => {
                const catalogItem = all.value.find(m => m.slug === item.slug);
                const entry = progressAll[item.slug];
                let progress = 0;
                let watchedCount = 0;
                let totalEpisodes = catalogItem ? catalogItem.episodeCount : 1;
                
                if (entry) {
                  if (Array.isArray(entry.watched)) {
                    watchedCount = entry.watched.length;
                  }
                  
                  if (totalEpisodes > 0) {
                    let currentEpProgress = 0;
                    if (entry.positions && item.lastEpisode) {
                      const pos = entry.positions[String(item.lastEpisode)];
                      if (pos && pos > 30) {
                        currentEpProgress = 0.5;
                      }
                    }
                    progress = Math.round(((watchedCount + currentEpProgress) / totalEpisodes) * 100);
                  }
                }
                
                return {
                  ...item,
                  progress: Math.min(progress || (entry && entry.positions && entry.positions[String(item.lastEpisode)] ? 35 : 0), 100),
                  watchedCount,
                  totalEpisodes
                };
              });
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to load watch history:", e);
        }
        watchHistory.value = [];
      }

      function deleteHistoryItem(slug) {
        try {
          const stored = localStorage.getItem("iblogger_watch_history");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(item => item.slug !== slug);
              localStorage.setItem("iblogger_watch_history", JSON.stringify(filtered));
              playPopSound();
              loadWatchHistory();
            }
          }
        } catch (e) {
          console.warn("Failed to delete history item:", e);
        }
      }

      function onKeyDown(e) {
        const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';

        const isSearchHotkey = 
          (e.key === '/' && !isTyping) ||
          ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey));

        if (isSearchHotkey) {
          e.preventDefault();
          const searchEl = document.getElementById('searchInput');
          if (searchEl) { searchEl.focus(); searchEl.select(); }
        } else if (e.key === 'Escape' && document.activeElement.id === 'searchInput') {
          document.activeElement.blur();
          search.value = '';
        } else if (!isTyping && featuredMovies.value.length > 0) {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setSlide((currentSlide.value + 1) % featuredMovies.value.length);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setSlide((currentSlide.value - 1 + featuredMovies.value.length) % featuredMovies.value.length);
          }
        }
      }

      // Idle Nudge Timer Logic (Hick's Law / Attention Restorff Effect)
      let idleTimeout1 = null;
      let idleTimeout2 = null;
      let idleTimeout3 = null;
      let scrollStopTimer = null;
      let cardHoverTimer = null;

      function clearIdleTimeouts() {
        if (idleTimeout1) { clearTimeout(idleTimeout1); idleTimeout1 = null; }
        if (idleTimeout2) { clearTimeout(idleTimeout2); idleTimeout2 = null; }
        if (idleTimeout3) { clearTimeout(idleTimeout3); idleTimeout3 = null; }
      }

      function resetIdleTimer() {
        nudgeSurprise.value = false;
        nudgeTrending.value = false;
        nudgeSearch.value = false;
        nudgedCardSlug.value = "";
        clearIdleTimeouts();

        const searchInput = document.querySelector(".search input");
        if (searchInput && document.activeElement === searchInput) {
          return;
        }

        // 6s idle -> Nudge Surprise Me button
        idleTimeout1 = setTimeout(() => {
          const activeSearch = document.querySelector(".search input");
          if (activeSearch && document.activeElement === activeSearch) return;
          if (isHoveringCard.value) return;
          nudgeSurprise.value = true;
          
          // 12s idle -> Nudge Trending quick tag
          idleTimeout2 = setTimeout(() => {
            const activeSearch2 = document.querySelector(".search input");
            if (activeSearch2 && document.activeElement === activeSearch2) return;
            if (isHoveringCard.value) return;
            nudgeSurprise.value = false;
            nudgeTrending.value = true;
            
            // 18s idle -> Highlight Search input container
            idleTimeout3 = setTimeout(() => {
              const activeSearch3 = document.querySelector(".search input");
              if (activeSearch3 && document.activeElement === activeSearch3) return;
              if (isHoveringCard.value) return;
              nudgeTrending.value = false;
              nudgeSearch.value = true;
            }, 6000);
          }, 6000);
        }, 6000);
      }

      function onCardMouseEnter(slug) {
        isHoveringCard.value = true;
        nudgedCardSlug.value = "";
        if (cardHoverTimer) clearTimeout(cardHoverTimer);
        cardHoverTimer = setTimeout(() => {
          nudgedCardSlug.value = slug;
        }, 1500);
      }

      function onCardMouseLeave(slug) {
        isHoveringCard.value = false;
        if (cardHoverTimer) {
          clearTimeout(cardHoverTimer);
          cardHoverTimer = null;
        }
        if (nudgedCardSlug.value === slug) {
          nudgedCardSlug.value = "";
        }
      }

      function onScroll() {
        const scrollBar = document.getElementById("scrollProgress");
        if (scrollBar) {
          const winScroll = window.scrollY || document.documentElement.scrollTop;
          const height = document.documentElement.scrollHeight - window.innerHeight;
          const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
          scrollBar.style.width = scrolled + "%";
        }

        // Trigger scroll-stop nudge
        if (scrollStopTimer) clearTimeout(scrollStopTimer);
        nudgedCardSlug.value = "";
        
        scrollStopTimer = setTimeout(() => {
          const cards = document.querySelectorAll(".home-card");
          if (cards.length === 0) return;
          
          const centerY = window.innerHeight / 2;
          let closestCard = null;
          let minDistance = Infinity;
          
          cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cardCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(centerY - cardCenterY);
            if (distance < minDistance) {
              minDistance = distance;
              closestCard = card;
            }
          });
          
          if (closestCard) {
            const slug = closestCard.dataset.slug;
            if (slug) {
              nudgedCardSlug.value = slug;
            }
          }
        }, 2000);
      }

      onMounted(() => {
        const scrollProgress = document.getElementById("scrollProgress");
        if (scrollProgress) {
          scrollProgress.style.display = "block";
        }
        startSlideTimer();
        loadWatchHistory();
        loadRecentSearches();
        startPlaceholderCycle();
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', onScroll);
        
        // Register idle tracking events
        window.addEventListener('mousemove', resetIdleTimer);
        window.addEventListener('mousedown', resetIdleTimer);
        window.addEventListener('keydown', resetIdleTimer);
        window.addEventListener('scroll', resetIdleTimer);
        window.addEventListener('touchstart', resetIdleTimer);
        
        onScroll();
        resetIdleTimer();
      });

      onUnmounted(() => {
        stopSlideTimer();
        if (placeholderTimer) {
          clearInterval(placeholderTimer);
          placeholderTimer = null;
        }
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('scroll', onScroll);
        
        // Remove idle tracking events
        window.removeEventListener('mousemove', resetIdleTimer);
        window.removeEventListener('mousedown', resetIdleTimer);
        window.removeEventListener('keydown', resetIdleTimer);
        window.removeEventListener('scroll', resetIdleTimer);
        window.removeEventListener('touchstart', resetIdleTimer);
        clearIdleTimeouts();
        
        if (scrollStopTimer) {
          clearTimeout(scrollStopTimer);
          scrollStopTimer = null;
        }
        if (cardHoverTimer) {
          clearTimeout(cardHoverTimer);
          cardHoverTimer = null;
        }
        
        const scrollProgress = document.getElementById("scrollProgress");
        if (scrollProgress) {
          scrollProgress.style.width = "0%";
          scrollProgress.style.display = "none";
        }
      });

      fetch("db/index.json")
        .then(r => {
          if (!r.ok) throw new Error("no index");
          return r.json();
        })
        .then(data => {
          all.value = data;
          loading.value = false;
        })
        .catch(() => {
          loading.value = false;
        });

      function title(m) {
        return (m.title && (m.title[LANG_HOME] || m.title.en || m.title.km)) || "";
      }

      const allGenres = computed(() => {
        if (!all.value || !Array.isArray(all.value)) return [];
        const counts = {};
        all.value.forEach(m => {
          if (m && m.genres) {
            (m.genres || []).forEach(g => {
              counts[g] = (counts[g] || 0) + 1;
            });
          }
        });
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      });

      const allYears = computed(() => {
        if (!all.value || !Array.isArray(all.value)) return [];
        const years = new Set();
        all.value.forEach(m => {
          if (m && m.year) years.add(m.year);
        });
        return Array.from(years).sort((a, b) => b - a);
      });

      const filtered = computed(() => {
        if (!all.value || !Array.isArray(all.value)) return [];
        const q = search.value.trim().toLowerCase();
        let list = all.value.filter(m => {
          if (!m) return false;
          if (activeGenres.value.length > 0) {
            const mg = m.genres || [];
            if (!activeGenres.value.every(g => mg.includes(g))) return false;
          }
          if (q) {
            const hay = (((m.title && m.title.km) || "") + " " + ((m.title && m.title.en) || "")).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
          }
          if (yearFilter.value) {
            if (yearFilter.value === "2020+") {
              if ((m.year || 0) < 2020) return false;
            } else if (yearFilter.value === "2010") {
              if ((m.year || 0) < 2010 || (m.year || 0) >= 2020) return false;
            } else if (yearFilter.value === "old") {
              if ((m.year || 0) >= 2010) return false;
            } else {
              if (String(m.year) !== yearFilter.value) return false;
            }
          }
          if (minRating.value > 0 && (m.rating || 0) < minRating.value) return false;
          if (countryFilter.value && m.country !== countryFilter.value) return false;
          return true;
        });
        list = list.slice().sort((a, b) => {
          if (sort.value === "year")     return (b.year || 0) - (a.year || 0);
          if (sort.value === "rating")   return (b.rating || 0) - (a.rating || 0);
          if (sort.value === "episodes") return (b.episodeCount || 0) - (a.episodeCount || 0);
          return title(a).localeCompare(title(b));
        });
        return list;
      });

      watch([search, activeGenres, sort, yearFilter, minRating, countryFilter], () => {
        page.value = 1;
      });

      const pages = computed(() => {
        return Math.max(1, Math.ceil(filtered.value.length / PER_PAGE));
      });
      
      const pageSlice = computed(() => {
        const start = (page.value - 1) * PER_PAGE;
        return filtered.value.slice(start, start + PER_PAGE);
      });

      const pagerItems = computed(() => {
        const range = [];
        const maxVisible = 5;
        let start = Math.max(1, page.value - 2);
        let end = Math.min(pages.value, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
          start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
          range.push({ value: 1, label: LANG_HOME === "km" ? toKhmerNumerals(1) : "1" });
          if (start > 2) range.push({ value: null, label: "..." });
        }
        for (let i = start; i <= end; i++) {
          range.push({ value: i, label: LANG_HOME === "km" ? toKhmerNumerals(i) : String(i) });
        }
        if (end < pages.value) {
          if (end < pages.value - 1) range.push({ value: null, label: "..." });
          range.push({ value: pages.value, label: LANG_HOME === "km" ? toKhmerNumerals(pages.value) : String(pages.value) });
        }
        return range;
      });

      const hasFilters = computed(() => {
        return activeGenres.value.length > 0 || search.value || yearFilter.value || minRating.value > 0 || countryFilter.value;
      });

      const activeFilterCount = computed(() => {
        let count = 0;
        if (search.value.trim()) count++;
        if (yearFilter.value) count++;
        if (minRating.value > 0) count++;
        if (countryFilter.value) count++;
        count += activeGenres.value.length;
        return count;
      });

      function toggleGenre(g) {
        const i = activeGenres.value.indexOf(g);
        if (i >= 0) activeGenres.value.splice(i, 1);
        else activeGenres.value.push(g);
      }

      function clearAll() {
        search.value        = "";
        activeGenres.value  = [];
        yearFilter.value    = "";
        minRating.value     = 0;
        countryFilter.value = "";
        sort.value          = "title";
        currentQuickTag.value = "";
      }

      function toggleQuickTag(tag) {
        if (currentQuickTag.value === tag) {
          currentQuickTag.value = "";
          clearAll();
        } else {
          clearAll();
          currentQuickTag.value = tag;
          if (tag === "trending") {
            sort.value = "rating";
            minRating.value = 7.5;
          } else if (tag === "latest") {
            yearFilter.value = "2020+";
            sort.value = "year";
          } else if (tag === "classic") {
            yearFilter.value = "old";
            sort.value = "title";
          } else if (tag === "top") {
            minRating.value = 8;
            sort.value = "rating";
          }
        }
      }

      function getMovieProgress(slug) {
        if (!watchHistory.value || watchHistory.value.length === 0) return null;
        return watchHistory.value.find(item => item.slug === slug) || null;
      }

      function getMovieProgressText(m) {
        const prog = getMovieProgress(m.slug);
        if (!prog) return "";
        const watched = prog.watchedCount || 0;
        const total = prog.totalEpisodes || m.episodeCount || 1;
        if (total === 1) {
          return LANG_HOME === "km" ? "បានមើល" : "Watched";
        }
        const watchedText = LANG_HOME === "km" ? toKhmerNumerals(watched) : watched;
        const totalText = LANG_HOME === "km" ? toKhmerNumerals(total) : total;
        return `${watchedText}/${totalText} ${LANG_HOME === "km" ? "ភាគ" : "eps"}`;
      }

      function gotoPage(p) {
        page.value = Math.max(1, Math.min(pages.value, p || 1));
        document.getElementById("homeApp").scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function surpriseMe() {
        if (!all.value || all.value.length === 0) return;
        const candidates = all.value.filter(m => m.rating >= 7.0);
        const list = candidates.length > 0 ? candidates : all.value;
        const randomMovie = list[Math.floor(Math.random() * list.length)];
        if (randomMovie && randomMovie.slug) {
          playPopSound();
          location.href = `?id=${encodeURIComponent(randomMovie.slug)}`;
        }
      }

      return {
        all, loading, search, activeGenres, sort, yearFilter, minRating, countryFilter,
        page, listView, SORTS, YEARS, RATINGS, COUNTRIES,
        allGenres, allYears, filtered, pages, pageSlice, pagerItems, hasFilters,
        title, toggleGenre, clearAll, gotoPage, surpriseMe,
        showFilters, activeFilterCount,
        nudgeSurprise, nudgeTrending, nudgeSearch,
        nudgedCardSlug, onCardMouseEnter, onCardMouseLeave,
        currentSlide, watchHistory, currentQuickTag, featuredMovies,
        setSlide, toggleQuickTag,
        deleteHistoryItem,
        translateGenre,
        getMovieProgress,
        getMovieProgressText,
        toKhmerNumerals, lang: LANG_HOME,
        searchFocused, recentSearches, trendingSuggestions, MOODS,
        searchPlaceholder, saveSearchQuery, deleteRecentSearch,
        clearRecentSearches, selectSearchSuggestion, selectMood
      };
    }
  });
  app.mount("#homeApp");
  homeApp = app;
}
