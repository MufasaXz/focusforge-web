import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { RESET_SUBJECT, resetEmailHtml, resetEmailText } from './_resetEmail.js';

/**
 * Sends FocusForge's own password reset email.
 *
 * Firebase generates the one-time code with the Admin SDK; this function puts
 * it behind a button that opens /account-action, and sends the email through
 * Gmail SMTP. The answer is the same whether or not the address has an
 * account, so it cannot be used to discover who signed up. Requests are
 * limited per address and per network, counted in Firestore under hashed keys
 * so no raw address or IP is stored. Clients cannot read that collection: the
 * security rules match nothing there. A record is of no use an hour after its
 * last attempt, and each request removes the ones that have run out.
 */

const SITE = 'https://www.focus-forge.in';
const HOUR = 60 * 60 * 1000;
const PER_ADDRESS = 3;
const PER_NETWORK = 10;
const MAX_BODY = 2048;
const SWEEP_BATCH = 50;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,63}$/;

type Request = IncomingMessage & { body?: unknown };

function send(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function admin() {
  if (!getApps().length) {
    const account = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!account) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
    initializeApp({ credential: cert(JSON.parse(account)) });
  }
  return { auth: getAuth(), db: getFirestore() };
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

/** Records one attempt under `key` and says whether it is within `limit` per hour. */
async function withinLimit(key: string, limit: number) {
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

/**
 * Deletes rate-limit records whose hour has passed.
 *
 * Firestore's own expiry (a TTL policy on `expiresAt`) needs a billing plan
 * this project does not have, so without this the hashed addresses and
 * networks were kept for good. A record past `expiresAt` holds no attempt
 * from the last hour, so removing it changes no one's limit.
 */
async function sweepExpired() {
  const { db } = admin();
  const expired = await db.collection('_resetLimits').where('expiresAt', '<', new Date()).limit(SWEEP_BATCH).get();
  if (expired.empty) return;
  const batch = db.batch();
  for (const record of expired.docs) batch.delete(record.ref);
  await batch.commit();
}

async function readBody(req: Request): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new Error('Body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

function clientAddress(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

/** The page link for a Firebase action link: same one-time code, our page. */
export function pageLinkFor(firebaseLink: string) {
  const code = new URL(firebaseLink).searchParams.get('oobCode');
  if (!code) throw new Error('Firebase returned a link without a code');
  return `${SITE}/account-action?mode=resetPassword&oobCode=${encodeURIComponent(code)}`;
}

export default async function handler(req: Request, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method' });
  }
  let email = '';
  try {
    const body = await readBody(req);
    const value = typeof body === 'object' && body !== null && 'email' in body ? (body as { email: unknown }).email : '';
    email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  } catch {
    return send(res, 400, { error: 'body' });
  }
  if (email.length > 254 || !EMAIL.test(email)) return send(res, 400, { error: 'email' });

  try {
    if (!await withinLimit(`network:${clientAddress(req)}`, PER_NETWORK) || !await withinLimit(`address:${email}`, PER_ADDRESS)) {
      return send(res, 429, { error: 'rate' });
    }
    // Housekeeping must never cost someone their reset email.
    await sweepExpired().catch(error => console.error('reset-limit sweep failed:', (error as Error).message));
    const { auth } = admin();
    try {
      await auth.getUserByEmail(email);
    } catch (error) {
      // An unknown address gets the same answer as a known one, and no email.
      if ((error as { code?: string }).code === 'auth/user-not-found') return send(res, 200, { ok: true });
      throw error;
    }
    const firebaseLink = await auth.generatePasswordResetLink(email);
    const link = pageLinkFor(firebaseLink);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) throw new Error('SMTP_USER and SMTP_PASS are not set');
    const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
    await transport.sendMail({
      from: { name: 'FocusForge', address: user },
      replyTo: user,
      to: email,
      subject: RESET_SUBJECT,
      html: resetEmailHtml(email, link),
      text: resetEmailText(email, link),
    });
    return send(res, 200, { ok: true });
  } catch (error) {
    // Logged without the address; the app falls back to Firebase's own email.
    console.error('password-reset failed:', (error as Error).message);
    return send(res, 500, { error: 'send' });
  }
}
