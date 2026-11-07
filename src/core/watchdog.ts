/**
 * Adaptive quality (web-interaction-engineer). A rolling 60-frame window: when
 * most of it runs slower than 22ms, the caller steps the device pixel ratio down
 * (2 -> 1.5 -> 1) and then drops to tier 2. One long frame (boot, a GC) never
 * demotes anything, and nothing is judged while the tab is hidden.
 */
export class Watchdog {
  private readonly window: number[] = [];
  private armedAt: number;

  constructor(private readonly degrade: () => void, graceMs = 1500) {
    this.armedAt = performance.now() + graceMs;
  }

  /** Call once per rendered frame with that frame's duration. */
  frame(dtMs: number) {
    const now = performance.now();
    if (now < this.armedAt || document.hidden) return;
    this.window.push(dtMs > 22 ? 1 : 0);
    if (this.window.length > 60) this.window.shift();
    const slow = this.window.reduce((n, v) => n + v, 0);
    // "Sustained": 45 of the last 60 frames over 22ms.
    if (this.window.length === 60 && slow >= 45) {
      this.window.length = 0;
      this.armedAt = now + 1500; // let the new setting settle before judging again
      this.degrade();
    }
  }
}
