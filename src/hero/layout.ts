/**
 * Measures the DOM the scene lands on. Called on mount and on every ScrollTrigger
 * refresh — never per frame. All rects are relative to the top-left of .scene,
 * which during the pin is the top-left of the viewport.
 */
export interface Rect { x: number; y: number; w: number; h: number }

export interface PlaneInfo {
  slug: string;
  el: HTMLElement;
  gate: HTMLElement;
  /** The gate's rect in the settled grid: the exact pixels a plane lands on. */
  rect: Rect;
  src: string | null;
  featured: boolean;
  name: string;
  summary: string;
  sceneNo: string;
}

export interface Layout {
  vw: number;
  vh: number;
  /** The <h1>'s inline text box. */
  name: Rect;
  nameFontPx: number;
  nameTrackPx: number;
  /** The settled subtitle's inline text box: where the name lands in beat 4. */
  subtitle: Rect;
  planes: PlaneInfo[];
  statusStage: Rect;
  statusSettle: Rect;
}

const rel = (r: DOMRect, o: DOMRect): Rect => ({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height });

function textRect(el: Element): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect();
}

export function measureLayout(scene: HTMLElement, stage: HTMLElement): Layout {
  const o = scene.getBoundingClientRect();
  const nameEl = stage.querySelector<HTMLElement>('[data-name]')!;
  const subEl = scene.querySelector<HTMLElement>('[data-subtitle]')!;
  const cs = getComputedStyle(nameEl);
  const nameFontPx = parseFloat(cs.fontSize);

  const planes: PlaneInfo[] = [...scene.querySelectorAll<HTMLElement>('[data-sheet] .sheet__item')].map((el) => {
    const gate = el.querySelector<HTMLElement>('[data-gate]')!;
    const img = gate.querySelector<HTMLImageElement>('img[data-plane-src]');
    return {
      slug: el.dataset.project || '',
      el,
      gate,
      rect: rel(gate.getBoundingClientRect(), o),
      src: img ? img.currentSrc || img.src : null,
      featured: el.hasAttribute('data-featured'),
      name: el.dataset.name || '',
      summary: el.dataset.summary || '',
      sceneNo: el.dataset.sceneNo || '',
    };
  });

  const statusStage = stage.querySelector<HTMLElement>('[data-status]');
  const statusSettle = scene.querySelector<HTMLElement>('[data-status-settle]');
  const zero = { x: 0, y: 0, w: 0, h: 0 };

  return {
    vw: stage.clientWidth,
    vh: stage.clientHeight,
    name: rel(textRect(nameEl), o),
    nameFontPx,
    nameTrackPx: parseFloat(cs.letterSpacing) || 0,
    subtitle: rel(textRect(subEl), o),
    planes,
    statusStage: statusStage ? rel(statusStage.getBoundingClientRect(), o) : zero,
    statusSettle: statusSettle ? rel(statusSettle.getBoundingClientRect(), o) : zero,
  };
}
