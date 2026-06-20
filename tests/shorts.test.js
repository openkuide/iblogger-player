/**
 * Integration tests for the vertical Shorts mode, interactions, HUD overlays, nudges, and fallback errors.
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function runShortsTests(ctx) {
  const initialSlug = await navigateToShorts(ctx.page, ctx.PORT);
  await verifyShortsLayout(ctx.page, initialSlug);
  await testSoundToggle(ctx.page);
  await testLikeFloatBadge(ctx.page);
  await testLongPressSpeedBoost(ctx.page);
  await testDragToScrub(ctx.page);
  await testKeyboardShortcutsPanel(ctx.page);
  await testScrollNavigationAndUrlSync(ctx.page, initialSlug);
  await testWatchLinkParams(ctx.page);
  await testRepetitionSuppression(ctx.page, initialSlug);
  await testInactivityNudge(ctx.page);
  await testErrorFallbackOverlay(ctx.page, ctx.PORT);
  console.log('[TEST SHORTS] All Shorts mode tests passed successfully.');
}

async function navigateToShorts(page, port) {
  console.log('[TEST SHORTS] Navigating to Shorts mode...');
  await page.goto(`http://127.0.0.1:${port}/index.html?mode=shorts&id=only-my-brother-for-this-throne`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.short-video-wrapper', { timeout: 30000 });
  
  const slug = await page.evaluate(() => {
    return document.querySelector('.short-video-wrapper').dataset.slug;
  });
  return slug;
}

async function verifyShortsLayout(page, initialSlug) {
  const shortsUi = await page.evaluate(() => {
    const wrapper = document.querySelector('.short-video-wrapper');
    const watchBtn = wrapper.querySelector('a.short-watch-btn');
    const titleLink = wrapper.querySelector('a.short-title');
    const soundBtn = wrapper.querySelector('.sound-btn');
    return {
      watchHref: watchBtn ? watchBtn.getAttribute('href') : null,
      titleHref: titleLink ? titleLink.getAttribute('href') : null,
      hasSoundBtn: !!soundBtn
    };
  });

  const expectedPrefix = `?id=${initialSlug}`;
  const isWatchLinkOk = shortsUi.watchHref && shortsUi.watchHref.startsWith(expectedPrefix);
  const isTitleLinkOk = shortsUi.titleHref && shortsUi.titleHref.startsWith(expectedPrefix);
  if (!shortsUi.hasSoundBtn || !isWatchLinkOk || !isTitleLinkOk) {
    throw new Error(`[TEST SHORTS] Shorts UI layout or links incorrect: ${JSON.stringify(shortsUi)}`);
  }
}

async function testSoundToggle(page) {
  console.log('[TEST SHORTS] Waiting for first short video to initialize...');
  await page.waitForSelector('.short-video-wrapper video', { timeout: 35000 });

  const mutedBefore = await page.evaluate(() => {
    return document.querySelector('.short-video-wrapper video').muted;
  });

  console.log('[TEST SHORTS] Clicking sound toggle...');
  await page.evaluate(() => document.querySelector('.sound-btn').click());
  await delay(200);

  const soundState = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.sound-label')).slice(0, 3);
    return {
      muted: document.querySelector('.short-video-wrapper video').muted,
      labels: labels.map(l => l.textContent.trim()),
      stored: localStorage.getItem('shorts_sound')
    };
  });

  const labelsSynced = soundState.labels.every(l => l === 'Sound');
  if (mutedBefore !== true || soundState.muted !== false || !labelsSynced || soundState.stored !== 'on') {
    throw new Error(`[TEST SHORTS] Sound toggle did not unmute globally or sync: ${JSON.stringify({ mutedBefore, ...soundState })}`);
  }
}

async function testLikeFloatBadge(page) {
  console.log('[TEST SHORTS] Testing float like badge...');
  const likeBadgeExists = await page.evaluate(async () => {
    const wrapper = document.querySelector('.short-video-wrapper');
    const likeBtn = wrapper.querySelector('.like-btn');
    likeBtn.click();
    const badge = wrapper.querySelector('.like-float-badge');
    const hasBadge = !!badge && badge.textContent === '+1 ❤️';
    await new Promise(r => setTimeout(r, 900));
    const badgeRemoved = !wrapper.querySelector('.like-float-badge');
    return hasBadge && badgeRemoved;
  });

  if (!likeBadgeExists) {
    throw new Error('[TEST SHORTS] Like floating badge did not render or clean up properly.');
  }
}

async function testLongPressSpeedBoost(page) {
  console.log('[TEST SHORTS] Simulating long press for 2x speed...');
  await page.evaluate(async () => {
    const wrapper = document.querySelector('.short-video-wrapper');
    const video = wrapper.querySelector('video');
    if (video && video.paused) {
      try {
        await video.play();
      } catch (e) {}
    }
  });

  await page.evaluate(() => {
    const overlay = document.querySelector('.short-video-wrapper .short-play-overlay');
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    }
  });

  await delay(500); // threshold is 450ms

  const pressState = await page.evaluate(() => {
    const wrapper = document.querySelector('.short-video-wrapper');
    const video = wrapper.querySelector('video');
    const hud = wrapper.querySelector('.short-ff-hud');
    const isFfActive = wrapper.classList.contains('ff-active');
    const hasHudText = hud && (hud.textContent.includes('2x Speed') || hud.textContent.includes('ល្បឿន 2x'));
    const playbackRate = video ? video.playbackRate : 1.0;
    return { isFfActive, hasHudText, playbackRate };
  });

  await page.evaluate(() => {
    const overlay = document.querySelector('.short-video-wrapper .short-play-overlay');
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    }
  });

  await delay(100); // wait for reset

  const postPressState = await page.evaluate(() => {
    const wrapper = document.querySelector('.short-video-wrapper');
    const video = wrapper.querySelector('video');
    const isFfActive = wrapper.classList.contains('ff-active');
    const playbackRate = video ? video.playbackRate : 1.0;
    return { isFfActive, playbackRate };
  });

  const longPressSuccess = pressState.isFfActive && pressState.hasHudText && pressState.playbackRate === 2 &&
                           !postPressState.isFfActive && postPressState.playbackRate === 1;

  if (!longPressSuccess) {
    throw new Error(`[TEST SHORTS] Long-press speed boost failed: ${JSON.stringify({ pressState, postPressState })}`);
  }
}

async function testDragToScrub(page) {
  console.log('[TEST SHORTS] Testing progress bar drag-to-scrub...');
  const scrubSuccess = await page.evaluate(async () => {
    const container = document.querySelector('.short-video-wrapper .short-progress-container');
    if (!container) return null;
    const tooltip = container.querySelector('.short-scrub-tooltip');
    
    const rect = container.getBoundingClientRect();
    const xStart = rect.left + rect.width * 0.1;
    const yStart = rect.top + rect.height / 2;
    const xMid = rect.left + rect.width * 0.5;
    
    container.dispatchEvent(new PointerEvent('pointerdown', { clientX: xStart, clientY: yStart, bubbles: true }));
    container.dispatchEvent(new PointerEvent('pointermove', { clientX: xMid, clientY: yStart, bubbles: true }));
    
    const isScrubbingClassAdded = container.classList.contains('scrubbing');
    const tooltipTextDuring = tooltip ? tooltip.textContent : '';
    
    container.dispatchEvent(new PointerEvent('pointerup', { clientX: xMid, clientY: yStart, bubbles: true }));
    const isScrubbingClassRemoved = !container.classList.contains('scrubbing');
    
    return { isScrubbingClassAdded, tooltipTextDuring, isScrubbingClassRemoved };
  });

  const isScrubOk = scrubSuccess &&
                   scrubSuccess.isScrubbingClassAdded &&
                   scrubSuccess.tooltipTextDuring.includes('/') &&
                   scrubSuccess.isScrubbingClassRemoved;

  if (!isScrubOk) {
    throw new Error(`[TEST SHORTS] Progress bar drag-to-scrub failed: ${JSON.stringify(scrubSuccess)}`);
  }
}

async function testKeyboardShortcutsPanel(page) {
  console.log('[TEST SHORTS] Testing Keyboard Shortcuts Panel...');
  const keyboardTest = await page.evaluate(async () => {
    const kPanel = document.getElementById('shortsKeyboardPanel');
    if (!kPanel) return { error: 'Keyboard panel not found' };
    const wrapper = document.querySelector('.short-video-wrapper');
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    const isOpenedWithQuestionMark = kPanel.classList.contains('active');
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const isClosedWithEscape = !kPanel.classList.contains('active');
    
    const keysBtn = wrapper.querySelector('.keyboard-btn');
    if (keysBtn) keysBtn.click();
    const isOpenedWithSidebarBtn = kPanel.classList.contains('active');
    
    const closeBtn = document.getElementById('closeShortsKeyboardBtn');
    if (closeBtn) closeBtn.click();
    const isClosedWithCloseBtn = !kPanel.classList.contains('active');
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    const hud = wrapper.querySelector('.short-keystroke-hud');
    const hasKeystrokeHud = !!hud;
    const hudKey = hud ? hud.querySelector('kbd').textContent : '';
    const isHudActive = hud && hud.classList.contains('active');
    
    return { isOpenedWithQuestionMark, isClosedWithEscape, isOpenedWithSidebarBtn, isClosedWithCloseBtn, hasKeystrokeHud, hudKey, isHudActive };
  });

  const isKeyboardOk = keyboardTest &&
                       keyboardTest.isOpenedWithQuestionMark &&
                       keyboardTest.isClosedWithEscape &&
                       keyboardTest.isOpenedWithSidebarBtn &&
                       keyboardTest.isClosedWithCloseBtn &&
                       keyboardTest.hasKeystrokeHud &&
                       keyboardTest.hudKey === 'Space' &&
                       keyboardTest.isHudActive;

  if (!isKeyboardOk) {
    throw new Error(`[TEST SHORTS] Keyboard shortcuts HUD panel failed: ${JSON.stringify(keyboardTest)}`);
  }
}

async function testScrollNavigationAndUrlSync(page, initialSlug) {
  console.log('[TEST SHORTS] Testing scroll navigation chevrons and dynamic URL sync...');
  await page.evaluate(() => {
    const nextBtn = document.getElementById('shortsNextBtn');
    if (nextBtn) nextBtn.click();
  });
  await delay(800);

  const navState = await page.evaluate(() => {
    const container = document.getElementById('shortsContainer');
    const wrappers = Array.from(document.querySelectorAll('.short-video-wrapper'));
    const activeWrapper = wrappers.find(w => Math.abs(w.offsetTop - container.scrollTop) < 10);
    const currentUrlId = new URLSearchParams(window.location.search).get('id');
    const isScrolled = container.scrollTop > 10;
    return {
      isScrolled,
      currentUrlId,
      activeSlug: activeWrapper ? activeWrapper.dataset.slug : ''
    };
  });

  const isNavOk = navState && 
                   navState.isScrolled && 
                   navState.currentUrlId === navState.activeSlug && 
                   navState.activeSlug !== initialSlug;

  if (!isNavOk) {
    throw new Error(`[TEST SHORTS] Shorts scroll navigation or URL sync failed: ${JSON.stringify(navState)}`);
  }
}

async function testWatchLinkParams(page) {
  console.log('[TEST SHORTS] Testing Watch Link parameters...');
  const watchLinkHref = await page.evaluate(() => {
    const wrapper = document.querySelector('.short-video-wrapper');
    const watchBtn = wrapper.querySelector('a.short-watch-btn');
    return watchBtn ? watchBtn.getAttribute('href') : null;
  });
  if (!watchLinkHref || !watchLinkHref.includes('&ep=')) {
    throw new Error(`[TEST SHORTS] Watch link parameter alignment failed: ${watchLinkHref}`);
  }
}

async function testRepetitionSuppression(page, initialSlug) {
  console.log('[TEST SHORTS] Testing Repetition suppression state...');
  const recentSlugsState = await page.evaluate(() => {
    return window._recentSlugs || [];
  });
  if (!recentSlugsState.includes(initialSlug)) {
    throw new Error(`[TEST SHORTS] Viewed slug not recorded in recentSlugs list: ${JSON.stringify(recentSlugsState)}`);
  }
}

async function testInactivityNudge(page) {
  console.log('[TEST SHORTS] Testing 8-seconds inactivity nudge...');
  const noNudgeInitially = await page.evaluate(() => {
    const container = document.getElementById('shortsContainer');
    const wrappers = Array.from(document.querySelectorAll('.short-video-wrapper'));
    const active = wrappers.find(w => Math.abs(w.offsetTop - container.scrollTop) < 10) || wrappers[0];
    const watchBtn = active ? active.querySelector('.short-watch-btn') : null;
    const watchLink = active ? active.querySelector('.watch-link') : null;
    return (!watchBtn || !watchBtn.classList.contains('nudge-active')) && 
           (!watchLink || !watchLink.classList.contains('nudge-active'));
  });

  console.log('[TEST SHORTS] Waiting 8.2 seconds for idle nudge...');
  await delay(8200);

  const nudgeTriggered = await page.evaluate(() => {
    const container = document.getElementById('shortsContainer');
    const wrappers = Array.from(document.querySelectorAll('.short-video-wrapper'));
    const active = wrappers.find(w => Math.abs(w.offsetTop - container.scrollTop) < 10) || wrappers[0];
    const watchBtn = active ? active.querySelector('.short-watch-btn') : null;
    const watchLink = active ? active.querySelector('.watch-link') : null;
    const watchBtnActive = watchBtn && watchBtn.classList.contains('nudge-active');
    const watchLinkActive = watchLink && watchLink.classList.contains('nudge-active');
    return watchBtnActive && watchLinkActive;
  });

  console.log('[TEST SHORTS] Moving mouse to clear nudge...');
  await page.evaluate(() => {
    window.dispatchEvent(new MouseEvent('mousemove'));
  });
  await delay(150);

  const nudgeCleared = await page.evaluate(() => {
    const container = document.getElementById('shortsContainer');
    const wrappers = Array.from(document.querySelectorAll('.short-video-wrapper'));
    const active = wrappers.find(w => Math.abs(w.offsetTop - container.scrollTop) < 10) || wrappers[0];
    const watchBtn = active ? active.querySelector('.short-watch-btn') : null;
    const watchLink = active ? active.querySelector('.watch-link') : null;
    return (!watchBtn || !watchBtn.classList.contains('nudge-active')) && 
           (!watchLink || !watchLink.classList.contains('nudge-active'));
  });

  if (!noNudgeInitially || !nudgeTriggered || !nudgeCleared) {
    throw new Error(`[TEST SHORTS] Shorts inactivity nudge failed: ${JSON.stringify({ noNudgeInitially, nudgeTriggered, nudgeCleared })}`);
  }
}

async function testErrorFallbackOverlay(page, port) {
  console.log('[TEST SHORTS] Testing Shorts Error Fallback Overlay (on isolated page)...');
  
  // Create a new browser page to avoid leakage of the evaluateOnNewDocument mock fetch
  const browser = page.browser();
  const errorPage = await browser.newPage();
  
  await errorPage.evaluateOnNewDocument(() => {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      const urlStr = typeof url === 'object' && url ? (url.url || url.href || String(url)) : String(url);
      if (urlStr && urlStr.includes('db/against-the-blade-of-honor.json')) {
        return Promise.resolve(new Response(JSON.stringify({
          slug: "against-the-blade-of-honor",
          title: { en: "Against The Blade Of Honor", km: "កាំបិតពន្លឺព្រះច័ន្ទ" },
          episodes: []
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return originalFetch.apply(this, arguments);
    };
  });

  try {
    await errorPage.goto(`http://127.0.0.1:${port}/index.html?mode=shorts&id=against-the-blade-of-honor`, { waitUntil: 'domcontentloaded' });
    await errorPage.waitForSelector('.short-error-indicator', { timeout: 25000 });
    
    const errorState = await errorPage.evaluate(() => {
      const wrapper = document.querySelector('.short-video-wrapper');
      const shimmer = wrapper.querySelector('.skeleton-shimmer');
      const errorIndicator = wrapper.querySelector('.short-error-indicator');
      const hasErrorMsg = errorIndicator && 
        (errorIndicator.textContent.includes('Clip Unavailable') || errorIndicator.textContent.includes('វីដេអូមិនអាចលេងបានទេ'));
      const isShimmerHidden = shimmer && (shimmer.style.display === 'none' || window.getComputedStyle(shimmer).display === 'none');
      return { hasErrorMsg, isShimmerHidden };
    });

    if (!errorState.hasErrorMsg || !errorState.isShimmerHidden) {
      throw new Error(`[TEST SHORTS] Fallback error overlay failed validation: ${JSON.stringify(errorState)}`);
    }
  } finally {
    await errorPage.close();
  }
}
