/**
 * Raw WebGL harness (~2 kB): context, program compile, buffers, textures and
 * uniforms. No Three.js: the homepage's shaders are flat quads, so a scene graph
 * would be 100+ kB of nothing.
 */
export interface Raw {
  gl: WebGLRenderingContext;
  program(vs: string, fs: string): WebGLProgram | null;
  texture(source: TexImageSource): WebGLTexture;
  uniforms(p: WebGLProgram, u: Record<string, number | number[]>): void;
  lost(): boolean;
}

export function createRaw(canvas: HTMLCanvasElement, allowCaveat: boolean): Raw | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: !allowCaveat,
    }) as WebGLRenderingContext | null;
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const g = gl;
  const locs = new WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  function compile(type: number, src: string) {
    const s = g.createShader(type)!;
    g.shaderSource(s, src);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
      // Dev only: in production a compile failure drops to tier 2 silently.
      if (import.meta.env.DEV) console.warn(g.getShaderInfoLog(s));
      g.deleteShader(s);
      return null;
    }
    return s;
  }

  return {
    gl: g,
    program(vs, fs) {
      const v = compile(g.VERTEX_SHADER, vs);
      const f = compile(g.FRAGMENT_SHADER, fs);
      if (!v || !f) return null;
      const p = g.createProgram()!;
      g.attachShader(p, v);
      g.attachShader(p, f);
      g.linkProgram(p);
      g.deleteShader(v);
      g.deleteShader(f);
      if (!g.getProgramParameter(p, g.LINK_STATUS)) {
        g.deleteProgram(p);
        return null;
      }
      return p;
    },
    texture(source) {
      const t = g.createTexture()!;
      g.bindTexture(g.TEXTURE_2D, t);
      // CLAMP + LINEAR, no mipmaps: legal for any size in WebGL1. Anything else on
      // a non-power-of-two image renders black, silently.
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true); // images are top-left origin, GL is bottom-left
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, source);
      return t;
    },
    uniforms(p, u) {
      let m = locs.get(p);
      if (!m) locs.set(p, (m = new Map()));
      for (const [name, value] of Object.entries(u)) {
        if (!m.has(name)) m.set(name, g.getUniformLocation(p, name));
        const l = m.get(name);
        if (!l) continue; // optimised away: unused
        if (typeof value === 'number') g.uniform1f(l, value);
        else if (value.length === 2) g.uniform2fv(l, value);
        else if (value.length === 3) g.uniform3fv(l, value);
        else g.uniform4fv(l, value);
      }
    },
    lost: () => g.isContextLost(),
  };
}
