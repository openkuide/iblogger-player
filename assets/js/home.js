// Catalog / Home Vue 3 application

import { LANG } from './utils.js';

let homeApp = null;

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
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              watchHistory.value = parsed;
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to load watch history:", e);
        }
        watchHistory.value = [];
      }

      onMounted(() => {
        startSlideTimer();
        loadWatchHistory();
      });

      onUnmounted(() => {
        stopSlideTimer();
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
          range.push({ value: 1, label: "1" });
          if (start > 2) range.push({ value: null, label: "..." });
        }
        for (let i = start; i <= end; i++) {
          range.push({ value: i, label: String(i) });
        }
        if (end < pages.value) {
          if (end < pages.value - 1) range.push({ value: null, label: "..." });
          range.push({ value: pages.value, label: String(pages.value) });
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

      function gotoPage(p) {
        page.value = Math.max(1, Math.min(pages.value, p || 1));
        document.getElementById("homeApp").scrollIntoView({ behavior: "smooth", block: "start" });
      }

      return {
        all, loading, search, activeGenres, sort, yearFilter, minRating, countryFilter,
        page, listView, SORTS, YEARS, RATINGS, COUNTRIES,
        allGenres, allYears, filtered, pages, pageSlice, pagerItems, hasFilters,
        title, toggleGenre, clearAll, gotoPage,
        showFilters, activeFilterCount,
        currentSlide, watchHistory, currentQuickTag, featuredMovies,
        setSlide, toggleQuickTag
      };
    }
  });
  app.mount("#homeApp");
  homeApp = app;
}
