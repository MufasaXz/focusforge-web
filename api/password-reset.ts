import type { ServerResponse } from 'node:http';
import { checkApp, clientAddress, readBody, send, sweepExpired, withinLimit, type Request } from './_security.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,63}$/;

/**
 * Firebase owns delivery and account-existence privacy. Do not look up users,
 * generate admin reset links, or synchronously send SMTP here: those create
 * different failure/timing paths for known and unknown addresses.
 */
export default async function handler(req: Request, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method' });
  }
  let email: string;
  try {
    const body = await readBody(req);
    if (Object.keys(body).some(key => key !== 'email')) throw new Error('body');
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return send(res, 400, { error: 'body' });
  }
  if (email.length > 254 || !EMAIL.test(email)) return send(res, 400, { error: 'email' });

  try {
    if (!await checkApp(req)) return send(res, 403, { error: 'app-check' });
    if (!await withinLimit(`network:${clientAddress(req)}`, 10) || !await withinLimit(`address:${email}`, 3)) {
      return send(res, 429, { error: 'rate' });
    }
    await sweepExpired().catch(() => console.warn('reset-limit sweep deferred'));
    const key = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
    if (!key) throw new Error('reset service not configured');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof req.headers['x-firebase-appcheck'] === 'string') {
      headers['X-Firebase-AppCheck'] = req.headers['x-firebase-appcheck'];
    }
    const result = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers,
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
      signal: AbortSignal.timeout(10000),
    });
    // Improved email privacy MUST stay enabled in Firebase Authentication.
    // Its reset API deliberately gives the same success for unknown addresses.
    if (!result.ok) {
      // Never expose Google's error payload (which may contain request details).
      // Surface a retryable service failure; the app can use Firebase directly.
      return send(res, 503, { error: 'send' });
    }
    return send(res, 200, { ok: true });
  } catch {
    console.error('password-reset unavailable');
    return send(res, 503, { error: 'send' });
  }
}
