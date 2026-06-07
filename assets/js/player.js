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

export function playSource(url, videoEl) {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.style.display = "none";
  showLoader("Loading…");

  const isHls = /\.m3u8(\?|$)/i.test(url) || /index\.single$/i.test(url) || true;

  if (!window.player) {
    window.player = videojs(videoEl, {
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

    window.player.on("playing", hideLoader);
    window.player.on("waiting", () => showLoader("Buffering…"));
    window.player.on("canplay", hideLoader);
    window.player.on("ended", () => {
      if (onEndedCallback) onEndedCallback();
    });
    window.player.on("error", () => {
      showStatus("⚠️ Could not load this stream.<br>This is usually a " +
        "<strong>CORS</strong> restriction on the source server, or the link is offline.", true);
    });

    const qualityLevels = window.player.qualityLevels();
    qualityLevels.on('addqualitylevel', () => {
      const qButton = window.player.controlBar.getChild('QualityMenuButton');
      if (qButton) {
        qButton.update();
      }
    });
  } else {
    window.player.error(null);
  }

  const mimeType = isHls ? 'application/x-mpegURL' : 'video/mp4';
  window.player.src({
    src: url,
    type: mimeType
  });

  window.player.ready(() => {
    const p = window.player.play();
    if (p && p.catch) p.catch(() => {});
  });
}

export function setOnEnded(cb) {
  onEndedCallback = cb;
}
