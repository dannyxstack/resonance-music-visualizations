import test from 'node:test';
import assert from 'node:assert/strict';
import { beatCycleStepAt, logoActionAt, motionBeatAt, rayPulseAt, rayTargets, shiftHexHue } from '../scenes/bay-area/src/visual/logoMotion.ts';
import { companies } from '../scenes/bay-area/src/config/companies.ts';

const tempo = { bpm: 120, beatInterval: .5, firstBeatTime: .1, confidence: 1 };

test('beat actions have a visible envelope after each beat and fall back when BPM is unavailable', () => {
  assert.equal(motionBeatAt(.1, tempo, 0, true).pulse, 0);
  assert.ok(motionBeatAt(.3, tempo, 0, true).pulse > .9);
  assert.equal(motionBeatAt(.55, tempo, 0, true).pulse, 0);
  assert.equal(motionBeatAt(.3, tempo, 1, false).pulse, 0);
  assert.equal(motionBeatAt(.3, null, .7, true).pulse, .7);
});

test('spin, jump, side step and tilt produce distinct visible motion', () => {
  const spinA = logoActionAt('spin', 1, 0, 0, 32, false, 1);
  const spinB = logoActionAt('spin', 2, 0, 0, 32, false, 1);
  assert.notEqual(spinA.rotation, spinB.rotation);
  assert.equal(logoActionAt('spin2x', 2, 0, 0, 32, false, 1).rotation, spinB.rotation * 2);
  assert.ok(logoActionAt('beatJump', 1, 1, 0, 32, false, 1).offsetY < -30);
  const left = logoActionAt('beatSideStep', 1, 1, 0, 32, false, 1).offsetX;
  const right = logoActionAt('beatSideStep', 1, 1, 1, 32, false, 1).offsetX;
  assert.ok(left < -30 && right > 30);
  const tiltLeft = logoActionAt('beatTilt', 1, 1, 0, 32, false, 1).rotation;
  const tiltRight = logoActionAt('beatTilt', 1, 1, 1, 32, false, 1).rotation;
  assert.ok(tiltLeft < -.8 && tiltRight > .8);
});

test('shake has beat-sized motion and stops between pulses', () => {
  const active = logoActionAt('shake', 1.1, 1, 0, 32, false, 17);
  const reduced = logoActionAt('shake', 1.1, 1, 0, 32, true, 17);
  const idle = logoActionAt('shake', 1.1, 0, 0, 32, false, 17);
  assert.ok(Math.hypot(active.offsetX, active.offsetY) > 5);
  assert.ok(Math.hypot(reduced.offsetX, reduced.offsetY) < Math.hypot(active.offsetX, active.offsetY));
  assert.equal(idle.offsetX, 0);
  assert.equal(idle.offsetY, 0);
});

test('white rays choose two to five distinct nearby logos and hold targets through a beat', () => {
  const source = { id: 'source', x: .5, y: .5 };
  const others = Array.from({ length: 18 }, (_, index) => ({ id: `logo-${index}`, x: .5 + (index + 1) * .01, y: .5 }));
  const selected = rayTargets(source, [source, ...others], 4);
  assert.ok(selected.length >= 2 && selected.length <= 5);
  assert.equal(new Set(selected.map(item => item.id)).size, selected.length);
  assert.ok(selected.every(item => item.id !== source.id && Number(item.id.slice(5)) < 12));
  assert.deepEqual(rayTargets(source, [source, ...others], 4), selected);
  assert.notDeepEqual(rayTargets(source, [source, ...others], 5), selected);
});

test('white rays light up on the beat and fade before the next beat', () => {
  assert.equal(rayPulseAt(.1, tempo, 0, true), 1);
  assert.ok(rayPulseAt(.2, tempo, 0, true) > 0);
  assert.equal(rayPulseAt(.45, tempo, 0, true), 0);
  assert.equal(rayPulseAt(.1, tempo, 1, false), 0);
});

test('each colored ray action is assigned to a distinct logo', () => {
  assert.equal(companies.filter(company => company.motion === 'whiteRays').length, 1);
  assert.equal(companies.filter(company => company.motion === 'yellowRays').length, 1);
  assert.equal(companies.filter(company => company.motion === 'purpleRays').length, 1);
  assert.equal(companies.filter(company => company.motion === 'shake').length, 3);
});

test('halo hue advances 60 degrees per beat while preserving saturation and lightness', () => {
  assert.equal(beatCycleStepAt(0, tempo, 7), 0);
  assert.equal(beatCycleStepAt(.1, tempo, 7), 1);
  assert.equal(beatCycleStepAt(.6, tempo, 7), 2);
  assert.equal(beatCycleStepAt(0, null, 7), 7);
  assert.equal(shiftHexHue('#ff0000', 60), 'hsl(60 100% 50%)');
  assert.equal(shiftHexHue('#ff0000', 360), '#ff0000');
  assert.equal(companies.filter(company => company.motion === 'haloHueShift').length, 1);
});
