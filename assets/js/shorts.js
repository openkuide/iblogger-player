import { LANG, showToast, playPopSound, translateGenre, triggerOsd, toKhmerNumerals, playSparkleSound } from './utils.js';

let shortsScrollHandler = null;
let shortsIdleTimer = null;
let activeShortWrapper = null;
let shortsWheelHandler = null;

const movieDetailsCache = new Map();
const playerInitPromises = new Map();

// Psychology & Philosophy: Unified State coordinator for better encapsulation and lifecycle clarity
const ShortsState = {
  db: [],
  players: new Map(),
  recentSlugs: [],
  activeSlugForComments: null,
  soundOn: localStorage.getItem('shorts_sound') === 'on',
  soundHintShown: false,
  prefs: JSON.parse(localStorage.getItem('shorts_prefs') || '{}'),
  observer: null,
  watchStreak: 0,

  savePrefs() {
    localStorage.setItem('shorts_prefs', JSON.stringify(this.prefs));
  },

  recordViewedSlug(slug) {
    if (this.recentSlugs.includes(slug)) {
      const idx = this.recentSlugs.indexOf(slug);
      this.recentSlugs.splice(idx, 1);
    }
    this.recentSlugs.push(slug);
    if (this.recentSlugs.length > 5) {
      this.recentSlugs.shift();
    }
  },

  boostGenres(genres, weight = 1) {
    if (!genres) return;
    genres.forEach(g => {
      this.prefs[g] = (this.prefs[g] || 0) + weight;
    });
    
    // Logarithmic dampener & decay (Aristotle's Golden Mean / Filter Bubble Dissolution)
    let maxPref = 0;
    for (let key in this.prefs) {
      if (this.prefs[key] > maxPref) maxPref = this.prefs[key];
    }
    if (maxPref > 80) {
      for (let key in this.prefs) {
        this.prefs[key] = Math.max(0, Math.floor(this.prefs[key] * 0.7));
      }
    }
    this.savePrefs();
  },

  scoreMovie(movie) {
    if (!movie.genres) return 0;
    
    // 1. Genre Preferences (Exploitation)
    const baseScore = movie.genres.reduce((sum, g) => sum + (this.prefs[g] || 0), 0);
    
    // 2. Repetition Penalty (Fatigue Avoidance / Comfort Balance)
    const recencyPenalty = this.recentSlugs.includes(movie.slug) ? -1000 : 0;
    
    // 3. Serendipity Factor (Exploration)
    const randomFactor = Math.random() * 2; // RANDOM_DISCOVERY_WEIGHT = 2
    
    return baseScore + recencyPenalty + randomFactor;
  },

  setSoundEnabled(isOn, triggerHud = true) {
    this.soundOn = isOn;
    localStorage.setItem('shorts_sound', isOn ? 'on' : 'off');
    this.players.forEach(player => player.muted(!isOn));
    refreshSoundButtons();
    if (isOn) {
      document.querySelectorAll('.sound-btn').forEach(btn => btn.classList.remove('pulsing'));
    }
    if (triggerHud) {
      showCentralSoundHud(isOn);
    }
  }
};

const STOIC_QUOTES = [
  {
    km: "សេចក្តីស្ងប់កើតចេញពីខាងក្នុង កុំស្វែងរកវាពីខាងក្រៅឡើយ។",
    en: "Tranquility comes from within, do not seek it outside.",
    author: "Marcus Aurelius"
  },
  {
    km: "យើងរងទុក្ខដោយសារការគិតរបស់យើង ច្រើនជាងការពិត។",
    en: "We suffer more often in imagination than in reality.",
    author: "Seneca"
  },
  {
    km: "ឧបសគ្គគឺជាផ្លូវ។ អ្វីដែលរារាំងសកម្មភាព ជំរុញឱ្យមានសកម្មភាព។",
    en: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius"
  },
  {
    km: "ជីវិតមិនមែនជាការស្វែងរកខ្លួនឯងទេ គឺបង្កើតខ្លួនឯងឡើង។",
    en: "Life isn't about finding yourself. Life is about creating yourself.",
    author: "George Bernard Shaw"
  },
  {
    km: "កុំប្រាថ្នាឱ្យរឿងរ៉ាវកើតឡើងតាមចិត្តចង់ ត្រូវទទួលយកអ្វីដែលកើតឡើង។",
    en: "Do not seek for things to happen the way you want them to; rather, wish that what happens happens the way it happens.",
    author: "Epictetus"
  },
  {
    km: "ពេលវេលាដែលអ្នករីករាយក្នុងការខ្ជះខ្ជាយ មិនមែនជាពេលវេលាខ្ជះខ្ជាយឡើយ។",
    en: "The time you enjoy wasting is not wasted time.",
    author: "Bertrand Russell"
  }
];

