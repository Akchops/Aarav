/**
 * Scroll Film 2 — #close, pinned for three beats (lazy chunk, with GSAP).
 *
 *  beat 1 collapse    the featured frames gather from their contact-sheet places
 *                     into a stack, each slightly turned and offset
 *  beat 2 full frame  the top frame's own image grows to fill the viewport: its
 *                     clip opens to the edges while the image scales from its
 *                     frame crop to full-bleed (signature: full-screen morph) and
 *                     the slate becomes a caption
 *  beat 3 slate       the image shrinks into a slate in the lower half and the
 *                     closing copy rises into the upper half; the page ends here
 *
 * With nothing featured, only beat 3 remains: one beat, the closing copy rising.
 * Transform, opacity and clip-path only.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp01, easeInOut, easeOut, lerp, smooth } from '../motion/easing';
import { beatPx } from './reveal';
import type { Rect } from './types';

gsap.registerPlugin(ScrollTrigger);

interface Placed { x: number; y: number; w: number; h: number; rot: number }

const lerpRect = (a: Placed, b: Placed, t: number): Placed => ({
  x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t), rot: lerp(a.rot, b.rot, t),
});

export interface CloseHandle { st: ScrollTrigger; destroy(): void }

export function mountClose(): CloseHandle | null {
  const section = document.getElementById('close');
  const stage = section?.querySelector<HTMLElement>('[data-close-stage]');
  const copy = section?.querySelector<HTMLElement>('[data-close-copy]');
  if (!section || !stage || !copy) return null;
  const count = Number(section.dataset.count || 0);
  const frames = [...section.querySelectorAll<HTMLElement>('[data-close-frame]')];
  const clip = section.querySelector<HTMLElement>('[data-close-clip]');
  const img = section.querySelector<HTMLImageElement>('[data-close-img]');
  const caption = section.querySelector<HTMLElement>('[data-close-caption]');
  const beats = count > 0 ? 3 : 1;

  section.classList.add('is-live');

  let W = 0, H = 0, iw = 1600, ih = 900;
  let sheet: Placed[] = [], stack: Placed[] = [], slate: Placed = { x: 0, y: 0, w: 0, h: 0, rot: 0 };
  let full: Placed = { x: 0, y: 0, w: 0, h: 0, rot: 0 };
  const DX = [0, 16, -14], DY = [0, 10, -8];
  const slates = frames.map((f) => f.querySelector<HTMLElement>('.cframe__slate'));
  const dyMax = Math.max(0, ...DY.slice(0, frames.length));

  const measure = () => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    iw = img?.naturalWidth || Number(img?.getAttribute('width')) || 1600;
    ih = img?.naturalHeight || Number(img?.getAttribute('height')) || 900;
    const padL = copy.offsetLeft;
    const mobile = W < 768;
    const fw = mobile ? W * 0.62 : Math.min(W * 0.34, 440);
    const fh = (fw * 10) / 16; // the frames are 16:10, as in Featured Work
    // Beat 0: an echo of the contact sheet (odd high-left, even low-right).
    const sheetAt: Rect[] = mobile
      ? [{ x: padL, y: H * 0.1, w: fw, h: fh }, { x: W - padL - fw, y: H * 0.38, w: fw, h: fh }, { x: padL + W * 0.06, y: H * 0.64, w: fw, h: fh }]
      : [{ x: padL + W * 0.08, y: H * 0.12, w: fw, h: fh }, { x: W * 0.54, y: H * 0.26, w: fw, h: fh }, { x: padL + W * 0.18, y: H * 0.52, w: fw, h: fh }];
    sheet = sheetAt.map((r) => ({ ...r, rot: 0 }));
    // Beat 1 end: a stack in the centre, each slightly turned and offset.
    const rot = [-1.5, 3, -4];
    stack = sheetAt.map((_, i) => ({ x: W / 2 - fw / 2 + DX[i], y: H * 0.44 - fh / 2 + DY[i], w: fw, h: fh, rot: rot[i] }));
    full = { x: 0, y: 0, w: W, h: H, rot: 0 };
    // Beat 3: a slate in the lower half, under the closing copy.
    const copyBottom = copy.offsetTop + copy.offsetHeight;
    const y0 = Math.max(H * 0.56, copyBottom + 24);
    let sh = Math.max(60, H - y0 - 28);
    let sw = Math.min(W - padL * 2, sh * 1.6);
    sh = sw / 1.6;
    slate = { x: padL, y: y0, w: sw, h: sh, rot: 0 };
    frames.forEach((f) => (f.style.width = `${fw}px`));
    // The image element holds the WHOLE image at the viewport's cover scale,
    // centred on the viewport (wider or taller than the viewport; the clip
    // layer's overflow hides the rest). A viewport-sized object-fit:cover box
    // would only hold the viewport's own crop: on a portrait phone that is a
    // narrow strip, too narrow to fill a landscape frame once scaled down.
    if (img) {
      const cv = coverScale(W, H);
      const ew = iw * cv, eh = ih * cv;
      img.style.width = `${ew.toFixed(1)}px`;
      img.style.height = `${eh.toFixed(1)}px`;
      img.style.left = `${((W - ew) / 2).toFixed(1)}px`;
      img.style.top = `${((H - eh) / 2).toFixed(1)}px`;
    }
  };

  function coverScale(w: number, h: number) { return Math.max(w / iw, h / ih); }

  const state = { p: 0 };
  const draw = () => {
    const p = state.p;
    // Closing copy: rises into the upper half in the last beat.
    const cs = count > 0 ? easeOut(clamp01((p - 2.3) / 0.6)) : easeOut(clamp01(p / 0.7));
    copy.style.transform = `translate3d(0, ${((1 - cs) * 40).toFixed(1)}px, 0)`;
    copy.style.opacity = cs.toFixed(3);
    copy.style.pointerEvents = cs > 0.5 ? '' : 'none';
    if (count === 0) return;

    const b1 = easeInOut(clamp01(p));
    // The other frames: gather into the stack, then sink under the full frame.
    frames.forEach((f, i) => {
      const r = lerpRect(sheet[i], stack[i], b1);
      f.style.transform = `translate3d(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px, 0) rotate(${r.rot.toFixed(2)}deg)`;
      // The slates stack beneath the pile as a level, left-aligned list that
      // starts below the lowest image in the pile (+8px for the turned corners),
      // so no frame's image ever covers another frame's slate.
      const sl = slates[i];
      if (sl) sl.style.transform = `translate3d(${(-DX[i] * b1).toFixed(1)}px, ${((dyMax + 8 - DY[i] + i * 18) * b1).toFixed(1)}px, 0) rotate(${(-r.rot).toFixed(2)}deg)`;
      // Frame 0 is drawn by the full-frame layer; only its slate shows here.
      f.style.opacity = (i === 0 ? 1 - smooth(1.0, 1.3, p) : 1 - smooth(1.05, 1.4, p)).toFixed(3);
    });

    // The top frame: frame -> stack -> full frame -> slate, as one image.
    let R: Placed;
    if (p <= 1) R = lerpRect(sheet[0], stack[0], b1);
    else if (p <= 2) R = lerpRect(stack[0], full, easeInOut(p - 1));
    else R = lerpRect(full, slate, easeInOut(clamp01(p - 2)));
    if (clip && img) {
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
      // The clip window is the frame; it opens to the viewport edges in beat 2.
      clip.style.transformOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
      clip.style.transform = `rotate(${R.rot.toFixed(2)}deg)`;
      clip.style.clipPath = `inset(${R.y.toFixed(1)}px ${(W - R.x - R.w).toFixed(1)}px ${(H - R.y - R.h).toFixed(1)}px ${R.x.toFixed(1)}px)`;
      // The image is the whole picture at viewport-cover scale; centred on the
      // frame and scaled by frame-cover / viewport-cover it covers the frame
      // exactly as object-fit: cover would (k = 1 at full frame).
      const k = coverScale(R.w, R.h) / coverScale(W, H);
      img.style.transform = `translate3d(${(cx - W / 2).toFixed(1)}px, ${(cy - H / 2).toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
    }
    if (caption) caption.style.opacity = (smooth(1.6, 1.95, p) * (1 - smooth(2.05, 2.35, p))).toFixed(3);
  };

  measure();
  draw();
  // The real image's size may differ from its width/height attributes.
  if (img && !img.complete) img.addEventListener('load', () => { measure(); draw(); }, { once: true });

  // Pinned scrub distance, the same beat size as Scroll Film 1:
  //   3 beats x beatPx()  ->  3 x 800px = 2400px pinned on desktop, 3 x 480px = 1440px on mobile
  //   (nothing featured: 1 beat x beatPx(), the closing copy only)
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + beats * beatPx(),
      pin: true,
      pinSpacing: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: () => {
        measure();
        draw();
      },
    },
  });
  tl.to(state, { p: beats, ease: 'none', duration: beats, onUpdate: draw });

  // A keyboard user must never land on a link that is still transparent: jump to
  // the end of the pin, instantly (keyboard actions never animate).
  const onFocus = (e: FocusEvent) => {
    const st = tl.scrollTrigger;
    if (!st || state.p >= beats - 0.2 || !copy.contains(e.target as Node)) return;
    window.scrollTo({ top: st.end, behavior: 'instant' as ScrollBehavior });
    tl.progress(1);
    state.p = beats;
    draw();
  };
  section.addEventListener('focusin', onFocus);

  return {
    st: tl.scrollTrigger!,
    destroy() {
      section.removeEventListener('focusin', onFocus);
      tl.scrollTrigger?.kill(true);
      tl.kill();
      section.classList.remove('is-live');
      for (const el of [copy, clip, img, caption, ...frames]) el?.removeAttribute('style');
    },
  };
}
