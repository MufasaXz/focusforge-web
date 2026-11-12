import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';

let client: ReturnType<typeof createClient> | undefined;
function createClient() {
 const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
 const appId = import.meta.env.VITE_FIREBASE_APP_ID;
 if (!apiKey || !appId) throw new Error('Website account access is temporarily unavailable. Please contact support.');
 const emulated = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';
 const app = initializeApp({ apiKey, appId, projectId: emulated ? 'demo-focusforge-web' : 'focusforge-1edf7', authDomain: 'focusforge-1edf7.firebaseapp.com' }, 'account-deletion');
 // Public, domain-restricted reCAPTCHA key; never a server credential.
 // Local previews/fixtures do not contact attestation unless explicitly configured.
 const productionHost = typeof window !== 'undefined' &&
  ['www.focus-forge.in', 'focus-forge.in', 'focusforgeorg.vercel.app'].includes(window.location.hostname);
 const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
  (productionHost ? '6LdKgxwuAAAAAP2JlWbvfVROgdUOCAa9wjSOKCy2' : '');
 if (!emulated && siteKey) {
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
 }
 const auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
 const db = initializeFirestore(app, { localCache: memoryLocalCache() });
 if (emulated) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8180);
 }
 return { auth, db };
}
export function getAccountClient() { return client ??= createClient(); }
