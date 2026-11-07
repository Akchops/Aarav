/**
 * The Home scene runtime (lazy chunk, with GSAP). Owns the one pinned
 * ScrollTrigger, the pointer state, the render loop, tier selection and the
 * fallbacks. Everything is created inside gsap.matchMedia(), so turning on
 * reduced motion reverts it all and the static design (tier 3) stands.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp01, easeOut } from '../motion/easing';
import { onBeforeSwap } from '../core/view-transitions';
import { beatPx, phasesFor, type Phases } from './beats';
import { measureLayout, type Layout } from './layout';
import { SceneModel } from './model';
import { drawNameTexture, type NameTexture } from './name-texture';
import { Overlay } from './overlay';
import { probeWebGL, type Caps } from './probe';
import { loadPlaneCanvas, type Inputs, type Tier } from './tier';
import { Watchdog } from './watchdog';

gsap.registerPlugin(ScrollTrigger);
// The URL bar showing/hiding on phones must not rebuild the pin mid-scroll.
ScrollTrigger.config({ ignoreMobileResize: true });

const DEVELOP_DELAY = 200;    // ms — matches motion.css `develop ... 200ms`
const DEVELOP_DURATION = 1400; // ms

type Forced = '1' | '2' | null;

class Runtime {
  private tier: Tier | null = null;
  private model: SceneModel | null = null;
  private layout: Layout | null = null;
  private phases: Phases | null = null;
  private nameTex: NameTexture | null = null;
  private images: HTMLCanvasElement[] = [];
  private overlay: Overlay;
  private st: ScrollTrigger | null = null;
  private tl: gsap.core.Timeline | null = null;
  private watchdog: Watchdog | null = null;
  private destroyed = false;
  private caps: Caps | null = null;
  private readonly state = { p: 0 };
  private lastP = -1;
  private developStart: number | null = null;
  private t0 = performance.now();
  private lastGrain = 0;
  private lastTick = performance.now();
  private readonly ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, vx: 0, vy: 0, speed: 0, tSpeed: 0, presence: 0, tPresence: 0, nx: 0, ny: 0 };
  private ripple = { x: 0, y: 0, t: -1 };
  private readonly nameEl: HTMLElement;
  private readonly settleEl: HTMLElement;
  private readonly off: (() => void)[] = [];

  constructor(private readonly scene: HTMLElement, private readonly stage: HTMLElement, private readonly forced: Forced) {
    this.overlay = new Overlay(scene, stage);
    this.nameEl = stage.querySelector<HTMLElement>('[data-name]')!;
    this.settleEl = scene.querySelector<HTMLElement>('[data-settle]')!;
  }

  async start() {
    // ---- Tier selection: probe silently; software GL goes to tier 2 unless forced for QA ----
    this.caps = this.forced === '2' ? null : probeWebGL(this.forced === '1');
    const webgl = !!this.caps && this.caps.version === 2 && (this.forced === '1' || this.caps.tier !== 'low');

    // The canvas name must be drawn from the real webfont, or the handoff shows.
    await Promise.race([
      document.fonts.load('condensed 900 100px "Archivo Variable"').catch(() => undefined),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    if (this.destroyed) return;

    this.scene.classList.add('is-cinematic');
    this.measure();
    const maxTex = this.caps?.maxTexture ?? 4096;
    this.images = await Promise.all(this.layout!.planes.map((p) => loadPlaneCanvas(p, maxTex)));
    if (this.destroyed) return;

    let tier: Tier | null = null;
    if (webgl) {
      try {
        const { createWebGL } = await import('./tier1-webgl');
        tier = createWebGL(this.caps!, this.forced === '1', () => this.fallback());
        tier.dpr = this.dprFor(1);
      } catch {
        tier = null; // silent: tier 2 takes over
      }
    }
    if (!tier) tier = await this.makeTier2();
    if (this.destroyed) {
      tier.destroy();
      return;
    }
    this.tier = tier;
    tier.setup(this.model!, { name: this.nameTex!, images: this.images });
    this.stage.prepend(tier.canvas);
    this.overlay.setup(this.model!);

    // ---- Develop handoff: continue the CSS keyframes from exactly where they are ----
    const anim = this.nameEl
      .getAnimations()
      .find((a) => (a as CSSAnimation).animationName === 'develop');
    const elapsed = anim && anim.playState !== 'finished' ? Number(anim.currentTime ?? 0) - DEVELOP_DELAY : Infinity;
    this.developStart = Number.isFinite(elapsed) ? performance.now() - elapsed : null;

    this.renderNow();
    // Hand the name to the canvas on the frame it is first painted there.
    requestAnimationFrame(() => {
      if (!this.destroyed) this.scene.classList.add('is-handed');
    });

    this.createTrigger();
    this.bindInput();
    this.watchdog = new Watchdog(() => this.degrade());
    gsap.ticker.add(this.tick);
  }

  // ---------------------------------------------------------------- scroll

  private createTrigger() {
    const phases = this.phases!;
    // Pinned scrub distance, declared per Gate 2:
    //   end = phases.beats x beatPx()
    //   5 beats x 700px = 3500px desktop · 5 beats x 420px = 2100px mobile
    //   beatPx() = Math.round(Math.min(innerWidth < 768 ? 420 : 700, innerHeight * 0.9))
    //   1440x900 -> min(700, 810) = 700 -> 3500px   1024x768 -> min(700, 691) = 691 -> 3455px
    //   390x844  -> min(420, 760) = 420 -> 2100px   320x568  -> min(420, 511) = 420 -> 2100px
    //   (zero projects: 2 beats x beatPx(), e.g. 1400px desktop)
    // beat 1: camera dollies into the name and through the counter of its first letter
    // beat 2: corridor travel past the project frames
    // beat 3: the featured frame swings to the camera and fills the screen
    // beat 4: every frame flies onto its DOM frame; the name settles into the subtitle
    // beat 5: status and "Start a project" settle; the pin releases into the same layout
    this.tl = gsap.timeline({
      scrollTrigger: {
        trigger: this.scene,
        start: 'top top',
        end: () => '+=' + phases.beats * beatPx(),
        pin: true,
        pinSpacing: true,
        // 0.6s catch-up: absorbs discrete wheel steps without feeling detached.
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: () => this.relayout(),
      },
    });
    // One timeline second = one beat. The primary move is ease 'none' so it tracks
    // the finger exactly; easing lives inside the model, per beat.
    this.tl.to(this.state, { p: phases.beats, ease: 'none', duration: phases.beats });
    this.st = this.tl.scrollTrigger ?? null;

    // Late layout changes (fonts, images) invalidate every start/end.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts.ready.then(refresh);
    addEventListener('load', refresh, { once: true });
  }

  private measure() {
    // getBoundingClientRect includes transforms: measure the FLIP target untransformed.
    const ss = this.scene.querySelector<HTMLElement>('[data-status-settle]');
    const prev = ss?.style.transform ?? '';
    if (ss) ss.style.transform = '';
    this.layout = measureLayout(this.scene, this.stage);
    if (ss) ss.style.transform = prev;
    this.phases = phasesFor(this.layout.planes.length);
    const L = this.layout;
    const t = this.nameTex;
    if (!t || Math.abs(t.box.w - L.name.w) > 0.5 || Math.abs(t.box.h - L.name.h) > 0.5) {
      this.nameTex = drawNameTexture(this.nameEl.textContent?.trim() || 'Aarav', { w: L.name.w, h: L.name.h }, L.nameFontPx, L.nameTrackPx, this.caps?.maxTexture ?? 4096);
    }
    this.model = new SceneModel(L, this.phases, this.nameTex!.counter);
  }

  private relayout() {
    if (this.destroyed || !this.tier) return;
    this.measure();
    this.tier.setup(this.model!, { name: this.nameTex!, images: this.images });
    this.overlay.setup(this.model!);
    this.lastP = -1;
    this.renderNow();
  }

  // ---------------------------------------------------------------- input

  private bindInput() {
    const st = this.stage;
    const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.off.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    const p = this.ptr;
    on(st, 'pointermove', (e) => {
      const minDim = Math.min(this.layout!.vw, this.layout!.vh);
      if (p.tx > -1e3) {
        // Instantaneous speed: 6% of the short side per event is a fast flick.
        p.tSpeed = Math.min(1, Math.hypot(e.clientX - p.tx, e.clientY - p.ty) / (0.06 * minDim));
      } else {
        p.x = e.clientX;
        p.y = e.clientY;
      }
      p.tx = e.clientX;
      p.ty = e.clientY;
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') p.tPresence = 1;
    }, { passive: true });
    on(st, 'pointerdown', (e) => {
      this.ripple = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (p.tx < -1e3) { p.x = p.tx = e.clientX; p.y = p.ty = e.clientY; }
      if (e.pointerType === 'touch') { p.tx = e.clientX; p.ty = e.clientY; p.tPresence = 1; }
    }, { passive: true });
    const lift = (e: PointerEvent) => { if (e.pointerType === 'touch') p.tPresence = 0; };
    on(st, 'pointerup', lift, { passive: true });
    on(st, 'pointercancel', () => { p.tPresence = 0; }, { passive: true }); // the browser took the gesture (vertical scroll)
    on(st, 'pointerleave', () => { p.tPresence = 0; }, { passive: true });

    // Keyboard users must never tab onto a link hidden under the overlay: jump to
    // the end of the pin, instantly (keyboard actions never animate).
    on(this.scene, 'focusin', (e) => {
      if (!this.st || !this.phases) return;
      if (this.state.p < this.phases.assemble[1] && this.settleEl.contains(e.target as Node)) {
        window.scrollTo({ top: this.st.end, behavior: 'instant' as ScrollBehavior });
        this.tl?.progress(1);
        this.state.p = this.phases.beats;
      }
    });

    // A frame still under the overlay must not morph into the Work page from there.
    onBeforeSwap(() => {
      if (this.phases && this.state.p < this.phases.assemble[1]) {
        this.layout?.planes.forEach((pl) => (pl.gate.style.viewTransitionName = 'none'));
      }
    });
  }

  // ---------------------------------------------------------------- loop

  private inputs(now: number): Inputs {
    const p = this.ptr;
    const age = this.ripple.t >= 0 ? (now - this.ripple.t) / 1000 : -1;
    const develop = this.developStart === null ? 1 : easeOut(clamp01((now - this.developStart) / DEVELOP_DURATION));
    return {
      time: (now - this.t0) / 1000,
      develop,
      pointer: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, speed: p.speed, presence: p.presence },
      ripple: { x: this.ripple.x, y: this.ripple.y, age: age >= 0 && age < 1.6 ? age : -1 },
    };
  }

  private renderNow() {
    if (!this.model || !this.tier) return;
    const now = performance.now();
    const f = this.model.frame(this.state.p, this.ptr.nx, this.ptr.ny);
    this.overlay.apply(f);
    if (f.overlay > 0.001) this.tier.render(f, this.inputs(now));
  }

  private readonly tick = () => {
    if (this.destroyed || !this.model || !this.tier) return;
    const now = performance.now();
    const dt = now - this.lastTick;
    this.lastTick = now;
    if (document.hidden) return;

    // ---- Pointer damping (JS owns smoothing; the shader receives clean values) ----
    const p = this.ptr;
    const px = p.x, py = p.y;
    // 0.12/frame ~ 200ms settle at 60fps: attached to the hand, smoothed between events.
    p.x += (p.tx - p.x) * 0.12;
    p.y += (p.ty - p.y) * 0.12;
    p.vx = p.x - px;
    p.vy = p.y - py;
    // Speed rises fast and decays slower, so the smear snaps back when the hand stops.
    p.speed += (p.tSpeed - p.speed) * (p.tSpeed > p.speed ? 0.25 : 0.08);
    p.tSpeed *= 0.9;
    p.presence += (p.tPresence - p.presence) * 0.1;
    const L = this.layout!;
    p.nx = p.tx > -1e3 ? (p.x / L.vw) * 2 - 1 : 0;
    p.ny = p.ty > -1e3 ? -((p.y / L.vh) * 2 - 1) : 0;

    const pChanged = Math.abs(this.state.p - this.lastP) > 1e-5;
    this.lastP = this.state.p;
    const f = this.model.frame(this.state.p, p.nx, p.ny);
    if (pChanged) this.overlay.apply(f);
    if (f.overlay <= 0.001) return; // overlay gone: nothing to draw, no GPU cost

    const inp = this.inputs(now);
    const pointerLive = p.speed > 0.002 || Math.abs(p.tPresence - p.presence) > 0.002 || p.presence > 0.002;
    const grainDue = now - this.lastGrain > 1000 / 12; // ambient grain refresh at 12fps
    if (pChanged || pointerLive || inp.ripple.age >= 0 || inp.develop < 1 || grainDue) {
      if (grainDue) this.lastGrain = now;
      this.tier.render(f, inp);
      if (pChanged || pointerLive) this.watchdog?.frame(dt);
    }
  };

  // ---------------------------------------------------------------- quality and fallbacks

  private dprFor(kind: 1 | 2) {
    const d = window.devicePixelRatio || 1;
    // Tier 2 is CPU-rendered: 1x on touch screens (pixel cost dominates), 1.5x cap otherwise.
    if (kind === 2) return matchMedia('(pointer: coarse)').matches ? 1 : Math.min(d, 1.5);
    const t = this.caps?.tier;
    // 3x DPR costs 2.25x the fill of 2x for no perceptible gain.
    return Math.min(d, t === 'high' ? 2 : t === 'medium' ? 1.5 : 1);
  }

  private async makeTier2(): Promise<Tier> {
    const { createCanvas2D } = await import('./tier2-canvas');
    const t = createCanvas2D();
    t.dpr = this.dprFor(2);
    return t;
  }

  private degrade() {
    const t = this.tier;
    if (!t) return;
    if (t.dpr > 1) {
      t.setDpr(Math.max(1, t.dpr - 0.5));
      this.renderNow();
    } else if (t.kind === 1) {
      void this.fallback();
    }
  }

  /** Context loss or sustained slow frames: swap tier 1 for tier 2 in place. */
  private async fallback() {
    const old = this.tier;
    if (!old || old.kind === 2 || this.destroyed) return;
    this.tier = null;
    old.destroy();
    const t = await this.makeTier2();
    if (this.destroyed) return t.destroy();
    t.setup(this.model!, { name: this.nameTex!, images: this.images });
    this.stage.prepend(t.canvas);
    this.tier = t;
    this.renderNow();
  }

  destroy() {
    this.destroyed = true;
    gsap.ticker.remove(this.tick);
    this.off.splice(0).forEach((fn) => fn());
    onBeforeSwap(() => undefined);
    this.tl?.scrollTrigger?.kill(true);
    this.tl?.kill();
    this.tier?.destroy();
    this.tier = null;
    this.overlay.reset();
    this.scene.classList.remove('is-cinematic', 'is-handed');
  }
}

/** Mounts the scene for as long as the user has not asked for reduced motion. */
export function startScene(scene: HTMLElement, stage: HTMLElement, forced: Forced) {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const run = new Runtime(scene, stage, forced);
    run.start().catch((err) => {
      run.destroy();
      if (import.meta.env.DEV) console.error(err);
    });
    return () => run.destroy();
  });
}
