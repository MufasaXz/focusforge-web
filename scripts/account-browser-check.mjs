import { chromium } from 'playwright';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Run against the local Auth/Firestore emulators and Vite with
// VITE_FIREBASE_EMULATORS=true. This script never creates production accounts.
const env = await initializeTestEnvironment({ projectId: 'demo-focusforge-web', firestore: {
 host: '127.0.0.1', port: 8180, rules: readFileSync('tests/fixtures/firestore.rules', 'utf8'),
} });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
 for (const width of [320, 390, 1440]) {
  const email = 'web-' + width + '-' + Date.now() + '@example.invalid';
  const password = 'Browser-test-only-49!';
  const response = await fetch('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test', {
   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.ok(response.ok); const { localId: uid } = await response.json();
  await env.withSecurityRulesDisabled(async c => {
   await setDoc(doc(c.firestore(), 'accountCleanup/schema'), { version: 2 });
   await setDoc(doc(c.firestore(), 'users', uid), { name: 'Browser test' });
   await setDoc(doc(c.firestore(), 'users', uid, 'achievements', 'earned'), { version: 1, unlockedAt: { first_focus: 1 } });
  });
  const page = await browser.newPage({ viewport: { width, height: 950 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4176/delete-account');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Wrong-password');
  await page.getByRole('button', { name: 'Sign in with email', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'We could not sign in' }).waitFor();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in with email', exact: true }).click();
  const remove = page.getByRole('button', { name: 'Permanently delete my account', exact: true });
  await remove.waitFor(); assert.ok(await remove.isDisabled());
  await env.withSecurityRulesDisabled(async c => assert.ok((await getDoc(doc(c.firestore(), 'users', uid))).exists(), 'login does not delete records'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('checkbox').check(); assert.ok(await remove.isEnabled());
  await page.screenshot({ path: '/tmp/focusforge-delete-confirm-' + width + '.png', fullPage: true });
  await remove.click();
  await page.getByRole('heading', { name: 'Your account has been deleted.', exact: true }).waitFor();
  await env.withSecurityRulesDisabled(async c => {
   assert.equal((await getDoc(doc(c.firestore(), 'users', uid))).exists(), false);
   assert.equal((await getDoc(doc(c.firestore(), 'users', uid, 'achievements', 'earned'))).exists(), false);
  });
  const lookup = await fetch('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/projects/demo-focusforge-web/accounts:lookup', {
   method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ localId: [uid] }),
  });
  assert.equal((await lookup.json()).users?.length || 0, 0);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: '/tmp/focusforge-delete-done-' + width + '.png', fullPage: true });
  await page.close(); console.log('PASS: real emulator login, wrong password, confirmation and full deletion at ' + width + 'px');
 }
} finally { await browser.close(); await env.cleanup(); }
