// Shared vertex shader for the name and the project planes.
// Standard projection: the planes are real geometry in a real perspective
// camera, so the corridor's depth and parallax come out of the projection
// itself rather than being faked per pixel.

varying vec2 vUv;   // 0..1 across the plane, (0,0) bottom-left

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
