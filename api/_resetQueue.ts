import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { admin, sweepExpired } from './_security.js';
import { RESET_SUBJECT, resetEmailHtml, resetEmailText } from './_resetEmail.js';

const COLLECTION = '_resetMailQueue';
const RETENTION = 15 * 60 * 1000;
const LEASE = 90 * 1000;
const MAX_ATTEMPTS = 4;

type Envelope = { iv: string; tag: string; data: string };

function encryptionKey() {
  // Keep raw addresses out of Firestore. Reuse existing high-entropy server
  // key material with domain separation; this derived key never leaves Vercel.
  const privateKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}').private_key;
  if (typeof privateKey !== 'string' || !privateKey) throw new Error('queue unavailable');
  return createHash('sha256').update('focusforge/reset-queue/v1\0').update(privateKey).digest();
}

function seal(email: string, id: string): Envelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(id));
  const data = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

function open(envelope: Envelope, id: string) {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(envelope.iv, 'base64'));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8');
}

/** Persist every valid address alike, before looking up any Firebase account. */
export async function enqueueReset(email: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error('mail unavailable');
  const id = randomUUID();
  const now = Date.now();
  await admin().db.collection(COLLECTION).doc(id).create({
    envelope: seal(email, id), attempts: 0, availableAt: new Date(now), expiresAt: new Date(now + RETENTION),
  });
  return id;
}

export function pageLinkFor(firebaseLink: string) {
  const code = new URL(firebaseLink).searchParams.get('oobCode');
  if (!code) throw new Error('invalid action link');
  return `https://www.focus-forge.in/account-action?mode=resetPassword&oobCode=${encodeURIComponent(code)}`;
}

/** At-least-once delivery. A short lease protects against overlapping workers. */
export async function deliverReset(id: string): Promise<'sent' | 'skipped' | 'retry'> {
  const { db, auth } = admin();
  const ref = db.collection(COLLECTION).doc(id);
  const lease = randomUUID();
  const job = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const row = snapshot.data()!;
    const now = Date.now();
    if (row.availableAt.toMillis() > now && row.expiresAt.toMillis() > now) return null;
    if (row.expiresAt.toMillis() <= now || row.attempts >= MAX_ATTEMPTS) {
      tx.delete(ref);
      return null;
    }
    tx.update(ref, {lease, attempts: row.attempts + 1, availableAt: new Date(now + LEASE)});
    return {envelope: row.envelope as Envelope, attempts: Number(row.attempts) + 1};
  });
  if (!job) return 'skipped';

  let delivered = false;
  try {
    const email = open(job.envelope, id);
    let firebaseLink: string | undefined;
    try {
      firebaseLink = await auth.generatePasswordResetLink(email);
    } catch (error) {
      const code = (error as {code?: string}).code;
      if (code !== 'auth/user-not-found' && code !== 'auth/user-disabled') throw error;
      // An unknown or disabled account ends here, after the public response.
    }
    if (firebaseLink) {
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      if (!user || !pass) throw new Error('mail unavailable');
      const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true, auth: {user, pass},
        connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
      });
      try {
        const link = pageLinkFor(firebaseLink);
        await transport.sendMail({
          from: {name: 'FocusForge', address: user}, replyTo: user, to: email,
          messageId: `<reset.${id}@focus-forge.in>`,
          subject: RESET_SUBJECT, html: resetEmailHtml(email, link), text: resetEmailText(email, link),
        });
      } finally { transport.close(); }
    }
    delivered = true;
  } catch {
    // Never log addresses, reset codes, credentials, or provider error bodies.
    console.warn('reset delivery deferred');
  }
  await db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (!current.exists || current.get('lease') !== lease) return;
    if (delivered || job.attempts >= MAX_ATTEMPTS) {
      tx.delete(ref);
      if (!delivered) console.error('reset delivery exhausted retries');
    } else {
      tx.update(ref, {lease: '', availableAt: new Date(Date.now() + 60000 * 2 ** (job.attempts - 1))});
    }
  });
  return delivered ? 'sent' : 'retry';
}

/** Called by the signed minute scheduler, including when no new requests arrive. */
export async function drainResetQueue() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error('mail unavailable');
  encryptionKey(); // Surface missing queue encryption configuration to the scheduler.
  const pending = await admin().db.collection(COLLECTION).where('availableAt', '<=', new Date()).limit(5).get();
  const results = await Promise.all(pending.docs.map(doc => deliverReset(doc.id)));
  await sweepExpired(COLLECTION).catch(() => console.warn('reset queue expiry sweep deferred'));
  return {processed: results.length, retry: results.filter(result => result === 'retry').length};
}
