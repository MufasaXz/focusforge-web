import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = (process.env.TEST_URL || 'http://localhost:4173').replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
const play = 'https://play.google.com/store/apps/details?id=dev.focusforge.focusforge';
await mkdir('/tmp/focusforge-web-review', { recursive: true });
try {
  for (const javaScriptEnabled of [true, false]) {
    for (const reducedMotion of ['reduce', 'no-preference']) {
      for (const width of [320, 390, 768, 1440]) {
        const page = await browser.newPage({ javaScriptEnabled, reducedMotion, viewport: { width, height: 900 } });
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        await page.goto(`${base}/get-on-play.html`);
        await page.getByRole('heading', { name: /FocusForge is on/ }).waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `launch page overflow at ${width}px`);
        assert.equal(await page.locator('main').count(), 1);
        assert.equal(await page.locator('h1').count(), 1);
        const badge = page.getByRole('link', { name: 'Get it on Google Play' });
        assert.equal(await badge.getAttribute('href'), play);
        const box = await badge.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, 'the Play badge has a usable tap target');
        assert.equal(await page.getByRole('link', { name: 'Get FocusForge on GitHub' }).getAttribute('href'), 'https://github.com/MufasaXz/focusforge/releases/latest');
        await page.screenshot({ path: `/tmp/focusforge-web-review/launch-${width}-${javaScriptEnabled}-${reducedMotion}.png`, fullPage: true });
        await page.getByRole('link', { name: 'FocusForge home', exact: true }).click();
        assert.equal(await page.locator('a[href*="get-on-play"]').count(), 0);
        assert.equal(await page.locator('.hero-actions').getByRole('link', { name: 'Get it on Google Play' }).getAttribute('href'), play);
        assert.equal(await page.locator('.hero-actions').getByRole('link', { name: 'Or download the APK' }).getAttribute('href'), 'https://github.com/MufasaXz/focusforge/releases/latest');
        await page.close();
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: launch page and home Play links, tap targets, home navigation, no overflow or page errors at 320/390/768/1440px, with and without JavaScript and reduced motion.');
} finally { await browser.close(); }
