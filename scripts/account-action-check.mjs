import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Build with fixture-only VITE_FIREBASE_API_KEY/VITE_FIREBASE_APP_ID and serve on
// port 4178. Every Firebase request is intercepted: nothing is sent and no real
// reset code is used.
const origin = process.env.TEST_URL || 'http://127.0.0.1:4178';
const shots = '/tmp/focusforge-account-action';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
await mkdir(shots, { recursive: true });

async function open(width, respond) {
 const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
 const errors = [];
 const requests = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.route('https://**/*', async route => {
  const request = route.request();
  if (!request.url().startsWith('https://identitytoolkit.googleapis.com/')) throw new Error('Unexpected external request: ' + new URL(request.url()).origin);
  const data = request.postDataJSON();
  requests.push(data);
  await respond(route, data);
 });
 return { page, errors, requests };
}

const fine = (route, data) => route.fulfill({ json: data.newPassword ? { email: 'person@example.invalid', requestType: 'PASSWORD_RESET' } : { email: 'person@example.invalid', requestType: 'PASSWORD_RESET' } });

try {
 for (const width of [320, 390, 1440]) {
  const { page, errors, requests } = await open(width, fine);
  await page.goto(origin + '/account-action.html?mode=resetPassword&oobCode=fixture-only-code&apiKey=ignored&lang=en');
  await page.getByRole('heading', { name: 'Choose a new password', exact: true }).waitFor();
  assert.equal(new URL(page.url()).search, '', 'the code leaves the address bar');
  assert.ok(requests.every(data => data.oobCode === 'fixture-only-code' && !data.newPassword), 'loading only checks the code');
  assert.ok(await page.getByText('person@example.invalid').isVisible());
  const save = page.getByRole('button', { name: 'Save new password', exact: true });
  assert.ok(await save.isDisabled(), 'nothing to save yet');
  await page.getByLabel('New password', { exact: true }).fill('short');
  await page.getByLabel('Confirm new password', { exact: true }).fill('short');
  assert.ok(await save.isDisabled(), 'too short to save');
  assert.equal(await page.locator('.auth-rules li[data-met=true]').count(), 1);
  await page.getByLabel('New password', { exact: true }).fill('a-long-new-passphrase');
  await page.getByLabel('Confirm new password', { exact: true }).fill('a-long-new-passphrase');
  assert.equal(await page.locator('.auth-rules li[data-met=true]').count(), 2);
  await page.getByRole('button', { name: 'Show passwords' }).click();
  assert.equal(await page.locator('#new-password').getAttribute('type'), 'text');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no overflow at ' + width);
  await page.screenshot({ path: `${shots}/form-${width}.png`, fullPage: true });
  await save.click();
  await page.getByRole('heading', { name: 'Password updated', exact: true }).waitFor();
  const saves = requests.filter(data => data.newPassword);
  assert.equal(saves.length, 1, 'the code is spent exactly once');
  assert.equal(saves[0].newPassword, 'a-long-new-passphrase');
  assert.equal(await page.locator(':focus').textContent(), 'Password updated');
  assert.equal(await page.locator('input[type=password], input#new-password').count(), 0);
  await page.screenshot({ path: `${shots}/done-${width}.png`, fullPage: true });
  assert.deepEqual(errors, []);
  await page.close();
 }

 // A used or expired link explains how to get a new one and offers no form.
 {
  const { page } = await open(390, route => route.fulfill({ status: 400, json: { error: { code: 400, message: 'EXPIRED_OOB_CODE' } } }));
  await page.goto(origin + '/account-action.html?mode=resetPassword&oobCode=expired-fixture');
  await page.getByRole('alert').filter({ hasText: 'expired or has already been used' }).waitFor();
  assert.equal(await page.locator('#new-password').count(), 0);
  assert.ok(await page.getByText('Forgot password?').isVisible());
  await page.screenshot({ path: `${shots}/expired-390.png`, fullPage: true });
  await page.close();
 }

 // A weak password keeps the form and says why.
 {
  const { page } = await open(390, (route, data) => data.newPassword
   ? route.fulfill({ status: 400, json: { error: { code: 400, message: 'WEAK_PASSWORD : Password should be at least 6 characters' } } })
   : fine(route, data));
  await page.goto(origin + '/account-action.html?mode=resetPassword&oobCode=fixture-only-code');
  await page.getByLabel('New password', { exact: true }).fill('aaaaaaaa');
  await page.getByLabel('Confirm new password', { exact: true }).fill('aaaaaaaa');
  await page.getByRole('button', { name: 'Save new password', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'too easy to guess' }).waitFor();
  assert.equal(await page.locator('#new-password').count(), 1);
  await page.close();
 }

 // Verification links sent to this page get the verify screen.
 {
  const { page } = await open(390, route => route.fulfill({ json: { email: 'person@example.invalid', requestType: 'VERIFY_EMAIL' } }));
  await page.goto(origin + '/account-action.html?mode=verifyEmail&oobCode=fixture-only-code');
  await page.getByRole('button', { name: 'Verify email address', exact: true }).waitFor();
  assert.equal(new URL(page.url()).search, '');
  await page.close();
 }

 // Anything else goes to Firebase's own handler with the query intact.
 {
  const page = await browser.newPage();
  let forwarded = '';
  await page.route('https://focusforge-1edf7.firebaseapp.com/**', route => { forwarded = route.request().url(); return route.fulfill({ body: 'handler' }); });
  await page.goto(origin + '/account-action.html?mode=recoverEmail&oobCode=fixture-only-code&apiKey=k');
  await page.waitForURL(/firebaseapp\.com/);
  assert.equal(forwarded, 'https://focusforge-1edf7.firebaseapp.com/__/auth/action?mode=recoverEmail&oobCode=fixture-only-code&apiKey=k');
  await page.close();
 }

 // Opened without a link: an explanation, no requests and no form.
 {
  const { page, requests } = await open(390, fine);
  await page.goto(origin + '/account-action.html');
  await page.getByRole('heading', { name: 'Open the link from your email', exact: true }).waitFor();
  assert.equal(requests.length, 0);
  assert.equal(await page.locator('input').count(), 0);
  await page.close();
 }
 console.log(`PASS: reset at 320/390/1440px, code scrubbed and spent once, live rules, show passwords, success focus, expired and weak-password paths, verify and forward modes, bare visit. Screenshots in ${shots}.`);
} finally {
 await browser.close();
}
