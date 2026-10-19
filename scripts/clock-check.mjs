import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const base = process.env.TEST_URL || 'http://localhost:4173';
const errors = [];
try {
  for (const width of [320, 390, 520, 768, 1100, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.waitForTimeout(1300);
    await page.locator('.phone-front').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.evaluate(() => document.fonts.ready);
    const layout = () => page.locator('.phone-front').evaluate(phone => {
      const stage = phone.querySelector('.hero-clock-stage');
      return { ratio: stage.clientWidth / phone.clientWidth, aspect: stage.clientWidth / stage.clientHeight, font: parseFloat(getComputedStyle(stage.querySelector('.hero-demo-clock')).fontSize) / stage.clientWidth, faces: [...stage.querySelectorAll('.clock-face')].map(el => [el.offsetLeft, el.offsetTop, el.clientWidth, el.clientHeight]) };
    });
    const first = await layout();
    assert.ok(Math.abs(first.ratio - .853) < .01 && Math.abs(first.aspect - 1) < .01, 'every face shares a square surface inside the phone');
    assert.ok(Math.abs(first.font - .18) < .005, 'digits scale with the clock, including narrow screens');
    assert.ok(first.faces.every(b => b.every((value, i) => Math.abs(value - first.faces[0][i]) < 1)), 'faces share the same origin and dimensions');
    console.log('Checking clock at', width, await page.locator('.phone-front').getAttribute('data-clock-motion'), await page.locator('.clock-a11y').textContent());
    await page.waitForFunction(() => document.querySelector('.phone-front').dataset.face === 'Flip').catch(async error => { console.log('Clock state on failure', width, await page.locator('.phone-front').evaluate(el => ({ face: el.dataset.face, active: el.dataset.clockMotion, time: el.querySelector('.clock-a11y').textContent, bounds: el.getBoundingClientRect().toJSON(), scroll: scrollY }))); throw error; });
    await page.waitForFunction(() => document.querySelector('.demo-flip-card:last-child').dataset.flipping === 'true');
    const turn = await page.locator('.demo-flip-card').last().evaluate(card => ({ from: card.querySelector('.flip-falling span').textContent, oldBottom: card.querySelector('.flip-bottom:not(.flip-rising) span').textContent, to: card.dataset.digit, top: card.querySelector('.flip-top:not(.flip-falling) span').textContent, bottom: card.querySelector('.flip-rising span').textContent, starts: card.getAnimations({ subtree: true }).map(a => a.startTime) }));
    assert.notEqual(turn.from, turn.to, 'flip preserves outgoing digit');
    assert.equal(turn.from, turn.oldBottom, 'old lower half remains while upper half folds');
    assert.equal(turn.to, turn.top);
    assert.equal(turn.to, turn.bottom);
    assert.equal(turn.starts.length, 2);
    assert.equal(turn.starts[0], turn.starts[1], 'both flip halves share one animation start');
    await page.waitForFunction(() => document.querySelector('.demo-flip-card:last-child').dataset.flipping === 'false');
    const settled = await page.locator('.demo-flip-card').evaluateAll(cards => cards.every(card => [...card.querySelectorAll('.flip-half span')].every(span => span.textContent === card.dataset.digit)));
    assert.ok(settled, 'finished flips show one consistent digit');
    assert.equal(await page.locator('.demo-flip-colon i').count(), 2);
    await page.setViewportSize({ width: width + 7, height: 1000 });
    const resized = await layout();
    assert.ok(Math.abs(resized.ratio - first.ratio) < .01 && Math.abs(resized.font - first.font) < .005, 'live resize preserves proportions');
    await page.waitForFunction(() => document.querySelector('.phone-front').dataset.face === 'Minimal');
    assert.deepEqual(await page.locator('.hero-minimal-digits').textContent(), await page.locator('.clock-a11y').textContent());
    const sync = await page.locator('.hero-clock-stage').evaluate(stage => {
      const angle = Number(stage.querySelector('.retro-hand').dataset.angle);
      const fraction = Number(stage.querySelector('.minimal-progress-ring circle:last-child').getAttribute('stroke-dasharray').split(' ')[0]);
      const [m,s] = stage.parentElement.querySelector('.clock-a11y').textContent.split(':').map(Number);
      return {angle, fraction, elapsed: 1500 - m*60-s};
    });
    assert.ok(Math.abs(sync.angle/360 - sync.fraction) < .00001, 'pointer and ring sample the same timeline');
    assert.ok(sync.fraction * 1500 >= sync.elapsed && sync.fraction * 1500 - sync.elapsed < 1, 'digits and continuous progress agree within one displayed second');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.phone-front').dataset.face === 'Retro');
    assert.equal(await page.locator('.clock-face.face-visible').count(), 1);
    assert.equal(await page.locator('.clock-face').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no page overflow');
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: shared clock surface, responsive proportions, synchronized progress and digits, complete flip halves, live resize and reduced motion at 320/390/520/768/1100/1440px.');
} finally { await browser.close(); }
