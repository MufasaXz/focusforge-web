import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('every public route has meaningful pre-rendered HTML', async () => {
 for (const page of ['index', 'privacy', 'terms', 'support', 'delete-account']) {
  const html = await read(`dist/${page}.html`);
  assert.match(html, /<h1/);
  assert.match(html, /<main id="main"/);
  assert.match(html, /href="\/privacy"/);
  assert.match(html, /href="\/delete-account"/);
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
