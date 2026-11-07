/**
 * Toasts — the Sonner pattern in ~2 kB, no React (ask-sonner).
 * - One toaster, mounted once at the root, created on first use.
 * - toast.success / toast.error, update-by-id, dismiss.
 * - Bottom position; enters and exits along the same path (transitions, not keyframes).
 * - 4s default; pauses on hover, on focus within, and while the tab is hidden.
 * - Swipe down to dismiss: past 45px, or a flick faster than 0.11 px/ms.
 * - Error toasts persist until dismissed (they carry the fallback routes).
 */
type Type = 'success' | 'error' | 'info';
interface Options { description?: string; duration?: number; id?: string }

interface Item {
  el: HTMLLIElement;
  remaining: number;
  started: number;
  timer: number | null;
}

const DEFAULT_MS = 4000;
const SWIPE_PX = 45;
const SWIPE_VELOCITY = 0.11;

let root: HTMLOListElement | null = null;
const items = new Map<string, Item>();
let paused = false;
let seq = 0;

function ensureRoot(): HTMLOListElement {
  if (root) return root;
  const section = document.createElement('section');
  section.setAttribute('aria-label', 'Notifications');
  section.setAttribute('aria-live', 'polite');
  section.setAttribute('aria-relevant', 'additions text');
  root = document.createElement('ol');
  root.className = 'toaster';
  root.tabIndex = -1;
  section.appendChild(root);
  document.body.appendChild(section);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);
  root.addEventListener('pointerenter', pause);
  root.addEventListener('pointerleave', resume);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', resume);
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));
  return root;
}

function setPaused(p: boolean) {
  if (p === paused) return;
  paused = p;
  items.forEach((it, id) => {
    if (it.remaining === Infinity) return;
    if (p) {
      if (it.timer) clearTimeout(it.timer);
      it.timer = null;
      it.remaining -= performance.now() - it.started;
    } else {
      schedule(id, it);
    }
  });
}

function schedule(id: string, it: Item) {
  if (it.remaining === Infinity || paused) return;
  it.started = performance.now();
  it.timer = window.setTimeout(() => dismiss(id), Math.max(0, it.remaining));
}

function bindSwipe(id: string, el: HTMLLIElement) {
  let startY = 0, startT = 0, dy = 0, active = false;
  el.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('button')) return;
    active = true;
    startY = e.clientY;
    startT = performance.now();
    dy = 0;
    el.setPointerCapture(e.pointerId);
    el.dataset.swiping = '';
  });
  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    const raw = e.clientY - startY;
    // Downward follows 1:1; upward meets growing friction instead of a hard stop.
    dy = raw > 0 ? raw : -Math.sqrt(-raw) * 2;
    el.style.setProperty('--y', `${dy}px`);
  });
  const end = () => {
    if (!active) return;
    active = false;
    delete el.dataset.swiping;
    const velocity = Math.abs(dy) / Math.max(1, performance.now() - startT);
    if (dy > SWIPE_PX || (dy > 0 && velocity > SWIPE_VELOCITY)) dismiss(id);
    else el.style.setProperty('--y', '0px');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function show(type: Type, title: string, opts: Options = {}): string {
  const r = ensureRoot();
  const id = opts.id ?? `t${++seq}`;
  const existing = items.get(id);
  const duration = opts.duration ?? (type === 'error' ? Infinity : DEFAULT_MS);

  const el = existing?.el ?? document.createElement('li');
  el.className = 'toast';
  el.dataset.type = type;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.replaceChildren();
  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  icon.setAttribute('aria-hidden', 'true');
  const t = document.createElement('p');
  t.className = 'toast__title';
  t.textContent = title;
  el.append(icon, t);
  const close = document.createElement('button');
  close.className = 'toast__close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = '×';
  close.addEventListener('click', () => dismiss(id));
  el.append(close);
  if (opts.description) {
    const d = document.createElement('p');
    d.className = 'toast__desc';
    d.textContent = opts.description;
    el.append(d);
  }

  if (existing) {
    if (existing.timer) clearTimeout(existing.timer);
    existing.remaining = duration;
    schedule(id, existing);
    return id;
  }

  el.dataset.state = 'entering';
  r.appendChild(el);
  bindSwipe(id, el);
  // Next frame: let the entering styles apply, then transition to rest.
  requestAnimationFrame(() => requestAnimationFrame(() => delete el.dataset.state));
  const item: Item = { el, remaining: duration, started: performance.now(), timer: null };
  items.set(id, item);
  schedule(id, item);
  // Keep at most three on screen; the oldest leaves first.
  if (items.size > 3) dismiss(items.keys().next().value as string);
  return id;
}

export function dismiss(id?: string) {
  if (!id) {
    [...items.keys()].forEach((k) => dismiss(k));
    return;
  }
  const it = items.get(id);
  if (!it) return;
  items.delete(id);
  if (it.timer) clearTimeout(it.timer);
  it.el.dataset.state = 'leaving';
  const remove = () => it.el.remove();
  it.el.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 400); // in case no transition runs (reduced motion, hidden tab)
}

export const toast = {
  success: (title: string, o?: Options) => show('success', title, o),
  error: (title: string, o?: Options) => show('error', title, o),
  info: (title: string, o?: Options) => show('info', title, o),
  dismiss,
};
