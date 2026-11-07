/**
 * Cross-document View Transitions (enabled in motion.css). This module only
 * subtracts: it skips the transition when the navigation was keyboard-initiated
 * or the user prefers reduced motion, and lets a page withdraw shared-element
 * names that would morph from a hidden position.
 */
import { lastModality } from './modality';
import { prefersReducedMotion } from './prefs';

type VTEvent = Event & { viewTransition?: { skipTransition(): void } | null };

let beforeSwap: (() => void) | null = null;
/** Called on the outgoing page just before its snapshot is taken. */
export function onBeforeSwap(fn: () => void) {
  beforeSwap = fn;
}

export function initViewTransitions() {
  const skip = (e: VTEvent) => {
    if (!e.viewTransition) return;
    if (lastModality() === 'keyboard' || prefersReducedMotion()) e.viewTransition.skipTransition();
  };
  addEventListener('pageswap', (e) => {
    beforeSwap?.();
    skip(e as VTEvent);
  });
  addEventListener('pagereveal', (e) => skip(e as VTEvent));
}
