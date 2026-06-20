// Video.js playback & quality controls

import { hideLoader, showLoader, showStatus, showToast, playPopSound, playRetroClickSound, LANG, triggerOsd } from './utils.js';

let onEndedCallback = null;
let onProgressCallback = null;

// Register custom Quality menu component in Video.js
const MenuButton = videojs.getComponent('MenuButton');
const MenuItem = videojs.getComponent('MenuItem');

class QualityMenuItem extends MenuItem {
  constructor(player, options) {
    super(player, options);
    this.levelIndex = options.levelIndex;
  }

  handleClick(event) {
    super.handleClick(event);
    const qualityLevels = this.player_.qualityLevels();
    
    for (let i = 0; i < qualityLevels.length; i++) {
      if (this.levelIndex === -1) {
        qualityLevels[i].enabled = true; // Auto
      } else {
        qualityLevels[i].enabled = (i === this.levelIndex);
      }
    }
    
    const menuButton = this.player_.controlBar.getChild('QualityMenuButton');
    if (menuButton) {
      menuButton.items.forEach(item => {
        item.selected(item === this);
      });
    }
  }
}

class QualityMenuButton extends MenuButton {
  constructor(player, options) {
    super(player, options);
    this.controlText('Quality');
  }

  buildCSSClass() {
    return `vjs-quality-button vjs-icon-cog ${super.buildCSSClass()}`;
  }

  createItems() {
    const items = [];
    const qualityLevels = this.player_.qualityLevels();
    if (!qualityLevels) return items;

    let autoEnabled = true;
    let activeIndex = -1;
    let enabledCount = 0;

    for (let i = 0; i < qualityLevels.length; i++) {
      if (qualityLevels[i].enabled) {
        enabledCount++;
        activeIndex = i;
      }
    }
    if (enabledCount === 1) {
      autoEnabled = false;
    }

    items.push(new QualityMenuItem(this.player_, {
      label: 'Auto',
      levelIndex: -1,
      selected: autoEnabled
    }));

    const uniqueHeights = new Set();
    const levels = [];
    for (let i = 0; i < qualityLevels.length; i++) {
      const h = qualityLevels[i].height;
      if (h && !uniqueHeights.has(h)) {
        uniqueHeights.add(h);
        levels.push({
          index: i,
          height: h
        });
      }
    }

    levels.sort((a, b) => b.height - a.height);

    levels.forEach(level => {
      items.push(new QualityMenuItem(this.player_, {
        label: level.height + 'p',
        levelIndex: level.index,
        selected: !autoEnabled && level.index === activeIndex
      }));
    });

    this.items = items;
    return items;
  }
}

videojs.registerComponent('QualityMenuButton', QualityMenuButton);

