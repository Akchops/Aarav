/** User preferences and the QA tier override. Capability queries only — no UA sniffing. */
export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
export const prefersReducedMotion = () => matchMedia(reducedMotionQuery).matches;
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/** ?tier=1|2|3, for QA only. */
export function forcedTier(): 1 | 2 | 3 | null {
  const t = new URLSearchParams(location.search).get('tier');
  return t === '1' ? 1 : t === '2' ? 2 : t === '3' ? 3 : null;
}

/** True when the page should run its motion layer at all (no reduced motion, not ?tier=3). */
export const motionAllowed = () => !prefersReducedMotion() && forcedTier() !== 3;
