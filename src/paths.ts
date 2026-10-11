export const base = import.meta.env.BASE_URL;
export const asset = (path: string) => `${base}${path.replace(/^\//, '')}`;
// Explicit .html routes work on GitHub Pages, Vercel and basic static hosts.
export const pageLink = (path: string) => {
  if (path === '/') return base;
  if (path.startsWith('/#')) return `${base}${path.slice(1)}`;
  return `${base}${path.replace(/^\//, '')}.html`;
};
export function currentRoute(pathname: string) {
  const prefix = base.replace(/\/$/, '');
  const local = prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`)) ? pathname.slice(prefix.length) : pathname;
  return local.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
}
