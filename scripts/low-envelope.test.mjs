import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLowFrequencyEnvelope, updateLowFrequencyLevel } from '../public/visualizers/shared/low-envelope.js';

function bufferFor(frequency, amplitude = 0.8, seconds = 0.6) {
  const sampleRate = 44100;
  const data = new Float32Array(Math.round(sampleRate * seconds));
  for (let i = 0; i < data.length; i++) data[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
  return { sampleRate, length: data.length, numberOfChannels: 1, getChannelData: () => data };
}

test('whole-track low envelope responds to bass and rejects high frequencies', async () => {
  const bass = await analyzeLowFrequencyEnvelope(bufferFor(80));
  const high = await analyzeLowFrequencyEnvelope(bufferFor(1000));
  assert.ok(bass[30] > 0.5);
  assert.ok(high[30] < 0.15);
});

test('playback follower uses centered samples and linear fall without small upward jitter', () => {
  const env = new Float32Array(200);
  env.fill(0.95);
  assert.ok(updateLowFrequencyLevel(env, 0.5, true, 0.016, 0) > 0.99);
  assert.equal(updateLowFrequencyLevel(null, 0.5, false, 0.1, 1), 0.7);
  env.fill(0.36);
  assert.equal(updateLowFrequencyLevel(env, 0.5, true, 0.01, 0.2), 0.17);
});
