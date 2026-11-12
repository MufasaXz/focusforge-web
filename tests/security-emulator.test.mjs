// Real Firestore transactions; no production project or auth credentials.
import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {initializeApp, deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run with a local Firestore emulator');
const projectId = 'demo-focusforge-ai-security';
const app = initializeApp({projectId}, 'security-test');
const db = getFirestore(app);
const require = createRequire(import.meta.url);
const cache = {};
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
    if (name === 'firebase-admin/auth') return {getAuth: () => ({verifyIdToken: async (token, revoked) => {
      assert.equal(revoked, true);
      return {uid: token, firebase: {sign_in_provider: 'google.com'}};
    }})};
    return require(name);
  };
  // Use the SDK's realm: its transaction callback validates instanceof Promise.
  vm.runInThisContext('(function(exports, require, process) {' + code + '\n})')(exports, mockRequire, {env: {}});
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
