/**
 * Build config for the single-file Home preview (scripts/build-preview.mjs).
 * Home only, one JS bundle with every dynamic import inlined. Not the site build.
 */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { siteHtml } from './plugins/site-html';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  appType: 'mpa',
  logLevel: 'warn',
  plugins: [siteHtml()],
  build: {
    outDir: r('./preview/.build'),
    emptyOutDir: true,
    target: 'es2022',
    modulePreload: false,
    cssCodeSplit: false,
    // Fonts are inlined by the script, after dropping the non-latin subsets.
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: { home: r('./index.html') },
      // One chunk: every dynamic import (GSAP, the WebGL and Canvas 2D tiers) is inlined.
      output: { codeSplitting: false },
    },
  },
});
