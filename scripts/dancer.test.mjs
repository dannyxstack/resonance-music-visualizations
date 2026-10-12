import test from 'node:test';
import assert from 'node:assert/strict';
import { dancerPose, capturedDancerPose } from '../public/visualizers/space-odyssey/dancer-motion.js';

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

test('captured dance styles have valid deterministic joints and loop on four beats', () => {
  for (const style of ['shuffle', 'jump', 'moonwalk']) {
    const start = capturedDancerPose(style, 0, 120, 0, .5);
    assert.equal(start.joints.length, 16);
    assert.ok(start.joints.flat().every(Number.isFinite));
    assert.deepEqual(capturedDancerPose(style, 2, 120, 0, .5), start);
    assert.notDeepEqual(capturedDancerPose(style, .5, 120, 0, .5), start);
    assert.deepEqual(capturedDancerPose(style, .5, 120, 0, .5, 0).joints, capturedDancerPose(style, 0, 120, 0, .5, 0).joints);
  }
});
