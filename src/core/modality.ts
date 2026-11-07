/**
 * Tracks whether the last interaction was the keyboard or a pointer, so motion
 * can be skipped for keyboard-initiated actions (animate skill: never animate
 * keyboard actions). Persisted per tab for cross-page view transitions.
 */
const KEY = 'aarav:modality';
export type Modality = 'keyboard' | 'pointer';

let current: Modality = 'pointer';
try {
  current = (sessionStorage.getItem(KEY) as Modality) || 'pointer';
} catch {
  /* storage blocked: default to pointer */
}

function set(m: Modality) {
  if (m === current) return;
  current = m;
  document.documentElement.dataset.modality = m;
  try {
    sessionStorage.setItem(KEY, m);
  } catch {
    /* ignore */
  }
}

export function initModality() {
  document.documentElement.dataset.modality = current;
  addEventListener('keydown', (e) => {
    // Modifier-only presses (e.g. Cmd for a shortcut) are not navigation intent.
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) set('keyboard');
  }, { capture: true, passive: true });
  addEventListener('pointerdown', () => set('pointer'), { capture: true, passive: true });
}

export const lastModality = () => current;
