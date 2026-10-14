import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = (process.env.TEST_URL || 'http://localhost:4173').replace(/\/$/, '') + '/';
const routeUrl = route => `${base}${route.replace(/^\//, '')}.html`;
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
await mkdir('/tmp/focusforge-web-review', { recursive: true });
try {
 for (const reducedMotion of ['reduce', 'no-preference']) for (const colorScheme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme, reducedMotion });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base);
  await page.getByRole('heading', { name: /Make room/ }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.locator('.wordmark img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth === 512)));
  assert.ok(await page.locator('img').evaluateAll(images => images.every(img => new URL(img.src).pathname.startsWith(new URL(document.URL).pathname))));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(244, 236, 223)', 'warm paper remains consistent under browser color preferences');
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).color), 'rgb(38, 41, 35)', 'original charcoal ink');
  assert.match(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage), /repeating-linear-gradient/, 'subtle CSS grain, no photo texture');
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily), 'Inter, Arial, sans-serif');
  assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), 'InterDisplay, Arial, sans-serif');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Skip to content');
  assert.equal(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
  assert.ok((await page.locator('.phone-front').evaluate(el => getComputedStyle(el).animationName)).includes(reducedMotion === 'reduce' ? 'none' : 'float-front'));
  const downloads = await page.locator('a[href*="releases/latest"]').evaluateAll(links => links.map(link => link.href));
  assert.ok(downloads.length >= 3);
  assert.ok(downloads.every(href => href === 'https://github.com/MufasaXz/focusforge/releases/latest'));
  assert.equal(await page.locator('.noise-control, .tabs, .ritual').count(), 0);
  await page.locator('.feature-rail').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.feature-slide.focus').classList.contains('current'));
  assert.match(await page.locator('.feature-slide.current img').getAttribute('src'), /focus-dark/);
  await page.getByRole('button', { name: 'Next feature' }).click();
  await page.waitForFunction(() => document.querySelector('.feature-slide.progress').classList.contains('current'));
  await page.getByRole('button', { name: 'Previous feature' }).click();
  await page.waitForFunction(() => document.querySelector('.feature-slide.focus').classList.contains('current'));
  assert.ok(await page.locator('.hero-phone img, img.hero-phone, .feature-phone img').evaluateAll(images => images.every(image => image.src.includes('-dark.png'))));
  const boxes = await page.locator('#leaderboard, #friends').evaluateAll(elements => elements.map(el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y }; }));
  if (width > 650) assert.ok(Math.abs(boxes[0].y - boxes[1].y) < 2 && boxes[1].x > boxes[0].x);
  else assert.ok(boxes[1].y > boxes[0].y);
  await page.locator('.story-scroll').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.sketch-stage').evaluate(el => el.style.getPropertyValue('--thought-opacity')), reducedMotion === 'reduce' ? '0' : '1');
  assert.notEqual(await page.locator('.sketch-phone').evaluate(el => getComputedStyle(el).stroke), await page.locator('.sketch-phone > path').first().evaluate(el => getComputedStyle(el).fill), 'pencil phone remains legible against paper');
  if (reducedMotion !== 'reduce') {
    await page.locator('.story-scroll').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * .22, behavior: 'instant' }));
    await page.waitForTimeout(100);
    assert.ok(Math.abs(await page.locator('.sketch-stage').evaluate(el => el.getBoundingClientRect().top)) < 2, 'drawing remains pinned while the document moves');
    assert.ok(await page.locator('.thought-dust').evaluate(canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some((value, i) => i % 4 === 3 && value > 0)), 'scroll dissolves actual pencil paths into visible particles');
    assert.equal(await page.locator('.story-pov, .story-timer').count(), 0);
    await page.locator('.story-scroll').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * .94, behavior: 'instant' }));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.sketch-stage').getAttribute('data-studying'), 'true');
    assert.equal(await page.locator('.sketch-stage').getAttribute('data-dissolved'), 'true');
    assert.equal(await page.locator('.study-desk').evaluate(el => getComputedStyle(el).opacity), '1');
    const writingTime = await page.locator('.writing-hand').evaluate(el => el.getAnimations()[0].currentTime);
    await page.waitForTimeout(100);
    assert.ok(await page.locator('.writing-hand').evaluate((el, time) => el.getAnimations()[0].playState === 'running' && el.getAnimations()[0].currentTime > time, writingTime), 'hand visibly writes at the desk');
    await page.mouse.wheel(0, 1500);
    await page.waitForFunction(() => document.querySelector('.story-scroll').getBoundingClientRect().bottom < innerHeight);
    assert.ok(await page.locator('.story-scroll').evaluate(el => el.getBoundingClientRect().bottom < innerHeight), 'ordinary wheel scroll exits the sticky scene without trapping');
  } else {
    assert.equal(await page.locator('.reduced-story').isVisible(), true);
    assert.equal(await page.locator('.writing-hand').evaluate(el => el.getAnimations().length), 0);
    assert.equal(await page.locator('.study-desk').evaluate(el => getComputedStyle(el).opacity), '1', 'reduced motion exposes the study outcome');
  }
  if (width === 320) {
    assert.ok(await page.locator('.mind-sketch').evaluate(svg => {
      const bounds = svg.getBoundingClientRect();
      return [...svg.querySelectorAll('.mobile-thoughts text, .study-desk')].every(el => { const b = el.getBoundingClientRect(); return b.left >= bounds.left - 1 && b.right <= bounds.right + 1 && b.bottom <= bounds.bottom + 1; });
    }), 'mobile thoughts and desk fit the drawing');
  }
  await page.locator('.feature-controls').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Next feature' }).click();
  await page.waitForFunction(() => document.querySelector('.feature-slide.progress').classList.contains('current'));
  assert.equal(await page.locator('.toolkit-phone, .toolkit-flip').count(), 0);
  assert.equal(await page.locator('.feature-slide:not(.current)').evaluateAll(elements => elements.every(el => el.inert)), true);
  await page.locator('.podium').scrollIntoViewIfNeeded();
  assert.deepEqual(await page.locator('.podium-name').allTextContents(), ['Keshab', 'Sudeep', 'Pranshu']);
  assert.equal(await page.locator('.rank-list').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Replay podium' }).isDisabled(), reducedMotion === 'reduce');
  await page.locator('.friends-art').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.friend-timer').count(), 4);
  assert.equal(await page.locator('.friend-timer').last().innerText(), '—\nNot focusing');
  await page.locator('summary').filter({ hasText: 'Is FocusForge really free?' }).click();
  assert.equal(await page.locator('.faq-list details').first().getAttribute('open'), '');
  if (width <= 768) {
   await page.getByRole('button', { name: 'Menu' }).click();
   await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ state: 'visible' });
   await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded'), 'false');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `/tmp/focusforge-web-review/home-${width}-${colorScheme}-${reducedMotion}.png`, fullPage: true });
  for (const route of ['/privacy', '/terms', '/support', '/delete-account']) {
   await page.goto(routeUrl(route));
   assert.equal(await page.locator('h1').count(), 1);
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}`);
  }
  await page.close();
 }
 for (const viewport of [{ width: 320, height: 480 }, { width: 900, height: 420 }]) {
   const short = await browser.newPage({ viewport, reducedMotion: 'no-preference' });
   short.on('pageerror', error => errors.push(error.message));
   await short.goto(base);
   for (const [progress, shot] of [[.94, 'study'], [.7, 'study'], [.43, 'dust'], [0, 'thoughtful']]) {
    await short.locator('.story-scroll').evaluate((el, progress) => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * progress, behavior: 'instant' }), progress);
    await short.waitForTimeout(120);
    assert.equal(await short.locator('.sketch-stage').getAttribute('data-shot'), shot, 'short viewports reverse through every shot');
    assert.ok(await short.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   }
   await short.locator('#faq').scrollIntoViewIfNeeded();
   await short.waitForTimeout(100);
   assert.equal(await short.locator('.sketch-stage').getAttribute('data-motion'), 'paused');
   await short.close();
  }
 const animated = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
 animated.on('pageerror', error => errors.push(error.message));
 await animated.goto(base);
 assert.ok((await animated.locator('.phone-front').evaluate(el => getComputedStyle(el).animationName)).includes('float-front'));
 const seconds = time => time.split(':').reduce((minutes, seconds) => Number(minutes) * 60 + Number(seconds));
 const clockBefore = await animated.locator('.hero-demo-clock').textContent();
 await animated.waitForFunction(before => document.querySelector('.hero-demo-clock').textContent !== before, clockBefore, { timeout: 3500 });
 assert.notEqual(await animated.locator('.hero-demo-clock').textContent(), clockBefore, 'illustrative countdown advances');
 const alignment = await animated.locator('.phone-front').evaluate(el => {
   const clock = el.querySelector('.hero-demo-clock');
   const scale = 680 / el.clientWidth;
   return { x: clock.offsetLeft * scale, y: clock.offsetTop * scale, width: clock.clientWidth * scale, height: clock.clientHeight * scale, font: parseFloat(getComputedStyle(clock).fontSize) * scale };
 });
 assert.ok(Math.abs(alignment.x - 229) < 3 && Math.abs(alignment.y - 592) < 3, 'mask aligns with measured source glyph origin');
 assert.ok(Math.abs(alignment.width - 224) < 3 && Math.abs(alignment.height - 74) < 3 && Math.abs(alignment.font - 86) < 1, 'mask and type match the 680 × 1416 source capture');
 await animated.evaluate(() => {
   Object.defineProperty(document, 'hidden', { configurable: true, value: true });
   document.dispatchEvent(new Event('visibilitychange'));
 });
 const hiddenClock = await animated.locator('.hero-demo-clock').textContent();
 await animated.waitForTimeout(2200);
 assert.equal(await animated.locator('.hero-demo-clock').textContent(), hiddenClock, 'hidden timer does not render');
 await animated.evaluate(() => {
   Object.defineProperty(document, 'hidden', { configurable: true, value: false });
   document.dispatchEvent(new Event('visibilitychange'));
 });
 await animated.waitForFunction(before => document.querySelector('.hero-demo-clock').textContent !== before, hiddenClock);
 assert.ok(seconds(hiddenClock) - seconds(await animated.locator('.hero-demo-clock').textContent()) >= 2, 'resume catches up to deadline instead of counting callbacks');
 const wheel = animated.locator('.sunburst');
 const before = await wheel.evaluate(el => { const animation = el.getAnimations()[0]; return { time: animation.currentTime, state: animation.playState }; });
 assert.equal(before.state, 'running');
 await animated.waitForTimeout(120);
 assert.ok(await wheel.evaluate((el, time) => el.getAnimations()[0].currentTime > time, before.time));
 assert.ok(await animated.locator('.phone-front').evaluate(el => el.getAnimations().some(a => a.animationName === 'float-front' && a.playState === 'running' && a.currentTime > 0)));
 const art = animated.locator('.hero-art');
 const bounds = await art.boundingBox();
 await animated.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .3);
 await animated.waitForTimeout(400);
 assert.notEqual(await art.evaluate(el => el.style.getPropertyValue('--depth-x')), '0.000px');
 await animated.locator('#features').scrollIntoViewIfNeeded();
 await animated.waitForTimeout(100);
 const offscreenClock = await animated.locator('.hero-demo-clock').textContent();
 await animated.waitForTimeout(2200);
 assert.equal(await animated.locator('.hero-demo-clock').textContent(), offscreenClock, 'offscreen countdown suspends rendering');
 await animated.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
 await animated.waitForFunction(before => document.querySelector('.hero-demo-clock').textContent !== before, offscreenClock);
 assert.ok(seconds(offscreenClock) - seconds(await animated.locator('.hero-demo-clock').textContent()) >= 2, 'offscreen countdown catches up on re-entry');
 await animated.locator('#features').scrollIntoViewIfNeeded();
 await animated.waitForTimeout(100);
 assert.equal(await wheel.evaluate(el => el.getAnimations()[0].playState), 'paused');
 const pausedTime = await wheel.evaluate(el => el.getAnimations()[0].currentTime);
 await animated.waitForTimeout(120);
 assert.equal(await wheel.evaluate(el => el.getAnimations()[0].currentTime), pausedTime);
 await animated.locator('.feature-rail').evaluate(el => el.scrollTo({ left: el.clientWidth * .35, behavior: 'instant' }));
 await animated.waitForTimeout(80);
 // Inspect two coordinated launcher planes at reversible gesture progress.
 const turn = await animated.locator('.feature-rail').evaluate(async el => {
   el.style.scrollSnapType = 'none';
   el.scrollLeft = el.clientWidth * .35;
   el.dispatchEvent(new Event('scroll'));
   await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
   const leaf = el.querySelector('.feature-slide');
   return { matrix: getComputedStyle(leaf).transform, parts: ['.feature-copy', '.feature-phone', '.feature-aside'].every(selector => leaf.contains(leaf.querySelector(selector))), independent: getComputedStyle(leaf.querySelector('.feature-phone img')).transform, exposed: el.querySelectorAll('.feature-slide:not([inert])').length };
 });
 assert.notEqual(turn.matrix, 'none', 'whole screen owns the launcher transform');
 assert.ok(turn.parts && turn.independent === 'none' && turn.exposed === 1, 'text phone and graphics share one plane without independent flips or accessibility duplicates');
 const launcherPlanes = await animated.locator('.feature-rail').evaluate(el => [...el.querySelectorAll('.feature-slide')].map(screen => ({ angle: parseFloat(screen.style.getPropertyValue('--screen-angle')), before: getComputedStyle(screen, ':before').content, after: getComputedStyle(screen, ':after').content })));
 assert.ok(launcherPlanes[0].angle > 0 && launcherPlanes[1].angle < 0, 'incoming and outgoing screens tilt together in opposite directions');
 assert.ok(launcherPlanes.every(screen => Math.abs(screen.angle) <= 38 && screen.before === 'none' && screen.after === 'none'), 'restrained launcher angles without leaf backs or shadows');
 await animated.locator('.feature-rail').evaluate(el => { el.style.scrollSnapType = ''; el.scrollTo({ left: 0, behavior: 'instant' }); });
 await animated.waitForFunction(() => document.querySelector('.feature-slide.shield').classList.contains('current'));
 await animated.locator('.feature-rail').focus();
 await animated.keyboard.press('ArrowRight');
 await animated.waitForFunction(() => document.querySelector('.feature-slide.focus').classList.contains('current'));
 const breathing = animated.locator('.current .glyph-focus i').first();
 const breathTime = await breathing.evaluate(el => el.getAnimations()[0].currentTime);
 await animated.waitForTimeout(120);
 assert.ok(await breathing.evaluate((el, time) => el.getAnimations()[0].playState === 'running' && el.getAnimations()[0].currentTime > time, breathTime), 'current feature graphic animates on screen');
 await animated.keyboard.press('End');
 await animated.waitForFunction(() => document.querySelector('.feature-slide.progress').classList.contains('current'));
 await animated.keyboard.press('Home');
 await animated.waitForFunction(() => document.querySelector('.feature-slide.shield').classList.contains('current'));
 await animated.locator('.feature-rail').focus();
 await animated.keyboard.press('ArrowRight');
 await animated.keyboard.press('ArrowRight');
 await animated.waitForFunction(() => document.querySelector('.feature-slide.progress').classList.contains('current'));
 await animated.waitForTimeout(600);
 assert.ok(await animated.locator('.feature-rail').evaluate(el => Math.abs(el.scrollLeft - el.clientWidth * 2) < 2), 'final launcher screen settles fully centered without perspective compressing scroll extent');
 await animated.setViewportSize({ width: 900, height: 900 });
 await animated.waitForTimeout(150);
 assert.ok(await animated.locator('.feature-rail').evaluate(el => Math.abs(el.scrollLeft - el.clientWidth * 2) < 2), 'resize preserves selected screen');
 await animated.setViewportSize({ width: 1440, height: 1000 });
 await animated.waitForTimeout(150);

 await animated.locator('.feature-rail').evaluate(el => el.scrollTo({ left: el.clientWidth, behavior: 'instant' }));
 await animated.waitForFunction(() => document.querySelector('.feature-slide.focus').classList.contains('current'));
 await animated.evaluate(() => {
   Object.defineProperty(document, 'hidden', { configurable: true, value: true });
   document.dispatchEvent(new Event('visibilitychange'));
 });
 assert.ok(await animated.locator('.hero-art, .toolkit-shell, .community-pair, .sketch-stage').evaluateAll(elements => elements.every(el => el.dataset.motion === 'paused')), 'hidden documents suspend every motion container');
 await animated.evaluate(() => {
   Object.defineProperty(document, 'hidden', { configurable: true, value: false });
   document.dispatchEvent(new Event('visibilitychange'));
 });
 assert.equal(await animated.locator('.toolkit-shell').getAttribute('data-motion'), 'running', 'visible toolkit resumes after document visibility returns');
 await animated.emulateMedia({ reducedMotion: 'reduce' });
 assert.equal(await animated.locator('.phone-front').evaluate(el => getComputedStyle(el).animationName), 'none');
 await animated.waitForFunction(() => document.querySelector('.hero-art').style.getPropertyValue('--depth-x') === '');
 assert.equal(await animated.evaluate(() => document.getAnimations().length), 0);
 await animated.emulateMedia({ reducedMotion: 'no-preference' });
 await animated.close();
 const touchPage = await browser.newPage({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
 touchPage.on('pageerror', error => errors.push(error.message));
 await touchPage.goto(base);
 await touchPage.locator('.feature-phone').first().scrollIntoViewIfNeeded();
 const swipeBounds = await touchPage.locator('.feature-rail').boundingBox();
 const swipeY = Math.min(600, Math.max(100, swipeBounds.y + swipeBounds.height / 2));
 const session = await touchPage.context().newCDPSession(touchPage);
 await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 340, y: swipeY }] });
 for (let x = 320; x >= 40; x -= 20) {
   await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: swipeY }] });
   await touchPage.waitForTimeout(16);
 }
 await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
 await touchPage.waitForFunction(() => document.querySelector('.feature-slide.focus').classList.contains('current'));
 await touchPage.waitForTimeout(500);
 await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 40, y: swipeY }] });
 for (let x = 60; x <= 340; x += 20) {
   await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: swipeY }] });
   await touchPage.waitForTimeout(16);
 }
 await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
 await touchPage.waitForFunction(() => document.querySelector('.feature-slide.shield').classList.contains('current'));
 assert.ok(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'forward and reverse touch swipes do not overflow page');
 await touchPage.close();
 const fallback = await browser.newPage({ viewport: { width: 390, height: 900 } });
 const fallbackErrors = [];
 fallback.on('pageerror', error => fallbackErrors.push(error.message));
 await fallback.addInitScript(() => { delete window.IntersectionObserver; });
 await fallback.goto(base);
 await fallback.waitForTimeout(250);
 assert.equal(await fallback.locator('#main').count(), 1, 'missing observers must not unmount the page');
 assert.deepEqual(fallbackErrors, [], 'missing observers keep progressive enhancement safe');
 assert.equal(await fallback.locator('.study-desk').evaluate(el => getComputedStyle(el).opacity), '1', 'unsupported scroll motion retains the final study outcome');
 await fallback.locator('.feature-rail').focus();
 await fallback.keyboard.press('ArrowRight');
 await fallback.waitForFunction(() => document.querySelector('.feature-slide.focus').classList.contains('current'));
 await fallback.close();
 const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
 page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
 await page.goto(base);
 await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ state: 'visible' });
 assert.equal(await page.getByRole('button', { name: 'Menu' }).isVisible(), false);
 await page.getByRole('link', { name: 'Privacy policy', exact: true }).last().click();
 assert.equal(page.url(), routeUrl('/privacy'));
 const privacyText = await page.locator('main').innerText();
 assert.match(privacyText, /Draw over other apps/);
 assert.match(privacyText, /Normal-app shielding does not require this service/);
 assert.match(privacyText, /Private achievement backup/);
 await page.getByRole('link', { name: 'Delete account', exact: true }).click();
 assert.equal(page.url(), routeUrl('/delete-account'));
 const email = new URL(await page.getByRole('link', { name: 'Email a deletion request' }).getAttribute('href'));
 assert.equal(email.protocol, 'mailto:');
 assert.equal(email.pathname, 'sudeepyadav7272@gmail.com');
 assert.equal(email.searchParams.get('subject'), 'FocusForge account and data deletion request');
 assert.match(email.searchParams.get('body'), /I will not send passwords, PINs, or verification codes/);
 assert.deepEqual(errors, []);
 console.log('PASS: widths 320/390/768/1440 in light/dark browser preferences; direct routes, keyboard feature rail, centered dark previews, pinned scroll study story, FAQ, menu Escape, reduced/normal motion and running/paused wheel, download/mailto destinations, no-JS mobile navigation/legal pages, no page errors.');
} finally { await browser.close(); }
