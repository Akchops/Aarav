// The Set, Piece B: a full-canvas triangle for the image lens.
attribute vec2 aPos;                       // -1..3 corners: one triangle covers the canvas
varying vec2 vUv;                          // 0..1 across the visible canvas, bottom-left origin
void main() {                              // one corner
  vUv = aPos * 0.5 + 0.5;                  // clip space -> 0..1
  gl_Position = vec4(aPos, 0.0, 1.0);      // already in clip space
}                                          // end main
