export const CRASH_DURATION = 2.4;
export const BURST_LIFETIME = .9;
export const CRASH_SEQUENCE = Object.freeze([
  { delay: 0, y: 0, z: 0, size: 8.8, particles: 125 },
  { delay: .18, y: 1.4, z: -3.1, size: 3.5, particles: 24 },
  { delay: .38, y: .8, z: 3.6, size: 3.9, particles: 24 },
  { delay: .61, y: 3.3, z: -1.7, size: 4.5, particles: 30 },
  { delay: .83, y: 2.8, z: 3.2, size: 3.4, particles: 24 },
  { delay: 1.05, y: 1.2, z: -4.3, size: 3.7, particles: 24 },
  { delay: 1.28, y: 3.9, z: .5, size: 5, particles: 36 },
].map(Object.freeze));
export function crashSequence(reducedMotion = false) {
  return reducedMotion ? CRASH_SEQUENCE.filter((_, i) => i === 0 || i === 3 || i === 6) : CRASH_SEQUENCE;
}
export function explosionFrame(age) {
  return Math.min(7, Math.max(0, Math.floor(age * 11)));
}
