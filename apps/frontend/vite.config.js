import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// GitHub Pages usually serves project sites at:
//   https://<user-or-org>.github.io/<repo>/
// Set VITE_BASE_PATH=/your-repo-name/ in the Pages workflow.
// For a custom domain or a user/org root Pages site, use VITE_BASE_PATH=/.
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  root: here,
  base,
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    fs: {
      allow: [resolve(here, '../..')]
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
