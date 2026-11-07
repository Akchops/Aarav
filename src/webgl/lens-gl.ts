/**
 * Tier 1 renderer for The Set's Piece B: raw WebGL, one full-canvas triangle,
 * the lens fragment shader (uImage, uMouse, uRadius, uStrength).
 */
import lensVert from './shaders/lens.vert.glsl?raw';
import lensFrag from './shaders/lens.frag.glsl?raw';
import { createRaw } from './raw';
import type { LensRenderer, LensState } from '../home/types';

export function createLensGL(allowCaveat: boolean, onLost: () => void): LensRenderer | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'lens__fx';
  canvas.setAttribute('aria-hidden', 'true');
  const raw = createRaw(canvas, allowCaveat);
  if (!raw) return null;
  const { gl } = raw;
  const prog = raw.program(lensVert, lensFrag);
  if (!prog) return null;
  const lost = (e: Event) => {
    e.preventDefault();
    onLost();
  };
  canvas.addEventListener('webglcontextlost', lost);
  const tri = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  let tex: WebGLTexture | null = null;
  let cover = [1, 1, 0, 0];
  let w = 1, h = 1;
  let iw = 1, ih = 1;

  const computeCover = () => {
    // object-fit: cover as a uv transform: crop the longer image axis to the canvas aspect.
    const ca = w / h, ia = iw / ih;
    cover = ia > ca ? [ca / ia, 1, (1 - ca / ia) / 2, 0] : [1, ia / ca, 0, (1 - ia / ca) / 2];
  };

  const r: LensRenderer = {
    kind: 1,
    canvas,
    dpr: 1,
    setup(source, cw, ch) {
      w = cw;
      h = ch;
      iw = source.naturalWidth || 1600;
      ih = source.naturalHeight || 900;
      if (tex) gl.deleteTexture(tex);
      tex = raw.texture(source);
      computeCover();
      r.setDpr(r.dpr);
    },
    setDpr(d) {
      r.dpr = d;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    render(s: LensState) {
      if (!tex || raw.lost()) return;
      const d = r.dpr;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, tri);
      const l = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(prog, 'uImage'), 0);
      raw.uniforms(prog, {
        uCover: cover,
        uMouse: [s.x * d, (h - s.y) * d],
        // Lens radius: 18% of the short side.
        uRadius: Math.min(w, h) * 0.18 * d,
        uStrength: s.presence,
        uRes: [canvas.width, canvas.height],
      });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
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
