import { useEffect, useRef, useState } from 'react';
import DeleteAccount from './DeleteAccount';
import VerifyEmail from './VerifyEmail';
import GetOnPlay from './GetOnPlay';
import './getOnPlay.css';
import { asset, pageLink } from './paths';

export const DOWNLOAD = 'https://github.com/MufasaXz/focusforge/releases/latest';
export const EMAIL = 'focusforgehelp@gmail.com';
// Downloads across every channel, as stated by the developer (2 Nov 2026).
// GitHub releases alone counted 528 that day.
export const DOWNLOADS = '10K+';
export const ROUTES = ['/', '/privacy', '/terms', '/support', '/delete-account', '/get-on-play', '/verify-email'];
const source = 'https://github.com/MufasaXz/focusforge';
export const pageTitles: Record<string, string> = { '/': 'FocusForge — Make room for what matters.', '/privacy': 'Privacy policy — FocusForge', '/terms': 'Terms of use — FocusForge', '/support': 'Support — FocusForge', '/delete-account': 'Delete your account — FocusForge', '/get-on-play': 'Join the Play Store test — FocusForge', '/verify-email': 'Verify your email — FocusForge' };

function Mark() { return <img className="mark" src={asset('images/focusforge-icon.png')} alt="" width="32" height="32" aria-hidden="true"/>; }
function Download({ tone = 'ink', children = 'Download for Android' }: { tone?: 'ink' | 'light' | 'outline'; children?: React.ReactNode }) {
  return <a className={`button button-${tone}`} href={DOWNLOAD}>{children}</a>;
}

/**
 * A OnePlus 15, front on: flat display, a hairline bezel, the centred
 * punch-hole camera, a Sand Storm frame, the Plus Key on the left and the
 * volume rocker above power on the right. Proportions are the handset's own
 * 76.7 × 161.4 mm; every inner measure is in container-width units, so the
 * phone keeps its shape at any size it is drawn. The screens are real
 * screenshots, status bar and gesture bar included, so nothing is drawn over
 * them but the camera.
 */
