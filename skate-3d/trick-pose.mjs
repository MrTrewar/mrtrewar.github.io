const smooth = t => t * t * (3 - 2 * t);
const clamp = t => Math.max(0, Math.min(1, t));
const TAU = Math.PI * 2;

// All offsets return to neutral; half-turn tricks retain their landing stance in Run.
export function trickPose(trick, elapsed, landingTime = 1) {
  const pose = { yaw: 0, pitch: 0, roll: 0, boardYaw: 0, boardRoll: 0, boardPitch: 0, boardLift: 0, boardOffsetX: 0, boardOffsetZ: 0, bodyPitch: 0, bodyOffsetZ: 0, torsoBend: 0, legSpread: 0, armReach: 0, tuck: 0, bodyLift: 0, armSpread: 0, landing: 0 };
  if (!trick) { pose.landing = Math.sin(clamp(landingTime / .22) * Math.PI) * .15; return pose; }
  const t = clamp(elapsed / trick.duration), phase = smooth(t), lift = Math.sin(Math.PI * t);
  const turn = TAU * smooth(clamp((t - .12) / .76));
  const hold = smooth(clamp(t / .25)) * smooth(clamp((1 - t) / .25));
  pose.tuck = lift * (trick.risky ? .3 : .2); pose.bodyLift = lift * .22;
  pose.armSpread = lift * .55; pose.pitch = Math.sin(TAU * t) * .11;
  switch (trick.id) {
    case 'kickflip': pose.boardRoll = turn; pose.roll = -lift * .1; pose.yaw = lift * .25; break;
    case 'doublekickflip': pose.boardRoll = turn * 2; pose.tuck = lift * .38; break;
    case 'heelflip': pose.boardRoll = -turn; pose.roll = lift * .1; pose.yaw = -lift * .25; break;
    case 'shuvit': pose.boardYaw = turn * .5; pose.yaw = -lift * .4; pose.bodyLift = lift * .28; break;
    case 'frontside360': pose.yaw = phase * TAU; pose.armSpread = -lift * .4; break;
    case 'backside360': pose.yaw = -phase * TAU; pose.armSpread = -lift * .4; break;
    case 'varial': pose.yaw = lift * .35; pose.boardYaw = turn * .5; pose.boardRoll = turn; break;
    case 'hardflip': pose.boardYaw = turn * .5; pose.boardRoll = turn; pose.boardPitch = hold * .8; break;
    case 'indygrab': pose.tuck = hold * .65; pose.armReach = hold * .75; pose.roll = -hold * .18; break;
    case 'spin900': pose.yaw = phase * Math.PI * 5; pose.tuck = lift * .65; pose.armSpread = -lift * .7; break;
    case 'spin1080': pose.yaw = phase * TAU * 3; pose.tuck = lift * .72; pose.armSpread = -lift * .8; break;
    case 'mctwist': pose.yaw = phase * Math.PI * 3; pose.pitch = -phase * TAU; pose.tuck = lift * .65; break;
    case 'backflip': pose.pitch = phase * TAU; pose.tuck = lift * .6; break;
    case 'doublebackflip': pose.pitch = phase * TAU * 2; pose.tuck = lift * .85; pose.armSpread = -lift * .7; break;
    case 'rodeo900': pose.pitch = phase * TAU; pose.yaw = phase * Math.PI * 5; pose.roll = hold * .65; pose.tuck = lift * .6; break;
    case 'triplevarial': pose.boardRoll = turn * 3; pose.boardYaw = turn * 2; pose.bodyLift = lift * .45; pose.tuck = lift * .55; break;
    case 'superman':
      pose.bodyPitch = -hold * Math.PI / 2; pose.bodyOffsetZ = hold * 1.2; pose.bodyLift = hold * 1.5;
      pose.boardLift = hold * .7; pose.boardOffsetZ = -hold * 1.5; pose.boardPitch = -hold * .4;
      pose.tuck = lift * .08; pose.armSpread = lift * .25; pose.armReach = hold * -1.1;
      break;
    case 'christair':
      pose.bodyLift = hold * .7; pose.tuck = lift * .05; pose.armSpread = hold * 1.55;
      pose.legSpread = hold * .25; pose.boardOffsetX = hold * .95; pose.boardLift = hold * 1.3;
      pose.boardOffsetZ = -hold * .7; pose.boardRoll = hold * Math.PI / 2;
      break;
    case 'rocketair':
      pose.tuck = hold * .82; pose.torsoBend = hold * .5; pose.armReach = hold * 1.1;
      pose.boardPitch = -hold * Math.PI * .55; pose.boardLift = hold * .5; pose.bodyLift = lift * .38;
      break;
  }
  return pose;
}