// Aesthetics & Maintenance: Separation of Concerns markup templates namespace
const Templates = {
  SOUND_ON_ICON: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
  SOUND_OFF_ICON: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',

  getSoundUi() {
    return ShortsState.soundOn
      ? { icon: this.SOUND_ON_ICON, label: 'Sound', toggleAction: 'Mute' }
      : { icon: this.SOUND_OFF_ICON, label: 'Muted', toggleAction: 'Unmute' };
  },

  generateProgressBarHtml() {
    return `
      <div class="short-progress-container">
        <div class="short-scrub-tooltip">00:00</div>
        <div class="short-progress-bar">
          <div class="short-progress-filled"></div>
        </div>
      </div>
    `;
  },

  generateInfoContainerHtml(movie, title) {
    const genres = (movie.genres || []).map(translateGenre).join(' · ');
    const watchLabel = LANG === 'km' ? 'មើលរឿងពេញ' : 'Watch Full Movie';
    const tooltipText = LANG === 'km' ? 'ស្វែងយល់សាច់រឿងពេញលេញ... 🔍' : 'Unlock the full mystery... 🔍';
    return `
      <div class="short-info-container">
        <div class="short-author">@iblogger</div>
        <a class="short-title watch-link" href="?id=${movie.slug}">${title}</a>
        <div class="short-tags">${genres}</div>
        <div class="short-watch-container">
          <a class="short-watch-btn watch-link" href="?id=${movie.slug}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            ${watchLabel}
          </a>
          <div class="short-curiosity-tooltip">
            ${tooltipText}
          </div>
        </div>
        <div class="short-reactions-bar">
          <button class="short-reaction-btn-emoji" data-emoji="❤️" aria-label="${LANG === 'km' ? 'ប្រតិកម្មចូលចិត្ត' : 'Reaction Heart'}">❤️</button>
          <button class="short-reaction-btn-emoji" data-emoji="😂" aria-label="${LANG === 'km' ? 'ប្រតិកម្មសើច' : 'Reaction Laugh'}">😂</button>
          <button class="short-reaction-btn-emoji" data-emoji="😮" aria-label="${LANG === 'km' ? 'ប្រតិកម្មភ្ញាក់ផ្អើល' : 'Reaction Wow'}">😮</button>
          <button class="short-reaction-btn-emoji" data-emoji="😢" aria-label="${LANG === 'km' ? 'ប្រតិកម្មសោក' : 'Reaction Sad'}">😢</button>
        </div>
        <div class="short-audio-track">
          <svg class="short-audio-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          <div style="overflow:hidden; flex:1;">
            <div class="short-audio-marquee">${LANG === 'km' ? 'សំឡេងដើម - iblogger' : 'Original Sound - iblogger'}</div>
          </div>
        </div>
      </div>
    `;
  },

  generateActionsContainerHtml(movie) {
    const stats = getMockStats(movie.slug);
    const soundUi = this.getSoundUi();
    return `
      <div class="short-actions-container">
        <div class="short-action-item">
          <button class="short-action-btn" style="background:transparent; border:2px solid #fff; padding:0; overflow:hidden;">
            <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>" style="width:100%;height:100%;object-fit:cover;background:#333;" alt="profile"/>
          </button>
        </div>
        <div class="short-action-item">
          <button class="short-action-btn like-btn" aria-label="${LANG === 'km' ? 'ចូលចិត្ត' : 'Like'}" title="${LANG === 'km' ? 'ចូលចិត្ត' : 'Like'}">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          <span class="short-action-label like-count">${formatStat(stats.likes)}</span>
        </div>
        <div class="short-action-item">
          <button class="short-action-btn comment-btn" aria-label="${LANG === 'km' ? 'មតិយោបល់' : 'Comment'}">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </button>
          <span class="short-action-label">${formatStat(stats.comments)}</span>
        </div>
        <div class="short-action-item">
          <button class="short-action-btn share-btn" aria-label="${LANG === 'km' ? 'ចែករំលែក' : 'Share'}">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
          <span class="short-action-label">${formatStat(stats.shares)}</span>
        </div>
        <div class="short-action-item">
          <button class="short-action-btn sound-btn" aria-label="${soundUi.toggleAction}">
            ${soundUi.icon}
          </button>
          <span class="short-action-label sound-label">${soundUi.label}</span>
        </div>
        <div class="short-action-item">
          <button class="short-action-btn keyboard-btn" aria-label="${LANG === 'km' ? 'ផ្លូវកាត់ក្តារចុច' : 'Keyboard Shortcuts'}" title="${LANG === 'km' ? 'ផ្លូវកាត់ក្តារចុច' : 'Keyboard Shortcuts'}">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>
          </button>
          <span class="short-action-label lang-km-block">គ្រាប់ចុច</span>
          <span class="short-action-label lang-en-block">Keys</span>
        </div>
        <div class="short-audio-disc paused">
          <img src="${movie.poster}" alt="audio" />
        </div>
      </div>
    `;
  },

  generatePlayOverlayHtml() {
    return `
      <div class="short-play-overlay" style="position:absolute; inset:0; z-index:1001; display:flex; align-items:center; justify-content:center; cursor:pointer;">
        <div class="short-pause-icon" style="width:80px; height:80px; background:rgba(0,0,0,0.4); border-radius:50%; display:grid; place-items:center; opacity:0; transition:opacity 0.2s; transform:scale(0.8);">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="#fff" style="margin-left:4px;"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="short-like-heart" style="position:absolute; opacity:0; transform:scale(0); pointer-events:none;">
          <svg viewBox="0 0 24 24" width="100" height="100" fill="#ff453a"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </div>
        <div class="short-ripple" style="position:absolute; width:80px; height:80px; background:rgba(255,255,255,0.4); border-radius:50%; opacity:0; pointer-events:none;"></div>
      </div>
    `;
  },

  generateShortHtml(movie, title) {
    return `
      <img src="${movie.poster}" alt="${title}" style="width:100%; height:100%; object-fit:cover; position:absolute; inset:0;" />
      <div class="skeleton-shimmer"></div>
      <div class="shorts-foryou-badge">${LANG === "km" ? "សម្រាប់អ្នក" : "For You"}</div>
      <div class="short-ff-hud">${LANG === "km" ? "ល្បឿន 2x 🔥" : "2x Speed 🔥"}</div>
      <div class="shorts-rotation-hint">
        <span class="shorts-rotation-hint-arrow">↑</span>
        <span>${LANG === "km" ? "អូសឡើងលើ" : "Scroll up"}</span>
      </div>
      <div class="shorts-sound-hud">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path class="shorts-hud-waves" d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      </div>
      <div class="short-seek-overlay">
        <div class="short-seek-icon"></div>
      </div>
      <div class="short-stoic-quote" id="stoicQuote_${movie.slug}">
        <div class="quote-km"></div>
        <div class="quote-en"></div>
        <div class="quote-author"></div>
      </div>
      <div class="short-gradient-bottom"></div>
      ${this.generateInfoContainerHtml(movie, title)}
      ${this.generateActionsContainerHtml(movie)}
      <div class="video-container" style="position:absolute; inset:0; z-index:-1;"></div>
      ${this.generatePlayOverlayHtml()}
      ${this.generateProgressBarHtml()}
    `;
  }
};

const AUTOPLAY_VISIBILITY_THRESHOLD = 0.6;

function getStringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getMockStats(slug) {
  const hash = getStringHash(slug);
  return {
    likes: (hash % 50000) + 1000,
    comments: (hash % 1000) + 20,
    shares: (hash % 500) + 10
  };
}

