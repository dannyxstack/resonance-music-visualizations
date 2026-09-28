import type { AudioFeatures } from "../types/audio";
import { FREQUENCY_BANDS, getBandEnergy } from "./frequency";
import { BeatDetector } from "./BeatDetector";
import { SpectralFlux } from "./SpectralFlux";

export class FeatureExtractor {
  private readonly beatDetector = new BeatDetector();
  private readonly spectralFlux = new SpectralFlux();

  extract(
    frequencyData: Uint8Array<ArrayBufferLike>,
    timeDomainData: Uint8Array<ArrayBufferLike>,
    sampleRate: number,
    fftSize: number,
    now: number,
  ): AudioFeatures {
    let sumSquares = 0;
    for (const sample of timeDomainData) {
      const centered = (sample - 128) / 128;
      sumSquares += centered * centered;
    }

    const rms = Math.min(1, Math.sqrt(sumSquares / Math.max(1, timeDomainData.length)) * 1.8);
    const sub = getBandEnergy(frequencyData, sampleRate, fftSize, FREQUENCY_BANDS.sub.minHz, FREQUENCY_BANDS.sub.maxHz);
    const bass = getBandEnergy(frequencyData, sampleRate, fftSize, FREQUENCY_BANDS.bass.minHz, FREQUENCY_BANDS.bass.maxHz);
    const lowMid = getBandEnergy(frequencyData, sampleRate, fftSize, FREQUENCY_BANDS.lowMid.minHz, FREQUENCY_BANDS.lowMid.maxHz);
    const mid = getBandEnergy(frequencyData, sampleRate, fftSize, FREQUENCY_BANDS.mid.minHz, FREQUENCY_BANDS.mid.maxHz);
    const high = getBandEnergy(frequencyData, sampleRate, fftSize, FREQUENCY_BANDS.high.minHz, FREQUENCY_BANDS.high.maxHz);
    const air = getBandEnergy(frequencyData, sampleRate, fftSize, FREQUENCY_BANDS.air.minHz, FREQUENCY_BANDS.air.maxHz);
    const flux = this.spectralFlux.update(frequencyData);

    return {
      rms,
      sub,
      bass,
      lowMid,
      mid,
      high,
      air,
      spectralFlux: flux,
      beat: this.beatDetector.update(bass, now),
      onset: Math.min(1, flux * 1.8),
    };
  }

  reset(): void {
    this.beatDetector.reset();
    this.spectralFlux.reset();
  }
}
