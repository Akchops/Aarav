/**
 * The Set, Piece A — "Strip" physics. Pure motion state, moved by transform only.
 *
 * - Position (px) and velocity (px/s), integrated in a requestAnimationFrame loop
 *   that runs only while something is moving or being dragged.
 * - Friction: v *= 0.94 ^ (dt / 16.67) — frame-rate independent.
 * - Walls: the container. On contact the velocity component reverses at x0.5.
 * - Drag: pointer capture, the grabbed point stays under the pointer; on release
 *   the fling is the average velocity over the last 80ms, clamped to 2500px/s.
 *   A slow release (under 60px/s) gives no fling.
 * - Rotation follows horizontal velocity, capped at ±6°, easing back to 0.
 * - Frames do NOT collide with each other in this version (decisions.md).
 */
const FRICTION = 0.94;
const WALL = 0.5;
const SAMPLE_MS = 80;
const MAX_V = 2500;
const MIN_FLING = 60;
const MAX_ROT = 6;

interface Sample { x: number; y: number; t: number }

export interface Body {
  el: HTMLElement;
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  rot: number;
  dragging: boolean;
  grabX: number; grabY: number;
  samples: Sample[];
}

export interface WorldOptions {
  /** Reduced motion: drag places the frame 1:1, with no fling and no rotation. */
  instant: boolean;
}

export class World {
  readonly bodies: Body[];
  private raf = 0;
  private last = 0;
  private bw = 0;
  private bh = 0;
  private readonly off: (() => void)[] = [];

  constructor(private readonly box: HTMLElement, els: HTMLElement[], private readonly opts: WorldOptions) {
    this.measure();
    this.bodies = els.map((el, i) => {
      const w = el.offsetWidth, h = el.offsetHeight;
      const { x, y } = this.startAt(i, els.length, w, h);
      return { el, x, y, w, h, vx: 0, vy: 0, rot: (i % 2 ? 1 : -1) * (1 + (i % 3)), dragging: false, grabX: 0, grabY: 0, samples: [] };
    });
    this.bodies.forEach((b) => this.bind(b));
    const ro = new ResizeObserver(() => this.onResize());
    ro.observe(box);
    this.off.push(() => ro.disconnect());
    this.bodies.forEach((b) => this.apply(b));
  }

  /**
   * Starting arrangement, the same on every load: a staggered row across the
   * strip, alternately high and low. Where that would overlap neighbours in the
   * same row (a 320px phone), an even grid instead, the last row centred.
   */
  private startAt(i: number, n: number, w: number, h: number) {
    const GAP = 12;
    const fw = Math.max(0, this.bw - w), fh = Math.max(0, this.bh - h);
    const dx = n > 1 ? fw / (n - 1) : 0;
    if (n < 3 || 2 * dx >= w + GAP) return { x: i * dx, y: (i % 2 ? 0.62 : 0.14) * fh };
    const perRow = Math.max(1, Math.floor((this.bw + GAP) / (w + GAP)));
    const rows = Math.ceil(n / perRow);
    const r = Math.floor(i / perRow), c = i % perRow;
    const inRow = Math.min(perRow, n - r * perRow);
    const P = 4, gw = Math.max(0, fw - 2 * P), gh = Math.max(0, fh - 2 * P); // 4px inset: turned corners stay inside
    return {
      x: P + (inRow > 1 ? (c * gw) / (inRow - 1) : gw / 2),
      y: P + (rows > 1 ? (r * gh) / (rows - 1) : gh / 2),
    };
  }

  private measure() {
    this.bw = this.box.clientWidth;
    this.bh = this.box.clientHeight;
  }

  private onResize() {
    this.measure();
    for (const b of this.bodies) {
      b.w = b.el.offsetWidth;
      b.h = b.el.offsetHeight;
      b.x = Math.min(Math.max(0, b.x), Math.max(0, this.bw - b.w));
      b.y = Math.min(Math.max(0, b.y), Math.max(0, this.bh - b.h));
      this.apply(b);
    }
  }

