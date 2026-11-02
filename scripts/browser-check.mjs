import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = (process.env.TEST_URL || 'http://localhost:4173').replace(/\/$/, '') + '/';
const routeUrl = route => `${base}${route.replace(/^\//, '')}.html`;
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
  assert.equal(phones.length, 4);
  for (const phone of phones) {
   assert.ok(Math.abs(phone.ratio - 76.7 / 161.4) < .004, `phone proportions ${phone.ratio}`);
   assert.ok(phone.centred < 1.5, 'punch-hole camera is centred');
  }
  assert.ok(await page.locator('.op15 img').evaluateAll(images => images.every(img => img.naturalWidth === 780)), 'app renders load');
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
  const faq = page.locator('.faq details').first();
  await faq.locator('summary').click();
  assert.equal(await faq.getAttribute('open'), '');
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
 await reduced.close();
 const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
 watch(page);
 await page.goto(base);
 await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ state: 'visible' });
 assert.equal(await page.getByRole('button', { name: 'Menu' }).isVisible(), false);
 await page.getByRole('link', { name: 'Privacy policy', exact: true }).last().click();
 assert.equal(page.url(), routeUrl('/privacy'));
 const privacyText = await page.locator('main').innerText();
 assert.match(privacyText, /Draw over other apps/);
 assert.match(privacyText, /Normal-app shielding does not require this service/);
 assert.match(privacyText, /Private achievement backup/);
 assert.match(privacyText, /Installed apps and app usage/);
 await page.getByRole('link', { name: 'Delete account', exact: true }).click();
 assert.equal(page.url(), routeUrl('/delete-account'));
 await page.getByRole('heading', { name: 'Sign in to delete your account.', exact: true }).waitFor();
 assert.ok(await page.getByText('Enable JavaScript', { exact: false }).isVisible());
 const email = new URL(await page.getByRole('link', { name: 'Email support', exact: true }).getAttribute('href'));
 assert.equal(email.protocol, 'mailto:');
 assert.equal(email.pathname, 'sudeepyadav7272@gmail.com');
 assert.deepEqual(errors, []);
 console.log(`PASS: widths 320/390/768/1024/1440 in light and dark preferences, OnePlus 15 frames, no autonomous motion, menu, FAQ, skip link, reduced motion, every route and the no-JavaScript path. Screenshots in ${shots}.`);
} finally { await browser.close(); }
