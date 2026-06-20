---
name: e2e-test
description: Use when writing, extending, or debugging Puppeteer e2e tests for iblogger-player. Covers suite structure, DOM assertions, timing, screenshots, and wiring into the integration runner.
---

# e2e-test

## Overview

Tests live in `tests/` as ES modules. `integration.test.js` is the orchestrator — it starts the static server, launches Chrome, and calls each suite in order. Each suite file exports one `runXxxTests(ctx)` function. Run with `npm test`.

## Architecture

```
tests/
  integration.test.js   ← orchestrator (server + browser + suite runner)
  catalog.test.js       ← exports runCatalogTests(ctx)
  player.test.js        ← exports runPlayerTests(ctx)
  shorts.test.js        ← exports runShortsTests(ctx)
  routing.test.js       ← exports runRoutingTests(ctx)
```

The context object passed to every suite:
```js
{ page, PORT, consoleErrors }
// page         — Puppeteer Page instance
// PORT         — 8899 (local static server)
// consoleErrors — array; any push fails the run at the end
```

## Writing a New Suite

**1. Create `tests/my-feature.test.js`:**

```js
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function runMyFeatureTests(ctx) {
  await testSomething(ctx.page, ctx.PORT);
  await testSomethingElse(ctx.page, ctx.PORT);
  console.log('[TEST MY-FEATURE] All tests passed successfully.');
}

async function testSomething(page, port) {
  console.log('[TEST MY-FEATURE] Testing X...');
  await page.goto(`http://127.0.0.1:${port}/index.html?page=legal`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#legalView');

  const ok = await page.evaluate(() => {
    return document.querySelector('h1').textContent.includes('Privacy');
  });
  if (!ok) throw new Error('[TEST MY-FEATURE] Expected heading not found.');
}
```

**2. Register in `integration.test.js`:**

```js
import { runMyFeatureTests } from './my-feature.test.js';
// ...inside runTests():
await runMyFeatureTests(context);
```

## Quick Reference

| Task | Pattern |
|---|---|
| Navigate to a view | `await page.goto(\`http://127.0.0.1:${PORT}/index.html?page=legal\`, { waitUntil: 'domcontentloaded' })` |
| Wait for element | `await page.waitForSelector('#legalView')` |
| Wait for condition | `await page.waitForFunction(() => el.__vue_app__, { timeout: 15000 })` |
| Read DOM | `await page.evaluate(() => document.querySelector('.title').textContent)` |
| Click element | `await page.evaluate(() => document.querySelector('.btn').click())` |
| Press key | `await page.keyboard.press('ArrowRight')` |
| Short pause | `await delay(150)` |
| Assert | `if (!ok) throw new Error('[TEST SUITE] Description of what failed.')` |
| Screenshot | `await page.screenshot({ path: 'debug.png', fullPage: true })` |

## URL Routes to Test Against

| View | URL |
|---|---|
| Home / catalog | `?` (no params) |
| Movie detail + player | `?id=<slug>&ep=<n>` |
| Shorts feed | `?mode=shorts` |
| Legal / DMCA | `?page=legal` |
| About | `?page=about` |
| Contact | `?page=contact` |
| Terms | `?page=terms` |

## Screenshots

Take a screenshot at any point — especially useful on failure or to verify a visual state:

```js
// On failure (already wired in integration.test.js catch block)
await page.screenshot({ path: 'test-failure.png' });

// At a specific step
await page.screenshot({ path: 'screenshots/shorts-muted.png' });

// Full page
await page.screenshot({ path: 'full.png', fullPage: true });
```

## Assertion Pattern

Always use `throw new Error(...)` — never `console.error` or `process.exit`. The orchestrator catches the throw, saves a failure screenshot, and exits with code 1.

```js
// ✅ correct
if (!found) throw new Error('[TEST ROUTING] Legal heading missing.');

// ❌ wrong — test appears to pass
if (!found) console.error('Legal heading missing.');
```

## Timing Rules

- Prefer `page.waitForSelector()` or `page.waitForFunction()` over `delay()`.
- Use `delay(150–300ms)` only after `.click()` or `.press()` when there is no DOM signal to wait on.
- Never use `delay` > 500ms unless the test description explicitly says why (e.g. the 8-second idle nudge in shorts).

## Common Mistakes

| Mistake | Fix |
|---|---|
| `waitForSelector` times out | Check the selector in DevTools; the element may be inside a hidden parent |
| Vue app not ready | Use `waitForFunction(() => el.__vue_app__)` before touching catalog DOM |
| Test passes locally, fails in CI | Replace `delay()` with a DOM condition — timing is environment-dependent |
| Console errors not caught | They are caught globally; don't suppress them with try/catch inside tests |
| Selector targets internal hls.js element | Skip or wrap in try/catch and note it in the log |
