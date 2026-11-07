/**
 * Scroll Film 1 — #reveal, pinned for four beats (lazy chunk, with GSAP).
 *
 *  beat 1 assembly  the name, rasterised once and cut into 24 x 5 cells, flies
 *                   together from seeded offsets (signature: assembly under scroll)
 *  beat 2 lens      a lens crosses the assembled name: the pointer, or a scroll-
 *                   driven sweep when there is none (signature: shader pointer interaction)
 *  beat 3 morph     every cell travels to its place in "Website Builder" while its
 *                   content changes over; the grain falls to ambient level
 *  beat 4 release   "Website Builder" lifts to the top of the frame and the status
 *                   line rises into place: the frame ends as a title card, and the
 *                   pin releases into #set, carrying both on up in the same direction
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { site } from '../data/site';
import { clamp01, easeInOut, easeOut, lerp, smooth } from '../motion/easing';
import { Watchdog } from '../core/watchdog';
import { forcedTier } from '../core/prefs';
import { probeWebGL } from '../webgl/probe';
import type { CellState, Rect, RevealFrame, RevealRenderer, RevealScene } from './types';

gsap.registerPlugin(ScrollTrigger);
// The URL bar showing and hiding on phones must not rebuild the pins mid-scroll.
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Beat size, shared by both films and recomputed on every refresh:
 *   desktop  min(800, innerHeight * 0.9)   — a big move needs travel; under ~350px a wheel flick skips a beat
 *   mobile   min(480, innerHeight * 0.85)  — a thumb fling covers far more document px per gesture
 */
export const beatPx = () =>
  innerWidth < 768 ? Math.round(Math.min(480, innerHeight * 0.85)) : Math.round(Math.min(800, innerHeight * 0.9));

const COLS = 24;
const ROWS = 5;

