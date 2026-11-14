import { admin } from './_security.js';

/** Keep a stale-write fence for at least seven days; retain it while the
 * credential still exists, including interrupted account deletions. */
export async function sweepDeletionFences() {
  const {db, auth} = admin();
  const rows = await db.collection('accountDeletions')
    .where('requestedAt', '<', new Date(Date.now() - 7 * 86400000)).limit(25).get();
  for (const row of rows.docs) {
    try { await auth.getUser(row.id); }
    catch (error) {
      if ((error as {code?: string}).code === 'auth/user-not-found') {
        await row.ref.delete({lastUpdateTime: row.updateTime});
      }
    }
  }
}
