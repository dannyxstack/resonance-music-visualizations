import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBpm } from '../public/visualizers/neon-spectrum/bpm-analysis.js';

function pulseTrack(bpm, frequency = 90) {
  const sampleRate = 22050;
  const duration = 12;
  const samples = new Float32Array(sampleRate * duration);
  for (let beat = 0; beat * 60 / bpm < duration; beat++) {
    const start = Math.round((0.17 + beat * 60 / bpm) * sampleRate);
    for (let i = 0; i < sampleRate * 0.08 && start + i < samples.length; i++) {
      samples[start + i] += Math.sin(2 * Math.PI * frequency * i / sampleRate) * Math.exp(-i / (sampleRate * 0.018));
    }
  }
  return { sampleRate, numberOfChannels: 1, length: samples.length, getChannelData: () => samples };
}

test('both methods identify a stable bass pulse and its phase', async () => {
  const buffer = pulseTrack(120);
  for (const method of ['onset', 'bass']) {
    const result = await analyzeBpm(buffer, method);
    assert.ok(result, `${method} should find a pulse`);
    assert.ok(Math.abs(result.bpm - 120) < 2, `${method}: ${result.bpm}`);
    assert.ok(Math.abs(result.firstBeatTime - 0.17) < 0.05, `${method}: phase ${result.firstBeatTime}`);
    assert.ok(result.beats.length > 15, `${method}: missing beat strengths`);
    assert.ok(result.beats.every(beat => beat.strength > 0 && beat.strength <= 1));
  }
});

test('broadband method handles a bright rhythmic pulse', async () => {
  const result = await analyzeBpm(pulseTrack(95, 3000), 'onset');
  assert.ok(result);
  assert.ok(Math.abs(result.bpm - 95) < 2, String(result.bpm));
});

test('silence reports no stable BPM', async () => {
  const samples = new Float32Array(22050 * 5);
  assert.equal(await analyzeBpm({ sampleRate: 22050, numberOfChannels: 1, length: samples.length, getChannelData: () => samples }, 'onset'), null);
});

test('opposite-phase stereo channels do not cancel the rhythm', async () => {
  const mono = pulseTrack(120);
  const first = mono.getChannelData();
  const second = Float32Array.from(first, value => -value);
  const stereo = { ...mono, numberOfChannels: 2, getChannelData: index => index ? second : first };
  const result = await analyzeBpm(stereo, 'bass');
  assert.ok(result);
  assert.ok(Math.abs(result.bpm - 120) < 2);
});

test('a replaced selection cancels pending analysis', async () => {
  await assert.rejects(analyzeBpm(pulseTrack(120), 'onset', () => true), { name: 'AbortError' });
});
