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
  renderStatus,
} from '../src/work/render-grid';

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
          .replace('<!--@status:settle-->', renderStatus('status--settle', ' aria-hidden="true" data-status-settle'));

        // Dev-only worst-case toggle (break-ui). Never present in a production build.
        if (serve) {
          const opts = ['', ...Object.keys(fixtures)]
            .map((k) => `<option value="${k}"${k === fixtureName ? ' selected' : ''}>${k || 'Real data'}</option>`)
            .join('');
          out = out.replace(
            '</body>',
            `<label class="devtoggle">Demo data / Worst case <select onchange="const u=new URL(location.href);this.value?u.searchParams.set('fixture',this.value):u.searchParams.delete('fixture');location.href=u">${opts}</select></label>\n</body>`,
          );
        }
        return out;
      },
    },
  };
}
