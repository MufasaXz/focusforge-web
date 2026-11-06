import { useEffect, useRef, useState } from 'react';
import DeleteAccount from './DeleteAccount';
import VerifyEmail from './VerifyEmail';
import AccountAction from './AccountAction';
import { useHydrated } from './useHydrated';
import GetOnPlay from './GetOnPlay';
import './getOnPlay.css';
import { asset, pageLink } from './paths';
import { guides, guideFor, type Guide } from './guides';

const DOWNLOAD = 'https://github.com/MufasaXz/focusforge/releases/latest';
const EMAIL = 'focusforgehelp@gmail.com';
// Downloads across every channel, as stated by the developer (2 Nov 2026).
// GitHub releases alone counted 528 that day.
const DOWNLOADS = '10K+';
/** Every prerendered path. @public Read by scripts/prerender.mjs through Vite. */
export const ROUTES = ['/', '/guides', ...guides.map(guide => guide.slug), '/privacy', '/terms', '/support', '/delete-account', '/get-on-play', '/verify-email', '/account-action'];
const SITE = 'https://focusforgeorg.vercel.app';
const source = 'https://github.com/MufasaXz/focusforge';
/** @public Read by scripts/prerender.mjs through Vite. */
export const pageTitles: Record<string, string> = { '/': 'FocusForge — Make room for what matters.', '/guides': 'Study guides — FocusForge', ...Object.fromEntries(guides.map(guide => [guide.slug, `${guide.title} — FocusForge`])), '/privacy': 'Privacy policy — FocusForge', '/terms': 'Terms of use — FocusForge', '/support': 'Support — FocusForge', '/delete-account': 'Delete your account — FocusForge', '/get-on-play': 'Join the Play Store test — FocusForge', '/verify-email': 'Verify your email — FocusForge', '/account-action': 'Your FocusForge account — FocusForge' };

/**
 * Descriptions for routes the prerender cannot name on its own.
 * @public Read by scripts/prerender.mjs through Vite.
 */
export const pageDescriptions: Record<string, string> = {
  '/guides': 'Practical study guides from FocusForge: the Pomodoro technique, blocking distracting apps on Android, and building a habit that lasts through exams.',
  '/account-action': 'Choose a new FocusForge password or confirm your email address from a link in a FocusForge account email.',
  ...Object.fromEntries(guides.map(guide => [guide.slug, guide.description]))
};

const SCHEMA_VOCABULARY = 'https://schema.org';

/** Structured data, escaped so no value can close the script element. */
function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify({ '@context': SCHEMA_VOCABULARY, ...data }).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }}/>;
}
const organization = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'FocusForge',
  url: `${SITE}/`,
  logo: `${SITE}/images/focusforge-icon.png`,
  email: 'focusforgehelp@gmail.com',
  description: 'FocusForge makes a free, open-source study companion for Android.',
  founder: { '@type': 'Person', name: 'MufasaXz', url: 'https://github.com/MufasaXz' },
  sameAs: ['https://github.com/MufasaXz/focusforge']
};

function Mark() { return <img className="mark" src={asset('images/focusforge-icon.png')} alt="" width="32" height="32" aria-hidden="true"/>; }
function Download({ tone = 'ink', children = 'Download for Android' }: { tone?: 'ink' | 'light' | 'outline'; children?: React.ReactNode }) {
  return <a className={`button button-${tone}`} href={DOWNLOAD}>{children}<Arrow/></a>;
}

/**
 * A phone, front on, measured from the reference handset render and finished
 * in OnePlus 15 Sand Storm: a rounded rail with a lit crest and a dark seam
 * where it meets the glass, a fine glass edge, a black border, the centred
 * punch-hole lens, matte antenna breaks, and power above the volume rocker on
 * the right, standing proud of the rail. The body is 844 × 1787.5; every inner
 * measure is in container-width units, so the phone keeps its shape at any
 * size it is drawn. The screens are real screenshots, status bar and gesture
 * bar included, so nothing is drawn over them but the camera.
 */
function Phone({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return <figure className={`op15${className ? ' ' + className : ''}`}><div className="op15-body">
    <span className="op15-key op15-power" aria-hidden="true"/>
    <span className="op15-key op15-volume" aria-hidden="true"/>
    <div className="op15-bezel">
      <div className="op15-screen">
        <img src={asset(src)} alt={alt} width="720" height="1601" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async"/>
        <span className="op15-camera" aria-hidden="true"/>
      </div>
    </div>
  </div></figure>;
}

const ARROWS = {
  out: 'M3.25 8.75 8.5 3.5M4.25 3.5H8.5v4.25',
  right: 'M2 6h7.5M6.5 2.75 9.75 6 6.5 9.25',
  down: 'M6 2v7.5M2.75 6.5 6 9.75l3.25-3.25',
  up: 'M6 10V2.5M2.75 5.5 6 2.25l3.25 3.25'
};
/**
 * A small arrow that says where a link goes: out of the site (the default),
 * on to the next page, or along this one. It nudges that way on hover.
 */
const Arrow = ({ to = 'out' }: { to?: keyof typeof ARROWS }) => <svg className={`arrow arrow-${to}`} viewBox="0 0 12 12" aria-hidden="true"><path d={ARROWS[to]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/**
 * Copies the support address, for readers whose phone has no mail app set up.
 * It only appears once it can work; the address beside it is always a link.
 */
function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  const enhanced = useHydrated();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!enhanced || !navigator.clipboard) return null;
  const copy = () => navigator.clipboard.writeText(EMAIL).then(() => {
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }, () => setCopied(false));
  return <>
    <button type="button" className={`copy-email${copied ? ' is-copied' : ''}`} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
    <output className="sr-only">{copied ? 'Email address copied' : ''}</output>
  </>;
}

