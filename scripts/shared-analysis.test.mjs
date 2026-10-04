import test from 'node:test';
import assert from 'node:assert/strict';
import { BPM_METHODS, ENERGY_METHODS, analyzeByMethod, beatEnergyAt, energyByMethod, firstBeatOffset } from '../public/visualizers/shared/analysis.js';

test('every visualizer uses the same three BPM choices and eight unique energy choices', () => {
  assert.deepEqual(BPM_METHODS.map(method => method.value), ['beat-grid', 'onset', 'bass']);
  assert.deepEqual(ENERGY_METHODS.map(method => method.value), ['live', 'beat', 'mix', 'live-low', 'beat-low', 'low-envelope', 'low-columns', 'low-wave']);
  assert.equal(new Set(ENERGY_METHODS.map(method => method.label)).size, ENERGY_METHODS.length);
  assert.equal(ENERGY_METHODS.find(method => method.value === 'low-envelope').label, 'vizzy低频');
});

test('low frequency columns retain live differences and delayed wave follows audio time', () => {
  const drive = new Float32Array(100);
  drive[50] = 1;
  assert.ok(Math.abs(energyByMethod('low-columns', .1, 0, false, .8, true) - .332) < 1e-9);
  assert.ok(Math.abs(energyByMethod('low-columns', .9, 0, false, .8, true) - .748) < 1e-9);
  assert.equal(energyByMethod('low-columns', .9, 0, false, .8, false), .9);
  const center = energyByMethod('low-wave', 0, 0, false, 0, true, { drive, time: .5, index: 0, count: 12, playing: true });
  const neighbor = energyByMethod('low-wave', 0, 0, false, 0, true, { drive, time: .54, index: 1, count: 12, playing: true });
  assert.equal(center, 1);
  assert.ok(center > neighbor && neighbor > 0);
  assert.equal(energyByMethod('low-wave', 0, 0, false, 0, true, { drive, time: .5, index: 1, count: 12, playing: true }), 0);
  assert.equal(energyByMethod('low-wave', 0, 0, false, 0, true, { drive, time: .5, index: 0, count: 12, playing: false }), 0);
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
  assert.equal(energyByMethod('live-low', .2, .8, true, .6, true), .4);
  assert.ok(Math.abs(energyByMethod('beat-low', .2, .8, true, .6, true) - .7) < 1e-12);
  assert.equal(energyByMethod('live-low', .2, .8, true, 0, false), .2);
  assert.equal(energyByMethod('beat-low', .2, .8, false, .6, true), .4);
});

test('unknown BPM analysis method is rejected', async () => {
  await assert.rejects(analyzeByMethod({}, 'missing'), /Unknown BPM/);
});
