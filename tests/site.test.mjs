import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = process.env.BASE_PATH || '/';
const link = path => `${base}${path}.html`;
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('assets and verified icon use the configured deployment base', async () => {
 const html = await read('dist/index.html');
 for (const path of ['favicon.png', 'images/focusforge-icon.png', 'images/dashboard.png', 'images/focus.png', 'fonts/Inter-Regular.ttf']) assert.ok(html.includes(`${base}${path}`), path);
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
 if (!process.env.SITE_URL) {
  assert.ok(!html.includes('rel="canonical"'));
  assert.ok(!(await read('dist/robots.txt')).includes('Sitemap:'));
  return;
 }
 const site = process.env.SITE_URL.replace(/\/$/, '');
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
test('motion respects accessibility settings and deploy headers are present', async () => {
 assert.match(await read('src/styles.css'), /prefers-reduced-motion:reduce/);
 const config = JSON.parse(await read('vercel.json'));
 assert.equal(config.cleanUrls, true);
 assert.ok(config.headers[0].headers.some(header => header.key === 'Content-Security-Policy'));
});
