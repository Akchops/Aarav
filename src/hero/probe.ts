/**
 * Silent WebGL capability probe (webgl-shader-interaction-engineer Gate 1).
 * Never throws, never logs. Releases its context immediately.
 * Three.js r163+ is WebGL2-only, so tier 1 requires WebGL2.
 */
export interface Caps {
  version: 1 | 2;
  maxTexture: number;
  renderer: string;
  tier: 'high' | 'medium' | 'low';
}

export function probeWebGL(allowCaveat = false): Caps | null {
  // Feature-detect before creating anything: silent on browsers with WebGL disabled.
  if (typeof WebGL2RenderingContext === 'undefined' && typeof WebGLRenderingContext === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const attrs: WebGLContextAttributes = {
    // A software rasteriser reports as unsupported, so tier 2 (faster) takes over.
    // Only the QA override (?tier=1) relaxes this.
    failIfMajorPerformanceCaveat: !allowCaveat,
    powerPreference: 'high-performance',
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
  };

  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  let version: 1 | 2 = 2;
  try {
    // getContext can throw, not just return null; catching keeps the console clean.
    gl = canvas.getContext('webgl2', attrs);
    if (!gl) {
      gl = canvas.getContext('webgl', attrs) as WebGLRenderingContext | null;
      version = 1;
    }
  } catch {
    return null;
  }
  if (!gl) return null;

  const maxTexture = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0;
  // The debug extension is absent in privacy-hardened browsers: unknown, not failure.
  let renderer = '';
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
  } catch {
    /* informational only */
  }
  // Release the probe context now: browsers cap live contexts (~8-16) and silently
  // drop the oldest; a leaked probe kills a later scene.
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    /* ignore */
  }

  const soft = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const tier: Caps['tier'] =
    soft || maxTexture < 4096 ? 'low' : mem <= 4 || cores <= 4 || maxTexture < 8192 ? 'medium' : 'high';

  return { version, maxTexture, renderer, tier };
}
