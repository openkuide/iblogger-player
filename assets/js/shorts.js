import { LANG, showToast } from './utils.js';

const players = new Map();
let shortsDb = [];
let observer = null;
let prefs = JSON.parse(localStorage.getItem('shorts_prefs') || '{}');

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
  const randomFactor = Math.random() * 2;
  return baseScore + randomFactor;
}

function getMovieTitle(movie) {
  return movie.title[LANG] || movie.title.en || movie.title.km;
}

export async function startShortsMode() {
  const container = document.getElementById('shortsContainer');
  showLoadingState(container);
  
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
  container.innerHTML = '<div style="color:#fff; text-align:center; margin-top: 50vh;">Loading Shorts...</div>';
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
    threshold: 0.6
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
  `;
}

function generateInfoContainerHtml(movie, title) {
  const genres = (movie.genres || []).join(' · ');
  return `
    <div class="short-info-container">
      <div class="short-author">@iblogger</div>
      <div class="short-title">${title}</div>
      <div class="short-tags">${genres}</div>
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
        <span class="short-action-label">Like</span>
      </div>
      <div class="short-action-item">
        <button class="short-action-btn comment-btn" aria-label="Comment">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        </button>
        <span class="short-action-label">12</span>
      </div>
      <div class="short-action-item">
        <button class="short-action-btn share-btn" aria-label="Share">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
        </button>
        <span class="short-action-label">Share</span>
      </div>
      <div class="short-audio-disc">
        <img src="${movie.poster}" alt="audio" />
      </div>
    </div>
  `;
}

function generatePlayOverlayHtml() {
  return `
    <div class="short-play-overlay" style="position:absolute; inset:0; z-index:1001; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0; transition:opacity 0.2s;">
      <div style="width:80px; height:80px; background:rgba(0,0,0,0.4); border-radius:50%; display:grid; place-items:center;">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="#fff" style="margin-left:4px;"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
  `;
}

function setupActionListeners(wrapper, movie) {
  setupLikeButton(wrapper, movie);
  setupShareButton(wrapper, movie);
  setupPlayOverlay(wrapper, movie);
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
    const link = `${location.origin}${location.pathname}?id=${movie.slug}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast(LANG === 'km' ? 'ចម្លងតំណភ្ជាប់ជោគជ័យ!' : 'Link copied!'))
      .catch(() => showToast('Failed to copy link'));
  });
}

function setupPlayOverlay(wrapper, movie) {
  const playOverlay = wrapper.querySelector('.short-play-overlay');
  playOverlay.addEventListener('click', () => {
    const player = players.get(movie.slug);
    if (!player) return;
    
    if (player.paused()) {
      player.play();
    } else {
      player.pause();
    }
  });
}

async function handleIntersect(entries) {
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
}

async function playVideoInWrapper(wrapper, slug) {
  let player = players.get(slug);
  const vContainer = wrapper.querySelector('.video-container');
  const img = wrapper.querySelector('img');
  
  if (!player) {
    player = await initializePlayer(slug, vContainer, img, wrapper);
  } 
  
  if (player) {
    vContainer.style.zIndex = '1';
    try {
      player.play();
    } catch (e) {
      console.warn('Playback interrupted:', e);
    }
  }
}

async function initializePlayer(slug, container, img, wrapper) {
  try {
    const movieData = await fetchMovieDetails(slug);
    const randomEp = getRandomEpisode(movieData.episodes);
    
    if (!randomEp || !randomEp.url) return null;
    
    const videoEl = createVideoElement();
    container.appendChild(videoEl);
    container.style.zIndex = '1';
    
    const player = createVideoJsInstance(videoEl, randomEp.url);
    players.set(slug, player);
    
    setupPlayerEventHandlers(player, img, wrapper);
    
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

function setupPlayerEventHandlers(player, img, wrapper) {
  player.on('playing', () => {
    if (img) img.style.opacity = '0';
    togglePlayOverlayVisibility(wrapper, false);
  });
  
  player.on('pause', () => {
    togglePlayOverlayVisibility(wrapper, true);
  });
}

function togglePlayOverlayVisibility(wrapper, isVisible) {
  const playOverlay = wrapper.querySelector('.short-play-overlay');
  if (playOverlay) {
    playOverlay.style.opacity = isVisible ? '1' : '0';
  }
}

function pauseVideoInWrapper(slug) {
  const player = players.get(slug);
  if (player) {
    player.pause();
  }
}
