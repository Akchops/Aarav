/**
 * Renders every data-driven part of the homepage from src/data/projects.ts:
 * Scroll Film 1's static layer, Featured Work, The Set's three pieces and Scroll
 * Film 2's frames. Pure string functions, run at build time by
 * plugins/site-html.ts, so every fact is in the served HTML without JavaScript.
 * No project name or image is hard-coded anywhere: it all comes from `projects`.
 */
import { featuredOf, PLACEHOLDER_IMAGE, type Project, type ProjectImage } from '../data/projects';
import { site } from '../data/site';
import { esc, renderContactRoutes, renderStatus, safeUrl } from '../work/render-grid';

const pad2 = (n: number) => String(n).padStart(2, '0');
/** Scene number = the project's position in the full projects array (nothing invented). */
const sceneNo = (all: Project[], p: Project) => `SC ${pad2(all.indexOf(p) + 1)}`;
const imageOf = (p?: Project): ProjectImage => (p && p.image) || PLACEHOLDER_IMAGE;
const todoAttr = (img: ProjectImage) => (img.todo ? ' data-todo="placeholder image"' : '');

function img(image: ProjectImage, cls: string, alt = image.alt, extra = ''): string {
  return `<img class="${cls}" src="${esc(image.src)}" alt="${esc(alt)}" width="${image.width}" height="${image.height}" decoding="async"${todoAttr(image)}${extra}>`;
}

/** Scroll Film 1, static layer: the name (h1, real text), role line and status. */
export function renderReveal(): string {
  return `<section id="reveal" class="reveal" aria-labelledby="name">
  <div class="reveal__stage" data-reveal-stage>
    <div class="reveal__copy">
      <h1 class="reveal__name" id="name" data-reveal-name>${esc(site.brand)}</h1>
      <p class="reveal__role" data-reveal-role>${esc(site.role)}</p>
    </div>
    ${renderStatus('reveal__status', ' data-reveal-status')}
  </div>
</section>`;
}

/** Featured Work. Returns '' when nothing is featured: the section is left out. */
export function renderFeatured(all: Project[]): string {
  const list = featuredOf(all);
  if (list.length === 0) return '';
  const items = list
    .map((p) => {
      const url = safeUrl(p.url);
      const image = imageOf(p);
      const name = esc(p.name);
      const media = url
        ? `<a class="gate__clip" href="${esc(url)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${img(image, 'gate__img')}</a>`
        : `<span class="gate__clip">${img(image, 'gate__img')}</span>`;
      const action = url
        ? `<a class="fframe__link link" href="${esc(url)}" target="_blank" rel="noopener">Visit ${name}<span class="vh"> (opens in a new tab)</span></a>`
        : `<p class="fframe__nolink">Link not yet published</p>`;
      return `<li class="fsheet__item" data-slug="${esc(p.slug)}">
  <article class="fframe">
    <figure class="gate gate--1610">${media}</figure>
    <div class="fslate"><span class="fslate__no">${sceneNo(all, p)}</span><span aria-hidden="true"> · </span><h3 class="fslate__name">${name}</h3><span aria-hidden="true"> · </span><p class="fslate__sum">${esc(p.summary)}</p></div>
    ${action}
  </article>
</li>`;
    })
    .join('\n');
  return `<section id="featured" class="featured" aria-labelledby="featured-h">
  <h2 class="label featured__h" id="featured-h">Featured work</h2>
  <ol class="fsheet" data-count="${list.length}" role="list">
${items}
  </ol>
  <p class="featured__more"><a class="link" href="/work/">See all work</a></p>
</section>`;
}

/**
 * The Set. Strip: five frames, featured first, then honest empty frames. Lens:
 * featured[0]'s image. Develop: featured[1]'s image (else featured[0], else the
 * placeholder). Before the reveal completes, each piece shows a locked frame.
 */
