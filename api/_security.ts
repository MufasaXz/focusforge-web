import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';

export type Request = IncomingMessage & { body?: unknown };
export const HOUR = 60 * 60 * 1000;
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function admin() {
  if (!getApps().length) {
    const account = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!account) throw new Error('Firebase service unavailable');
    initializeApp({ credential: cert(JSON.parse(account)) });
  }
  return { auth: getAuth(), db: getFirestore(), appCheck: getAppCheck() };
}

export function send(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(JSON.stringify(body));
}

/** Vercel replaces this header at its edge. Never trust a caller's forwarding chain. */
export function clientAddress(req: Request) {
  const header = process.env.VERCEL === '1' ? req.headers['x-vercel-forwarded-for'] : undefined;
  return (typeof header === 'string' ? header.split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown';
}

export async function readBody(req: Request, limit = 2048): Promise<Record<string, unknown>> {
  const length = req.headers['content-length'];
  if (length && (!/^\d+$/.test(String(length)) || Number(length) > limit)) throw new Error('body');
  let body: unknown;
  if (req.body !== undefined) {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8')
      : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw, 'utf8') > limit) throw new Error('body');
    body = JSON.parse(raw);
  } else {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > limit) throw new Error('body');
      chunks.push(buffer);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body');
  return body as Record<string, unknown>;
}

export async function withinLimit(key: string, limit: number) {
  const { db } = admin();
  const ref = db.collection('_resetLimits').doc(hash(key));
  return db.runTransaction(async transaction => {
    const now = Date.now();
    const snapshot = await transaction.get(ref);
    const recent = ((snapshot.get('hits') as number[] | undefined) ?? []).filter(time => now - time < HOUR);
    if (recent.length >= limit) return false;
    transaction.set(ref, { hits: [...recent, now], expiresAt: new Date(now + HOUR) });
    return true;
  });
}

/** A renewed record must survive a sweep that read an older version. */
export async function sweepExpired(collection = '_resetLimits') {
  const { db } = admin();
  const expired = await db.collection(collection).where('expiresAt', '<', new Date()).limit(50).get();
  if (expired.empty) return;
  const batch = db.batch();
  for (const record of expired.docs) batch.delete(record.ref, { lastUpdateTime: record.updateTime });
  // A conflicting write aborts the whole batch safely; a later sweep retries it.
  await batch.commit();
}

/** Invalid supplied tokens always fail; missing tokens are allowed only during rollout. */
export async function checkApp(req: Request) {
  const token = req.headers['x-firebase-appcheck'];
  if (!token) return process.env.APP_CHECK_ENFORCE !== 'true';
  if (typeof token !== 'string' || token.length > 8192) return false;
  try {
    await admin().appCheck.verifyToken(token);
    return true;
  } catch {
    return false;
  }
}
