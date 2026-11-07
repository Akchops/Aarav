/**
 * The dark field behind everything: Projector Black plus film grain.
 * Drawn as a full-screen triangle pair straight in clip space, so it ignores the
 * camera and always covers the viewport.
 */
export const bgVert = /* glsl */ `
// Clip-space quad: position is already -1..1, so no matrices are applied.
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const bgFrag = /* glsl */ `
precision highp float;

uniform vec3  uBlack;  // Projector Black #0B0B0A as 0..1 sRGB (output not colour-managed)
uniform float uGrain;  // 0..1 grain strength from the scene model
uniform float uTime;   // seconds

float hash12(vec2 p) {
  // Per-pixel white noise; value noise would show a lattice on this flat field.
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  // Re-seed 24 times a second: the cadence of film, and slow enough not to shimmer.
  float g = hash12(gl_FragCoord.xy + floor(uTime * 24.0) * vec2(17.0, 59.0));
  // +/- 1.5 8-bit steps on near-black: visible as grain, never as a lifted black.
  gl_FragColor = vec4(uBlack + (g - 0.5) * (3.0 / 255.0) * uGrain, 1.0);
}
`;
