/**
 * Pure HTML renderers for the contact-sheet grid and shared page chrome.
 * Run at build time (and on the dev server) by plugins/site-html.ts, so every
 * piece of content exists in the served HTML without JavaScript.
 */
import type { Project } from '../data/projects';
import { site } from '../data/site';

/** Escape text for HTML element content and attribute values. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only http(s) URLs are ever linked; anything else is treated as missing. */
export function safeUrl(u?: string): string | null {
  if (!u) return null;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
const sceneNo = (i: number) => `SC ${String(i + 1).padStart(2, '0')}`;

export function renderGrid(projects: Project[], heading: 'h2' | 'h3'): string {
  if (projects.length === 0) {
    return `<div class="sheet sheet--empty" data-sheet data-count="0">
  <p class="slate"><span>SC 00</span><span>No projects to show yet</span></p>
  <p class="sheet__empty">Projects will appear here once they are published. <a class="link" href="/contact/">Start a project</a></p>
</div>`;
  }

  // The featured project is the one the Home scene brings to full frame.
  const featuredIndex = Math.max(0, projects.findIndex((p) => p.featured));

  const items = projects
    .map((p, i) => {
      const slug = slugOf(p.slug);
      const url = safeUrl(p.url);
      const name = esc(p.name);
      const img = p.image
        ? `<img class="gate__img" src="${esc(p.image.src)}" alt="${esc(p.image.alt)}" width="${p.image.width}" height="${p.image.height}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" data-plane-src="${esc(p.image.src)}"${p.image.todo ? ' data-todo="placeholder image"' : ''}>`
        : // TODO-free fallback: a typographic frame, so a missing image never leaves a hole.
          `<span class="gate__blank" role="img" aria-label="No image yet for ${name}"><span aria-hidden="true">${name}</span></span>`;
      // .gate__clip clips the image (hover scale) while the gate's crosses sit outside it.
      const media = url
        ? `<a class="gate__clip gate__link" href="${esc(url)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${img}</a>`
        : `<span class="gate__clip">${img}</span>`;
      const action = url
        ? `<a class="frame__link link" href="${esc(url)}" target="_blank" rel="noopener">Visit live site<span class="vh"> (${name}, opens in a new tab)</span></a>`
        : `<p class="frame__nolink">Link not yet published</p>`;

      return `<li class="sheet__item" data-project="${slug}"${i === featuredIndex ? ' data-featured' : ''} data-name="${name}" data-summary="${esc(p.summary)}" data-scene-no="${sceneNo(i)}">
  <article class="frame">
    <figure class="gate" data-gate>${media}</figure>
    <div class="frame__meta">
      <span class="frame__no" aria-hidden="true">${sceneNo(i)}</span>
      <${heading} class="frame__name">${name}</${heading}>
    </div>
    <p class="frame__summary">${esc(p.summary)}</p>
    ${action}
  </article>
</li>`;
    })
    .join('\n');

  return `<ol class="sheet" data-sheet data-count="${projects.length}" role="list">
${items}
</ol>`;
}

type Page = 'home' | 'work' | 'about' | 'contact';

export function renderHeader(page: Page): string {
  const link = (href: string, label: string, key: Page) =>
    `<li><a class="nav__link" href="${href}"${page === key ? ' aria-current="page"' : ''}>${label}</a></li>`;
  return `<header class="site-header">
  <a class="brand" href="/"${page === 'home' ? ' aria-current="page"' : ''}>
    <span class="brand__name">${esc(site.brand)}</span><span class="brand__role">${esc(site.role)}</span>
  </a>
  <nav class="nav" aria-label="Primary">
    <ul role="list">
      ${link('/work/', 'Work', 'work')}
      ${link('/about/', 'About', 'about')}
      ${link('/contact/', 'Contact', 'contact')}
    </ul>
  </nav>
</header>`;
}

export function renderStatus(extraClass = '', attrs = ''): string {
  return `<p class="status ${extraClass}"${attrs}><span class="tally" aria-hidden="true"></span><span>${esc(site.status)}</span></p>`;
}

export function renderContactRoutes(): string {
  return `<ul class="routes" role="list">
  <li><a class="route" href="${site.mailto}"><span class="route__label">Email</span><span class="route__value">${esc(site.email)}</span></a></li>
  <li><a class="route" href="${site.whatsapp}" target="_blank" rel="noopener"><span class="route__label">WhatsApp</span><span class="route__value">Message on WhatsApp<span class="vh"> (opens in a new tab)</span></span></a></li>
  <li><a class="route" href="${site.phoneTel}"><span class="route__label">Call</span><span class="route__value">${esc(site.phoneDisplay)}</span></a></li>
</ul>`;
}

export function renderFooter(): string {
  return `<footer class="site-footer">
  <div class="site-footer__row">
    ${renderStatus('status--footer')}
    <a class="link" href="${site.mailto}">${esc(site.email)}</a>
  </div>
  <p class="site-footer__fine"><span>${esc(site.brand)} — ${esc(site.role)}</span><span aria-hidden="true">END OF REEL</span></p>
</footer>`;
}

/**
 * Homepage header: not pinned. Name left, Archive + Contact right, and the status
 * line. On narrow screens the status sits under the name inside the same row
 * (name + two links + an 18-character status cannot share one 288px line).
 */
export function renderHomeHeader(): string {
  return `<header class="hhead">
  <div class="hhead__id">
    <a class="hhead__name" href="/" aria-current="page">${esc(site.brand)}</a>
    ${renderStatus('hhead__status')}
  </div>
  <nav class="hhead__nav" aria-label="Primary">
    <ul role="list">
      <li><a class="nav__link" href="/work/">Archive</a></li>
      <li><a class="nav__link" href="/contact/">Contact</a></li>
    </ul>
  </nav>
</header>`;
}

/** Homepage footer: the three contact routes as real links, and the status line. */
export function renderHomeFooter(): string {
  return `<footer class="hfoot">
  <h2 class="label hfoot__h">Contact</h2>
  ${renderContactRoutes()}
  ${renderStatus('status--footer')}
  <p class="site-footer__fine"><span>${esc(site.brand)} — ${esc(site.role)}</span></p>
</footer>`;
}
