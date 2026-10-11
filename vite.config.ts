import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const requestedBase = process.env.BASE_PATH || '/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(requestedBase)) {
  throw new Error('BASE_PATH must be an absolute directory path with a trailing slash, e.g. /focusforge-web/.');
}
export default defineConfig({ base: requestedBase, plugins: [react()], build: { manifest: true } });