function formatStat(num) {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getMovieTitle(movie) {
  return movie.title[LANG] || movie.title.en || movie.title.km;
}

function clearShortsIdleTimer() {
  if (shortsIdleTimer) {
    clearTimeout(shortsIdleTimer);
    shortsIdleTimer = null;
  }
}

function resetShortsIdleTimer() {
  // Clear any existing nudge-active classes on elements
  const activeNudges = document.querySelectorAll(".short-watch-btn.nudge-active, .watch-link.nudge-active");
  activeNudges.forEach(el => el.classList.remove("nudge-active"));

  clearShortsIdleTimer();

  // If comments panel or keyboard panel is active, suspend wiggling to protect user focus
  const commentPanel = document.getElementById("shortsCommentPanel");
  const keyboardPanel = document.getElementById("shortsKeyboardPanel");
  const isPanelActive = (commentPanel && commentPanel.classList.contains("active")) || 
                        (keyboardPanel && keyboardPanel.classList.contains("active"));
  
  if (isPanelActive) {
    return;
  }

  // Trigger wiggling nudge on watch buttons after 8s of inactivity
  shortsIdleTimer = setTimeout(() => {
    // Re-verify in case a panel was opened during the wait
    const activeComment = document.getElementById("shortsCommentPanel");
    const activeKeyboard = document.getElementById("shortsKeyboardPanel");
    if ((activeComment && activeComment.classList.contains("active")) ||
        (activeKeyboard && activeKeyboard.classList.contains("active"))) {
      return;
    }

    if (activeShortWrapper) {
      const watchBtn = activeShortWrapper.querySelector(".short-watch-btn");
      if (watchBtn) {
        watchBtn.classList.add("nudge-active");
      }
      const watchLinks = activeShortWrapper.querySelectorAll(".watch-link");
      watchLinks.forEach(link => link.classList.add("nudge-active"));
    }
  }, 8000);
}

function setupShortsNudgeListeners() {
  teardownShortsNudgeListeners();

  window.addEventListener("mousemove", resetShortsIdleTimer);
  window.addEventListener("mousedown", resetShortsIdleTimer);
  window.addEventListener("keydown", resetShortsIdleTimer);
  window.addEventListener("touchstart", resetShortsIdleTimer);
  window.addEventListener("scroll", resetShortsIdleTimer);

  const container = document.getElementById('shortsContainer');
  if (container) {
    container.addEventListener("scroll", resetShortsIdleTimer);
  }

  resetShortsIdleTimer();
}

function teardownShortsNudgeListeners() {
  window.removeEventListener("mousemove", resetShortsIdleTimer);
  window.removeEventListener("mousedown", resetShortsIdleTimer);
  window.removeEventListener("keydown", resetShortsIdleTimer);
  window.removeEventListener("touchstart", resetShortsIdleTimer);
  window.removeEventListener("scroll", resetShortsIdleTimer);

  const container = document.getElementById('shortsContainer');
  if (container) {
    container.removeEventListener("scroll", resetShortsIdleTimer);
  }

  clearShortsIdleTimer();

  const activeNudges = document.querySelectorAll(".short-watch-btn.nudge-active, .watch-link.nudge-active");
  activeNudges.forEach(el => el.classList.remove("nudge-active"));
}

export function stopShortsMode() {
  teardownShortsNudgeListeners();
  document.removeEventListener('keydown', handleShortsKeydown);
  
  const container = document.getElementById('shortsContainer');
  if (container) {
    if (shortsScrollHandler) {
      container.removeEventListener('scroll', shortsScrollHandler);
      shortsScrollHandler = null;
    }
    if (shortsWheelHandler) {
      container.removeEventListener('wheel', shortsWheelHandler);
      shortsWheelHandler = null;
    }
  }
  
  for (let [slug, player] of ShortsState.players.entries()) {
    try {
      player.pause();
    } catch (e) {
      console.warn(`Error pausing player for ${slug}:`, e);
    }
  }
}

export async function startShortsMode() {
  const container = document.getElementById('shortsContainer');
  if (!container) return;
  showLoadingState(container);
  
  document.removeEventListener('keydown', handleShortsKeydown);
  document.addEventListener('keydown', handleShortsKeydown);

  // Parallel prefetching of target movie details if present in URL
  const queryParams = new URLSearchParams(location.search);
  const targetSlug = queryParams.get("id");
  if (targetSlug) {
    fetchMovieDetails(targetSlug).catch(e => console.warn(`Failed to prefetch target details:`, e));
  }
  
  const closeKeyboardBtn = document.getElementById('closeShortsKeyboardBtn');
  if (closeKeyboardBtn && !closeKeyboardBtn.dataset.bound) {
    closeKeyboardBtn.dataset.bound = 'true';
    closeKeyboardBtn.addEventListener('click', () => {
      const panel = document.getElementById('shortsKeyboardPanel');
      if (panel) panel.classList.remove('active');
    });
  }

  const closeCommentBtn = document.getElementById('closeShortsCommentBtn');
  if (closeCommentBtn && !closeCommentBtn.dataset.bound) {
    closeCommentBtn.dataset.bound = 'true';
    closeCommentBtn.addEventListener('click', () => {
      const panel = document.getElementById('shortsCommentPanel');
      if (panel) panel.classList.remove('active');
    });
  }

  // Self-determination / Autonomy: Interactive comments input listener
  const submitBtn = document.getElementById('shortsCommentSubmit');
  const commentInput = document.getElementById('shortsCommentInput');
  
  if (commentInput) {
    commentInput.placeholder = LANG === 'km' ? 'បន្ថែមមតិយោបល់...' : 'Add a comment...';
  }
  if (submitBtn) {
    submitBtn.textContent = LANG === 'km' ? 'ផ្ញើ' : 'Post';
    submitBtn.disabled = true;
  }

  if (submitBtn && commentInput && !submitBtn.dataset.bound) {
    submitBtn.dataset.bound = 'true';
    
    commentInput.addEventListener('input', () => {
      submitBtn.disabled = !commentInput.value.trim();
    });
    
    const sendComment = () => {
      const text = commentInput.value.trim();
      if (!text || !ShortsState.activeSlugForComments) return;
      
      const newComment = {
        author: LANG === 'km' ? "ខ្ញុំ" : "Me",
        text: text,
        timestamp: Date.now()
      };
      
      // Save in localStorage
      const key = `shorts_comments_${ShortsState.activeSlugForComments}`;
      let comments = JSON.parse(localStorage.getItem(key) || '[]');
      comments.push(newComment);
      localStorage.setItem(key, JSON.stringify(comments));
      
      // Append to UI
      const body = document.querySelector('#shortsCommentPanel .shorts-comment-body');
      if (body) {
        body.appendChild(createCommentElement(newComment));
        body.scrollTop = body.scrollHeight;
      }
      
      // Sound feedback
      playPopSound();
      
      // Clear input
      commentInput.value = '';
      submitBtn.disabled = true;
      
      // Update comment count on active short wrapper
      const wrapper = document.querySelector(`.short-video-wrapper[data-slug="${ShortsState.activeSlugForComments}"]`);
      if (wrapper) {
        const commentBtn = wrapper.querySelector('.comment-btn');
        if (commentBtn) {
          const countLabel = commentBtn.nextElementSibling;
          if (countLabel && countLabel.classList.contains('short-action-label')) {
            const currentCount = parseInt(countLabel.textContent.replace(/[^\d]/g, '')) || 0;
            countLabel.textContent = formatStat(currentCount + 1);
          }
        }
      }
    };
    
    submitBtn.addEventListener('click', sendComment);
    commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendComment();
      }
    });

    // Wire up quick comment chips
    const chips = document.querySelectorAll('#shortsCommentPanel .comment-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        let text = "";
        if (chip.dataset.emoji) {
          text = chip.dataset.emoji;
        } else {
          text = LANG === 'km' ? chip.dataset.textKm : chip.dataset.textEn;
        }
        
        if (!text || !ShortsState.activeSlugForComments) return;
        
        commentInput.value = text;
        sendComment();
      });
    });
  }
  
  try {
    const data = await fetchDatabase();
    ShortsState.db = sortMoviesByPreference(data);
    
    // Parse URL parameter to prioritize target short
    const queryParams = new URLSearchParams(location.search);
    const targetSlug = queryParams.get("id");
    if (targetSlug) {
      const idx = ShortsState.db.findIndex(m => m.slug === targetSlug);
      if (idx !== -1) {
        const [targetMovie] = ShortsState.db.splice(idx, 1);
        ShortsState.db.unshift(targetMovie);
      }
    }

    // Prefetch details for the first 3 movies in the feed
    ShortsState.db.slice(0, 3).forEach(movie => {
      fetchMovieDetails(movie.slug).catch(e => console.warn(`Failed to prefetch details for ${movie.slug}:`, e));
    });

    renderFeed(container);

    const nextBtn = document.getElementById('shortsNextBtn');
    const prevBtn = document.getElementById('shortsPrevBtn');

    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.dataset.bound = 'true';
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
      });
    }

    if (prevBtn && !prevBtn.dataset.bound) {
      prevBtn.dataset.bound = 'true';
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        container.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
      });
    }

    if (shortsScrollHandler) {
      container.removeEventListener('scroll', shortsScrollHandler);
    }
    shortsScrollHandler = () => {
      if (!prevBtn || !nextBtn) return;
      const isAtTop = container.scrollTop <= 10;
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
      
      prevBtn.style.opacity = isAtTop ? '0' : '0.4';
      prevBtn.style.pointerEvents = isAtTop ? 'none' : 'auto';
      
      nextBtn.style.opacity = isAtBottom ? '0' : '0.4';
      nextBtn.style.pointerEvents = isAtBottom ? 'none' : 'auto';
    };

    container.addEventListener('scroll', shortsScrollHandler);
    setTimeout(shortsScrollHandler, 300);

    // Snap-lock wheel triggers for trackpad Snapping comfort
    if (shortsWheelHandler) {
      container.removeEventListener('wheel', shortsWheelHandler);
    }
    let isTrackpadScrolling = false;
    shortsWheelHandler = (e) => {
      if (Math.abs(e.deltaY) < 15) return;
      e.preventDefault();
      if (isTrackpadScrolling) return;
      
      isTrackpadScrolling = true;
      const scrollAmount = e.deltaY > 0 ? window.innerHeight : -window.innerHeight;
      container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      
      setTimeout(() => {
        isTrackpadScrolling = false;
      }, 700);
    };
    container.addEventListener('wheel', shortsWheelHandler, { passive: false });

    setupShortsNudgeListeners();
  } catch (err) {
    showErrorState(container);
    console.error('Failed to start shorts mode:', err);
  }
}

function showLoadingState(container) {
  container.innerHTML = `
    <div class="short-video-wrapper" style="background:#111;">
      <div class="short-skeleton-loader" style="width:100%; height:100%; position:relative;">
        <div class="skeleton-shimmer"></div>
        <div style="position:absolute; bottom:20px; left:16px; width:70%;">
          <div style="height:14px; width:40%; background:rgba(255,255,255,0.1); border-radius:4px; margin-bottom:8px;"></div>
          <div style="height:14px; width:80%; background:rgba(255,255,255,0.1); border-radius:4px; margin-bottom:8px;"></div>
          <div style="height:14px; width:60%; background:rgba(255,255,255,0.1); border-radius:4px;"></div>
        </div>
        <div style="position:absolute; bottom:20px; right:12px; display:flex; flex-direction:column; gap:18px;">
          <div style="width:46px; height:46px; border-radius:50%; background:rgba(255,255,255,0.1);"></div>
          <div style="width:46px; height:46px; border-radius:50%; background:rgba(255,255,255,0.1);"></div>
          <div style="width:46px; height:46px; border-radius:50%; background:rgba(255,255,255,0.1);"></div>
          <div style="width:46px; height:46px; border-radius:50%; background:rgba(255,255,255,0.1);"></div>
        </div>
      </div>
    </div>
  `;
}

function showErrorState(container) {
  container.innerHTML = `<div style="color:#fff; text-align:center; margin-top: 50vh;">${LANG === 'km' ? 'មិនអាចទាញយកព័ត៌មានបានទេ' : 'Failed to load shorts feed.'}</div>`;
}

