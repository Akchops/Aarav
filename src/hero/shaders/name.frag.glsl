// The name, as film under a projector lens (signature S1).
//
// Per pixel, the letterforms are sampled through three displacements that add
// together: a magnifying lens at the pointer, a smear along the pointer's
// velocity, and a damped ripple after a tap. The edge of the lens splits the
// colour channels the way a cheap projector lens does. All three are zero when
// the pointer is away and still, so at rest the canvas matches the DOM <h1>.

precision highp float;   // mediump bands visibly across the large flat ink areas

varying vec2 vUv;

uniform sampler2D uTex;  // alpha mask of the name, drawn from the same webfont as the <h1>
uniform vec2  uExtent;   // fraction of the power-of-two texture the text box occupies (x, y)
uniform vec4  uRect;     // this plane's on-screen rect in device px: x, y (bottom-left), w, h
uniform vec2  uMouse;    // pointer in device px, bottom-left origin, damped on the JS side
uniform vec2  uVel;      // pointer velocity in device px per frame, damped
uniform float uSpeed;    // 0..1 normalised pointer speed, damped (rises fast, decays slow)
uniform float uPresence; // 0..1, eased: 1 while a pointer is over the stage or a finger is down
uniform float uRadius;   // lens radius in device px (scales with the viewport, not the zoom)
uniform vec3  uRipple;   // xy = tap point in device px, z = seconds since the tap (< 0 = none)
uniform float uDpr;      // device pixel ratio, so px-tuned constants survive any screen
uniform float uDevelop;  // 0..1 develop progress, eased identically to the CSS keyframes
uniform float uOpacity;  // overall plane opacity from the scene model
uniform float uGrain;    // 0..1 film grain strength from the scene model
uniform float uTime;     // seconds, for grain only
uniform vec3  uInk;      // Silver Screen #EDE9E1 as 0..1 sRGB; output is not colour-managed

// Integer-ish hash for grain. Per-pixel white noise, deliberately not value
// noise: value noise on a large flat area shows its lattice as a grid
// (known-traps #1). Re-seeded 24 times a second, the rate of film.
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Sample the name's alpha at a plane UV, mapped into the drawn part of the texture.
// Outside the plane the mask is 0, so displaced samples never wrap or smear the edge.
float ink(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  // Canvas rows run top-down and textures are uploaded flipped, so v=1 is the
  // canvas top; the text occupies the top uExtent.y of the texture.
  vec2 t = vec2(uv.x * uExtent.x, 1.0 - (1.0 - uv.y) * uExtent.y);
  return texture2D(uTex, t).a;
}

void main() {
  vec2 frag = gl_FragCoord.xy;            // this fragment, device px, bottom-left origin

  // ---- Lens ----
  vec2 toM = frag - uMouse;               // from the pointer to this fragment
  float d = length(toM);
  // Compact smooth kernel: 1 at the pointer, 0 at uRadius, with value, slope and
  // curvature all reaching zero at the rim, so there is no visible circular edge
  // (known-traps #2). x is quadratic in d, so the centre is curved, not a plateau.
  float x = clamp(1.0 - (d * d) / (uRadius * uRadius), 0.0, 1.0);
  float fall = x * x * x;
  // Radial unit vector, guarded: at d == 0 normalising would give a NaN pixel
  // that shows as a black dot under the cursor.
  vec2 dir = d > 0.5 ? toM / d : vec2(0.0);

  // Magnify: sample a point pulled towards the pointer, so the ink under the lens
  // appears bigger. 0.22 is a strong but readable loupe; above ~0.35 letters tear.
  vec2 offPx = -toM * (0.22 * uPresence) * fall;

  // Smear: sample behind the direction of travel, so fast strokes drag the
  // emulsion. Scaled by speed, so a still pointer leaves the name undisturbed.
  offPx -= uVel * fall * 1.4 * uSpeed;

  // ---- Ripple: a ring that travels out from a tap and decays like a damped spring ----
  if (uRipple.z >= 0.0) {
    vec2 rp = frag - uRipple.xy;
    float rd = length(rp);
    float age = uRipple.z;
    float ringR = age * 700.0 * uDpr;                     // ring expands at 700 CSS px/s
    float w = 46.0 * uDpr;                                // ring half-width
    float ring = exp(-((rd - ringR) * (rd - ringR)) / (w * w)); // Gaussian: no hard edge
    // exp decay x cosine = a damped spring: the bounce exists only after a gesture.
    float amp = 22.0 * uDpr * exp(-age * 3.2) * cos(age * 13.0);
    offPx += (rd > 0.5 ? rp / rd : vec2(0.0)) * ring * amp;
  }

  // Screen-px offsets to plane UV: divide by the plane's on-screen size, so the
  // effect has a constant size on screen however close the camera is.
  vec2 uv = vUv + offPx / uRect.zw;

  // ---- Chromatic split at the lens rim ----
  // fall * (1 - fall) peaks mid-rim and is zero at the centre and outside, so the
  // fringes live only on the curved part of the lens. Beyond ~8px it stops reading
  // as optics and starts reading as a broken display.
  float caPx = fall * (1.0 - fall) * 4.0 * (1.5 + 6.0 * uSpeed) * uDpr * max(uPresence, uSpeed);
  vec2 ca = dir * caPx / uRect.zw;
  float aR = ink(uv + ca);
  float aG = ink(uv);
  float aB = ink(uv - ca);
  float a = max(aR, max(aG, aB));

  // ---- Develop: the name rises out of the dark from the bottom ----
  // Mirrors the CSS keyframes (clip from the bottom + opacity). The grainy band
  // makes the edge read as emulsion; *1.08 pushes the band past the top at 1.0 so
  // the fully developed name is never clipped.
  float g = hash12(frag + floor(uTime * 24.0) * vec2(17.0, 59.0));
  float edge = uDevelop * 1.08;
  float developed = 1.0 - smoothstep(edge - 0.08, edge, vUv.y + (g - 0.5) * 0.06);
  a *= developed * uDevelop * uOpacity;

  // Grain on the ink only: +/- ~4% of brightness, re-seeded at 24fps. Stronger
  // reads as sand rather than film once the letters fill the screen.
  vec3 col = uInk * (1.0 + (g - 0.5) * 0.08 * uGrain);

  // Per-channel coverage gives colour fringes where the channels disagree; divide
  // by total alpha because three.js blends non-premultiplied (SRC_ALPHA, 1-SRC_ALPHA).
  vec3 rgb = col * vec3(aR, aG, aB) / max(max(aR, max(aG, aB)), 1e-4);
  gl_FragColor = vec4(rgb, a);
}
