import { analyzeBpm } from '../neon-spectrum/bpm-analysis.js';
import { analyzeBeatGrid } from '../space-odyssey/beat-analysis.js';

export const BPM_METHODS = Object.freeze([
  { value: 'beat-grid', label: '多频段节拍追踪（推荐）' },
  { value: 'onset', label: '综合瞬态' },
  { value: 'bass', label: '低频鼓点' },
]);

export const ENERGY_METHODS = Object.freeze([
  { value: 'live', label: '实时频谱' },
  { value: 'beat', label: '预分析节拍能量' },
  { value: 'mix', label: '实时 50% + 节拍 50%' },
  { value: 'low-envelope', label: 'Vizzy 式低频包络（连续）' },
]);

export function fillMethodSelect(select, methods, preferred) {
  select.replaceChildren(...methods.map(method => new Option(method.label, method.value)));
  select.value = methods.some(method => method.value === preferred) ? preferred : methods[0].value;
}

export async function analyzeByMethod(buffer, method, shouldCancel = () => false, onProgress = () => {}) {
  if (method === 'beat-grid') return analyzeBeatGrid(buffer, shouldCancel, onProgress);
  if (method === 'onset' || method === 'bass') return analyzeBpm(buffer, method, shouldCancel, onProgress);
  throw new Error('Unknown BPM analysis method');
}

export function beatEnergyAt(result, time) {
  if (!result || !Number.isFinite(time) || time < 0) return 0;
  const beats = result.beats;
  if (!beats?.length) return 0;
  let low = 0; let high = beats.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (beats[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  if (!low) return 0;
  const beat = beats[low - 1];
  return Math.min(1, beat.strength * Math.exp(-(time - beat.time) / .14));
}

export function energyByMethod(method, live, beat, hasAnalysis, lowEnvelope = 0, hasLowEnvelope = false) {
  const normalizedLive = Math.max(0, Math.min(1, live));
  if (method === 'low-envelope') return hasLowEnvelope ? Math.max(0, Math.min(1, lowEnvelope)) : normalizedLive;
  if (!hasAnalysis) return normalizedLive;
  const normalizedBeat = Math.max(0, Math.min(1, beat));
  if (method === 'beat') return normalizedBeat;
  if (method === 'mix') return (normalizedLive + normalizedBeat) / 2;
  return normalizedLive;
}

export function firstBeatOffset(result) {
  return result?.beats?.[0]?.time ?? result?.firstBeatTime ?? null;
}
