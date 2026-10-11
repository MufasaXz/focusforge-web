import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { readFile, writeFile } from 'node:fs/promises';
// Ship real HTML for every public route, including legal text with JS disabled.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
 const { default: App, ROUTES, pageTitles } = await vite.ssrLoadModule('/src/App.tsx');
 const template = await readFile('dist/index.html', 'utf8');
 const origin = process.env.SITE_URL?.replace(/\/$/, '');
 if (origin && !/^https:\/\/[a-zA-Z0-9.-]+$/.test(origin)) throw new Error('SITE_URL must be a public HTTPS origin without a path.');
 for (const path of [...ROUTES, '/404']) {
  const title = pageTitles[path] || 'Page not found — FocusForge';
  let html = template.replace('<div id="root"></div>', `<div id="root">${renderToString(createElement(App, { path }))}</div>`).replace(/<title>.*?<\/title>/, `<title>${title}</title>`).replace(/<meta property="og:title" content="[^"]*"\/>/, `<meta property="og:title" content="${title}"/>`);
  if (path !== '/') {
   const descriptions = { '/privacy': 'Read the FocusForge privacy policy: Android permissions, local data, Firebase accounts, optional sharing, retention and deletion.', '/terms': 'Terms of use for the FocusForge Android app and website.', '/support': 'Contact FocusForge support for installation, permissions, account and privacy help.', '/delete-account': 'Request FocusForge account and associated data deletion without reinstalling the app. Private email request and in-app instructions.' };
   const description = descriptions[path] || 'This FocusForge page could not be found.';
   html = html.replace(/<meta name="description" content="[^"]*"\/>/, `<meta name="description" content="${description}"/>`).replace(/<meta property="og:description" content="[^"]*"\/>/, `<meta property="og:description" content="${description}"/>`);
  }
  if (origin) html = html.replace('</head>', `<link rel="canonical" href="${origin}${path === '/' ? '/' : path}"/><meta property="og:url" content="${origin}${path}"/></head>`).replace('content="/og.png"', `content="${origin}/og.png"`);
  if (path === '/404') html = html.replace('</head>', '<meta name="robots" content="noindex"/></head>');
  await writeFile(path === '/' ? 'dist/index.html' : `dist/${path.slice(1)}.html`, html);
 }
 if (origin) {
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${ROUTES.map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`);
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
 } else {
  // No invented canonical deployment URL. Set SITE_URL for deployment builds.
  await writeFile('dist/robots.txt', 'User-agent: *\nAllow: /\n');
  console.warn('SITE_URL is unset: canonical URLs and sitemap omitted until the production origin is known.');
 }
} finally { await vite.close(); }
