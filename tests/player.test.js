/**
 * Integration tests for the movie player details, keyboard controls, watch progress, and episode tabs.
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function runPlayerTests(ctx) {
  await navigateToMoviePage(ctx.page, ctx.PORT);
  await verifyBilingualDescriptions(ctx.page);
  await testKeyboardSeeking(ctx.page);
  await testClickableYearBadge(ctx.page);
  await setupWatchProgress(ctx.page);
  await navigateToMoviePageWithProgress(ctx.page, ctx.PORT);
  await verifyWatchProgressUi(ctx.page);
  await testRangeTabSwitch(ctx.page);
  console.log('[TEST PLAYER] All player details and progress tests passed successfully.');
}

async function navigateToMoviePage(page, port) {
  console.log('[TEST PLAYER] Navigating to movie page with id=when-a-man-s-in-love...');
  await page.goto(`http://127.0.0.1:${port}/index.html?id=when-a-man-s-in-love`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.info .badge-i.clickable-year');
}

async function verifyBilingualDescriptions(page) {
  console.log('[TEST PLAYER] Testing bilingual descriptions on details page...');
  const descKmExists = await page.evaluate(() => {
    const p = document.querySelector('#infoDesc .desc-km');
    return p && p.textContent.includes('ថេសាង') && p.textContent.includes('សហគ្រិន');
  });
  const descEnExists = await page.evaluate(() => {
    const p = document.querySelector('#infoDesc .desc-en');
    return p && p.textContent.includes('Han Tae Sang') && p.textContent.includes('cold-blooded');
  });
  
  if (!descKmExists || !descEnExists) {
    throw new Error('[TEST PLAYER] Bilingual descriptions were not rendered or did not have correct classes/content.');
  }
}

async function testKeyboardSeeking(page) {
  console.log('[TEST PLAYER] Testing player keyboard seeking...');
  await page.keyboard.press('ArrowRight');
  await delay(200);
  const seekOverlayExists = await page.evaluate(() => {
    const overlay = document.querySelector('.vjs-seek-overlay');
    return overlay !== null && overlay.classList.contains('show') && overlay.classList.contains('seek-right');
  });
  if (!seekOverlayExists) {
    throw new Error('[TEST PLAYER] Seek overlay was not shown/created on ArrowRight keypress.');
  }
}

async function testClickableYearBadge(page) {
  console.log('[TEST PLAYER] Clicking the clickable year badge...');
  await page.evaluate(() => {
    const badge = document.querySelector('.info .badge-i.clickable-year');
    if (badge) badge.click();
  });
  
  await page.waitForFunction(() => {
    const el = document.getElementById('homeApp');
    return el && el.__vue_app__ && (document.querySelector('.sort-pill.active') || document.querySelector('.year-select.active'));
  }, { timeout: 15000 });

  const activePillText = await page.evaluate(() => {
    const activeEl = document.querySelector('.filter-rows-wrapper .filter-row:nth-child(1) .sort-pill.active');
    if (activeEl) return activeEl.textContent.trim();
    const activeSelect = document.querySelector('.filter-rows-wrapper .filter-row:nth-child(1) .year-select.active');
    return activeSelect ? activeSelect.value : '';
  });
  console.log(`[TEST PLAYER] Active year filter after badge click: "${activePillText}"`);
  if (activePillText !== '2013') {
    throw new Error(`[TEST PLAYER] Expected year filter '2013', but found '${activePillText}'.`);
  }
}

async function setupWatchProgress(page) {
  await page.evaluate(() => {
    localStorage.setItem('iblogger_watch_progress', JSON.stringify({
      'demi-gods-and-semi-devils': {
        positions: { '3': 600 },
        watched: ['1', '2'],
        lastEp: '3',
        updatedAt: 1
      }
    }));
  });
}

async function navigateToMoviePageWithProgress(page, port) {
  console.log('[TEST PLAYER] Testing movie page watch progress (demi-gods-and-semi-devils)...');
  await page.goto(`http://127.0.0.1:${port}/index.html?id=demi-gods-and-semi-devils`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#episodes .ep-btn', { timeout: 25000 });
}

async function verifyWatchProgressUi(page) {
  const progressUi = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('#episodes .ep-btn'));
    const tabs = Array.from(document.querySelectorAll('.ep-range-tab'));
    const toast = document.getElementById('toast');
    return {
      buttonCount: buttons.length,
      tabCount: tabs.length,
      visibleCount: buttons.filter(b => b.style.display !== 'none').length,
      watchedCount: buttons.filter(b => b.classList.contains('watched')).length,
      activeIndex: buttons.findIndex(b => b.classList.contains('active')),
      activeTabIndex: tabs.findIndex(tb => tb.classList.contains('active')),
      toastText: toast ? toast.textContent : ''
    };
  });

  const progressOk =
    progressUi.buttonCount === 50 &&
    progressUi.tabCount === 2 &&
    progressUi.visibleCount === 25 &&
    progressUi.watchedCount === 2 &&
    progressUi.activeIndex === 2 &&
    progressUi.activeTabIndex === 0 &&
    progressUi.toastText.includes('បន្តចាក់ពី 10:00');

  if (!progressOk) {
    throw new Error(`[TEST PLAYER] Watch progress UI incorrect: ${JSON.stringify(progressUi)}`);
  }
}

async function testRangeTabSwitch(page) {
  console.log('[TEST PLAYER] Switching episode range tab...');
  await page.evaluate(() => document.querySelectorAll('.ep-range-tab')[1].click());
  const secondRange = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('#episodes .ep-btn'));
    const visible = buttons.filter(b => b.style.display !== 'none');
    return { visibleCount: visible.length, firstVisibleIndex: buttons.indexOf(visible[0]) };
  });
  if (secondRange.visibleCount !== 25 || secondRange.firstVisibleIndex !== 25) {
    throw new Error(`[TEST PLAYER] Range tab switch incorrect: ${JSON.stringify(secondRange)}`);
  }
}