/** Deterministic hash of an integer to 0..1, so the scatter is the same on every load. */
function hash(i: number): number {
  let x = Math.imul(i + 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967295;
}

interface Cell { n: Rect; r: Rect; a: Rect; b: Rect; ox: number; oy: number; orot: number; delay: number }

interface Layout { scene: RevealScene; cells: Cell[]; name: Rect; role: Rect }

function textFont(ctx: CanvasRenderingContext2D, font: string, stretch: string, track: number) {
  ctx.font = font;
  if ('fontStretch' in ctx) ctx.fontStretch = stretch as CanvasFontStretch;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${track}px`;
  ctx.textBaseline = 'alphabetic';
}

/** Rasterise the name and the role line once into one texture, and cut both into cells. */
function buildLayout(stage: HTMLElement, padL: number): Layout {
  const W = stage.clientWidth;
  const H = stage.clientHeight;
  const nameText = site.brand.toUpperCase();
  const m = document.createElement('canvas').getContext('2d')!;

  // Archivo 900, width 75, tracking -0.035em, fitted to the gutter.
  textFont(m, '900 100px "Archivo Variable", "Arial Narrow", sans-serif', 'condensed', -3.5);
  const nm = m.measureText(nameText);
  const nAsc = nm.actualBoundingBoxAscent || 72, nDesc = nm.actualBoundingBoxDescent || 0;
  const f = Math.min(((W - padL * 2) / nm.width) * 100, ((H * 0.26) / (nAsc + nDesc)) * 100, 230);
  const name: Rect = { x: padL, y: 0, w: (nm.width * f) / 100, h: ((nAsc + nDesc) * f) / 100 };
  name.y = H * 0.4 - name.h / 2;

  // "Website Builder": Instrument Sans 500.
  const rf = Math.max(22, Math.min(44, W * 0.032));
  textFont(m, `500 ${rf}px "Instrument Sans Variable", system-ui, sans-serif`, 'normal', 0);
  const rm = m.measureText(site.role);
  const rAsc = rm.actualBoundingBoxAscent || rf * 0.72, rDesc = rm.actualBoundingBoxDescent || rf * 0.22;
  const role: Rect = { x: padL, y: 0, w: rm.width, h: rAsc + rDesc };
  role.y = name.y + name.h / 2 - role.h / 2; // the morph collapses onto the name's centre line

  // One texture, 2x for crispness (capped): the name on top, the role line below.
  const s = Math.min(2, 4096 / Math.max(name.w, role.w, 1));
  const tex = document.createElement('canvas');
  const nameTex: Rect = { x: 2, y: 2, w: name.w * s, h: name.h * s };
  const roleTex: Rect = { x: 2, y: Math.ceil(nameTex.y + nameTex.h) + 8, w: role.w * s, h: role.h * s };
  tex.width = Math.ceil(Math.max(nameTex.w, roleTex.w)) + 4;
  tex.height = Math.ceil(roleTex.y + roleTex.h) + 4;
  const t = tex.getContext('2d')!;
  t.fillStyle = '#EDE9E1';
  textFont(t, `900 ${f * s}px "Archivo Variable", "Arial Narrow", sans-serif`, 'condensed', -0.035 * f * s);
  t.fillText(nameText, nameTex.x, nameTex.y + (nAsc * f * s) / 100);
  textFont(t, `500 ${rf * s}px "Instrument Sans Variable", system-ui, sans-serif`, 'normal', 0);
  t.fillText(site.role, roleTex.x, roleTex.y + rAsc * s);

  const cells: Cell[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const c = i % COLS, r = Math.floor(i / COLS);
    const cut = (R: Rect): Rect => ({ x: R.x + (c * R.w) / COLS, y: R.y + (r * R.h) / ROWS, w: R.w / COLS, h: R.h / ROWS });
    cells.push({
      n: cut(name), r: cut(role), a: cut(nameTex), b: cut(roleTex),
      // Seeded scatter: up to 65% of the stage away, up to ±69° turned.
      ox: (hash(i * 4 + 1) - 0.5) * W * 1.3,
      oy: (hash(i * 4 + 2) - 0.5) * H * 1.3,
      orot: (hash(i * 4 + 3) - 0.5) * 2.4,
      // Cells start their flight across the first 42% of beat 1.
      delay: hash(i * 4 + 4) * 0.42,
    });
  }
  return { scene: { W, H, tex, nameRect: name, nameTex }, cells, name, role };
}

/** The whole film as a pure function of scroll position p (0..4 beats) and the pointer. */
/** Where the lens sweeps when no pointer is driving it (beat 2, scroll-scrubbed). */
function sweepAt(L: Layout, p: number) {
  return { x: L.name.x + L.name.w * (0.1 + 0.8 * smooth(1.0, 1.95, p)), y: L.name.y + L.name.h / 2 };
}

function frameAt(L: Layout, p: number, lensAt: { x: number; y: number } | null): RevealFrame {
  const cells: CellState[] = L.cells.map((c, i) => {
    const col = i % COLS;
    // Beat 1 — assembly: fly from the seeded offset into place, turning upright.
    const e1 = smooth(0, 1, clamp01((p - c.delay) / 0.55));
    let x = c.n.x + c.ox * (1 - e1);
    let y = c.n.y + c.oy * (1 - e1);
    let w = c.n.w, h = c.n.h;
    const rot = c.orot * (1 - e1);
    const alpha = 0.22 + 0.78 * e1;
    // Beat 3 — morph: each cell travels to its role-line place, left columns first.
    const t3 = clamp01((p - 2 - (col / (COLS - 1)) * 0.25) / 0.75);
    const e3 = easeInOut(t3);
    x = lerp(x, c.r.x, e3);
    y = lerp(y, c.r.y, e3);
    w = lerp(w, c.r.w, e3);
    h = lerp(h, c.r.h, e3);
    const mix = smooth(0.2, 0.8, t3);
    // Beat 4 — release: the line lifts until its top sits at 16% of the frame.
    // It does not leave: an empty frame at the hand-off reads as dead air.
    y -= easeInOut(clamp01((p - 3) / 0.65)) * Math.max(0, L.role.y - L.scene.H * 0.16);
    return { x, y, w, h, rot, alpha, mix, a: c.a, b: c.b };
  });

  // Beat 2 — the lens. Without a pointer it sweeps the name with scroll, so the
  // beat changes the frame for every visitor; a live pointer takes over.
  const presence = smooth(1.0, 1.15, p) * (1 - smooth(1.88, 2.02, p));
  const at = lensAt ?? sweepAt(L, p);
  return {
    cells,
    grain: 1 - 0.65 * smooth(2, 3, p), // beat 3: down to ambient
    lens: { x: at.x, y: at.y, presence, radius: Math.min(160, Math.min(L.scene.W, L.scene.H) * 0.16) },
  };
}

export interface RevealHandle { st: ScrollTrigger; destroy(): void }

/** Mount the film. Resolves null if anything fails: the static layer then stands. */
export async function mountReveal(onDone: () => void): Promise<RevealHandle | null> {
  const section = document.getElementById('reveal');
  const stage = section?.querySelector<HTMLElement>('[data-reveal-stage]');
  const status = section?.querySelector<HTMLElement>('[data-reveal-status]');
  if (!section || !stage || !status) return null;

  // Tier: the probe, unless QA forces one. Software GL goes to tier 2.
  const forced = forcedTier();
  const caps = forced === 2 ? null : probeWebGL(forced === 1);
  const webgl = !!caps && (forced === 1 || !caps.soft);

  // The texture must come from the real webfonts.
  await Promise.race([
    Promise.all([
      document.fonts.load('condensed 900 100px "Archivo Variable"'),
      document.fonts.load('500 40px "Instrument Sans Variable"'),
    ]).then(() => document.fonts.ready),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => undefined);

  const padOf = () => status.getBoundingClientRect().left - stage.getBoundingClientRect().left;
  let layout = buildLayout(stage, padOf());
  const dprCap = () => Math.min(window.devicePixelRatio || 1, webgl && caps && !caps.soft ? 2 : 1.5);

  let renderer: RevealRenderer | null = null;
  const makeTier2 = async () => {
    const { createRevealCanvas } = await import('../canvas2d/tier2');
    const t = createRevealCanvas();
    t.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    return t;
  };
  if (webgl) {
    try {
      const { createRevealGL } = await import('../webgl/reveal-gl');
      renderer = createRevealGL(forced === 1, () => void fallback());
      if (renderer) renderer.dpr = dprCap();
    } catch {
      renderer = null;
    }
  }
  if (!renderer) renderer = await makeTier2();
  renderer.setup(layout.scene);
  stage.prepend(renderer.canvas);

  const state = { p: 0 };
  let lastP = -1;
  // engaged: a pointer has driven the lens at least once; from then on the lens
  // position is damped, and glides back to the sweep when the pointer goes idle.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, live: false, engaged: false, at: 0 };
  let visible = true;
  let destroyed = false;

  const draw = (now: number) => {
    if (!renderer) return;
    const f = frameAt(layout, state.p, pointer.engaged ? pointer : null);
    renderer.render(f, now / 1000);
    // Beat 4: the status line rises into its final place.
    const s = easeOut(clamp01((state.p - 3.35) / 0.6));
    status.style.transform = `translate3d(0, ${((1 - s) * 28).toFixed(1)}px, 0)`;
    status.style.opacity = s.toFixed(3);
  };

  async function fallback() {
    const old = renderer;
    if (!old || old.kind === 2 || destroyed) return;
    renderer = null;
    old.destroy();
    const t = await makeTier2();
    t.setup(layout.scene);
    stage!.prepend(t.canvas);
    renderer = t;
    draw(performance.now());
  }

  const watchdog = new Watchdog(() => {
    const r = renderer;
    if (!r) return;
    if (r.dpr > 1) r.setDpr(Math.max(1, r.dpr - 0.5)); // 2 -> 1.5 -> 1
    else if (r.kind === 1) void fallback();
  });

  // Pointer: the lens follows it in beat 2. Damped here, so the shader gets clean values.
  const onMove = (e: PointerEvent) => {
    const b = stage.getBoundingClientRect();
    pointer.tx = e.clientX - b.left;
    pointer.ty = e.clientY - b.top;
    if (!pointer.engaged) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.live = true;
    pointer.engaged = true;
    pointer.at = performance.now();
  };
  const onLeave = () => { pointer.live = false; };
  stage.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerdown', onMove, { passive: true });
  stage.addEventListener('pointerleave', onLeave, { passive: true });
  stage.addEventListener('pointercancel', onLeave, { passive: true });

  // Pinned scrub distance:
  //   4 beats x beatPx()  ->  4 x 800px = 3200px pinned on desktop, 4 x 480px = 1920px on mobile
  //   beatPx() = innerWidth < 768 ? min(480, innerHeight * 0.85) : min(800, innerHeight * 0.9)
  //   e.g. 1280x800 -> min(800, 720) = 720 -> 2880px;  390x844 -> min(480, 717) = 480 -> 1920px;
  //        320x568  -> min(480, 483) = 480 -> 1920px;  768x1024 -> min(800, 922) = 800 -> 3200px
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + 4 * beatPx(),
      pin: true,
      pinSpacing: true,
      scrub: 0.6, // 0.6s catch-up absorbs wheel steps without feeling detached
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onLeave: onDone,
      onRefresh: () => {
        if (destroyed || !renderer) return;
        layout = buildLayout(stage, padOf());
        renderer.setup(layout.scene);
        lastP = -1;
      },
    },
  });
  // One timeline second = one beat; easing lives inside each beat, not on the scrub.
  tl.to(state, { p: 4, ease: 'none', duration: 4 });

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(stage);

  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    const dt = now - last;
    last = now;
    if (destroyed || !visible || document.hidden || !renderer) return; // nothing renders off screen
    if (pointer.live && now - pointer.at > 2500) pointer.live = false;
    if (!pointer.live) {
      const sw = sweepAt(layout, state.p);
      pointer.tx = sw.x;
      pointer.ty = sw.y;
    }
    const px = pointer.x, py = pointer.y;
    pointer.x += (pointer.tx - pointer.x) * 0.18;
    pointer.y += (pointer.ty - pointer.y) * 0.18;
    const moving = Math.abs(pointer.x - px) + Math.abs(pointer.y - py) > 0.05;
    const inLensBeat = state.p > 0.95 && state.p < 2.1;
    if (Math.abs(state.p - lastP) > 1e-5 || (moving && inLensBeat)) {
      lastP = state.p;
      draw(now);
      watchdog.frame(dt);
    }
  };
  gsap.ticker.add(tick);

  draw(performance.now());
  section.classList.add('is-live');

  return {
    st: tl.scrollTrigger!,
    destroy() {
      destroyed = true;
      gsap.ticker.remove(tick);
      io.disconnect();
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerdown', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointercancel', onLeave);
      tl.scrollTrigger?.kill(true);
      tl.kill();
      renderer?.destroy();
      renderer = null;
      section.classList.remove('is-live');
      status.style.removeProperty('transform');
      status.style.removeProperty('opacity');
    },
  };
}
