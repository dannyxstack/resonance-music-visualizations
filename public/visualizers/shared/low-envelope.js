// Whole-track, centered 20–130 Hz amplitude envelope. This does not detect beats or BPM.
const FRAME_RATE = 100;
const clamp = value => Math.max(0, Math.min(1, value));
const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

function fft(real, imag, cosine, sine, reverse) {
  const n = real.length;
  for (let i = 0; i < n; i++) {
    const j = reverse[i];
    if (j > i) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const stride = n / size;
    for (let base = 0; base < n; base += size) {
      for (let j = 0; j < half; j++) {
        const index = j * stride;
        const a = base + j;
        const b = a + half;
        const r = real[b] * cosine[index] - imag[b] * sine[index];
        const m = real[b] * sine[index] + imag[b] * cosine[index];
        real[b] = real[a] - r;
        imag[b] = imag[a] - m;
        real[a] += r;
        imag[a] += m;
      }
    }
  }
}

export async function analyzeLowFrequencyEnvelope(buffer, shouldCancel = () => false, onProgress = () => {}) {
  const sr = buffer.sampleRate;
  const factor = Math.max(1, Math.floor(sr / 2756));
  const dsr = sr / factor;
  const length = buffer.length;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const taps = new Float64Array(127);
  let coefficientSum = 0;
  for (let i = 0; i < taps.length; i++) {
    const offset = i - 63;
    const sinc = offset === 0 ? 2 * 400 / sr : Math.sin(2 * Math.PI * 400 * offset / sr) / (Math.PI * offset);
    taps[i] = sinc * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / 126));
    coefficientSum += taps[i];
  }
  for (let i = 0; i < taps.length; i++) taps[i] /= coefficientSum;

  const downsampled = new Float32Array(Math.ceil(length / factor));
  for (let i = 0; i < downsampled.length; i++) {
    const center = i * factor;
    let sum = 0;
    for (let tap = 0; tap < 127; tap++) {
      const index = center + tap - 63;
      if (index < 0 || index >= length) continue;
      let mono = 0;
      for (let channel = 0; channel < channels.length; channel++) mono += channels[channel][index];
      sum += taps[tap] * mono / channels.length;
    }
    downsampled[i] = sum;
    if (i % 16384 === 0) {
      if (shouldCancel()) return null;
      onProgress(i / downsampled.length * 0.25);
      await yieldToBrowser();
    }
  }

  const winLen = Math.round(0.2 * dsr);
  let size = 1;
  while (size < winLen) size *= 2;
  size *= 2;
  const window = new Float64Array(winLen);
  let windowSum = 0;
  for (let i = 0; i < winLen; i++) {
    window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (winLen - 1));
    windowSum += window[i];
  }
  const bits = Math.log2(size);
  const reverse = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    let value = i;
    for (let bit = 0; bit < bits; bit++) {
      reverse[i] = (reverse[i] << 1) | (value & 1);
      value >>>= 1;
    }
  }
  const cosine = new Float64Array(size / 2);
  const sine = new Float64Array(size / 2);
  for (let i = 0; i < size / 2; i++) {
    cosine[i] = Math.cos(-2 * Math.PI * i / size);
    sine[i] = Math.sin(-2 * Math.PI * i / size);
  }
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  const binHz = dsr / size;
  const firstBin = Math.ceil(20 / binHz);
  const lastBin = Math.floor(130 / binHz);
  const frames = Math.ceil(length / sr * FRAME_RATE) + 1;
  const env = new Float32Array(frames);
  let maximum = 0;
  for (let f = 0; f < frames; f++) {
    const start = Math.round(f * dsr / FRAME_RATE - winLen / 2);
    real.fill(0);
    imag.fill(0);
    for (let i = 0; i < winLen; i++) {
      const index = start + i;
      if (index >= 0 && index < downsampled.length) real[i] = downsampled[index] * window[i];
    }
    fft(real, imag, cosine, sine, reverse);
    let squared = 0;
    for (let k = firstBin; k <= lastBin; k++) {
      const amp = 2 * Math.hypot(real[k], imag[k]) / windowSum;
      const db = 20 * Math.log10(amp + 1e-12) + 56;
      if (db >= 20) squared += db * db;
    }
    env[f] = Math.sqrt(squared);
    maximum = Math.max(maximum, env[f]);
    if (f % 64 === 0) {
      if (shouldCancel()) return null;
      onProgress(0.25 + f / frames * 0.7);
      await yieldToBrowser();
    }
  }
  if (maximum > 0) for (let i = 0; i < env.length; i++) env[i] /= maximum;
  onProgress(1);
  return env;
}

export function updateLowFrequencyLevel(env, time, playing, dt, level) {
  let target = 0;
  if (env && playing) {
    const position = Math.max(0, time * FRAME_RATE);
    const index = Math.floor(position);
    const fraction = position - index;
    if (index + 1 < env.length) target = env[index] * (1 - fraction) + env[index + 1] * fraction;
    target = clamp((target - 0.35) / (0.95 - 0.35));
  }
  const decay = 3 * Math.max(0, dt);
  const difference = target - level;
  if (difference < 0) target = Math.max(target, level - decay);
  else if (difference < 0.04) target = Math.max(0, level - decay);
  return target;
}

export async function analyzeLowFrequencyFile(file, shouldCancel = () => false, onProgress = () => {}) {
  let context;
  try {
    const bytes = await file.arrayBuffer();
    if (shouldCancel()) return null;
    context = new AudioContext();
    const buffer = await context.decodeAudioData(bytes);
    if (shouldCancel()) return null;
    return analyzeLowFrequencyEnvelope(buffer, shouldCancel, onProgress);
  } finally {
    if (context) void context.close();
  }
}