async function fetchDatabase() {
  const res = await fetch('db/index.json');
  if (!res.ok) throw new Error('Failed to load db');
  return res.json();
}

function sortMoviesByPreference(data) {
  return data.sort((a, b) => ShortsState.scoreMovie(b) - ShortsState.scoreMovie(a));
}

function renderFeed(container) {
  container.innerHTML = '';
  ShortsState.observer = createIntersectionObserver(container);

  ShortsState.db.forEach(movie => {
    const wrapper = createShortWrapper(movie);
    setupActionListeners(wrapper, movie);
    container.appendChild(wrapper);
    ShortsState.observer.observe(wrapper);
  });
}

function createIntersectionObserver(container) {
  return new IntersectionObserver(handleIntersect, {
    root: container,
    threshold: AUTOPLAY_VISIBILITY_THRESHOLD
  });
}

function createShortWrapper(movie) {
  const title = getMovieTitle(movie);
  const wrapper = document.createElement('div');
  wrapper.className = 'short-video-wrapper';
  wrapper.dataset.slug = movie.slug;
  wrapper.dataset.genres = JSON.stringify(movie.genres || []);
  
  wrapper.innerHTML = Templates.generateShortHtml(movie, title);
  return wrapper;
}

function setupActionListeners(wrapper, movie) {
  setupLikeButton(wrapper, movie);
  setupShareButton(wrapper, movie);
  setupCommentButton(wrapper, movie);
  setupSoundButton(wrapper);
  setupKeyboardHelpButton(wrapper);
  setupRotationHint(wrapper);
  setupWatchLinks(wrapper, movie);
  setupPlayOverlay(wrapper, movie);
  setupEmojiReactions(wrapper, movie);
}

function setupEmojiReactions(wrapper, movie) {
  const emojiButtons = wrapper.querySelectorAll('.short-reaction-btn-emoji');
  emojiButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const emoji = btn.dataset.emoji;
      playPopSound();
      triggerEmojiFloatBadge(wrapper, btn, emoji);
      ShortsState.boostGenres(movie.genres, 1);
    });
  });
}

function triggerEmojiFloatBadge(wrapper, button, emoji) {
  const badge = document.createElement("span");
  badge.className = "emoji-float-badge";
  badge.textContent = emoji;
  
  const wrapperRect = wrapper.getBoundingClientRect();
  const btnRect = button.getBoundingClientRect();
  
  const top = (btnRect.top - wrapperRect.top) + "px";
  const left = (btnRect.left - wrapperRect.left + btnRect.width / 2) + "px";
  
  badge.style.position = "absolute";
  badge.style.top = top;
  badge.style.left = left;
  badge.style.transform = "translateX(-50%)";
  badge.style.pointerEvents = "none";
  badge.style.zIndex = "1002";
  
  const drift = (Math.random() * 40 - 20) + "px";
  badge.style.setProperty("--drift-x", drift);
  const rot = (Math.random() * 60 - 30) + "deg";
  badge.style.setProperty("--rotation", rot);
  
  wrapper.appendChild(badge);
  
  setTimeout(() => {
    badge.remove();
  }, 1000);
}

// Low-level: Display dynamic Stoic/Existential quote on pause
function showStoicQuote(wrapper, slug) {
  const quoteEl = wrapper.querySelector('.short-stoic-quote');
  if (!quoteEl) return;

  const quote = STOIC_QUOTES[Math.floor(Math.random() * STOIC_QUOTES.length)];
  const kmEl = quoteEl.querySelector('.quote-km');
  const enEl = quoteEl.querySelector('.quote-en');
  const authorEl = quoteEl.querySelector('.quote-author');

  if (kmEl) kmEl.textContent = quote.km;
  if (enEl) enEl.textContent = quote.en;
  if (authorEl) authorEl.textContent = quote.author;

  quoteEl.classList.add('active');
}

// Low-level: Hide pause quote overlay
function hideStoicQuote(wrapper, slug) {
  const quoteEl = wrapper.querySelector('.short-stoic-quote');
  if (quoteEl) {
    quoteEl.classList.remove('active');
  }
}

// Low-level: Spawn drifting music notes from vinyl disc
function triggerMusicNoteFloat(wrapper) {
  const disc = wrapper.querySelector('.short-audio-disc');
  if (!disc) return;

  const notes = ['♫', '♪', '♬', '♩'];
  const noteChar = notes[Math.floor(Math.random() * notes.length)];
  const note = document.createElement('div');
  note.className = 'short-music-note';
  note.textContent = noteChar;

  const wrapperRect = wrapper.getBoundingClientRect();
  const discRect = disc.getBoundingClientRect();

  const top = (discRect.top - wrapperRect.top + discRect.height / 2) + 'px';
  const left = (discRect.left - wrapperRect.left + discRect.width / 2) + 'px';

  note.style.position = 'absolute';
  note.style.top = top;
  note.style.left = left;
  note.style.transform = 'translate(-50%, -50%)';

  const driftX = (Math.random() * 60 - 30) + 'px';
  const rot = (Math.random() * 90 - 45) + 'deg';

  note.style.setProperty('--music-drift-x', driftX);
  note.style.setProperty('--music-rotation', rot);

  wrapper.appendChild(note);

  setTimeout(() => {
    note.remove();
  }, 2500);
}

function setupKeyboardHelpButton(wrapper) {
  const keyboardBtn = wrapper.querySelector('.keyboard-btn');
  if (keyboardBtn) {
    keyboardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleKeyboardPanel();
    });
  }
}

// Visual affordance navigation chevrons action setup
function setupRotationHint(wrapper) {
  const hint = wrapper.querySelector('.shorts-rotation-hint');
  if (hint) {
    hint.addEventListener('click', (e) => {
      e.stopPropagation();
      const container = document.getElementById('shortsContainer');
      if (container) {
        container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
      }
    });
  }
}

function setupCommentButton(wrapper, movie) {
  const commentBtn = wrapper.querySelector('.comment-btn');
  if (commentBtn) {
    commentBtn.addEventListener('click', () => {
      ShortsState.activeSlugForComments = movie.slug;
      openCommentsPanel(movie);
    });
  }
}

function setupSoundButton(wrapper) {
  const soundBtn = wrapper.querySelector('.sound-btn');
  if (!soundBtn) return;
  if (!ShortsState.soundOn) {
    soundBtn.classList.add('pulsing');
  }
  soundBtn.addEventListener('click', () => {
    soundBtn.classList.remove('pulsing');
    ShortsState.setSoundEnabled(!ShortsState.soundOn);
  });
}

function refreshSoundButtons() {
  const ui = Templates.getSoundUi();
  document.querySelectorAll('.sound-btn').forEach(btn => {
    btn.innerHTML = ui.icon;
    btn.setAttribute('aria-label', ui.toggleAction);
  });
  document.querySelectorAll('.sound-label').forEach(label => {
    label.textContent = ui.label;
  });
}

function setupWatchLinks(wrapper, movie) {
  wrapper.querySelectorAll('.watch-link').forEach(link => {
    link.addEventListener('click', () => ShortsState.boostGenres(movie.genres, 2));
  });
}

function setupLikeButton(wrapper, movie) {
  const likeBtn = wrapper.querySelector('.like-btn');
  if (!likeBtn) return;
  const likeCountEl = wrapper.querySelector('.like-count');
  const stats = getMockStats(movie.slug);
  likeBtn.addEventListener('click', () => {
    likeBtn.classList.toggle('active');
    const isActive = likeBtn.classList.contains('active');
    if (isActive) {
      ShortsState.boostGenres(movie.genres, 4);
      if (likeCountEl) likeCountEl.textContent = formatStat(stats.likes + 1);
      playPopSound();
      triggerHeartExplosion(wrapper, wrapper.offsetWidth / 2, wrapper.offsetHeight / 2);
      triggerLikeFloatBadge(likeBtn);
    } else {
      if (likeCountEl) likeCountEl.textContent = formatStat(stats.likes);
    }
  });
}

