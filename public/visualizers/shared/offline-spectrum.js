// A fixed-time counterpart to the live AnalyserNode, for reproducible video frames.
const FFT_SIZE = 2048;
const BAR_COUNT = 72;
const clamp = value => Math.max(0, Math.min(1, value));
const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

function fft(real, imaginary) {
  const size = real.length;
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = -2 * Math.PI / length;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let wr = 1;
      let wi = 0;
      for (let i = 0; i < length / 2; i++) {
        const left = start + i;
        const right = left + length / 2;
        const vr = real[right] * wr - imaginary[right] * wi;
        const vi = real[right] * wi + imaginary[right] * wr;
        real[right] = real[left] - vr;
        imaginary[right] = imaginary[left] - vi;
        real[left] += vr;
        imaginary[left] += vi;
        const nextReal = wr * stepReal - wi * stepImaginary;
        wi = wr * stepImaginary + wi * stepReal;
        wr = nextReal;
      }
    }
  }
}

export async function analyzeOfflineSpectrum(buffer, fps, sensitivity, shouldCancel = () => false, onProgress = () => {}) {
  const frameCount = Math.ceil(buffer.duration * fps);
  const result = new Float32Array(frameCount * BAR_COUNT);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const real = new Float64Array(FFT_SIZE);
  const imaginary = new Float64Array(FFT_SIZE);
  const window = Float64Array.from({ length: FFT_SIZE }, (_, index) => .5 - .5 * Math.cos(2 * Math.PI * index / (FFT_SIZE - 1)));
  const windowSum = window.reduce((sum, value) => sum + value, 0);
  const smoothedSpectrum = new Float32Array(FFT_SIZE / 2);
  const lastLevels = new Float32Array(BAR_COUNT);
  const binByBar = Int16Array.from({ length: BAR_COUNT }, (_, index) => {
    const frequency = 45 * (11000 / 45) ** (index / (BAR_COUNT - 1));
    return Math.max(1, Math.min(FFT_SIZE / 2 - 2, Math.round(frequency * FFT_SIZE / buffer.sampleRate)));
  });

  for (let frame = 0; frame < frameCount; frame++) {
    if (shouldCancel()) throw new DOMException('Export cancelled', 'AbortError');
    const start = Math.round(frame * buffer.sampleRate / fps - FFT_SIZE / 2);
    imaginary.fill(0);
    for (let i = 0; i < FFT_SIZE; i++) {
      const sampleIndex = start + i;
      let mono = 0;
      if (sampleIndex >= 0 && sampleIndex < buffer.length) {
        for (const channel of channels) mono += channel[sampleIndex];
        mono /= channels.length;
      }
      real[i] = mono * window[i];
    }
    fft(real, imaginary);
    for (let bin = 0; bin < smoothedSpectrum.length; bin++) {
      const amplitude = 2 * Math.hypot(real[bin], imaginary[bin]) / windowSum;
      const db = 20 * Math.log10(amplitude + 1e-12);
      const energy = clamp((db + 100) / 70);
      smoothedSpectrum[bin] = smoothedSpectrum[bin] * .72 + energy * .28;
    }
    for (let bar = 0; bar < BAR_COUNT; bar++) {
      const bin = binByBar[bar];
      const target = (smoothedSpectrum[bin - 1] + smoothedSpectrum[bin] + smoothedSpectrum[bin + 1]) / 3 * sensitivity;
      const previous = lastLevels[bar];
      const level = previous + (target - previous) * (target > previous ? .34 : .095);
      result[frame * BAR_COUNT + bar] = lastLevels[bar] = level;
    }
    if (frame % 48 === 0) {
      onProgress(frame / Math.max(1, frameCount));
      await yieldToBrowser();
    }
  }
  onProgress(1);
  return { frameCount, barCount: BAR_COUNT, levels: result };
}
