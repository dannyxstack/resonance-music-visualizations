import { VISUAL_CONFIG } from "../config/visualization";

export class BeatDetector {
  private readonly history: number[] = [];
  private lastBeatAt = 0;
  private readonly maxHistory = 48;

  update(bassEnergy: number, now: number): boolean {
    this.history.push(bassEnergy);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const average =
      this.history.reduce((sum, value) => sum + value, 0) / Math.max(1, this.history.length);
    const cooledDown = now - this.lastBeatAt > VISUAL_CONFIG.beatCooldownMs;
    const beat = cooledDown && this.history.length > 12 && bassEnergy > average * VISUAL_CONFIG.beatThreshold && bassEnergy > 0.08;

    if (beat) {
      this.lastBeatAt = now;
    }

    return beat;
  }

  reset(): void {
    this.history.length = 0;
    this.lastBeatAt = 0;
  }
}
