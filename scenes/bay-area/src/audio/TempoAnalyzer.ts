import { analyzeByMethod, firstBeatOffset } from "../../../../public/visualizers/shared/analysis.js";
import type { TempoAnalysis, TempoProgress } from "../types/tempo";

export async function analyzeTempo(
  file: File,
  method: string,
  onProgress: (progress: TempoProgress) => void,
  shouldCancel: () => boolean = () => false,
): Promise<TempoAnalysis> {
  onProgress({ phase: "Reading", progress: 0 });
  const bytes = await file.arrayBuffer();
  if (shouldCancel()) throw new DOMException("Analysis cancelled", "AbortError");
  onProgress({ phase: "Decoding", progress: .3 });
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(bytes);
    if (shouldCancel()) throw new DOMException("Analysis cancelled", "AbortError");
    const result = await analyzeByMethod(decoded, method, shouldCancel,
      progress => onProgress({ phase: "Analyzing", progress: .4 + progress * .6 }));
    if (!result) throw new Error("No stable beat found");
    return {
      bpm: result.bpm,
      beatInterval: 60 / result.bpm,
      firstBeatTime: firstBeatOffset(result) ?? result.firstBeatTime,
      confidence: result.confidence,
    };
  } finally {
    void context.close();
  }
}