/**
 * On phones the header is a floating pill that stays in reach while the page
 * scrolls: the wordmark, the download, and a two-line menu button whose links
 * open in a card below it. Without JavaScript the links stay visible and the
 * button stays hidden; the menu only collapses once it can actually open.
 */
function Header() {
  const [open, setOpen] = useState(false);
  const enhanced = useHydrated();
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); bar.current?.querySelector<HTMLButtonElement>('.menu-toggle')?.focus(); } };
    // A tap anywhere outside the bar and its menu puts the menu away.
    const away = (e: PointerEvent) => { if (!bar.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', close);
    document.addEventListener('pointerdown', away);
    return () => { window.removeEventListener('keydown', close); document.removeEventListener('pointerdown', away); };
  }, [open]);
  const shut = () => setOpen(false);
  return <header ref={bar} className={`site-header${enhanced ? ' enhanced' : ''}`}>
    <a href={pageLink('/')} className="wordmark" aria-label="FocusForge home" translate="no"><Mark/><span className="wordmark-name">FocusForge</span></a>
    <nav id="navigation" className={open ? 'open' : ''} aria-label="Main navigation">
      <a href={pageLink('/#features')} onClick={shut}>Features</a>
      <a href={pageLink('/#privacy')} onClick={shut}>Your data</a>
      <a href={pageLink('/guides')} onClick={shut}>Guides</a>
      <a href={pageLink('/#faq')} onClick={shut}>Questions</a>
    </nav>
    <a className="button button-outline header-download" href={DOWNLOAD}>Download<Arrow/></a>
    <button className="menu-toggle" aria-expanded={open} aria-controls="navigation" onClick={() => setOpen(!open)}><span className="menu-lines" aria-hidden="true"/><span className="sr-only">Menu</span></button>
  </header>;
}

