/**
 * Integration tests for static page routing — Legal, About, Contact, Terms.
 * Each test verifies: view renders, meta-bar present, key section headings/content intact.
 */

export async function runRoutingTests(ctx) {
  await testLegalPage(ctx.page, ctx.PORT);
  await testAboutPage(ctx.page, ctx.PORT);
  await testContactPage(ctx.page, ctx.PORT);
  await testTermsPage(ctx.page, ctx.PORT);
  console.log('[TEST ROUTING] All static page routing tests passed successfully.');
}

async function testLegalPage(page, port) {
  console.log('[TEST ROUTING] Testing Legal page (Privacy & DMCA)...');
  await page.goto(`http://127.0.0.1:${port}/index.html?page=legal`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#legalView', { visible: true });

  const result = await page.evaluate(() => {
    const body = document.body.textContent;
    const metaBar = document.querySelector('#legalView .legal-meta-bar');
    const sections = document.querySelectorAll('#legalView .legal-section-card');
    // initQuest() replaces a.clear-chip with div.quest-choice-box > a.quest-choice-option
    const backLink = document.querySelector('#legalView .quest-choice-option') ||
                     document.querySelector('#legalView a.clear-chip');
    return {
      hasMetaBar: !!metaBar,
      hasEffectiveDate: metaBar ? metaBar.textContent.includes('Effective Date') : false,
      sectionCount: sections.length,
      hasDisclaimer: body.includes('Disclaimer'),
      hasDmcaNotice: body.includes('DMCA Copyright Notice'),
      hasPrivacy: body.includes('Privacy Policy'),
      hasCookiePolicy: body.includes('Cookie Policy'),
      hasSafeHarbor: body.includes('Safe Harbor'),
      hasEmail: body.includes('legal@iblogger855.github.io'),
      hasBackLink: !!backLink
    };
  });

  const failures = [];
  if (!result.hasMetaBar)      failures.push('legal-meta-bar missing');
  if (!result.hasEffectiveDate) failures.push('Effective Date missing from meta-bar');
  if (result.sectionCount < 5) failures.push(`expected 5 sections, found ${result.sectionCount}`);
  if (!result.hasDisclaimer)   failures.push('Section 1 (Disclaimer) missing');
  if (!result.hasDmcaNotice)   failures.push('Section 2 (DMCA Copyright Notice) missing');
  if (!result.hasPrivacy)      failures.push('Section 3 (Privacy Policy) missing');
  if (!result.hasCookiePolicy) failures.push('Section 4 (Cookie Policy) missing');
  if (!result.hasSafeHarbor)   failures.push('Section 5 (DMCA Safe Harbor) missing');
  if (!result.hasEmail)        failures.push('legal contact email missing');
  if (!result.hasBackLink)     failures.push('Back to Home link missing');

  if (failures.length > 0) throw new Error(`[TEST ROUTING] Legal page failures: ${failures.join('; ')}`);
}

async function testAboutPage(page, port) {
  console.log('[TEST ROUTING] Testing About Us page...');
  await page.goto(`http://127.0.0.1:${port}/index.html?page=about`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#aboutView', { visible: true });

  const result = await page.evaluate(() => {
    const body = document.body.textContent;
    const metaBar = document.querySelector('#aboutView .legal-meta-bar');
    const pathBtns = document.querySelectorAll('#aboutView .path-btn');
    const cards = document.querySelectorAll('#aboutView .legal-section-card');
    return {
      hasMetaBar: !!metaBar,
      hasPlatformSection: body.includes('Our Platform'),
      hasGoalSection: body.includes('Our Goal'),
      pathBtnCount: pathBtns.length,
      hasDualismBtn: Array.from(pathBtns).some(b => b.textContent.includes('Dualism')),
      hasStoicBtn: Array.from(pathBtns).some(b => b.textContent.includes('Stoicism')),
      hasExistentialBtn: Array.from(pathBtns).some(b => b.textContent.includes('Existentialism')),
      cardCount: cards.length
    };
  });

  const failures = [];
  if (!result.hasMetaBar)          failures.push('legal-meta-bar missing');
  if (!result.hasPlatformSection)  failures.push('Our Platform section missing');
  if (!result.hasGoalSection)      failures.push('Our Goal section missing');
  if (result.pathBtnCount < 3)     failures.push(`expected 3 path buttons, found ${result.pathBtnCount}`);
  if (!result.hasDualismBtn)       failures.push('Dualism path button missing');
  if (!result.hasStoicBtn)         failures.push('Stoicism path button missing');
  if (!result.hasExistentialBtn)   failures.push('Existentialism path button missing');
  if (result.cardCount < 2)        failures.push(`expected at least 2 cards, found ${result.cardCount}`);

  if (failures.length > 0) throw new Error(`[TEST ROUTING] About page failures: ${failures.join('; ')}`);
}

async function testContactPage(page, port) {
  console.log('[TEST ROUTING] Testing Contact Us page...');
  await page.goto(`http://127.0.0.1:${port}/index.html?page=contact`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#contactView', { visible: true });

  const result = await page.evaluate(() => {
    const body = document.body.textContent;
    const metaBar = document.querySelector('#contactView .legal-meta-bar');
    const sections = document.querySelectorAll('#contactView .legal-section-card');
    const backLink = document.querySelector('#contactView .quest-choice-option') ||
                     document.querySelector('#contactView a.clear-chip');
    return {
      hasMetaBar: !!metaBar,
      hasResponseTime: metaBar ? metaBar.textContent.includes('48') : false,
      sectionCount: sections.length,
      hasGetInTouch: body.includes('Get in Touch'),
      hasEmailSupport: body.includes('Email Support'),
      hasContactEmail: body.includes('contact@iblogger855.github.io'),
      hasBackLink: !!backLink
    };
  });

  const failures = [];
  if (!result.hasMetaBar)       failures.push('legal-meta-bar missing');
  if (!result.hasResponseTime)  failures.push('Response time (48h) missing from meta-bar');
  if (result.sectionCount < 2)  failures.push(`expected 2 sections, found ${result.sectionCount}`);
  if (!result.hasGetInTouch)    failures.push('Get in Touch section missing');
  if (!result.hasEmailSupport)  failures.push('Email Support section missing');
  if (!result.hasContactEmail)  failures.push('contact email missing');
  if (!result.hasBackLink)      failures.push('Back to Home link missing');

  if (failures.length > 0) throw new Error(`[TEST ROUTING] Contact page failures: ${failures.join('; ')}`);
}

async function testTermsPage(page, port) {
  console.log('[TEST ROUTING] Testing Terms of Service page...');
  await page.goto(`http://127.0.0.1:${port}/index.html?page=terms`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#termsView', { visible: true });

  const result = await page.evaluate(() => {
    const body = document.body.textContent;
    const metaBar = document.querySelector('#termsView .legal-meta-bar');
    const sections = document.querySelectorAll('#termsView .legal-section-card');
    const backLink = document.querySelector('#termsView .quest-choice-option') ||
                     document.querySelector('#termsView a.clear-chip');
    return {
      hasMetaBar: !!metaBar,
      hasJurisdiction: metaBar ? metaBar.textContent.includes('Cambodia') : false,
      sectionCount: sections.length,
      hasAcceptance: body.includes('Acceptance of Terms'),
      hasCatalogIndex: body.includes('Sourced Catalog Index'),
      hasAcceptableUse: body.includes('Acceptable Use'),
      hasKhmerContent: body.includes('ការយល់ព្រមលើលក្ខខណ្ឌ'),
      hasBackLink: !!backLink
    };
  });

  const failures = [];
  if (!result.hasMetaBar)       failures.push('legal-meta-bar missing');
  if (!result.hasJurisdiction)  failures.push('Jurisdiction (Cambodia) missing from meta-bar');
  if (result.sectionCount < 3)  failures.push(`expected 3 sections, found ${result.sectionCount}`);
  if (!result.hasAcceptance)    failures.push('Section 1 (Acceptance of Terms) missing');
  if (!result.hasCatalogIndex)  failures.push('Section 2 (Sourced Catalog Index) missing');
  if (!result.hasAcceptableUse) failures.push('Section 3 (Acceptable Use) missing');
  if (!result.hasKhmerContent)  failures.push('Khmer bilingual content missing');
  if (!result.hasBackLink)      failures.push('Back to Home link missing');

  if (failures.length > 0) throw new Error(`[TEST ROUTING] Terms page failures: ${failures.join('; ')}`);
}
