/**
 * The Set — three playable pieces (lazy chunk, loaded when #set nears the viewport).
 * A: Strip   — frames with friction, walls, drag and fling (physics.ts)
 * B: Lens    — a magnifying lens with a chromatic rim over featured[0]'s image
 * C: Develop — hold to develop a still, top down, over 1.6s
 *
 * `instant` (reduced motion or ?tier=3): no physics, no easing, no timed reveal;
 * every piece still works, and every change happens at once.
 */
import { World } from './physics';
import { probeWebGL } from '../webgl/probe';
import { forcedTier } from '../core/prefs';
import { clamp01, easeOut } from '../motion/easing';
import type { LensRenderer } from './types';

const DEVELOP_MS = 1600; // the hold: linear, top down
const RELEASE_MS = 200; // the shrink back on release, --ease-out
const DEVELOPED_KEY = 'aarav:developed';

export interface SetOptions { instant: boolean }

export function mountSet(opts: SetOptions) {
  const set = document.getElementById('set');
  if (!set) return;
  mountStrip(set, opts);
  void mountLens(set, opts);
  mountDevelop(set, opts);
}

// ---------------------------------------------------------------- A: Strip
function mountStrip(set: HTMLElement, opts: SetOptions) {
  const strip = set.querySelector<HTMLElement>('[data-strip]');
  if (!strip) return;
  const frames = [...strip.querySelectorAll<HTMLElement>('[data-sframe]')];
  strip.classList.add('is-live'); // absolute layout, before the world measures it
  hideCaption(set.querySelector('[data-strip-cap]'));
  new World(strip, frames, { instant: opts.instant });
}

// ---------------------------------------------------------------- B: Lens
async function mountLens(set: HTMLElement, opts: SetOptions) {
  const btn = set.querySelector<HTMLElement>('[data-lens-btn]');
  const img = set.querySelector<HTMLImageElement>('[data-lens-img]');
  if (!btn || !img) return;
  try {
    await img.decode();
  } catch {
    return; // no image, no lens: the static image and its caption stand
  }

  const forced = forcedTier();
  const caps = forced === 2 ? null : probeWebGL(forced === 1);
  const webgl = !!caps && (forced === 1 || !caps.soft);

  let r: LensRenderer | null = null;
  const tier2 = async () => (await import('../canvas2d/tier2')).createLensCanvas();
  const swapToTier2 = async () => {
    const old = r;
    if (!old || old.kind === 2) return;
    r = null;
    old.destroy();
    r = await tier2();
    r.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    r.setup(img, btn.clientWidth, btn.clientHeight);
    btn.appendChild(r.canvas);
    draw();
  };
  if (webgl) {
    try {
      const { createLensGL } = await import('../webgl/lens-gl');
      r = createLensGL(forced === 1, () => void swapToTier2());
      if (r) r.dpr = Math.min(window.devicePixelRatio || 1, 2);
    } catch {
      r = null;
    }
  }
  if (!r) {
    r = await tier2();
    r.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  }
  r.setup(img, btn.clientWidth, btn.clientHeight);
  btn.appendChild(r.canvas);
  hideCaption(set.querySelector('[data-lens-cap]'));

  const s = { x: btn.clientWidth / 2, y: btn.clientHeight / 2, presence: 0, tx: 0, ty: 0, tp: 0 };
  s.tx = s.x;
  s.ty = s.y;
  let raf = 0;
  const draw = () => r?.render(s);
  const loop = () => {
    // Damped follow (0.25/frame ~ 120ms settle); instant mode tracks 1:1.
    const k = opts.instant ? 1 : 0.25;
    s.x += (s.tx - s.x) * k;
    s.y += (s.ty - s.y) * k;
    s.presence += (s.tp - s.presence) * (opts.instant ? 1 : 0.15);
    draw();
    const settled = Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) < 0.1 && Math.abs(s.tp - s.presence) < 0.002;
    raf = settled ? 0 : requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const at = (e: PointerEvent) => {
    const b = btn.getBoundingClientRect();
    s.tx = e.clientX - b.left;
    s.ty = e.clientY - b.top;
  };
  btn.addEventListener('pointerenter', (e) => { at(e); if (e.pointerType !== 'touch') { s.tp = 1; wake(); } });
  btn.addEventListener('pointermove', (e) => { at(e); wake(); }, { passive: true });
  btn.addEventListener('pointerdown', (e) => {
    at(e);
    if (e.pointerType === 'touch') { s.x = s.tx; s.y = s.ty; } // the lens jumps to the finger
    s.tp = 1;
    wake();
  });
  const away = () => { s.tp = 0; wake(); };
  btn.addEventListener('pointerleave', away);
  btn.addEventListener('pointercancel', away);
  btn.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') away(); });
  // Keyboard: Enter/Space moves the lens across three spots, instantly.
  let spot = 0;
  btn.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    spot = (spot + 1) % 3;
    s.x = s.tx = btn.clientWidth * [0.3, 0.5, 0.7][spot];
    s.y = s.ty = btn.clientHeight * 0.5;
    s.presence = s.tp = 1;
    draw();
  });
  btn.addEventListener('blur', away);
  new ResizeObserver(() => {
    r?.setup(img, btn.clientWidth, btn.clientHeight);
    draw();
  }).observe(btn);
  draw();
}

