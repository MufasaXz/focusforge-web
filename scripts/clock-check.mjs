import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Expected dimensions come from actual 390 × 844 Flutter renders, independently
// scaled into the 680 × 1416 phone frame (636 × 1376 screen, offset 22 / 20).
// Catch both faces being squeezed into the same circular masking disc.
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
const base = process.env.TEST_URL || 'http://localhost:4173';
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.locator('.hero-face-capture').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await page.locator('.phone-front').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.phone-front').dataset.face === 'Flip');
    await page.waitForTimeout(550);
    const board = await page.locator('.phone-front').evaluate(phone => {
      const el = phone.querySelector('.demo-flip-board');
      const card = phone.querySelector('.demo-flip-card');
      const face = phone.querySelector('.hero-face-flip');
      const ratio = 680 / phone.clientWidth;
      return { left: face.offsetLeft * ratio, top: face.offsetTop * ratio, layoutWidth: el.offsetWidth * ratio, height: el.offsetHeight * ratio, cardWidth: card.offsetWidth * ratio, cardHeight: card.offsetHeight * ratio, colon: phone.querySelector('.demo-flip-colon').children.length };
    });
    assert.ok(Math.abs(board.left - 57.64) < 4 && Math.abs(board.top - 355.85) < 4, 'Flip overlays the native board position at ' + width + 'px');
    assert.ok(Math.abs(board.layoutWidth - 564.72) < 5, 'Flip uses the app full-width board at ' + width + 'px: ' + JSON.stringify(board));
    assert.ok(Math.abs(board.height - 199.76) < 4, 'Flip card height matches native app at ' + width + 'px');
    assert.ok(Math.abs(board.cardWidth / board.cardHeight - .6007) < .02, 'Flip cards preserve native aspect ratio at ' + width + 'px');
    assert.equal(board.colon, 2, 'Flip separator uses the app two circular dots');
    await page.waitForFunction(() => document.querySelector('.phone-front').dataset.face === 'Minimal');
    await page.waitForTimeout(550);
    const minimal = await page.locator('.phone-front').evaluate(phone => {
      const digits = phone.querySelector('.hero-minimal-digits');
      const ring = phone.querySelector('.minimal-progress-ring');
      const rule = phone.querySelector('.hero-face-minimal i');
      const ratio = 680 / phone.clientWidth;
      return { ring: !!ring, width: digits?.offsetWidth * ratio, font: parseFloat(getComputedStyle(digits || phone).fontSize) * ratio, rule: rule?.offsetWidth * ratio, fraction: parseFloat(rule?.firstElementChild.style.transform.match(/[\d.]+/)?.[0] || '0') };
    });
    assert.ok(minimal.ring, 'Minimal retains the app circular progress ring');
    assert.ok(Math.abs(minimal.width - 266.26) < 5, 'Minimal digits match native fit at ' + width + 'px');
    assert.ok(Math.abs(minimal.font - 96.36) < 3, 'Minimal font matches native scale at ' + width + 'px');
    assert.ok(Math.abs(minimal.rule - 348.98) < 5, 'Minimal rule matches native 214dp fitted width at ' + width + 'px');
    assert.ok(minimal.fraction > 0 && minimal.fraction < 1, 'Minimal rule reads live session progress');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at ' + width + 'px');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.phone-front').dataset.face === 'Retro');
    assert.equal(await page.locator('.hero-retro-pointer.face-visible').count(), 1, 'Reduced motion preserves Retro');
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: native Flip board/card proportions and two-dot separator; Minimal ring, font fit, progress rule; 320/390/768/1440px; reduced-motion Retro; no overflow or page errors.');
} finally { await browser.close(); }
