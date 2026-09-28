export interface Beat { time: number; strength: number }
export interface BpmResult { bpm: number; firstBeatTime: number; confidence: number; beats: Beat[]; method: string }
export const BPM_METHODS: ReadonlyArray<{ value: string; label: string }>;
export const ENERGY_METHODS: ReadonlyArray<{ value: string; label: string }>;
export function fillMethodSelect(select: HTMLSelectElement, methods: ReadonlyArray<{ value: string; label: string }>, preferred?: string): void;
export function analyzeByMethod(buffer: AudioBuffer, method: string, shouldCancel?: () => boolean, onProgress?: (progress: number) => void): Promise<BpmResult | null>;
export function beatEnergyAt(result: BpmResult | null, time: number): number;
export function energyByMethod(method: string, live: number, beat: number, hasAnalysis: boolean, lowEnvelope?: number, hasLowEnvelope?: boolean): number;
export function firstBeatOffset(result: BpmResult | null): number | null;
