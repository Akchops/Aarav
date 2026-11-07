/**
 * Press feedback on pointer-down (apple-design: respond on press, not release).
 * Uses a class rather than :active so Space/Enter never trigger the scale —
 * keyboard actions get no motion.
 */
const SELECTOR = '[data-press], .button, .route, .frame__link';

export function initPress() {
  let pressed: Element | null = null;
  const release = () => {
    pressed?.classList.remove('is-pressed');
    pressed = null;
  };
  addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = (e.target as Element | null)?.closest?.(SELECTOR);
    if (!el || (el as HTMLButtonElement).disabled) return;
    pressed = el;
    el.classList.add('is-pressed');
  }, { passive: true });
  addEventListener('pointerup', release, { passive: true });
  addEventListener('pointercancel', release, { passive: true });
  // Dragging off the control cancels the visual press, like a native button.
  addEventListener('pointerout', (e) => {
    if (pressed && e.target === pressed && !pressed.contains(e.relatedTarget as Node)) release();
  }, { passive: true });
}