function Phone({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return <figure className={`op15${className ? ' ' + className : ''}`}><div className="op15-body">
    <span className="op15-key op15-plus" aria-hidden="true"/>
    <span className="op15-key op15-volume" aria-hidden="true"/>
    <span className="op15-key op15-power" aria-hidden="true"/>
    <div className="op15-bezel">
      <div className="op15-screen">
        <img src={asset(src)} alt={alt} width="720" height="1601" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async"/>
        <span className="op15-camera" aria-hidden="true"/>
      </div>
    </div>
  </div></figure>;
}

function Header() {
  const [open, setOpen] = useState(false);
  // Without JavaScript the links stay visible and the toggle stays hidden;
  // the collapsible menu only appears once it can actually open.
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => { setEnhanced(true); }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const shut = () => setOpen(false);
  return <header className={`site-header${enhanced ? ' enhanced' : ''}`}>
    <a href={pageLink('/')} className="wordmark" aria-label="FocusForge home" translate="no"><Mark/>FocusForge</a>
    <button className="menu-toggle" aria-expanded={open} aria-controls="navigation" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
    <nav id="navigation" className={open ? 'open' : ''} aria-label="Main navigation">
      <a href={pageLink('/#features')} onClick={shut}>Features</a>
      <a href={pageLink('/#privacy')} onClick={shut}>Your data</a>
      <a href={pageLink('/#faq')} onClick={shut}>Questions</a>
      <a href={pageLink('/support')} onClick={shut}>Support</a>
      <Download tone="outline">Download</Download>
    </nav>
  </header>;
}

function Footer() {
  return <footer className="footer">
    <div className="footer-brand"><a className="wordmark" href={pageLink('/')} translate="no"><Mark/>FocusForge</a><p>A quieter phone for the hours that matter. Free and open source, made for Android.</p></div>
    <nav aria-label="Legal and support">
      <a href={pageLink('/privacy')}>Privacy policy</a>
      <a href={pageLink('/terms')}>Terms</a>
      <a href={pageLink('/support')}>Support</a>
      <a href={source}>Source code</a>
    </nav>
    <p className="footer-note">© {new Date().getFullYear()} FocusForge, by MufasaXz.</p>
    <p className="footer-wordmark" aria-hidden="true" translate="no">FocusForge</p>
  </footer>;
}

const faq = [
  ['Is FocusForge really free?', 'Yes. FocusForge is free and open source, with no ads and no subscriptions. The Android app is available from our GitHub releases.'],
  ['Do I need an account?', 'The focus timer works without an account. Choose Skip for now to start locally without waiting for Firebase sign-in. Linked accounts use Firebase for private study and badge backups, groups and the optional leaderboard. Using the app without an email account is not a promise of no network activity.'],
  ['What permissions does shielding need?', 'Normal app shielding uses Usage Access to detect the app in use and Draw over other apps to display a pause screen. FocusForge shows a disclosure and asks before it reads your list of installed apps, and that list stays on your phone. Accessibility is requested separately when you enable supported YouTube Shorts or feed filtering. App boundaries run with a foreground notification and a Stop action. All access is optional and can be revoked in Android settings.'],
  ['Does it work on iPhone?', 'FocusForge is currently Android-first, for Android 7.0 and above. We do not currently offer an iOS download.'],
  ['Can I delete my account and data?', 'Yes. Sign in on our Delete account page using the same email/password or Google account as the app, then confirm deletion. Private study and badge backups, saved profile photos, shared progress and leaderboard entries are removed before your login. You can also delete your account in the app. The website cannot erase phone-local history; clear app storage separately. Signing out keeps your data.']
];

/** Two lines, one voice: a heavy upright line and a light italic answer. */
function Heading({ level = 2, strong, soft, id }: { level?: 1 | 2; strong: string; soft: string; id?: string }) {
  const Tag = level === 1 ? 'h1' : 'h2';
  return <Tag className={level === 1 ? 'display' : 'heading'} id={id}><span className="strong">{strong}</span> <span className="soft">{soft}</span></Tag>;
}

const tools = [
  { key: 'shield', tone: 'lavender', title: 'Close the feed', body: 'Pick the apps that pull you away. Block them, give them a daily budget, or close them only while you focus. Supported YouTube Shorts and feeds can be filtered while lectures stay open.', image: 'images/shot-shield-dark.webp', alt: 'FocusForge Shield tab in dark mode listing installed apps with a switch for each', lightImage: 'images/shot-shield-light.webp', lightAlt: 'FocusForge Shield tab in light mode listing installed apps with a switch for each' },
  { key: 'focus', tone: 'white', title: 'One timer, full attention', body: 'Start a Pomodoro preset or a plan of your own, tag the subject you are studying, and let rain or a café hum fill the quiet.', image: 'images/shot-focus-dark.webp', alt: 'FocusForge focus timer in dark mode counting down a 25-minute block', lightImage: 'images/shot-focus-light.webp', lightAlt: 'FocusForge focus timer in light mode with 44 minutes left' },
  { key: 'progress', tone: 'sage', title: 'See it add up', body: 'Daily goals, weekly totals by subject, home-screen widgets and eighteen achievements make steady work easy to notice.', image: 'images/shot-home-dark.webp', alt: 'FocusForge home screen in dark mode with today’s focus, goal and subject breakdown', lightImage: 'images/shot-home-light.webp', lightAlt: 'FocusForge home screen in light mode with 45 minutes of focus against the daily goal' }
];

/**
 * A question whose answer types itself out when opened. The full answer is
 * always in the page for screen readers, and the untyped remainder keeps its
 * space so nothing below moves. Without JavaScript, or for a reader who prefers
 * less motion, the answer is simply there.
 */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [shown, setShown] = useState(answer.length);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const toggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    cancelAnimationFrame(frame.current);
    if (!event.currentTarget.open || matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(answer.length); return; }
    // Quick enough to read along with: about a second for the longest answer.
    const duration = Math.min(1100, 300 + answer.length * 2.4);
    const start = performance.now();
    setShown(0);
    const step = (now: number) => {
      const next = Math.min(answer.length, Math.ceil(answer.length * (now - start) / duration));
      setShown(next);
      if (next < answer.length) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };
  // The browser opens a question before it fires `toggle`, so blanking the
  // answer there would flash the whole text for a frame. The click comes
  // first, keyboard included, so the answer is emptied before it is shown.
  const opening = (event: React.MouseEvent<HTMLElement>) => {
    const details = event.currentTarget.parentElement as HTMLDetailsElement;
    if (!details.open && !matchMedia('(prefers-reduced-motion: reduce)').matches) setShown(0);
  };
  const typing = shown < answer.length;
  return <details onToggle={toggle}>
    <summary onClick={opening}>{question}</summary>
    <p>
      <span className="sr-only">{answer}</span>
      <span className="typed" aria-hidden="true">{answer.slice(0, shown)}{typing && <span className="caret"/>}<span className="untyped">{answer.slice(shown)}</span></span>
      {question.startsWith('Can I delete') && <span className={typing ? 'after-typing' : undefined}> <a href={pageLink('/delete-account')}>Delete your account</a>.</span>}
    </p>
  </details>;
}

