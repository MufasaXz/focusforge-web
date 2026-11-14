import type { Firestore, Query } from 'firebase-admin/firestore';

/** Legacy guardian/pairing records are no longer active app features. The
 * trusted eraser still removes their references to the authenticated UID.
 * Matches the historical Cloud Functions cleanup contract.
 */
export async function erasePrivateAndLegacyData(db: Firestore, uid: string) {
  async function remove(query: Query) {
    for (;;) {
      const rows = await query.limit(100).get();
      if (rows.empty) break;
      const batch = db.batch();
      for (const row of rows.docs) batch.delete(row.ref);
      await batch.commit();
    }
  }
  await remove(db.collection('pairCodes').where('childUid', '==', uid));
  await remove(db.collection('pairCodes').where('claimedBy', '==', uid));
  // Canonical reverse-link document ID is the child UID, including old links
  // whose fields were incomplete. listDocuments includes missing parents.
  if (!(await db.collectionGroup('children').limit(1).get()).empty) {
    const users = await db.collection('users').listDocuments();
    for (let start = 0; start < users.length; start += 100) {
      const batch = db.batch();
      for (const user of users.slice(start, start + 100)) batch.delete(user.collection('children').doc(uid));
      await batch.commit();
    }
  }
  const links = await db.collectionGroup('guardian').where('parentUid', '==', uid).get();
  for (const link of links.docs) {
    const child = link.ref.parent.parent;
    if (!child || child.parent.id !== 'users' || link.id !== 'link') continue;
    for (const collection of ['remoteRules', 'progress', 'catalog']) await db.recursiveDelete(child.collection(collection));
    await link.ref.delete();
  }
  // Unlike mobile collection enumeration, Admin recursion covers unknown
  // subcollections and descendants whose parent document is missing.
  await db.recursiveDelete(db.doc(`users/${uid}`));
}
