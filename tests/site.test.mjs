import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.env.BASE_PATH || '/';
const link = path => `${base}${path}.html`;
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('assets and verified icon use the configured deployment base', async () => {
 const html = await read('dist/index.html');
 for (const path of ['favicon.png', 'images/focusforge-icon.png', 'images/dashboard-dark.png', 'images/focus-dark.png', 'fonts/Inter-Regular.ttf']) assert.ok(html.includes(`${base}${path}`), path);
 const icon = await readFile(new URL('../public/images/focusforge-icon.png', import.meta.url));
 assert.deepEqual(icon, await readFile(new URL('../public/favicon.png', import.meta.url)));
 for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const url = match[1];
  if (!url.startsWith('/') || url === base) continue;
  assert.ok(url.startsWith(base), `URL escapes base: ${url}`);
  await readFile(new URL(`../dist/${url.slice(base.length).split('#')[0]}`, import.meta.url));
 }
});
test('canonical, social, sitemap and robots metadata match SITE_URL', async () => {
 const html = await read('dist/privacy.html');
 const site = (process.env.SITE_URL || 'https://focusforgeorg.vercel.app').replace(/\/$/, '');
 const legal = `${site}/privacy${base === '/' ? '' : '.html'}`;
 assert.ok(html.includes(`rel="canonical" href="${legal}"`));
 assert.ok(html.includes(`property="og:url" content="${legal}"`));
 assert.ok(html.includes(`property="og:image" content="${site}/og.png"`));
 assert.ok((await read('dist/sitemap.xml')).includes(`<loc>${legal}</loc>`));
 assert.ok((await read('dist/robots.txt')).includes(`Sitemap: ${site}/sitemap.xml`));
});
test('every public route has meaningful pre-rendered HTML', async () => {
 for (const page of ['index', 'privacy', 'terms', 'support', 'delete-account']) {
  const html = await read(`dist/${page}.html`);
  assert.match(html, /<h1/);
  assert.match(html, /<main id="main"/);
  assert.ok(html.includes(`href="${link('privacy')}"`));
  assert.ok(html.includes(`href="${link('delete-account')}"`));
  assert.match(html, /<title>[^<]+FocusForge|<title>FocusForge/);
 }
});
test('deletion page provides a private external request with honest limitations', async () => {
 const html = await read('dist/delete-account.html');
 assert.match(html, /mailto:sudeepyadav7272@gmail.com\?subject=FocusForge%20account%20and%20data%20deletion%20request/);
 assert.match(html, /not an automated deletion backend/);
 assert.match(html, /Sign out/);
 assert.match(html, /does not provide an in-app account-deletion button/);
 assert.doesNotMatch(html, /You → Account → Delete account/);
 assert.match(html, /trusted backend access/);
 assert.match(html, /without reinstalling/);
});
test('privacy covers actual sensitive access and optional cloud features', async () => {
 const html = await read('dist/privacy.html');
 for (const text of ['Accessibility', 'Usage Access', 'Firebase', 'Parent control has been removed', 'Sign out', 'Anonymous sign-in still contacts Firebase', 'Vercel', 'retention']) assert.ok(html.includes(text), text);
 assert.match(html, /Draw over other apps/);
 assert.match(html, /Accessibility is only used for supported YouTube/);
 assert.match(html, /foreground notification/);
 assert.match(html, /Stop shielding/);
 assert.ok(!html.includes('Do Not Disturb access'));
 assert.ok(!html.includes('does not declare SYSTEM_ALERT_WINDOW'));
 assert.ok(!html.includes('we collect nothing'));
});
test('download destination is an existing release, not an invented store listing', async () => {
 const html = await read('dist/index.html');
 assert.match(html, /https:\/\/github.com\/MufasaXz\/focusforge\/releases\/latest/);
 assert.match(html, /fictional demo data/);
 assert.ok(!html.includes('play.google.com/store/apps'));
});
test('redesigned home uses dark captures and distinct honest social illustrations', async () => {
 const html = await read('dist/index.html');
 for (const text of ['One more video', 'Wait…', 'What time is it?', 'id="leaderboard"', 'id="friends"', 'not actual standings', 'no live users or presence']) assert.ok(html.includes(text), text);
 assert.ok(!html.includes('class="privacy-strip'));
 assert.ok(!html.includes('class="quiet-orb'));
 // SHA-256 of the verified source captures in focusforge-premium/docs/screenshots/dark.
 for (const [name, digest] of [['dashboard', 'eb382d81a73c819c85dd20235f3f45fb3f033fd8d59e39589c56fd68a6d0aaab'], ['shield', 'aa0eb94e878bd78c5136cc3d6da0d1f1843b49f983d9c1ae2d188d2360d71f1b'], ['focus', '914f546b72796ec34a146b540ebb14abe6ddd5a3b993fad888bd77ae06b9d3fe']]) {
  const capture = await readFile(new URL(`../public/images/${name}-dark.png`, import.meta.url));
  assert.equal(createHash('sha256').update(capture).digest('hex'), digest);
 }
});
test('home keeps native story and feature navigation without retired controls', async () => {
 const html = await read('dist/index.html');
 for (const text of ['Make a little space', 'Less setting up', 'class="noise-control', 'class="tabs', 'class="ritual', 'role="tab"']) assert.ok(!html.includes(text), `retired UI: ${text}`);
 for (const text of ['class="story-scroll"', 'class="study-desk"', 'class="writing-hand"', 'class="feature-rail"', 'aria-roledescription="carousel"', 'Next feature', 'Previous feature', 'class="community-pair"', 'aria-label="Main navigation"']) assert.ok(html.includes(text), `redesign structure: ${text}`);
 assert.equal((html.match(/aria-roledescription="slide"/g) || []).length, 3);
});
test('pencil story and whole sheet retain motion corrections without cinematic overlays', async () => {
 const html = await read('dist/index.html');
 for (const text of ['class="screen-track"', 'class="podium"', 'class="study-circle"', 'Sharing &amp; privacy', 'hero-demo-clock']) assert.ok(html.includes(text), text);
 for (const text of ['story-pov', 'pov-device', 'story-timer', 'flip-clock', 'toolkit-phone', 'toolkit-flip', 'rank-sculpture']) assert.ok(!html.includes(text), text);
 const story = await read('src/DistractionStory.tsx');
 for (const stage of ['thoughtful', 'dust', 'study']) assert.ok(story.includes(`'${stage}'`), stage);
 assert.match(story, /document.hidden \|\| !active/);
});
test('woody background keeps the original charcoal, green and typography', async () => {
 const css = await read('src/styles.css');
 for (const token of ['--paper:#f4ecdf', '--ink:#262923', '--muted:#67695f', '--line:#d7d7c8', '--green:#dce4c7', '--yellow:#e9bc67', '--white:#fffefa', 'font-family:Inter,Arial,sans-serif', 'font-family:InterDisplay,Arial,sans-serif', 'font-weight:700']) assert.ok(css.includes(token), token);
 for (const retired of ['--ink:#382b23', '--muted:#706050', '#594434', '#49382b']) assert.ok(!css.includes(retired), retired);
 const corrections = await read('src/corrections.css');
 for (const retired of ['#705432', '#ead9bb', '#74643e', '#ad8d51']) assert.ok(!corrections.includes(retired), retired);
 assert.match(css, /body\{[^}]*background-image:repeating-linear-gradient/);
 assert.ok(!/\.feature-phone img\{[^}]*filter:[^}]*sepia/.test(css));
});
test('countdown and sheet motion use bounded, cleanup-safe mechanisms', async () => {
 const clock = await read('src/HeroClock.tsx');
 assert.match(clock, /1500 - useDemoElapsed\(active, 1500\)/);
 const ticker = await read('src/useDemoActivity.ts');
 assert.match(ticker, /Math.floor\(\(now - started\) \/ 1000\)/);
 assert.match(ticker, /document.hidden \|\| !clockSubscribers.size/);
 assert.match(ticker, /clockSubscribers.delete\(sync\)/);
 assert.match(ticker, /clearTimeout\(clockTimer\)/);
 const story = await read('src/DistractionStory.tsx');
 assert.match(story, /dust.length < 420/);
 assert.match(story, /if \(document.hidden\) \{ cancelAnimationFrame\(frame\); frame = 0; \}/);
 const corrections = await read('src/corrections.css');
 assert.match(corrections, /\.feature-slide\{[^}]*rotateY\(var\(--screen-angle/);
 assert.match(corrections, /\.feature-rail\{[^}]*scroll-snap-type:x mandatory/);
 assert.ok(!corrections.includes('rotateY(180deg)'));
 assert.ok(!corrections.includes('--sheet-offset'));
 const launcher = await read('src/useLauncherFlip.ts');
 assert.match(launcher, /next !== current/);
 assert.match(launcher, /cancelAnimationFrame\(frame\); observer.disconnect/);
 assert.ok(!(await read('src/styles.css')).includes('story-pov'));
});
test('community uses explicit fictional podium rankings and elapsed group plans', async () => {
 const html = await read('dist/index.html');
 for (const text of ['Keshab', 'Sudeep', 'Pranshu', 'Silver', 'Gold', 'Bronze', 'View demo rankings', 'Not focusing', 'Fictional weekly focus minutes']) assert.ok(html.includes(text), text);
 assert.ok(!html.includes('class="rank-list"'));
 const group = await read('src/Community.tsx');
 for (const delay of ['1100, 1000', '2100, 1', '2150, 450']) assert.ok(group.includes(delay), delay);
 assert.match(group, /useDemoElapsed\(active/);
 assert.match(await read('src/useDemoActivity.ts'), /Date.now\(\)/);
 const clock = await read('src/HeroClock.tsx');
 assert.ok(clock.includes("['Retro', 'Flip', 'Minimal']"));
 assert.ok(!clock.includes("'Neon'"));
 assert.match(clock, /hold.current = 5480/);
});
test('motion respects accessibility settings and deploy headers are present', async () => {
 assert.match(await read('src/styles.css'), /prefers-reduced-motion:reduce/);
 const config = JSON.parse(await read('vercel.json'));
 assert.equal(config.cleanUrls, true);
 assert.ok(config.headers[0].headers.some(header => header.key === 'Content-Security-Policy'));
});
