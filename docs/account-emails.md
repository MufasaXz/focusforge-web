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

## Reset emails sent by FocusForge

Firebase refuses changes to this project's email subject, message and action
URL (`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`), so reset emails are sent by
`api/password-reset.ts` instead:

1. The app posts `{ "email": "…" }` to `/api/password-reset`.
2. The function looks the address up with the Admin SDK. An unknown address
   gets the same `200 { ok: true }` and no email.
3. `generatePasswordResetLink` makes the one-time code; the email's button
   opens `/account-action?mode=resetPassword&oobCode=…`.
4. The email (`api/_resetEmail.ts`) goes out through Gmail SMTP from
   focusforgehelp@gmail.com.

Each address may ask 3 times an hour and each network 10 times; extra requests
get `429`. Counts live in Firestore `_resetLimits` under SHA-256 keys, so no raw
address or IP is stored, and the security rules give clients no access there.
Any failure returns `500`, and the app then falls back to Firebase's own email.

Production environment variables, all marked sensitive in Vercel:
`FIREBASE_SERVICE_ACCOUNT` (the service account JSON), `SMTP_USER` and
`SMTP_PASS` (a Gmail app password, never the account password).
