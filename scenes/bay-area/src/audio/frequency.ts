export interface FrequencyRange {
  minHz: number;
  maxHz: number;
}

export const FREQUENCY_BANDS: Record<string, FrequencyRange> = {
  sub: { minHz: 20, maxHz: 80 },
  bass: { minHz: 80, maxHz: 200 },
  lowMid: { minHz: 200, maxHz: 600 },
  mid: { minHz: 600, maxHz: 2000 },
  high: { minHz: 2000, maxHz: 6000 },
  air: { minHz: 6000, maxHz: 16000 },
};

export function getBandEnergy(
  frequencyData: Uint8Array<ArrayBufferLike>,
  sampleRate: number,
  fftSize: number,
  minHz: number,
  maxHz: number,
): number {
  const binFrequency = sampleRate / fftSize;
  const startBin = Math.max(0, Math.floor(minHz / binFrequency));
  const endBin = Math.min(frequencyData.length - 1, Math.ceil(maxHz / binFrequency));

  if (endBin <= startBin) {
    return 0;
  }

  let total = 0;
  for (let bin = startBin; bin <= endBin; bin += 1) {
    total += frequencyData[bin] / 255;
  }

  return Math.min(1, total / (endBin - startBin + 1));
}