function Footer() {
  return <footer className="footer">
    <div className="footer-brand">
      <a className="wordmark" href={pageLink('/')} translate="no"><Mark/>FocusForge</a>
      <p>A quieter phone for the hours that matter, made for Android and published in the open.</p>
      <p className="mail-line"><a href={`mailto:${EMAIL}`}>{EMAIL}</a><CopyEmail/></p>
    </div>
    <nav aria-label="Legal and support">
      <a href={pageLink('/guides')}>Guides</a>
      <a href={pageLink('/privacy')}>Privacy policy</a>
      <a href={pageLink('/terms')}>Terms</a>
      <a href={pageLink('/support')}>Support</a>
      <a href={source}>Source code<Arrow/></a>
    </nav>
    <p className="footer-note">© {__BUILD_YEAR__} FocusForge, by MufasaXz. Made for quieter evenings.</p>
    <a className="footer-top" href="#top">Back to top<Arrow to="up"/></a>
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
  { key: 'shield', tone: 'lavender', title: 'Close the feed', body: 'Pick the apps that pull you away, then shut them outright, cap them with a daily budget, or silence them only during study blocks. YouTube’s Shorts player and home feed can vanish while lecture links keep working.', image: 'images/shot-shield-dark.webp', alt: 'FocusForge Shield tab in dark mode listing installed apps with a switch for each', lightImage: 'images/shot-shield-light.webp', lightAlt: 'FocusForge Shield tab in light mode listing installed apps with a switch for each' },
  { key: 'focus', tone: 'white', title: 'A timer that respects the work', body: 'Choose a Pomodoro preset or design your own rhythm, label what is open on the desk, and let rain, forest or café ambience cover the silence.', image: 'images/shot-focus-dark.webp', alt: 'FocusForge focus timer in dark mode counting down a 25-minute block', lightImage: 'images/shot-focus-light.webp', lightAlt: 'FocusForge focus timer in light mode with 44 minutes left' },
  { key: 'progress', tone: 'sage', title: 'Proof that it adds up', body: 'Daily targets, weekly totals for every course and home-screen widgets turn scattered sessions into a record you can actually see.', image: 'images/shot-home-dark.webp', alt: 'FocusForge home screen in dark mode with today’s focus, goal and subject breakdown', lightImage: 'images/shot-home-light.webp', lightAlt: 'FocusForge home screen in light mode with 45 minutes of focus against the daily goal' }
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

function FaqList({ items }: { items: string[][] }) {
  const questions = items.map(([q, a]) => <FaqItem key={q} question={q} answer={a}/>);
  return <div className="faq-list">{questions}</div>;
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
  const glyphs = [...value].map((char, i) => /\d/.test(char)
    ? <Reel key={i} digit={Number(char)} order={reel++}/>
    : <span key={i} className="glyph">{char}</span>);
  return <>
    <span className="sr-only">{value}</span>
    <span className="odometer" aria-hidden="true">{glyphs}</span>
  </>;
}

const REEL_DIGITS = [...'01234567890123456789'];

/** One digit's strip of two turns; `order` staggers its spin after the reels before it. */
function Reel({ digit, order }: { digit: number; order: number }) {
  const style = { '--to': digit + 10, '--reel': order } as React.CSSProperties;
  const strip = REEL_DIGITS.map((shown, n) => <span key={n}>{shown}</span>);
  return <span className="reel" style={style}>
    <span className="strip">{strip}</span>
  </span>;
}

type Tool = (typeof tools)[number];

/**
 * A tool card that turns over to show its screen in the other theme. The card
 * keeps its colour on both sides and only the phone changes; the theme label is
 * printed on each face, so it turns with the card. The title and text exist
 * once, above the turning layers, and step aside while the card turns, so
 * nothing is duplicated for crawlers or screen readers. One real button,
 * stretched over the card, does the turning: a click anywhere works, and the
 * keyboard and assistive tech get a single labelled, pressed control.
 *
 * A turn takes TURN_MS (the transform transition on .tool-turn). The card lifts
 * a little until it is edge-on, about 40% of the way through that curve, and
 * settles as it lands; the copy returns only once the face is within a few
 * degrees of flat, so text never sits over a card that is still turning.
 */
const TURN_MS = 660;
function ToolCard({ tool }: { tool: Tool }) {
  const [light, setLight] = useState(false);
  const [phase, setPhase] = useState<'still' | 'lift' | 'settle'>('still');
  const timer = useRef(0);
  const card = useRef<HTMLElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Decode both screenshots up front, so the hidden one is ready the moment
  // it comes round instead of drawing in halfway through the turn.
  useEffect(() => { card.current?.querySelectorAll('img').forEach(img => { img.decode().catch(() => undefined); }); }, []);
  const turn = () => {
    setLight(value => !value);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.clearTimeout(timer.current);
    setPhase('lift');
    timer.current = window.setTimeout(() => {
      setPhase('settle');
      timer.current = window.setTimeout(() => setPhase('still'), TURN_MS * .4);
    }, TURN_MS * .42);
  };
  return <article ref={card} className={`tool${light ? ' is-light' : ''}${phase === 'still' ? '' : ' is-turning'}${phase === 'lift' ? ' is-lifted' : ''}`}>
    <div className="tool-turn">
      <ToolFace tool={tool} side="front" shown={!light}/>
      <ToolFace tool={tool} side="back" shown={light}/>
    </div>
    <div className="tool-copy"><h3>{tool.title}</h3><p>{tool.body}</p></div>
    <button type="button" className="tool-flip" aria-pressed={light} aria-label={`${tool.title}: show the ${light ? 'dark' : 'light'} theme`} onClick={turn}/>
  </article>;
}
/**
 * One side of a tool card. The front carries the dark screenshot and the back
 * the light one; each face prints the theme a tap turns to, so the label turns
 * with the card. The face turned away is hidden from focus and assistive tech.
 */
function ToolFace({ tool, side, shown }: { tool: Tool; side: 'front' | 'back'; shown: boolean }) {
  const front = side === 'front';
  const label = front ? <><Sun/>Light</> : <><Moon/>Dark</>;
  return <div className={`tool-face tool-${tool.tone}${front ? '' : ' tool-back'}`} aria-hidden={!shown} inert={!shown}>
    <span className="tool-label" aria-hidden="true">{label}</span>
    <Phone src={front ? tool.image : tool.lightImage} alt={front ? tool.alt : tool.lightAlt}/>
  </div>;
}

const Sun = () => <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const Moon = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;

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

/** A plain section heading: one weight, sentence case, no second voice. */
function Title({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 className="title" id={id}>{children}</h2>;
}

function Home() {
  const session = useRevealOnce();
  const facts = useRevealOnce();
  const graph = {
    '@graph': [
      organization,
      { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'FocusForge', publisher: { '@id': `${SITE}/#organization` }, inLanguage: 'en' },
      {
        '@type': 'MobileApplication',
        '@id': `${SITE}/#app`,
        name: 'FocusForge',
        description: 'A free study companion for Android with a focus timer, Shield app blocking, YouTube Shorts filters and progress tracking.',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Android 7.0 or later',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        downloadUrl: DOWNLOAD,
        image: `${SITE}/images/focusforge-icon.png`,
        screenshot: ['shot-focus-dark', 'shot-shield-dark', 'shot-home-dark'].map(name => `${SITE}/images/${name}.webp`),
        publisher: { '@id': `${SITE}/#organization` },
        author: { '@id': `${SITE}/#organization` }
      },
      { '@type': 'FAQPage', '@id': `${SITE}/#faq`, mainEntity: faq.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) }
    ]
  };
  return <>
    <JsonLd data={graph}/>
    <section className="hero" aria-labelledby="hero-title">
      <p className="hero-status"><span className="status-dot" aria-hidden="true"/>Free on Android · Open source</p>
      <Heading level={1} id="hero-title" strong="Make room" soft="for what matters."/>
      <Phone className="hero-phone" src="images/shot-focus-dark.webp" alt="FocusForge focus timer counting down a 25-minute block in dark mode" eager/>
      <div className="hero-panel">
        <p className="hero-lead">FocusForge pairs a calm study timer with Shield, a gentle lock on whatever quietly swallows your evenings.</p>
        <div className="hero-actions"><Download/><a className="text-link" href="#features">Take a closer look<Arrow to="down"/></a></div>
        <p className="hero-note">Costs nothing, shows no ads, and runs on Android 7.0 or newer.</p>
      </div>
    </section>

    <section className="facts" ref={facts} aria-label="FocusForge in numbers">
      <dl>{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><Odometer value={value}/></dd></div>)}</dl>
    </section>

    <section className="tools" id="features" aria-labelledby="tools-title">
      <div className="section-intro"><Title id="tools-title">Three tools that work as one</Title><p>Shield guards the hour, the timer paces it, and your log remembers it.</p></div>
      <div className="tool-grid">
        {tools.map(tool => <ToolCard key={tool.key} tool={tool}/>)}
      </div>
      <p className="caption">Screenshots of FocusForge running on a real Android phone. Tap a card to see the other theme.</p>
    </section>

    <section className="session" ref={session} aria-labelledby="session-title">
      <Title id="session-title">How a session unfolds</Title>
      <ol>
        <li><h3>Choose a rhythm</h3><p>Fifteen minutes, ninety, or anything between. Tag the subject so the time lands where it belongs.</p></li>
        <li><h3>Shield steps in</h3><p>Whatever you marked off-limits stays shut until the block ends. Lecture videos still play.</p></li>
        <li><h3>The work is counted</h3><p>Finished blocks feed today’s goal, the weekly chart and each subject’s total.</p></li>
      </ol>
    </section>

    <section className="trust" id="privacy" aria-labelledby="trust-title">
      <div className="trust-intro">
        <Title id="trust-title">What never leaves your phone</Title>
        <p>Shield has to know which apps you open. That knowledge stays on the device, by design rather than by promise.</p>
        <a className="button button-light" href={pageLink('/privacy')}>Read the privacy policy</a>
      </div>
      <dl>
        <div><dt>Your app list</dt><dd>Read only after you agree to an in-app disclosure, and never uploaded.</dd></div>
        <div><dt>Your screen time</dt><dd>Usage minutes drive budgets and the Home chart without being sent anywhere.</dd></div>
        <div><dt>Ads and trackers</dt><dd>Neither the app nor this site carries an advertising or analytics SDK.</dd></div>
        <div><dt>Your account</dt><dd>Delete it, along with its cloud backup, inside the app or <a href={pageLink('/delete-account')}>here on the web</a>.</dd></div>
      </dl>
    </section>

    <section className="reading" aria-labelledby="reading-title">
      <div className="section-intro"><Title id="reading-title">Read before your next exam</Title><p><a className="text-link" href={pageLink('/guides')}>All guides<Arrow to="right"/></a></p></div>
      <GuideList heading="h3"/>
    </section>

    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="faq-head"><Title id="faq-title">Questions worth asking</Title><p>Not covered here? <a href={pageLink('/support')}>Write to us.</a></p></div>
      {/* Two independent lists rather than CSS columns, so opening an answer
          lengthens its own column and nothing jumps across. */}
      <div className="faq-columns">
        <FaqList items={faq.slice(0, 3)}/>
        <FaqList items={faq.slice(3)}/>
      </div>
    </section>

    <section className="closing" aria-labelledby="closing-title">
      <div className="closing-copy">
        <Heading id="closing-title" strong="Less scrolling." soft="More becoming."/>
        <p className="closing-lead">Install it tonight and start your first block tomorrow morning. No account required.</p>
        <div className="closing-actions"><Download/><a className="text-link" href={source}>View the source<Arrow/></a></div>
      </div>
      <Phone className="closing-phone" src="images/shot-focus-light.webp" alt="FocusForge focus timer in light mode with 44 minutes left"/>
    </section>
  </>;
}