  private apply(b: Body) {
    b.el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotate(${b.rot.toFixed(2)}deg)`;
  }

  private local(e: PointerEvent) {
    const r = this.box.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private bind(b: Body) {
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      b.el.addEventListener(type, fn as EventListener);
      this.off.push(() => b.el.removeEventListener(type, fn as EventListener));
    };
    on('pointerdown', (e) => {
      if (e.button !== 0 || b.dragging) return; // ignore a second finger mid-drag
      const p = this.local(e);
      b.el.setPointerCapture(e.pointerId);
      b.dragging = true;
      b.vx = b.vy = 0;
      b.grabX = p.x - b.x; // the grabbed point stays under the pointer
      b.grabY = p.y - b.y;
      b.samples = [{ x: b.x, y: b.y, t: e.timeStamp }];
      b.el.classList.add('is-dragging');
      this.wake();
    });
    on('pointermove', (e) => {
      if (!b.dragging) return;
      const p = this.local(e);
      b.x = Math.min(Math.max(0, p.x - b.grabX), Math.max(0, this.bw - b.w));
      b.y = Math.min(Math.max(0, p.y - b.grabY), Math.max(0, this.bh - b.h));
      b.samples.push({ x: b.x, y: b.y, t: e.timeStamp });
      while (b.samples.length > 2 && e.timeStamp - b.samples[0].t > SAMPLE_MS * 2) b.samples.shift();
      if (!this.opts.instant && b.samples.length >= 2) {
        // While dragging, rotation follows the drag's instantaneous horizontal velocity.
        const a = b.samples[b.samples.length - 2], z = b.samples[b.samples.length - 1];
        const dt = Math.max(1, z.t - a.t);
        const target = Math.max(-MAX_ROT, Math.min(MAX_ROT, ((z.x - a.x) / dt) * 1000 * 0.004));
        b.rot += (target - b.rot) * 0.3;
      }
      this.apply(b);
    });
    const release = (e: PointerEvent) => {
      if (!b.dragging) return;
      b.dragging = false;
      b.el.classList.remove('is-dragging');
      // Fling: average velocity over the last 80ms of samples.
      const now = e.timeStamp;
      const recent = b.samples.filter((s) => now - s.t <= SAMPLE_MS);
      let vx = 0, vy = 0;
      if (!this.opts.instant && recent.length >= 2) {
        const a = recent[0], z = recent[recent.length - 1];
        const dt = (z.t - a.t) / 1000;
        if (dt > 0.008) {
          vx = (z.x - a.x) / dt;
          vy = (z.y - a.y) / dt;
        }
      }
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_V) { vx *= MAX_V / speed; vy *= MAX_V / speed; }
      if (speed < MIN_FLING) { vx = 0; vy = 0; } // a slow release gives no fling
      b.vx = vx;
      b.vy = vy;
      b.samples = [];
      if (this.opts.instant) b.rot = 0;
      this.wake();
    };
    on('pointerup', release);
    on('pointercancel', release);
    // Keyboard (and only keyboard: a click from a key press has detail 0): jump
    // to a random free spot, instantly — keyboard actions never animate.
    on('click', (e) => {
      if ((e as MouseEvent).detail !== 0) return;
      this.jump(b);
    });
  }

  /** Move a frame to a random spot that does not overlap another frame. Instant. */
  jump(b: Body) {
    const fits = (x: number, y: number) =>
      this.bodies.every((o) => o === b || x + b.w + 8 < o.x || o.x + o.w + 8 < x || y + b.h + 8 < o.y || o.y + o.h + 8 < y);
    let x = 0, y = 0;
    for (let i = 0; i < 24; i++) {
      x = Math.random() * Math.max(0, this.bw - b.w);
      y = Math.random() * Math.max(0, this.bh - b.h);
      if (fits(x, y)) break;
    }
    b.x = x; b.y = y; b.vx = b.vy = 0; b.rot = 0;
    this.apply(b);
  }

  private wake() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.step);
  }

  private readonly step = (now: number) => {
    const dt = Math.min(64, now - this.last); // clamp: a background tab must not teleport frames
    this.last = now;
    let moving = false;
    const decay = Math.pow(FRICTION, dt / 16.67);
    const rotEase = 1 - Math.pow(0.85, dt / 16.67);
    for (const b of this.bodies) {
      if (b.dragging) { moving = true; continue; }
      if (b.vx === 0 && b.vy === 0 && Math.abs(b.rot) < 0.05) { if (b.rot !== 0) { b.rot = 0; this.apply(b); } continue; }
      b.x += (b.vx * dt) / 1000;
      b.y += (b.vy * dt) / 1000;
      // Walls: reverse the component and halve it.
      const maxX = Math.max(0, this.bw - b.w), maxY = Math.max(0, this.bh - b.h);
      if (b.x < 0) { b.x = 0; b.vx = -b.vx * WALL; }
      else if (b.x > maxX) { b.x = maxX; b.vx = -b.vx * WALL; }
      if (b.y < 0) { b.y = 0; b.vy = -b.vy * WALL; }
      else if (b.y > maxY) { b.y = maxY; b.vy = -b.vy * WALL; }
      b.vx *= decay;
      b.vy *= decay;
      if (Math.hypot(b.vx, b.vy) < 4) { b.vx = 0; b.vy = 0; }
      // Rotation follows horizontal velocity, capped at ±6°, back to 0 as it stops.
      const target = Math.max(-MAX_ROT, Math.min(MAX_ROT, b.vx * 0.004));
      b.rot += (target - b.rot) * rotEase;
      this.apply(b);
      moving = true;
    }
    this.raf = moving ? requestAnimationFrame(this.step) : 0;
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    this.off.splice(0).forEach((f) => f());
  }
}
