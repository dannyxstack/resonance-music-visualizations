import test from 'node:test';
import assert from 'node:assert/strict';
import { dancerPose } from '../public/visualizers/space-odyssey/dancer-motion.js';

test('dance pose follows playback time and detected BPM', () => {
  const before = dancerPose(.5, 120, .5, .4);
  const nextBeat = dancerPose(1, 120, .5, .4);
  assert.equal(before.phase, 0);
  assert.equal(nextBeat.phase, 1);
  assert.notEqual(before.frame, nextBeat.frame);
  assert.deepEqual(dancerPose(1, 120, .5, .4), nextBeat);
});

test('low frequency energy changes bounce while zero motion holds an idle pose', () => {
  const quiet = dancerPose(1, 120, 0, 0);
  const loud = dancerPose(1, 120, 0, 1);
  assert.ok(loud.bounce > quiet.bounce);
  const still = dancerPose(1, 120, 0, 1, 0);
  assert.equal(still.bounce, 0);
  assert.equal(still.sway, 0);
  assert.equal(still.frame, 0);
});
