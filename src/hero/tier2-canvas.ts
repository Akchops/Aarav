/**
 * Tier 2 — Canvas 2D. Traces the same behaviour as tier 1 from the same scene
 * model: the camera still travels through the name and down the corridor, the
 * two project images still hang in perspective, swing to full frame and land on
 * the grid, and the pointer (or a tap) still opens a lens with split channels
 * over the name. What is lost is only the liquid per-pixel displacement.
 */
import type { Frame, Pose, SceneModel, Vec3 } from './model';
import type { Assets, Inputs, Tier } from './tier';

const BG = '#0B0B0A';
const SLICES = 16; // vertical strips per rotated frame: true perspective from affine draws

function tinted(src: HTMLCanvasElement, rgb: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = rgb;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function noise(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 22;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function createCanvas2D(): Tier {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage__fx';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const layer = document.createElement('canvas'); // the name, composited with its lens
  const lctx = layer.getContext('2d')!;
  let model: SceneModel | null = null;
  let assets: Assets | null = null;
  // The name in Silver Screen, plus its three channel records for the lens split
  // (added with 'lighter' on a transparent layer, r + g + b = the ink colour).
  let ink: { full: HTMLCanvasElement; r: HTMLCanvasElement; g: HTMLCanvasElement; b: HTMLCanvasElement } | null = null;
  let grain: CanvasPattern | null = null;

  const size = () => {
    if (!model) return;
    const { vw, vh } = model.layout;
    canvas.width = Math.round(vw * tier.dpr);
    canvas.height = Math.round(vh * tier.dpr);
    layer.width = canvas.width;
    layer.height = canvas.height;
  };

  function drawPlane(img: HTMLCanvasElement, p: Pose, cam: Vec3) {
    const m = model!;
    const dpr = tier.dpr;
    const hw = p.w / 2, hh = p.h / 2;
    const c = Math.cos(p.rotY), s = Math.sin(p.rotY);
    // Plane-local (lx, ly) -> world, matching Three's rotation.y convention.
    const pt = (lx: number, ly: number) => m.project({ x: p.x + lx * c, y: p.y + ly, z: p.z - lx * s }, cam);
    const corners = [pt(-hw, hh), pt(hw, hh), pt(hw, -hh), pt(-hw, -hh)];
    if (corners.some((q) => q.behind)) return;

    ctx.globalAlpha = p.opacity;
    if (Math.abs(p.rotY) < 1e-4) {
      // Facing the camera: a plain rect. This is the pixel-exact landing path.
      const [tl, , br] = corners;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(img, tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    } else {
      const W = img.width, H = img.height;
      for (let j = 0; j < SLICES; j++) {
        const u0 = j / SLICES, u1 = (j + 1) / SLICES;
        const x0 = -hw + 2 * hw * u0, x1 = -hw + 2 * hw * u1;
        const TL = pt(x0, hh), TR = pt(x1, hh), BL = pt(x0, -hh);
        const sw = W * (u1 - u0);
        // Affine map: source strip (0,0)-(sw,H) onto TL / TR / BL, scaled to device px.
        const a = (TR.x - TL.x) / sw, b = (TR.y - TL.y) / sw;
        const cc = (BL.x - TL.x) / H, d = (BL.y - TL.y) / H;
        ctx.setTransform(dpr * a, dpr * b, dpr * cc, dpr * d, dpr * TL.x, dpr * TL.y);
        // +1px of source overlap hides seams between strips.
        ctx.drawImage(img, W * u0, 0, Math.min(sw + 1, W - W * u0), H, 0, 0, sw + 1, H);
      }
    }
    // Fog towards the page black, and the 1px Dust frame-line, as in plane.frag.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath();
    corners.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
    if (p.bright < 0.999) {
      ctx.fillStyle = `rgba(11,11,10,${1 - p.bright})`;
      ctx.fill();
    }
    // The fog darkens the frame-line too (as plane.frag): an unlit frame is fully dark.
    ctx.strokeStyle = `rgba(140,135,125,${(0.35 * p.bright).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawName(frame: Frame, inp: Inputs) {
    const m = model!, a = assets!;
    const n = frame.name;
    const pr = m.project(n, frame.cam);
    if (pr.behind || n.opacity < 0.001) return;
    const dpr = tier.dpr;
    const w = n.w * pr.s, h = n.h * pr.s;
    const x = pr.x - w / 2, y = pr.y - h / 2;
    // Past ~14x the name is a blur of ink filling the screen; stop drawing it.
    if (pr.s > 14) return;
    const src = a.name.canvas;
    const sh = src.height * a.name.extent.y;

    const lens = inp.pointer.presence > 0.01 || inp.pointer.speed > 0.01 || inp.ripple.age >= 0;
    const target = lens ? lctx : ctx;
    if (lens) {
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.clearRect(0, 0, layer.width, layer.height);
    }
    target.setTransform(dpr, 0, 0, dpr, 0, 0);
    target.save();
    // Develop: the same bottom-up clip and fade as the CSS keyframes.
    const dev = inp.develop;
    target.beginPath();
    target.rect(x - 4, y + h * (1 - dev) - 1, w + 8, h * dev + 2);
    target.clip();
    target.globalAlpha = dev * n.opacity;
    // Plain ink, source-over: identical to the DOM <h1> at rest.
    target.drawImage(ink!.full, 0, 0, src.width, sh, x, y, w, h);
    target.restore();

    if (lens) {
      // The lens: a circle at the pointer (or the tap) shows the name magnified,
      // with the red and blue records offset along the motion — the same reveal as
      // tier 1, with a hard circular edge instead of a displaced one.
      const vw = m.layout.vw, vh = m.layout.vh;
      const tap = inp.ripple.age >= 0 && inp.pointer.presence < 0.5;
      const cx = tap ? inp.ripple.x : inp.pointer.x;
      const cy = tap ? inp.ripple.y : inp.pointer.y;
      // A tap opens the lens and lets it settle like a damped spring.
      const tapAmt = tap ? Math.exp(-inp.ripple.age * 3.2) * (1 + 0.25 * Math.cos(inp.ripple.age * 13)) : 0;
      const amount = Math.min(1, Math.max(inp.pointer.presence, inp.pointer.speed, tapAmt));
      const R = Math.max(70, Math.min(vw, vh) * 0.16) * (0.55 + 0.45 * amount);
      const mag = 1 + 0.22 * amount;
      const sp = Math.hypot(inp.pointer.vx, inp.pointer.vy) || 1;
      const off = (1.5 + 6 * inp.pointer.speed) * amount;
      const ox = (inp.pointer.vx / sp) * off, oy = (inp.pointer.vy / sp) * off;

      lctx.save();
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.beginPath();
      lctx.arc(cx, cy, R, 0, Math.PI * 2);
      lctx.clip();
      lctx.clearRect(cx - R, cy - R, R * 2, R * 2);
      lctx.translate(cx, cy);
      lctx.scale(mag, mag);
      lctx.translate(-cx, -cy);
      lctx.globalAlpha = dev * n.opacity;
      lctx.globalCompositeOperation = 'lighter';
      lctx.drawImage(ink!.r, 0, 0, src.width, sh, x + ox, y + oy, w, h);
      lctx.drawImage(ink!.g, 0, 0, src.width, sh, x, y, w, h);
      lctx.drawImage(ink!.b, 0, 0, src.width, sh, x - ox, y - oy, w, h);
      lctx.restore();

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layer, 0, 0);
    }
  }

  const tier: Tier = {
    kind: 2,
    canvas,
    dpr: 1,
    setup(m: SceneModel, a: Assets) {
      model = m;
      assets = a;
      ink = {
        full: tinted(a.name.canvas, 'rgb(237,233,225)'),
        r: tinted(a.name.canvas, 'rgb(237,0,0)'),
        g: tinted(a.name.canvas, 'rgb(0,233,0)'),
        b: tinted(a.name.canvas, 'rgb(0,0,225)'),
      };
      grain = ctx.createPattern(noise(), 'repeat');
      size();
    },
    render(frame: Frame, inp: Inputs) {
      if (!model || !assets) return;
      const dpr = tier.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Far to near.
      const order = frame.planes.map((p, i) => [frame.cam.z - p.z, i] as const).sort((a, b) => b[0] - a[0]);
      for (const [ahead, i] of order) {
        const p = frame.planes[i];
        if (ahead <= model.near || p.opacity < 0.001) continue;
        drawPlane(assets.images[i], p, frame.cam);
      }
      drawName(frame, inp);

      // Grain at 24fps: a noise tile offset per film frame.
      if (grain && frame.grain > 0.01) {
        const f = Math.floor(inp.time * 24);
        ctx.setTransform(dpr, 0, 0, dpr, (f * 37) % 128, (f * 71) % 128);
        ctx.globalAlpha = frame.grain;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grain;
        ctx.fillRect(-128, -128, model.layout.vw + 256, model.layout.vh + 256);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    },
    setDpr(dpr: number) {
      tier.dpr = dpr;
      size();
    },
    destroy() {
      canvas.remove();
    },
  };
  return tier;
}
