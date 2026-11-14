import type { ServerResponse } from 'node:http';
import { send, sweepExpired, type Request } from './_security.js';
import { validDeliveryRequest } from './_resetDeliveryAuth.js';
import { drainResetQueue } from './_resetQueue.js';
import { sweepDeletionFences } from './_accountRetention.js';

export default async function handler(req: Request, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, {error: 'method'});
  }
  if (!validDeliveryRequest(req)) return send(res, 401, {error: 'unauthenticated'});
  try {
    // Retention also runs on quiet days, independently of new reports.
    for (const collection of ['pipReports', '_aiLimits', '_resetLimits']) {
      await sweepExpired(collection);
    }
    await sweepDeletionFences();
    return send(res, 200, await drainResetQueue());
  } catch {
    console.error('reset delivery worker unavailable');
    return send(res, 503, {error: 'unavailable'});
  }
}
