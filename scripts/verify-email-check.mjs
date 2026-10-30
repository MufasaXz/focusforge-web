import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Build with fixture-only VITE_FIREBASE_API_KEY/VITE_FIREBASE_APP_ID; all Firebase
// requests below are intercepted, so this never sends mail or consumes real codes.
const origin = process.env.TEST_URL || 'http://127.0.0.1:4178';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
await mkdir('/tmp/focusforge-email-web', { recursive: true });
try {
 for (const width of [320, 390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', async route => {
   const request = route.request();
   if (!request.url().startsWith('https://identitytoolkit.googleapis.com/')) throw new Error('Unexpected external request: ' + new URL(request.url()).origin);
   requests.push({ url: request.url(), data: request.postDataJSON() });
   const isCheck = request.url().includes('accounts:resetPassword');
   await route.fulfill({ json: isCheck ? { email: 'person@example.invalid', requestType: 'VERIFY_EMAIL' } : { email: 'person@example.invalid' } });
  });
  await page.goto(origin + '/verify-email.html?mode=verifyEmail&oobCode=fixture-only-code&continueUrl=https://example.invalid&apiKey=ignored');
  const verify = page.getByRole('button', { name: 'Verify email address', exact: true });
  await verify.waitFor();
  assert.equal(new URL(page.url()).search, '');
  assert.ok(requests.length >= 1);
  assert.ok(requests.every(request => request.url.includes('accounts:resetPassword')), 'loading checks the code without consuming it');
  assert.ok(requests.every(request => request.data.oobCode === 'fixture-only-code'));
  assert.equal(await page.locator('input[type=password]').count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no overflow at ' + width);
  await page.screenshot({ path: '/tmp/focusforge-email-web/verify-' + width + '.png', fullPage: true });
  await verify.click();
  await page.getByRole('heading', { name: 'Your email is verified.', exact: true }).waitFor();
  assert.equal(requests.filter(request => request.url.includes('accounts:update')).length, 1);
  assert.equal(await page.locator(':focus').textContent(), 'Your email is verified.');
  assert.deepEqual(errors, []);
  await page.close();
 }
 const page = await browser.newPage();
 let requests = 0;
 await page.route('https://**/*', async route => {
  requests++;
  await route.fulfill({ status: 400, json: { error: { message: 'EXPIRED_OOB_CODE' } } });
 });
 await page.goto(origin + '/verify-email.html?mode=verifyEmail&oobCode=expired-fixture');
 await page.getByRole('alert').filter({ hasText: 'expired or has already been used' }).waitFor();
 assert.equal(await page.getByRole('button', { name: 'Verify email address', exact: true }).count(), 0);
 const before = requests;
 await page.goto(origin + '/verify-email.html?mode=resetPassword&oobCode=never-used');
 await page.getByRole('heading', { name: 'Continue in FocusForge.', exact: true }).waitFor();
 assert.equal(requests, before, 'website rejects password-reset actions without contacting Firebase');
 assert.equal(await page.locator('input').count(), 0);
 assert.equal(new URL(page.url()).search, '');
 // Firebase's own handler finishes the verification, then offers a continue
 // link back here. There is no code left to spend, so nothing is asked of it.
 const afterReset = requests;
 await page.goto(origin + '/verify-email.html?flow=complete');
 await page.getByRole('heading', { name: 'Back to FocusForge.', exact: true }).waitFor();
 assert.equal(requests, afterReset, 'the continue hand-off contacts nothing');
 assert.equal(await page.getByRole('button', { name: 'Verify email address', exact: true }).count(), 0);
 assert.equal(new URL(page.url()).search, '');
 await page.close();
 console.log('PASS: verification at 320/390/1440px, explicit confirmation, token scrubbing, expired link, continue hand-off, no website password reset, no real Firebase requests.');
} finally { await browser.close(); }
