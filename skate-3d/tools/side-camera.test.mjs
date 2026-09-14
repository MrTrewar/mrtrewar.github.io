import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS, steeringScale } from '../simulation.mjs';
import { sideCameraCenter, sideCameraWidth } from '../side-camera.mjs';

const speeds = [PHYSICS.baseSpeed, 14, 20, 25, 30, PHYSICS.maxSpeed];
const aspects = [320 / 568, 390 / 844, 1440 / 900, 844 / 390, 21 / 9, 32 / 9];

test('camera never follows horizontal input or pins the rider to a dead zone', () => {
  for (const width of [33.6, 40, 60, 74.4, 90]) {
    assert.equal(sideCameraCenter(width, -3), sideCameraCenter(width, 3));
    assert.equal(sideCameraCenter(width, -20), sideCameraCenter(width, 20));
    assert.equal(sideCameraCenter(width, 0), -width * .15);
  }
});
test('the view is 20 percent wider with 30 percent more neutral look-ahead', () => {
  for (const aspect of aspects) for (const speed of speeds) {
    const oldWidth = Math.max(28, aspect * 14, 28 * steeringScale(speed));
    const width = sideCameraWidth(aspect, speed);
    const ahead = width / 2 - sideCameraCenter(width);
    assert.ok(Math.abs(width / oldWidth - 1.2) < 1e-10);
    assert.ok(Math.abs(ahead / (oldWidth * .6) - 1.3) < 1e-10);
    assert.ok(ahead < 150, 'the wider frustum stays inside the generated route');
  }
});
test('the unchanged movement range stays visible at every speed and aspect', () => {
  for (const aspect of aspects) for (const speed of speeds) {
    const scale = steeringScale(speed), width = sideCameraWidth(aspect, speed);
    const center = sideCameraCenter(width);
    const left = .5 + (PHYSICS.minOffset * scale + center) / width;
    const right = .5 + (PHYSICS.maxOffset * scale + center) / width;
    assert.ok(left > .11); assert.ok(right < .77);
    for (let x = PHYSICS.minOffset * scale; x <= PHYSICS.maxOffset * scale; x += .05) {
      const screenX = .5 + (x + center) / width;
      assert.ok(screenX > .11 && screenX < .77);
      assert.ok((x + .05 + center) / width + .5 > screenX);
    }
  }
  const span = speed => (PHYSICS.maxOffset - PHYSICS.minOffset) * steeringScale(speed) / sideCameraWidth(16 / 9, speed);
  for (const speed of speeds) assert.ok(Math.abs(span(speed) - span(PHYSICS.baseSpeed)) < 1e-10);
});
test('at top speed a neutral full jump fits into the forward view', () => {
  const width = sideCameraWidth(16 / 9, PHYSICS.maxSpeed);
  const jumpRange = PHYSICS.maxSpeed * 2 * PHYSICS.jumpVelocity / PHYSICS.gravity;
  assert.ok(width / 2 - sideCameraCenter(width) > jumpRange);
});
