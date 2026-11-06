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
  // The footer no longer names deletion; the pages whose words point to it still link it.
  if (['index', 'privacy', 'terms', 'support'].includes(page)) assert.ok(html.includes(`href="${link('delete-account')}"`), page);
  assert.ok(!/>Delete account<\/a><a href="https:\/\/github.com\/MufasaXz\/focusforge">Source code/.test(html), 'footer drops the deletion link');
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
test('homepage leads with Google Play and keeps the APK as a second choice', async () => {
 const html = await read('dist/index.html');
 assert.match(html, /https:\/\/github.com\/MufasaXz\/focusforge\/releases\/latest/);
 assert.ok(!html.includes('get-on-play'));
 assert.match(html, /class="play-badge" href="https:\/\/play.google.com\/store\/apps\/details\?id=dev.focusforge.focusforge" aria-label="Get it on Google Play"/);
 assert.match(html, /Or download the APK/);
 assert.ok(!html.includes('Get on Play Store'));
 assert.ok(!html.includes('Get on GitHub'));
 assert.match(html, /running on a real Android phone/);
});
test('home is one sheet with real screenshots in phone frames', async () => {
 const html = await read('dist/index.html');
 assert.equal((html.match(/class="op15[ "]/g) || []).length, 8, 'hero, two faces on each of three tools, and the closing phone');
 assert.equal((html.match(/aria-pressed="false"/g) || []).length, 3, 'one flip control per tool card');
 assert.equal((html.match(/class="tool-face tool-(?:lavender|white|sage) tool-back" aria-hidden="true" inert=""/g) || []).length, 3, 'light faces keep the card colour and start turned away and inert');
 assert.equal((html.match(/class="tool-label"/g) || []).length, 6, 'the label is printed on both faces so it turns with the card');
 for (const title of ['Close the feed', 'A timer that respects the work', 'Proof that it adds up']) assert.equal(html.split(`<h3>${title}</h3>`).length - 1, 1, `${title} appears once, not once per face`);
 assert.equal((html.match(/class="op15-camera"/g) || []).length, 8);
 assert.equal((html.match(/class="op15-key op15-(?:power|volume)"/g) || []).length, 16, 'power and volume on every phone');
 assert.ok(!html.includes('op15-status'), 'no drawn status bar over a real one');
 for (const text of ['class="sheet"', 'class="hero"', 'class="session"', 'class="footer-wordmark"', 'id="features"', 'id="privacy"', 'id="faq"', 'class="closing"', 'aria-label="Main navigation"']) assert.ok(html.includes(text), text);
 assert.ok(!html.includes('class="gallery"'), 'gallery removed');
 for (const image of ['focus-dark', 'focus-light', 'shield-dark', 'shield-light', 'home-dark', 'home-light']) assert.ok(html.includes(`images/shot-${image}.webp`), image);
 assert.match(html, /fetchpriority="high"/i);
 const provenance = JSON.parse(await read('public/images/provenance.json'));
 assert.match(provenance.description, /real|own Android phone/);
 for (const image of ['focus-dark', 'focus-light', 'shield-dark', 'shield-light', 'home-dark', 'home-light']) assert.ok(provenance.assets[`shot-${image}.webp`], image);
});
test('the phone header keeps the download beside a two-line menu button', async () => {
 const html = await read('dist/index.html');
 const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
 const download = header.indexOf('class="button button-outline header-download" href="https://play.google.com/store/apps/details?id=dev.focusforge.focusforge"');
 assert.ok(download > header.indexOf('</nav>'), 'the download sits in the bar, outside the links that collapse');
 assert.match(header, /<button class="menu-toggle" aria-expanded="false" aria-controls="navigation"><span class="menu-lines" aria-hidden="true"><\/span><span class="sr-only">Menu<\/span><\/button>/);
 assert.match(header, /aria-label="FocusForge home"/, 'the wordmark keeps its name when the narrowest phones hide the text');
});
test('home opens with its status and the footer offers the address and a way back up', async () => {
 const html = await read('dist/index.html');
 assert.match(html, /<p class="hero-status"><span class="status-dot" aria-hidden="true"><\/span>Now on Google Play · Free and open source<\/p>/);
 const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
 assert.match(footer, /<p class="mail-line"><a href="mailto:focusforgehelp@gmail\.com">focusforgehelp@gmail\.com<\/a><\/p>/, 'the address is a plain link before the copy button exists');
 assert.ok(footer.includes('href="#top"') && html.includes('class="sheet" id="top"'), 'back to top lands on the sheet');
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
 assert.ok(!html.includes('Achievements to earn'));
 for (const text of ['Downloads so far', 'Ads and trackers', 'Languages built in', 'Oldest Android it runs on', 'What never leaves your phone', 'never uploaded', 'here on the web']) assert.ok(html.includes(text), text);
 for (const pattern of [/testimonial/i, /\bstars?\b/i, /\bratings?\b/i, /aggregateRating/, /users trust/i]) assert.ok(!pattern.test(html), `no invented proof: ${pattern}`);
});
test('motion respects accessibility settings and deploy headers are present', async () => {
 assert.match(await read('src/styles.css'), /prefers-reduced-motion:reduce/);
 const config = JSON.parse(await read('vercel.json'));
 assert.equal(config.cleanUrls, true);
 assert.ok(config.headers[0].headers.some(header => header.key === 'Content-Security-Policy'));
});