/** The site's few hard numbers, each true of the current release. */
const stats: [string, string][] = [
  ['Downloads so far', DOWNLOADS],
  ['Languages built in', '25'],
  ['Ads and trackers', '0'],
  ['Oldest Android it runs on', '7.0']
];

/**
 * A number drawn as odometer reels. Each digit is a strip of two full turns,
 * 0–9 twice, and lands on its second turn, so every reel visibly spins —
 * a 0 included — when the section first comes into view. Letters and
 * punctuation stay still. Screen readers get the plain value.
 */
function Odometer({ value }: { value: string }) {
  let reel = 0;
  return <>
    <span className="sr-only">{value}</span>
    <span className="odometer" aria-hidden="true">{[...value].map((char, i) => /\d/.test(char)
      ? <span key={i} className="reel" style={{ '--to': Number(char) + 10, '--reel': reel++ } as React.CSSProperties}>
          <span className="strip">{'01234567890123456789'.split('').map((digit, n) => <span key={n}>{digit}</span>)}</span>
        </span>
      : <span key={i} className="glyph">{char}</span>)}</span>
  </>;
}

type Tool = (typeof tools)[number];

/**
 * A tool card with two faces: the pastel card holds the dark-theme screen, and
 * a turn shows the same screen in light on a black card. One real button,
 * stretched over the whole card, does the turning, so a click anywhere works
 * and the keyboard and screen readers get a single labelled, pressed control.
 * The face turned away is inert, so its copy is never read twice.
 */
function ToolCard({ tool }: { tool: Tool }) {
  const [light, setLight] = useState(false);
  const face = (side: 'front' | 'back') => {
    const shown = side === 'front' ? !light : light;
    return <div className={`tool-face tool-${side === 'front' ? tool.tone : 'ink'}`} aria-hidden={!shown} inert={!shown}>
      <div className="tool-copy"><h3>{tool.title}</h3><p>{tool.body}</p></div>
      <Phone src={side === 'front' ? tool.image : tool.lightImage} alt={side === 'front' ? tool.alt : tool.lightAlt}/>
    </div>;
  };
  return <article className={`tool${light ? ' is-light' : ''}`}>
    <div className="tool-turn">{face('front')}{face('back')}</div>
    <button type="button" className="tool-flip" aria-pressed={light} aria-label={`${tool.title}: show the ${light ? 'dark' : 'light'} theme`} onClick={() => setLight(value => !value)}>
      <span aria-hidden="true">{light ? 'See it in dark' : 'See it in light'}</span>
    </button>
  </article>;
}

/**
 * Plays a section's entrance once, when it first comes into view: the session
 * rules draw across in turn, and the number reels spin to their values. Before
 * this runs — no JavaScript, or a reader who prefers less motion — the section
 * is simply there, finished.
 */
