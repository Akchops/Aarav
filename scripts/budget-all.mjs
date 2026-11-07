#!/usr/bin/env node
/**
 * Runs the first-load budget check (scripts/first-load-budget.mjs) for every built
 * page, then adds the entry's static-import chunks: with modulePreload off they are
 * not declared in the HTML, so the per-page script cannot see them. Exit 1 if over.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const LIMIT_KB = 100;
const pages = ['index.html', 'work/index.html', 'about/index.html', 'contact/index.html'];
const gz = (p) => gzipSync(readFileSync(p), { level: 9 }).length;
let failed = false;

for (const p of pages) {
  const out = execFileSync('node', ['scripts/first-load-budget.mjs', 'dist/', '--html', `dist/${p}`], { encoding: 'utf8' });
  const total = Number(/TOTAL\s+([\d.]+) kB/.exec(out)[1]) * 1024;
  const html = readFileSync(`dist/${p}`, 'utf8');
  const entry = /<script type="module"[^>]*src="([^"]+)"/.exec(html)[1];
  const code = readFileSync(join('dist', entry), 'utf8');
  // Static imports only (import{..}from"./x.js" / import"./x.js"), not import().
  const statics = [...code.matchAll(/(?:^|[;\s])import(?:[^()'"]*?from)?\s*["'](\.\/[^"']+\.js)["']/g)].map((m) => m[1]);
  const extra = statics.reduce((n, s) => n + gz(join('dist/assets', s.replace('./', ''))), 0);
  const sum = total + extra;
  const ok = sum <= LIMIT_KB * 1024;
  if (!ok) failed = true;
  console.log(`${p.padEnd(20)} ${(sum / 1024).toFixed(1).padStart(5)} kB gzip  (html+css+entry ${(total / 1024).toFixed(1)} + static chunks ${(extra / 1024).toFixed(1)}: ${statics.join(', ') || 'none'})  ${ok ? 'PASS' : 'FAIL'}`);
}
process.exit(failed ? 1 : 0);