function initializeVideoPlayer(videoEl) {
  const player = videojs(videoEl, {
    controls: true,
    autoplay: true,
    preload: 'auto',
    playbackRates: [0.5, 1, 1.25, 1.5, 2],
    controlBar: {
      children: [
        'playToggle',
        'volumePanel',
        'currentTimeDisplay',
        'timeDivider',
        'durationDisplay',
        'progressControl',
        'playbackRateMenuButton',
        'QualityMenuButton',
        'pictureInPictureToggle',
        'fullscreenToggle'
      ]
    }
  });

  player.on("playing", () => {
    hideLoader();
    const tv = document.querySelector('.tv');
    const led = document.querySelector('.tv-led');
    if (tv) tv.classList.add('playing');
    if (led) led.classList.add('playing-state');
  });
  player.on("pause", () => {
    const tv = document.querySelector('.tv');
    const led = document.querySelector('.tv-led');
    if (tv) tv.classList.remove('playing');
    if (led) led.classList.remove('playing-state');
  });
  player.on("waiting", () => {
    showLoader("Buffering…");
    const tv = document.querySelector('.tv');
    if (tv) tv.classList.remove('playing');
  });
  player.on("ended", () => {
    const tv = document.querySelector('.tv');
    const led = document.querySelector('.tv-led');
    if (tv) tv.classList.remove('playing');
    if (led) led.classList.remove('playing-state');
    if (onEndedCallback) onEndedCallback();
  });
  player.on("canplay", hideLoader);
  player.on("timeupdate", () => {
    if (onProgressCallback) onProgressCallback(player.currentTime(), player.duration());
  });
  player.on("error", () => {
    showStatus("⚠️ Could not load this stream.<br>This is usually a " +
      "<strong>CORS</strong> restriction on the source server, or the link is offline.", true);
  });

  const qualityLevels = player.qualityLevels();
  qualityLevels.on('addqualitylevel', () => {
    const qButton = player.controlBar.getChild('QualityMenuButton');
    if (qButton) {
      qButton.update();
    }
  });

  // ── Scroll Wheel Volume & Double Click Seek ──
  const playerBox = document.querySelector('.player-box');
  if (playerBox) {
    // Scroll Wheel Volume
    if (!playerBox.dataset.wheelBound) {
      playerBox.dataset.wheelBound = 'true';
      playerBox.addEventListener('wheel', (e) => {
        e.preventDefault();
        const currentVolume = player.volume();
        const isUp = e.deltaY < 0;
        const newVolume = isUp ? Math.min(1, currentVolume + 0.05) : Math.max(0, currentVolume - 0.05);
        player.volume(newVolume);
        const percent = Math.round(newVolume * 100);
        showToast(`${LANG === "km" ? "កម្រិតសំឡេង" : "Volume"}: ${percent}%`);
      }, { passive: false });
    }

    // Double-Click Seek (Left/Right half)
    if (!playerBox.dataset.dblclickBound) {
      playerBox.dataset.dblclickBound = 'true';
      playerBox.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = playerBox.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isLeft = clickX < rect.width / 2;
        const seekStep = 10;
        
        const currentTime = player.currentTime();
        let newTime;
        if (isLeft) {
          newTime = Math.max(0, currentTime - seekStep);
        } else {
          const duration = player.duration();
          newTime = Math.min(duration || Infinity, currentTime + seekStep);
        }
        
        player.currentTime(newTime);
        showSeekOverlay(isLeft, seekStep);
      }, true); // Capturing phase
    }
  }

  // ── Skip Intro Button (+90s) ──
  player.ready(() => {
    const playerEl = player.el();
    if (playerEl) {
      let skipBtn = playerEl.querySelector(".vjs-skip-intro-btn");
      if (!skipBtn) {
        skipBtn = document.createElement("button");
        skipBtn.className = "vjs-skip-intro-btn";
        skipBtn.innerHTML = `
          <span class="lang-km-block">រំលងវគ្គផ្តើម (+90វិ)</span>
          <span class="lang-en-block">Skip Intro (+90s)</span>
        `;
        playerEl.appendChild(skipBtn);
        skipBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const newTime = Math.min(player.duration() || Infinity, player.currentTime() + 90);
          player.currentTime(newTime);
          showSeekOverlay(false, 90);
          playPopSound();
        });
      }
    }
  });

  player.on("timeupdate", () => {
    const time = player.currentTime();
    const duration = player.duration();
    const skipBtn = player.el() ? player.el().querySelector(".vjs-skip-intro-btn") : null;
    if (skipBtn) {
      if (time >= 5 && time <= 90 && duration > 300) {
        skipBtn.classList.add("visible");
      } else {
        skipBtn.classList.remove("visible");
      }
    }
  });

  // ── TV Bezel Skeuomorphic Click Controls ──
  const ledEl = document.querySelector('.tv-led');
  const powerEl = document.querySelector('.tv-power');
  
  const togglePlay = (e) => {
    e.preventDefault();
    playRetroClickSound();
    if (player.paused()) {
      player.play();
    } else {
      player.pause();
    }
  };

  if (ledEl && !ledEl.dataset.bound) {
    ledEl.dataset.bound = 'true';
    ledEl.addEventListener('click', togglePlay);
    ledEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        togglePlay(e);
      }
    });
  }
  if (powerEl && !powerEl.dataset.bound) {
    powerEl.dataset.bound = 'true';
    powerEl.addEventListener('click', togglePlay);
    powerEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        togglePlay(e);
      }
    });
  }

  // ── Cinematic Ambient Glow Frame Sampler ──
  const ambientCanvas = document.getElementById("ambientGlowCanvas");
  if (ambientCanvas) {
    const ambientCtx = ambientCanvas.getContext("2d", { alpha: false });
    ambientCanvas.width = 32;
    ambientCanvas.height = 18;
    
    let ambientInterval = null;
    
    const drawFrame = () => {
      if (player.paused() || player.ended()) return;
      try {
        ambientCtx.drawImage(videoEl, 0, 0, ambientCanvas.width, ambientCanvas.height);
      } catch (err) {
        // Silently swallow errors (e.g. video frame not ready yet)
      }
    };
    
    player.on("playing", () => {
      if (!ambientInterval) {
        // Sample every 150ms for low overhead & dynamic color transitions
        ambientInterval = setInterval(drawFrame, 150);
      }
    });
    
    player.on("pause", () => {
      if (ambientInterval) {
        clearInterval(ambientInterval);
        ambientInterval = null;
      }
    });
    
    player.on("ended", () => {
      if (ambientInterval) {
        clearInterval(ambientInterval);
        ambientInterval = null;
      }
      ambientCtx.fillStyle = "#000000";
      ambientCtx.fillRect(0, 0, ambientCanvas.width, ambientCanvas.height);
    });
  }

  setupVolumeDial(player);
  return player;
}

