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
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });

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
    await listBtn.click();
    
    // Assert .home-grid has class list-mode
    const isListMode = await page.evaluate(() => {
      return document.querySelector('.home-grid').classList.contains('list-mode');
    });
    if (!isListMode) {
      console.error('[TEST FAILURE] Grid did not switch to list-mode.');
      testFailed = true;
    } else {
      console.log('[TEST SUCCESS] List mode toggled successfully.');
    }

    // Test filtering by year (click "2020+")
    console.log('[TEST RUNNER] Filtering by year (2020+)...');
    const filterPills = await page.$$('.filter-rows .sort-pill');
    let yearBtn;
    for (const pill of filterPills) {
      const text = await page.evaluate(el => el.textContent.trim(), pill);
      if (text === '2020+') {
        yearBtn = pill;
        break;
      }
    }

    if (yearBtn) {
      await yearBtn.click();
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
    process.exit(1);
  } else {
    console.log('[TEST RESULT] All tests PASSED successfully.');
    process.exit(0);
  }
}

runTests();
