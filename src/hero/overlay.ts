/**
 * The DOM layer over the canvas: corridor slates, the beat-3 card, the role line,
 * the timecode, and the beat-5 settle (status FLIP + CTA wipe). Labels stay in the
 * DOM, never in WebGL (scroll-linked-3d): the real content lives in the grid below.
 * Writes transform / opacity / clip-path / textContent only — never layout.
 */
import { clamp01, easeInOut, easeOut } from '../motion/easing';
import type { Frame, SceneModel } from './model';

const pad = (n: number) => String(n).padStart(2, '0');

/** Write a style property only when it changed: no redundant style invalidation per frame. */
const cache = new WeakMap<HTMLElement, Record<string, string>>();
function set(el: HTMLElement, prop: string, value: string) {
  let c = cache.get(el);
  if (!c) cache.set(el, (c = {}));
  if (c[prop] === value) return;
  c[prop] = value;
  el.style.setProperty(prop, value);
}

export class Overlay {
  private labels: HTMLElement[] = [];
  private readonly role: HTMLElement | null;
  private readonly timecode: HTMLElement | null;
  private readonly card: HTMLElement | null;
  private readonly statusSettle: HTMLElement | null;
  private readonly cta: HTMLElement | null;
  private flip = { dx: 0, dy: 0 };
  private lastTc = '';
  private model: SceneModel | null = null;

  constructor(scene: HTMLElement, private readonly stage: HTMLElement) {
    this.role = stage.querySelector('.stage__role');
    this.timecode = stage.querySelector('[data-timecode]');
    this.card = stage.querySelector('[data-card]');
    this.statusSettle = scene.querySelector('[data-status-settle]');
    this.cta = scene.querySelector('[data-cta]');
  }

  setup(model: SceneModel) {
    this.model = model;
    const { layout } = model;
    const host = this.stage.querySelector<HTMLElement>('[data-labels]');
    if (host) {
      host.replaceChildren();
      this.labels = layout.planes.map((p) => {
        const el = document.createElement('p');
        el.className = 'stage__label';
        el.textContent = `${p.sceneNo} · ${p.name}`;
        el.style.opacity = '0';
        host.appendChild(el);
        return el;
      });
    }
    const featured = layout.planes.find((p) => p.featured) ?? layout.planes[0];
    if (this.card && featured) {
      this.card.querySelector('[data-card-slate]')!.textContent = `${featured.sceneNo} · Full frame`;
      this.card.querySelector('[data-card-name]')!.textContent = featured.name;
      this.card.querySelector('[data-card-summary]')!.textContent = featured.summary;
    }
    // Beat 5 FLIP: the settled status starts exactly where the stage status sits.
    this.flip = {
      dx: layout.statusStage.x - layout.statusSettle.x,
      dy: layout.statusStage.y - layout.statusSettle.y,
    };
  }

  apply(f: Frame) {
    const m = this.model;
    if (!m) return;

    set(this.stage, 'opacity', f.overlay.toFixed(3));
    // Once the overlay is going, the grid beneath must be clickable.
    set(this.stage, 'pointer-events', f.overlay < 0.5 ? 'none' : 'auto');
    set(this.stage, 'visibility', f.overlay < 0.001 ? 'hidden' : 'visible');
    if (this.role) set(this.role, 'opacity', f.role.toFixed(3));

    // Timecode: an honest readout of scroll position, 1 film frame per 8px, 24fps.
    if (this.timecode) {
      const frames = Math.floor(Math.max(0, scrollY) / 8);
      const tc = `${pad(Math.floor(frames / 86400))}:${pad(Math.floor(frames / 1440) % 60)}:${pad(Math.floor(frames / 24) % 60)}:${pad(frames % 24)}`;
      if (tc !== this.lastTc) this.timecode.textContent = this.lastTc = tc;
    }

    // Corridor slates, hung just under each frame's lower-left corner.
    this.labels.forEach((el, i) => {
      const p = f.planes[i];
      const o = f.labels[i] ?? 0;
      if (!p || o < 0.01) {
        set(el, 'opacity', '0');
        return;
      }
      const lx = -p.w / 2;
      const c = Math.cos(p.rotY), s = Math.sin(p.rotY);
      const q = m.project({ x: p.x + lx * c, y: p.y - p.h / 2, z: p.z - lx * s }, f.cam);
      if (q.behind) {
        set(el, 'opacity', '0');
        return;
      }
      set(el, 'opacity', o.toFixed(3));
      set(el, 'transform', `translate3d(${q.x.toFixed(1)}px, ${(q.y + 10).toFixed(1)}px, 0)`);
    });

    if (this.card) {
      set(this.card, 'opacity', f.card.toFixed(3));
      set(this.card, 'transform', `translate3d(0, ${f.cardShift.toFixed(1)}px, 0)`);
    }

    // Beat 5: status glides from its stage position into the settled header row,
    // and "Start a project" wipes in (clip-path) after it.
    const e = easeInOut(f.settle);
    if (this.statusSettle) {
      set(this.statusSettle, 'transform', `translate3d(${(this.flip.dx * (1 - e)).toFixed(1)}px, ${(this.flip.dy * (1 - e)).toFixed(1)}px, 0)`);
    }
    if (this.cta) {
      const w = easeOut(clamp01((f.settle - 0.25) / 0.75));
      set(this.cta, 'clip-path', w >= 1 ? 'none' : `inset(0 ${((1 - w) * 100).toFixed(2)}% 0 0)`);
    }
  }

  reset() {
    for (const el of [this.stage, this.role, this.card, this.statusSettle, this.cta]) {
      if (!el) continue;
      el.style.removeProperty('opacity');
      el.style.removeProperty('transform');
      el.style.removeProperty('clip-path');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('visibility');
      cache.delete(el);
    }
    this.labels.forEach((l) => l.remove());
    this.labels = [];
  }
}