export function playSource(url, videoEl) {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.style.display = "none";
  showLoader("Loading…");

  const isHls = /\.m3u8(\?|$)/i.test(url) || /index\.single$/i.test(url) || true;

  if (!window.player) {
    window.player = initializeVideoPlayer(videoEl);
  } else {
    window.player.error(null);
  }

  const mimeType = isHls ? 'application/x-mpegURL' : 'video/mp4';
  window.player.src({
    src: url,
    type: mimeType
  });

  window.player.ready(() => {
    const playPromise = window.player.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => {});
    }
  });
}

export function setOnEnded(cb) {
  onEndedCallback = cb;
}

export function setOnProgress(cb) {
  onProgressCallback = cb;
}

export function seekWhenReady(seconds) {
  if (!window.player) return;
  window.player.one("loadedmetadata", () => {
    window.player.currentTime(seconds);
  });
}

function showSeekOverlay(isLeft, seconds) {
  if (!window.player) return;
  const playerEl = window.player.el();
  if (!playerEl) return;

  let overlay = playerEl.querySelector(".vjs-seek-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "vjs-seek-overlay";
    playerEl.appendChild(overlay);
  }

  // Reset classes and set correct seeking class
  overlay.className = "vjs-seek-overlay";
  overlay.classList.add(isLeft ? "seek-left" : "seek-right");

  // SVG for left/right chevrons
  const leftSvg = `<svg viewBox="0 0 24 24"><path d="M11.5 12l8.5-8v16L11.5 12zm-9 0L11 4v16L2.5 12z"/></svg>`;
  const rightSvg = `<svg viewBox="0 0 24 24"><path d="M12.5 12L4 4v16l8.5-8zm9 0L13 4v16l8.5-8z"/></svg>`;

  overlay.innerHTML = `
    ${isLeft ? leftSvg : rightSvg}
    <span>${isLeft ? "-" : "+"}${seconds}s</span>
  `;

  // Trigger animation reflow
  overlay.classList.remove("show");
  void overlay.offsetWidth;
  overlay.classList.add("show");

  // Clear existing timeout
  if (overlay.timeoutId) {
    clearTimeout(overlay.timeoutId);
  }

  overlay.timeoutId = setTimeout(() => {
    overlay.classList.remove("show");
  }, 600);
}

let globalKeydownHandler = null;

export function bindPlayerKeys() {
  if (globalKeydownHandler) return;
  globalKeydownHandler = (e) => {
    if (!window.player) return;

    const playerView = document.getElementById("playerView");
    if (!playerView || playerView.style.display === "none") return;

    // Ignore seeking when typing in form controls
    const active = document.activeElement;
    if (active && (
      active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.tagName === "SELECT" ||
      active.isContentEditable
    )) {
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const isLeft = e.key === "ArrowLeft";
      const seekStep = 10;
      const currentTime = window.player.currentTime();
      
      let newTime;
      if (isLeft) {
        newTime = Math.max(0, currentTime - seekStep);
      } else {
        const duration = window.player.duration();
        newTime = Math.min(duration || Infinity, currentTime + seekStep);
      }
      
      window.player.currentTime(newTime);
      showSeekOverlay(isLeft, seekStep);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const isUp = e.key === "ArrowUp";
      const currentVolume = window.player.volume();
      const newVolume = isUp ? Math.min(1, currentVolume + 0.1) : Math.max(0, currentVolume - 0.1);
      window.player.volume(newVolume);
      const percent = Math.round(newVolume * 100);
      showToast(`${LANG === "km" ? "កម្រិតសំឡេង" : "Volume"}: ${percent}%`);
    } else if (e.key === "Escape") {
      e.preventDefault();
      const params = new URLSearchParams(location.search);
      const lang = params.get("lang");
      location.href = lang ? `./?lang=${lang}` : `./`;
    } else if (e.key === "k" || e.key === "K" || e.key === " ") {
      e.preventDefault();
      if (window.player.paused()) {
        window.player.play();
      } else {
        window.player.pause();
      }
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      if (window.player.isFullscreen()) {
        window.player.exitFullscreen();
      } else {
        window.player.requestFullscreen();
      }
    } else if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      window.player.muted(!window.player.muted());
    } else if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      const theaterBtn = document.getElementById("theaterToggle");
      if (theaterBtn) theaterBtn.click();
    } else if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const percent = parseInt(e.key) / 10;
      const duration = window.player.duration();
      if (duration) {
        window.player.currentTime(duration * percent);
        showToast(`${LANG === "km" ? "ឆ្ពោះទៅ" : "Seek to"}: ${percent * 100}%`);
      }
    } else if (e.key === ">" || e.key === "." || e.key === "Period") {
      e.preventDefault();
      adjustPlaybackRate(true);
    } else if (e.key === "<" || e.key === "," || e.key === "Comma") {
      e.preventDefault();
      adjustPlaybackRate(false);
    }
  };
  document.addEventListener("keydown", globalKeydownHandler);
}

