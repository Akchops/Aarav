/**
 * The scene as pure maths: given the beat position p and the pointer, where the
 * camera, the name and every project plane are. Both canvas tiers render from
 * this one model, so tier 2 traces exactly the same behaviour as tier 1.
 *
 * World units are CSS pixels. Origin = centre of the stage on the z = 0 plane,
 * x right, y up. With the camera at z = D and fov chosen so that
 * D = (vh / 2) / tan(fov / 2), one world unit on the z = 0 plane is exactly one
 * CSS pixel on screen — which is what lets the name start pixel-identical to the
 * DOM <h1>, and the planes land pixel-identical on the DOM grid.
 */
import { clamp01, easeInOut, lerp, smooth } from '../motion/easing';
import type { Phases } from './beats';
import type { Layout, Rect } from './layout';

export interface Vec3 { x: number; y: number; z: number }
export interface Pose extends Vec3 {
  rotY: number;
  w: number;
  h: number;
  opacity: number;
  /** Projector light reaching the plane: 1 = full, 0 = lost in the dark. */
  bright: number;
  /** 0 in the corridor, 1 once landed on its DOM frame. */
  assemble: number;
}

export interface Frame {
  p: number;
  cam: Vec3;
  name: Pose;
  planes: Pose[];
  /** Opacity of the whole stage overlay (canvas + slates). 0 after the handoff. */
  overlay: number;
  role: number;
  card: number;
  cardShift: number;
  labels: number[];
  /** 0..1 progress through beat 5. */
  settle: number;
  grain: number;
}

export interface Projected { x: number; y: number; s: number; behind: boolean }

const toWorld = (r: Rect, vw: number, vh: number) => ({ x: r.x + r.w / 2 - vw / 2, y: vh / 2 - (r.y + r.h / 2) });

function lerpPose(a: Pose, b: Omit<Pose, 'opacity' | 'bright' | 'assemble'>, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t),
    rotY: lerp(a.rotY, b.rotY, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t),
    opacity: a.opacity, bright: a.bright, assemble: a.assemble,
  };
}

export class SceneModel {
  readonly D: number;
  readonly fov: number;
  readonly near: number;
  readonly far: number;
  private readonly corridor: Pose[] = [];
  private readonly rank: number[] = [];
  private readonly zEnd: number;
  private readonly counter: { x: number; y: number };
  private readonly featured: number;

  /**
   * @param counterFrac where the counter of the name's first letter sits inside the
   *   name's text box, as fractions (y down). The camera passes through it.
   */
  constructor(readonly layout: Layout, readonly phases: Phases, counterFrac: { x: number; y: number }) {
    const { vw, vh } = layout;
    // 40deg on wide screens; 55deg under 768px so the subject does not fill a narrow
    // frame and read as abstract texture (scroll-linked-3d, 320px note).
    this.fov = vw < 768 ? 55 : 40;
    this.D = vh / 2 / Math.tan((this.fov * Math.PI) / 360);
    this.near = this.D * 0.02;
    this.far = this.D * 24;

    const D = this.D;
    const n = layout.planes.length;
    this.featured = Math.max(0, layout.planes.findIndex((p) => p.featured));

    // Counter of the first letter, in world space on the name plane (z = 0).
    const nr = layout.name;
    this.counter = toWorld(
      { x: nr.x + counterFrac.x * nr.w, y: nr.y + counterFrac.y * nr.h, w: 0, h: 0 },
      vw, vh,
    );

    // ---- Corridor ----
    // The featured frame hangs deepest, on the left; the others alternate sides in
    // front of it, in projects.ts order. 1.8D spacing guarantees the camera has
    // passed every non-featured frame by the end of beat 2.
    const order = layout.planes.map((_, i) => i).filter((i) => i !== this.featured);
    if (n > 0) order.push(this.featured);
    const wBase = vw < 768 ? vw * 0.72 : Math.min(vw * 0.42, 760);
    const hBase = (wBase * 9) / 16;
    order.forEach((planeIndex, k) => {
      const side = (n - 1 - k) % 2 === 0 ? -1 : 1;
      this.corridor[planeIndex] = {
        x: side * (vw * 0.5 - wBase * 0.35),
        y: (k % 2 ? -1 : 1) * vh * 0.03,
        z: -(2.2 * D + k * 1.8 * D),
        // Each frame turns ~31deg to face down the corridor towards the camera.
        rotY: -side * 0.55,
        w: wBase, h: hBase, opacity: 1, bright: 1, assemble: 0,
      };
    });
    // Assembly order: the featured frame lands first, then the rest in grid order.
    layout.planes.forEach((_, i) => {
      this.rank[i] = i === this.featured ? 0 : i < this.featured ? i + 1 : i;
    });

    const zFeat = n > 0 ? this.corridor[this.featured].z : 0;
    // Beat 2 ends 1.35D short of the featured frame: close enough to read it, with
    // room for it to swing round to the camera in beat 3.
    this.zEnd = n > 0 ? zFeat + 1.35 * D : -0.85 * D;
  }

  /** Perspective projection to stage CSS px (y down). Matches the Three.js camera exactly. */
  project(v: Vec3, cam: Vec3): Projected {
    const d = cam.z - v.z;
    if (d <= this.near) return { x: 0, y: 0, s: 0, behind: true };
    const s = this.D / d;
    return { x: this.layout.vw / 2 + (v.x - cam.x) * s, y: this.layout.vh / 2 - (v.y - cam.y) * s, s, behind: false };
  }

