import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projects } from '../src/projects.js';

const states = JSON.parse(readFileSync(new URL('../public/visualizers/america-states/states.json', import.meta.url)));

test('state block map contains exactly 48 named contiguous states with valid polygons', () => {
  assert.equal(states.length, 48);
  assert.equal(new Set(states.map(state => state.code)).size, 48);
  assert.ok(states.every(state => state.code.length === 2 && state.name && state.rings.length));
  assert.ok(states.every(state => state.rings.every(ring => ring.length >= 4
    && ring.every(([lon, lat]) => lon >= -125 && lon <= -66 && lat >= 24 && lat <= 50))));
  assert.ok(states.every(state => !['AK', 'HI', 'DC'].includes(state.code)));
  assert.ok(states.every((state, index) => !index || states[index - 1].lon <= state.lon));
  assert.ok(projects.some(project => project.id === 'america-states'
    && project.entry === 'visualizers/america-states/index.html'));
});
