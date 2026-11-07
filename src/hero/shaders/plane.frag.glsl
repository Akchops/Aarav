// A project frame hanging in the corridor, lit by the projector.
// At assembly end (uAssemble = 1) every term below reduces to "the image, plus a
// 1px Dust frame-line at 35%" — exactly what the DOM gate draws — so the canvas
// can hand off to the DOM without a visible change.

precision highp float;

varying vec2 vUv;

uniform sampler2D uTex;      // the project still, drawn into a power-of-two canvas
uniform float uBright;       // projector light reaching this frame (distance fog), 0..1
uniform float uOpacity;      // fades frames as they slip past the lens
uniform float uAssemble;     // 0 in the corridor, 1 when landed on its DOM frame
uniform float uGrain;        // 0..1 film grain strength
uniform float uTime;         // seconds, for grain only
uniform vec3  uLine;         // Dust #8C877D as 0..1 sRGB
uniform vec3  uBlack;        // Projector Black #0B0B0A: what the fog fades towards

float hash12(vec2 p) {
  // Per-pixel white noise (not value noise: no lattice on flat frames, known-traps #1).
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 c = texture2D(uTex, vUv).rgb;

  // Projector falloff across the frame: corners up to ~18% darker. Uses the
  // squared radius from centre (no sqrt, no clamp -> no crease, known-traps #3),
  // with x weighted 0.9 so the falloff follows the 16:9 frame instead of a circle.
  vec2 q = (vUv - 0.5) * 2.0 * vec2(0.9, 1.0);
  float vig = 1.0 - 0.09 * dot(q, q);
  // The vignette belongs to the corridor only; it is gone on landing.
  c *= mix(vig, 1.0, uAssemble);

  // 1px frame-line in screen space: fwidth gives UV-per-pixel, so dividing the
  // distance to the nearest edge by it yields that distance in pixels. The
  // smoothstep over one pixel anti-aliases the line at any zoom or angle.
  vec2 fw = fwidth(vUv);
  vec2 e = min(vUv, 1.0 - vUv) / max(fw, vec2(1e-5));
  float line = 1.0 - smoothstep(0.0, 1.0, min(e.x, e.y));
  c = mix(c, uLine, line * 0.35);             // Dust at 35%, as the DOM border

  // Distance fog last, so it darkens the frame-line too: an unlit frame is fully
  // dark, not an outline. Fades towards the page black rather than transparent,
  // so a distant frame reads as unlit, not as a ghost.
  c = mix(uBlack, c, uBright);

  // Grain, fading out with assembly so the landed frame is clean, and scaled by
  // the light so an unlit frame is plain black, not a patch of noise in the dark.
  float g = hash12(gl_FragCoord.xy + floor(uTime * 24.0) * vec2(17.0, 59.0));
  c += (g - 0.5) * 0.06 * uGrain * (1.0 - uAssemble) * uBright;

  gl_FragColor = vec4(c, uOpacity);
}
