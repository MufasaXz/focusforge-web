import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const requestedBase = process.env.BASE_PATH || '/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(requestedBase)) {
  throw new Error('BASE_PATH must be an absolute directory path with a trailing slash, e.g. /focusforge-web/.');
}
export default defineConfig({
  base: requestedBase,
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return;
          if (id.includes('/@firebase/firestore/')) return 'firebase-firestore';
          if (id.includes('/@firebase/auth/')) return 'firebase-auth';
          if (id.includes('/@firebase/')) return 'firebase-core';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react';
        },
      },
    },
  },
});
