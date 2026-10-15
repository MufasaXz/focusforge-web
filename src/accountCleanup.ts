import {
 collection, collectionGroup, doc, getDocFromServer, getDocsFromServer,
 limit, query, runTransaction, serverTimestamp, where, writeBatch, deleteDoc,
 type Firestore, type Query,
} from 'firebase/firestore';

const privateCollections = ['achievements', 'stats', 'appStats', 'preferences', 'sessions',
 'sessionData', 'guardian', 'children', 'remoteRules', 'progress', 'catalog'];

// Matches the Android client's schema-2 cleanup contract. Never delete Auth
// until every cloud operation has been acknowledged by Firestore.
export async function deleteAccountAndData(
 user: { uid: string; getIdToken: (refresh?: boolean) => Promise<string>; delete: () => Promise<void> },
 db: Firestore,
 onProgress: (message: string) => void = () => {},
) {
 const uid = user.uid;
 if (!uid || uid.includes('/')) throw new Error('Invalid account identity.');
 await user.getIdToken(true);
 onProgress('Checking account cleanup…');
 const schema = await getDocFromServer(doc(db, 'accountCleanup/schema'));
 if (schema.data()?.version !== 2) throw new Error('Account deletion setup is incomplete. Please contact support. Your login has not been deleted.');
 await runTransaction(db, async tx => {
  const marker = doc(db, 'accountDeletions', uid);
  if (!(await tx.get(marker)).exists()) tx.set(marker, { requestedAt: serverTimestamp() });
 });
 onProgress('Removing group memberships and shared progress…');
 while (true) {
  const groups = await getDocsFromServer(query(collection(db, 'studyGroups'), where('memberIds', 'array-contains', uid), limit(50)));
  if (groups.empty) break;
  for (const group of groups.docs) await runTransaction(db, async tx => {
   const latest = await tx.get(group.ref);
   const data = latest.data();
   if (!data) return;
   const ids = (data.memberIds as string[]).filter(id => id !== uid);
   if (!ids.length) {
    tx.delete(group.ref);
    tx.delete(doc(db, 'groupInvites', data.inviteCode));
   } else {
    tx.update(group.ref, { memberIds: ids, ...(data.ownerUid === uid ? { ownerUid: ids[0] } : {}) });
   }
   tx.delete(doc(group.ref, 'members', uid));
  });
 }
 async function removeRows(source: Query, pageSize = 200) {
  while (true) {
   const rows = await getDocsFromServer(query(source, limit(pageSize)));
   if (rows.empty) return;
   const batch = writeBatch(db);
   for (const row of rows.docs) batch.delete(row.ref);
   await batch.commit();
  }
 }
 await removeRows(query(collectionGroup(db, 'entries'), where('ownerUid', '==', uid)));
 await removeRows(query(collectionGroup(db, 'members'), where('ownerUid', '==', uid)), 8);
 onProgress('Removing your private cloud records…');
 while (true) {
  const inventory = await getDocsFromServer(query(collection(db, 'users', uid, 'deletionRefs'), limit(200)));
  if (inventory.empty) break;
  const batch = writeBatch(db);
  for (const row of inventory.docs) {
   const path: unknown = row.data().path;
   if (typeof path !== 'string' || !path.startsWith('users/' + uid + '/') || path.split('/').length % 2 !== 0 || path.includes('//')) {
    throw new Error('The private cleanup inventory needs support. Your login has not been deleted; you can retry after it is corrected.');
   }
   batch.delete(doc(db, path));
   batch.delete(row.ref);
  }
  await batch.commit();
 }
 for (const name of privateCollections) await removeRows(collection(db, 'users', uid, name));
 await deleteDoc(doc(db, 'users', uid));
 onProgress('Deleting your sign-in account…');
 await user.delete();
}