export function renderSet(all: Project[]): string {
  const list = featuredOf(all);
  const lock = `<p class="piece__lock" aria-hidden="true">Unlocks after the reveal</p>`;

  const frames: string[] = [];
  for (let i = 0; i < 5; i++) {
    const p = list[i];
    if (p) {
      frames.push(`<button class="sframe" type="button" data-sframe aria-label="${sceneNo(all, p)} · ${esc(p.name)}, frame ${i + 1} of 5. Drag to throw it, or press Enter to move it.">
        <span class="sframe__img">${img(imageOf(p), '', '', ' draggable="false"')}</span>
        <span class="sframe__slate" aria-hidden="true">${sceneNo(all, p)} · ${esc(p.name)}</span>
      </button>`);
    } else {
      frames.push(`<button class="sframe sframe--empty" type="button" data-sframe aria-label="Empty frame, frame ${i + 1} of 5. Drag to throw it, or press Enter to move it.">
        <span class="sframe__img"><span class="sframe__empty">Empty frame</span></span>
        <span class="sframe__slate" aria-hidden="true">Empty frame</span>
      </button>`);
    }
  }

  const lensP = list[0];
  const lensImg = imageOf(lensP);
  const devP = list[1] || list[0];
  const devImg = imageOf(devP);
  const devName = devP ? esc(devP.name) : 'placeholder';

  return `<section id="set" class="set" aria-labelledby="set-h">
  <h2 class="set__h" id="set-h">The Set</h2>
  <p class="set__lede">Three things to play with.</p>
  <ol class="pieces" role="list">
    <li class="piece piece--strip">
      ${lock}
      <div class="piece__body"><div class="strip" data-strip>${frames.join('\n')}</div><p class="piece__cap" data-strip-cap>Strip, needs JavaScript</p></div>
    </li>
    <li class="piece piece--lens">
      ${lock}
      <figure class="piece__body lens" data-lens>
        <button class="lens__btn" type="button" data-lens-btn aria-label="Lens over ${lensP ? esc(lensP.name) : 'the placeholder image'}. Move the pointer over the image to magnify it, or press Enter to move the lens.">
          ${img(lensImg, 'lens__img', lensImg.alt, ' data-lens-img')}
        </button>
        <figcaption class="piece__cap" data-lens-cap>Lens, needs JavaScript</figcaption>
      </figure>
    </li>
    <li class="piece piece--develop">
      ${lock}
      <figure class="piece__body develop" data-develop>
        <button class="develop__btn" type="button" aria-pressed="false" data-develop-btn aria-label="Develop the ${devName} still. Hold to develop, or press Enter.">
          <span class="develop__img" data-develop-img>${img(devImg, '', devImg.alt)}</span>
          <span class="develop__label" aria-hidden="true">Hold to develop</span>
          <span class="develop__done" aria-hidden="true">Developed</span>
        </button>
        <figcaption class="piece__cap" data-develop-cap>Develop, needs JavaScript</figcaption>
      </figure>
    </li>
  </ol>
</section>`;
}

/**
 * Scroll Film 2. The featured frames (aria-hidden copies: the real links are in
 * Featured Work) gather into a stack; the top frame's own image becomes the full
 * frame; then it shrinks into a slate under the closing copy. With nothing
 * featured, only the closing slate remains.
 */
export function renderClose(all: Project[]): string {
  const list = featuredOf(all);
  const top = list[0];
  const stack = list
    .map(
      (p, i) => `<figure class="cframe" data-close-frame data-i="${i}">
      <span class="cframe__img">${img(imageOf(p), '', '')}</span>
      <figcaption class="cframe__slate">${sceneNo(all, p)} · ${esc(p.name)}</figcaption>
    </figure>`,
    )
    .join('\n');
  const full = top
    ? `<div class="close__full" data-close-full>
      <div class="close__full-clip" data-close-clip>${img(imageOf(top), 'close__full-img', imageOf(top).alt, ' data-close-img')}</div>
      <div class="close__caption" data-close-caption>
        <p class="close__caption-no">${sceneNo(all, top)}</p>
        <p class="close__caption-name">${esc(top.name)}</p>
        <p class="close__caption-link">${safeUrl(top.url) ? `<a class="link" href="${esc(safeUrl(top.url)!)}" target="_blank" rel="noopener">Visit ${esc(top.name)}<span class="vh"> (opens in a new tab)</span></a>` : 'Link not yet published'}</p>
      </div>
    </div>`
    : '';
  return `<section id="close" class="close" data-count="${list.length}" aria-labelledby="close-h">
  <div class="close__stage" data-close-stage>
    ${list.length ? `<div class="close__stack" aria-hidden="true" data-close-stack>${stack}</div>` : ''}
    ${full}
    <div class="close__copy" data-close-copy>
      <h2 class="close__h" id="close-h"><a class="button" href="/contact/" data-press>Start a project</a></h2>
      ${renderContactRoutes()}
      ${renderStatus('close__status')}
    </div>
  </div>
</section>`;
}
