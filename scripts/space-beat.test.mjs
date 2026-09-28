import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBeatGrid } from '../public/visualizers/space-odyssey/beat-analysis.js';

function rhythm(bpm, seconds = 24, silentStart = 0, gap = null) {
  const rate = 11025;
  const samples = new Float32Array(rate * seconds);
  for (let beat = .6; beat < seconds - .2; beat += 60 / bpm) {
    if (beat < silentStart || (gap && beat >= gap[0] && beat < gap[1])) continue;
    const kick = Math.round(beat * rate);
    for (let i = 0; i < 180; i++) samples[kick + i] += .7 * Math.exp(-i / 45) * Math.sin(i * .1);
    const hat = Math.round((beat + 30 / bpm) * rate);
    for (let i = 0; i < 60; i++) samples[hat + i] += .3 * Math.exp(-i / 20) * (i % 2 ? 1 : -1);
  }
  return { sampleRate: rate, length: samples.length, numberOfChannels: 1, getChannelData: () => samples };
}

test('tracks kick tempo and beat positions despite offbeat high frequencies', async () => {
  for (const tempo of [85, 120, 140, 175]) {
    const result = await analyzeBeatGrid(rhythm(tempo));
    assert.ok(Math.abs(result.bpm - tempo) < 1.5, `${tempo}: ${result.bpm}`);
    assert.ok(Math.abs(result.beats[0].time - .6) < .08);
    assert.ok(result.beats.length > 20);
  }
});

test('does not pulse through an intro or silent break', async () => {
  const result = await analyzeBeatGrid(rhythm(120, 24, 3, [10, 13]));
  assert.ok(Math.abs(result.bpm - 120) < 1.5);
  assert.ok(result.beats.every(beat => beat.time >= 3));
  assert.ok(result.beats.every(beat => beat.time < 10 || beat.time >= 13));
});
