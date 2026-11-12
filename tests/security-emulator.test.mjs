// Real Firestore transactions; no production project or auth credentials.
import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {generateKeyPairSync, sign} from 'node:crypto';
import ts from 'typescript';
import {initializeApp, deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run with a local Firestore emulator');
const projectId = 'demo-focusforge-ai-security';
const app = initializeApp({projectId}, 'security-test');
const db = getFirestore(app);
const require = createRequire(import.meta.url);
const cache = {};
const mailState = {fail: false, sent: [], gate: null};
function load(name) {
  if (cache[name]) return cache[name];
  const text = readFileSync(new URL(`../api/${name}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  const mockRequire = name => {
    if (name.startsWith('./')) return load(name.slice(2, -3));
    if (name === 'firebase-admin/app') return {getApps: () => [app]};
    if (name === 'firebase-admin/firestore') return {getFirestore: () => db};
    if (name === 'firebase-admin/app-check') return {getAppCheck: () => ({})};
    if (name === 'nodemailer') return {default: {createTransport: () => ({
      async sendMail(mail) {
        if (mailState.gate) await mailState.gate;
        if (mailState.fail) throw new Error('fixture SMTP rejection');
        mailState.sent.push(mail);
      }, close() {},
    })}};
    if (name === 'firebase-admin/auth') return {getAuth: () => ({
      generatePasswordResetLink: async email => {
        if (email.startsWith('unknown')) throw Object.assign(new Error('fixture unknown'), {code: 'auth/user-not-found'});
        return 'https://example.invalid/action?oobCode=fixture-code';
      },
      verifyIdToken: async (token, revoked) => {
      assert.equal(revoked, true);
      return {uid: token, firebase: {sign_in_provider: 'google.com'}};
    }})};
    return require(name);
  };
  // Use the SDK's realm: its transaction callback validates instanceof Promise.
  vm.runInThisContext('(function(exports, require, process) {' + code + '\n})')(exports, mockRequire, {env: {FIREBASE_SERVICE_ACCOUNT: JSON.stringify({private_key: 'test-only-encryption-key-not-a-real-service-account'}), SMTP_USER: 'fixture@example.invalid', SMTP_PASS: 'test-only-smtp-password'}});
  return cache[name] = exports;
}
async function authorize(uid) {
  const res = {setHeader() {}, end(body) {this.body = JSON.parse(body);}};
  await load('ai-authorize').default({method: 'POST', headers: {authorization: 'Bearer ' + uid}, body: {operation: 'answer'}}, res);
  return res.statusCode;
}
after(async () => {await db.terminate(); await deleteApp(app);});

test('real concurrent Firestore transactions admit only five daily requests', async () => {
  const uid = 'quota-' + crypto.randomUUID();
  const statuses = await Promise.all(Array.from({length: 10}, () => authorize(uid)));
  assert.equal(statuses.filter(status => status === 200).length, 5);
  // Contended transactions may fail closed with 503 after Firestore's retry cap.
  assert.ok(statuses.every(status => [200, 429, 503].includes(status)));
  assert.equal(await authorize(uid), 429);
});

test('a real deletion fence blocks a previously valid identity', async () => {
  const uid = 'deleted-' + crypto.randomUUID();
  await db.doc('accountDeletions/' + uid).set({requestedAt: new Date()});
  assert.equal(await authorize(uid), 401);
});

test('Firestore rejects deletion using an expired snapshot after renewal', async () => {
  const ref = db.doc('_resetLimits/race-' + crypto.randomUUID());
  await ref.set({expiresAt: new Date(0), hits: []});
  const expired = await ref.get();
  await ref.set({expiresAt: new Date(Date.now() + 3600000), hits: [Date.now()]});
  const batch = db.batch();
  batch.delete(ref, {lastUpdateTime: expired.updateTime});
  await assert.rejects(batch.commit());
  assert.equal((await ref.get()).get('hits').length, 1);
});


test('branded email queue encrypts addresses, preserves the exact template, and deletes delivered jobs', async () => {
  const queue = load('_resetQueue');
  const email = 'branded@example.invalid';
  const id = await queue.enqueueReset(email);
  const ref = db.doc('_resetMailQueue/' + id);
  const stored = (await ref.get()).data();
  assert.ok(!JSON.stringify(stored).includes(email));
  assert.ok(stored.expiresAt.toMillis() <= Date.now() + 15 * 60000);
  const before = mailState.sent.length;
  assert.equal(await queue.deliverReset(id), 'sent');
  assert.equal(mailState.sent.length, before + 1);
  const mail = mailState.sent.at(-1);
  const link = 'https://www.focus-forge.in/account-action?mode=resetPassword&oobCode=fixture-code';
  assert.equal(mail.html, load('_resetEmail').resetEmailHtml(email, link));
  assert.equal(mail.text, load('_resetEmail').resetEmailText(email, link));
  assert.equal(mail.subject, 'Reset your FocusForge password');
  assert.equal(mail.from.name, 'FocusForge');
  assert.equal((await ref.get()).exists, false);
});

test('unknown accounts complete privately without sending mail', async () => {
  const queue = load('_resetQueue');
  const id = await queue.enqueueReset('unknown@example.invalid');
  const before = mailState.sent.length;
  assert.equal(await queue.deliverReset(id), 'sent');
  assert.equal(mailState.sent.length, before);
  assert.equal((await db.doc('_resetMailQueue/' + id).get()).exists, false);
});

test('SMTP failures retain durable work and the next worker retries it without a new user request', async () => {
  const queue = load('_resetQueue');
  const id = await queue.enqueueReset('retry@example.invalid');
  const ref = db.doc('_resetMailQueue/' + id);
  mailState.fail = true;
  assert.equal(await queue.deliverReset(id), 'retry');
  const failed = (await ref.get()).data();
  assert.equal(failed.attempts, 1);
  assert.ok(failed.availableAt.toMillis() > Date.now());
  mailState.fail = false;
  await ref.update({availableAt: new Date(0)});
  assert.ok((await queue.drainResetQueue()).processed >= 1);
  assert.equal((await ref.get()).exists, false);
});

test('concurrent workers claim only one lease and send one email', async () => {
  const queue = load('_resetQueue');
  const id = await queue.enqueueReset('concurrent@example.invalid');
  const before = mailState.sent.length;
  const outcomes = await Promise.all(Array.from({length: 5}, () => queue.deliverReset(id)));
  assert.equal(outcomes.filter(value => value === 'sent').length, 1);
  assert.equal(mailState.sent.length, before + 1);
});

test('expired jobs are discarded, lost leases recover, and retries are bounded', async () => {
  const queue = load('_resetQueue');
  const expired = await queue.enqueueReset('expired@example.invalid');
  await db.doc('_resetMailQueue/' + expired).update({expiresAt: new Date(0)});
  assert.equal(await queue.deliverReset(expired), 'skipped');
  assert.equal((await db.doc('_resetMailQueue/' + expired).get()).exists, false);

  const lost = await queue.enqueueReset('lease@example.invalid');
  const ref = db.doc('_resetMailQueue/' + lost);
  await ref.update({lease: 'crashed-worker', attempts: 1, availableAt: new Date(Date.now() + 90000)});
  assert.equal(await queue.deliverReset(lost), 'skipped');
  await ref.update({availableAt: new Date(0)});
  assert.equal(await queue.deliverReset(lost), 'sent');

  const exhausted = await queue.enqueueReset('exhausted@example.invalid');
  const last = db.doc('_resetMailQueue/' + exhausted);
  await last.update({attempts: 3});
  mailState.fail = true;
  assert.equal(await queue.deliverReset(exhausted), 'retry');
  mailState.fail = false;
  assert.equal((await last.get()).exists, false);
});

test('queue payload tampering cannot redirect a reset email', async () => {
  const queue = load('_resetQueue');
  const first = await queue.enqueueReset('first@example.invalid');
  const second = await queue.enqueueReset('second@example.invalid');
  const envelope = (await db.doc('_resetMailQueue/' + first).get()).get('envelope');
  await db.doc('_resetMailQueue/' + second).update({envelope});
  const before = mailState.sent.length;
  assert.equal(await queue.deliverReset(second), 'retry');
  assert.equal(mailState.sent.length, before);
  await db.doc('_resetMailQueue/' + first).delete();
  await db.doc('_resetMailQueue/' + second).delete();
});

test('delivery endpoint signatures reject unauthenticated, expired, future and forged requests', () => {
  const {validDeliveryRequest} = load('_resetDeliveryAuth');
  const pair = generateKeyPairSync('ed25519');
  const pub = pair.publicKey.export({type: 'spki', format: 'pem'});
  const now = Date.now();
  const signature = sign(null, Buffer.from('reset-delivery:' + now), pair.privateKey).toString('base64url');
  const req = {headers: {authorization: `ResetWorker ${now}.${signature}`}};
  assert.ok(validDeliveryRequest(req, now, pub));
  assert.equal(validDeliveryRequest(req, now + 90001, pub), false);
  assert.equal(validDeliveryRequest(req, now - 90001, pub), false);
  assert.equal(validDeliveryRequest(req, now), false);
  assert.equal(validDeliveryRequest({headers: {}}, now, pub), false);
});
