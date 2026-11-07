/**
 * Homepage entry — the only homepage script in the first-load bundle.
 * The static layer (every section's HTML, the featured frames, the footer, every
 * fact as text) is already in the page and works without JavaScript. This file
 * only decides what to load, and when:
 *
 *  - #reveal or #close near the viewport  -> GSAP, ScrollTrigger, the probe and
 *    a tier module, for both films (created in page order)
 *  - #set near the viewport               -> the playable pieces
 *
 * Tier: ?tier=1|2|3 (QA) or the probe; reduced motion means tier 3 for the films
 * (no pins, every beat's final state in place) and "instant" pieces.
 */
import { initPress } from '../core/press';
import { motionAllowed } from '../core/prefs';

initPress();

const html = document.documentElement;
const set = document.getElementById('set');
let revealLive = false;

/** The Set unlocks once, for the page's lifetime. */
const unlock = () => set?.classList.add('is-unlocked');
if (!html.classList.contains('motion')) unlock(); // no lock without the motion layer

// ---------------------------------------------------------------- the films
let filmsStarted = false;
async function startFilms() {
  if (filmsStarted || !motionAllowed()) return;
  filmsStarted = true;
  try {
    const [{ mountReveal }, { mountClose }] = await Promise.all([import('./reveal'), import('./close')]);
    const reveal = await mountReveal(unlock); // unlock on the reveal's onLeave
    if (!reveal) throw new Error('reveal did not mount');
    revealLive = true;
    mountClose();
    const { ScrollTrigger } = await import('gsap/ScrollTrigger');
    ScrollTrigger.refresh();
    // A deep link landed before the pins added their scroll distance: land again.
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  } catch (err) {
    // Anything failed: the static layer stands, and nothing stays locked.
    html.classList.remove('motion');
    unlock();
    if (import.meta.env.DEV) console.error(err);
  }
}

const filmIO = new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      filmIO.disconnect();
      void startFilms();
    }
  },
  { rootMargin: '100% 0px' },
);
['reveal', 'close'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) filmIO.observe(el);
});

// ---------------------------------------------------------------- The Set
if (set) {
  // Reaching #set without passing through the reveal (a deep link, or a scroll
  // faster than the films could mount) unlocks it at once.
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !revealLive) unlock();
  }).observe(set);

  const setIO = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      setIO.disconnect();
      import('./set')
        .then((m) => m.mountSet({ instant: !motionAllowed() }))
        .catch((err) => {
          if (import.meta.env.DEV) console.error(err);
        });
    },
    { rootMargin: '50% 0px' },
  );
  setIO.observe(set);
}
