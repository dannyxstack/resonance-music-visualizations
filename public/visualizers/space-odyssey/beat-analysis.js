const FPS = 100;
const MIN_BPM = 65;
const MAX_BPM = 190;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Work on three broad frequency bands. Their rising energy is a more useful
// cue for kicks, snares and percussion than the absolute spectrum level.
export async function analyzeBeatGrid(buffer, shouldCancel = () => false, onProgress = () => {}) {
  const channels = Array.from({ length: Math.min(buffer.numberOfChannels, 2) }, (_, index) => buffer.getChannelData(index));
  if (!channels.length || buffer.length < buffer.sampleRate * 3) return null;
  const hop = Math.max(1, Math.round(buffer.sampleRate / FPS));
  const step = Math.max(1, Math.floor(buffer.sampleRate / 11025));
  const frameCount = Math.ceil(buffer.length / hop);
  const bands = Array.from({ length: 3 }, () => new Float32Array(frameCount));
  const filter = channels.map(() => [0, 0]);
  const alphaLow = 1 - Math.exp(-2 * Math.PI * 170 * step / buffer.sampleRate);
  const alphaMid = 1 - Math.exp(-2 * Math.PI * 2300 * step / buffer.sampleRate);

  for (let frame = 0; frame < frameCount; frame++) {
    if (frame % 300 === 0) {
      if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');
      onProgress(frame / frameCount * .55);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const sums = [0, 0, 0];
    let count = 0;
    for (let index = frame * hop; index < Math.min(buffer.length, (frame + 1) * hop); index += step) {
      for (let channel = 0; channel < channels.length; channel++) {
        const sample = channels[channel][index];
        const memory = filter[channel];
        memory[0] += alphaLow * (sample - memory[0]);
        memory[1] += alphaMid * (sample - memory[1]);
        const values = [memory[0], memory[1] - memory[0], sample - memory[1]];
        for (let band = 0; band < 3; band++) sums[band] += values[band] * values[band];
      }
      count++;
    }
    for (let band = 0; band < 3; band++) bands[band][frame] = Math.sqrt(sums[band] / Math.max(1, count * channels.length));
  }

  const onset = new Float32Array(frameCount);
  const bassOnset = new Float32Array(frameCount);
  for (let band = 0; band < 3; band++) {
    const rise = new Float32Array(frameCount);
    let previous = 0;
    for (let frame = 0; frame < frameCount; frame++) {
      const energy = bands[band][frame];
      rise[frame] = Math.max(0, energy - previous);
      previous = energy;
    }
    const nonzero = Array.from(rise).filter(value => value > 0).sort((a, b) => a - b);
    const scale = nonzero[Math.floor(nonzero.length * .88)] || 0;
    if (!scale) continue;
    const weight = [1.2, .9, .55][band];
    for (let frame = 0; frame < frameCount; frame++) {
      const value = clamp((rise[frame] / scale - .18) / 2.4, 0, 1);
      onset[frame] += value * weight;
      if (band === 0) bassOnset[frame] = value;
    }
  }

  // A short local maximum keeps each drum hit as a single event. The local
  // baseline suppresses noise and bars in quiet passages.
  const peaks = new Float32Array(frameCount);
  const peakFrames = [];
  let total = 0;
  let peakCount = 0;
  for (let frame = 2; frame < frameCount - 2; frame++) {
    const value = onset[frame];
    if (value < .22 || value < onset[frame - 1] || value <= onset[frame + 1]) continue;
    let average = 0;
    let count = 0;
    for (let i = Math.max(0, frame - 35); i <= Math.min(frameCount - 1, frame + 35); i += 5) {
      average += onset[i]; count++;
    }
    if (value < average / count * 1.28) continue;
    peaks[frame] = Math.min(2, value + bassOnset[frame] * .35);
    peakFrames.push(frame);
    total += peaks[frame];
    peakCount++;
  }
  if (peakCount < 6 || total < 2) return null;
  onProgress(.68);
  if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');

  const minLag = Math.round(FPS * 60 / MAX_BPM);
  const maxLag = Math.round(FPS * 60 / MIN_BPM);
  const scores = new Float64Array(maxLag + 1);
  const halfWindow = Math.round(FPS * .025);
  let highest = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let frame = lag; frame < frameCount; frame++) {
      if (!peaks[frame]) continue;
      let match = 0;
      for (let offset = -halfWindow; offset <= halfWindow; offset++) match = Math.max(match, peaks[frame - lag + offset] || 0);
      score += peaks[frame] * match;
    }
    scores[lag] = score / Math.max(1, total);
    highest = Math.max(highest, scores[lag]);
    if (lag % 10 === 0) {
      if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');
      onProgress(.68 + (lag - minLag) / (maxLag - minLag) * .2);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  if (!highest) return null;

  // Choose a tempo and phase together. This reduces half/double-time errors
  // when an offbeat hi-hat is stronger than the actual downbeat.
  let choice = null;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (scores[lag] < highest * .73) continue;
    // Average matched attack spacings to recover sub-frame tempo precision.
    let spacingSum = 0;
    let spacingWeight = 0;
    for (const frame of peakFrames) {
      let match = 0;
      let matchFrame = 0;
      for (let offset = -3; offset <= 3; offset++) {
        const target = frame + lag + offset;
        if (target < frameCount && peaks[target] > match) { match = peaks[target]; matchFrame = target; }
      }
      if (match) {
        const weight = peaks[frame] * match;
        spacingSum += (matchFrame - frame) * weight;
        spacingWeight += weight;
      }
    }
    const period = spacingWeight ? spacingSum / spacingWeight : lag;
    for (let phase = 0; phase < Math.ceil(period); phase++) {
      let aligned = 0;
      let bass = 0;
      let hits = 0;
      for (let frame = phase; frame < frameCount; frame += period) {
        let best = 0;
        let bestBass = 0;
        for (let offset = -4; offset <= 4; offset++) {
          const index = Math.round(frame + offset);
          if (index < 0 || index >= frameCount) continue;
          if (peaks[index] > best) { best = peaks[index]; bestBass = bassOnset[index]; }
        }
        aligned += best;
        bass += bestBass;
        if (best >= .28) hits++;
      }
      const expected = frameCount / period;
      const coverage = hits / expected;
      const tempo = FPS * 60 / period;
      const score = (aligned + bass * .28) / expected * (0.6 + .4 * coverage) * (scores[lag] / highest) ** .4
        * (tempo >= 110 ? 1.14 : 1);
      if (!choice || score > choice.score) choice = { lag, period, phase, score, coverage };
    }
  }
  if (!choice) return null;
  if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');

  const beats = [];
  for (let frame = choice.phase; frame < frameCount; frame += choice.period) {
    let best = 0;
    let bestFrame = frame;
    for (let offset = -5; offset <= 5; offset++) {
      const index = Math.round(frame + offset);
      if (index >= 0 && index < frameCount && peaks[index] > best) { best = peaks[index]; bestFrame = index; }
    }
    // Keep the measured attack time, but do not invent a visual pulse in silence.
    if (best >= .28) beats.push({ time: bestFrame / FPS, strength: clamp(best / 1.3, .3, 1) });
  }
  onProgress(1);
  return {
    bpm: FPS * 60 / choice.period,
    firstBeatTime: choice.phase / FPS,
    confidence: clamp(choice.coverage * .65 + scores[choice.lag] / Math.max(highest, .001) * .35, 0, 1),
    beats,
    method: 'beat-grid',
  };
}
