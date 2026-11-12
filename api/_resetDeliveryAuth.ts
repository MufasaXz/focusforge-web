import { verify } from 'node:crypto';
import type { Request } from './_security.js';

// Public verifier only. The signing key lives in a Cloudflare Worker secret.
export const DELIVERY_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAXk9O2y0wyUasLtt2y1b05vpdhbx+TqrakcsbzWUuJog=\n-----END PUBLIC KEY-----\n";

export function validDeliveryRequest(req: Request, now = Date.now(), publicKey = DELIVERY_PUBLIC_KEY) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return false;
  const match = /^ResetWorker (\d{13})\.([A-Za-z0-9_-]{86})$/.exec(header);
  if (!match || Math.abs(now - Number(match[1])) > 90000) return false;
  try {
    return verify(null, Buffer.from('reset-delivery:' + match[1]), publicKey, Buffer.from(match[2], 'base64url'));
  } catch { return false; }
}
