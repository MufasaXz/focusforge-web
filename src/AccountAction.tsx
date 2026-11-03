import { useEffect } from 'react';
import ResetPassword from './ResetPassword';
import VerifyEmail from './VerifyEmail';
import { AuthCard } from './AuthCard';
import { useHydrated } from './useHydrated';

/**
 * The page every Firebase account email points at. Firebase uses one action
 * URL for all of its templates, so this page has to answer each kind of link:
 * password resets and email verification are handled here, and anything else
 * (email change recovery, second-factor reverts) goes on to Firebase's own
 * hosted handler with the query intact, so no account action breaks.
 */
const FIREBASE_HANDLER = 'https://focusforge-1edf7.firebaseapp.com/__/auth/action';
const HANDLED_HERE = new Set(['resetPassword', 'verifyEmail']);

type Arrival = { mode: string; code: string; search: string };

// Read once when the page loads, before any child scrubs the one-time code
// from the address bar. The prerender has no address, so it gets null.
const arrival: Arrival | null = typeof window === 'undefined' ? null : (() => {
  const params = new URLSearchParams(window.location.search);
  return { mode: params.get('mode') || '', code: params.get('oobCode') || '', search: window.location.search };
})();

export default function AccountAction() {
  // The prerendered page and the first browser render must match, so the
  // link is only acted on once React is running.
  const link = useHydrated() ? arrival : null;
  const forward = Boolean(link?.code && !HANDLED_HERE.has(link.mode));
  useEffect(() => {
    if (forward && link) window.location.replace(FIREBASE_HANDLER + link.search);
  }, [forward, link]);

  if (link?.mode === 'resetPassword') return <ResetPassword code={link.code}/>;
  if (link?.mode === 'verifyEmail') return <VerifyEmail/>;
  if (!link || forward) {
    return <AuthCard>
      <h1 id="auth-title">Opening your link…</h1>
      <p className="auth-lead">This takes a moment.</p>
      <noscript><p className="auth-error">Turn on JavaScript to use this link, then open it again from your email.</p></noscript>
    </AuthCard>;
  }
  return <AuthCard>
    <h1 id="auth-title">Open the link from your email</h1>
    <p className="auth-lead">This page handles the buttons in FocusForge account emails, such as Reset password. It needs the full link from that email.</p>
    <p className="auth-lead">To get a new reset email, open FocusForge, tap <strong>Sign in with email</strong>, then <strong>Forgot password?</strong></p>
  </AuthCard>;
}
