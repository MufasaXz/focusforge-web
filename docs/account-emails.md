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

## Rate-limited Firebase reset delivery

The app posts `{ "email": "…" }` to `/api/password-reset`. The function validates
and bounds the request, counts attempts in Firestore, then calls Firebase's
`accounts:sendOobCode` API with `PASSWORD_RESET`. Firebase sends its configured
email and handles account-existence privacy. **Keep improved email privacy
enabled in Firebase Authentication.** The custom Admin lookup and Gmail SMTP
path were removed because their timing and delivery failures exposed whether
an address was registered. The earlier branded SMTP templates are historical
assets; this endpoint no longer uses them.

Each address may ask 3 times per rolling hour and each network 10 times. Excess
requests get `429`; the app does not retry them through its fallback. Counters
live under hashed keys in `_resetLimits`, inaccessible to client SDKs. Expired
records are deleted with update-time preconditions, so a concurrent request's
fresh counter cannot be erased by an old sweep.

Malformed/oversized requests are rejected before any backend work. The 2048-byte
limit applies to framework-parsed bodies, strings, buffers and raw streams.
Unexpected fields are rejected. On Vercel the network key uses the edge-owned
`x-vercel-forwarded-for` header rather than a caller-supplied proxy chain.

Required production environment variables:

- `FIREBASE_SERVICE_ACCOUNT`: server-only service account JSON, also used by
  `/api/ai-authorize`. Never prefix this with `VITE_`.
- `FIREBASE_WEB_API_KEY`, or the existing `VITE_FIREBASE_API_KEY`: public Firebase
  client key for the native reset REST request. Do not apply browser-only
  restrictions to a key used for server requests.
- `APP_CHECK_ENFORCE=true`: require App Check on custom endpoints **after** the
  attestation rollout. During monitoring, missing tokens are allowed and invalid
  supplied tokens are rejected.
- `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`: optional public web site-key override.

`SMTP_USER` and `SMTP_PASS` are unused and can be removed from the hosting secret
store after this deployment. Keep the Firebase Auth handler configured; outgoing
emails use Firebase's own template, not the old custom Gmail template.

A provider/configuration outage returns a generic `503` with no provider error
text or email address in logs. The app retains its native Firebase fallback,
which is governed by Firebase's separate limits and App Check enforcement.

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
