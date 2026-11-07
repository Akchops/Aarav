/**
 * Tier 1 — WebGL via Three.js (lazy chunk; never in first load).
 * Real planes in a real perspective camera: the camera travels through the
 * name and down the corridor (S2), the frames swing and land (S3), and the name
 * is sampled through a pointer-driven lens shader (S1).
 */
import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  type Texture,
} from 'three';
import vert from './shaders/plane.vert.glsl?raw';
import nameFrag from './shaders/name.frag.glsl?raw';
import planeFrag from './shaders/plane.frag.glsl?raw';
import { bgFrag, bgVert } from './shaders/bg.glsl';
import type { Caps } from './probe';
import type { Frame, SceneModel } from './model';
import type { Assets, Inputs, Tier } from './tier';

// Palette as 0..1 sRGB. The shaders output these untouched (no colour management),
// so the canvas black is exactly the page black.
const BLACK = new Vector3(11 / 255, 11 / 255, 10 / 255);
const INK = new Vector3(237 / 255, 233 / 255, 225 / 255);
const LINE = new Vector3(140 / 255, 135 / 255, 125 / 255);

function texture(canvas: HTMLCanvasElement, anisotropy: number): Texture {
  const t = new CanvasTexture(canvas);
  // Mipmapped: the frames are seen far smaller than their texture in the corridor.
  // Canvases are power-of-two, so this is legal and nothing gets resized.
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

export function createWebGL(caps: Caps, allowCaveat: boolean, onLost: () => void): Tier {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage__fx';
  canvas.setAttribute('aria-hidden', 'true');

  // Create the context ourselves so a failure is a silent null, not a logged throw.
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !allowCaveat,
      preserveDrawingBuffer: false,
    });
  } catch {
    gl = null;
  }
  if (!gl) throw new Error('webgl2 unavailable');

  const renderer = new WebGLRenderer({ canvas, context: gl, antialias: false, alpha: false, depth: false, stencil: false });
  renderer.autoClear = true;
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const lost = (e: Event) => {
    // Without preventDefault the context can never be restored. Drop to tier 2 now.
    e.preventDefault();
    onLost();
  };
  canvas.addEventListener('webglcontextlost', lost, false);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 1, 1000);
  const quad = new PlaneGeometry(1, 1);

  const bg = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      vertexShader: bgVert,
      fragmentShader: bgFrag,
      uniforms: { uBlack: { value: BLACK }, uGrain: { value: 1 }, uTime: { value: 0 } },
      depthTest: false,
      depthWrite: false,
    }),
  );
  bg.frustumCulled = false;
  bg.renderOrder = -1e9;
  scene.add(bg);

  let nameMesh: Mesh<PlaneGeometry, ShaderMaterial> | null = null;
  let planes: Mesh<PlaneGeometry, ShaderMaterial>[] = [];
  let textures: Texture[] = [];
  let model: SceneModel | null = null;

  const disposeContent = () => {
    nameMesh && scene.remove(nameMesh);
    planes.forEach((m) => scene.remove(m));
    nameMesh?.material.dispose();
    planes.forEach((m) => m.material.dispose());
    textures.forEach((t) => t.dispose());
    nameMesh = null;
    planes = [];
    textures = [];
  };

  const tier: Tier = {
    kind: 1,
    canvas,
    dpr: 1,

    setup(m: SceneModel, assets: Assets) {
      model = m;
      disposeContent();
      const { vw, vh } = m.layout;
      camera.fov = m.fov;
      camera.aspect = vw / vh;
      camera.near = m.near;
      camera.far = m.far;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(tier.dpr);
      renderer.setSize(vw, vh, false);

      const nameTex = texture(assets.name.canvas, anisotropy);
      textures.push(nameTex);
      nameMesh = new Mesh(
        quad,
        new ShaderMaterial({
          vertexShader: vert,
          fragmentShader: nameFrag,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          uniforms: {
            uTex: { value: nameTex },
            uExtent: { value: new Vector2(assets.name.extent.x, assets.name.extent.y) },
            uRect: { value: new Vector4() },
            uMouse: { value: new Vector2(-1e4, -1e4) },
            uVel: { value: new Vector2() },
            uSpeed: { value: 0 },
            uPresence: { value: 0 },
            uRadius: { value: 100 },
            uRipple: { value: new Vector3(0, 0, -1) },
            uDpr: { value: 1 },
            uDevelop: { value: 1 },
            uOpacity: { value: 1 },
            uGrain: { value: 1 },
            uTime: { value: 0 },
            uInk: { value: INK },
          },
        }),
      );
      scene.add(nameMesh);

      planes = assets.images.map((img) => {
        const t = texture(img, anisotropy);
        textures.push(t);
        const mesh = new Mesh(
          quad,
          new ShaderMaterial({
            vertexShader: vert,
            fragmentShader: planeFrag,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            uniforms: {
              uTex: { value: t },
              uBright: { value: 1 },
              uOpacity: { value: 1 },
              uAssemble: { value: 0 },
              uGrain: { value: 1 },
              uTime: { value: 0 },
              uLine: { value: LINE },
              uBlack: { value: BLACK },
            },
          }),
        );
        scene.add(mesh);
        return mesh;
      });
    },

    render(frame: Frame, inp: Inputs) {
      if (!model || !nameMesh) return;
      const { vh, vw } = model.layout;
      const dpr = tier.dpr;
      const { cam } = frame;
      camera.position.set(cam.x, cam.y, cam.z);
      camera.updateMatrixWorld();

      (bg.material as ShaderMaterial).uniforms.uGrain.value = frame.grain;
      (bg.material as ShaderMaterial).uniforms.uTime.value = inp.time;

      // ---- Name ----
      const n = frame.name;
      const pr = model.project(n, cam);
      nameMesh.visible = !pr.behind && n.opacity > 0.001;
      if (nameMesh.visible) {
        nameMesh.position.set(n.x, n.y, n.z);
        nameMesh.rotation.set(0, 0, 0);
        nameMesh.scale.set(n.w, n.h, 1);
        nameMesh.renderOrder = -Math.round(cam.z - n.z) + 1;
        const u = nameMesh.material.uniforms;
        const w = n.w * pr.s, h = n.h * pr.s;
        // On-screen rect in device px, bottom-left origin (gl_FragCoord space).
        u.uRect.value.set((pr.x - w / 2) * dpr, (vh - (pr.y + h / 2)) * dpr, Math.max(1, w * dpr), Math.max(1, h * dpr));
        u.uMouse.value.set(inp.pointer.x * dpr, (vh - inp.pointer.y) * dpr);
        u.uVel.value.set(inp.pointer.vx * dpr, -inp.pointer.vy * dpr);
        u.uSpeed.value = inp.pointer.speed;
        u.uPresence.value = inp.pointer.presence;
        // Lens radius follows the viewport, not the zoom: ~16% of the short side.
        u.uRadius.value = Math.max(70, Math.min(vw, vh) * 0.16) * dpr;
        u.uRipple.value.set(inp.ripple.x * dpr, (vh - inp.ripple.y) * dpr, inp.ripple.age);
        u.uDpr.value = dpr;
        u.uDevelop.value = inp.develop;
        u.uOpacity.value = n.opacity;
        u.uGrain.value = frame.grain;
        u.uTime.value = inp.time;
      }

      // ---- Planes ----
      frame.planes.forEach((p, i) => {
        const mesh = planes[i];
        if (!mesh) return;
        const ahead = cam.z - p.z;
        mesh.visible = ahead > model!.near && p.opacity > 0.001;
        if (!mesh.visible) return;
        mesh.position.set(p.x, p.y, p.z);
        mesh.rotation.set(0, p.rotY, 0);
        mesh.scale.set(p.w, p.h, 1);
        // No depth buffer: draw far to near.
        mesh.renderOrder = -Math.round(ahead);
        const u = mesh.material.uniforms;
        u.uBright.value = p.bright;
        u.uOpacity.value = p.opacity;
        u.uAssemble.value = p.assemble;
        u.uGrain.value = frame.grain;
        u.uTime.value = inp.time;
      });

      renderer.render(scene, camera);
    },

    setDpr(dpr: number) {
      tier.dpr = dpr;
      if (!model) return;
      renderer.setPixelRatio(dpr);
      renderer.setSize(model.layout.vw, model.layout.vh, false);
    },

    destroy() {
      canvas.removeEventListener('webglcontextlost', lost, false);
      disposeContent();
      quad.dispose();
      bg.geometry.dispose();
      (bg.material as ShaderMaterial).dispose();
      renderer.dispose();
      // Browsers cap live contexts; release ours explicitly (listener removed first,
      // so this does not trigger the fallback).
      try {
        renderer.forceContextLoss();
      } catch {
        /* ignore */
      }
      canvas.remove();
    },
  };

  void caps;
  return tier;
}
