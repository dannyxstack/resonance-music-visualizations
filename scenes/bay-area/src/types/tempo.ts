export interface TempoAnalysis {
  bpm: number;
  beatInterval: number;
  firstBeatTime: number;
  confidence: number;
}

export interface TempoProgress {
  phase: "Reading" | "Decoding" | "Analyzing";
  progress: number;
}
