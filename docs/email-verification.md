# Email verification

The existing React/Vite shell, Inter typography, warm paper (#f4ecdf), charcoal
ink (#262923), muted text (#67695f), green (#dce4c7), and account form surfaces
are reused. The single-column page explains the action, confirms the address,
then gives one clear instruction to return to FocusForge. No new motion or
dependencies are needed for this account action.

`/verify-email` handles Firebase `mode=verifyEmail` links only. It checks the
one-time code, asks the user to confirm the displayed email, then applies it.
Loading a link alone does not verify an account. Incoming API keys and continue
URLs are ignored; codes are removed from the browser URL after reading. This
page is excluded from the sitemap, marked noindex, and served with no-store and
no-referrer headers. Password reset starts in the Android app and uses Firebase’s built-in email link and hosted reset page. No custom reset backend or website page is needed.

Deployment configuration:

- Set the existing `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_APP_ID` to this
  project's public web app configuration. Do not put service account keys here.
- Deploy the website before changing email templates.
- Firebase Authentication → Settings → Authorized domains must include
  `focusforgeorg.vercel.app`.
- Keep Firebase's default action handler. The official admin configuration's
  `notification.sendEmail.callbackUri` is shared by email templates, so pointing
  it at a verification-only page would break other Firebase account actions.
  After the site is deployed, set the Android verification continue URL to
  `https://focusforgeorg.vercel.app/verify-email?flow=complete`, with
  `handleCodeInApp: false`. Continue URL and action handler are distinct.
- With the default Firebase action handler still configured, Firebase confirms
  the address first and can continue to the branded page, which directs users
  back to the app. The custom page is not live until the source is deployed.

On October 21, 2026, the project configuration API confirmed the website domain
is authorized. Verification sender name was set to FocusForge and read back;
the subject, body, callback URL, and other templates were kept. Changing the
verification subject through this API returned `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`.
The Vercel CLI is logged out and the live verification route returns 404, so
source deployment and the app's website continue URL remain pending.

Local checks never send mail or consume production action codes. Build with
fixture-only Firebase public values, serve the build on port 4178, then run
`node scripts/verify-email-check.mjs`. All Firebase requests are intercepted.
Use real Vercel environment values for a production deployment, rebuilding the
website through Vercel rather than uploading the fixture build.
