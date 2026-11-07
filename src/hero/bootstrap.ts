/**
 * The only hero code in the first-load bundle. Decides whether to load the scene
 * at all; GSAP, Three.js and both canvas tiers are dynamic imports behind it.
 * Tier 3 (the static title card and still) is already in the HTML, so there is
 * no third branch here.
 *
 * QA override: ?tier=1 forces WebGL even on software GL (headless Chromium is
 * SwiftShader), ?tier=2 forces Canvas 2D, ?tier=3 keeps the static page.
 */
import { prefersReducedMotion, reducedMotionQuery } from '../core/prefs';

export function bootScene() {
  const scene = document.querySelector<HTMLElement>('[data-scene]');
  const stage = scene?.querySelector<HTMLElement>('[data-stage]');
  if (!scene || !stage) return;

  const motionOff = () => document.documentElement.classList.remove('motion');
  const q = new URLSearchParams(location.search).get('tier');
  if (q === '3') return motionOff();
  const forced = q === '1' || q === '2' ? q : null;

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    // Load as soon as the stage is near the viewport (it is, on arrival).
    const io = new IntersectionObserver(
      async ([entry], obs) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        try {
          const { startScene } = await import('./timeline');
          startScene(scene, stage, forced);
        } catch (err) {
          // A failed chunk load leaves tier 3 standing. Silent in production.
          motionOff();
          if (import.meta.env.DEV) console.error(err);
        }
      },
      { rootMargin: '200% 0px' },
    );
    io.observe(stage);
  };

  if (!prefersReducedMotion()) start();
  else {
    motionOff();
    matchMedia(reducedMotionQuery).addEventListener('change', (e) => !e.matches && start());
  }
}
