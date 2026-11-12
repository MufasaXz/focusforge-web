import type { ServerResponse } from 'node:http';
import { admin, checkApp, hash, readBody, send, sweepExpired, type Request } from './_security.js';

/**
 * The Worker calls this before every answer/report. No model credentials or
 * question text crosses this boundary. Firebase performs a current revocation
 * and disablement check; Firestore atomically claims the UTC daily allowance.
 * A direct caller can only spend its own allowance, never another user's.
 */
export default async function handler(req: Request, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method' });
  }
  let operation: unknown;
  try {
    const body = await readBody(req, 256);
    if (Object.keys(body).some(key => key !== 'operation')) throw new Error('body');
    operation = body.operation;
    if (operation !== 'answer' && operation !== 'report') throw new Error('operation');
  } catch {
    return send(res, 400, { error: 'invalid-argument' });
  }
  const bearer = req.headers.authorization;
  if (typeof bearer !== 'string' || !bearer.startsWith('Bearer ') || bearer.length > 8192) {
    return send(res, 401, { error: 'unauthenticated' });
  }
  try {
    const { auth, db } = admin();
    let user;
    try {
      user = await auth.verifyIdToken(bearer.slice(7), true);
    } catch (error) {
      const code = (error as { code?: string }).code || '';
      if (['auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token',
        'auth/argument-error', 'auth/user-disabled', 'auth/user-not-found'].includes(code)) {
        return send(res, 401, { error: 'unauthenticated' });
      }
      throw error;
    }
    const provider = user.firebase?.sign_in_provider;
    if (!provider || provider === 'anonymous' || (provider === 'password' && user.email_verified !== true)) {
      return send(res, 401, { error: 'unauthenticated' });
    }
    if (!await checkApp(req)) return send(res, 403, { error: 'app-check' });
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const counter = db.collection('_aiLimits').doc(hash(user.uid));
    const deletion = db.collection('accountDeletions').doc(user.uid);
    const result = await db.runTransaction(async tx => {
      // A deletion fence prevents a racing cleanup from authorizing more work.
      if ((await tx.get(deletion)).exists) return 'deleted';
      const previous = await tx.get(counter);
      const data = previous.data();
      const used = data?.day === day ? Number(data.count) : 0;
      const reports = data?.day === day ? Number(data.reports || 0) : 0;
      if (operation === 'answer' && used >= 5) return 'limited';
      if (operation === 'report' && reports >= 20) return 'limited';
      tx.set(counter, { day, count: used + (operation === 'answer' ? 1 : 0),
        reports: reports + (operation === 'report' ? 1 : 0),
        expiresAt: new Date(now.getTime() + 2 * 86400000) });
      return 'allowed';
    });
    if (result === 'deleted') return send(res, 401, { error: 'unauthenticated' });
    if (result === 'limited') return send(res, 429, { error: 'resource-exhausted', window: 'day' });
    await sweepExpired('_aiLimits').catch(() => console.warn('ai-limit sweep deferred'));
    return send(res, 200, { uid: user.uid });
  } catch {
    // Fail closed on auth/quota outages. Never send tokens or SDK error details to logs.
    console.error('ai-authorization unavailable');
    return send(res, 503, { error: 'unavailable' });
  }
}
