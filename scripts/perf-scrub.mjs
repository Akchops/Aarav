#!/usr/bin/env node
/**
 * perf-scrub.mjs — immersive-scroll-engineer Gate 5 measurement.
 * Scrubs the whole Home pin at 390x844 under 4x CPU throttling and reports frame
 * times. Gate: p95 >= 55fps (<= 18.2ms) and no frame over 32ms during the scrub.
 *
 *   node scripts/perf-scrub.mjs "http://127.0.0.1:4173/?tier=1"
 *
 * Caveat: headless Chromium here renders WebGL with SwiftShader (CPU). That makes
 * this pessimistic for tier 1, and it is not a substitute for a real mid-range phone.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4173/?tier=1';
const rate = Number(process.argv[3] || 4);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const cdp = await ctx.newCDPSession(page);
await page.goto(url, { waitUntil: 'load' });
if (!/tier=3/.test(url)) await page.waitForSelector('.scene.is-handed', { timeout: 20000 });
await page.waitForTimeout(2000); // past the develop pre-roll and boot
await cdp.send('Emulation.setCPUThrottlingRate', { rate });

const total = await page.evaluate(() => {
  const st = document.querySelector('.pin-spacer');
  return st ? st.offsetHeight - innerHeight : document.documentElement.scrollHeight;
});
await page.evaluate(() => {
  window.__ft = [];
  let last = performance.now();
  const loop = (t) => { window.__ft.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
});
// ~8s of continuous scrubbing through the pin, like a steady thumb.
const steps = 160;
for (let i = 1; i <= steps; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round((total * i) / steps));
  await page.waitForTimeout(50);
}
await page.waitForTimeout(800);
const ft = await page.evaluate(() => { window.__stop = true; return window.__ft.slice(2); });
const tierInfo = await page.evaluate(() => (document.querySelector('.stage__fx') ? 'canvas mounted' : 'no canvas'));
await browser.close();

const sorted = [...ft].sort((a, b) => a - b);
const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const p95 = pct(0.95);
const over32 = ft.filter((d) => d > 32).length;
console.log(`perf-scrub ${url}  cpu x${rate}  390x844  (${tierInfo})`);
console.log(`  frames ${ft.length}  median ${pct(0.5).toFixed(1)}ms  p95 ${p95.toFixed(1)}ms (${(1000 / p95).toFixed(0)} fps)  max ${sorted.at(-1).toFixed(1)}ms  >32ms: ${over32}`);
console.log(`  gate (p95 <= 18.2ms and no frame > 32ms): ${p95 <= 18.2 && over32 === 0 ? 'PASS' : 'FAIL'}`);
if (errors.length) console.log('  errors:', errors);