function useRevealOnce<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.dataset.reveal = 'waiting';
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      el.dataset.reveal = 'played';
      observer.disconnect();
    }, { threshold: .35 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Home() {
  const session = useRevealOnce();
  const facts = useRevealOnce();
  return <>
    <section className="hero" aria-labelledby="hero-title">
      <Heading level={1} id="hero-title" strong="Make room" soft="for what matters."/>
      <Phone className="hero-phone" src="images/shot-focus-dark.webp" alt="FocusForge focus timer counting down a 25-minute block in dark mode" eager/>
      <div className="hero-panel">
        <p className="hero-lead">FocusForge is a free study companion for Android. A focus timer, a calm home for your goals, and a Shield that keeps distracting apps closed while you work.</p>
        <div className="hero-actions"><Download/><a className="text-link" href="#features">Take a closer look</a></div>
        <p className="hero-note">Free and open source, with no ads. Android 7.0 and up.</p>
      </div>
    </section>

    <section className="facts" ref={facts} aria-label="FocusForge in numbers">
      <dl>{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><Odometer value={value}/></dd></div>)}</dl>
    </section>

    <section className="tools" id="features" aria-labelledby="tools-title">
      <div className="section-intro"><Heading id="tools-title" strong="Three tools" soft="for a quieter phone."/><p>Everything you need to turn “I should study” into “I’m glad I did.”</p></div>
      <div className="tool-grid">
        {tools.map(tool => <ToolCard key={tool.key} tool={tool}/>)}
      </div>
      <p className="caption">Screenshots of FocusForge running on a real Android phone.</p>
    </section>

    <section className="session" ref={session} aria-labelledby="session-title">
      <Heading id="session-title" strong="One session" soft="from start to finish."/>
      <ol>
        <li><h3>Pick a plan</h3><p>Choose a Pomodoro preset or your own rhythm, and tag the subject you are about to study.</p></li>
        <li><h3>Shield takes over</h3><p>The apps you chose close for the length of the block. Lecture links on YouTube still open.</p></li>
        <li><h3>The minutes are kept</h3><p>When the block ends, the session lands on today’s goal, your week and your subject totals.</p></li>
      </ol>
    </section>

    <section className="trust" id="privacy" aria-labelledby="trust-title">
      <Heading id="trust-title" strong="Your phone" soft="keeps your data."/>
      <ul>
        <li><h3>Your app list stays here</h3><p>FocusForge asks before it reads which apps you have installed. That list and your screen time never leave your phone.</p></li>
        <li><h3>No ads, no trackers</h3><p>There is no advertising or analytics SDK in the app, and none on this website.</p></li>
        <li><h3>Leave whenever you like</h3><p>Delete your account and its cloud data from the app, or <a href={pageLink('/delete-account')}>from this website</a>.</p></li>
      </ul>
      <a className="button button-light" href={pageLink('/privacy')}>Read the privacy policy</a>
    </section>

    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="faq-head"><Heading id="faq-title" strong="Good questions" soft="before you begin."/><p>Something else on your mind? <a href={pageLink('/support')}>Ask us directly.</a></p></div>
      {/* Two independent lists rather than CSS columns, so opening an answer
          lengthens its own column and nothing jumps across. */}
      <div className="faq-columns">{[faq.slice(0, 3), faq.slice(3)].map((half, column) => <div className="faq-list" key={column}>{half.map(([q, a]) => <FaqItem key={q} question={q} answer={a}/>)}</div>)}</div>
    </section>

    <section className="closing" aria-labelledby="closing-title">
      <div className="closing-copy">
        <Heading id="closing-title" strong="Less scrolling." soft="More becoming."/>
        <p className="closing-lead">Your next good study session is one download away. No account needed to start.</p>
        <div className="closing-actions"><Download/><a className="text-link" href={source}>View the source</a></div>
        <p className="closing-note">Android 7.0 and up. Free and open source, with no ads.</p>
      </div>
      <Phone className="closing-phone" src="images/shot-focus-light.webp" alt="FocusForge focus timer in light mode with 44 minutes left"/>
    </section>
  </>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2>{title}</h2>{children}</section>; }
