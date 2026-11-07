// The dark field behind the name: Projector Black with film grain.
precision highp float;                     // highp: mediump bands visibly on near-black gradients
uniform vec3 uBg;                          // Projector Black #0B0B0A as 0..1 sRGB (output is not colour-managed)
uniform float uGrain;                      // 0..1 grain strength: full in beats 1-2, ambient after the morph
uniform float uTime;                       // seconds; only used to re-seed the grain
float hash12(vec2 p) {                     // per-pixel white noise, not value noise (no lattice grid on a flat field)
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);   // scramble the pixel coordinate into three channels
  p3 += dot(p3, p3.yzx + 33.33);           // mix the channels so neighbouring pixels decorrelate
  return fract((p3.x + p3.y) * p3.z);      // fold to a single 0..1 value
}                                          // end hash12
void main() {                              // one fragment of the background
  float g = hash12(gl_FragCoord.xy + floor(uTime * 24.0) * vec2(17.0, 59.0)); // new grain 24 times a second, the rate of film
  vec3 c = uBg + (g - 0.5) * (3.0 / 255.0) * uGrain; // +/- 1.5 8-bit steps: visible as grain, never a lifted black
  gl_FragColor = vec4(c, 1.0);             // opaque: the cells blend over it
}                                          // end main
