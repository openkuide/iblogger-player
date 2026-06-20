/**
 * Integration tests for the movie catalog (browsing, view toggling, pagination, and filtering).
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function runCatalogTests(ctx) {
  await waitForVueMount(ctx.page);
  const initialCount = await verifyInitialMovieCards(ctx.page);
  await testGridViewToggle(ctx.page);
  await testPagination(ctx.page);
  await testYearFilter(ctx.page);
  await testCountryFilter(ctx.page, initialCount);
  await testClearFilters(ctx.page, initialCount);
  await testSearch(ctx.page, initialCount);
  console.log('[TEST CATALOG] All catalog tests passed successfully.');
}

async function waitForVueMount(page) {
  console.log('[TEST CATALOG] Waiting for Vue app to mount...');
  await page.waitForFunction(() => {
    const el = document.getElementById('homeApp');
    return el && el.__vue_app__;
  }, { timeout: 15000 });
}

async function verifyInitialMovieCards(page) {
  const count = await page.evaluate(() => {
    return document.querySelectorAll('.home-card').length;
  });
  console.log(`[TEST CATALOG] Initial movie count: ${count}`);
  if (count === 0) {
    throw new Error('[TEST CATALOG] No movie cards rendered on load.');
  }
  return count;
}

async function testGridViewToggle(page) {
  console.log('[TEST CATALOG] Toggling to List View...');
  await page.waitForSelector('.view-toggle button[data-view="list"]');
  await page.evaluate(() => {
    const btn = document.querySelector('.view-toggle button[data-view="list"]');
    if (btn) btn.click();
  });
  
  await delay(150);
  
  const isListMode = await page.evaluate(() => {
    const grids = document.querySelectorAll('.home-grid');
    return Array.from(grids).some(g => g.classList.contains('list-mode'));
  });
  
  if (!isListMode) {
    throw new Error('[TEST CATALOG] Grid did not switch to list-mode.');
  }
}

async function testPagination(page) {
  console.log('[TEST CATALOG] Testing pagination (switching to Page 2)...');
  const firstTitlePage1 = await page.evaluate(() => {
    return document.querySelector('.home-card .hc-title').textContent.trim();
  });

  const page2Btn = await findPageButton(page, ['2', '២']);
  await page.evaluate(el => el.click(), page2Btn);
  await delay(500);

  const firstTitlePage2 = await page.evaluate(() => {
    return document.querySelector('.home-card .hc-title').textContent.trim();
  });
  console.log(`[TEST CATALOG] Page 1: "${firstTitlePage1}" | Page 2: "${firstTitlePage2}"`);
  if (firstTitlePage1 === firstTitlePage2) {
    throw new Error('[TEST CATALOG] Page content did not change after navigating to Page 2.');
  }

  const page1Btn = await findPageButton(page, ['1', '១']);
  if (page1Btn) {
    await page.evaluate(el => el.click(), page1Btn);
    await delay(500);
  }
}

async function findPageButton(page, targets) {
  const pageButtons = await page.$$('.pager button');
  for (const btn of pageButtons) {
    const text = await page.evaluate(el => el.textContent.trim(), btn);
    if (targets.includes(text)) {
      return btn;
    }
  }
  throw new Error(`[TEST CATALOG] Page button matching ${targets} not found.`);
}

async function testYearFilter(page) {
  console.log('[TEST CATALOG] Filtering by year (2020+)...');
  const filterToggleBtn = await page.waitForSelector('.filter-toggle');
  await page.evaluate(el => el.click(), filterToggleBtn);
  await delay(500);

  const yearBtn = await findSortPill(page, '2020+');
  await page.evaluate(el => el.click(), yearBtn);
  await delay(500);

  const isYearFilteredCorrectly = await page.evaluate(() => {
    const cards = document.querySelectorAll('.home-card');
    if (cards.length === 0) return false;
    for (const card of cards) {
      const yearEl = card.querySelector('.hc-year');
      if (yearEl) {
        const year = parseInt(yearEl.textContent.trim());
        if (!isNaN(year) && year < 2020) return false;
      }
    }
    return true;
  });
  if (!isYearFilteredCorrectly) {
    throw new Error('[TEST CATALOG] Year filter (2020+) did not filter movies correctly.');
  }
}

async function findSortPill(page, targetText) {
  const filterPills = await page.$$('.filter-rows-wrapper .sort-pill');
  for (const pill of filterPills) {
    const text = await page.evaluate(el => el.textContent.trim(), pill);
    if (text === targetText) {
      return pill;
    }
  }
  throw new Error(`[TEST CATALOG] Filter pill '${targetText}' not found.`);
}

async function testCountryFilter(page, initialCount) {
  console.log('[TEST CATALOG] Filtering by country (ហុងកុង)...');
  const countryBtn = await findSortPill(page, 'ហុងកុង');
  await page.evaluate(el => el.click(), countryBtn);
  await delay(500);

  const hkCount = await page.evaluate(() => {
    return document.querySelectorAll('.home-card').length;
  });
  console.log(`[TEST CATALOG] Hong Kong 2020+ movie count: ${hkCount}`);
  if (hkCount === 0 || hkCount >= initialCount) {
    throw new Error('[TEST CATALOG] Country filtering did not return a valid subset of movies.');
  }
}

async function testClearFilters(page, initialCount) {
  console.log('[TEST CATALOG] Clicking Clear All...');
  await page.waitForSelector('.clear-chip');
  await page.evaluate(() => {
    const btn = document.querySelector('.clear-chip');
    if (btn) btn.click();
  });
  await delay(500);

  const resetCount = await page.evaluate(() => {
    return document.querySelectorAll('.home-card').length;
  });
  console.log(`[TEST CATALOG] Count after clear: ${resetCount}`);
  if (resetCount !== initialCount) {
    throw new Error('[TEST CATALOG] Reset count does not match initial count after clear.');
  }
}

async function testSearch(page, initialCount) {
  console.log('[TEST CATALOG] Testing keyword search...');
  await page.waitForSelector('#searchInput');

  await page.evaluate(() => {
    const input = document.getElementById('searchInput');
    input.focus();
  });
  await page.type('#searchInput', 'kung fu', { delay: 40 });
  await delay(400);

  const searchCount = await page.evaluate(() => {
    return document.querySelectorAll('.home-card').length;
  });
  console.log(`[TEST CATALOG] Cards matching "kung fu": ${searchCount}`);
  if (searchCount === 0) throw new Error('[TEST CATALOG] Search returned no results for "kung fu".');
  if (searchCount >= initialCount) throw new Error('[TEST CATALOG] Search did not filter results — count unchanged.');

  // Search matches across title, description, and genres — just verify count was narrowed.
  if (searchCount >= initialCount) throw new Error('[TEST CATALOG] Search did not filter — result count unchanged.');

  await page.evaluate(() => {
    const btn = document.querySelector('.search-clear-btn');
    if (btn) btn.click();
  });
  await delay(400);

  const clearedCount = await page.evaluate(() => {
    return document.querySelectorAll('.home-card').length;
  });
  if (clearedCount !== initialCount) {
    throw new Error(`[TEST CATALOG] Search clear did not restore full catalog (expected ${initialCount}, got ${clearedCount}).`);
  }
  console.log('[TEST CATALOG] Search clear restored full catalog.');
}