  /**
   * @param p  timeline position in beats
   * @param px pointer x in -1..1 (0 = centre), py likewise, for a small camera parallax
   */
  frame(p: number, px = 0, py = 0): Frame {
    const { vw, vh, planes, subtitle } = this.layout;
    const { travel, card, assemble, settle } = this.phases;
    const D = this.D;
    const asmLen = assemble[1] - assemble[0];

    // ---- Camera: one curve across beats 1-2, so velocity is continuous at the boundary ----
    const tt = clamp01((p - travel[0]) / (travel[1] - travel[0]));
    // 60% smoothstep blended with linear: starts and ends gently but never stalls.
    const f = lerp(tt, tt * tt * (3 - 2 * tt), 0.6);
    const cz = lerp(D, this.zEnd, f);
    // Steer onto the letter's counter as z approaches the name plane, and off it
    // after: exactly 1 at z = 0, so the camera passes through the hole, not the ink.
    // smoothstep has zero slope at 0, so the steering is velocity-continuous there too.
    const bump = cz >= 0 ? 1 - smooth(0, D, cz) : 1 - smooth(0, 1.2 * D, -cz);
    const landed = smooth(assemble[0], assemble[0] + asmLen * 0.9, p);
    const parallax = 1 - landed; // pointer parallax dies out before the pixel-exact landing
    const cam: Vec3 = {
      x: this.counter.x * bump + px * vw * 0.012 * parallax,
      y: this.counter.y * bump + py * vh * 0.012 * parallax,
      z: cz,
    };

    // ---- The name ----
    const nr = this.layout.name;
    const nw = toWorld(nr, vw, vh);
    const nameT = easeInOut(clamp01((p - assemble[0]) / (asmLen * 0.9)));
    const st = toWorld(subtitle, vw, vh);
    let name: Pose = { x: nw.x, y: nw.y, z: 0, rotY: 0, w: nr.w, h: nr.h, opacity: 1, bright: 1, assemble: nameT };
    if (nameT > 0) {
      name = lerpPose(name, { x: cam.x + st.x, y: cam.y + st.y, z: cam.z - D, rotY: 0, w: subtitle.w, h: subtitle.h }, nameT);
      // It returns from behind the camera: fade it in only once it is well ahead,
      // so it never sweeps across the lens at point-blank range.
      name.opacity = smooth(0.25 * D, 0.6 * D, cam.z - name.z);
    }

    // ---- Planes ----
    const n = planes.length;
    const maxDelay = Math.min(0.3, 0.04 * Math.max(0, n - 1));
    const labels: number[] = [];
    const out: Pose[] = planes.map((plane, i) => {
      let pose: Pose = { ...this.corridor[i] };

      // Beat 3: the featured frame swings to face the camera and fills the frame.
      if (card && i === this.featured) {
        const t3 = easeInOut(clamp01(p - card[0]));
        const ffW = Math.max(vw, (vh * 16) / 9) * 1.02;
        pose = lerpPose(pose, { x: cam.x, y: cam.y, z: cam.z - D, rotY: 0, w: ffW, h: (ffW * 9) / 16 }, t3);
      }

      // Beat 4: fly to the DOM frame, staggered 0.04 of a beat, featured first.
      const delay = this.rank[i] * 0.04;
      const tA = easeInOut(clamp01((p - assemble[0] - delay * asmLen) / ((0.9 - maxDelay) * asmLen)));
      const g = toWorld(plane.rect, vw, vh);
      pose = lerpPose(pose, { x: cam.x + g.x, y: cam.y + g.y, z: cam.z - D, rotY: 0, w: plane.rect.w, h: plane.rect.h }, tA);
      pose.assemble = tA;

      const ahead = cam.z - pose.z;
      // Projector fog: frames deeper than ~1.5D fall away into the dark, so the
      // title card opens on an empty field and the corridor is discovered, not shown.
      pose.bright = 1 - smooth(1.5 * D, 3.0 * D, ahead);
      // Frames close to the lens fade, so passing one reads as it slipping by.
      pose.opacity = smooth(0.08 * D, 0.4 * D, ahead);

      const labelIn = smooth(0.8, 1.15, p);
      const labelOut = 1 - smooth(card ? card[0] : assemble[0], (card ? card[0] : assemble[0]) + 0.35, p);
      labels[i] = labelIn * labelOut * pose.opacity * smooth(0.15, 0.45, pose.bright);
      return pose;
    });

    // ---- Overlay ----
    const overlay = 1 - smooth(assemble[0] + 0.92 * asmLen, assemble[1], p);
    let cardO = 0;
    let cardShift = 0;
    if (card) {
      const cin = smooth(card[0] + 0.75, card[0] + 0.97, p);
      const cout = smooth(assemble[0], assemble[0] + 0.12, p);
      cardO = cin * (1 - cout);
      cardShift = (1 - cin) * 16;
    }

    return {
      p,
      cam,
      name,
      planes: out,
      overlay,
      role: 1 - smooth(0.05, 0.45, p),
      card: cardO,
      cardShift,
      labels,
      settle: clamp01((p - settle[0]) / (settle[1] - settle[0])),
      grain: lerp(1, 0.55, smooth(0.6, 1.6, p)) * (1 - landed),
    };
  }
}
