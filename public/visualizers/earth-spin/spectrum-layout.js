export const BAR_BANDS = Object.freeze(Array.from({ length: 24 }, (_, index) => index < 12 ? index : 23 - index));
export const HALO_BAR_COUNT = 96;
export const HALO_BAND_COUNT = HALO_BAR_COUNT / 2;

export function haloBandAt(index) {
  const position = ((index % HALO_BAR_COUNT) + HALO_BAR_COUNT) % HALO_BAR_COUNT;
  return Math.min(position, HALO_BAR_COUNT - 1 - position);
}

export function latitudeForLevel(level) {
  return Math.min(30, 5 + Math.max(0, Math.min(1, level)) * 25);
}
