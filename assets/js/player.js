// Video.js playback & quality controls

import { hideLoader, showLoader, showStatus } from './utils.js';

let onEndedCallback = null;

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
        'fullscreenToggle'
      ]
    }
  });

  player.on("playing", hideLoader);
  player.on("waiting", () => showLoader("Buffering…"));
  player.on("canplay", hideLoader);
  player.on("ended", () => {
    if (onEndedCallback) onEndedCallback();
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

// Global hotkey handler for seeking
document.addEventListener("keydown", (e) => {
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
  }
});

