import { PHYSICS, steeringScale } from './simulation.mjs';

export function sideCameraWidth(aspect, speed = PHYSICS.baseSpeed) {
  return Math.max(28, aspect * 14, 28 * steeringScale(speed)) * 1.2;
}
export function sideCameraCenter(width) {
  // Keep input independent of the camera; reserve more of the frame for the next landing.
  return -width * .15;
}
