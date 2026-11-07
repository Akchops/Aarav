import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { siteHtml } from './plugins/site-html';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  appType: 'mpa',
  plugins: [siteHtml()],
  server: { host: true },
  build: {
    target: 'es2022',
    // Every evergreen browser supports modulepreload; the polyfill is dead weight.
    modulePreload: { polyfill: false },
    // The Three.js chunk (~135 kB gz) is lazy by design; it never counts against first load.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        home: r('./index.html'),
        work: r('./work/index.html'),
        about: r('./about/index.html'),
        contact: r('./contact/index.html'),
      },
    },
  },
});
