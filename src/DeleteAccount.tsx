import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import './deleteAccount.css';

function messageFor(error: unknown) {
 const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
 if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code)) return 'We could not sign in. Check your email and password, or use Google if that is how you joined FocusForge.';
 if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Google sign-in was cancelled. Your account has not been deleted.';
 if (code === 'auth/popup-blocked') return 'Your browser blocked Google sign-in. Allow pop-ups for this website and try again.';
 if (code === 'auth/unauthorized-domain' || code === 'auth/operation-not-allowed') return 'This sign-in method is unavailable. Please contact FocusForge support.';
 if (code === 'auth/requires-recent-login' || code === 'auth/user-token-expired' || code === 'auth/invalid-user-token') return 'Please sign out here, sign in again, then retry deletion. Some cloud records may already have been removed.';
 if (code.includes('permission-denied') || code.includes('failed-precondition')) return 'Cloud cleanup could not finish. Your login has not been deleted. Please retry or contact support if this continues.';
 if (code.includes('too-many-requests') || code.includes('resource-exhausted')) return 'Too many requests. Wait a little before trying again. No deletion success has been confirmed.';
 if (code.includes('network') || code.includes('unavailable')) return 'The connection was interrupted. Keep this page open and retry when you are online. Your login is kept until cloud cleanup finishes.';
 if (error instanceof Error && !code) return error.message;
 return 'We could not complete this action. Please retry or contact support. Deletion has not been confirmed.';
}

export default function DeleteAccount() {
 const [ready, setReady] = useState(false);
 const [user, setUser] = useState<User | null>(null);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [busy, setBusy] = useState(false);
 const [deleting, setDeleting] = useState(false);
 const [confirmed, setConfirmed] = useState(false);
 const [error, setError] = useState('');
 const [status, setStatus] = useState('');
 const [done, setDone] = useState(false);
 const locked = useRef(false);
 const heading = useRef<HTMLHeadingElement>(null);
 useEffect(() => {
  let active = true;
  import('./firebaseClient').then(({ getAccountClient }) => {
   getAccountClient(); if (active) setReady(true);
  }).catch(error => { if (active) setError(messageFor(error)); });
  return () => { active = false; };
 }, []);
 useEffect(() => {
  if (!deleting) return;
  const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
 }, [deleting]);
 useEffect(() => { if (user || done) heading.current?.focus(); }, [user, done]);
 async function run(action: () => Promise<void>) {
  if (locked.current) return;
  locked.current = true; setBusy(true); setError(''); setStatus('');
  try { await action(); } catch (error) { setError(messageFor(error)); }
  finally { locked.current = false; setBusy(false); setPassword(''); }
 }
 async function signIn(event?: FormEvent) {
  event?.preventDefault();
  await run(async () => {
   const { getAccountClient } = await import('./firebaseClient');
   const { signInWithEmailAndPassword } = await import('firebase/auth');
   const result = await signInWithEmailAndPassword(getAccountClient().auth, email.trim(), password);
   setUser(result.user); setConfirmed(false);
  });
 }
 async function googleSignIn() {
  await run(async () => {
   const { getAccountClient } = await import('./firebaseClient');
   const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
   const provider = new GoogleAuthProvider();
   provider.setCustomParameters({ prompt: 'select_account' });
   const result = await signInWithPopup(getAccountClient().auth, provider);
   setUser(result.user); setConfirmed(false);
  });
 }
 async function signOut() {
  await run(async () => {
   const { getAccountClient } = await import('./firebaseClient');
   const { signOut } = await import('firebase/auth');
   await signOut(getAccountClient().auth); setUser(null); setConfirmed(false);
  });
 }
 async function removeAccount() {
  if (!user || !confirmed) return;
  await run(async () => {
   setDeleting(true);
   try {
    const { getAccountClient } = await import('./firebaseClient');
    const { deleteAccountAndData } = await import('./accountCleanup');
    await deleteAccountAndData(user, getAccountClient().db, setStatus);
    setUser(null); setDone(true); setStatus('');
   } finally { setDeleting(false); }
  });
 }
 return <section className="account-card" aria-labelledby="account-title" aria-busy={busy}>
  <span className="eyebrow">{done ? 'ALL DONE' : user ? '02 / CONFIRM YOUR CHOICE' : '01 / YOUR FOCUSFORGE ACCOUNT'}</span>
  <h2 id="account-title" tabIndex={-1} ref={heading}>{done ? 'Your account has been deleted.' : user ? 'Ready to say goodbye?' : 'Sign in to delete your account.'}</h2>
  {done ? <><p>Your Firebase sign-in account and associated cloud records have been removed. You can close this page.</p><p className="small">This website cannot erase data stored on your phone. Clear FocusForge’s app storage or uninstall it to remove remaining local history. A minimal security record prevents old sessions from recreating deleted data.</p></> : user ? <>
   <p className="account-identity">Signed in as <strong>{user.email || 'your linked account'}</strong></p>
   <div className="account-warning"><strong>Deletion is permanent.</strong><p>Your login, private achievement backup, group memberships, shared progress and leaderboard entries will be removed. If you own a group, ownership transfers to another member; a group with no remaining members closes.</p></div>
   <label className="account-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy}/><span>I understand that deleting my account and cloud data cannot be undone.</span></label>
   <div className="account-actions"><button className="button account-danger" type="button" onClick={removeAccount} disabled={!confirmed || busy}>{deleting ? 'Deleting your account…' : 'Permanently delete my account'}</button><button className="account-secondary" type="button" onClick={signOut} disabled={busy}>Sign out</button></div>
   <p className="small">Keep this page open until completion. If interrupted, sign in again and retry. Signing out alone does not delete anything.</p>
  </> : <>
   <p>Use the same email and password or Google account you use in the app. Signing in does not delete anything.</p>
   <form className="account-form" onSubmit={signIn}>
    <label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy}/>
    <label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy}/>
    <button className="button" type="submit" disabled={!ready || busy}>{busy ? 'Please wait…' : 'Sign in with email'}</button>
   </form>
   <div className="account-divider"><span>or</span></div>
   <button className="account-google" type="button" disabled={!ready || busy} onClick={googleSignIn}><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.2 3-7.3ZM12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22ZM6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6ZM12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>Continue with Google</button>
   <p className="small">Your website sign-in stays in this tab’s memory. Closing or reloading the page signs you out here. For an anonymous account, use Delete account in the app or contact support.</p>
  </>}
  {status && <p className="account-status" role="status">{status}</p>}
  {error && <p className="account-error" role="alert">{error}</p>}
  <noscript><p>Enable JavaScript to sign in and delete your account here. You can also use Delete account in the Android app or contact support below.</p></noscript>
 </section>;
}
