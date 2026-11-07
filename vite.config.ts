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
    // No <link rel="modulepreload">: with JavaScript disabled the browser still
    // fetches (and blocks) preloaded modules, which shows up as a failed request.
    // The only static import is the 0.6 kB boot chunk; budget-all counts it.
    modulePreload: false,
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
