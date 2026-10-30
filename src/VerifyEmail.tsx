import { useEffect, useRef, useState } from 'react';
import { pageLink } from './paths';
import './deleteAccount.css';

function messageFor(error: unknown) {
 const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
 if (['auth/expired-action-code', 'auth/invalid-action-code', 'auth/user-disabled', 'auth/user-not-found'].includes(code)) return 'This verification link has expired or has already been used. Return to FocusForge and check your email status, or send a new verification email.';
 if (code.includes('network')) return 'We could not connect. Check your internet connection, then open the link from your email again.';
 return 'We could not verify this email. Return to FocusForge and request a new verification email, or contact support.';
}

export default function VerifyEmail() {
 const [email, setEmail] = useState('');
 const [checking, setChecking] = useState(true);
 const [busy, setBusy] = useState(false);
 const [done, setDone] = useState(false);
 const [error, setError] = useState('');
 const code = useRef<string | null>(null);
 const locked = useRef(false);
 const heading = useRef<HTMLHeadingElement>(null);
 useEffect(() => {
  let active = true;
  if (code.current === null) {
   const params = new URLSearchParams(window.location.search);
   code.current = params.get('mode') === 'verifyEmail' ? params.get('oobCode') || '' : '';
   // Keep the one-time action code out of subsequent history entries and links.
   window.history.replaceState(null, '', window.location.pathname);
  }
  if (!code.current) { setChecking(false); return; }
  Promise.all([import('./firebaseClient'), import('firebase/auth')]).then(async ([{ getAccountClient }, { checkActionCode }]) => {
   const action = await checkActionCode(getAccountClient().auth, code.current!);
   if (action.operation !== 'VERIFY_EMAIL' || !action.data.email) throw new Error('Invalid email verification action');
   if (active) setEmail(action.data.email);
  }).catch(error => { if (active) setError(messageFor(error)); }).finally(() => { if (active) setChecking(false); });
  return () => { active = false; };
 }, []);
 useEffect(() => { if (done) heading.current?.focus(); }, [done]);
 async function verify() {
  if (locked.current || !code.current || !email) return;
  locked.current = true; setBusy(true); setError('');
  try {
   const [{ getAccountClient }, { applyActionCode }] = await Promise.all([import('./firebaseClient'), import('firebase/auth')]);
   await applyActionCode(getAccountClient().auth, code.current!);
   code.current = ''; setDone(true);
  } catch (error) { setError(messageFor(error)); }
  finally { locked.current = false; setBusy(false); }
 }
 return <main id="main" className="legal section">
  <a className="text-link" href={pageLink('/')}>← Back to FocusForge</a>
  <h1>One step closer<br/>to your next session.</h1>
  <p className="legal-intro">Confirm your email address for your FocusForge account.</p>
  <div className="legal-body"><section className="account-card" aria-busy={checking || busy}>
   <h2 tabIndex={-1} ref={heading}>{done ? 'Your email is verified.' : checking ? 'Checking your verification link…' : email ? 'Confirm your email address.' : 'Continue in FocusForge.'}</h2>
   {checking && <p role="status">Checking the link securely. This will only take a moment.</p>}
   {done ? <p>Return to the FocusForge app and tap <strong>I’ve verified my email</strong> to continue. Your study setup is kept.</p> : email ? <>
    <p>Verify <strong>{email}</strong> for your FocusForge account.</p>
    <div className="account-actions"><button type="button" className="button" onClick={verify} disabled={busy}>{busy ? 'Verifying…' : 'Verify email address'}</button></div>
   </> : !checking && !error ? <p>Open the verification link from your email to confirm your address. If you have already followed it, return to the app and tap <strong>I’ve verified my email</strong>. You can send a new verification email from the app if needed.</p> : null}
   {error && <p className="account-error" role="alert">{error}</p>}
   <noscript><p>Enable JavaScript to confirm your email address here, then open this link again.</p></noscript>
   <p className="small">To reset your password, open the email sign-in form in FocusForge and choose Forgot password. The email link opens Firebase’s secure reset page.</p>
  </section></div>
 </main>;
}
