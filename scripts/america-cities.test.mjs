import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projects } from '../src/projects.js';

const cities = JSON.parse(readFileSync(new URL('../public/visualizers/america-cities/cities.json', import.meta.url)));
const states = JSON.parse(readFileSync(new URL('../public/visualizers/america-cities/states.json', import.meta.url)));

test('2025 Census city data contains 50 ranked mainland places with valid coordinates', () => {
  assert.equal(cities.length, 50);
  assert.deepEqual(cities.map(city => city.rank), Array.from({ length: 50 }, (_, index) => index + 1));
  assert.equal(new Set(cities.map(city => `${city.name},${city.state}`)).size, 50);
  assert.ok(cities.every((city, index) => city.population > 0 && (!index || cities[index - 1].population >= city.population)));
  assert.ok(cities.every(city => city.lon >= -125 && city.lon <= -66 && city.lat >= 24 && city.lat <= 50));
  assert.equal(cities[0].name, 'New York city');
  assert.equal(cities[49].name, 'Aurora city');
  assert.equal(states.length, 49);
  assert.ok(states.every(state => state.length && state.every(ring => ring.length >= 4)));
  assert.ok(projects.some(project => project.id === 'america-cities' && project.entry === 'visualizers/america-cities/index.html'));
});
