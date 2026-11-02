import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.env.BASE_PATH || '/';
const link = path => `${base}${path}.html`;
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('assets and verified icon use the configured deployment base', async () => {
 const html = await read('dist/index.html');
 for (const path of ['favicon.png', 'images/focusforge-icon.png', 'images/shot-focus-dark.webp', 'images/shot-shield-light.webp', 'fonts/Figtree-Variable.woff2']) assert.ok(html.includes(`${base}${path}`), path);
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
 for (const page of ['index', 'privacy', 'terms', 'support', 'delete-account', 'get-on-play']) {
  const html = await read(`dist/${page}.html`);
  assert.match(html, /<h1/);
  assert.match(html, /<main id="main"/);
  assert.ok(html.includes(`href="${link('privacy')}"`));
  assert.ok(html.includes(`href="${link('delete-account')}"`));
  assert.match(html, /<title>[^<]+FocusForge|<title>FocusForge/);
 }
});
test('deletion page offers authenticated deletion with explicit confirmation and accurate scope', async () => {
 const html = await read('dist/delete-account.html');
 for (const text of ['Sign in with email', 'Continue with Google', 'What is removed', 'Cloud cleanup', 'cannot erase history', 'Enable JavaScript', 'Signing out', 'Delete account']) assert.ok(html.includes(text), text);
 assert.ok(!html.includes('Request deletion by email'));
 assert.ok(!html.includes('not an automated deletion backend'));
 assert.ok(!html.includes('7 to 30 business days'));
});
test('privacy covers actual sensitive access and optional cloud features', async () => {
 const html = await read('dist/privacy.html');
 for (const text of ['Accessibility', 'Usage Access', 'Firebase', 'Parent control has been removed', 'Sign out', 'Existing anonymous Firebase sessions may still contact Firebase', 'Vercel', 'retention', 'Private study backup', 'custom plan library', 'dated completed focus sessions', 'Clear local analytics', 'Sharing options']) assert.ok(html.includes(text), text);
 assert.match(html, /level, weekly focus minutes/);
 assert.match(html, /including after you sign out/);
 assert.match(html, /Screen-time and app-usage history, Shield events and Accessibility screen contents stay on your device/);
 assert.match(html, /those study records can return when you recover that account/);
 assert.ok(!html.includes('Detailed focus sessions, screen time and screen contents are not included'));
 assert.match(html, /Draw over other apps/);
 assert.match(html, /Accessibility is only used for supported YouTube/);
 assert.match(html, /foreground notification/);
 assert.match(html, /Stop shielding/);
 assert.ok(!html.includes('Do Not Disturb access'));
 assert.ok(!html.includes('does not declare SYSTEM_ALERT_WINDOW'));
 assert.ok(!html.includes('we collect nothing'));
});
test('homepage keeps original download actions without promoting the tester guide', async () => {
 const html = await read('dist/index.html');
 assert.match(html, /https:\/\/github.com\/MufasaXz\/focusforge\/releases\/latest/);
 assert.ok(!html.includes('get-on-play'));
 assert.match(html, /Download for Android/);
 assert.match(html, /Take a closer look/);
 assert.ok(!html.includes('Get on Play Store'));
 assert.ok(!html.includes('Get on GitHub'));
 assert.match(html, /running on a real Android phone/);
 assert.ok(!html.includes('play.google.com/store/apps'));
});
test('home is one sheet with real screenshots in OnePlus 15 frames', async () => {
 const html = await read('dist/index.html');
 assert.equal((html.match(/class="op15[ "]/g) || []).length, 8, 'hero, three tools and four gallery phones');
 assert.equal((html.match(/class="op15-camera"/g) || []).length, 8);
 assert.ok(!html.includes('op15-status'), 'no drawn status bar over a real one');
 for (const text of ['class="sheet"', 'class="hero"', 'class="gallery"', 'class="footer-wordmark"', 'id="features"', 'id="privacy"', 'id="faq"', 'class="closing"', 'aria-label="Main navigation"']) assert.ok(html.includes(text), text);
 for (const image of ['focus-dark', 'focus-light', 'shield-light', 'shield-dark', 'youtube-light', 'youtube-dark', 'home-light', 'home-dark']) assert.ok(html.includes(`images/shot-${image}.webp`), image);
 assert.match(html, /fetchpriority="high"/i);
 const provenance = JSON.parse(await read('public/images/provenance.json'));
 assert.match(provenance.description, /real|own Android phone/);
 for (const image of ['focus-dark', 'focus-light', 'shield-light', 'shield-dark', 'youtube-light', 'youtube-dark', 'home-light', 'home-dark']) assert.ok(provenance.assets[`shot-${image}.webp`], image);
});
test('the retired animated design is gone', async () => {
 const html = await read('dist/index.html');
 for (const text of ['story-scroll', 'feature-rail', 'hero-demo-clock', 'podium', 'study-circle', 'sunburst', 'orbit', 'floating-note', 'reveal']) assert.ok(!html.includes(text), text);
 const css = await read('src/styles.css');
 assert.ok(!/@keyframes/.test(css), 'no keyframe animation');
 assert.ok(!/\banimation\s*:/.test(css), 'no animation property');
 assert.ok(!/transition:\s*all/.test(css), 'transitions name their properties');
});
test('type is one self-hosted family with a heavy and a light italic voice', async () => {
 const css = await read('src/styles.css');
 for (const token of ['--desk:#d8dee3', '--sheet:#f5f5f3', '--ink:#1c1a17', '--lavender:#e5e3f5', '--sage:#e2e7d8', 'font-family:Figtree', 'font-weight:800', 'font-style:italic']) assert.ok(css.includes(token), token);
 assert.match(css, /url\('\/fonts\/Figtree-Variable\.woff2'\)/);
 assert.match(css, /url\('\/fonts\/Figtree-VariableItalic\.woff2'\)/);
 assert.ok((await read('public/fonts/Figtree-OFL.txt')).includes('SIL OPEN FONT LICENSE'));
 for (const retired of ['InterDisplay', 'Instrument Serif', 'InstrumentSerif']) assert.ok(!css.includes(retired), retired);
});
test('home keeps honest, specific claims', async () => {
 const html = await read('dist/index.html');
 for (const text of ['Ads and trackers', 'Languages built in', 'Achievements to earn', 'Oldest Android it runs on', 'Your app list stays here', 'never leave your phone', 'from this website']) assert.ok(html.includes(text), text);
 for (const text of ['testimonial', 'stars', 'rating', 'users trust']) assert.ok(!html.toLowerCase().includes(text), `no invented proof: ${text}`);
});
test('motion respects accessibility settings and deploy headers are present', async () => {
 assert.match(await read('src/styles.css'), /prefers-reduced-motion:reduce/);
 const config = JSON.parse(await read('vercel.json'));
 assert.equal(config.cleanUrls, true);
 assert.ok(config.headers[0].headers.some(header => header.key === 'Content-Security-Policy'));
});

