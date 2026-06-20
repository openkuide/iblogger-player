/**
 * Integration tests for the static page router links (About, Contact, Terms, Legal pages).
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
  await page.waitForSelector('#legalView');
  
  const hasLegalContent = await page.evaluate(() => {
    const body = document.body.textContent;
    return body.includes('Copyright Notice') && body.includes('legal@iblogger855.github.io');
  });
  
  if (!hasLegalContent) {
    throw new Error('[TEST ROUTING] Legal details failed to load or contact email was missing.');
  }
}

async function testAboutPage(page, port) {
  console.log('[TEST ROUTING] Testing About Us page...');
  await page.goto(`http://127.0.0.1:${port}/index.html?page=about`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#aboutView');
  
  const hasAboutContent = await page.evaluate(() => {
    return document.body.textContent.includes('Our Platform');
  });
  if (!hasAboutContent) {
    throw new Error('[TEST ROUTING] About page failed to load correctly.');
  }
}

async function testContactPage(page, port) {
  console.log('[TEST ROUTING] Testing Contact Us page...');
  await page.goto(`http://127.0.0.1:${port}/index.html?page=contact`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#contactView');
  
  const hasContactContent = await page.evaluate(() => {
    const body = document.body.textContent;
    return body.includes('Get in Touch') && body.includes('contact@iblogger855.github.io');
  });
  if (!hasContactContent) {
    throw new Error('[TEST ROUTING] Contact page failed to load correctly.');
  }
}

async function testTermsPage(page, port) {
  console.log('[TEST ROUTING] Testing Terms of Service page...');
  await page.goto(`http://127.0.0.1:${port}/index.html?page=terms`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#termsView');
  
  const hasTermsContent = await page.evaluate(() => {
    const body = document.body.textContent;
    return body.includes('Acceptance of Terms') && 
           body.includes('Sourced Catalog Index') && 
           body.includes('ការយល់ព្រមលើលក្ខខណ្ឌ');
  });
  if (!hasTermsContent) {
    throw new Error('[TEST ROUTING] Terms of Service page failed to load correctly or was missing required sections.');
  }
}
