# Account emails

Firebase sends every account email (password reset, email verification and
email change) through one action URL. `/account-action` is that page.

- `mode=resetPassword`: checks the code with `verifyPasswordResetCode`, which
  does not use it up, shows the account address, and asks for the new password
  twice. The rules match the app: at least 8 characters, both entries equal.
  `confirmPasswordReset` spends the code once, on save. Expired, used, weak
  and network failures each get their own message; a dead link explains how
  to request a new one from the app.
- `mode=verifyEmail`: renders the same screen as `/verify-email`.
- Any other mode (`recoverEmail`, `verifyAndChangeEmail`,
  `revertSecondFactorAddition`) is forwarded with its query intact to
  Firebase's hosted handler at
  `https://focusforge-1edf7.firebaseapp.com/__/auth/action`, so no account
  action breaks.
- Opened without a link, it explains where the link comes from and sends
  nothing to Firebase.

The one-time code is removed from the address bar as soon as it is read. The
page is noindex, left out of the sitemap, and served with `no-store` and
`no-referrer`. Incoming `apiKey` values are ignored; the site uses its own
public web configuration. Check it locally with a fixture build on port 4178
and `node scripts/account-action-check.mjs`; every Firebase request is
intercepted.

## Firebase Console setup

Do these in order. The page must be live before Firebase points at it.

1. Project settings → General → Public-facing name: `FocusForge`. Firebase
   puts this name into email subjects as `%APP_NAME%`; while it is unset the
   subject reads `project-54619667392`.
2. Authentication → Templates → Password reset → edit:
   - Sender name: `FocusForge`
   - Subject: `Reset your FocusForge password`
   - Message: paste `docs/email-templates/password-reset.html` (without its
     leading comment).
   - Customize action URL: `https://www.focus-forge.in/account-action`
3. Send yourself a reset from the app and follow the button once to confirm.

The action URL is shared by every template, which is why the page handles or
forwards every mode. Firebase does not allow the email verification message to
be edited; that email keeps Firebase's wording.

## Branded reset emails with private queued delivery

The app posts `{ "email": "…" }` to `/api/password-reset`. After validation,
App Check policy and rate limiting, the endpoint durably queues the same job for
**every** address and returns `200 { ok: true }`. It performs no account lookup
or SMTP work before ending the response. A successful response means the request
was accepted, not that an email exists for every address.

After the response, `@vercel/functions.waitUntil` runs an immediate delivery
attempt. Firebase Admin generates a one-time reset link for a registered address.
The unchanged `api/_resetEmail.ts` HTML/text template is sent through Gmail SMTP,
with sender name FocusForge and subject “Reset your FocusForge password”. The
button opens `/account-action` on `www.focus-forge.in`. Unknown or disabled
accounts finish silently in the background. SMTP/link-generation failures never
change the public status or expose provider details.

Jobs live in `_resetMailQueue`, a server-only collection with no client rule
grants. Email addresses are AES-256-GCM encrypted with a domain-separated key
derived from the server service-account private key. The job ID is authenticated
as associated data, preventing ciphertext substitution between jobs. Reset codes
and generated links are never persisted. Completed jobs are deleted; pending
jobs expire after 15 minutes. Expired records are removed by the minute worker.
If rotating the service-account private key, let existing jobs drain first (up
to 15 minutes), or expire them explicitly; ciphertext created with the old key
cannot be recovered using the new key.

The existing Cloudflare Worker invokes `/api/reset-delivery` every minute to
retry durable work even when no new reset requests arrive. It signs a short-lived
timestamp with `RESET_DELIVERY_SIGNING_KEY` (base64 PKCS8 Ed25519). Only the public
verification key is committed in `api/_resetDeliveryAuth.ts`. Requests without a
valid signature fail before database access. The worker handles at most five
jobs concurrently per run and uses 90-second transactional leases, bounded
backoff and four attempts. A crash after SMTP accepted a message but before the
job was deleted can cause a duplicate; a stable message ID helps identify it.
Delivery is at least once, not exactly once. Exhausted retries log a generic
operational error with no address or reset token.

Each address may ask 3 times per rolling hour and each network 10 times. Excess
requests get `429`; the app does not retry them through its fallback. Hashed
counters in `_resetLimits` and all expiry sweeps retain update-time preconditions,
so old snapshots cannot delete renewed records. The 2048-byte limit applies to
parsed objects, strings, buffers and raw streams; extra fields are rejected.
Vercel's edge-owned forwarded address supplies the network key.

Required production variables:

- `FIREBASE_SERVICE_ACCOUNT`: server-only Admin credentials and queue encryption
  material. Never prefix this with `VITE_`.
- `SMTP_USER` and `SMTP_PASS`: the existing Gmail sender and app password; retain
  them. The standard Firebase template is only the app's existing emergency
  fallback when the endpoint cannot accept a request.
- `APP_CHECK_ENFORCE=true`: require App Check on custom endpoints **after** the
  attestation rollout. During monitoring, missing tokens are allowed and invalid
  supplied tokens are rejected.
- `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`: optional public web site-key override.
- Cloudflare secret `RESET_DELIVERY_SIGNING_KEY`: scheduler-only private key. It
  cannot read user data or authorize an arbitrary recipient; it can only wake
  the bounded delivery queue.

Deploy the website first, configure the Worker secret, then deploy the minute
scheduler. Confirm the signed endpoint returns success and unauthenticated
requests return `401`. Monitor `reset_scheduler_failed`, deferred delivery and
exhausted-retry logs. Queue/configuration outages before acceptance return a
uniform `503`; known and unknown addresses follow exactly the same queue path.
No live test email is needed for the automated tests: real Firestore emulator
checks use fake SMTP and verify the exact legacy template and button URL.

## AI authorization

`/api/ai-authorize` accepts a bearer Firebase token and `{ "operation": "answer"
| "report" }`. It checks current revocation/disablement, provider/email status,
App Check policy, and the deletion fence. A Firestore transaction allows five
answer attempts per UID per UTC day and twenty separate reports. All failures
are closed: the Worker never calls a model if authorization fails or is down.
The counters are kept under hashed UID keys in `_aiLimits` and swept after expiry
using version preconditions. User questions and provider keys are never sent to
this endpoint. Direct callers can consume only their own allowance.

Deploy this endpoint before deploying the Worker that depends on it. For real
Firestore concurrency tests, start a local Firestore emulator and run
`npm run test:security:emulator` with `FIRESTORE_EMULATOR_HOST` set. Unit regressions
and TypeScript checks for API code are included in `npm test`.
