import { LEVELS } from './levels.mjs';

export const LEVEL_TIMING = Object.freeze({ countdown: 3, minimumStay: 8 });

export class LevelTransition {
  constructor() { this.reset(); }
  reset(index = 0, time = 0) {
    this.index = index; this.time = this.enteredAt = time; this.switchAt = null;
  }
  update(time, target, active = true) {
    if (!active) return false;
    this.time = time;
    if (target <= this.index || this.index === LEVELS.length - 1) { this.switchAt = null; return false; }
    if (this.switchAt === null) {
      this.switchAt = Math.max(time + LEVEL_TIMING.countdown, this.index ? this.enteredAt + LEVEL_TIMING.minimumStay : time);
    }
    if (time + 1e-9 < this.switchAt) return false;
    this.reset(this.index + 1, time); return true;
  }
  status(score) {
    const next = LEVELS[this.index + 1];
    if (!next) return { phase: 'endless', next: null, remaining: 0, seconds: 0, progress: 1 };
    const remaining = Math.max(0, next.threshold - Math.floor(score));
    const progress = Math.max(0, Math.min(1, (score - LEVELS[this.index].threshold) / (next.threshold - LEVELS[this.index].threshold)));
    return { phase: this.switchAt === null ? 'points' : 'countdown', next: next.name, remaining,
      seconds: this.switchAt === null ? 0 : Math.max(1, Math.ceil(this.switchAt - this.time - 1e-9)), progress };
  }
}
