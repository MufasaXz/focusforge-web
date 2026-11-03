import type { ReactNode } from 'react';
import { asset, pageLink } from './paths';
import { SUPPORT_EMAIL } from './downloadLinks';
import './accountAction.css';

/** The single centred card account-email pages are built on. */
export function AuthCard({ children, busy = false, mark = true }: { children: ReactNode; busy?: boolean; mark?: boolean }) {
  return <main id="main" className="auth-action">
    <section className="auth-card" aria-labelledby="auth-title" aria-busy={busy}>
      {mark && <img className="auth-mark" src={asset('images/focusforge-icon.png')} alt="" width="48" height="48"/>}
      {children}
    </section>
    <p className="auth-help">
      Need a hand? <a href={`mailto:${SUPPORT_EMAIL}?subject=FocusForge%20account%20help`}>Email support</a> or go back to <a href={pageLink('/')}>FocusForge</a>.
    </p>
  </main>;
}