function setupShareButton(wrapper, movie) {
  const shareBtn = wrapper.querySelector('.share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const langParam = new URLSearchParams(location.search).get("lang");
      const langStr = langParam ? `&lang=${langParam}` : "";
      const link = `${location.origin}${location.pathname}?mode=shorts&id=${movie.slug}${langStr}`;
      navigator.clipboard.writeText(link)
        .then(() => showToast(LANG === 'km' ? 'ចម្លងតំណភ្ជាប់ជោគជ័យ!' : 'Link copied!'))
        .catch(() => showToast('Failed to copy link'));
    });
  }
}

function setupPlayOverlay(wrapper, movie) {
  const playOverlay = wrapper.querySelector('.short-play-overlay');
  if (!playOverlay) return;
  const likeBtn = wrapper.querySelector('.like-btn');
  const heartAnim = wrapper.querySelector('.short-like-heart');
  const ripple = wrapper.querySelector('.short-ripple');
  
  let lastTap = 0;
  let pressTimer = null;
  let longPressFired = false;

  const startPress = () => {
    longPressFired = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      const player = ShortsState.players.get(movie.slug);
      if (player && !player.paused()) {
        player.playbackRate(2.0);
        wrapper.classList.add('ff-active');
        longPressFired = true;
      }
    }, 450);
  };

  const endPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
    if (longPressFired) {
      const player = ShortsState.players.get(movie.slug);
      if (player) {
        player.playbackRate(1.0);
        wrapper.classList.remove('ff-active');
      }
      setTimeout(() => {
        longPressFired = false;
      }, 50);
    }
  };

  playOverlay.addEventListener('mousedown', startPress);
  playOverlay.addEventListener('mouseup', endPress);
  playOverlay.addEventListener('mouseleave', endPress);

  playOverlay.addEventListener('touchstart', startPress, { passive: true });
  playOverlay.addEventListener('touchend', endPress, { passive: true });
  playOverlay.addEventListener('touchcancel', endPress, { passive: true });
  
  playOverlay.addEventListener('click', (e) => {
    if (longPressFired) {
      longPressFired = false;
      return;
    }
    const now = Date.now();
    const doubleTap = (now - lastTap) < 300;
    
    if (doubleTap) {
      lastTap = 0;
      
      const rect = playOverlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (likeBtn && !likeBtn.classList.contains('active')) {
        likeBtn.click();
      } else {
        triggerHeartExplosion(wrapper, x, y);
      }
      
      if (heartAnim) {
        heartAnim.style.transition = 'none';
        heartAnim.style.opacity = '1';
        heartAnim.style.transform = 'scale(0.5)';
        
        void heartAnim.offsetWidth;
        
        heartAnim.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out';
        heartAnim.style.transform = 'scale(1.2)';
        
        setTimeout(() => {
          heartAnim.style.transition = 'opacity 0.3s ease-out';
          heartAnim.style.opacity = '0';
        }, 600);
      }
      
    } else {
      lastTap = now;
      setTimeout(() => {
        if (lastTap === now) {
          const player = ShortsState.players.get(movie.slug);
          if (!player) return;
          
          if (player.paused()) {
            player.play();
          } else {
            player.pause();
          }
          
          if (ripple) {
            ripple.style.transition = 'none';
            ripple.style.opacity = '1';
            ripple.style.transform = 'scale(0.5)';
            
            void ripple.offsetWidth;
            
            ripple.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
            ripple.style.transform = 'scale(2)';
            ripple.style.opacity = '0';
          }
        }
      }, 300);
    }
  });
}

