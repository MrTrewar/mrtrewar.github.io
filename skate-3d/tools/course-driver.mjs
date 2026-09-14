import { PHYSICS, FIXED_STEP } from '../simulation.mjs';

// QA only: plan takeoff from visible geometry, without using authored motif labels.
export function planJump(run, wild = true) {
  const surfaces = run.entities || run.surfaces;
  const support = surfaces.find(e => e.id === run.support);
  if (!support) return null;
  const end = support.at + support.length / 2;
  const next = surfaces.filter(e => !e.optional && e.at - e.length / 2 >= end - .01).sort((a,b) => a.at - b.at)[0];
  if (!next) return null;
  const target = (wild && surfaces.find(e => e.optional && Math.abs(e.at + e.length / 2 - next.at - next.length / 2) < .01)) || next;
  const v = PHYSICS.jumpVelocity - PHYSICS.gravity * FIXED_STEP / 2;
  const discriminant = v * v - 2 * PHYSICS.gravity * (target.y - run.y);
  if (discriminant < 0) return null;
  const airtime = (v + Math.sqrt(discriminant)) / PHYSICS.gravity;
  const accelerating = Math.min(airtime, Math.max(0, (PHYSICS.maxSpeed - run.speed) / PHYSICS.acceleration));
  const travel = run.speed * accelerating + .5 * PHYSICS.acceleration * accelerating ** 2 + PHYSICS.maxSpeed * (airtime - accelerating);
  const aim = target.at - target.length / 2 + Math.min(target.length * .25, run.speed * (target.optional ? .025 : .1));
  return { jump: run.distance + run.x + travel >= aim, target, airtime, aim };
}