function EmailLink() { return <a className="button button-ink" href={"mailto:" + EMAIL + "?subject=FocusForge%20support"}>Email support</a>; }
function Legal({ path }: { path: string }) {
 const title = path === '/privacy' ? 'Privacy, without the fine-print feeling.' : path === '/terms' ? 'A few ground rules.' : path === '/support' ? 'A little help, whenever you need it.' : 'Your account. Your choice.';
 return <main id="main" className="legal"><a className="text-link back-link" href={pageLink("/")}>Back to FocusForge</a><p className="legal-kicker">{path === '/delete-account' ? 'Account and data deletion' : path === '/privacy' ? 'Privacy policy' : path === '/terms' ? 'Terms of use' : 'Support'}</p><h1 className="legal-title">{title}</h1><p className="legal-intro">{path === '/privacy' ? 'How the FocusForge Android app and this website handle information. Last updated: November 1, 2026.' : path === '/delete-account' ? 'Sign in securely and permanently delete your FocusForge account and cloud data, without reinstalling the app.' : path === '/terms' ? 'Terms of use for the FocusForge website and Android study companion. Last updated: October 16, 2026.' : 'Questions about installation, permissions, privacy, or your next study session? Start here.'}</p><div className="legal-body">{path === '/privacy' ? <>
 <Section title="Who we are"><p>FocusForge is an Android study companion maintained by MufasaXz, the developer identity associated with the public project. Contact the developer for privacy questions at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. This notice covers FocusForge and this website; third-party services have their own policies.</p></Section>
 <Section title="Information on your device"><p>Focus-session history, per-app usage history, subjects, goals and app settings are stored locally using SharedPreferences-backed storage. Linked accounts also back up the study records described below. Screen-time and app-usage history, Shield events and Accessibility screen contents stay on your device. We do not claim local storage is encrypted. Remove app storage through Android settings or uninstall to remove app-local records; device backups may be governed separately by your device settings.</p><p><strong>Clear local analytics</strong> removes local focus history and progress. It does not delete your linked account’s private cloud study backup, so those study records can return when you recover that account. Use Delete account to remove the associated cloud records.</p></Section>
 <Section title="Accounts and Firebase"><p>Choose <strong>Skip for now</strong> to begin with a local guest profile without waiting for Firebase sign-in. Linked email/password and Google accounts use Google Firebase Authentication when the backend is active. Authentication can process account identifiers, email, display name, authentication credentials and service-related technical information. Existing anonymous Firebase sessions may still contact Firebase; using the app without an email account is not a promise of no network activity. A display-name change may update Firebase Authentication.</p><p>Firebase Authentication and Cloud Firestore, provided by Google, process information to authenticate users, recover private study data and power the chosen sharing features below. See <a href="https://firebase.google.com/support/privacy">Firebase privacy information</a> for service practices, infrastructure and international processing.</p></Section>
 <Section title="Private backup and optional sharing"><ul><li><strong>Private study backup:</strong> linked accounts store their profile, including display name and any chosen profile-photo thumbnail, completed setup, subject catalog, custom plan library, goals, study totals and dated completed focus sessions in private Firestore records under the account ID. These records let the same account restore its study setup and history after signing in again or reinstalling. A retained login continues syncing in the background after an app update. Recovery on a new installation depends on a completed backup; uninstalling can remove changes that have not synced. Guest study remains local unless you link it to an account. Screen time, per-app usage history, Shield events and screen contents are excluded.</li><li><strong>Private achievement backup:</strong> linked accounts store earned badge identifiers and original earned dates in a separate private Firestore record under the account ID. This lets the same account recover its badges after signing in again or changing devices. Guest profiles keep badges locally until linked.</li><li><strong>Private study groups:</strong> group names, targets, owner/member identifiers, invitation information and timestamps. Membership records include display names, weekly completed study minutes, an active timer deadline, and join/update timestamps. These details support group membership and shared goals and are visible to authorized group participants.</li><li><strong>Optional public leaderboard:</strong> display name, any chosen profile-photo thumbnail, level, weekly focus minutes and an update timestamp are stored under your account identifier. Published entries are visible to other signed-in users, including after you sign out, while they qualify for that week’s top 100. Turn sharing off in the leaderboard’s <strong>Sharing options</strong> menu to withdraw your published weekly entries, or delete your account. Signing out or uninstalling does not turn sharing off.</li></ul><p>Private study and badge backups do not depend on public leaderboard consent. Only use sharing features if you are comfortable with the information disclosed to the relevant people. Parent control has been removed from the study-only release; it no longer uploads installed-app lists or study summaries for monitoring. Older cloud records become inaccessible when the owner publishes the updated rules and are removed by trusted retirement tooling, account cleanup or verified support requests.</p></Section>
 <Section title="Profile photos and name changes"><p>Choosing a photo is optional. The app opens your device’s image picker for an image you select; it does not upload your gallery. It creates a 128 × 128-pixel square JPEG thumbnail and removes embedded metadata, such as location tags, before saving it. The original full-size photo is not uploaded. Choosing a photo does not enable leaderboard sharing.</p><p>Guest profiles keep the thumbnail locally. For linked accounts, Google Cloud Firestore stores the thumbnail with the private profile backup. If you enable leaderboard sharing, the thumbnail is also included in your published weekly entry and visible to other signed-in users. Study-group membership records do not include this photo.</p><p>You can change your name, remove the photo or use an icon or initials from your profile in the app. Changes update the private backup and any current-week leaderboard entry when syncing succeeds. Older published weekly entries may retain an earlier name or photo. Turn sharing off to withdraw your published entries, or delete your account to remove the private backup and associated leaderboard records. Previously viewed or copied information cannot be recalled from other people’s devices.</p></Section>
 <Section title="Installed apps and app usage"><p>FocusForge reads the list of apps installed on your phone, and how long you used each one today, to let you choose apps to block or limit in Shield and to show your screen time on Home. It reads them only while you use those features, and only after you agree to the in-app disclosure shown on the Shield tab and before Usage Access is requested. Choosing <strong>Not now</strong>, pressing Back or leaving the disclosure is not consent, and nothing is read.</p><p>The app list and usage times stay on your device. FocusForge does not upload them, store them on a server or share them with anyone, including study groups, the leaderboard or your private account backup. Each app is read for its package name, label and whether it is a system app; versions and install dates are not read. Withdraw consent at any time in <strong>You → Account &amp; privacy → App list access</strong>; focus timers work without it.</p></Section>
 <Section title="Sensitive Android access"><ul><li><strong>Usage Access:</strong> detects which app is in the foreground for selected-app shielding and reads per-app screen time for budgets and usage views. These checks run locally; foreground-app history is not sent to Firebase. It can be revoked in Android’s special app access settings.</li><li><strong>Draw over other apps:</strong> displays the pause screen over an app you choose to limit. This permission does not detect which app is open, so normal-app shielding also needs Usage Access. It can be revoked in Android’s special app access settings.</li><li><strong>Accessibility:</strong> Accessibility is only used for supported YouTube Shorts and feed filtering. It checks YouTube screen identifiers and visibility to distinguish supported Shorts and feed screens from ordinary videos. These screen checks stay on the device and are not retained or uploaded. It does not read messages, passwords or text you type. YouTube updates can change these identifiers and interrupt filtering until FocusForge is updated. While a YouTube pause is visible, it checks application window package names to close that pause when you leave YouTube; it does not inspect other apps’ contents. Normal-app shielding does not require this service. This is not an accessibility tool for people with disabilities. Grant access only after reviewing the in-app disclosure and consent prompt; revoke it in Android Accessibility settings.</li><li><strong>Notifications:</strong> support timer reminders and the foreground notification while app boundaries are running. Stop shielding with the notification’s <strong>Stop</strong> action; resume it from FocusForge when you choose. Android controls where foreground-service notices appear when notification access is disabled.</li><li><strong>App visibility:</strong> launcher-app queries identify selectable apps on the device. The app does not request access to the entire installed-package catalog through QUERY_ALL_PACKAGES. Normal-app pause screens use an application overlay; supported YouTube filters use an Accessibility overlay.</li></ul><p>App boundaries start from the app after you enable the required access. Background checks pause while the screen is locked or asleep and stop if the required access is revoked. Device battery management or Android restrictions can still interrupt blocking. Permissions support the described features, not advertising. Website text does not replace the app’s prominent permission disclosure and explicit consent.</p></Section>
 <Section title="Advertising, analytics and the website"><p>The current app does not integrate an advertising or third-party analytics SDK. This website uses Firebase Authentication and Cloud Firestore on the account-deletion page so you can sign in and remove your account. Website authentication and cloud records are held in memory rather than persistent browser storage; reloading or closing the page ends that website sign-in. Google sign-in opens a Google/Firebase authentication window, where those providers may use their own cookies. We add no analytics or advertising trackers. Fonts and product images are self-hosted.</p><p>The website hosting providers, GitHub Pages and Vercel, may process IP addresses, request metadata, device/browser information and access/security logs to deliver and protect their hosted versions of the website. We do not control all provider retention settings and cannot promise zero logging. See <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub’s privacy statement</a> and <a href="https://vercel.com/legal/privacy-policy">Vercel’s privacy policy</a>. Following GitHub or other external links subjects you to that service’s practices.</p></Section>
 <Section title="Why information is used and who receives it"><p>Information is used to run timers and budgets, display progress, authenticate accounts, support chosen social features, answer support requests and protect the services. Recipients include Google/Firebase, the website host, people you choose to share with, and email providers when you contact us. Data may also be disclosed when legally required. FocusForge does not use your data to serve ads.</p></Section>
 <Section title="Retention and deletion"><p>Local records stay until removed through app/device controls. Cloud records are maintained for the features you use until removed through supported controls or a verified request, subject to technical and legal constraints. A fixed provider backup-expiry schedule has not been verified. Direct account deletion is confirmed on the deletion page when cloud cleanup and removal of your login both complete.</p><p>Sign out keeps your account, private backups and published leaderboard entries. Delete account is available in the app and on the <a href={pageLink("/delete-account")}>website</a>: sign in with your password or Google account, confirm permanent deletion, and keep the page open while your private study and badge backups, associated sharing records and then your login are removed. Rules, indexes and the legacy cleanup migration must be active. Failures preserve your login for retry, though some cloud records may already be removed. A minimal account-ID security record and request time remain to prevent old sessions recreating data, with no name, email or progress. Other devices’ local history is not remotely erased; clear local app storage when you no longer need it. Contact support if you cannot sign in or need help with a data request.</p><p>Support email and related correspondence may remain with email providers while a request is handled; limited records may need to be retained to meet legal obligations or resolve disputes. We will explain any applicable retention when responding, rather than promising every backup or record is immediately erased.</p></Section>
 <Section title="Security and your choices"><p>Use a secure device and protect your account. Access to cloud features depends on authentication and configured access rules; no system is perfectly secure. We make no end-to-end encryption claim. You can revoke optional permissions, leave groups, stop sharing and request access, correction or deletion of information by email. Rights may vary by location.</p></Section>
 <Section title="Age and cloud accounts"><p>FocusForge is a self-directed study tool. Parent monitoring and remote device management are not available. No region-specific child-consent program or verified age policy is represented here. If you are under the age at which you can independently consent in your location, involve a parent or guardian before using cloud accounts or sharing features. Contact us if you believe a child’s information needs to be removed.</p></Section>
 <Section title="Changes and questions"><p>Changes will appear on this page with an updated date. For privacy concerns, access requests or corrections, contact <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. We do not claim this notice alone guarantees Google Play acceptance or compliance in every jurisdiction.</p></Section>
 </> : path === '/terms' ? <>
 <Section title="Using FocusForge"><p>By using this website or app, you agree to use it lawfully and respectfully. FocusForge is a study and digital-wellbeing aid, not medical advice, a safety system, parental device management or a promise of academic outcomes. You decide which permissions and sharing features to enable.</p></Section>
 <Section title="Free, open-source software"><p>The current app is free, with no ads or subscriptions. App source-code use is governed by the license included in the <a href={source}>FocusForge repository</a>. These website terms do not limit rights granted by that license. Features and availability can change.</p></Section>
 <Section title="Your account and shared spaces"><p>Keep your credentials private. Do not impersonate others, abuse invite codes, interfere with services, publish harmful content or share information without permission. You are responsible for choosing appropriate group members. Group timer status is not verified online presence. Community participation requires accepting rules against harassment, threats, hate, sexual content, impersonation and private-information sharing. Use an appropriate display name and profile photo, and only upload an image you have permission to share. Profile photos can be visible to other signed-in users when leaderboard sharing is on. You can report a group or member through the group’s controls, hide group-member rows, or contact the developer privately about a leaderboard name or photo. There is no dedicated report or hide menu on leaderboard rows. There is no chat or general media feed; the image feature is an optional profile photo. The developer reviews reports and may remove prohibited content or restrict abusive accounts.</p></Section>
 <Section title="Limitations and external services"><p>Blocking depends on Android permissions, device settings and supported app interfaces; it is not unbreakable or uninstall-proof. Timers, progress and sharing can be interrupted by device or network conditions. GitHub downloads, Firebase and other linked services have their own terms. Install software only from a source you trust.</p></Section>
 <Section title="No guarantees"><p>To the extent allowed by applicable law, the website and software are provided “as is” without warranties of availability, accuracy or fitness for a particular purpose. Nothing here excludes non-waivable consumer rights or liability that cannot legally be limited. No specific governing law or jurisdiction is asserted by this page.</p></Section>
 <Section title="Privacy, deletion and contact"><p>Read the <a href={pageLink("/privacy")}>privacy policy</a> for data practices and <a href={pageLink("/delete-account")}>request account deletion</a> if you wish to leave. For questions about these terms contact developer MufasaXz at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p></Section>
 </> : path === '/support' ? <>
 <Section title="Talk to the developer"><p>Email is the right place for account questions, deletion requests and private information. Do not send passwords, recovery codes or sensitive screenshots.</p><EmailLink/><p className="small">Prefer to copy the address? <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p></Section>
 <Section title="Download and installation"><p>Get the Android APK from the <a href={DOWNLOAD}>official GitHub release page</a>. FocusForge supports Android 7.0 and above. Android may ask you to allow installation from your browser or file manager; review the source before approving. We do not currently provide an iOS version or a Google Play download link.</p></Section>
 <Section title="Shielding not working?"><p>For normal apps, use <strong>Allow app usage</strong> on Home below Start session, review the disclosure and grant Usage Access. Allow <strong>Draw over other apps</strong> when configuring a boundary, then enable your chosen rule. Accessibility is only needed when you enable supported YouTube Shorts or feed filters. If you tapped <strong>Stop</strong> in the app-boundaries notification, enable an app rule again from FocusForge. Revoked access or device battery settings can interrupt background operation, and supported YouTube screens can change after updates. Review the <a href={pageLink("/privacy")}>access disclosure</a> before granting permissions.</p></Section>
 <Section title="Profile and shared-content help"><p>To change or remove your photo, open your profile avatar in the app. Linked accounts back up the thumbnail privately; leaderboard sharing makes it visible with your weekly entry. Turn sharing off from the leaderboard’s Sharing options menu to withdraw your entries. For concerns about a shared name or photo, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> with the displayed name, leaderboard week or group, and reason. Do not include passwords or sensitive personal information. Group report and hide controls are available inside groups.</p></Section>
 <Section title="Bugs and feature ideas"><p>Report non-private problems on <a href={`${source}/issues/new`}>GitHub Issues</a>. Include your Android version, app version and steps to reproduce. GitHub issues are public: never post account identifiers, private data or deletion requests there.</p></Section>
 <Section title="Email and password help"><p>For a new email account, open the verification email and follow its link, then return to FocusForge and choose <strong>I’ve verified my email</strong>. Check your spam folder or send a new verification email from the app if needed.</p><p>To reset your password, open the email sign-in form in the app and choose <strong>Forgot password?</strong> Enter your account email and follow the reset link from your inbox. Choose a new password on Firebase’s secure hosted page, then return to the app to sign in.</p></Section>
 <Section title="Account and privacy help"><p><a href={pageLink("/delete-account")}>Sign in and delete your account and associated cloud data</a> directly from this website, without reinstalling FocusForge. Use the same email/password or Google account as the app, then confirm permanent deletion. Sign out keeps your account and data. For anonymous accounts, use Delete account in the app; contact support if you cannot access it. Read our <a href={pageLink("/privacy")}>privacy policy</a> for details.</p></Section>
 </> : <>
 <DeleteAccount/>
 <Section title="What is removed"><p>Deletion removes your Firebase sign-in account, private study backup (profile name and chosen photo thumbnail, setup, subjects, custom plans, goals, study totals and dated focus sessions), private achievement backup, group memberships and shared progress, historical leaderboard entries including their saved names and photos, and inventoried legacy account records. Cloud cleanup completes before your login is deleted. Shared groups continue for other members, with ownership transferred when needed.</p><p>A minimal record containing your account ID and deletion-request time remains to prevent old signed-in devices from recreating deleted records. It contains no name, email or study progress.</p></Section>
 <Section title="What happens next"><p>Successful deletion is confirmed on this page after Firebase has removed your cloud records and login. Keep the page open during cleanup. If the connection fails, some records may already have been removed; sign in again and retry. You will not see a success message unless cleanup and login deletion both finish.</p><p>The website cannot erase history stored locally on your phone. Clear FocusForge’s app storage or uninstall it when you no longer need those records. Provider backups, security logs and legally required records may be retained separately; we do not have a verified fixed backup-expiry schedule.</p></Section>
 <Section title="Cannot sign in?"><p>For an anonymous account, open <strong>You → Account &amp; privacy → Delete account</strong> in the Android app. If you cannot access your account, or need help with partial data deletion, contact <a href={"mailto:" + EMAIL}>{EMAIL}</a>. Support will verify ownership before acting. Never email passwords, PINs, recovery codes or verification codes.</p><EmailLink/><p className="small">Signing out or uninstalling alone does not delete your cloud account.</p></Section>
 </>}</div></main>;
}
export default function App({ path = '/' }: { path?: string }) {
 useEffect(() => { document.title = pageTitles[path] || 'Page not found — FocusForge'; }, [path]);
 return <div className="sheet"><a className="skip-link" href="#main">Skip to content</a><Header/>{path === '/' ? <main id="main"><Home/></main> : path === '/verify-email' ? <VerifyEmail/> : path === '/get-on-play' ? <GetOnPlay/> : ROUTES.includes(path) ? <Legal path={path}/> : <main id="main" className="legal"><h1 className="legal-title">Let’s find your focus.</h1><p className="legal-intro">This page doesn’t exist.</p><a href={pageLink("/")} className="button button-ink">Back to home</a></main>}<Footer/></div>;
}
