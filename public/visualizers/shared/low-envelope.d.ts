export function analyzeLowFrequencyEnvelope(buffer: AudioBuffer, shouldCancel?: () => boolean, onProgress?: (progress: number) => void): Promise<Float32Array | null>;
export function updateLowFrequencyLevel(env: Float32Array | null, time: number, playing: boolean, dt: number, level: number): number;
export function analyzeLowFrequencyFile(file: File, shouldCancel?: () => boolean, onProgress?: (progress: number) => void): Promise<Float32Array | null>;
