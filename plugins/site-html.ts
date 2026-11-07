/**
 * Build-time HTML partials. Replaces <!--@...--> markers in each page with HTML
 * rendered from src/data/*.ts, so the Work grid, header, footer and contact
 * routes come from one source and exist without JavaScript.
 *
 * break-ui fixtures: PROJECTS_FIXTURE=<name> at build, or ?fixture=<name> in dev.
 */
import type { Plugin } from 'vite';
import { projects } from '../src/data/projects';
import { fixtures } from '../src/data/fixtures';
import {
  renderContactRoutes,
  renderFooter,
  renderGrid,
  renderHeader,
  renderHomeFooter,
  renderHomeHeader,
  renderStatus,
} from '../src/work/render-grid';
import { renderClose, renderFeatured, renderReveal, renderSet } from '../src/home/featured';

type Page = 'home' | 'work' | 'about' | 'contact';

function pageOf(path: string): Page {
  if (/\/work\//.test(path)) return 'work';
  if (/\/about\//.test(path)) return 'about';
  if (/\/contact\//.test(path)) return 'contact';
  return 'home';
}

export function siteHtml(): Plugin {
  let serve = false;
  return {
    name: 'aarav-site-html',
    configResolved(c) {
      serve = c.command === 'serve';
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = pageOf(ctx.path || ctx.filename);

        let fixtureName = process.env.PROJECTS_FIXTURE || '';
        if (serve && ctx.originalUrl) {
          const q = new URL(ctx.originalUrl, 'http://x').searchParams.get('fixture');
          if (q) fixtureName = q;
        }
        const data = fixtureName && fixtures[fixtureName] ? fixtures[fixtureName] : projects;

        let out = html
          .replace('<!--@header-->', renderHeader(page))
          .replace('<!--@footer-->', renderFooter())
          .replace('<!--@grid:h2-->', renderGrid(data, 'h2'))
          .replace('<!--@grid:h3-->', renderGrid(data, 'h3'))
          .replace('<!--@contact-routes-->', renderContactRoutes())
          .replace('<!--@status-->', renderStatus('', ' data-status'))
          .replace('<!--@status:settle-->', renderStatus('status--settle', ' aria-hidden="true" data-status-settle'))
          // Homepage: every section rendered from projects.ts / site.ts.
          .replace('<!--@home:header-->', renderHomeHeader())
          .replace('<!--@home:reveal-->', renderReveal())
          .replace('<!--@home:set-->', renderSet(data))
          .replace('<!--@home:featured-->', renderFeatured(data))
          .replace('<!--@home:close-->', renderClose(data))
          .replace('<!--@home:footer-->', renderHomeFooter());

        // Dev-only worst-case toggle (break-ui): a segmented control, bottom-centre,
        // swapping the fixture at the data boundary via ?fixture=. Never in a build.
        if (serve) {
          const seg = (key: string, label: string) => {
            const href = key ? `?fixture=${key}` : '?';
            return `<a href="${href}"${key === fixtureName ? ' aria-current="true"' : ''}>${label}</a>`;
          };
          const segs = [seg('', 'Demo data'), seg('long', 'Worst case'), ...Object.keys(fixtures).filter((k) => k !== 'long').map((k) => seg(k, k[0].toUpperCase() + k.slice(1)))].join('');
          out = out.replace('</body>', `<nav class="devtoggle" aria-label="Demo data / Worst case (dev only)">${segs}</nav>\n</body>`);
        }
        return out;
      },
    },
  };
}
