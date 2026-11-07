/**
 * Draws the name into a canvas, from the same webfont, size and tracking as the
 * DOM <h1>, so the canvas tiers can take over from the DOM without a visible jump.
 * Also finds the counter (the enclosed hole) of the first letter, which the camera
 * flies through in beat 1.
 */
export interface NameTexture {
  canvas: HTMLCanvasElement;
  /** Fraction of the (power-of-two) canvas the text box occupies. */
  extent: { x: number; y: number };
  /** Counter of the first letter, as fractions of the text box (y down). */
  counter: { x: number; y: number };
  /** Text box size in CSS px it was drawn for. */
  box: { w: number; h: number };
}

const FAMILY = '"Archivo Variable", "Archivo", "Arial Narrow", sans-serif';
const pot = (v: number) => 2 ** Math.ceil(Math.log2(Math.max(1, v)));

function setFont(ctx: CanvasRenderingContext2D, px: number, trackPx: number) {
  ctx.font = `900 ${px}px ${FAMILY}`;
  // Same width axis as the CSS (font-stretch: 75% = 'condensed').
  if ('fontStretch' in ctx) ctx.fontStretch = 'condensed';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${trackPx}px`;
  ctx.textBaseline = 'alphabetic';
}

export function drawNameTexture(
  text: string,
  box: { w: number; h: number },
  fontPx: number,
  trackPx: number,
  maxTexture: number,
): NameTexture {
  // Texture width: 2048 (1024 on small GPUs) — the camera zooms a long way in
  // beat 1, so resolution is worth it here more than anywhere else.
  const W = Math.min(maxTexture >= 4096 ? 2048 : 1024, pot(box.w * 3));
  const s = W / box.w;
  const drawH = Math.max(1, Math.round(box.h * s));
  // Power-of-two in both axes, so mipmaps are legal everywhere and nothing is resized.
  const H = Math.min(W, pot(drawH));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  setFont(ctx, fontPx * s, trackPx * s);
  const m = ctx.measureText(text);
  const asc = m.fontBoundingBoxAscent || fontPx * s * 0.9;
  const desc = m.fontBoundingBoxDescent || fontPx * s * 0.22;
  // The DOM inline box is ascent + descent tall; place the baseline proportionally.
  const baseline = (asc / (asc + desc)) * drawH;
  // Fit the measured advance to the DOM box width (absorbs sub-pixel tracking differences).
  const scaleX = m.width > 0 ? W / m.width : 1;

  ctx.save();
  ctx.scale(scaleX, 1);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 0, baseline);
  ctx.restore();

  // ---- Find the first letter's counter: scan a column down its centre ----
  const firstAdvance = ctx.measureText(text.charAt(0)).width * scaleX;
  const colX = Math.max(0, Math.min(W - 1, Math.round(firstAdvance * 0.5)));
  const col = ctx.getImageData(colX, 0, 1, drawH).data;
  let y = 0;
  const opaque = (row: number) => col[row * 4 + 3] > 128;
  while (y < drawH && !opaque(y)) y++;         // empty space above the glyph
  while (y < drawH && opaque(y)) y++;          // the top stroke (apex of an A)
  const holeStart = y;
  while (y < drawH && !opaque(y)) y++;         // the counter
  const holeEnd = y;
  const enclosed = holeEnd < drawH && holeEnd > holeStart; // a stroke closes it below
  const counterY = enclosed ? (holeStart + holeEnd) / 2 : baseline * 0.6;

  return {
    canvas,
    extent: { x: 1, y: drawH / H },
    counter: { x: colX / W, y: counterY / drawH },
    box: { w: box.w, h: box.h },
  };
}
