import type { ServerResponse } from 'node:http';
import { waitUntil } from '@vercel/functions';
import { enqueueReset, deliverReset } from './_resetQueue.js';
import { checkApp, clientAddress, readBody, send, sweepExpired, withinLimit, type Request } from './_security.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,63}$/;

/** Queue the same work for all addresses. Delivery never shapes the response. */
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
    const id = await enqueueReset(email);
    // End the response before account lookup or SMTP. A minute scheduler retries
    // the durable record if this process exits or the immediate attempt fails.
    send(res, 200, { ok: true });
    try {
      waitUntil(deliverReset(id).catch(() => console.warn('reset background delivery deferred')));
    } catch {
      console.warn('reset delivery left for scheduler');
    }
    return;
  } catch {
    console.error('password-reset unavailable');
    return send(res, 503, { error: 'send' });
  }
}
