#!/usr/bin/env node
/** Runs the first-load budget check for every built page. Exit 1 if any page is over. */
import { execFileSync } from 'node:child_process';
const pages = ['index.html', 'work/index.html', 'about/index.html', 'contact/index.html'];
let failed = false;
for (const p of pages) {
  try {
    process.stdout.write(execFileSync('node', ['scripts/first-load-budget.mjs', 'dist/', '--html', `dist/${p}`], { encoding: 'utf8' }));
  } catch (e) {
    process.stdout.write(e.stdout || String(e));
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
