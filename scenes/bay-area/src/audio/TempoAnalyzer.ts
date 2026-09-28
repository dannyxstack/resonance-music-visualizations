import type { TempoAnalysis, TempoProgress } from "../types/tempo";

type ProgressCallback = (progress: TempoProgress) => void;

const MIN_BPM = 70;
const MAX_BPM = 180;
const FRAME_SIZE = 2048;
const HOP_SIZE = 1024;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readFile(file: File, onProgress: ProgressCallback): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event): void => {
      if (event.lengthComputable) {
        onProgress({ phase: "Reading", progress: clamp((event.loaded / event.total) * 0.34, 0, 0.34) });
      }
    };
    reader.onerror = (): void => reject(new Error("Could not read the selected audio file."));
    reader.onload = (): void => {
      if (reader.result instanceof ArrayBuffer) {
        onProgress({ phase: "Reading", progress: 0.34 });
        resolve(reader.result);
      } else {
        reject(new Error("Could not read the selected audio file."));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function mixFrame(buffer: AudioBuffer, start: number, frameSize: number): number {
  let total = 0;
  const channelCount = buffer.numberOfChannels;
  const end = Math.min(buffer.length, start + frameSize);

  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      total += Math.abs(channel[sampleIndex]);
    }
  }

  return total / Math.max(1, (end - start) * channelCount);
}

function normalizeEnvelope(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = sorted[Math.floor(sorted.length * 0.94)] || 1;
  return values.map((value) => clamp(value / percentile, 0, 1));
}

function estimateFirstBeat(envelope: number[], fps: number, interval: number): number {
  const periodFrames = Math.max(1, Math.round(interval * fps));
  let bestPhase = 0;
  let bestScore = -Infinity;

  for (let phase = 0; phase < periodFrames; phase += 1) {
    let score = 0;
    let count = 0;
    for (let index = phase; index < envelope.length; index += periodFrames) {
      score += envelope[index];
      count += 1;
    }
    const normalized = count > 0 ? score / Math.sqrt(count) : 0;
    if (normalized > bestScore) {
      bestScore = normalized;
      bestPhase = phase;
    }
  }

  return bestPhase / fps;
}

async function createOnsetEnvelope(
  buffer: AudioBuffer,
  onProgress: ProgressCallback,
): Promise<{ envelope: number[]; fps: number }> {
  const frameCount = Math.max(1, Math.floor((buffer.length - FRAME_SIZE) / HOP_SIZE));
  const energies = new Array<number>(frameCount);
  const onset = new Array<number>(frameCount);
  let previous = 0;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const energy = mixFrame(buffer, frameIndex * HOP_SIZE, FRAME_SIZE);
    energies[frameIndex] = energy;
    onset[frameIndex] = Math.max(0, energy - previous * 0.96);
    previous = energy;

    if (frameIndex % 700 === 0) {
      onProgress({ phase: "Analyzing", progress: 0.56 + (frameIndex / frameCount) * 0.22 });
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  const normalized = normalizeEnvelope(onset);
  const localAverageWindow = Math.max(3, Math.round(buffer.sampleRate / HOP_SIZE / 4));
  const sharpened = normalized.map((value, index) => {
    let sum = 0;
    let count = 0;
    for (
      let cursor = Math.max(0, index - localAverageWindow);
      cursor <= Math.min(normalized.length - 1, index + localAverageWindow);
      cursor += 1
    ) {
      sum += normalized[cursor];
      count += 1;
    }
    return Math.max(0, value - (sum / Math.max(1, count)) * 0.72);
  });

  return {
    envelope: normalizeEnvelope(sharpened),
    fps: buffer.sampleRate / HOP_SIZE,
  };
}

function estimateTempo(envelope: number[], fps: number): TempoAnalysis {
  const minLag = Math.floor((60 / MAX_BPM) * fps);
  const maxLag = Math.ceil((60 / MIN_BPM) * fps);
  let bestLag = minLag;
  let bestScore = -Infinity;
  let totalScore = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    for (let index = lag; index < envelope.length; index += 1) {
      score += envelope[index] * envelope[index - lag];
    }

    const bpm = (60 * fps) / lag;
    const metricalWeight = bpm >= 88 && bpm <= 150 ? 1.08 : 1;
    score = (score / Math.sqrt(Math.max(1, envelope.length - lag))) * metricalWeight;
    totalScore += Math.max(0, score);

    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  const beatInterval = bestLag / fps;
  const bpm = 60 / beatInterval;
  const confidence = totalScore > 0 ? clamp(bestScore / (totalScore / Math.max(1, maxLag - minLag + 1)) / 8, 0, 1) : 0;

  return {
    bpm,
    beatInterval,
    firstBeatTime: estimateFirstBeat(envelope, fps, beatInterval),
    confidence,
  };
}

export async function analyzeTempo(file: File, onProgress: ProgressCallback): Promise<TempoAnalysis> {
  onProgress({ phase: "Reading", progress: 0 });
  const arrayBuffer = await readFile(file, onProgress);
  onProgress({ phase: "Decoding", progress: 0.42 });

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextCtor();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    onProgress({ phase: "Analyzing", progress: 0.56 });
    const { envelope, fps } = await createOnsetEnvelope(decoded, onProgress);
    const tempo = estimateTempo(envelope, fps);
    onProgress({ phase: "Analyzing", progress: 1 });
    return tempo;
  } finally {
    void audioContext.close();
  }
}
