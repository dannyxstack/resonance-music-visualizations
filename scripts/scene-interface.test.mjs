import test from 'node:test';
import assert from 'node:assert/strict';
import { registerScene } from '../public/visualizers/shared/scene.js';

test('scene preview contract forwards explicit time and exposes its canvas', () => {
  const previousWindow = globalThis.window;
  globalThis.window = {};
  try {
    const canvas = { width: 1280, height: 720 };
    const frames = [];
    const scene = registerScene({ canvas, resize: () => {}, getTime: () => 2,
      renderFrame: (time, delta) => frames.push([time, delta]) });
    scene.renderFrame({ time: 4.5, delta: 1 / 30 });
    scene.renderFrame();
    assert.equal(scene.canvas, canvas);
    assert.deepEqual(scene.getSize(), { width: 1280, height: 720 });
    assert.deepEqual(frames, [[4.5, 1 / 30], [2, 0]]);
    assert.equal(globalThis.window.resonanceScene, scene);
  } finally {
    globalThis.window = previousWindow;
  }
});