export function unbindPlayerKeys() {
  if (!globalKeydownHandler) return;
  document.removeEventListener("keydown", globalKeydownHandler);
  globalKeydownHandler = null;
}

function adjustPlaybackRate(increase) {
  if (!window.player) return;
  const rates = [0.5, 1, 1.25, 1.5, 2];
  const current = window.player.playbackRate();
  let index = rates.indexOf(current);
  if (index === -1) {
    let minDiff = Infinity;
    rates.forEach((r, i) => {
      const diff = Math.abs(r - current);
      if (diff < minDiff) {
        minDiff = diff;
        index = i;
      }
    });
  }
  
  let newIndex = increase ? index + 1 : index - 1;
  if (newIndex >= 0 && newIndex < rates.length) {
    const newRate = rates[newIndex];
    window.player.playbackRate(newRate);
    playPopSound(); // play pop feedback
    showToast(`${LANG === "km" ? "ល្បឿនចាក់" : "Speed"}: ${newRate}x`);
    showSpeedOverlay(newRate);
  }
}

function showSpeedOverlay(rate) {
  if (!window.player) return;
  const playerEl = window.player.el();
  if (!playerEl) return;

  let overlay = playerEl.querySelector(".vjs-speed-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "vjs-speed-overlay";
    playerEl.appendChild(overlay);
  }

  let emoji = "▶️";
  if (rate > 1) {
    emoji = "🐇";
  } else if (rate < 1) {
    emoji = "🐢";
  } else {
    emoji = "⏺️";
  }

  overlay.innerHTML = `
    <div class="vjs-speed-icon">${emoji}</div>
    <div class="vjs-speed-text">${rate}x</div>
  `;

  // Trigger animation reflow
  overlay.classList.remove("show");
  void overlay.offsetWidth;
  overlay.classList.add("show");

  // Clear existing timeout
  if (overlay.timeoutId) {
    clearTimeout(overlay.timeoutId);
  }

  overlay.timeoutId = setTimeout(() => {
    overlay.classList.remove("show");
  }, 600);
}

function updateVolumeDial(volume) {
  const dial = document.getElementById("volumeDial");
  if (!dial) return;
  const degrees = (volume * 240) - 120;
  dial.style.setProperty("--volume-rotate", `${degrees}deg`);
}

function setupVolumeDial(player) {
  const dial = document.getElementById("volumeDial");
  if (!dial) return;

  if (dial.dataset.bound) {
    updateVolumeDial(player.volume());
    return;
  }
  dial.dataset.bound = 'true';

  updateVolumeDial(player.volume());

  player.on('volumechange', () => {
    const vol = player.volume();
    updateVolumeDial(vol);
    const percent = Math.round(vol * 100);
    triggerOsd(`VOL ${percent}%`);
  });

  const adjustVolume = (delta) => {
    const current = player.volume();
    const next = Math.max(0, Math.min(1, current + delta));
    player.volume(next);
    const percent = Math.round(next * 100);
    showToast(`${LANG === "km" ? "កម្រិតសំឡេង" : "Volume"}: ${percent}%`);
  };

  dial.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    adjustVolume(delta);
  }, { passive: false });

  let isDragging = false;
  let startAngle = 0;
  let startVolume = 0;

  dial.addEventListener("mousedown", (e) => {
    isDragging = true;
    startVolume = player.volume();
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    let diff = currentAngle - startAngle;

    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    const volDelta = (diff / 2.5);
    const nextVolume = Math.max(0, Math.min(1, startVolume + volDelta));
    player.volume(nextVolume);
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  dial.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      adjustVolume(0.05);
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      adjustVolume(-0.05);
    }
  });
}

