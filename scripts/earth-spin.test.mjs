import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR_BANDS, latitudeForLevel } from '../public/visualizers/earth-spin/spectrum-layout.js';
import { CITY_GDP, CITY_ENERGY_METHODS, CITY_LIGHT_COLORS, cityEnergyForMethod, cityLightValue, cityLightRadius } from '../public/visualizers/earth-spin/city-lights.js';

test('equator bands mirror low to high to low without a high-low seam', () => {
  assert.deepEqual(BAR_BANDS, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  for (let i = 0; i < BAR_BANDS.length; i++) {
    assert.ok(Math.abs(BAR_BANDS[i] - BAR_BANDS[(i + 1) % BAR_BANDS.length]) <= 1);
  }
});

test('spectrum bars remain within 30 degrees of the equator in both directions', () => {
  assert.equal(latitudeForLevel(-1), 5);
  assert.equal(latitudeForLevel(1), 30);
  assert.equal(latitudeForLevel(4), 30);
});

test('all 39 requested city lights have usable coordinates and GDP snapshots', () => {
  assert.equal(CITY_GDP.length, 39);
  assert.equal(new Set(CITY_GDP.map(city => city.name)).size, 39);
  for (const name of ['北京', '成都', '开普敦', '波哥大', '休斯顿', '达拉斯', '广州', '米兰', '慕尼黑']) {
    assert.ok(CITY_GDP.some(city => city.name === name), `${name} is missing`);
  }
  for (const city of CITY_GDP) {
    assert.ok(city.lat >= -90 && city.lat <= 90);
    assert.ok(city.lon >= -180 && city.lon <= 180);
    assert.ok(city.gdp > 0);
    assert.ok(city.year >= 2020 && city.year <= 2025);
  }
});

test('city energy choices use the requested equal mixes and one value controls dot size and brightness', () => {
  assert.deepEqual(CITY_ENERGY_METHODS.map(method => method.value), ['beat', 'live-beat', 'live-low', 'beat-low']);
  assert.ok(CITY_LIGHT_COLORS.length >= 4);
  assert.equal(cityEnergyForMethod('beat', 0.2, 0.8, 0.4), 0.8);
  assert.equal(cityEnergyForMethod('live-beat', 0.2, 0.8, 0.4), 0.5);
  assert.ok(Math.abs(cityEnergyForMethod('live-low', 0.2, 0.8, 0.4) - 0.3) < 1e-12);
  assert.ok(Math.abs(cityEnergyForMethod('beat-low', 0.2, 0.8, 0.4) - 0.6) < 1e-12);
  assert.equal(cityLightValue(100, 100, 10000, 0), 1);
  assert.equal(cityLightValue(10000, 100, 10000, 1), 2);
  assert.ok(Math.abs(cityLightValue(1000, 100, 10000, 0.5) - 1.5) < 1e-12);
  assert.ok(cityLightValue(1000, 100, 10000, 1) > cityLightValue(1000, 100, 10000, 0));
  assert.equal(cityLightRadius(1, 1, 1), 1);
  assert.equal(cityLightRadius(7, 9, 1.5), 11.5);
  assert.equal(cityLightRadius(7, 9, 2), 16);
});
