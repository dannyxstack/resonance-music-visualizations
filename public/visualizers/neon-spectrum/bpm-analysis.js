const FRAMES_PER_SECOND = 100;
const MIN_BPM = 60;
const MAX_BPM = 200;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export async function analyzeBpm(buffer, method, shouldCancel = () => false, onProgress = () => {}) {
  if (method !== 'onset' && method !== 'bass') throw new Error('Unknown BPM analysis method');
  const sampleRate = buffer.sampleRate;
  const samples = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, i) => buffer.getChannelData(i));
  const hop = Math.max(1, Math.round(sampleRate / FRAMES_PER_SECOND));
  const step = Math.max(1, Math.floor(sampleRate / 11025));
  const frameCount = Math.ceil(buffer.length / hop);
  const envelope = new Float32Array(frameCount);
  const filterAlpha = 1 - Math.exp(-2 * Math.PI * 180 * step / sampleRate);
  const filtered = new Float64Array(samples.length);
  let previousEnergy = 0;

  for (let frame = 0; frame < frameCount; frame++) {
    if (frame % 400 === 0) {
      if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');
      onProgress(frame / frameCount * 0.65);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const start = frame * hop;
    const end = Math.min(buffer.length, start + hop);
    let squared = 0;
    let count = 0;
    for (let i = start; i < end; i += step) {
      for (let channelIndex = 0; channelIndex < samples.length; channelIndex++) {
        let sample = samples[channelIndex][i];
        if (method === 'bass') {
          filtered[channelIndex] += filterAlpha * (sample - filtered[channelIndex]);
          sample = filtered[channelIndex];
        }
        squared += sample * sample;
      }
      count++;
    }
    const energy = Math.sqrt(squared / Math.max(1, count * samples.length));
    envelope[frame] = Math.max(0, energy - previousEnergy);
    previousEnergy = energy;
  }

  if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');
  // Remove weak fluctuations without discarding the timing of strong attacks.
  const positive = Array.from(envelope).filter(value => value > 0).sort((a, b) => a - b);
  const reference = positive[Math.floor(positive.length * 0.9)] || 0;
  if (!reference || frameCount < FRAMES_PER_SECOND * 3) return null;
  const threshold = reference * 0.12;
  let onsetCount = 0;
  let lastOnsetFrame = -FRAMES_PER_SECOND;
  for (let i = 0; i < envelope.length; i++) {
    envelope[i] = clamp((envelope[i] - threshold) / reference, 0, 1);
    if (envelope[i] > 0.2 && i - lastOnsetFrame >= FRAMES_PER_SECOND / 10) {
      onsetCount++;
      lastOnsetFrame = i;
    }
  }
  if (onsetCount < 4) return null;

  const minLag = Math.round(FRAMES_PER_SECOND * 60 / MAX_BPM);
  const maxLag = Math.round(FRAMES_PER_SECOND * 60 / MIN_BPM);
  const scores = new Float64Array(maxLag + 1);
  let bestLag = minLag;
  let bestScore = 0;
  let scoreSum = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');
    let score = 0;
    for (let i = lag; i < envelope.length; i++) score += envelope[i] * envelope[i - lag];
    score /= envelope.length - lag;
    // A gentle mid-tempo preference helps resolve common half/double-time ties.
    if (60 * FRAMES_PER_SECOND / lag >= 85 && 60 * FRAMES_PER_SECOND / lag <= 155) score *= 1.04;
    scores[lag] = score;
    scoreSum += score;
    if (score > bestScore) { bestScore = score; bestLag = lag; }
    if (lag % 15 === 0) {
      onProgress(0.65 + (lag - minLag) / (maxLag - minLag) * 0.25);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  if (!bestScore) return null;

  // Interpolate around the winning lag for finer BPM resolution than 10 ms.
  const before = scores[bestLag - 1] || bestScore;
  const after = scores[bestLag + 1] || bestScore;
  const curvature = before - 2 * bestScore + after;
  const adjustment = curvature < 0 ? clamp(0.5 * (before - after) / curvature, -0.5, 0.5) : 0;
  const periodFrames = bestLag + adjustment;
  let bestPhase = 0;
  let bestPhaseScore = -1;
  for (let phase = 0; phase < Math.round(periodFrames); phase++) {
    if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');
    let score = 0;
    let count = 0;
    for (let index = phase; index < envelope.length; index += periodFrames) {
      const frame = Math.round(index);
      score += Math.max(envelope[frame - 1] || 0, envelope[frame] || 0, envelope[frame + 1] || 0);
      count++;
    }
    score /= Math.max(1, count);
    if (score > bestPhaseScore) { bestPhaseScore = score; bestPhase = phase; }
  }
  onProgress(1);
  const averageScore = scoreSum / (maxLag - minLag + 1);
  const beats = [];
  for (let index = bestPhase; index < envelope.length; index += periodFrames) {
    let strongest = 0;
    let strongestFrame = Math.round(index);
    for (let offset = -5; offset <= 5; offset++) {
      const frame = Math.round(index) + offset;
      if (frame >= 0 && frame < envelope.length && envelope[frame] > strongest) {
        strongest = envelope[frame];
        strongestFrame = frame;
      }
    }
    if (strongest >= .2) beats.push({ time: strongestFrame / FRAMES_PER_SECOND, strength: strongest });
  }
  return {
    bpm: 60 * FRAMES_PER_SECOND / periodFrames,
    firstBeatTime: bestPhase / FRAMES_PER_SECOND,
    confidence: clamp((bestScore / Math.max(averageScore, 1e-9) - 1) / 3, 0, 1),
    beats,
    method,
  };
}
