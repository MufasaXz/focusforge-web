import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthCard } from './AuthCard';

/** The same rule the app sets when an account is created. */
const MIN_LENGTH = 8;

type Phase = 'checking' | 'ready' | 'saving' | 'done' | 'failed';

const EXPIRED = 'This reset link has expired or has already been used. Each link works once, for a limited time.';
const MISSING = 'This reset link is incomplete. Open the Reset password button in your email again.';

function errorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}

function isDeadLink(code: string) {
  return ['auth/expired-action-code', 'auth/invalid-action-code', 'auth/user-disabled', 'auth/user-not-found'].includes(code);
}

function messageFor(error: unknown) {
  const code = errorCode(error);
  if (isDeadLink(code)) return EXPIRED;
  if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') return 'That password is too easy to guess. Try a longer one that mixes letters, numbers and symbols.';
  if (code === 'auth/too-many-requests') return 'Too many attempts in a short time. Wait a few minutes, then try again.';
  if (code.includes('network')) return 'We could not connect. Check your internet connection, then try again.';
  return 'We could not change your password. Try again, or request a new reset email from the app.';
}

async function loadAuth() {
  const [{ getAccountClient }, firebaseAuth] = await Promise.all([import('./firebaseClient'), import('firebase/auth')]);
  return { auth: getAccountClient().auth, ...firebaseAuth };
}

const Tick = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/** One password requirement, ticked green once it holds. */
function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return <li data-met={met}>
    <span className="auth-rule-mark"><Tick/></span>
    <span>{children}<span className="sr-only">{met ? ', done' : ', not yet'}</span></span>
  </li>;
}

/**
 * Choosing a new password from the link in a reset email. Loading the page
 * only checks the code, which does not use it up; the code is spent once, when
 * the new password is saved. The code leaves the address bar as soon as it is
 * read, so it is not kept in history or sent onward as a referrer.
 */
export default function ResetPassword({ code }: { code: string }) {
  const [phase, setPhase] = useState<Phase>(code ? 'checking' : 'failed');
  const [problem, setProblem] = useState(code ? '' : MISSING);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [reveal, setReveal] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
    if (!code) return;
    let active = true;
    loadAuth()
      .then(({ auth, verifyPasswordResetCode }) => verifyPasswordResetCode(auth, code))
      .then(address => { if (active) { setEmail(address); setPhase('ready'); } })
      .catch(error => { if (active) { setProblem(messageFor(error)); setPhase('failed'); } });
    return () => { active = false; };
  }, [code]);

  useEffect(() => { if (phase === 'done') heading.current?.focus(); }, [phase]);

  const longEnough = password.length >= MIN_LENGTH;
  const matches = confirmation.length > 0 && confirmation === password;
  const saving = phase === 'saving';

  async function save(event: FormEvent) {
    event.preventDefault();
    if (phase !== 'ready' || !longEnough || !matches) return;
    setPhase('saving');
    setProblem('');
    try {
      const { auth, confirmPasswordReset } = await loadAuth();
      await confirmPasswordReset(auth, code, password);
      setPassword('');
      setConfirmation('');
      setPhase('done');
    } catch (error) {
      setProblem(messageFor(error));
      setPhase(isDeadLink(errorCode(error)) ? 'failed' : 'ready');
    }
  }

  if (phase === 'checking') return <AuthCard busy>
    <h1 id="auth-title">Checking your reset link…</h1>
    <p className="auth-lead">This takes a moment.</p>
  </AuthCard>;

  if (phase === 'done') return <AuthCard mark={false}>
    <div className="auth-tick"><Tick/></div>
    <h1 id="auth-title" tabIndex={-1} ref={heading}>Password updated</h1>
    <p className="auth-lead">Open FocusForge and sign in as <strong>{email}</strong> with your new password. You can close this page.</p>
  </AuthCard>;

  if (phase === 'failed') return <AuthCard>
    <h1 id="auth-title">This link can’t be used</h1>
    <p className="auth-error" role="alert">{problem}</p>
    <p className="auth-lead auth-steps-intro">To get a fresh link:</p>
    <ol className="auth-steps">
      <li>Open FocusForge on your phone.</li>
      <li>Tap <strong>Sign in with email</strong>, then <strong>Forgot password?</strong></li>
      <li>Use the Reset password button in the new email.</li>
    </ol>
  </AuthCard>;

  return <AuthCard busy={saving}>
    <h1 id="auth-title">Choose a new password</h1>
    <p className="auth-lead">For <strong>{email}</strong></p>
    <form className="auth-form" onSubmit={save} noValidate>
      <input className="sr-only" type="email" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true"/>
      <label htmlFor="new-password">New password</label>
      <input id="new-password" name="new-password" type={reveal ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={saving} aria-describedby="password-rules"/>
      <label htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" name="confirm-password" type={reveal ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={saving} aria-describedby="password-rules"/>
      <button type="button" className="auth-reveal" aria-pressed={reveal} onClick={() => setReveal(!reveal)}>{reveal ? 'Hide passwords' : 'Show passwords'}</button>
      <ul className="auth-rules" id="password-rules">
        <Rule met={longEnough}>At least {MIN_LENGTH} characters</Rule>
        <Rule met={matches}>Both passwords match</Rule>
      </ul>
      {problem && <p className="auth-error" role="alert">{problem}</p>}
      <button className="button button-ink" type="submit" disabled={saving || !longEnough || !matches}>{saving ? 'Saving…' : 'Save new password'}</button>
    </form>
    <p className="auth-note">Didn’t ask to reset your password? Close this page. Your current password keeps working.</p>
  </AuthCard>;
}
