import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = (process.env.TEST_URL || 'http://localhost:4173').replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
const destinations = [
  'https://groups.google.com/g/focusforge',
  'https://play.google.com/apps/testing/dev.focusforge.focusforge',
  'https://play.google.com/store/apps/details?id=dev.focusforge.focusforge',
];
await mkdir('/tmp/focusforge-web-review', { recursive: true });
try {
  for (const javaScriptEnabled of [true, false]) {
    for (const reducedMotion of ['reduce', 'no-preference']) {
      for (const width of [320, 390, 768, 1440]) {
        const page = await browser.newPage({ javaScriptEnabled, reducedMotion, viewport: { width, height: 900 } });
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        await page.goto(`${base}/get-on-play.html`);
        await page.getByRole('heading', { name: /Help bring FocusForge/ }).waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `testing guide overflow at ${width}px`);
        assert.equal(await page.locator('main').count(), 1);
        assert.equal(await page.locator('h1').count(), 1);
        assert.deepEqual(await page.locator('.play-test-steps a').evaluateAll(links => links.map(link => link.href)), destinations);
        for (const link of await page.locator('.play-test-steps a').all()) {
          const box = await link.boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44, 'testing actions have usable tap targets');
        }
        const copy = await page.locator('main').innerText();
        for (const content of ['50+ testers', 'same Gmail', '14 consecutive days', '1–5 minutes daily', 'honest feedback', 'private to the developer']) assert.ok(copy.includes(content), content);
        assert.equal(await page.getByRole('link', { name: 'Get FocusForge on GitHub' }).getAttribute('href'), 'https://github.com/MufasaXz/focusforge/releases/latest');
        await page.screenshot({ path: `/tmp/focusforge-web-review/test-guide-${width}-${javaScriptEnabled}-${reducedMotion}.png`, fullPage: true });
        await page.getByRole('link', { name: 'FocusForge home', exact: true }).click();
        assert.equal(await page.locator('a[href*="get-on-play"]').count(), 0);
        assert.equal(await page.locator('.hero-actions').getByRole('link', { name: 'Download for Android' }).getAttribute('href'), 'https://github.com/MufasaXz/focusforge/releases/latest');
        await page.close();
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: tester guide links, copy, tap targets, home navigation, no overflow or page errors at 320/390/768/1440px, with and without JavaScript and reduced motion.');
} finally { await browser.close(); }
