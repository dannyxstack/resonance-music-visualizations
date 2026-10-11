import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeOfflineSpectrum } from '../public/visualizers/shared/offline-spectrum.js';

test('offline spectrum follows different frequencies at fixed frame times', async () => {
  const sampleRate = 8192;
  const samples = new Float32Array(sampleRate * 2);
  for (let i = 0; i < samples.length; i++) {
    const time = i / sampleRate;
    const frequency = time < 1 ? 100 : 2000;
    samples[i] = .55 * Math.sin(2 * Math.PI * frequency * time);
  }
  const buffer = {
    sampleRate,
    length: samples.length,
    duration: 2,
    numberOfChannels: 1,
    getChannelData: () => samples,
  };
  const first = await analyzeOfflineSpectrum(buffer, 30, 1);
  const second = await analyzeOfflineSpectrum(buffer, 30, 1);
  assert.equal(first.frameCount, 60);
  assert.deepEqual(first.levels, second.levels);
  const low = 10; // about 100 Hz on the logarithmic scale
  const high = 49; // about 2 kHz
  assert.ok(first.levels[15 * 72 + low] > first.levels[15 * 72 + high]);
  assert.ok(first.levels[45 * 72 + high] > first.levels[45 * 72 + low]);
});
