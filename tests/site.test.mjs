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
 assert.match(html, /does <strong>not<\/strong> automatically purge/);
 assert.match(html, /without reinstalling/);
});
test('privacy covers actual sensitive access and optional cloud features', async () => {
 const html = await read('dist/privacy.html');
 for (const text of ['Accessibility', 'Usage Access', 'Firebase', 'installed-app catalog', 'salted PIN digest', 'Anonymous sign-in still contacts Firebase', 'Vercel', 'retention']) assert.ok(html.includes(text), text);
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
test('cinematic shots, flip toolkit and minimal community replace the old visuals', async () => {
 const html = await read('dist/index.html');
 for (const text of ['class="story-pov"', 'class="pov-device"', 'class="story-timer"', 'class="flip-clock"', 'class="toolkit-phone"', 'class="toolkit-flip"', 'class="rank-list"', 'class="study-circle"', 'Full-screen timer concept', 'Sharing &amp; privacy']) assert.ok(html.includes(text), text);
 assert.ok(!html.includes('rank-sculpture'));
 const story = await read('src/DistractionStory.tsx');
 for (const stage of ['thoughtful', 'dust', 'phone-pov', 'flip-timer', 'study']) assert.ok(story.includes(`'${stage}'`), stage);
 assert.match(story, /document.hidden \|\| !active/);
});
test('warm woody surfaces preserve original app screenshot colors', async () => {
 const css = await read('src/styles.css');
 for (const token of ['--paper:#f4ecdf', '--ink:#382b23', '--muted:#706050', '--line:#d8c6af']) assert.ok(css.includes(token), token);
 assert.match(css, /body\{[^}]*background-image:repeating-linear-gradient/);
 assert.ok(!/\.feature-phone img\{[^}]*filter:[^}]*sepia/.test(css), 'no tint applied to app previews');
});
test('motion respects accessibility settings and deploy headers are present', async () => {
 assert.match(await read('src/styles.css'), /prefers-reduced-motion:reduce/);
 const config = JSON.parse(await read('vercel.json'));
 assert.equal(config.cleanUrls, true);
 assert.ok(config.headers[0].headers.some(header => header.key === 'Content-Security-Policy'));
});
