import type { ServerResponse } from 'node:http';
import { FieldPath, FieldValue, type Query } from 'firebase-admin/firestore';
import { admin, checkApp, hash, readBody, send, withinLimit, type Request } from './_security.js';
import { redactText } from './_pipPrivacy.js';
import { erasePrivateAndLegacyData } from './_legacyErasure.js';

const PRIVATE = ['achievements', 'stats', 'appStats', 'preferences', 'sessions',
  'sessionData', 'guardian', 'children', 'remoteRules', 'progress', 'catalog', 'deletionRefs'];
export const EXPORT_SECTIONS = ['account', 'profile', ...PRIVATE, 'entries', 'members', 'pipReports', 'limits', 'pairCodesChild', 'pairCodesGuardian'];

/** Current credentials, ownership and deletion fences also protect direct calls.
 * Export is paged, contains no password hashes/tokens, and never reads another
 * member's data. Reports are committed in the same transaction as their fence
 * check, so erasure cannot race a late KV write from a new client.
 */
export default async function handler(req: Request, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, {error: 'method'});
  let body: Record<string, unknown>;
  try {
    body = await readBody(req, 8192);
    if (Object.keys(body).some(k => !['operation', 'section', 'cursor', 'reason', 'reply', 'question'].includes(k)) ||
      !['export', 'erase', 'report'].includes(String(body.operation))) throw new Error('body');
  } catch { return send(res, 400, {error: 'invalid-argument'}); }
  const bearer = req.headers.authorization;
  if (typeof bearer !== 'string' || !bearer.startsWith('Bearer ') || bearer.length > 8192) return send(res, 401, {error: 'unauthenticated'});
  try {
    const {auth, db} = admin();
    let user;
    try { user = await auth.verifyIdToken(bearer.slice(7), true); }
    catch { return send(res, 401, {error: 'unauthenticated'}); }
    const provider = user.firebase?.sign_in_provider;
    if (!provider || provider === 'anonymous' || (provider === 'password' && !user.email_verified)) return send(res, 401, {error: 'unauthenticated'});
    if (!await checkApp(req)) return send(res, 403, {error: 'app-check'});
    if (!await withinLimit(`privacy:${user.uid}`, 120)) return send(res, 429, {error: 'rate'});
    const uid = user.uid;
    const fence = db.doc(`accountDeletions/${uid}`);
    if (body.operation === 'report') {
      if (Object.keys(body).some(k => !['operation', 'reason', 'reply', 'question'].includes(k)) ||
          !['harmful', 'hate', 'incorrect'].includes(String(body.reason)) ||
          typeof body.reply !== 'string' || !body.reply.trim() || body.reply.length > 900 ||
          (body.question !== undefined && (typeof body.question !== 'string' || body.question.length > 300))) {
        return send(res, 400, {error: 'invalid-argument'});
      }
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const counter = db.doc(`_aiLimits/${hash(uid)}`);
      const report = db.collection('pipReports').doc();
      const result = await db.runTransaction(async tx => {
        if ((await tx.get(fence)).exists) return 'deleted';
        const old = (await tx.get(counter)).data();
        const reports = old?.day === day ? Number(old.reports || 0) : 0;
        if (reports >= 20) return 'limited';
        tx.set(counter, {day, count: old?.day === day ? Number(old.count || 0) : 0,
          reports: reports + 1, expiresAt: new Date(now.getTime() + 2 * 86400000)});
        tx.create(report, {ownerUid: uid, reason: body.reason,
          reply: redactText(body.reply, 900), question: redactText(body.question, 300),
          at: now.toISOString(), expiresAt: new Date(now.getTime() + 90 * 86400000)});
        return 'ok';
      });
      return send(res, result === 'ok' ? 200 : result === 'limited' ? 429 : 401,
        result === 'ok' ? {ok: true} : {error: result === 'limited' ? 'resource-exhausted' : 'unauthenticated'});
    }
    if (body.operation === 'erase') {
      if (!Number.isFinite(user.auth_time) || Date.now() / 1000 - user.auth_time > 300) return send(res, 403, {error: 'requires-recent-login'});
      await db.runTransaction(async tx => {
        if (!(await tx.get(fence)).exists) tx.create(fence, {requestedAt: FieldValue.serverTimestamp()});
        tx.delete(db.doc(`_aiLimits/${hash(uid)}`));
      });
      await erasePrivateAndLegacyData(db, uid);
      // Page erasure for bounded runtime; the caller repeats until done.
      const rows = await db.collection('pipReports').where('ownerUid', '==', uid).limit(100).get();
      const batch = db.batch();
      for (const row of rows.docs) batch.delete(row.ref);
      if (!rows.empty) await batch.commit();
      if (user.email) await db.doc(`_resetLimits/${hash(`address:${user.email.toLowerCase()}`)}`).delete();
      await db.doc(`_resetLimits/${hash(`privacy:${uid}`)}`).delete();
      return send(res, 200, {done: rows.size < 100});
    }
    const section = body.section;
    const cursor = body.cursor;
    if (typeof section !== 'string' || !EXPORT_SECTIONS.includes(section) ||
      (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 1024))) return send(res, 400, {error: 'invalid-argument'});
    if (section === 'account') {
      const record = await auth.getUser(uid);
      return send(res, 200, {records: [{path: 'firebaseAuth', data: {
        uid, email: record.email ?? null, displayName: record.displayName ?? null,
        photoURL: record.photoURL ?? null, emailVerified: record.emailVerified,
        providers: record.providerData.map(p => ({providerId: p.providerId, uid: p.uid, email: p.email ?? null})),
        createdAt: record.metadata.creationTime, lastSignInAt: record.metadata.lastSignInTime,
      }}], cursor: null});
    }
    if (section === 'profile' || section === 'limits') {
      const paths = section === 'profile' ? [`users/${uid}`] : [`_aiLimits/${hash(uid)}`, `accountDeletions/${uid}`, `_resetLimits/${hash(`privacy:${uid}`)}`, ...(user.email ? [`_resetLimits/${hash(`address:${user.email.toLowerCase()}`)}`] : [])];
      const docs = await db.getAll(...paths.map(p => db.doc(p)));
      return send(res, 200, {records: docs.filter(d => d.exists).map(d => ({path: d.ref.path, data: d.data()})), cursor: null});
    }
    let query: Query = section === 'pairCodesChild' || section === 'pairCodesGuardian'
      ? db.collection('pairCodes').where(section === 'pairCodesChild' ? 'childUid' : 'claimedBy', '==', uid)
      : section === 'entries' || section === 'members'
      ? db.collectionGroup(section).where('ownerUid', '==', uid)
      : section === 'pipReports' ? db.collection('pipReports').where('ownerUid', '==', uid)
      : db.collection(`users/${uid}/${section}`);
    // Cursor is only a position in an ownership-filtered query, never a path to read.
    query = query.orderBy(FieldPath.documentId());
    if (typeof cursor === 'string') {
      const parts = cursor.split('/');
      if (parts.length % 2 || parts.some(p => !p || p === '.' || p === '..')) return send(res, 400, {error: 'invalid-argument'});
      query = query.startAfter(db.doc(cursor));
    }
    const page = await query.limit(50).get();
    const records: Array<{path: string; data: unknown}> = page.docs.map(d => ({path: d.ref.path, data: d.data()}));
    if (section === 'deletionRefs') {
      // Schema-2 inventory includes legacy nested private documents too.
      const paths = page.docs.map(d => d.get('path'));
      if (paths.some(p => typeof p !== 'string' || !p.startsWith(`users/${uid}/`) || p.split('/').length % 2 || p.includes('//'))) throw new Error('inventory');
      if (paths.length) {
        const legacy = await db.getAll(...paths.map(p => db.doc(p)));
        for (const d of legacy) if (d.exists) records.push({path: d.ref.path, data: d.data()});
      }
    }
    return send(res, 200, {records, cursor: page.size === 50 ? page.docs.at(-1)!.ref.path : null});
  } catch {
    console.error('account-data unavailable');
    return send(res, 503, {error: 'unavailable'});
  }
}
