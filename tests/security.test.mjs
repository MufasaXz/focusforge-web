import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');

function fixture(options = {}) {
  const records = new Map(), calls = [], logs = [];
  let version = 0, queue = Promise.resolve(), sweepHook;
  let responseEnded = false;
  const state = {authError: null, deleted: false, unavailable: false, ...options};
  function put(key, data) {records.set(key, {data, version: ++version});}
  function snapshot(ref) {
    const row = records.get(ref.key);
    return {ref, exists: Boolean(row), updateTime: row?.version,
      get: field => row?.data[field], data: () => row?.data};
  }
  const db = {
    collection: collection => ({
      doc: key => ({key: `${collection}/${key}`}),
      where: (_field, _op, cutoff) => ({limit: max => ({get: async () => {
        const docs = [...records].filter(([key, row]) => key.startsWith(collection + '/') && row.data.expiresAt < cutoff)
          .slice(0, max).map(([key]) => snapshot({key}));
        const hook = sweepHook; sweepHook = null;
        if (hook) await hook();
        return {empty: !docs.length, docs};
      }})}),
    }),
    runTransaction(callback) {
      // Serialize commits just as Firestore serializes conflicting transactions.
      const result = queue.then(async () => {
        if (state.unavailable) throw new Error('db unavailable');
        const writes = [];
        const value = await callback({
          get: async ref => {
            if (ref.key.startsWith('accountDeletions/') && state.deleted) return {exists: true};
            return snapshot(ref);
          },
          set: (ref, data) => writes.push([ref.key, data]),
        });
        for (const [key, data] of writes) put(key, data);
        return value;
      });
      queue = result.catch(() => {});
      return result;
    },
    batch() {
      const deletes = [];
      return {delete: (ref, precondition) => deletes.push([ref, precondition]), commit: async () => {
        for (const [ref, precondition] of deletes) {
          if (records.get(ref.key)?.version !== precondition?.lastUpdateTime) throw new Error('version conflict');
        }
        for (const [ref] of deletes) records.delete(ref.key);
      }};
    },
  };
  const auth = {verifyIdToken: async (token, revoked) => {
    calls.push({type: 'verify', token, revoked});
    if (state.authError) throw Object.assign(new Error('redacted'), {code: state.authError});
    if (token !== 'valid-token') throw Object.assign(new Error('bad token'), {code: 'auth/invalid-id-token'});
    return {uid: state.uid || 'user-123', firebase: {sign_in_provider: state.provider || 'google.com'}, email_verified: state.verified ?? true};
  }};
  const appCheck = {verifyToken: async token => {if (token !== 'valid-app') throw new Error('bad app');}};
  const modules = {
    '@vercel/functions': {waitUntil: () => {}},
    './_resetQueue.js': {
      enqueueReset: async email => {
        calls.push({type: 'enqueue', email});
        if (state.queueFails) throw new Error('sensitive provider failure');
        return 'fixture-job';
      },
      deliverReset: async id => {
        calls.push({type: 'deliver', id, responseEnded});
        if (state.deliveryFails) throw new Error('sensitive delivery failure');
      },
    },
    'node:crypto': {createHash},
    'firebase-admin/app': {getApps: () => [{}]},
    'firebase-admin/auth': {getAuth: () => auth},
    'firebase-admin/firestore': {getFirestore: () => db},
    'firebase-admin/app-check': {getAppCheck: () => appCheck},
  };
  const env = {VITE_FIREBASE_API_KEY: 'public-fixture-key', APP_CHECK_ENFORCE: options.enforce ? 'true' : 'false', ...options.env};
  const cache = {};
  function load(name) {
    if (cache[name]) return cache[name];
    const source = readFileSync(new URL(`../api/${name}.ts`, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
      exports, require: name => modules[name] || (name.startsWith('./') ? load(name.slice(2, -3)) : require(name)),
      process: {env}, Buffer, Date, URL, AbortSignal,
      console: {error: (...args) => logs.push(args), warn: (...args) => logs.push(args)},
      fetch: async (url, init) => {
        calls.push({type: 'fetch', url, init});
        if (state.fetchFails) throw new Error('SMTP_PASS=must-not-appear');
        return Response.json(state.upstreamBody || {}, {status: state.upstreamStatus || 200});
      },
    });
    return cache[name] = exports;
  }
  async function request(name, body, headers = {}, stream = false) {
    responseEnded = false;
    const req = stream ? Readable.from(body) : {body};
    Object.assign(req, {method: 'POST', headers, socket: {remoteAddress: '192.0.2.1'}});
    const res = {headers: {}, setHeader(k, v) {this.headers[k] = v;}, end(body) {this.body = JSON.parse(body); responseEnded = true;}};
    await load(name).default(req, res);
    return res;
  }
  return {state, records, calls, logs, put, load, request, onSweep: fn => {sweepHook = fn;}};
}

