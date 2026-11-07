// Full-screen background for Scroll Film 1: one triangle that covers clip space.
attribute vec2 aPos;                       // -1..3 corners: overshoots the viewport so one triangle fills it
void main() {                              // no matrices: positions are already in clip space
  gl_Position = vec4(aPos, 0.0, 1.0);      // z = 0, w = 1: a flat, unprojected triangle
}                                          // end main
