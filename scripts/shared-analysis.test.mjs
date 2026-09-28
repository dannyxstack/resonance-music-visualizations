import test from 'node:test';
import assert from 'node:assert/strict';
import { BPM_METHODS, ENERGY_METHODS, analyzeByMethod, beatEnergyAt, energyByMethod, firstBeatOffset } from '../public/visualizers/shared/analysis.js';

test('every visualizer uses the same three BPM choices and four energy choices', () => {
  assert.deepEqual(BPM_METHODS.map(method => method.value), ['beat-grid', 'onset', 'bass']);
  assert.deepEqual(ENERGY_METHODS.map(method => method.value), ['live', 'beat', 'mix', 'low-envelope']);
});

test('energy choices use the detected beat strength and preserve live fallback', () => {
  const result = { beats: [{ time: .6, strength: .8 }], firstBeatTime: .1 };
  assert.equal(firstBeatOffset(result), .6);
  assert.ok(Math.abs(beatEnergyAt(result, .6) - .8) < 1e-9);
  assert.equal(beatEnergyAt(result, .5), 0);
  assert.equal(energyByMethod('beat', .2, .8, true), .8);
  assert.equal(energyByMethod('mix', .2, .8, true), .5);
  assert.equal(energyByMethod('beat', .2, .8, false), .2);
  assert.equal(energyByMethod('low-envelope', .2, .8, true, .65, true), .65);
});

test('unknown BPM analysis method is rejected', async () => {
  await assert.rejects(analyzeByMethod({}, 'missing'), /Unknown BPM/);
});