function handleShortsKeydown(e) {
  const shortsView = document.getElementById('shortsView');
  if (!shortsView || shortsView.style.display === 'none') return;

  // Ignore keyboard shortcuts if modifier keys are pressed (e.g., Ctrl+1, Cmd+2, Alt+Left)
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  
  if (e.key === 'Escape') {
    const panel = document.getElementById('shortsCommentPanel');
    if (panel && panel.classList.contains('active')) {
      e.preventDefault();
      panel.classList.remove('active');
      const input = document.getElementById('shortsCommentInput');
      if (input) input.blur();
      return;
    }
    const kPanel = document.getElementById('shortsKeyboardPanel');
    if (kPanel && kPanel.classList.contains('active')) {
      e.preventDefault();
      kPanel.classList.remove('active');
      return;
    }
  }

  // Ignore hotkeys when typing in comment input
  const active = document.activeElement;
  if (active && (
    active.tagName === "INPUT" ||
    active.tagName === "TEXTAREA" ||
    active.tagName === "SELECT" ||
    active.isContentEditable
  )) {
    return;
  }

  if (e.key === '?' || e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    toggleKeyboardPanel();
    return;
  }

  const container = document.getElementById('shortsContainer');
  if (!container) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    container.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
    return;
  }

  // Find active slug and wrapper once based on scroll position
  let activeSlug = null;
  let activeWrapper = null;
  const scrollTop = container.scrollTop;
  const wrappers = container.querySelectorAll('.short-video-wrapper');
  let minDiff = Infinity;
  wrappers.forEach(w => {
    const diff = Math.abs(w.offsetTop - scrollTop);
    if (diff < minDiff) {
      minDiff = diff;
      activeWrapper = w;
      activeSlug = w.dataset.slug;
    }
  });

  const isKm = LANG === 'km';

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    if (activeSlug && activeWrapper) {
      const player = ShortsState.players.get(activeSlug);
      if (player) {
        const isLeft = e.key === 'ArrowLeft';
        const seekStep = 10;
        const currentTime = player.currentTime();
        const duration = player.duration();
        const newTime = isLeft ? Math.max(0, currentTime - seekStep) : Math.min(duration || Infinity, currentTime + seekStep);
        player.currentTime(newTime);
        showShortSeekOverlay(activeWrapper, isLeft, seekStep);
      }
    }
  } else if (e.key === 'k' || e.key === 'K' || e.key === ' ') {
    e.preventDefault();
    if (activeSlug) {
      const player = ShortsState.players.get(activeSlug);
      if (player) {
        if (player.paused()) {
          player.play();
          if (activeWrapper) {
            showKeystrokeHUD(activeWrapper, 'Space', isKm ? 'លេង' : 'Play', `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`);
          }
        } else {
          player.pause();
          if (activeWrapper) {
            showKeystrokeHUD(activeWrapper, 'Space', isKm ? 'ផ្អាក' : 'Pause', `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`);
          }
        }
      }
    }
  } else if (e.key === 'm' || e.key === 'M') {
    e.preventDefault();
    const nextSoundState = !ShortsState.soundOn;
    ShortsState.setSoundEnabled(nextSoundState, false);
    if (activeWrapper) {
      const keyText = 'M';
      const actionText = nextSoundState ? (isKm ? 'បើកសំឡេង' : 'Unmuted') : (isKm ? 'បិទសំឡេង' : 'Muted');
      const iconSvg = nextSoundState
        ? `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`
        : `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM12 4L9.91 6.09 12 8.18V4zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3z"/></svg>`;
      showKeystrokeHUD(activeWrapper, keyText, actionText, iconSvg);
    }
  } else if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    if (activeWrapper) {
      const likeBtn = activeWrapper.querySelector('.like-btn');
      if (likeBtn) {
        const wasActive = likeBtn.classList.contains('active');
        likeBtn.click();
        showKeystrokeHUD(
          activeWrapper,
          'L',
          !wasActive ? (isKm ? 'ចូលចិត្ត' : 'Liked') : (isKm ? 'ឈប់ចូលចិត្ត' : 'Unliked'),
          `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
        );
      }
    }
  } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    const panel = document.getElementById('shortsCommentPanel');
    if (panel) {
      if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        const input = document.getElementById('shortsCommentInput');
        if (input) input.blur();
        if (activeWrapper) {
          showKeystrokeHUD(activeWrapper, 'C', isKm ? 'បិទមតិ' : 'Close Comments', `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`);
        }
      } else if (activeSlug) {
        const movie = ShortsState.db.find(m => m.slug === activeSlug);
        if (movie) {
          ShortsState.activeSlugForComments = movie.slug;
          openCommentsPanel(movie);
          if (activeWrapper) {
            showKeystrokeHUD(activeWrapper, 'C', isKm ? 'បើកមតិ' : 'Open Comments', `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`);
          }
          const input = document.getElementById('shortsCommentInput');
          if (input) {
            setTimeout(() => {
              input.focus();
              input.select();
            }, 100);
          }
        }
      }
    }
  }
}

function disposeOldPlayers(currentSlug) {
  const MAX_PLAYERS = 4;
  if (ShortsState.players.size > MAX_PLAYERS) {
    let toDelete = [];
    for (let [key, player] of ShortsState.players.entries()) {
      if (key !== currentSlug && player.paused()) {
        toDelete.push(key);
      }
    }
    while (toDelete.length > 0 && ShortsState.players.size > MAX_PLAYERS) {
      const key = toDelete.shift();
      const p = ShortsState.players.get(key);
      if (p) {
        p.dispose();
        ShortsState.players.delete(key);
        playerInitPromises.delete(key);
        // Re-inject a fresh video container div for when we scroll back
        const wrapper = document.querySelector(`.short-video-wrapper[data-slug="${key}"]`);
        if (wrapper) {
            const vc = wrapper.querySelector('.video-container');
            if (vc) vc.innerHTML = '';
        }
      }
    }
  }
}

function handleIntersect(entries) {
  for (const entry of entries) {
    const wrapper = entry.target;
    const slug = wrapper.dataset.slug;

    if (entry.isIntersecting) {
      handleVideoInView(wrapper, slug);
    } else {
      pauseVideoInWrapper(slug);
    }
  }
}

function handleVideoInView(wrapper, slug) {
  const genres = JSON.parse(wrapper.dataset.genres || '[]');
  ShortsState.boostGenres(genres);
  ShortsState.recordViewedSlug(slug);
  
  activeShortWrapper = wrapper;
  resetShortsIdleTimer();

  playVideoInWrapper(wrapper, slug);
  disposeOldPlayers(slug);

  const urlParams = new URLSearchParams(location.search);
  if (urlParams.get('id') !== slug) {
    urlParams.set('id', slug);
    const newUrl = `${location.pathname}?${urlParams.toString()}`;
    history.replaceState(null, '', newUrl);
  }

  preloadNextShort(wrapper);
}

function preloadNextShort(wrapper) {
  const nextWrapper = wrapper.nextElementSibling;
  if (!nextWrapper || !nextWrapper.classList.contains('short-video-wrapper')) return;

  const nextSlug = nextWrapper.dataset.slug;
  if (!nextSlug) return;

  fetchMovieDetails(nextSlug)
    .then(() => {
      initializePlayer(nextSlug, nextWrapper).catch(err => {
        console.warn(`Failed to pre-initialize player for next short ${nextSlug}:`, err);
      });
    })
    .catch(err => {
      console.warn(`Failed to prefetch details for next short ${nextSlug}:`, err);
    });
}

async function playVideoInWrapper(wrapper, slug) {
  let player = ShortsState.players.get(slug);
  if (!player) {
    player = await initializePlayer(slug, wrapper);
  }
  if (!player) {
    wrapper.classList.remove('playing');
    wrapper.classList.add('error');

    if (!wrapper.querySelector('.short-error-indicator')) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'short-error-indicator';
      const errorMsg = LANG === 'km' ? 'វីដេអូមិនអាចលេងបានទេ' : 'Clip Unavailable';
      errorDiv.innerHTML = `
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="error-icon">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>${errorMsg}</span>
      `;
      wrapper.appendChild(errorDiv);
    }
    return;
  }

  bringVideoToFront(wrapper);
  playWithSoundPreference(player);
}

function bringVideoToFront(wrapper) {
  const vc = wrapper.querySelector('.video-container');
  if (vc) vc.style.zIndex = '1';
}

function playWithSoundPreference(player) {
  player.muted(!ShortsState.soundOn);
  if (!ShortsState.soundOn) showSoundHintOnce();
  const playback = player.play();
  if (playback && playback.catch) {
    playback.catch(() => fallBackToMutedPlayback(player));
  }
}

function fallBackToMutedPlayback(player) {
  ShortsState.soundOn = false;
  player.muted(true);
  refreshSoundButtons();
  showSoundHintOnce();
  const retry = player.play();
  if (retry && retry.catch) {
    retry.catch(e => console.warn('Playback blocked:', e));
  }
}

function showSoundHintOnce() {
  if (ShortsState.soundHintShown) return;
  ShortsState.soundHintShown = true;
  showToast(LANG === 'km' ? 'ចុច 🔊 ដើម្បីបើកសំឡេង' : 'Tap 🔊 for sound');
}

async function initializePlayer(slug, wrapper) {
  if (playerInitPromises.has(slug)) {
    return playerInitPromises.get(slug);
  }

  const promise = (async () => {
    try {
      const movieData = await fetchMovieDetails(slug);
      const randomEp = getRandomEpisode(movieData.episodes);
      if (!randomEp || !randomEp.url) return null;

      updateWatchLinks(wrapper, slug, randomEp.ep);

      const videoEl = createVideoElement();
      const vc = wrapper.querySelector('.video-container');
      if (vc) vc.appendChild(videoEl);

      const queryParams = new URLSearchParams(location.search);
      const targetSlug = queryParams.get("id");
      const isActive = activeShortWrapper === wrapper || (!activeShortWrapper && slug === targetSlug);

      const player = createVideoJsInstance(videoEl, randomEp.url, isActive);
      ShortsState.players.set(slug, player);
      setupPlayerEventHandlers(player, wrapper);

      player.on('error', () => handlePlayerError(wrapper));

      return player;
    } catch (e) {
      console.error('Failed to initialize short video:', e);
      playerInitPromises.delete(slug);
      return null;
    }
  })();

  playerInitPromises.set(slug, promise);
  return promise;
}

function updateWatchLinks(wrapper, slug, ep) {
  const watchLinks = wrapper.querySelectorAll('.watch-link');
  watchLinks.forEach(link => {
    link.href = `?id=${slug}&ep=${ep}`;
  });
}

function handlePlayerError(wrapper) {
  wrapper.classList.remove('playing');
  wrapper.classList.add('error');
  
  if (!wrapper.querySelector('.short-error-indicator')) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'short-error-indicator';
    const errorMsg = LANG === 'km' ? 'វីដេអូមិនអាចលេងបានទេ' : 'Clip Unavailable';
    errorDiv.innerHTML = `
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="error-icon">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>${errorMsg}</span>
    `;
    wrapper.appendChild(errorDiv);
  }
}

async function fetchMovieDetails(slug) {
  if (movieDetailsCache.has(slug)) {
    return movieDetailsCache.get(slug);
  }
  const promise = fetch(`db/${slug}.json`)
    .then(res => {
      if (!res.ok) {
        movieDetailsCache.delete(slug);
        throw new Error('Failed to fetch movie details');
      }
      return res.json();
    })
    .catch(err => {
      movieDetailsCache.delete(slug);
      throw err;
    });
  movieDetailsCache.set(slug, promise);
  return promise;
}

function getRandomEpisode(episodes = []) {
  if (episodes.length === 0) return null;
  return episodes[Math.floor(Math.random() * episodes.length)];
}

function createVideoElement() {
  const videoEl = document.createElement('video');
  videoEl.className = 'video-js vjs-default-skin';
  videoEl.setAttribute('playsinline', 'true');
  videoEl.setAttribute('loop', 'true');
  videoEl.setAttribute('muted', 'true');
  return videoEl;
}

function createVideoJsInstance(videoElement, url, autoplay = true) {
  return videojs(videoElement, {
    controls: false,
    autoplay: autoplay,
    preload: 'auto',
    fluid: false,
    fill: true,
    sources: [{ src: url, type: 'application/x-mpegURL' }]
  });
}

function setupPlayerEventHandlers(player, wrapper) {
  const audioDisc = wrapper.querySelector('.short-audio-disc');
  const progressContainer = wrapper.querySelector('.short-progress-container');
  const progressFilled = wrapper.querySelector('.short-progress-filled');

  let loopCount = 0;
  let lastTime = 0;
  let isScrubbing = false;

  let musicNoteInterval = null;

  player.on('playing', () => {
    wrapper.classList.remove('error');
    wrapper.classList.add('playing');
    
    togglePlayOverlayVisibility(wrapper, false);
    if (audioDisc) audioDisc.classList.remove('paused');
    hideStoicQuote(wrapper);
    
    if (!musicNoteInterval) {
      musicNoteInterval = setInterval(() => {
        triggerMusicNoteFloat(wrapper);
      }, 1800);
    }
    
    const hint = wrapper.querySelector('.shorts-rotation-hint');
    if (hint) hint.classList.remove('show');
    loopCount = 0;
    lastTime = 0;
  });

  player.on('pause', () => {
    togglePlayOverlayVisibility(wrapper, true);
    if (audioDisc) audioDisc.classList.add('paused');
    showStoicQuote(wrapper);
    
    if (musicNoteInterval) {
      clearInterval(musicNoteInterval);
      musicNoteInterval = null;
    }
  });

  player.on('dispose', () => {
    if (musicNoteInterval) {
      clearInterval(musicNoteInterval);
      musicNoteInterval = null;
    }
  });

  player.on('timeupdate', () => {
    const currentTime = player.currentTime();
    if (currentTime < lastTime - 1.5) {
      loopCount++;
      if (loopCount >= 2) {
        const hint = wrapper.querySelector('.shorts-rotation-hint');
        if (hint) hint.classList.add('show');
      }
      
      // Endowed Progress Streak
      if (!wrapper.dataset.looped) {
        wrapper.dataset.looped = 'true';
        ShortsState.watchStreak = (ShortsState.watchStreak || 0) + 1;
        const streakNumText = LANG === 'km' ? toKhmerNumerals(ShortsState.watchStreak) : ShortsState.watchStreak;
        const emojiStreak = '🔥'.repeat(Math.min(5, ShortsState.watchStreak));
        const message = LANG === 'km' 
          ? `បន្តទស្សនា៖ ${streakNumText} ${emojiStreak}` 
          : `Watch Streak: ${streakNumText} ${emojiStreak}`;
        triggerOsd(message);
        playSparkleSound();
      }
    }
    lastTime = currentTime;

    const duration = player.duration();
    if (!duration) return;

    // Zeigarnik Curiosity Nudge
    const targetTime = duration < 12 ? duration * 0.7 : 12;
    if (currentTime >= targetTime && !wrapper.dataset.tooltipShown) {
      wrapper.dataset.tooltipShown = 'true';
      const watchContainer = wrapper.querySelector('.short-watch-container');
      if (watchContainer) {
        watchContainer.classList.add('show-tooltip');
      }
    }

    const percent = (currentTime / duration) * 100;
    if (!isScrubbing && progressFilled) {
      progressFilled.style.width = `${percent}%`;
    }
  });

  if (progressContainer) {
    const tooltip = progressContainer.querySelector('.short-scrub-tooltip');

    const formatTime = (seconds) => {
      if (isNaN(seconds) || seconds === Infinity) return "00:00";
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    const handleScrub = (e) => {
      const duration = player.duration();
      if (!duration) return 0;
      const rect = progressContainer.getBoundingClientRect();
      let pos = (e.clientX - rect.left) / rect.width;
      pos = Math.max(0, Math.min(1, pos));
      
      if (progressFilled) progressFilled.style.width = `${pos * 100}%`;
      
      if (tooltip) {
        tooltip.textContent = `${formatTime(pos * duration)} / ${formatTime(duration)}`;
        tooltip.style.left = `${pos * 100}%`;
      }
      
      return pos * duration;
    };

    progressContainer.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      isScrubbing = true;
      progressContainer.classList.add('scrubbing');
      try {
        progressContainer.setPointerCapture(e.pointerId);
      } catch (err) {}
      
      const seekTime = handleScrub(e);
      player.currentTime(seekTime);
    });

    progressContainer.addEventListener('pointermove', (e) => {
      if (!isScrubbing) return;
      e.stopPropagation();
      const seekTime = handleScrub(e);
      player.currentTime(seekTime);
    });

    const endScrub = (e) => {
      if (!isScrubbing) return;
      isScrubbing = false;
      progressContainer.classList.remove('scrubbing');
      try {
        progressContainer.releasePointerCapture(e.pointerId);
      } catch (err) {}
      
      const seekTime = handleScrub(e);
      player.currentTime(seekTime);
    };

    progressContainer.addEventListener('pointerup', endScrub);
    progressContainer.addEventListener('pointercancel', endScrub);
  }
}

function togglePlayOverlayVisibility(wrapper, isVisible) {
  const playOverlay = wrapper.querySelector('.short-play-overlay');
  const pauseIcon = wrapper.querySelector('.short-pause-icon');
  if (playOverlay && pauseIcon) {
    if (isVisible) {
      pauseIcon.style.opacity = '1';
      pauseIcon.style.transform = 'scale(1)';
    } else {
      pauseIcon.style.opacity = '0';
      pauseIcon.style.transform = 'scale(0.8)';
    }
  }
}

function pauseVideoInWrapper(slug) {
  const player = ShortsState.players.get(slug);
  if (player) {
    player.pause();
  }
}

const COMMENT_TEMPLATES = {
  "ACTION": [
    "វាយគ្នាឡូយណាស់! (The action is awesome!)",
    "ក្បាច់គុនល្អមើលខ្លាំងណាស់ (Great martial arts choreography)",
    "រឿងនេះបាញ់គ្នាសាហាវណាស់ (Insane gunfights in this one)",
    "ចូលចិត្តតួឯកស្រីវាយគ្នាខ្លាំង (Love the female lead's fights)"
  ],
  "COMEDY": [
    "សើចចុកពោះតែម្ដង ហាហា (So funny I have a stomachache, haha)",
    "រឿងនេះកំប្លែងខ្លាំងណាស់ (Very funny movie)",
    "ចូលចិត្តតួសម្តែងកំប្លែងៗណាស់ (Love the funny cast)",
    "មើលហើយបាត់ហត់តែម្តង (Watched this and forgot my fatigue)"
  ],
  "DRAMA": [
    "រឿងនេះកម្សត់ណាស់ យំតាមតែម្តង (So emotional, cried through it)",
    "តួសម្តែងបានល្អណាស់ (Superb acting)",
    "ចាក់ដោតអារម្មណ៍ខ្លាំងណាស់ (Really touches the heart)",
    "សាច់រឿងមានន័យណាស់ (Very meaningful storyline)"
  ],
  "HORROR": [
    "ភ័យចង់ងាប់ តែល្អមើល (Scared to death but good)",
    "មិនហ៊ានមើលម្នាក់ឯងទេ (Don't dare to watch alone)",
    "សំឡេងភ័យរន្ធត់ណាស់ (The horror audio is creepy)",
    "លោតកញ្ជ្រោលពេញបន្ទប់ (Jumping all over the room)"
  ],
  "ROMANCE": [
    "រឿងផ្អែមល្ហែមណាស់ (So sweet!)",
    "ចង់បានគូស្នេហ៍ដូចក្នុងរឿង (Wish I had a partner like in this movie)",
    "រំភើបជំនួសតួឯក (Excited on behalf of the main character)",
    "ស្នេហាដ៏ស្រស់ស្អាត (A beautiful love story)"
  ],
  "default": [
    "រឿងនេះល្អមើលណាស់! (This movie is great!)",
    "តើភាគបន្ទាប់ចេញនៅពេលណា? (When is the next episode?)",
    "អរគុណសម្រាប់ការចែករំលែក (Thanks for sharing)",
    "រង់ចាំមើលភាគបន្តទៀត (Waiting for the next part)"
  ]
};

function getOrGenerateComments(movie) {
  const key = `shorts_comments_${movie.slug}`;
  let stored = localStorage.getItem(key);
  if (stored) {
    return JSON.parse(stored);
  }
  
  const comments = [];
  const genres = movie.genres || [];
  const templates = [];
  genres.forEach(g => {
    if (COMMENT_TEMPLATES[g]) templates.push(...COMMENT_TEMPLATES[g]);
  });
  if (templates.length === 0) templates.push(...COMMENT_TEMPLATES["default"]);
  
  const users = ["user855", "cinema_fan", "movie_lover_99", "sopheak_kh", "dara_cool", "leakhena_ch"];
  const count = 3;
  const selectedTemplates = [...templates].sort(() => 0.5 - Math.random()).slice(0, count);
  
  selectedTemplates.forEach((text, i) => {
    comments.push({
      author: users[i % users.length],
      text: text,
      timestamp: Date.now() - (i + 1) * 3600000
    });
  });
  
  localStorage.setItem(key, JSON.stringify(comments));
  return comments;
}

function openCommentsPanel(movie) {
  const panel = document.getElementById('shortsCommentPanel');
  if (!panel) return;
  
  panel.classList.add('active');
  
  const comments = getOrGenerateComments(movie);
  const body = panel.querySelector('.shorts-comment-body');
  if (body) {
    body.innerHTML = '';
    comments.forEach(c => {
      body.appendChild(createCommentElement(c));
    });
    body.scrollTop = body.scrollHeight;
  }
  
  const input = document.getElementById('shortsCommentInput');
  if (input) input.value = '';
}

function createCommentElement(c) {
  const div = document.createElement('div');
  div.className = 'mock-comment';
  const likeCount = Math.floor(Math.random() * 10) + 1;
  const replyLabel = LANG === 'km' ? 'ឆ្លើយតប' : 'Reply';
  
  div.innerHTML = `
    <div class="mock-avatar" style="background: ${getAvatarBgColor(c.author)}">
      ${c.author.charAt(0).toUpperCase()}
    </div>
    <div class="mock-comment-content">
      <div class="mock-author">${c.author} <span class="mock-timestamp">${getRelativeTime(c.timestamp)}</span></div>
      <div class="mock-text">${c.text}</div>
      <div class="mock-comment-actions">
        <button class="comment-action-btn reply-btn">${replyLabel}</button>
        <button class="comment-action-btn comment-like-btn" aria-label="Like comment">
          <svg class="heart-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span class="comment-like-count">${likeCount}</span>
        </button>
      </div>
    </div>
  `;

  // Bind click listener for the like button inside this comment
  const likeBtn = div.querySelector('.comment-like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const countSpan = likeBtn.querySelector('.comment-like-count');
      let count = parseInt(countSpan.textContent) || 0;
      
      if (likeBtn.classList.contains('liked')) {
        likeBtn.classList.remove('liked');
        if (countSpan) countSpan.textContent = count - 1;
      } else {
        likeBtn.classList.add('liked');
        if (countSpan) countSpan.textContent = count + 1;
        playPopSound(); // Web Audio pop feedback
      }
    });
  }

  // Bind click listener for the reply button to auto-focus comment input with username
  const replyBtn = div.querySelector('.reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const input = document.getElementById('shortsCommentInput');
      if (input) {
        input.value = `@${c.author} `;
        input.focus();
        // Trigger input event to enable submit button
        input.dispatchEvent(new Event('input'));
      }
    });
  }
  
  return div;
}

function getRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return LANG === 'km' ? 'មុននេះបន្តិច' : 'just now';
  if (mins < 60) return LANG === 'km' ? `${mins}នាទីមុន` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return LANG === 'km' ? `${hours}ម៉ោងមុន` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return LANG === 'km' ? `${days}ថ្ងៃមុន` : `${days}d ago`;
}

function getAvatarBgColor(username) {
  const hash = getStringHash(username);
  const colors = ["#ff453a", "#ff9f0a", "#30d158", "#0a84ff", "#af52de", "#bf5af2"];
  return colors[hash % colors.length];
}

function showCentralSoundHud(isOn) {
  const container = document.getElementById('shortsContainer');
  if (!container) return;
  
  const scrollTop = container.scrollTop;
  const wrappers = container.querySelectorAll('.short-video-wrapper');
  let activeWrapper = null;
  let minDiff = Infinity;
  wrappers.forEach(w => {
    const diff = Math.abs(w.offsetTop - scrollTop);
    if (diff < minDiff) {
      minDiff = diff;
      activeWrapper = w;
    }
  });
  
  if (!activeWrapper) return;
  const hud = activeWrapper.querySelector('.shorts-sound-hud');
  if (!hud) return;
  
  const waves = hud.querySelector('.shorts-hud-waves');
  if (waves) {
    waves.style.display = isOn ? '' : 'none';
  }
  
  hud.classList.remove('show');
  void hud.offsetWidth;
  hud.classList.add('show');
  
  if (hud._timeoutId) clearTimeout(hud._timeoutId);
  hud._timeoutId = setTimeout(() => {
    hud.classList.remove('show');
  }, 800);
}

function triggerHeartExplosion(container, x, y) {
  for (let i = 0; i < 8; i++) {
    const heart = document.createElement("div");
    heart.className = "shorts-heart-particle";
    heart.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#ff453a"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
    
    const rx = x != null ? x : container.offsetWidth / 2;
    const ry = y != null ? y : container.offsetHeight / 2;
    
    heart.style.left = `${rx}px`;
    heart.style.top = `${ry}px`;
    
    const dx = (Math.random() - 0.5) * 80;
    const dy = -100 - Math.random() * 80;
    const rotation = (Math.random() - 0.5) * 60;
    
    heart.style.setProperty("--dx", `${dx}px`);
    heart.style.setProperty("--dy", `${dy}px`);
    heart.style.setProperty("--rot", `${rotation}deg`);
    
    container.appendChild(heart);
    
    setTimeout(() => {
      heart.remove();
    }, 800);
  }
}

function triggerLikeFloatBadge(button) {
  const container = button.parentElement;
  if (!container) return;

  const badge = document.createElement("span");
  badge.className = "like-float-badge";
  badge.textContent = "+1 ❤️";
  
  const drift = (Math.random() * 20 - 10) + "px";
  badge.style.setProperty("--drift", drift);
  
  container.appendChild(badge);
  
  setTimeout(() => {
    badge.remove();
  }, 800);
}

function showShortSeekOverlay(wrapper, isLeft, seconds) {
  const overlay = wrapper.querySelector('.short-seek-overlay');
  const iconContainer = wrapper.querySelector('.short-seek-icon');
  if (!overlay || !iconContainer) return;
  
  const leftSvg = `<svg viewBox="0 0 24 24"><path d="M11.5 12l8.5-8v16L11.5 12zm-9 0L11 4v16L2.5 12z"/></svg>`;
  const rightSvg = `<svg viewBox="0 0 24 24"><path d="M12.5 12L4 4v16l8.5-8zm9 0L13 4v16l8.5-8z"/></svg>`;
  
  iconContainer.innerHTML = `
    ${isLeft ? leftSvg : rightSvg}
    <span class="short-seek-text">${isLeft ? "-" : "+"}${seconds}s</span>
  `;
  
  iconContainer.className = 'short-seek-icon';
  iconContainer.classList.add(isLeft ? 'seek-left' : 'seek-right');
  
  void iconContainer.offsetWidth;
  iconContainer.classList.add('show');
  
  if (iconContainer._timeoutId) clearTimeout(iconContainer._timeoutId);
  iconContainer._timeoutId = setTimeout(() => {
    iconContainer.classList.remove('show');
  }, 600);
}

function toggleKeyboardPanel() {
  const panel = document.getElementById('shortsKeyboardPanel');
  if (!panel) return;
  panel.classList.toggle('active');
}

function showKeystrokeHUD(wrapper, keyText, actionText, iconSvg) {
  if (!wrapper) return;
  
  const oldHuds = wrapper.querySelectorAll('.short-keystroke-hud');
  oldHuds.forEach(hud => hud.remove());
  
  const hud = document.createElement('div');
  hud.className = 'short-keystroke-hud';
  hud.innerHTML = `
    <div class="hud-icon">${iconSvg}</div>
    <div class="hud-details">
      <kbd>${keyText}</kbd>
      <span>${actionText}</span>
    </div>
  `;
  
  wrapper.appendChild(hud);
  
  void hud.offsetWidth;
  hud.classList.add('active');
  
  if (hud._timeoutId) clearTimeout(hud._timeoutId);
  hud._timeoutId = setTimeout(() => {
    hud.classList.remove('active');
    setTimeout(() => hud.remove(), 250);
  }, 750);
}

// Verification Hook: Sync with test assertions
if (typeof window !== 'undefined') {
  window._recentSlugs = ShortsState.recentSlugs;
}
