// Scroll Film 1 cells: 24 x 5 quads cut from the name (and from "Website Builder").
// The CPU writes each cell's rotated corners every frame; this shader only maps them.
attribute vec2 aPos;                       // corner position in CSS px, top-left origin
attribute vec2 aUvA;                       // texture coordinate of this corner in the name's region
attribute vec2 aUvB;                       // texture coordinate of this corner in the role line's region
attribute float aMix;                      // 0 = show the name cell, 1 = show the role-line cell (beat 3)
attribute float aAlpha;                    // cell opacity (rises as the cell flies into place)
uniform vec2 uView;                        // stage size in CSS px
varying vec2 vUvA;                         // passed through to the fragment shader
varying vec2 vUvB;                         // passed through to the fragment shader
varying float vMix;                        // passed through to the fragment shader
varying float vAlpha;                      // passed through to the fragment shader
void main() {                              // one corner of one cell
  vec2 clip = aPos / uView * 2.0 - 1.0;    // CSS px -> clip space -1..1
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0); // flip y: CSS grows down, clip space grows up
  vUvA = aUvA;                             // hand over the name texture coordinate
  vUvB = aUvB;                             // hand over the role texture coordinate
  vMix = aMix;                             // hand over the morph amount
  vAlpha = aAlpha;                         // hand over the opacity
}                                          // end main
