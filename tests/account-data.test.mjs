import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportCloudData, eraseAuxiliaryData} from '../src/accountData.ts';

const user = {getIdToken: async () => 'fixture-id-token'};
const appCheck = async () => 'fixture-attestation';
test('web export fetches all owned cloud sections and legacy pages without exporting credentials', async () => {
 const sections = new Set();
 const request = async (url, init) => {
  assert.equal(init.redirect, 'error');
  assert.equal(init.cache, 'no-store');
  assert.equal(init.headers.authorization, 'Bearer fixture-id-token');
  assert.equal(init.headers['x-firebase-appcheck'], 'fixture-attestation');
  const body = JSON.parse(init.body);
  if (body.section) sections.add(body.section);
  return Response.json({records: [{path: body.section || 'legacy-report'}],
    cursor: !body.section && !body.cursor ? 'next' : null});
 };
 const result = await exportCloudData(user, {request, appCheck});
 assert.equal(sections.size, 20);
 assert.ok(sections.has('deletionRefs') && sections.has('pipReports') && sections.has('pairCodesChild'));
 assert.equal(result.legacyPipReports.length, 2);
 assert.ok(!JSON.stringify(result).includes('fixture-id-token'));
});
test('web erasure aborts on legacy failure before declaring cleanup completed', async () => {
 const calls = [];
 await assert.rejects(eraseAuxiliaryData(user, {appCheck, request: async (url, init) => {
  calls.push(JSON.parse(init.body).operation);
  return calls.length === 1 ? Response.json({done: true}) : Response.json({error: 'unavailable'}, {status: 503});
 }}));
 assert.deepEqual(calls, ['erase', 'delete']);
});
