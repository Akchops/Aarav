/**
 * Home beat sheet (PLAN.md §4). One timeline second = one beat, so the code and
 * the beat sheet share units.
 *
 * Scrub distance per beat:
 *   beatPx = Math.round(Math.min(innerWidth < 768 ? 420 : 700, innerHeight * 0.9))
 *   - 700px desktop: a single big camera move needs travel, or it reads as a jump
 *     cut; below ~350px a fast wheel flick skips the beat entirely.
 *   - 420px mobile (60% of desktop): a thumb fling covers far more document px per
 *     gesture, so full desktop distance feels stuck.
 *   - innerHeight * 0.9 cap: on short viewports a beat never exceeds ~one screen of
 *     travel, so the pin never feels frozen.
 *   Recomputed on every ScrollTrigger refresh (invalidateOnRefresh).
 */
export const DESKTOP_BEAT_PX = 700;
export const MOBILE_BEAT_PX = 420;

export const beatPx = () =>
  Math.round(Math.min(innerWidth < 768 ? MOBILE_BEAT_PX : DESKTOP_BEAT_PX, innerHeight * 0.9));

/** Where each phase of the scene sits on the timeline, in beats. */
export interface Phases {
  beats: number;
  /** Camera travel: beat 1 (into and through the name) + beat 2 (the corridor), one continuous curve. */
  travel: [number, number];
  /** Beat 3: the featured frame fills the screen. Null with zero projects. */
  card: [number, number] | null;
  /** Beat 4: planes land on their DOM frames; the name settles into the subtitle. */
  assemble: [number, number];
  /** Beat 5: status and CTA take their final places; the pin releases. */
  settle: [number, number];
}

export function phasesFor(projectCount: number): Phases {
  if (projectCount === 0) {
    // 2 beats x beatPx: through the name, then settle. There is no corridor to travel.
    return { beats: 2, travel: [0, 1], card: null, assemble: [1, 1.5], settle: [1.5, 2] };
  }
  // 5 beats x beatPx: 5 x 700 = 3500px desktop, 5 x 420 = 2100px mobile.
  return { beats: 5, travel: [0, 2], card: [2, 3], assemble: [3, 4], settle: [4, 5] };
}
