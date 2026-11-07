// Scroll Film 1 cells, with the pointer lens of beat 2 (signature: shader pointer
// interaction). Inside the lens the letters magnify up to 1.6x and their colour
// channels split at the rim; the falloff is smooth, so the lens has no edge.
precision highp float;                     // highp: mediump steps visibly inside large letters
varying vec2 vUvA;                         // this fragment's coordinate in the name region
varying vec2 vUvB;                         // this fragment's coordinate in the role-line region
varying float vMix;                        // 0 name -> 1 role line (beat 3 morph)
varying float vAlpha;                      // cell opacity
uniform sampler2D uTex;                    // one texture: the name on top, "Website Builder" below, white alpha
uniform vec3 uInk;                         // Silver Screen #EDE9E1 as 0..1 sRGB
uniform vec2 uMouse;                       // lens centre in device px, bottom-left origin
uniform float uRadius;                     // lens radius in device px
uniform float uPresence;                   // 0..1: the lens exists only in beat 2
uniform vec4 uNameRect;                    // the assembled name box in device px: x, y (bottom-left), w, h
uniform vec4 uNameUv;                      // the same box in texture space: u, v (bottom-left), width, height
uniform float uDpr;                        // device pixel ratio, so px-tuned values hold on any screen
float ink(vec2 uv) {                       // coverage of the letters at a texture coordinate
  return texture2D(uTex, uv).a;            // the texture is white text on transparent: alpha is the ink
}                                          // end ink
void main() {                              // one fragment of one cell
  float a = mix(ink(vUvA), ink(vUvB), vMix); // the cell's own content: name, role line, or in between
  vec3 cov = vec3(a);                      // per-channel coverage; equal unless the lens splits it
  vec2 toM = gl_FragCoord.xy - uMouse;     // from the lens centre to this fragment, device px
  float d = length(toM);                   // distance from the lens centre
  float x = clamp(1.0 - (d * d) / (uRadius * uRadius), 0.0, 1.0); // 1 at the centre, 0 at the rim
  float fall = x * x * x * uPresence;      // cubed: value, slope and curvature reach 0 at the rim, so no visible ring
  if (fall > 0.0005) {                     // only fragments under the lens pay for the extra samples
    vec2 src = uMouse + toM / mix(1.0, 1.6, fall); // magnify: sample a point pulled towards the centre (1.6x at the middle)
    vec2 rel = (src - uNameRect.xy) / uNameRect.zw; // that point as 0..1 across the assembled name box
    vec2 uv = uNameUv.xy + rel * uNameUv.zw; // and as a texture coordinate (the name is assembled in beat 2)
    vec2 dir = d > 0.5 ? toM / d : vec2(0.0); // outward direction; guarded so the centre pixel is not NaN
    float caPx = fall * (1.0 - fall) * 4.0 * 6.0 * uDpr; // channel split peaks mid-rim (up to 6 px), zero at centre and edge
    vec2 ca = dir * caPx / uNameRect.zw * uNameUv.zw; // the split converted from device px to texture units
    vec3 lensCov = vec3(ink(uv + ca), ink(uv), ink(uv - ca)); // red pushed out, green in place, blue pulled in
    cov = mix(cov, lensCov, smoothstep(0.0, 0.02, fall)); // blend in over a hair, so the lens boundary is invisible
  }                                        // end lens
  float cover = max(cov.r, max(cov.g, cov.b)); // total coverage of this fragment
  vec3 rgb = uInk * cov / max(cover, 0.0001); // tinted by channel where the lens splits, plain ink elsewhere
  gl_FragColor = vec4(rgb, cover * vAlpha); // blended over the background (SRC_ALPHA, ONE_MINUS_SRC_ALPHA)
}                                          // end main
