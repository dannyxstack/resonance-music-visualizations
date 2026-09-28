export type FrequencyBand = "sub" | "bass" | "lowMid" | "mid" | "high" | "air";

export interface AudioFeatures {
  rms: number;
  sub: number;
  bass: number;
  lowMid: number;
  mid: number;
  high: number;
  air: number;
  spectralFlux: number;
  beat: boolean;
  onset: number;
}

export const SILENCE_FEATURES: AudioFeatures = {
  rms: 0,
  sub: 0,
  bass: 0,
  lowMid: 0,
  mid: 0,
  high: 0,
  air: 0,
  spectralFlux: 0,
  beat: false,
  onset: 0,
};
