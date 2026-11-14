import { accountAppCheckToken } from './firebaseClient.ts';

type Account = { getIdToken: (refresh?: boolean) => Promise<string> };
type Transport = { request?: typeof fetch; appCheck?: () => Promise<string | null> };
const legacyEndpoint = 'https://pip-ai-backend.pip-ai-backend.workers.dev/data';
const sections = ['account', 'profile', 'achievements', 'stats', 'appStats', 'preferences',
  'sessions', 'sessionData', 'guardian', 'children', 'remoteRules', 'progress', 'catalog',
  'deletionRefs', 'entries', 'members', 'pipReports', 'limits', 'pairCodesChild', 'pairCodesGuardian'];

function transport(user: Account, options: Transport) {
 return async (url: string, body: Record<string, unknown>) => {
  const attestation = await (options.appCheck ?? accountAppCheckToken)();
  const response = await (options.request ?? fetch)(url, {method: 'POST', redirect: 'error', cache: 'no-store',
    headers: {'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}`,
      ...(attestation ? {'x-firebase-appcheck': attestation} : {})},
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw Object.assign(new Error('Account data request failed.'), {code:
    response.status === 401 || response.status === 403 ? 'auth/requires-recent-login' : 'account/unavailable'});
  return response.json();
 };
}
async function pages(post: ReturnType<typeof transport>, url: string, body: Record<string, unknown>) {
 const records: unknown[] = [];
 let cursor: string | null = null;
 const seen = new Set<string>();
 do {
  const page = await post(url, {...body, ...(cursor ? {cursor} : {})});
  if (!Array.isArray(page.records) || (page.cursor !== null && typeof page.cursor !== 'string')) throw new Error('Account data request incomplete.');
  records.push(...page.records);
  cursor = page.cursor;
  if (cursor && seen.has(cursor)) throw new Error('Account data request incomplete.');
  if (cursor) seen.add(cursor);
 } while (cursor);
 return records;
}

/** This is independent of cloud-coaching consent and never calls a model. */
export async function exportCloudData(user: Account, options: Transport = {}) {
 const post = transport(user, options);
 const firebase: unknown[] = [];
 for (const section of sections) firebase.push(...await pages(post, '/api/account-data', {operation: 'export', section}));
 return {schemaVersion: 1, exportedAt: new Date().toISOString(), firebase,
   legacyPipReports: await pages(post, legacyEndpoint, {operation: 'export'})};
}

/** Erasure is acknowledged before the Firebase credential is removed. */
export async function eraseAuxiliaryData(user: Account, options: Transport = {}) {
 const post = transport(user, options);
 while ((await post('/api/account-data', {operation: 'erase'})).done !== true) { /* server pages */ }
 await pages(post, legacyEndpoint, {operation: 'delete'});
 while ((await post('/api/account-data', {operation: 'erase'})).done !== true) { /* final auxiliary cleanup */ }
}