// ---------------------------------------------------------------- C: Develop
function mountDevelop(set: HTMLElement, opts: SetOptions) {
  const fig = set.querySelector<HTMLElement>('[data-develop]');
  const btn = set.querySelector<HTMLButtonElement>('[data-develop-btn]');
  const wrap = set.querySelector<HTMLElement>('[data-develop-img]');
  if (!fig || !btn || !wrap) return;

  let developed = false;
  try {
    developed = sessionStorage.getItem(DEVELOPED_KEY) === '1';
  } catch {
    /* storage blocked: start undeveloped */
  }
  let p = developed ? 1 : 0;
  let raf = 0;

  const apply = () => {
    // Revealed from the top down: the bottom inset shrinks as p grows.
    wrap.style.clipPath = p >= 1 ? 'none' : `inset(0 0 ${((1 - p) * 100).toFixed(2)}% 0)`;
    btn.setAttribute('aria-pressed', String(developed));
    fig.classList.toggle('is-developed', developed);
  };
  const latch = (v: boolean) => {
    developed = v;
    p = v ? 1 : 0;
    try {
      if (v) sessionStorage.setItem(DEVELOPED_KEY, '1');
      else sessionStorage.removeItem(DEVELOPED_KEY);
    } catch {
      /* the latch still holds for this page */
    }
    apply();
  };

  fig.classList.add('is-live');
  hideCaption(set.querySelector('[data-develop-cap]'));
  apply();

  btn.addEventListener('contextmenu', (e) => e.preventDefault()); // a long press must not open a menu

  if (!opts.instant) {
    btn.addEventListener('pointerdown', (e) => {
      if (developed || e.button !== 0) return;
      cancelAnimationFrame(raf);
      const p0 = p, t0 = performance.now();
      const hold = (now: number) => {
        p = Math.min(1, p0 + (now - t0) / DEVELOP_MS); // linear
        if (p >= 1) return latch(true);
        apply();
        raf = requestAnimationFrame(hold);
      };
      raf = requestAnimationFrame(hold);
    });
    const release = () => {
      if (developed || p <= 0) return;
      cancelAnimationFrame(raf);
      const from = p, t0 = performance.now();
      const back = (now: number) => {
        p = from * (1 - easeOut(clamp01((now - t0) / RELEASE_MS)));
        apply();
        if (p > 0) raf = requestAnimationFrame(back);
      };
      raf = requestAnimationFrame(back);
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }

  btn.addEventListener('click', (e) => {
    // Keyboard (detail 0) toggles instantly; under reduced motion a click does too.
    if (e.detail === 0 || opts.instant) {
      cancelAnimationFrame(raf);
      latch(!developed);
    }
  });
}

function hideCaption(el: Element | null) {
  if (el) (el as HTMLElement).hidden = true;
}