/** Every guide as a linked card; `heading` keeps the outline right on each page. */
function GuideList({ heading: Heading, className }: { heading: 'h2' | 'h3'; className?: string }) {
  const items = guides.map(guide => <li key={guide.slug}>
    <a href={pageLink(guide.slug)}>
      <span className="reading-top"><span className="reading-time">{guide.minutes} min read</span><Arrow to="right"/></span>
      <Heading>{guide.title}</Heading>
      <p>{guide.description}</p>
    </a>
  </li>);
  return <ul className={className ? `reading-list ${className}` : 'reading-list'}>{items}</ul>;
}

function GuideSection({ section }: { section: Guide['sections'][number] }) {
  const paragraphs = section.paragraphs.map((paragraph, j) => <p key={j}>{paragraph}</p>);
  return <section>
    {section.heading && <h2>{section.heading}</h2>}
    {paragraphs}
  </section>;
}

function GuidesIndex() {
  return <main id="main" className="legal guides">
    <JsonLd data={{ '@type': 'CollectionPage', name: 'Study guides', url: `${SITE}/guides`, publisher: organization, hasPart: guides.map(guide => ({ '@type': 'Article', headline: guide.title, url: `${SITE}${guide.slug}` })) }}/>
    <a className="text-link back-link" href={pageLink('/')}>Back to FocusForge</a>
    <p className="legal-kicker">Guides</p>
    <h1 className="legal-title">Study better, scroll less.</h1>
    <p className="legal-intro">Short, practical reading on focus, phone habits and exam preparation, written alongside the app.</p>
    <GuideList heading="h2" className="reading-index"/>
  </main>;
}

