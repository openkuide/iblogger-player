import { LANG, showToast } from './utils.js';

const SOUND_ON_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
const SOUND_OFF_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

const AUTOPLAY_VISIBILITY_THRESHOLD = 0.6;
const RANDOM_DISCOVERY_WEIGHT = 2;

const players = new Map();
let shortsDb = [];
let observer = null;
let prefs = JSON.parse(localStorage.getItem('shorts_prefs') || '{}');
let soundOn = localStorage.getItem('shorts_sound') === 'on';
let soundHintShown = false;

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

function savePrefs() {
  localStorage.setItem('shorts_prefs', JSON.stringify(prefs));
}

function boostGenres(genres) {
  if (!genres) return;
  genres.forEach(g => {
    prefs[g] = (prefs[g] || 0) + 1;
  });
  savePrefs();
}

function scoreMovie(movie) {
  if (!movie.genres) return 0;
  const baseScore = movie.genres.reduce((sum, g) => sum + (prefs[g] || 0), 0);
  const randomFactor = Math.random() * RANDOM_DISCOVERY_WEIGHT;
  return baseScore + randomFactor;
}

function getMovieTitle(movie) {
  return movie.title[LANG] || movie.title.en || movie.title.km;
}

export async function startShortsMode() {
  const container = document.getElementById('shortsContainer');
  showLoadingState(container);
  
  document.addEventListener('keydown', handleShortsKeydown);
  
  const closeCommentBtn = document.getElementById('closeShortsCommentBtn');
  if (closeCommentBtn && !closeCommentBtn.dataset.bound) {
    closeCommentBtn.dataset.bound = 'true';
    closeCommentBtn.addEventListener('click', () => {
      document.getElementById('shortsCommentPanel').classList.remove('active');
    });
  }
  
  try {
    const data = await fetchDatabase();
    shortsDb = sortMoviesByPreference(data);
    renderFeed(container);
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
  container.innerHTML = '<div style="color:#fff; text-align:center; margin-top: 50vh;">Failed to load shorts feed.</div>';
}

async function fetchDatabase() {
  const res = await fetch('db/index.json');
  if (!res.ok) throw new Error('Failed to load db');
  return res.json();
}

function sortMoviesByPreference(data) {
  return data.sort((a, b) => scoreMovie(b) - scoreMovie(a));
}

function renderFeed(container) {
  container.innerHTML = '';
  observer = createIntersectionObserver(container);

  shortsDb.forEach(movie => {
    const wrapper = createShortWrapper(movie);
    setupActionListeners(wrapper, movie);
    container.appendChild(wrapper);
    observer.observe(wrapper);
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
  
  wrapper.innerHTML = generateShortHtml(movie, title);
  return wrapper;
}

function generateShortHtml(movie, title) {
  return `
    <img src="${movie.poster}" alt="${title}" style="width:100%; height:100%; object-fit:cover; position:absolute; inset:0;" />
    <div class="short-gradient-bottom"></div>
    ${generateInfoContainerHtml(movie, title)}
    ${generateActionsContainerHtml(movie)}
    <div class="video-container" style="position:absolute; inset:0; z-index:-1;"></div>
    ${generatePlayOverlayHtml()}
    ${generateProgressBarHtml()}
  `;
}

function generateProgressBarHtml() {
  return `
    <div class="short-progress-container">
      <div class="short-progress-bar">
        <div class="short-progress-filled"></div>
      </div>
    </div>
  `;
}

function getWatchLabel() {
  return LANG === 'km' ? 'មើលរឿងពេញ' : 'Watch Full Movie';
}

function getMoviePageLink(movie) {
  return `?id=${movie.slug}`;
}

function generateInfoContainerHtml(movie, title) {
  const genres = (movie.genres || []).join(' · ');
  return `
    <div class="short-info-container">
      <div class="short-author">@iblogger</div>
      <a class="short-title watch-link" href="${getMoviePageLink(movie)}">${title}</a>
      <div class="short-tags">${genres}</div>
      <a class="short-watch-btn watch-link" href="${getMoviePageLink(movie)}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        ${getWatchLabel()}
      </a>
      <div class="short-audio-track">
        <svg class="short-audio-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
        <div style="overflow:hidden; flex:1;">
          <div class="short-audio-marquee">Original Sound - iblogger</div>
        </div>
      </div>
    </div>
  `;
}

function generateActionsContainerHtml(movie) {
  const stats = getMockStats(movie.slug);
  return `
    <div class="short-actions-container">
      <div class="short-action-item">
        <button class="short-action-btn" style="background:transparent; border:2px solid #fff; padding:0; overflow:hidden;">
          <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>" style="width:100%;height:100%;object-fit:cover;background:#333;" alt="profile"/>
        </button>
      </div>
      <div class="short-action-item">
        <button class="short-action-btn like-btn" aria-label="Like" title="Like">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <span class="short-action-label like-count">${formatStat(stats.likes)}</span>
      </div>
      <div class="short-action-item">
        <button class="short-action-btn comment-btn" aria-label="Comment">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        </button>
        <span class="short-action-label">${formatStat(stats.comments)}</span>
      </div>
      <div class="short-action-item">
        <button class="short-action-btn share-btn" aria-label="Share">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
        </button>
        <span class="short-action-label">${formatStat(stats.shares)}</span>
      </div>
      ${generateSoundActionHtml()}
      <div class="short-audio-disc paused">
        <img src="${movie.poster}" alt="audio" />
      </div>
    </div>
  `;
}

function getSoundUi() {
  return soundOn
    ? { icon: SOUND_ON_ICON, label: 'Sound', toggleAction: 'Mute' }
    : { icon: SOUND_OFF_ICON, label: 'Muted', toggleAction: 'Unmute' };
}

function generateSoundActionHtml() {
  const ui = getSoundUi();
  return `
    <div class="short-action-item">
      <button class="short-action-btn sound-btn" aria-label="${ui.toggleAction}">
        ${ui.icon}
      </button>
      <span class="short-action-label sound-label">${ui.label}</span>
    </div>
  `;
}

function generatePlayOverlayHtml() {
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
}

function setupActionListeners(wrapper, movie) {
  setupLikeButton(wrapper, movie);
  setupShareButton(wrapper, movie);
  setupCommentButton(wrapper);
  setupSoundButton(wrapper);
  setupWatchLinks(wrapper, movie);
  setupPlayOverlay(wrapper, movie);
}

function setupCommentButton(wrapper) {
  const commentBtn = wrapper.querySelector('.comment-btn');
  commentBtn.addEventListener('click', () => {
    document.getElementById('shortsCommentPanel').classList.add('active');
  });
}

function setupSoundButton(wrapper) {
  const soundBtn = wrapper.querySelector('.sound-btn');
  soundBtn.addEventListener('click', () => setSoundEnabled(!soundOn));
}

function setSoundEnabled(isOn) {
  soundOn = isOn;
  localStorage.setItem('shorts_sound', isOn ? 'on' : 'off');
  players.forEach(player => player.muted(!isOn));
  refreshSoundButtons();
}

function refreshSoundButtons() {
  const ui = getSoundUi();
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
    link.addEventListener('click', () => boostGenres(movie.genres));
  });
}

function setupLikeButton(wrapper, movie) {
  const likeBtn = wrapper.querySelector('.like-btn');
  likeBtn.addEventListener('click', () => {
    likeBtn.classList.toggle('active');
    if (likeBtn.classList.contains('active')) {
      boostGenres(movie.genres);
    }
  });
}

function setupShareButton(wrapper, movie) {
  const shareBtn = wrapper.querySelector('.share-btn');
  shareBtn.addEventListener('click', () => {
    const link = `${location.origin}${location.pathname}${getMoviePageLink(movie)}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast(LANG === 'km' ? 'ចម្លងតំណភ្ជាប់ជោគជ័យ!' : 'Link copied!'))
      .catch(() => showToast('Failed to copy link'));
  });
}

function setupPlayOverlay(wrapper, movie) {
  const playOverlay = wrapper.querySelector('.short-play-overlay');
  const likeBtn = wrapper.querySelector('.like-btn');
  const heartAnim = wrapper.querySelector('.short-like-heart');
  const ripple = wrapper.querySelector('.short-ripple');
  
  let lastTap = 0;
  
  playOverlay.addEventListener('click', (e) => {
    const now = Date.now();
    const doubleTap = (now - lastTap) < 300;
    
    if (doubleTap) {
      // Trigger like on double tap
      lastTap = 0;
      if (!likeBtn.classList.contains('active')) {
        likeBtn.click();
      }
      
      // Heart animation
      heartAnim.style.transition = 'none';
      heartAnim.style.opacity = '1';
      heartAnim.style.transform = 'scale(0.5)';
      
      // Force reflow
      void heartAnim.offsetWidth;
      
      heartAnim.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out';
      heartAnim.style.transform = 'scale(1.2)';
      
      setTimeout(() => {
        heartAnim.style.transition = 'opacity 0.3s ease-out';
        heartAnim.style.opacity = '0';
      }, 600);
      
    } else {
      lastTap = now;
      setTimeout(() => {
        if (lastTap === now) {
          // Play/pause on single tap
          const player = players.get(movie.slug);
          if (!player) return;
          
          if (player.paused()) {
            player.play();
          } else {
            player.pause();
          }
          
          // Ripple animation
          ripple.style.transition = 'none';
          ripple.style.opacity = '1';
          ripple.style.transform = 'scale(0.5)';
          
          void ripple.offsetWidth;
          
          ripple.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
          ripple.style.transform = 'scale(2)';
          ripple.style.opacity = '0';
        }
      }, 300);
    }
  });
}

function handleShortsKeydown(e) {
  const shortsView = document.getElementById('shortsView');
  if (!shortsView || shortsView.style.display === 'none') return;
  
  const container = document.getElementById('shortsContainer');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    container.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
  }
}

function disposeOldPlayers(currentSlug) {
  const MAX_PLAYERS = 4;
  if (players.size > MAX_PLAYERS) {
    let toDelete = [];
    for (let [key, player] of players.entries()) {
      if (key !== currentSlug && player.paused()) {
        toDelete.push(key);
      }
    }
    while (toDelete.length > 0 && players.size > MAX_PLAYERS) {
      const key = toDelete.shift();
      const p = players.get(key);
      if (p) {
        p.dispose();
        players.delete(key);
        // Re-inject a fresh video container div for when we scroll back
        const wrapper = document.querySelector(\`.short-video-wrapper[data-slug="\${key}"]\`);
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
  boostGenres(genres);
  playVideoInWrapper(wrapper, slug);
  disposeOldPlayers(slug);
}

async function playVideoInWrapper(wrapper, slug) {
  let player = players.get(slug);
  if (!player) {
    player = await initializePlayer(slug, wrapper);
  }
  if (!player) return;

  bringVideoToFront(wrapper);
  playWithSoundPreference(player);
}

function bringVideoToFront(wrapper) {
  wrapper.querySelector('.video-container').style.zIndex = '1';
}

function playWithSoundPreference(player) {
  player.muted(!soundOn);
  if (!soundOn) showSoundHintOnce();
  const playback = player.play();
  if (playback && playback.catch) {
    playback.catch(() => fallBackToMutedPlayback(player));
  }
}

// Browsers reject unmuted autoplay before the first user gesture; recover by
// playing muted. Only the in-memory flag flips — the stored preference stays,
// so the next visit tries sound again.
function fallBackToMutedPlayback(player) {
  soundOn = false;
  player.muted(true);
  refreshSoundButtons();
  showSoundHintOnce();
  const retry = player.play();
  if (retry && retry.catch) {
    retry.catch(e => console.warn('Playback blocked:', e));
  }
}

function showSoundHintOnce() {
  if (soundHintShown) return;
  soundHintShown = true;
  showToast(LANG === 'km' ? 'ចុច 🔊 ដើម្បីបើកសំឡេង' : 'Tap 🔊 for sound');
}

async function initializePlayer(slug, wrapper) {
  try {
    const movieData = await fetchMovieDetails(slug);
    const randomEp = getRandomEpisode(movieData.episodes);
    if (!randomEp || !randomEp.url) return null;

    const videoEl = createVideoElement();
    wrapper.querySelector('.video-container').appendChild(videoEl);

    const player = createVideoJsInstance(videoEl, randomEp.url);
    players.set(slug, player);
    setupPlayerEventHandlers(player, wrapper);
    return player;
  } catch (e) {
    console.error('Failed to initialize short video:', e);
    return null;
  }
}

async function fetchMovieDetails(slug) {
  const res = await fetch(`db/${slug}.json`);
  if (!res.ok) throw new Error('Failed to fetch movie details');
  return res.json();
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

function createVideoJsInstance(videoElement, url) {
  return videojs(videoElement, {
    controls: false,
    autoplay: true,
    preload: 'auto',
    fluid: false,
    fill: true,
    sources: [{ src: url, type: 'application/x-mpegURL' }]
  });
}

function setupPlayerEventHandlers(player, wrapper) {
  const posterImg = wrapper.querySelector('img');
  const progressContainer = wrapper.querySelector('.short-progress-container');
  const progressFilled = wrapper.querySelector('.short-progress-filled');
  const audioDisc = wrapper.querySelector('.short-audio-disc');

  player.on('playing', () => {
    if (posterImg) posterImg.style.opacity = '0';
    togglePlayOverlayVisibility(wrapper, false);
    if (audioDisc) audioDisc.classList.remove('paused');
  });

  player.on('pause', () => {
    togglePlayOverlayVisibility(wrapper, true);
    if (audioDisc) audioDisc.classList.add('paused');
  });

  player.on('timeupdate', () => {
    const duration = player.duration();
    if (!duration) return;
    const percent = (player.currentTime() / duration) * 100;
    if (progressFilled) progressFilled.style.width = `${percent}%`;
  });

  if (progressContainer) {
    progressContainer.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the play/pause overlay
      const duration = player.duration();
      if (!duration) return;
      const rect = progressContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      player.currentTime(pos * duration);
    });
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
  const player = players.get(slug);
  if (player) {
    player.pause();
  }
}