test('the old closed-test address announces the launch and links to Google Play', async () => {
 const html = await read('dist/get-on-play.html');
 assert.ok(html.includes('FocusForge is on'));
 assert.ok(html.includes('href="https://play.google.com/store/apps/details?id=dev.focusforge.focusforge"'));
 assert.ok(!html.includes('apps/testing'), 'no tester sign-up links remain');
 assert.ok(!(await read('dist/sitemap.xml')).includes('get-on-play'));
 assert.ok(html.includes('name="robots" content="noindex"'));
 for (const page of ['index','privacy','support','terms','delete-account']) assert.ok(!(await read('dist/'+page+'.html')).includes('href="'+link('get-on-play')+'"'));
});

test('email verification is private, accessible and points resets at the email button', async () => {
 const html = await read('dist/verify-email.html');
 assert.match(html, /<h1/);
 assert.ok(html.includes('name="robots" content="noindex"'));
 assert.ok(html.includes('Enable JavaScript to confirm your email address'));
 assert.ok(html.includes('Reset password button in the email'));
 assert.ok(!(await read('dist/sitemap.xml')).includes('/verify-email'));
 const config = JSON.parse(await read('vercel.json'));
 const headers = config.headers.find(entry => entry.source === '/verify-email').headers;
 assert.ok(headers.some(header => header.key === 'Referrer-Policy' && header.value === 'no-referrer'));
 assert.ok(headers.some(header => header.key === 'Cache-Control' && header.value === 'no-store'));
});

test('the account email page is private and never prerenders a password form', async () => {
 const html = await read('dist/account-action.html');
 assert.ok(html.includes('name="robots" content="noindex"'));
 assert.ok(html.includes('Opening your link'));
 assert.ok(!html.includes('type="password"'), 'no form exists until the link is checked in the browser');
 assert.ok(!(await read('dist/sitemap.xml')).includes('/account-action'));
 const config = JSON.parse(await read('vercel.json'));
 const headers = config.headers.find(entry => entry.source === '/account-action').headers;
 assert.ok(headers.some(header => header.key === 'Referrer-Policy' && header.value === 'no-referrer'));
 assert.ok(headers.some(header => header.key === 'Cache-Control' && header.value === 'no-store'));
});

test('structured data names the organisation, the app, the questions and each guide', async () => {
 const blocks = async page => [...(await read(`dist/${page}.html`)).matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
 const [home] = await blocks('index');
 const types = home['@graph'].map(node => node['@type']);
 for (const type of ['Organization', 'WebSite', 'MobileApplication', 'FAQPage']) assert.ok(types.includes(type), type);
 const organization = home['@graph'].find(node => node['@type'] === 'Organization');
 assert.equal(organization.email, 'focusforgehelp@gmail.com');
 assert.ok(organization.sameAs.includes('https://github.com/MufasaXz/focusforge'));
 const app = home['@graph'].find(node => node['@type'] === 'MobileApplication');
 assert.equal(app.offers.price, '0');
 assert.ok(!('aggregateRating' in app), 'no invented ratings');
 const faq = home['@graph'].find(node => node['@type'] === 'FAQPage');
 const html = await read('dist/index.html');
 assert.equal(faq.mainEntity.length, (html.match(/<details>/g) || []).length, 'every visible question is in FAQPage and no more');
 for (const slug of ['pomodoro-technique', 'block-distracting-apps', 'study-habit']) {
  const [article] = await blocks(slug);
  assert.equal(article['@type'], 'Article');
  assert.ok(article.headline && article.datePublished && article.publisher.name === 'FocusForge', slug);
  const page = await read(`dist/${slug}.html`);
  assert.ok((page.match(/<p>/g) || []).length >= 8, `${slug} has real reading`);
  assert.ok(page.includes('<meta name="description" content="') && !page.includes('could not be found'), `${slug} description`);
  assert.ok((await read('dist/sitemap.xml')).includes(`/${slug}</loc>`), `${slug} in sitemap`);
 }
 assert.equal((await blocks('guides'))[0]['@type'], 'CollectionPage');
});
test('section headings vary; the two-line display is kept for the opening and closing', async () => {
 const html = await read('dist/index.html');
 assert.equal((html.match(/class="display"|class="heading"/g) || []).length, 2);
 assert.ok((html.match(/class="title"/g) || []).length >= 4);
});
