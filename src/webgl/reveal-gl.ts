/**
 * Tier 1 renderer for Scroll Film 1: raw WebGL. A full-screen grain field, then
 * 120 cell quads (24 x 5) whose corners the CPU writes each frame, sampled
 * through the lens shader. One texture, two programs, two draw calls.
 */
import bgVert from './shaders/bg.vert.glsl?raw';
import bgFrag from './shaders/bg.frag.glsl?raw';
import cellVert from './shaders/reveal.vert.glsl?raw';
import cellFrag from './shaders/reveal.frag.glsl?raw';
import { createRaw } from './raw';
import type { RevealFrame, RevealRenderer, RevealScene } from '../home/types';

const FLOATS = 8; // per vertex: pos 2, uvA 2, uvB 2, mix 1, alpha 1

export function createRevealGL(allowCaveat: boolean, onLost: () => void): RevealRenderer | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'reveal__fx';
  canvas.setAttribute('aria-hidden', 'true');
  const raw = createRaw(canvas, allowCaveat);
  if (!raw) return null;
  const { gl } = raw;
  const bg = raw.program(bgVert, bgFrag);
  const cells = raw.program(cellVert, cellFrag);
  if (!bg || !cells) return null;

  const lost = (e: Event) => {
    e.preventDefault(); // keep the context restorable; tier 2 takes over now
    onLost();
  };
  canvas.addEventListener('webglcontextlost', lost);

  const tri = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const quads = gl.createBuffer()!;
  let data = new Float32Array(0);
  let tex: WebGLTexture | null = null;
  let scene: RevealScene | null = null;

  const attr = (p: WebGLProgram, name: string, size: number, stride: number, offset: number) => {
    const l = gl.getAttribLocation(p, name);
    if (l < 0) return;
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride * 4, offset * 4);
  };

  const r: RevealRenderer = {
    kind: 1,
    canvas,
    dpr: 1,
    setup(s) {
      scene = s;
      if (tex) gl.deleteTexture(tex);
      tex = raw.texture(s.tex);
      data = new Float32Array(120 * 6 * FLOATS);
      gl.bindBuffer(gl.ARRAY_BUFFER, quads);
      gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
      r.setDpr(r.dpr);
    },
    setDpr(d) {
      r.dpr = d;
      if (!scene) return;
      canvas.width = Math.round(scene.W * d);
      canvas.height = Math.round(scene.H * d);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    render(f: RevealFrame, time: number) {
      if (!scene || raw.lost()) return;
      const { W, H, tex: t } = scene;
      const tw = t.width, th = t.height, d = r.dpr;

      // Background: one triangle, grain.
      gl.disable(gl.BLEND);
      gl.useProgram(bg);
      gl.bindBuffer(gl.ARRAY_BUFFER, tri);
      attr(bg, 'aPos', 2, 2, 0);
      raw.uniforms(bg, { uBg: [11 / 255, 11 / 255, 10 / 255], uGrain: f.grain, uTime: time });
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Cells: write each rotated quad's six vertices.
      let o = 0;
      for (const c of f.cells) {
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
        const hw = c.w / 2, hh = c.h / 2;
        const corner = (sx: number, sy: number) => [cx + sx * hw * cos - sy * hh * sin, cy + sx * hw * sin + sy * hh * cos];
        const uvA = (sx: number, sy: number) => [(c.a.x + ((sx + 1) / 2) * c.a.w) / tw, 1 - (c.a.y + ((sy + 1) / 2) * c.a.h) / th];
        const uvB = (sx: number, sy: number) => [(c.b.x + ((sx + 1) / 2) * c.b.w) / tw, 1 - (c.b.y + ((sy + 1) / 2) * c.b.h) / th];
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, -1], [1, 1], [-1, 1]]) {
          const p = corner(sx, sy), a = uvA(sx, sy), b = uvB(sx, sy);
          data[o++] = p[0]; data[o++] = p[1];
          data[o++] = a[0]; data[o++] = a[1];
          data[o++] = b[0]; data[o++] = b[1];
          data[o++] = c.mix; data[o++] = c.alpha;
        }
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(cells);
      gl.bindBuffer(gl.ARRAY_BUFFER, quads);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      attr(cells, 'aPos', 2, FLOATS, 0);
      attr(cells, 'aUvA', 2, FLOATS, 2);
      attr(cells, 'aUvB', 2, FLOATS, 4);
      attr(cells, 'aMix', 1, FLOATS, 6);
      attr(cells, 'aAlpha', 1, FLOATS, 7);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const n = scene.nameRect, nt = scene.nameTex;
      raw.uniforms(cells, {
        uView: [W, H],
        uInk: [237 / 255, 233 / 255, 225 / 255],
        uMouse: [f.lens.x * d, (H - f.lens.y) * d],
        uRadius: f.lens.radius * d,
        uPresence: f.lens.presence,
        uNameRect: [n.x * d, (H - n.y - n.h) * d, n.w * d, n.h * d],
        uNameUv: [nt.x / tw, 1 - (nt.y + nt.h) / th, nt.w / tw, nt.h / th],
        uDpr: d,
      });
      gl.uniform1i(gl.getUniformLocation(cells, 'uTex'), 0);
      gl.drawArrays(gl.TRIANGLES, 0, f.cells.length * 6);
    },
    destroy() {
      canvas.removeEventListener('webglcontextlost', lost);
      try {
        if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        /* ignore */
      }
      canvas.remove();
    },
  };
  return r;
}
