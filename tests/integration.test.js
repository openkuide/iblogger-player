import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

// Import modular integration tests
import { runCatalogTests } from './catalog.test.js';
import { runPlayerTests } from './player.test.js';
import { runShortsTests } from './shorts.test.js';
import { runRoutingTests } from './routing.test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8899;
let server;

// Ensure screenshots/ exists before Puppeteer tries to write into it
fs.mkdirSync(path.join(__dirname, '..', 'screenshots'), { recursive: true });

// 1. Simple static file server to host the workspace files
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
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

// 3. Main orchestrator
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
    server.close();
    process.exit(1);
  }

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('iblogger_disclaimer_accepted', 'true');
  });
  await page.setCacheEnabled(false);
  
  // Track console errors
  const consoleErrors = [];
  page.on('console', async msg => {
    if (msg.type() === 'error') {
      const texts = [];
      for (const arg of msg.args()) {
        try {
          const val = await page.evaluate(obj => {
            if (obj instanceof Error) return obj.stack || obj.message;
            return typeof obj === 'object' ? JSON.stringify(obj) : String(obj);
          }, arg);
          texts.push(val);
        } catch (e) {
          texts.push(msg.text());
        }
      }
      const fullText = texts.join(' ');
      
      // Ignore Lottie CDN network/CORS load failures in test environments
      const isLottie = fullText.toLowerCase().includes('lottie') || 
                       (msg.location && msg.location() && msg.location().url && msg.location().url.toLowerCase().includes('lottie'));
      if (isLottie) {
        console.log(`[BROWSER CONSOLE ERROR (IGNORED)] ${fullText}`, msg.location());
        return;
      }
      
      const loggedError = fullText || msg.text() || 'Unknown console error';
      console.log(`[BROWSER CONSOLE ERROR] ${loggedError}`, msg.location());
      consoleErrors.push(loggedError);
    } else {
      console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    if (err.message.toLowerCase().includes('lottie')) {
      console.log(`[BROWSER PAGEERROR (IGNORED)] Unhandled Exception: ${err.message}`);
      return;
    }
    console.log(`[BROWSER PAGEERROR] Unhandled Exception: ${err.message}`);
    consoleErrors.push(`Unhandled Exception: ${err.message}`);
  });

  let testFailed = false;

  try {
    console.log('[TEST RUNNER] Navigating to http://127.0.0.1:8899/ ...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

    const context = { page, PORT, consoleErrors };

    // Run Suite 1: Movie Catalog Tests
    await runCatalogTests(context);

    // Run Suite 2: Player & Detail Tests
    await runPlayerTests(context);

    // Run Suite 3: Static Page Routing Tests
    await runRoutingTests(context);

    // Run Suite 4: Shorts Mode Tests
    await runShortsTests(context);

    // Final assert: zero console errors during run
    if (consoleErrors.length > 0) {
      console.error(`[TEST RUNNER] FAIL: Unhandled console errors occurred during the test suite execution.`);
      testFailed = true;
    }

  } catch (error) {
    console.error('[TEST RUNNER] FAIL: Test suite threw an unhandled exception:', error.message || error);
    try {
      await page.screenshot({ path: 'screenshots/test-failure.png' });
      console.log('[TEST RUNNER] Saved screenshot of failure to screenshots/test-failure.png');
    } catch (se) {
      console.error('[TEST RUNNER] Failed to save screenshot:', se.message);
    }
    testFailed = true;
  } finally {
    console.log('[TEST RUNNER] Closing browser and server...');
    await browser.close();
    server.close();
  }

  if (testFailed) {
    console.log('[TEST RUNNER] Result: FAILED.');
    process.exit(1);
  } else {
    console.log('[TEST RUNNER] Result: ALL TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

runTests();
