/** User preferences read from the platform. Capability queries only — no UA sniffing. */
export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
export const prefersReducedMotion = () => matchMedia(reducedMotionQuery).matches;
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