test('closed-test guide preserves ordered links and useful no-JavaScript instructions', async () => {
 const html = await read('dist/get-on-play.html');
 const destinations = ['https://groups.google.com/g/focusforge', 'https://play.google.com/apps/testing/dev.focusforge.focusforge', 'https://play.google.com/store/apps/details?id=dev.focusforge.focusforge'];
 let position = -1;
 for (const destination of destinations) {
  const next = html.indexOf('href="' + destination + '"');
  assert.ok(next > position, destination);
  position = next;
 }
 for (const text of ['50+ testers', 'same Gmail', '14 consecutive days', '1–5 minutes daily', 'honest feedback', 'private to the developer', 'Google makes the final approval decision']) assert.ok(html.includes(text), text);
 assert.ok(!(await read('dist/sitemap.xml')).includes('get-on-play'));
 assert.ok(html.includes('name="robots" content="noindex"'));
 for (const page of ['index','privacy','support','terms','delete-account']) assert.ok(!(await read('dist/'+page+'.html')).includes('href="'+link('get-on-play')+'"'));

});

test('email verification is private, accessible and uses Firebase hosted password reset', async () => {
 const html = await read('dist/verify-email.html');
 assert.match(html, /<h1/);
 assert.ok(html.includes('name="robots" content="noindex"'));
 assert.ok(html.includes('Enable JavaScript to confirm your email address'));
 assert.ok(html.includes('Firebase’s secure reset page'));
 assert.ok(!(await read('dist/sitemap.xml')).includes('/verify-email'));
 const config = JSON.parse(await read('vercel.json'));
 const headers = config.headers.find(entry => entry.source === '/verify-email').headers;
 assert.ok(headers.some(header => header.key === 'Referrer-Policy' && header.value === 'no-referrer'));
 assert.ok(headers.some(header => header.key === 'Cache-Control' && header.value === 'no-store'));
});
