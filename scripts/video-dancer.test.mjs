import test from 'node:test';
import assert from 'node:assert/strict';
import { videoDancerFrame, VIDEO_DANCER_FRAMES, VIDEO_DANCER_FPS } from '../public/visualizers/space-odyssey/video-dancer.js';

test('video mask supports seeking and identical preview/export timestamps across loop boundaries', () => {
  const duration = VIDEO_DANCER_FRAMES / VIDEO_DANCER_FPS;
  assert.equal(videoDancerFrame(0), 0);
  assert.equal(videoDancerFrame(duration - .001), VIDEO_DANCER_FRAMES - 1);
  assert.equal(videoDancerFrame(duration), 0);
  assert.equal(videoDancerFrame(-1), 0);
  for (const time of [4.2, 1.5, 100, 0, 7.25]) {
    const expected = Math.floor(time * 24) % 380;
    assert.equal(videoDancerFrame(time), expected);
    assert.equal(videoDancerFrame(time), videoDancerFrame(time));
  }
});
