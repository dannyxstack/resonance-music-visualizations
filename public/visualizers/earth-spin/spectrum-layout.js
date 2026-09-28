export const BAR_BANDS = Object.freeze(Array.from({ length: 24 }, (_, index) => index < 12 ? index : 23 - index));

export function latitudeForLevel(level) {
  return Math.min(30, 5 + Math.max(0, Math.min(1, level)) * 25);
}
