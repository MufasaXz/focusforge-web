import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';

let client: ReturnType<typeof createClient> | undefined;
function createClient() {
 const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
 const appId = import.meta.env.VITE_FIREBASE_APP_ID;
 if (!apiKey || !appId) throw new Error('Website account access is temporarily unavailable. Please contact support.');
 const emulated = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';
 const app = initializeApp({ apiKey, appId, projectId: emulated ? 'demo-focusforge-web' : 'focusforge-1edf7', authDomain: 'focusforge-1edf7.firebaseapp.com' }, 'account-deletion');
 const auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
 const db = initializeFirestore(app, { localCache: memoryLocalCache() });
 if (emulated) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8180);
 }
 return { auth, db };
}
export function getAccountClient() { return client ??= createClient(); }
