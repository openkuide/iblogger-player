import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8899;
let server;

// 1. Simple static file server to host the workspace files
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      // Parse URL and remove query params
      const parsedUrl = req.url.split('?')[0];
      const relativePath = parsedUrl === '/' ? 'index.html' : parsedUrl.slice(1);
      const filePath = path.join(__dirname, '..', relativePath);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
        } else {
          let contentType = 'text/html';
          if (filePath.endsWith('.js')) contentType = 'application/javascript';
          else if (filePath.endsWith('.css')) contentType = 'text/css';
          else if (filePath.endsWith('.json')) contentType = 'application/json';
          
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[TEST SERVER] Running at http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

// 2. Cross-platform Chrome binary detector
function getChromePath() {
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else {
    return '/usr/bin/google-chrome';
  }
}

// 3. Main test runner
async function runTests() {
  await startServer();

  console.log('[TEST RUNNER] Launching browser...');
  const executablePath = getChromePath();
  
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (e) {
    console.error(`[TEST RUNNER] ERROR: Failed to launch browser at ${executablePath}. Make sure Google Chrome is installed.`);
    process.exit(1);
  }

  const page = await browser.newPage();
  
  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`Unhandled Exception: ${err.message}`);
  });

  let testFailed = false;

  try {
    console.log('[TEST RUNNER] Navigating to http://127.0.0.1:8899/ ...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

    // Wait for the Vue application to mount
    console.log('[TEST RUNNER] Waiting for Vue app to mount...');
    await page.waitForFunction(() => {
      const el = document.getElementById('homeApp');
      return el && el.__vue_app__;
    }, { timeout: 5000 });

    // Assert zero console errors on load
    if (consoleErrors.length > 0) {
      console.error(`[TEST FAILURE] JavaScript errors detected on load:`, consoleErrors);
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] No console errors on load.');
    }

    // Verify initial count has cards loaded
    const initialCount = await page.evaluate(() => {
      return document.querySelectorAll('.home-card').length;
    });
    console.log(`[TEST RUNNER] Initial movie count: ${initialCount}`);
    if (initialCount === 0) {
      console.error('[TEST FAILURE] No movie cards rendered on load.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Cards loaded successfully.');
    }

    // Test grid vs list view toggle
    console.log('[TEST RUNNER] Toggling to List View...');
    const listBtn = await page.waitForSelector('.view-toggle button[title="List"]');
    await page.evaluate(() => {
      const btn = document.querySelector('.view-toggle button[title="List"]');
      if (btn) btn.click();
    });
    
    // Wait a brief moment for Vue tick
    await new Promise(r => setTimeout(r, 150));
    
    // Assert .home-grid has class list-mode
    const gridClasses = await page.evaluate(() => {
      const grids = document.querySelectorAll('.home-grid');
      const btn = document.querySelector('.view-toggle button[title="List"]');
      return {
        grids: Array.from(grids).map(g => ({
          html: g.outerHTML.substring(0, 100),
          classes: Array.from(g.classList)
        })),
        button: {
          classes: Array.from(btn ? btn.classList : [])
        }
      };
    });
    
    console.log('[DEBUG] grid/button classes:', gridClasses);
    const isListMode = gridClasses.grids.some(g => g.classes.includes('list-mode'));
    if (!isListMode) {
      console.error('[TEST FAILURE] Grid did not switch to list-mode.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] List mode toggled successfully.');
    }

    // Test interactive pagination
    console.log('[TEST RUNNER] Testing pagination (switching to Page 2)...');
    // Get the title of the first card on Page 1
    const firstTitlePage1 = await page.evaluate(() => {
      return document.querySelector('.home-card .hc-title').textContent.trim();
    });

    // Find and click page button "2"
    let page2Btn;
    const pageButtons = await page.$$('.pager button');
    for (const btn of pageButtons) {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      if (text === '2' || text === '២') {
        page2Btn = btn;
        break;
      }
    }

    if (page2Btn) {
      await page.evaluate(el => el.click(), page2Btn);
      await new Promise(r => setTimeout(r, 500)); // wait for page load

      const firstTitlePage2 = await page.evaluate(() => {
        return document.querySelector('.home-card .hc-title').textContent.trim();
      });
      console.log(`[TEST RUNNER] Page 1 first title: "${firstTitlePage1}" | Page 2 first title: "${firstTitlePage2}"`);
      if (firstTitlePage1 === firstTitlePage2) {
        console.error('[TEST FAILURE] Page content did not change after navigating to Page 2.');
        testFailed = true;
      } else {
        console.log('[TEST SUCCESS] Pagination navigation works successfully.');
      }

      // Switch back to Page 1
      console.log('[TEST RUNNER] Navigating back to Page 1...');
      let page1Btn;
      for (const btn of pageButtons) {
        const text = await page.evaluate(el => el.textContent.trim(), btn);
        if (text === '1' || text === '១') {
          page1Btn = btn;
          break;
        }
      }
      if (page1Btn) {
        await page.evaluate(el => el.click(), page1Btn);
        await new Promise(r => setTimeout(r, 500));
      }
    } else {
      console.error('[TEST FAILURE] Page 2 button not found.');
      testFailed = true;
    }

    // Open the filters panel
    console.log('[TEST RUNNER] Opening filters drawer...');
    const filterToggleBtn = await page.waitForSelector('.filter-toggle');
    await page.evaluate(el => el.click(), filterToggleBtn);
    await new Promise(r => setTimeout(r, 500)); // wait for panel animation

    // Test filtering by year (click "2020+")
    console.log('[TEST RUNNER] Filtering by year (2020+)...');
    const filterPills = await page.$$('.filter-rows-wrapper .sort-pill');
    let yearBtn;
    for (const pill of filterPills) {
      const text = await page.evaluate(el => el.textContent.trim(), pill);
      if (text === '2020+') {
        yearBtn = pill;
        break;
      }
    }

    if (yearBtn) {
      await page.evaluate(el => el.click(), yearBtn);
      // Wait for Vue reactivity to process
      await new Promise(r => setTimeout(r, 500));

      const filteredCount = await page.evaluate(() => {
        return document.querySelectorAll('.home-card').length;
      });
      console.log(`[TEST RUNNER] Filtered movie count: ${filteredCount}`);
      if (filteredCount >= initialCount) {
        console.error('[TEST FAILURE] Movie count did not update/decrease after applying filter.');
        testFailed = true;
      } else {
        console.log('[TEST SUCCESS] Movies filtered successfully.');
      }
    } else {
      console.error('[TEST FAILURE] 2020+ filter pill not found.');
      testFailed = true;
    }

    // Test filtering by country (click "ហុងកុង" / Hong Kong)
    console.log('[TEST RUNNER] Filtering by country (ហុងកុង)...');
    let countryBtn;
    const pills = await page.$$('.filter-rows-wrapper .sort-pill');
    for (const pill of pills) {
      const text = await page.evaluate(el => el.textContent.trim(), pill);
      if (text === 'ហុងកុង') {
        countryBtn = pill;
        break;
      }
    }

    if (countryBtn) {
      await page.evaluate(el => el.click(), countryBtn);
      await new Promise(r => setTimeout(r, 500)); // wait for reactivity

      const hkCount = await page.evaluate(() => {
        return document.querySelectorAll('.home-card').length;
      });
      console.log(`[TEST RUNNER] Hong Kong 2020+ movie count: ${hkCount}`);
      if (hkCount === 0 || hkCount >= initialCount) {
        console.error('[TEST FAILURE] Country filtering did not return a valid subset of movies.');
        testFailed = true;
      } else {
        console.log('[TEST SUCCESS] Country filtering works successfully.');
      }

      // Test clearing filters
      console.log('[TEST RUNNER] Clicking Clear All...');
      await page.waitForSelector('.clear-chip');
      await page.evaluate(() => {
        const btn = document.querySelector('.clear-chip');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 500)); // wait for reset

      const resetCount = await page.evaluate(() => {
        return document.querySelectorAll('.home-card').length;
      });
      console.log(`[TEST RUNNER] Count after clear: ${resetCount}`);
      if (resetCount !== initialCount) {
        console.error('[TEST FAILURE] Reset count does not match initial count after clear.');
        testFailed = true;
      } else {
        console.log('[TEST SUCCESS] Filter clearing resets catalog successfully.');
      }
    } else {
      console.error('[TEST FAILURE] ហុងកុង filter pill not found.');
      testFailed = true;
    }

    // Test clickable year badge on details/player page
    console.log('[TEST RUNNER] Testing clickable year badge on Player details page...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html?id=when-a-man-s-in-love`, { waitUntil: 'domcontentloaded' });
    
    // Wait for info element to load
    await page.waitForSelector('.info .badge-i.clickable-year');
    
    // Test bilingual descriptions rendering
    console.log('[TEST RUNNER] Testing bilingual descriptions on details page...');
    const descKmExists = await page.evaluate(() => {
      const p = document.querySelector('#infoDesc .desc-km');
      return p && p.textContent.includes('ថេសាង') && p.textContent.includes('សហគ្រិន');
    });
    const descEnExists = await page.evaluate(() => {
      const p = document.querySelector('#infoDesc .desc-en');
      return p && p.textContent.includes('Han Tae Sang') && p.textContent.includes('cold-blooded');
    });
    
    if (!descKmExists || !descEnExists) {
      console.error('[TEST FAILURE] Bilingual descriptions were not rendered or did not have correct classes/content.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Bilingual descriptions rendered successfully.');
    }
    
    // Test keyboard seeking (Left/Right arrow keys)
    console.log('[TEST RUNNER] Testing player keyboard seeking...');
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 200));
    const seekOverlayExists = await page.evaluate(() => {
      const overlay = document.querySelector('.vjs-seek-overlay');
      return overlay !== null && overlay.classList.contains('show') && overlay.classList.contains('seek-right');
    });
    if (!seekOverlayExists) {
      console.error('[TEST FAILURE] Seek overlay was not shown/created on ArrowRight keypress.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Keyboard seeking (ArrowRight) triggers seek overlay successfully.');
    }
    
    // Click the year badge
    console.log('[TEST RUNNER] Clicking the clickable year badge...');
    await page.evaluate(() => {
      const badge = document.querySelector('.info .badge-i.clickable-year');
      if (badge) badge.click();
    });
    
    // Wait for home view to load and filter to render
    await page.waitForFunction(() => {
      const el = document.getElementById('homeApp');
      return el && el.__vue_app__ && (document.querySelector('.sort-pill.active') || document.querySelector('.year-select.active'));
    }, { timeout: 5000 });

    const activePillText = await page.evaluate(() => {
      const activeEl = document.querySelector('.filter-rows-wrapper .filter-row:nth-child(1) .sort-pill.active');
      if (activeEl) return activeEl.textContent.trim();
      const activeSelect = document.querySelector('.filter-rows-wrapper .filter-row:nth-child(1) .year-select.active');
      return activeSelect ? activeSelect.value : '';
    });
    console.log(`[TEST RUNNER] Active year filter after badge click: "${activePillText}"`);
    if (activePillText !== '2013') {
      console.error(`[TEST FAILURE] Expected year filter '2013', but found '${activePillText}'.`);
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Clickable year badge and homepage redirect filtering works successfully.');
    }
    
    // Test Legal/Privacy & DMCA page routing
    console.log('[TEST RUNNER] Testing Legal page (Privacy & DMCA)...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html?page=legal`, { waitUntil: 'domcontentloaded' });
    
    // Wait for legalView to load
    await page.waitForSelector('#legalView');
    
    // Assert legal terms and DMCA contact info exist
    const hasLegalContent = await page.evaluate(() => {
      const body = document.body.textContent;
      return body.includes('Copyright Notice') && body.includes('legal@iblogger855.github.io');
    });
    
    if (!hasLegalContent) {
      console.error('[TEST FAILURE] Legal Privacy & DMCA disclaimer details failed to load or contact email was missing.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Legal page successfully verified.');
    }

    // Test About page routing
    console.log('[TEST RUNNER] Testing About Us page...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html?page=about`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#aboutView');
    const hasAboutContent = await page.evaluate(() => {
      return document.body.textContent.includes('Our Platform');
    });
    if (!hasAboutContent) {
      console.error('[TEST FAILURE] About page failed to load correctly.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] About page successfully verified.');
    }

    // Test Contact page routing
    console.log('[TEST RUNNER] Testing Contact Us page...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html?page=contact`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#contactView');
    const hasContactContent = await page.evaluate(() => {
      const body = document.body.textContent;
      return body.includes('Get in Touch') && body.includes('contact@iblogger855.github.io');
    });
    if (!hasContactContent) {
      console.error('[TEST FAILURE] Contact page failed to load correctly.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Contact page successfully verified.');
    }

    // Test Terms of Service page routing
    console.log('[TEST RUNNER] Testing Terms of Service page...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html?page=terms`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#termsView');
    const hasTermsContent = await page.evaluate(() => {
      const body = document.body.textContent;
      return body.includes('Acceptance of Terms') && 
             body.includes('Sourced Catalog Index') && 
             body.includes('ការយល់ព្រមលើលក្ខខណ្ឌ');
    });
    if (!hasTermsContent) {
      console.error('[TEST FAILURE] Terms of Service page failed to load correctly or was missing required sections.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Terms of Service page successfully verified.');
    }

    // Test Shorts mode: watch link + sound toggle
    console.log('[TEST RUNNER] Testing Shorts mode (watch link & sound toggle)...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html?mode=shorts`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.short-video-wrapper', { timeout: 10000 });

    const shortsUi = await page.evaluate(() => {
      const wrapper = document.querySelector('.short-video-wrapper');
      const watchBtn = wrapper.querySelector('a.short-watch-btn');
      const titleLink = wrapper.querySelector('a.short-title');
      const soundBtn = wrapper.querySelector('.sound-btn');
      return {
        slug: wrapper.dataset.slug,
        watchHref: watchBtn ? watchBtn.getAttribute('href') : null,
        titleHref: titleLink ? titleLink.getAttribute('href') : null,
        hasSoundBtn: !!soundBtn
      };
    });

    const expectedHref = `?id=${shortsUi.slug}`;
    if (!shortsUi.hasSoundBtn || shortsUi.watchHref !== expectedHref || shortsUi.titleHref !== expectedHref) {
      console.error('[TEST FAILURE] Shorts UI incomplete:', shortsUi);
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Shorts watch links and sound button rendered successfully.');
    }

    console.log('[TEST RUNNER] Waiting for first short video to initialize...');
    await page.waitForSelector('.short-video-wrapper video', { timeout: 15000 });

    const mutedBefore = await page.evaluate(() => {
      return document.querySelector('.short-video-wrapper video').muted;
    });

    console.log('[TEST RUNNER] Clicking sound toggle...');
    await page.evaluate(() => document.querySelector('.sound-btn').click());
    await new Promise(r => setTimeout(r, 200));

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
      console.error('[TEST FAILURE] Sound toggle did not unmute globally:', { mutedBefore, ...soundState });
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Sound toggle unmutes video, syncs all labels, and persists preference.');
    }

    // Test movie page: episode range tabs, watched markers, continue-watching
    console.log('[TEST RUNNER] Testing movie page watch progress (demi-gods-and-semi-devils, 50 eps)...');
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
    await page.goto(`http://127.0.0.1:${PORT}/index.html?id=demi-gods-and-semi-devils`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#episodes .ep-btn', { timeout: 10000 });

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
      progressUi.activeIndex === 2 &&   // lastEp '3' resumes without ?ep= param
      progressUi.activeTabIndex === 0 &&
      progressUi.toastText.includes('បន្តចាក់ពី 10:00'); // 600s resume toast

    if (!progressOk) {
      console.error('[TEST FAILURE] Watch progress UI incorrect:', progressUi);
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Range tabs, watched markers, continue-watching, and resume toast verified.');
    }

    // Switching range tab shows the second chunk of episodes
    await page.evaluate(() => document.querySelectorAll('.ep-range-tab')[1].click());
    const secondRange = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#episodes .ep-btn'));
      const visible = buttons.filter(b => b.style.display !== 'none');
      return { visibleCount: visible.length, firstVisibleIndex: buttons.indexOf(visible[0]) };
    });
    if (secondRange.visibleCount !== 25 || secondRange.firstVisibleIndex !== 25) {
      console.error('[TEST FAILURE] Range tab switch incorrect:', secondRange);
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] Range tab switching filters the episode grid correctly.');
    }

  } catch (error) {
    console.error('[TEST ERROR] Test execution threw an error:', error);
    testFailed = true;
  } finally {
    console.log('[TEST RUNNER] Closing browser and server...');
    await browser.close();
    server.close();
  }

  if (testFailed) {
    console.log('[TEST RESULT] Tests FAILED.');
    if (consoleErrors.length > 0) {
      console.error('[TEST RUNNER] Console errors during run:', consoleErrors);
    }
    process.exit(1);
  } else {
    console.log('[TEST RESULT] All tests PASSED successfully.');
    process.exit(0);
  }
}

runTests();
