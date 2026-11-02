import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = (process.env.TEST_URL || 'http://localhost:4173').replace(/\/$/, '') + '/';
const routeUrl = route => `${base}${route.replace(/^\//, '')}.html`;
// Vercel serves clean URLs; a local preview keeps .html. Either is the same page.
const samePage = (actual, route) => actual.replace(/\.html$/, '') === routeUrl(route).replace(/\.html$/, '');
const shots = '/tmp/focusforge-web-review';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
await mkdir(shots, { recursive: true });
const watch = page => {
 page.on('pageerror', error => errors.push(error.message));
 page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
};
try {
 for (const colorScheme of ['light', 'dark']) for (const width of [320, 390, 768, 1024, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme });
  watch(page);
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Skip to content');
  // One light sheet on a cool desk, whatever the browser prefers.
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(216, 222, 227)');
  assert.equal(await page.locator('.sheet').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(245, 245, 243)');
  assert.match(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /^Figtree/);
  assert.ok(await page.evaluate(() => document.fonts.check('800 40px Figtree') && document.fonts.check('italic 300 40px Figtree')), 'Figtree upright and italic load');
  // Nothing moves on its own.
  assert.equal(await page.evaluate(() => document.getAnimations().length), 0, 'no running animations');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `home overflow at ${width}`);
  // Every phone is a OnePlus 15: 76.7 × 161.4 mm, with a centred camera.
  const phones = await page.locator('.op15-body').evaluateAll(bodies => bodies.map(body => {
   const box = body.getBoundingClientRect();
   const camera = body.querySelector('.op15-camera').getBoundingClientRect();
   return { ratio: box.width / box.height, centred: Math.abs((camera.left + camera.width / 2) - (box.left + box.width / 2)) };
  }));
  assert.equal(phones.length, 8);
  for (const phone of phones) {
   assert.ok(Math.abs(phone.ratio - 76.7 / 161.4) < .004, `phone proportions ${phone.ratio}`);
   assert.ok(phone.centred < 1.5, 'punch-hole camera is centred');
  }
  assert.ok(await page.locator('.op15 img').evaluateAll(images => images.every(img => img.naturalWidth === 720)), 'screenshots load');
  // The real screenshot keeps both system bars: at most 1.5% of it is cropped.
  const crops = await page.locator('.op15 img').evaluateAll(images => images.map(img => { const box = img.getBoundingClientRect(); return 1 - (box.width / box.height) / (img.naturalWidth / img.naturalHeight); }));
  assert.ok(crops.every(crop => Math.abs(crop) < .015), `screenshot crop ${crops}`);
  // The hero headline and its phone stay on screen together on wide layouts.
  if (width >= 1024) {
   const hero = await page.locator('.hero').evaluate(el => {
    const phone = el.querySelector('.hero-phone').getBoundingClientRect();
    const lead = el.querySelector('.hero-lead').getBoundingClientRect();
    return { phoneBottom: phone.bottom, leadRight: lead.right, phoneLeft: phone.left };
   });
   assert.ok(hero.leadRight < hero.phoneLeft, 'hero copy never runs under the phone');
  }
  const downloads = await page.locator('a[href*="releases/latest"]').count();
  assert.ok(downloads >= 2);
  if (width <= 820) {
   const toggle = page.locator('.menu-toggle');
   await page.getByRole('button', { name: 'Menu' }).click();
   assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
   assert.ok(await page.locator('#navigation').isVisible());
   if (colorScheme === 'light') await page.screenshot({ path: `${shots}/menu-${width}.png` });
   await page.keyboard.press('Escape');
   assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
   assert.equal(await page.locator(':focus').textContent(), 'Menu');
  }
  // The closing wordmark spans the sheet without spilling past it.
  const mark = await page.locator('.footer-wordmark').evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); const text = range.getBoundingClientRect(); const box = el.getBoundingClientRect(); return text.width / box.width; });
  assert.ok(mark > .9 && mark <= 1.001, `wordmark fills ${mark}`);
  // A tool card turns over to its other theme and back, one card at a time.
  if (colorScheme === 'light') {
   const card = page.locator('.tool').first();
   const flip = card.locator('.tool-flip');
   await card.scrollIntoViewIfNeeded();
   await card.click({ position: { x: 40, y: 220 } });
   assert.equal(await flip.getAttribute('aria-pressed'), 'true');
   assert.equal(await page.locator('.tool.is-light').count(), 1, 'only the clicked card turns');
   await page.waitForTimeout(900);
   assert.equal(await card.locator('.tool-ink').getAttribute('aria-hidden'), 'false');
   assert.equal(await card.locator('.tool-face').first().getAttribute('aria-hidden'), 'true');
   assert.match(await card.locator('.tool-ink img').getAttribute('src'), /-light\.webp$/);
   if (width === 1440) await page.screenshot({ path: `${shots}/flip-1440.png`, clip: await card.boundingBox() });
   await flip.focus();
   await page.keyboard.press('Enter');
   assert.equal(await flip.getAttribute('aria-pressed'), 'false');
   // The session steps play once when they come into view, and finish.
   await page.locator('.session').scrollIntoViewIfNeeded();
   await page.waitForFunction(() => document.querySelector('.session').dataset.reveal === 'played');
   await page.waitForTimeout(2300);
   assert.ok(await page.locator('.session li').evaluateAll(items => items.every(item => getComputedStyle(item, '::after').transform.startsWith('matrix(1') && getComputedStyle(item.querySelector('p')).opacity === '1')), 'every step finishes drawn and visible');
   await page.evaluate(() => window.scrollTo(0, 0));
  }
  // Questions fill the width on large screens instead of trailing one long
  // column beside a short heading; tablets and phones read them in one.
  const columns = await page.locator('.faq-list').evaluateAll(lists => lists.map(list => { const box = list.getBoundingClientRect(); return { left: box.left, top: box.top, height: box.height }; }));
  assert.equal(columns.length, 2);
  if (width >= 1024) {
   assert.ok(columns[1].left > columns[0].left && Math.abs(columns[1].top - columns[0].top) < 2, 'FAQ columns side by side');
   assert.ok(Math.abs(columns[0].height - columns[1].height) < columns[0].height * .35, 'FAQ columns balanced');
  } else assert.ok(columns[1].top > columns[0].top, 'FAQ stacks below 1024px');
  const faq = page.locator('.faq details').first();
  await faq.locator('summary').click();
  assert.equal(await faq.getAttribute('open'), '');
  // The answer types itself out, then sits complete; assistive tech gets it whole at once.
  const full = (await faq.locator('.sr-only').textContent()).trim();
  const typedNow = await faq.locator('.typed').evaluate(el => el.textContent.length - el.querySelector('.untyped').textContent.length);
  assert.ok(typedNow < full.length, 'answer starts partway typed');
  await page.waitForFunction(el => !el.querySelector('.caret') && el.querySelector('.untyped').textContent === '', await faq.elementHandle(), { timeout: 3000 });
  assert.equal((await faq.locator('.typed').textContent()).trim(), full);
  // Walk the page once so lazy phone screens are decoded before the capture.
  for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 700) { await page.evaluate(top => window.scrollTo(0, top), y); await page.waitForTimeout(60); }
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${shots}/home-${width}-${colorScheme}.png`, fullPage: true });
  for (const route of ['/privacy', '/terms', '/support', '/delete-account', '/get-on-play', '/verify-email']) {
   await page.goto(routeUrl(route));
   assert.equal(await page.locator('h1').count(), 1);
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}`);
   if (colorScheme === 'light' && (width === 390 || width === 1440)) await page.screenshot({ path: `${shots}${route}-${width}.png`, fullPage: true });
  }
  await page.close();
 }
 const reduced = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
 watch(reduced);
 await reduced.goto(base);
 assert.equal(await reduced.locator('.button').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
 // Reduced motion: the steps are already finished and a card swaps without turning.
 assert.equal(await reduced.locator('.session').getAttribute('data-reveal'), null);
 await reduced.locator('.tool').first().click({ position: { x: 40, y: 220 } });
 assert.equal(await reduced.locator('.tool-turn').first().evaluate(el => getComputedStyle(el).transform), 'none');
 assert.equal(await reduced.locator('.tool-ink').first().evaluate(el => getComputedStyle(el).visibility), 'visible');
 await reduced.close();
 const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
 watch(page);
 await page.goto(base);
 await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ state: 'visible' });
 assert.equal(await page.getByRole('button', { name: 'Menu' }).isVisible(), false);
 await page.getByRole('link', { name: 'Privacy policy', exact: true }).last().click();
 assert.ok(samePage(page.url(), '/privacy'), page.url());
 const privacyText = await page.locator('main').innerText();
 assert.match(privacyText, /Draw over other apps/);
 assert.match(privacyText, /Normal-app shielding does not require this service/);
 assert.match(privacyText, /Private achievement backup/);
 assert.match(privacyText, /Installed apps and app usage/);
 await page.locator('main a[href*="delete-account"]').first().click();
 assert.ok(samePage(page.url(), '/delete-account'), page.url());
 await page.getByRole('heading', { name: 'Sign in to delete your account.', exact: true }).waitFor();
 assert.ok(await page.getByText('Enable JavaScript', { exact: false }).isVisible());
 const email = new URL(await page.getByRole('link', { name: 'Email support', exact: true }).getAttribute('href'));
 assert.equal(email.protocol, 'mailto:');
 assert.equal(email.pathname, 'focusforgehelp@gmail.com');
 assert.deepEqual(errors, []);
 console.log(`PASS: widths 320/390/768/1024/1440 in light and dark preferences, OnePlus 15 frames, no autonomous motion, menu, FAQ, skip link, reduced motion, every route and the no-JavaScript path. Screenshots in ${shots}.`);
} finally { await browser.close(); }
