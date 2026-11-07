/** The contract both canvas tiers implement, plus the assets they share. */
import type { Frame, SceneModel } from './model';
import type { NameTexture } from './name-texture';
import type { PlaneInfo } from './layout';

export interface Inputs {
  /** Seconds since mount (grain only). */
  time: number;
  /** 0..1, eased exactly like the CSS develop keyframes. */
  develop: number;
  pointer: { x: number; y: number; vx: number; vy: number; speed: number; presence: number };
  /** Tap ripple; age < 0 means none. */
  ripple: { x: number; y: number; age: number };
}

export interface Assets {
  name: NameTexture;
  /** One power-of-two canvas per plane, in layout.planes order. */
  images: HTMLCanvasElement[];
}

export interface Tier {
  readonly kind: 1 | 2;
  readonly canvas: HTMLCanvasElement;
  dpr: number;
  setup(model: SceneModel, assets: Assets): void;
  render(frame: Frame, inp: Inputs): void;
  setDpr(dpr: number): void;
  destroy(): void;
}

const pot = (v: number) => 2 ** Math.round(Math.log2(Math.max(1, v)));

/** Draws a project still into a power-of-two canvas (2:1), cover-cropped to 16:9. */
export async function loadPlaneCanvas(p: PlaneInfo, maxTexture: number): Promise<HTMLCanvasElement> {
  const W = pot(maxTexture >= 4096 ? 2048 : 1024);
  const H = W / 2;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1C1B19';
  ctx.fillRect(0, 0, W, H);

  if (p.src) {
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = p.src;
      await img.decode();
      const iw = img.naturalWidth || 1600;
      const ih = img.naturalHeight || 900;
      // Cover-crop the source to 16:9, then fill the 2:1 canvas; the 16:9 plane
      // samples the whole texture, which undoes the stretch exactly.
      const target = 16 / 9;
      let sw = iw, sh = ih, sx = 0, sy = 0;
      if (iw / ih > target) { sw = ih * target; sx = (iw - sw) / 2; } else { sh = iw / target; sy = (ih - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      return c;
    } catch {
      /* fall through to the typographic frame */
    }
  }
  // No image: the same typographic frame as .gate__blank.
  ctx.save();
  ctx.scale(1, H / ((W * 9) / 16)); // draw in 16:9 space
  ctx.fillStyle = 'rgba(140,135,125,0.35)';
  ctx.font = `900 ${Math.round(W * 0.09)}px "Archivo Variable", "Arial Narrow", sans-serif`;
  if ('fontStretch' in ctx) ctx.fontStretch = 'condensed';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.name, W / 2, (W * 9) / 32, W * 0.9);
  ctx.restore();
  return c;
}
