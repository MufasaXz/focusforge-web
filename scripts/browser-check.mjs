import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.TEST_URL || 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
await mkdir('/tmp/focusforge-web-review', { recursive: true });
try {
 for (const colorScheme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('heading', { name: /Make room/ }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Skip to content');
  assert.equal(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
  assert.equal(await page.locator('.phone-front').evaluate(el => getComputedStyle(el).animationName), 'none');
  const downloads = await page.locator('a[href*="releases/latest"]').evaluateAll(links => links.map(link => link.href));
  assert.ok(downloads.length >= 3);
  assert.ok(downloads.every(href => href === 'https://github.com/MufasaXz/focusforge/releases/latest'));
  await page.getByRole('button', { name: 'Make a little space' }).click();
  await page.getByRole('button', { name: 'Bring back the noise', pressed: true }).waitFor();
  await page.getByRole('tab', { name: /Find your rhythm/ }).click();
  await page.getByRole('button', { name: 'Try dark mode' }).click();
  assert.match(await page.locator('#tool-panel img').getAttribute('src'), /focus-dark/);
  await page.getByRole('tab', { name: /Find your rhythm/ }).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('tab', { name: /See your progress/, selected: true }).waitFor();
  await page.locator('summary').filter({ hasText: 'Is FocusForge really free?' }).click();
  assert.equal(await page.locator('.faq-list details').first().getAttribute('open'), '');
  if (width <= 768) {
   await page.getByRole('button', { name: 'Menu' }).click();
   await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ state: 'visible' });
   await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded'), 'false');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `/tmp/focusforge-web-review/home-${width}-${colorScheme}.png`, fullPage: true });
  for (const route of ['/privacy', '/terms', '/support', '/delete-account']) {
   await page.goto(`${base}${route}`);
   assert.equal(await page.locator('h1').count(), 1);
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}`);
  }
  await page.close();
 }
 const animated = await browser.newPage({ reducedMotion: 'no-preference' });
 await animated.goto(base);
 assert.equal(await animated.locator('.phone-front').evaluate(el => getComputedStyle(el).animationName), 'float-front');
 await animated.close();
 const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
 await page.goto(base);
 await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ state: 'visible' });
 assert.equal(await page.getByRole('button', { name: 'Menu' }).isVisible(), false);
 await page.goto(`${base}/privacy`);
 assert.match(await page.locator('main').innerText(), /installed-app catalog/);
 await page.goto(`${base}/delete-account`);
 const email = new URL(await page.getByRole('link', { name: 'Email a deletion request' }).getAttribute('href'));
 assert.equal(email.protocol, 'mailto:');
 assert.equal(email.pathname, 'sudeepyadav7272@gmail.com');
 assert.equal(email.searchParams.get('subject'), 'FocusForge account and data deletion request');
 assert.match(email.searchParams.get('body'), /I will not send passwords, PINs, or verification codes/);
 assert.deepEqual(errors, []);
 console.log('PASS: widths 320/390/768/1440 in light/dark browser preferences; direct routes, keyboard focus/tabs, dark preview, noise interaction, FAQ, menu Escape, reduced/normal motion, download/mailto destinations, no-JS mobile navigation/legal pages, no page errors.');
} finally { await browser.close(); }
