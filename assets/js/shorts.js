import { LANG } from './utils.js';

let shortsDb = [];
let observer = null;
let currentSlug = null;
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

function scoreMovie(m) {
  if (!m.genres) return 0;
  return m.genres.reduce((sum, g) => sum + (prefs[g] || 0), 0) + Math.random() * 2; // Add some randomness
}

export async function startShortsMode() {
  const container = document.getElementById('shortsContainer');
  container.innerHTML = '<div style="color:#fff; text-align:center; margin-top: 50vh;">Loading Shorts...</div>';
  
  try {
    const res = await fetch('db/index.json');
    if (!res.ok) throw new Error('Failed to load db');
    const data = await res.json();
    
    // Sort by preferences
    shortsDb = data.sort((a, b) => scoreMovie(b) - scoreMovie(a));
    
    renderFeed(container);
  } catch (err) {
    container.innerHTML = '<div style="color:#fff; text-align:center; margin-top: 50vh;">Failed to load shorts feed.</div>';
    console.error(err);
  }
}

function renderFeed(container) {
  container.innerHTML = '';
  
  // Setup intersection observer
  observer = new IntersectionObserver(handleIntersect, {
    root: container,
    threshold: 0.6
  });

  shortsDb.forEach(m => {
    const title = m.title[LANG] || m.title.en || m.title.km;
    const wrapper = document.createElement('div');
    wrapper.className = 'short-video-wrapper';
    wrapper.dataset.slug = m.slug;
    wrapper.dataset.genres = JSON.stringify(m.genres || []);
    
    // Initial state: just poster
    wrapper.innerHTML = `
      <img src="${m.poster}" alt="${title}" style="width:100%; height:100%; object-fit:cover; position:absolute; inset:0;" />
      <div class="short-overlay">
        <div class="short-title">${title}</div>
        <div class="short-tags">${(m.genres || []).join(' · ')}</div>
      </div>
      <div class="short-actions">
        <button class="short-action-btn like-btn" aria-label="Like" title="Like">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
      </div>
      <div class="video-container" style="position:absolute; inset:0; z-index:-1;"></div>
    `;
    
    // Like button logic
    const likeBtn = wrapper.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => {
      likeBtn.classList.toggle('active');
      if (likeBtn.classList.contains('active')) {
        boostGenres(m.genres);
      }
    });

    container.appendChild(wrapper);
    observer.observe(wrapper);
  });
}

async function handleIntersect(entries) {
  for (const entry of entries) {
    const wrapper = entry.target;
    const slug = wrapper.dataset.slug;
    
    if (entry.isIntersecting) {
      currentSlug = slug;
      // Boost genres for watching
      const genres = JSON.parse(wrapper.dataset.genres || '[]');
      boostGenres(genres);
      
      await playVideoInWrapper(wrapper, slug);
    } else {
      pauseVideoInWrapper(wrapper);
    }
  }
}

const players = new Map();

async function playVideoInWrapper(wrapper, slug) {
  let player = players.get(slug);
  const vContainer = wrapper.querySelector('.video-container');
  const img = wrapper.querySelector('img');
  
  if (!player) {
    try {
      // Fetch details to get stream URL
      const res = await fetch(`db/${slug}.json`);
      if (!res.ok) return;
      const data = await res.json();
      const firstEp = data.episodes[0];
      if (!firstEp || !firstEp.url) return;
      
      const videoEl = document.createElement('video');
      videoEl.className = 'video-js vjs-default-skin';
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('loop', 'true');
      videoEl.setAttribute('muted', 'true'); // Autoplay requires muted initially usually, or just try playing
      vContainer.appendChild(videoEl);
      vContainer.style.zIndex = '1';
      
      player = videojs(videoEl, {
        controls: false, // Shorts usually don't have standard controls
        autoplay: true,
        preload: 'auto',
        fluid: false,
        fill: true,
        sources: [{ src: firstEp.url, type: 'application/x-mpegURL' }]
      });
      
      players.set(slug, player);
      
      player.on('playing', () => {
        if (img) img.style.opacity = '0';
      });
      
    } catch (e) {
      console.error('Failed to load short video', e);
    }
  } else {
    vContainer.style.zIndex = '1';
    try {
      player.play();
    } catch(e){}
  }
}

function pauseVideoInWrapper(wrapper) {
  const slug = wrapper.dataset.slug;
  const player = players.get(slug);
  if (player) {
    player.pause();
  }
}
