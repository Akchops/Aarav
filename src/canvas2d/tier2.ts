/**
 * Tier 2 — Canvas 2D. The same beats and the same interactions as tier 1, minus
 * the per-pixel distortion: the reveal's 120 cells are drawImage sub-rects, and
 * each lens is a clip-path circle drawn magnified, with the offset colour
 * channels shown as a thin outline at the rim (red pushed out, silver pulled in).
 */
import type { LensRenderer, LensState, RevealFrame, RevealRenderer, RevealScene } from '../home/types';

const BG = '#0B0B0A';
const RED = '255,74,28';
const SILVER = '237,233,225';

function rimOutline(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, presence: number) {
  // The chromatic split as two thin rings, offset either side of the rim.
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `rgba(${RED},${(0.9 * presence).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x + 1.5, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${SILVER},${(0.55 * presence).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x - 1.5, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

export function createRevealCanvas(): RevealRenderer {
  const canvas = document.createElement('canvas');
  canvas.className = 'reveal__fx';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false })!;
  let scene: RevealScene | null = null;

  const r: RevealRenderer = {
    kind: 2,
    canvas,
    dpr: 1,
    setup(s) {
      scene = s;
      r.setDpr(r.dpr);
    },
    setDpr(d) {
      r.dpr = d;
      if (!scene) return;
      canvas.width = Math.round(scene.W * d);
      canvas.height = Math.round(scene.H * d);
    },
    render(f: RevealFrame) {
      if (!scene) return;
      const d = r.dpr;
      const tex = scene.tex;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = 'low';

      for (const c of f.cells) {
        const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        ctx.setTransform(d * cos, d * sin, -d * sin, d * cos, d * cx, d * cy);
        // +0.6px overlap hides hairline seams between neighbouring cells.
        const w = c.w + 0.6, h = c.h + 0.6;
        const aA = (1 - c.mix) * c.alpha, aB = c.mix * c.alpha;
        if (aA > 0.004) {
          ctx.globalAlpha = aA;
          ctx.drawImage(tex, c.a.x, c.a.y, c.a.w, c.a.h, -w / 2, -h / 2, w, h);
        }
        if (aB > 0.004) {
          ctx.globalAlpha = aB;
          ctx.drawImage(tex, c.b.x, c.b.y, c.b.w, c.b.h, -w / 2, -h / 2, w, h);
        }
      }
      ctx.globalAlpha = 1;

      const L = f.lens;
      if (L.presence > 0.01) {
        const n = scene.nameRect, nt = scene.nameTex;
        const mag = 1 + 0.6 * L.presence; // 1.6x at full presence
        ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.arc(L.x, L.y, L.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = BG;
        ctx.fillRect(L.x - L.radius, L.y - L.radius, L.radius * 2, L.radius * 2);
        ctx.drawImage(tex, nt.x, nt.y, nt.w, nt.h, L.x + (n.x - L.x) * mag, L.y + (n.y - L.y) * mag, n.w * mag, n.h * mag);
        ctx.restore();
        rimOutline(ctx, L.x, L.y, L.radius, L.presence);
      }
    },
    destroy() {
      canvas.remove();
    },
  };
  return r;
}

export function createLensCanvas(): LensRenderer {
  const canvas = document.createElement('canvas');
  canvas.className = 'lens__fx';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false })!;
  let img: HTMLImageElement | null = null;
  let w = 1, h = 1;
  // Cover-fit source rect.
  let sx = 0, sy = 0, sw = 1, sh = 1;

  const r: LensRenderer = {
    kind: 2,
    canvas,
    dpr: 1,
    setup(source, cw, ch) {
      img = source;
      w = cw;
      h = ch;
      const iw = source.naturalWidth || 1600, ih = source.naturalHeight || 900;
      const ca = w / h, ia = iw / ih;
      if (ia > ca) { sh = ih; sw = ih * ca; sx = (iw - sw) / 2; sy = 0; }
      else { sw = iw; sh = iw / ca; sx = 0; sy = (ih - sh) / 2; }
      r.setDpr(r.dpr);
    },
    setDpr(d) {
      r.dpr = d;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
    },
    render(s: LensState) {
      if (!img) return;
      const d = r.dpr;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      if (s.presence > 0.01) {
        const R = Math.min(w, h) * 0.18;
        const mag = 1 + 0.6 * s.presence;
        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x, s.y, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh, s.x - s.x * mag, s.y - s.y * mag, w * mag, h * mag);
        ctx.restore();
        rimOutline(ctx, s.x, s.y, R, s.presence);
      }
    },
    destroy() {
      canvas.remove();
    },
  };
  return r;
}
