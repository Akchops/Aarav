// The Set, Piece B: a lens over featured[0]'s image. Under the pointer the image
// magnifies 1.6x and the colour channels split at the rim, with a smooth falloff.
precision highp float;                     // highp: mediump bands across photographs
varying vec2 vUv;                          // 0..1 across the canvas, bottom-left origin
uniform sampler2D uImage;                  // the project still
uniform vec4 uCover;                       // object-fit: cover as a uv transform: scale (xy), offset (zw)
uniform vec2 uMouse;                       // lens centre in device px, bottom-left origin
uniform float uRadius;                     // lens radius in device px
uniform float uStrength;                   // 0..1: how present the lens is (eases in and out)
uniform vec2 uRes;                         // canvas size in device px
vec3 img(vec2 uv) {                        // the image at a canvas uv, cover-fitted
  return texture2D(uImage, uv * uCover.xy + uCover.zw).rgb; // crop and scale like CSS object-fit: cover
}                                          // end img
void main() {                              // one fragment of the canvas
  vec2 frag = vUv * uRes;                  // this fragment in device px
  vec2 toM = frag - uMouse;                // from the lens centre to this fragment
  float d = length(toM);                   // distance from the lens centre
  float x = clamp(1.0 - (d * d) / (uRadius * uRadius), 0.0, 1.0); // 1 at the centre, 0 at the rim
  float fall = x * x * x * uStrength;      // cubed falloff: no plateau, no visible circular edge
  vec2 src = uMouse + toM / mix(1.0, 1.6, fall); // magnify: sample a point pulled towards the centre (1.6x at the middle)
  vec2 uv = src / uRes;                    // back to canvas uv
  vec2 dir = d > 0.5 ? toM / d : vec2(0.0); // outward direction; guarded at the exact centre
  float caPx = fall * (1.0 - fall) * 4.0 * 6.0; // the split peaks mid-rim, up to 6 device px
  vec2 ca = dir * caPx / uRes;             // the split in uv units
  vec3 c = vec3(img(uv + ca).r, img(uv).g, img(uv - ca).b); // red pushed out, green in place, blue pulled in
  gl_FragColor = vec4(c, 1.0);             // opaque: the canvas is the picture
}                                          // end main
