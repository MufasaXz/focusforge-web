import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import './deleteAccount.css';
import { accountErrorMessage } from './accountErrors';

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
  }).catch(error => { if (active) setError(accountErrorMessage(error)); });
  return () => { active = false; };
 }, []);
 useEffect(() => {
  if (!deleting) return;
  const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
 }, [deleting]);
 useEffect(() => { if (user || done) heading.current?.focus(); }, [user, done]);
 async function run(action: () => Promise<void>, context?: 'export') {
  if (locked.current) return;
  locked.current = true; setBusy(true); setError(''); setStatus('');
  try { await action(); } catch (error) { setError(context === 'export' ? 'Your cloud export could not finish. Sign in again or retry when online. No download was created.' : accountErrorMessage(error)); }
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
 async function exportData() {
  if (!user) return;
  await run(async () => {
   setStatus('Collecting your cloud data…');
   const {exportCloudData} = await import('./accountData');
   const data = await exportCloudData(user);
   const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
   const link = document.createElement('a');
   link.href = url;
   link.download = `focusforge-cloud-export-${new Date().toISOString().slice(0, 10)}.json`;
   document.body.appendChild(link); link.click(); link.remove();
   window.setTimeout(() => URL.revokeObjectURL(url), 1000);
   setStatus('Your cloud JSON download is ready. Use Export My Data in the Android app to include phone-local records.');
  }, 'export');
 }
 return <section className="account-card" aria-labelledby="account-title" aria-busy={busy}>
  <p className="account-step">{done ? 'All done' : user ? 'Step 2 of 2: confirm your choice' : 'Step 1 of 2: sign in to your FocusForge account'}</p>
  <h2 id="account-title" tabIndex={-1} ref={heading}>{done ? 'Your account has been deleted.' : user ? 'Ready to say goodbye?' : 'Sign in to delete your account.'}</h2>
  {done ? <><p>Your Firebase sign-in account and associated cloud records have been removed. You can close this page.</p><p className="small">This website cannot erase data stored on your phone. Clear FocusForge’s app storage or uninstall it to remove remaining local history. A minimal security record prevents old sessions from recreating deleted data.</p></> : user ? <>
   <p className="account-identity">Signed in as <strong>{user.email || 'your linked account'}</strong></p>
   <div className="account-export"><button className="button" type="button" onClick={exportData} disabled={busy}>Export My Data (JSON)</button><p className="small">Download your cloud records before deleting. Your phone’s local study history is available through the app’s export.</p></div>
   <div className="account-warning"><strong>Deletion is permanent.</strong><p>Your login, private profile/progress and achievement backups, Pip answer reports, historical private study records, group memberships and leaderboard entries will be removed. Current private backups contain your profile and level/progress totals; detailed focus sessions and plans stay on your phone. Published leaderboard photos are removed with their entries. If you own a group, ownership transfers to another member; a group with no remaining members closes.</p></div>
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
  {status && <output className="account-status">{status}</output>}
  {error && <p className="account-error" role="alert">{error}</p>}
  {!ready && <p className="small">Enable JavaScript to sign in and delete your account here. You can also use Delete account in the Android app or contact support below.</p>}
 </section>;
}