const authorized = {authorization: 'Bearer valid-token'};

test('known and unknown addresses get the same queued receipt, before account lookup or delivery', async () => {
  for (const deliveryFails of [false, true]) {
    const f = fixture({deliveryFails});
    for (const email of ['known@example.invalid', 'unknown@example.invalid']) {
      const r = await f.request('password-reset', {email});
      assert.equal(r.statusCode, 200);
      assert.deepEqual(r.body, {ok: true});
      assert.equal(r.headers['Cache-Control'], 'no-store');
    }
    assert.equal(f.calls.filter(c => c.type === 'enqueue').length, 2);
    assert.ok(f.calls.filter(c => c.type === 'deliver').every(c => c.responseEnded));
    assert.ok(!JSON.stringify(f.logs).includes('example.invalid'));
    assert.ok(!JSON.stringify(f.logs).includes('sensitive'));
  }
});

test('queue outages fail identically without looking up accounts or losing an accepted request', async () => {
  const f = fixture({queueFails: true});
  for (const email of ['known@example.invalid', 'unknown@example.invalid']) {
    const result = await f.request('password-reset', {email});
    assert.equal(result.statusCode, 503);
    assert.deepEqual(result.body, {error: 'send'});
  }
  assert.ok(!f.calls.some(c => c.type === 'deliver'));
  assert.ok(!JSON.stringify(f.logs).includes('example.invalid'));
  assert.ok(!JSON.stringify(f.logs).includes('sensitive'));
});

test('reset keeps address and network limits without sending after rejection', async () => {
  const f = fixture();
  for (let i = 0; i < 3; i++) assert.equal((await f.request('password-reset', {email: 'a@example.invalid'})).statusCode, 200);
  assert.equal((await f.request('password-reset', {email: 'A@example.invalid'})).statusCode, 429);
  const g = fixture();
  for (let i = 0; i < 10; i++) assert.equal((await g.request('password-reset', {email: `a${i}@example.invalid`})).statusCode, 200);
  assert.equal((await g.request('password-reset', {email: 'last@example.invalid'})).statusCode, 429);
  assert.equal(g.calls.filter(c => c.type === 'enqueue').length, 10);
});

test('concurrent expiry sweep cannot erase a refreshed address counter', async () => {
  const f = fixture();
  const key = `_resetLimits/${hash('address:target@example.invalid')}`;
  f.put(key, {hits: [Date.now() - 7200000], expiresAt: new Date(Date.now() - 3600000)});
  f.onSweep(async () => {
    for (let i = 0; i < 3; i++) assert.equal((await f.request('password-reset', {email: 'target@example.invalid'})).statusCode, 200);
  });
  await f.request('password-reset', {email: 'other@example.invalid'});
  assert.equal((await f.request('password-reset', {email: 'target@example.invalid'})).statusCode, 429);
  assert.equal(f.records.get(key).data.hits.length, 3);
});

