import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { deleteAccountAndData } from '../src/accountCleanup.ts';

let env;
before(async () => {
 env = await initializeTestEnvironment({ projectId: 'demo-focusforge-web', firestore: {
  host: '127.0.0.1', port: 8180,
  rules: readFileSync(new URL('./fixtures/firestore.rules', import.meta.url), 'utf8'),
 } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });
const db = uid => env.authenticatedContext(uid, {
 auth_time: Math.floor(Date.now() / 1000), email_verified: true,
 firebase: { sign_in_provider: 'password' },
}).firestore();
async function seed(records) {
 await env.withSecurityRulesDisabled(async context => {
  for (const [path, data] of Object.entries(records)) await setDoc(doc(context.firestore(), path), data);
 });
}
async function exists(path) {
 let found;
 await env.withSecurityRulesDisabled(async context => { found = (await getDoc(doc(context.firestore(), path))).exists(); });
 return found;
}
const group = (ids, code) => ({ name: 'Study', targetHours: 5, createdAt: Date.now(), ownerUid: ids[0], memberIds: ids, inviteCode: code });

test('cleanup removes private and historical rows, transfers groups, then deletes login', async () => {
 await seed({
  'accountCleanup/schema': { version: 2 }, 'users/alex': { name: 'Alex' },
  'users/alex/achievements/earned': { version: 1, unlockedAt: { first_focus: 1 } },
  'users/alex/old/nested/private/record': { legacy: true },
  'users/alex/deletionRefs/legacy': { path: 'users/alex/old/nested/private/record' },
  'leaderboard/2025-01-06/entries/alex': { ownerUid: 'alex' },
  'leaderboard/2025-01-06/entries/blair': { ownerUid: 'blair' },
  'studyGroups/shared': group(['alex', 'blair'], 'ABCD234567'),
  'studyGroups/shared/members/alex': { ownerUid: 'alex' },
  'studyGroups/shared/members/blair': { ownerUid: 'blair' },
  'groupInvites/ABCD234567': { groupId: 'shared' },
  'studyGroups/solo': group(['alex'], 'WXYZ234567'),
  'studyGroups/solo/members/alex': { ownerUid: 'alex' },
  'groupInvites/WXYZ234567': { groupId: 'solo' },
  'studyGroups/missing/members/alex': { ownerUid: 'alex' },
 });
 let deleted = false;
 await deleteAccountAndData({ uid: 'alex', getIdToken: async () => '', delete: async () => {
  assert.equal(await exists('users/alex'), false);
  assert.equal(await exists('leaderboard/2025-01-06/entries/alex'), false);
  deleted = true;
 } }, db('alex'));
 assert.ok(deleted);
 for (const path of ['users/alex/achievements/earned', 'users/alex/old/nested/private/record', 'users/alex/deletionRefs/legacy', 'studyGroups/shared/members/alex', 'studyGroups/solo', 'groupInvites/WXYZ234567', 'studyGroups/missing/members/alex']) assert.equal(await exists(path), false, path);
 for (const path of ['leaderboard/2025-01-06/entries/blair', 'studyGroups/shared/members/blair', 'groupInvites/ABCD234567', 'accountDeletions/alex']) assert.equal(await exists(path), true, path);
 await env.withSecurityRulesDisabled(async c => {
  const data = (await getDoc(doc(c.firestore(), 'studyGroups/shared'))).data();
  assert.deepEqual(data.memberIds, ['blair']); assert.equal(data.ownerUid, 'blair');
 });
 await assertFails(setDoc(doc(db('alex'), 'users/alex'), { name: 'Stale device' }));
});

test('missing migration preserves login and data without starting deletion', async () => {
 await seed({ 'users/alex': { name: 'Alex' } });
 let deleted = false;
 await assert.rejects(deleteAccountAndData({ uid: 'alex', getIdToken: async () => '', delete: async () => { deleted = true; } }, db('alex')), /setup/i);
 assert.equal(deleted, false);
 assert.equal(await exists('users/alex'), true);
 assert.equal(await exists('accountDeletions/alex'), false);
});

test('invalid legacy inventory fails closed, preserves login, and permits retry', async () => {
 await seed({ 'accountCleanup/schema': { version: 2 }, 'users/alex': {}, 'users/blair': { keep: true }, 'users/alex/deletionRefs/invalid': { path: 'users/blair' } });
 let deleted = false;
 const user = { uid: 'alex', getIdToken: async () => '', delete: async () => { deleted = true; } };
 await assert.rejects(deleteAccountAndData(user, db('alex')), /inventory/i);
 assert.equal(deleted, false); assert.equal(await exists('users/blair'), true);
 await seed({ 'users/alex/deletionRefs/invalid': { path: 'users/alex/old/one' } });
 await deleteAccountAndData(user, db('alex'));
 assert.equal(deleted, true);
});

test('an Auth deletion failure remains retryable after cloud cleanup', async () => {
 await seed({ 'accountCleanup/schema': { version: 2 }, 'users/alex': {} });
 const user = { uid: 'alex', getIdToken: async () => '', delete: async () => { throw new Error('requires-recent-login'); } };
 await assert.rejects(deleteAccountAndData(user, db('alex')), /requires-recent-login/);
 let deleted = false;
 user.delete = async () => { deleted = true; };
 await deleteAccountAndData(user, db('alex'));
 assert.equal(deleted, true);
});

test('foreign identity cannot clean up another account', async () => {
 await seed({ 'accountCleanup/schema': { version: 2 }, 'users/alex': {} });
 let deleted = false;
 await assert.rejects(deleteAccountAndData({ uid: 'alex', getIdToken: async () => '', delete: async () => { deleted = true; } }, db('blair')));
 assert.equal(deleted, false); assert.equal(await exists('users/alex'), true);
});