function GuidePage({ guide }: { guide: Guide }) {
  const others = guides.filter(other => other.slug !== guide.slug);
  return <main id="main" className="legal article">
    <JsonLd data={{
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      datePublished: guide.published,
      dateModified: guide.published,
      mainEntityOfPage: `${SITE}${guide.slug}`,
      image: `${SITE}/images/focusforge-icon.png`,
      author: organization,
      publisher: organization,
      inLanguage: 'en'
    }}/>
    <a className="text-link back-link" href={pageLink('/guides')}>All guides</a>
    <p className="legal-kicker">A {guide.minutes}-minute read, published <time dateTime={guide.published}>{new Date(guide.published + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time></p>
    <h1 className="legal-title">{guide.title}</h1>
    <p className="legal-intro">{guide.description}</p>
    <div className="legal-body article-body">
      {guide.sections.map((section, i) => <GuideSection key={i} section={section}/>)}
    </div>
    <aside className="article-next" aria-labelledby="next-title">
      <h2 id="next-title">Keep reading</h2>
      <ul className="reading-list">{others.map(other => <li key={other.slug}><a href={pageLink(other.slug)}><span className="reading-top"><span className="reading-time">{other.minutes} min read</span><Arrow to="right"/></span><h3>{other.title}</h3></a></li>)}</ul>
      <p>Ready to try it? <a href={DOWNLOAD}>Download FocusForge for Android</a>.</p>
    </aside>
  </main>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2>{title}</h2>{children}</section>; }
function EmailLink() { return <a className="button button-ink" href={"mailto:" + EMAIL + "?subject=FocusForge%20support"}>Email support</a>; }
function Legal({ path }: { path: string }) {
 const title = path === '/privacy' ? 'Privacy, without the fine-print feeling.' : path === '/terms' ? 'A few ground rules.' : path === '/support' ? 'A little help, whenever you need it.' : 'Your account. Your choice.';
 return <main id="main" className="legal"><a className="text-link back-link" href={pageLink("/")}>Back to FocusForge</a><p className="legal-kicker">{path === '/delete-account' ? 'Account and data deletion' : path === '/privacy' ? 'Privacy policy' : path === '/terms' ? 'Terms of use' : 'Support'}</p><h1 className="legal-title">{title}</h1><p className="legal-intro">{path === '/privacy' ? 'How the FocusForge Android app and this website handle information. Last updated: November 6, 2026.' : path === '/delete-account' ? 'Sign in securely and permanently delete your FocusForge account and cloud data, without reinstalling the app.' : path === '/terms' ? 'Terms of use for the FocusForge website and Android study companion. Last updated: November 6, 2026.' : 'Questions about installation, permissions, privacy, or your next study session? Start here.'}</p><div className="legal-body">{path === '/privacy' ? <>
 <Section title="Who we are"><p>FocusForge is an Android study companion maintained by MufasaXz, the developer identity associated with the public project. Contact the developer for privacy questions at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. This notice covers FocusForge and this website; third-party services have their own policies.</p></Section>
 <Section title="Information on your device"><p>Focus-session history, per-app usage history, subjects, goals and app settings are stored locally using SharedPreferences-backed storage. Linked accounts also back up the study records described below. Screen-time and app-usage history, Shield events and Accessibility screen contents stay on your device. We do not claim local storage is encrypted. Remove app storage through Android settings or uninstall to remove app-local records; device backups may be governed separately by your device settings.</p><p><strong>Clear local analytics</strong> removes local focus history and progress. It does not delete your linked account’s private cloud study backup, so those study records can return when you recover that account. Use Delete account to remove the associated cloud records.</p></Section>
 <Section title="Accounts and Firebase"><p>Choose <strong>Skip for now</strong> to begin with a local guest profile without waiting for Firebase sign-in. Linked email/password and Google accounts use Google Firebase Authentication when the backend is active. Authentication can process account identifiers, email, display name, authentication credentials and service-related technical information. Existing anonymous Firebase sessions may still contact Firebase; using the app without an email account is not a promise of no network activity. A display-name change may update Firebase Authentication.</p><p>Firebase Authentication and Cloud Firestore, provided by Google, process information to authenticate users, recover private study data and power the chosen sharing features below. See <a href="https://firebase.google.com/support/privacy">Firebase privacy information</a> for service practices, infrastructure and international processing.</p></Section>
 <Section title="Private backup and optional sharing"><ul><li><strong>Private study backup:</strong> linked accounts store their profile, including display name and any chosen profile-photo thumbnail, completed setup, subject catalog, custom plan library, goals, study totals and dated completed focus sessions in private Firestore records under the account ID. These records let the same account restore its study setup and history after signing in again or reinstalling. A retained login continues syncing in the background after an app update. Recovery on a new installation depends on a completed backup; uninstalling can remove changes that have not synced. Guest study remains local unless you link it to an account. Screen time, per-app usage history, Shield events and screen contents are excluded.</li><li><strong>Private achievement backup:</strong> linked accounts store earned badge identifiers and original earned dates in a separate private Firestore record under the account ID. This lets the same account recover its badges after signing in again or changing devices. Guest profiles keep badges locally until linked.</li><li><strong>Private study groups:</strong> group names, targets, owner/member identifiers, invitation information and timestamps. Membership records include display names, weekly completed study minutes, an active timer deadline, and join/update timestamps. These details support group membership and shared goals and are visible to authorized group participants.</li><li><strong>Optional public leaderboard:</strong> display name, any chosen profile-photo thumbnail, level, weekly focus minutes and an update timestamp are stored under your account identifier. Published entries are visible to other signed-in users, including after you sign out, while they qualify for that week’s top 100. Turn sharing off in the leaderboard’s <strong>Sharing options</strong> menu to withdraw your published weekly entries, or delete your account. Signing out or uninstalling does not turn sharing off.</li></ul><p>Private study and badge backups do not depend on public leaderboard consent. Only use sharing features if you are comfortable with the information disclosed to the relevant people. Parent control has been removed from the study-only release; it no longer uploads installed-app lists or study summaries for monitoring. Older cloud records become inaccessible when the owner publishes the updated rules and are removed by trusted retirement tooling, account cleanup or verified support requests.</p></Section>
 <Section title="Profile photos and name changes"><p>Choosing a photo is optional. The app opens your device’s image picker for an image you select; it does not upload your gallery. It creates a 128 × 128-pixel square JPEG thumbnail and removes embedded metadata, such as location tags, before saving it. The original full-size photo is not uploaded. Choosing a photo does not enable leaderboard sharing.</p><p>Guest profiles keep the thumbnail locally. For linked accounts, Google Cloud Firestore stores the thumbnail with the private profile backup. If you enable leaderboard sharing, the thumbnail is also included in your published weekly entry and visible to other signed-in users. Study-group membership records do not include this photo.</p><p>You can change your name, remove the photo or use an icon or initials from your profile in the app. Changes update the private backup and any current-week leaderboard entry when syncing succeeds. Older published weekly entries may retain an earlier name or photo. Turn sharing off to withdraw your published entries, or delete your account to remove the private backup and associated leaderboard records. Previously viewed or copied information cannot be recalled from other people’s devices.</p></Section>
 <Section title="Installed apps and app usage"><p>FocusForge reads the list of apps installed on your phone, and how long you used each one today, to let you choose apps to block or limit in Shield and to show your screen time on Home. It reads them only while you use those features, and only after you agree to the in-app disclosure shown on the Shield tab and before Usage Access is requested. Choosing <strong>Not now</strong>, pressing Back or leaving the disclosure is not consent, and nothing is read.</p><p>The app list and usage times stay on your device. FocusForge does not upload them, store them on a server or share them with anyone, including study groups, the leaderboard or your private account backup. Each app is read for its package name, label and whether it is a system app; versions and install dates are not read. Withdraw consent at any time in <strong>You → Account &amp; privacy → App list access</strong>; focus timers work without it.</p></Section>
 <Section title="Pip, the study assistant"><p>Pip answers on your phone first. Plans, reports, timetables, reminders, app locks and study statistics are worked out on the device from the records described above, and Pip’s memory of your exam, timetable, reminders and preferences is stored locally. The chat itself is not saved: it lasts while the app is open.</p><p><strong>Online answers are optional.</strong> They are offered only to signed-in accounts and only after you agree in the chat; you can switch them off from the chat menu at any time, and the app limits them to five a day. When you ask an online question, FocusForge sends your question (up to 300 characters), your last few chat messages and a short study summary: subject names with minutes studied, today’s and this week’s totals, your streak, your exam and days to it, your top subject and one total for time on distracting apps. It never sends your name, email, the names or package names of your apps, or your usage history.</p><p>The request goes to our proxy on Cloudflare Workers, which checks your Firebase sign-in, applies rate limits and forwards the question to Google’s Gemini API, or to Groq if Gemini is unavailable. The proxy does not store your questions or answers; the providers process them under their own terms. See the <a href="https://ai.google.dev/gemini-api/terms">Gemini API terms</a>, <a href="https://groq.com/privacy-policy/">Groq’s privacy policy</a> and <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare’s privacy policy</a>. AI answers can be wrong; check school and exam schedules yourself.</p><p><strong>Reporting answers:</strong> every online answer has a report button. A report sends the answer, your question, the reason you chose and your account ID to the proxy, where it is kept for 90 days so it can be reviewed, and a copy stays on your phone.</p></Section>
 <Section title="Reminders and notifications"><p>Pip’s evening study nudges, exam countdowns, timetable reminders and reminders you set by date are scheduled on your phone with Android’s alarm service and shown as local notifications. They are not sent from a server and their text is not uploaded. If notifications are off, due reminders appear on Home instead. You can pause evening reminders from Pip’s chat menu, remove reminders in the chat, or turn notifications off in Android settings.</p></Section>
 <Section title="Sensitive Android access"><ul><li><strong>Usage Access:</strong> detects which app is in the foreground for selected-app shielding and reads per-app screen time for budgets and usage views. These checks run locally; foreground-app history is not sent to Firebase. It can be revoked in Android’s special app access settings.</li><li><strong>Draw over other apps:</strong> displays the pause screen over an app you choose to limit. This permission does not detect which app is open, so normal-app shielding also needs Usage Access. It can be revoked in Android’s special app access settings.</li><li><strong>Accessibility:</strong> Accessibility is only used for supported YouTube Shorts and feed filtering. It checks YouTube screen identifiers and visibility to distinguish supported Shorts and feed screens from ordinary videos. These screen checks stay on the device and are not retained or uploaded. It does not read messages, passwords or text you type. YouTube updates can change these identifiers and interrupt filtering until FocusForge is updated. While a YouTube pause is visible, it checks application window package names to close that pause when you leave YouTube; it does not inspect other apps’ contents. Normal-app shielding does not require this service. This is not an accessibility tool for people with disabilities. Grant access only after reviewing the in-app disclosure and consent prompt; revoke it in Android Accessibility settings.</li><li><strong>Notifications:</strong> support timer reminders and the foreground notification while app boundaries are running. Stop shielding with the notification’s <strong>Stop</strong> action; resume it from FocusForge when you choose. Android controls where foreground-service notices appear when notification access is disabled.</li><li><strong>App visibility:</strong> launcher-app queries identify selectable apps on the device. The app does not request access to the entire installed-package catalog through QUERY_ALL_PACKAGES. Normal-app pause screens use an application overlay; supported YouTube filters use an Accessibility overlay.</li></ul><p>App boundaries start from the app after you enable the required access. Background checks pause while the screen is locked or asleep and stop if the required access is revoked. Device battery management or Android restrictions can still interrupt blocking. Permissions support the described features, not advertising. Website text does not replace the app’s prominent permission disclosure and explicit consent.</p></Section>
 <Section title="Advertising, analytics and the website"><p>The current app does not integrate an advertising or third-party analytics SDK. This website uses Firebase Authentication and Cloud Firestore on the account-deletion page so you can sign in and remove your account. Website authentication and cloud records are held in memory rather than persistent browser storage; reloading or closing the page ends that website sign-in. Google sign-in opens a Google/Firebase authentication window, where those providers may use their own cookies. We add no analytics or advertising trackers. Fonts and product images are self-hosted.</p><p>The website hosting providers, GitHub Pages and Vercel, may process IP addresses, request metadata, device/browser information and access/security logs to deliver and protect their hosted versions of the website. We do not control all provider retention settings and cannot promise zero logging. See <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub’s privacy statement</a> and <a href="https://vercel.com/legal/privacy-policy">Vercel’s privacy policy</a>. Following GitHub or other external links subjects you to that service’s practices.</p></Section>
 <Section title="Why information is used and who receives it"><p>Information is used to run timers and budgets, display progress, authenticate accounts, support chosen social features, answer support requests and protect the services. Recipients include Google/Firebase, the website host, Cloudflare and the AI providers Google (Gemini API) and Groq when you use Pip’s optional online answers, people you choose to share with, and email providers when you contact us. Data may also be disclosed when legally required. FocusForge does not use your data to serve ads.</p></Section>
 <Section title="Retention and deletion"><p>Local records stay until removed through app/device controls. Cloud records are maintained for the features you use until removed through supported controls or a verified request, subject to technical and legal constraints. A fixed provider backup-expiry schedule has not been verified. Direct account deletion is confirmed on the deletion page when cloud cleanup and removal of your login both complete.</p><p>Sign out keeps your account, private backups and published leaderboard entries. Delete account is available in the app and on the <a href={pageLink("/delete-account")}>website</a>: sign in with your password or Google account, confirm permanent deletion, and keep the page open while your private study and badge backups, associated sharing records and then your login are removed. Rules, indexes and the legacy cleanup migration must be active. Failures preserve your login for retry, though some cloud records may already be removed. A minimal account-ID security record and request time remain to prevent old sessions recreating data, with no name, email or progress. Other devices’ local history is not remotely erased; clear local app storage when you no longer need it. Contact support if you cannot sign in or need help with a data request.</p><p>Support email and related correspondence may remain with email providers while a request is handled; limited records may need to be retained to meet legal obligations or resolve disputes. We will explain any applicable retention when responding, rather than promising every backup or record is immediately erased.</p></Section>
 <Section title="Security and your choices"><p>Use a secure device and protect your account. Access to cloud features depends on authentication and configured access rules; no system is perfectly secure. We make no end-to-end encryption claim. You can revoke optional permissions, leave groups, stop sharing and request access, correction or deletion of information by email. Rights may vary by location.</p></Section>
 <Section title="Age and cloud accounts"><p>FocusForge is a self-directed study tool. Parent monitoring and remote device management are not available. No region-specific child-consent program or verified age policy is represented here. If you are under the age at which you can independently consent in your location, involve a parent or guardian before using cloud accounts or sharing features. Contact us if you believe a child’s information needs to be removed.</p></Section>
 <Section title="Changes and questions"><p>Changes will appear on this page with an updated date. For privacy concerns, access requests or corrections, contact <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. We do not claim this notice alone guarantees Google Play acceptance or compliance in every jurisdiction.</p></Section>
 </> : path === '/terms' ? <>
 <Section title="Using FocusForge"><p>By using this website or app, you agree to use it lawfully and respectfully. FocusForge is a study and digital-wellbeing aid, not medical advice, a safety system, parental device management or a promise of academic outcomes. You decide which permissions and sharing features to enable.</p></Section>
 <Section title="Free, open-source software"><p>The current app is free, with no ads or subscriptions. App source-code use is governed by the license included in the <a href={source}>FocusForge repository</a>. These website terms do not limit rights granted by that license. Features and availability can change.</p></Section>
 <Section title="Your account and shared spaces"><p>Keep your credentials private. Do not impersonate others, abuse invite codes, interfere with services, publish harmful content or share information without permission. You are responsible for choosing appropriate group members. Group timer status is not verified online presence. Community participation requires accepting rules against harassment, threats, hate, sexual content, impersonation and private-information sharing. Use an appropriate display name and profile photo, and only upload an image you have permission to share. Profile photos can be visible to other signed-in users when leaderboard sharing is on. You can report a group or member through the group’s controls, hide group-member rows, or contact the developer privately about a leaderboard name or photo. There is no dedicated report or hide menu on leaderboard rows. There is no chat or general media feed; the image feature is an optional profile photo. The developer reviews reports and may remove prohibited content or restrict abusive accounts.</p></Section>
 <Section title="Limitations and external services"><p>Blocking depends on Android permissions, device settings and supported app interfaces; it is not unbreakable or uninstall-proof. Timers, progress and sharing can be interrupted by device or network conditions. GitHub downloads, Firebase and other linked services have their own terms. Install software only from a source you trust.</p></Section>
 <Section title="Pip and AI answers"><p>Pip is an AI study assistant. Its online answers are generated automatically and can be incomplete or wrong. They are meant for study planning and motivation only, not medical, legal, financial or official exam advice; always check school and exam schedules with the official source. Do not share sensitive personal information in the chat. Online answers are limited each day, may be refused for safety reasons and may change or stop as providers change. Do not use Pip to produce harmful content or to get around its limits. Use the report button on any answer that is harmful, hateful or misleading.</p></Section>
 <Section title="No guarantees"><p>To the extent allowed by applicable law, the website and software are provided “as is” without warranties of availability, accuracy or fitness for a particular purpose. Nothing here excludes non-waivable consumer rights or liability that cannot legally be limited. No specific governing law or jurisdiction is asserted by this page.</p></Section>
 <Section title="Privacy, deletion and contact"><p>Read the <a href={pageLink("/privacy")}>privacy policy</a> for data practices and <a href={pageLink("/delete-account")}>request account deletion</a> if you wish to leave. For questions about these terms contact developer MufasaXz at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p></Section>
 </> : path === '/support' ? <>
 <Section title="Talk to the developer"><p>Email is the right place for account questions, deletion requests and private information. Do not send passwords, recovery codes or sensitive screenshots.</p><EmailLink/><p className="small mail-line">Prefer to copy the address? <a href={`mailto:${EMAIL}`}>{EMAIL}</a><CopyEmail/></p></Section>
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
 return <div className="sheet" id="top"><a className="skip-link" href="#main">Skip to content</a><Header/>{path === '/' ? <main id="main"><Home/></main> : path === '/guides' ? <GuidesIndex/> : guideFor(path) ? <GuidePage guide={guideFor(path)!}/> : path === '/verify-email' ? <VerifyEmail/> : path === '/account-action' ? <AccountAction/> : path === '/get-on-play' ? <GetOnPlay/> : ROUTES.includes(path) ? <Legal path={path}/> : <main id="main" className="legal"><h1 className="legal-title">Let’s find your focus.</h1><p className="legal-intro">This page doesn’t exist.</p><a href={pageLink("/")} className="button button-ink">Back to home</a></main>}<Footer/></div>;
}
