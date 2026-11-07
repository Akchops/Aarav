/**
 * Silent WebGL capability probe. Never throws, never logs. Releases its context
 * at once (browsers cap live contexts). The result is cached for the page.
 */
export interface Caps {
  maxTexture: number;
  renderer: string;
  /** Software rasteriser (SwiftShader, llvmpipe…): tier 2 is faster there. */
  soft: boolean;
}

const cache = new Map<boolean, Caps | null>();

export function probeWebGL(allowCaveat = false): Caps | null {
  if (cache.has(allowCaveat)) return cache.get(allowCaveat)!;
  let caps: Caps | null = null;
  // Feature-detect before creating anything: silent where WebGL is disabled.
  if (typeof WebGLRenderingContext !== 'undefined') {
    const canvas = document.createElement('canvas');
    let gl: WebGLRenderingContext | null = null;
    try {
      // getContext can throw, not only return null. failIfMajorPerformanceCaveat
      // makes a software rasteriser report as unsupported unless QA forces tier 1.
      gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: !allowCaveat, antialias: false, depth: false }) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (gl) {
      let renderer = '';
      try {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      } catch {
        /* informational only */
      }
      caps = {
        maxTexture: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0,
        renderer,
        soft: /swiftshader|llvmpipe|software|basic render/i.test(renderer),
      };
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        /* ignore */
      }
    }
  }
  cache.set(allowCaveat, caps);
  return caps;
}
