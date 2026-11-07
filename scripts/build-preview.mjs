#!/usr/bin/env node
/**
 * build-preview.mjs — the Home page as ONE self-contained HTML file, for a private
 * preview (e.g. an artifact). Nothing here touches dist/ or the site build.
 *
 *   npm run build:preview   ->   preview/aarav-home.html
 *
 * - One JS bundle (dynamic imports inlined): GSAP, Three.js and both canvas tiers
 *   are in the file; the probe still picks the tier at runtime, nothing is fetched.
 * - JS and CSS inlined in <script>/<style>; fonts (latin subset) and images as
 *   data URIs; internal links rewritten to relative paths.
 * - Fails if anything that could trigger a request is left in the output.
 */
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('.');
const tmp = join(root, 'preview/.build');
const outFile = join(root, 'preview/aarav-home.html');

rmSync(tmp, { recursive: true, force: true });
// Home only, one bundle: see vite.preview.config.ts. (The config is bundled by Vite,
// which is what lets it import the plugin's extensionless TypeScript.)
process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
await build({ configFile: join(root, 'vite.preview.config.ts') });

let html = readFileSync(join(tmp, 'index.html'), 'utf8');
const b64 = (p) => readFileSync(p).toString('base64');

// ---- CSS: inline, keeping only the latin @font-face blocks, woff2 as data URIs ----
const cssHref = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/.exec(html);
if (!cssHref) throw new Error('no stylesheet link found');
let css = readFileSync(join(tmp, cssHref[1]), 'utf8');
let kept = 0, dropped = 0;
css = css.replace(/@font-face\{[^}]*\}/g, (block) => {
  // Every character on the page is in U+0000-00FF or the latin block's extras
  // (— · × ’), which fontsource's latin range covers. Other subsets never load.
  // The minifier rewrites U+0000-00FF as U+00?? or U+??: accept every spelling.
  if (!/unicode-range:\s*U\+(?:0*-0*FF|0*\?\?)(?=[,;}\s])/i.test(block)) { dropped++; return ''; }
  const w2 = /url\(([^)]+\.woff2)\)\s*format\(["']?([\w-]+)["']?\)/.exec(block);
  if (!w2) throw new Error('latin @font-face without woff2: ' + block.slice(0, 80));
  kept++;
  const data = `url(data:font/woff2;base64,${b64(join(tmp, w2[1]))}) format("${w2[2]}")`;
  return block.replace(/src:[^;}]+/, `src:${data}`);
});
html = html.replace(cssHref[0], `<style>${css}</style>`);

// ---- JS: one module, inlined; escape sequences that would end the script early ----
const jsSrc = /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/.exec(html);
if (!jsSrc) throw new Error('no module script found');
let js = readFileSync(join(tmp, jsSrc[1]), 'utf8');
const escapes = (js.match(/<\/script|<!--/gi) || []).length;
js = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
html = html.replace(jsSrc[0], () => `<script type="module">${js}</script>`);

// ---- Images (public/): data URIs wherever referenced ----
const svgData = (p) => `data:image/svg+xml;base64,${b64(join(root, 'public', p))}`;
html = html.replace(/(["'])\/((?:img\/[^"']+|favicon)\.svg)\1/g, (_, q, p) => `${q}${svgData(p)}${q}`);

// ---- Relative links only ----
html = html
  .replace(/href="\/"/g, 'href="./"')
  .replace(/href="\/(work|about|contact)\/"/g, 'href="$1/"');

// ---- Guard: nothing that could fetch may remain ----
const problems = [];
for (const [re, what] of [
  [/\/assets\//, '/assets/ path'],
  [/["']\/img\//, '/img/ path'],
  [/\b(?:src|href)=["']\/(?!\/)/, 'root-absolute src/href'],
  [/url\(\s*["']?\//, 'root-absolute url()'],
  [/@import/, '@import'],
  [/<link[^>]+rel=["']?(?:stylesheet|modulepreload|preload|prefetch)/i, 'external link tag'],
  [/<script[^>]+src=/i, 'external script'],
]) if (re.test(html)) problems.push(what);
// Absolute URLs that appear only as strings are not fetches: SVG/XML namespaces,
// and the library home pages GSAP and three.js print in console warnings.
// Anything else is reported.
const urls = [...new Set(html.match(/https?:\/\/[^\s"'`)<>\\]+/g) || [])];
const allowed = urls.filter((u) => /^http:\/\/www\.w3\.org\//.test(u) || /^https:\/\/(threejs\.org|gsap\.com|greensock\.com)(\/|$)/.test(u));
const unexpected = urls.filter((u) => !allowed.includes(u));
if (unexpected.length) problems.push('unexpected absolute URLs: ' + unexpected.join(', '));
// Archivo, Instrument Sans, Plex Mono 400 and 500: four latin faces, or the page
// would silently fall back to system fonts.
if (kept !== 4) problems.push(`expected 4 latin @font-face blocks, kept ${kept}`);
if (problems.length) {
  console.error('build-preview: FAIL\n  ' + problems.join('\n  '));
  process.exit(1);
}

mkdirSync(join(root, 'preview'), { recursive: true });
writeFileSync(outFile, html);

// ---- Artifact variant ----
// An artifact host wraps the file in its own doctype/head/body (charset, viewport
// with viewport-fit=cover), so that variant carries only page content: a name for
// the gallery, the boot script, the styles, the module bundle and the body.
const headPart = /<head>([\s\S]*?)<\/head>/.exec(html)[1];
const bodyPart = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)[1];
const headKeep = [...headPart.matchAll(/<style>[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>/g)].map((m) => m[0]);
const artifact = [
  '<title>Aarav Portfolio Home</title>',
  "<script>document.documentElement.lang = 'en';</script>",
  ...headKeep,
  bodyPart.trim(),
].join('\n');
const artifactFile = join(root, 'preview/aarav-home-artifact.html');
writeFileSync(artifactFile, artifact);
rmSync(tmp, { recursive: true, force: true });
const kb = statSync(outFile).size / 1024;
console.log(`build-preview: ${outFile}`);
console.log(`  artifact variant ${artifactFile} (${(statSync(artifactFile).size / 1024).toFixed(1)} kB)`);
console.log(`  size ${kb.toFixed(1)} kB  (fonts kept ${kept}, dropped ${dropped}; script escapes ${escapes}; string URLs allowed: ${allowed.length})`);
