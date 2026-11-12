import type { ServerResponse } from 'node:http';
import { send, type Request } from './_security.js';
import { validDeliveryRequest } from './_resetDeliveryAuth.js';
import { drainResetQueue } from './_resetQueue.js';

export default async function handler(req: Request, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, {error: 'method'});
  }
  if (!validDeliveryRequest(req)) return send(res, 401, {error: 'unauthenticated'});
  try {
    return send(res, 200, await drainResetQueue());
  } catch {
    console.error('reset delivery worker unavailable');
    return send(res, 503, {error: 'unavailable'});
  }
}
