/**
 * Adaptive quality (web-interaction-engineer). Sustained slow frames step the
 * render resolution down, then drop a tier. A single long frame (boot, a GC) never
 * demotes the scene: it takes ~1.5s of frames over 22ms.
 */
export class Watchdog {
  private slow = 0;
  private armedAt: number;

  constructor(private readonly degrade: () => void, graceMs = 1500) {
    this.armedAt = performance.now() + graceMs;
  }

  frame(dtMs: number) {
    const now = performance.now();
    if (now < this.armedAt || document.hidden) return;
    // 22ms ~ one-and-a-bit frames at 60Hz. Count up when slow, decay when fine.
    this.slow = dtMs > 22 ? this.slow + 1 : Math.max(0, this.slow - 2);
    if (this.slow > 90) {
      this.slow = 0;
      this.armedAt = now + 1500; // let the new setting settle before judging again
      this.degrade();
    }
  }
}
