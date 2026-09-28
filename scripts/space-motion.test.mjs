import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR_TRAVEL_SECONDS, travelingDepth, roadPoint, movingStar } from '../public/visualizers/space-odyssey/scene-motion.js';
import { energyByMethod } from '../public/visualizers/shared/analysis.js';

test('both road contours stay straight through the perspective projection', () => {
  for (const side of ['left', 'right']) {
    const far = roadPoint(0, 1200, 800, false);
    const near = roadPoint(1, 1200, 800, false);
    for (const depth of [.1, .25, .5, .75, .9]) {
      const point = roadPoint(depth, 1200, 800, false);
      const expected = far[side] + (near[side] - far[side]) * (point.y - far.y) / (near.y - far.y);
      assert.ok(Math.abs(point[side] - expected) < 1e-8);
    }
  }
});

test('columns move toward the horizon and repeat at the near edge', () => {
  const start = travelingDepth(4, 72, 0);
  assert.ok(travelingDepth(4, 72, 1) < start);
  assert.ok(Math.abs(travelingDepth(4, 72, BAR_TRAVEL_SECONDS) - start) < 1e-8);
});

test('most stars move inward as playback time advances', () => {
  const width = 1200, height = 800;
  const distance = star => Math.hypot(star.x - width * .5, star.y - height * .45);
  let inward = 0;
  for (let index = 0; index < 50; index++) {
    if (distance(movingStar(index, .05, width, height)) < distance(movingStar(index, 0, width, height))) inward++;
  }
  assert.ok(inward >= 45, `${inward} stars moved inward`);
});

test('right bars blend beat and live energy equally after analysis', () => {
  assert.equal(energyByMethod('mix', .2, .8, true), .5);
  assert.equal(energyByMethod('live', .2, .8, true), .2);
  assert.equal(energyByMethod('mix', .2, .8, false), .2);
});
