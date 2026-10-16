# Website account deletion

The /delete-account page uses the existing focusforge-1edf7 Firebase project.
Email/password and Google sign-in establish a fresh identity before an explicit
permanent-deletion confirmation. There is no public signup form. Firebase Auth
and Firestore use memory persistence; no administrator credential is shipped.

Set VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID for local and deployment builds.
These are the Firebase web application's public client identifiers. Keep local
configuration in ignored .env.local. The registered website app is named
FocusForge website. Authorize focusforgeorg.vercel.app in Firebase Authentication.
Email/password and Google must be enabled. The CSP in vercel.json permits the
required Firebase requests and Google authentication popup.

Cleanup follows the Android schema-2 contract: check migration, create the
immutable deletion fence, leave groups/transfer ownership, remove indexed
historical sharing rows, delete inventoried and known private records, then
delete Auth last. Failed cleanup keeps Auth available for retries. No paid
Function or automated email-processing service is required. An account-ID-only
fence and request timestamp remain to block stale writers. Phone-local data
cannot be erased from this website. Provider backup expiration is not promised.

The known private collection list includes preferences and sessionData. These
cover the linked account's studyBackup settings and dated completed focus
sessions alongside the private achievement backup. No cleanup algorithm change
is needed for the study-recovery release. The cleanup regression test verifies
both paths are removed before Auth deletion while another account's backup
and sessions remain intact.

The migration marker and deployed Firestore rules were checked on 2026-10-15.
The fixture includes the app's private study backup and leaderboard level rules
for the 1.0.0+2022 release. On 2026-10-16 these rules were deployed and read back
from Firebase, matching the app source exactly (SHA-256
a64893be79a5525106106df6f0f7a31199425dd9490a0ff8964cdf5bb69eec2c).
Keep the fixture in sync with the app's rules when changing the cleanup schema.

Validation:

- npm test builds the website and checks prerendered routes and public content.
- Start a Firestore emulator at 127.0.0.1:8180 for demo-focusforge-web, then run
  npm run test:cleanup. It tests real security rules, ownership transfer,
  retry/failure behavior, private inventory validation and Auth-last ordering.
- For browser integration, also run the Firebase Auth emulator at
  127.0.0.1:9199, start Vite on port 4176 with VITE_FIREBASE_EMULATORS=true,
  and run node scripts/account-browser-check.mjs. This checks wrong passwords,
  explicit confirmation, real emulator Auth deletion and cloud cleanup at
  320, 390 and 1440 pixels. Production builds omit emulator connections.

A disposable production account was signed in and deleted through the public
page on 2026-10-15. Independent administrator reads confirmed absence of its
Auth record, profile, private badge record and leaderboard entry. Google OAuth
opened accounts.google.com, and cancellation returned safely; a complete Google
account sign-in/deletion was not performed. No existing user's account was used.