test('body bounds cover objects, strings, buffers and multibyte streams; unknown fields rejected', async () => {
  const f = fixture();
  for (const raw of [
    {email: 'a@example.invalid', padding: 'x'.repeat(3000)},
    JSON.stringify({email: 'x'.repeat(3000)}), Buffer.from('x'.repeat(3000)),
    [], {email: 'a@example.invalid', padding: 'small'},
  ]) assert.equal((await f.request('password-reset', raw)).statusCode, 400);
  assert.equal((await f.request('password-reset', [Buffer.from(JSON.stringify({email: 'आ'.repeat(1000)}))], {}, true)).statusCode, 400);
  assert.equal((await f.request('password-reset', {email: 'a@example.invalid'}, {'content-length': '99999'})).statusCode, 400);
  assert.equal(f.calls.length, 0);
});

test('arbitrary forwarded IPs cannot bypass the trusted deployment address', () => {
  const f = fixture({env: {VERCEL: '1'}});
  const address = f.load('_security').clientAddress;
  assert.equal(address({headers: {'x-forwarded-for': 'attacker', 'x-vercel-forwarded-for': '192.0.2.8'}, socket: {remoteAddress: '127.0.0.1'}}), '192.0.2.8');
  assert.equal(address({headers: {'x-forwarded-for': 'attacker'}, socket: {remoteAddress: '127.0.0.1'}}), '127.0.0.1');
});

test('daily allowance is exactly five under concurrent calls, and distinct users have distinct counters', async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({length: 12}, () => f.request('ai-authorize', {operation: 'answer'}, authorized)));
  assert.equal(results.filter(r => r.statusCode === 200).length, 5);
  assert.equal(results.filter(r => r.statusCode === 429 && r.body.window === 'day').length, 7);
  assert.ok(f.calls.every(c => c.revoked === true));
  f.state.uid = 'different-user';
  assert.equal((await f.request('ai-authorize', {operation: 'answer'}, authorized)).statusCode, 200);
});

test('UTC rollover resets the count and reports do not consume answer allowance', async () => {
  const f = fixture();
  f.put(`_aiLimits/${hash('user-123')}`, {day: '2000-01-01', count: 5, reports: 20});
  assert.equal((await f.request('ai-authorize', {operation: 'answer'}, authorized)).statusCode, 200);
  for (let i = 0; i < 20; i++) assert.equal((await f.request('ai-authorize', {operation: 'report'}, authorized)).statusCode, 200);
  assert.equal((await f.request('ai-authorize', {operation: 'report'}, authorized)).statusCode, 429);
  assert.equal(f.records.get(`_aiLimits/${hash('user-123')}`).data.count, 1);
});

test('revoked, disabled, expired and deleted identities fail before quota is claimed', async () => {
  for (const code of ['auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found', 'auth/id-token-expired']) {
    const f = fixture({authError: code});
    assert.equal((await f.request('ai-authorize', {operation: 'answer'}, authorized)).statusCode, 401);
    assert.equal(f.records.size, 0);
  }
  for (const options of [{deleted: true}, {provider: 'anonymous'}, {provider: 'password', verified: false}]) {
    const f = fixture(options);
    assert.equal((await f.request('ai-authorize', {operation: 'answer'}, authorized)).statusCode, 401);
    assert.equal(f.records.size, 0);
  }
});

test('database and auth outages fail closed rather than authorizing a model call', async () => {
  for (const options of [{unavailable: true}, {authError: 'auth/internal-error'}]) {
    const f = fixture(options);
    assert.equal((await f.request('ai-authorize', {operation: 'answer'}, authorized)).statusCode, 503);
    assert.equal(f.records.size, 0);
  }
});

test('App Check rollout accepts missing tokens only in monitoring; invalid tokens always fail', async () => {
  for (const name of ['ai-authorize', 'password-reset']) {
    const body = name === 'ai-authorize' ? {operation: 'answer'} : {email: 'a@example.invalid'};
    for (const enforce of [false, true]) {
      const f = fixture({enforce});
      assert.equal((await f.request(name, body, authorized)).statusCode, enforce ? 403 : 200);
      assert.equal((await f.request(name, body, {...authorized, 'x-firebase-appcheck': 'invalid'})).statusCode, 403);
      assert.equal((await f.request(name, body, {...authorized, 'x-firebase-appcheck': 'valid-app'})).statusCode, 200);
    }
  }
});
