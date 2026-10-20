import type { CompanyNodeConfig, MotionType } from '../types/company';
import type { TempoAnalysis } from '../types/tempo';

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export function beatCycleStepAt(time: number, tempo: TempoAnalysis | null, fallbackStep: number): number {
  if (!tempo || tempo.beatInterval <= 0) return fallbackStep;
  if (time < tempo.firstBeatTime) return 0;
  return Math.floor((time - tempo.firstBeatTime) / tempo.beatInterval) + 1;
}

export function shiftHexHue(color: string, degrees: number): string {
  const match = /^#([\da-f]{6})$/i.exec(color);
  if (!match || degrees % 360 === 0) return color;
  const rgb = [0, 2, 4].map(index => parseInt(match[1].slice(index, index + 2), 16) / 255);
  const [red, green, blue] = rgb;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const difference = max - min;
  const lightness = (max + min) / 2;
  const saturation = difference ? difference / (1 - Math.abs(2 * lightness - 1)) : 0;
  let hue = 0;
  if (difference) {
    if (max === red) hue = ((green - blue) / difference) % 6;
    else if (max === green) hue = (blue - red) / difference + 2;
    else hue = (red - green) / difference + 4;
    hue *= 60;
  }
  const shiftedHue = ((hue + degrees) % 360 + 360) % 360;
  return `hsl(${shiftedHue} ${saturation * 100}% ${lightness * 100}%)`;
}

export function rayTargets(source: CompanyNodeConfig, all: readonly CompanyNodeConfig[], beatIndex: number): CompanyNodeConfig[] {
  const nearby = all.filter(company => company.id !== source.id)
    .sort((a, b) => ((a.x - source.x) ** 2 + (a.y - source.y) ** 2)
      - ((b.x - source.x) ** 2 + (b.y - source.y) ** 2))
    .slice(0, 12);
  let seed = Array.from(source.id).reduce((hash, char) => Math.imul(hash, 31) + char.charCodeAt(0) | 0, 17)
    ^ Math.imul(Math.floor(beatIndex) + 1, 0x9e3779b9);
  const next = (): number => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  const count = Math.min(nearby.length, 2 + next() % 4);
  for (let index = 0; index < count; index += 1) {
    const swap = index + next() % (nearby.length - index);
    [nearby[index], nearby[swap]] = [nearby[swap], nearby[index]];
  }
  return nearby.slice(0, count);
}

export function motionBeatAt(time: number, tempo: TempoAnalysis | null, fallback: number, playing: boolean): { pulse: number; index: number } {
  if (!playing) return { pulse: 0, index: 0 };
  if (tempo && tempo.beatInterval > 0 && time >= tempo.firstBeatTime) {
    const elapsed = time - tempo.firstBeatTime;
    const index = Math.floor(elapsed / tempo.beatInterval);
    const sinceBeat = elapsed - index * tempo.beatInterval;
    const duration = Math.min(.42, tempo.beatInterval * .8);
    const phase = sinceBeat / duration;
    return { pulse: phase < 1 ? Math.sin(phase * Math.PI) : 0, index };
  }
  return { pulse: clamp(fallback), index: Math.floor(time * 2) };
}

export function rayPulseAt(time: number, tempo: TempoAnalysis | null, fallback: number, playing: boolean): number {
  if (!playing) return 0;
  if (tempo && tempo.beatInterval > 0) {
    if (time < tempo.firstBeatTime) return 0;
    const sinceBeat = (time - tempo.firstBeatTime) % tempo.beatInterval;
    return Math.max(0, 1 - sinceBeat / Math.min(.28, tempo.beatInterval * .62));
  }
  return clamp(fallback);
}

function beatPositionAt(time: number, tempo: TempoAnalysis | null, playing: boolean): number | null {
  if (!playing) return null;
  if (tempo && tempo.beatInterval > 0) {
    if (time < tempo.firstBeatTime) return null;
    return (time - tempo.firstBeatTime) / tempo.beatInterval;
  }
  return time * 2;
}

export function logoFlipAt(time: number, tempo: TempoAnalysis | null, playing: boolean): { scale: number; emoji: boolean } {
  const beat = beatPositionAt(time, tempo, playing);
  if (beat === null) return { scale: 1, emoji: false };
  const index = Math.floor(beat);
  const phase = beat - index;
  const progress = clamp(phase / .62);
  const eased = progress * progress * (3 - 2 * progress);
  const facing = Math.cos(Math.PI * (index + eased));
  return { scale: Math.max(.035, Math.abs(facing)), emoji: facing < 0 };
}

export function thumbsUpArmsAt(pulse: number, beatIndex: number, radius: number, reducedMotion: boolean): { leftY: number; rightY: number } {
  const swing = (beatIndex % 2 === 0 ? 1 : -1) * clamp(pulse) * radius * (reducedMotion ? .55 : .9);
  return { leftY: -radius * .18 - swing, rightY: -radius * .18 + swing };
}

export function walkingLegsAt(time: number, tempo: TempoAnalysis | null, playing: boolean, unit: number, reducedMotion: boolean): {
  leftX: number; rightX: number; leftLift: number; rightLift: number; direction: number;
} {
  const beat = beatPositionAt(time, tempo, playing);
  if (beat === null) return { leftX: 0, rightX: 0, leftLift: 0, rightLift: 0, direction: 0 };
  const slot = Math.floor(beat) % 4;
  const direction = slot === 0 ? -1 : slot === 2 ? 1 : 0;
  if (!direction) return { leftX: 0, rightX: 0, leftLift: 0, rightLift: 0, direction: 0 };
  const phase = (beat % 1) * 2;
  const activeLeg = Math.floor(phase);
  const stride = Math.sin((phase % 1) * Math.PI) * (reducedMotion ? .35 : 1);
  const offset = direction * unit * 1.55 * stride;
  const counterOffset = -direction * unit * .48 * stride;
  const lift = unit * .52 * stride;
  return {
    leftX: activeLeg === 0 ? offset : counterOffset,
    rightX: activeLeg === 1 ? offset : counterOffset,
    leftLift: activeLeg === 0 ? lift : 0,
    rightLift: activeLeg === 1 ? lift : 0,
    direction,
  };
}

export function logoActionAt(
  motion: MotionType,
  time: number,
  pulse: number,
  beatIndex: number,
  unit: number,
  reducedMotion: boolean,
  hash: number,
): { offsetX: number; offsetY: number; rotation: number } {
  const amount = reducedMotion ? .35 : 1;
  const beat = clamp(pulse) * amount;
  if (motion === 'spin' || motion === 'spin2x') return {
    offsetX: 0, offsetY: 0,
    rotation: time * (hash % 2 ? 2.6 : -2.6) * amount * (motion === 'spin2x' ? 2 : 1),
  };
  if (motion === 'shake') {
    const amplitude = unit * .55 * beat;
    return {
      offsetX: Math.sin(time * 72 + hash * .31) * amplitude,
      offsetY: Math.cos(time * 91 + hash * .47) * amplitude * .75,
      rotation: 0,
    };
  }
  if (motion === 'beatJump') return { offsetX: 0, offsetY: -beat * unit * 1.3, rotation: 0 };
  if (motion === 'beatSideStep') return {
    offsetX: (beatIndex % 2 ? 1 : -1) * beat * unit * 1.2,
    offsetY: -beat * unit * .16,
    rotation: 0,
  };
  if (motion === 'beatTilt') return { offsetX: 0, offsetY: 0, rotation: (beatIndex % 2 ? 1 : -1) * beat * .95 };
  return { offsetX: 0, offsetY: 0, rotation: 0 };
}
