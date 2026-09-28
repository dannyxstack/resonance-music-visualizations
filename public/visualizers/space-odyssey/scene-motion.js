export const BAR_TRAVEL_SECONDS = 12;

const fraction = value => value - Math.floor(value);
const noise = value => fraction(Math.sin(value * 127.1 + 31.7) * 43758.5453);

// A constant change in travel time carries each column from the near edge
// to the horizon. The modulo places it back below the viewer for another lap.
export function travelingDepth(index, count, time) {
  return 1 - fraction(index / count + time / BAR_TRAVEL_SECONDS);
}

export function roadPoint(depth, width, height, panelOpen) {
  const available = width > 900 && panelOpen ? Math.max(560, width - 370) : width;
  const center = available * .5;
  const horizon = height * (width < 640 ? .42 : .49);
  const bottom = height * 1.04;
  const progress = depth ** 1.65;
  const farHalf = available * .085;
  const nearHalf = available * .46;
  const half = farHalf + (nearHalf - farHalf) * progress;
  const y = horizon + (bottom - horizon) * progress;
  return { y, left: center - half, right: center + half, center, half };
}

// Each cycle gets a new border entry point. Initial offsets scatter the stars
// through the field, while audio time alone controls their motion and pause.
export function movingStar(index, time, width, height) {
  const duration = 13 + noise(index + 19) * 12;
  const progress = time / duration + noise(index + 67);
  const cycle = Math.floor(progress);
  const age = fraction(progress);
  const side = Math.floor(noise(index * 7 + cycle * 29 + 4) * 4);
  const along = noise(index * 11 + cycle * 31 + 8);
  const edgeX = side === 0 ? 0 : side === 1 ? width : along * width;
  const edgeY = side === 2 ? 0 : side === 3 ? height : along * height;
  const centerX = width * .5;
  const centerY = height * .45;
  const brightness = .35 + noise(index * 13 + cycle * 17 + 12) * .65;
  return {
    x: edgeX + (centerX - edgeX) * age,
    y: edgeY + (centerY - edgeY) * age,
    radius: (.55 + brightness * 1.8) * (1 - age * .55),
    alpha: brightness * Math.min(1, age * 18) * (1 - age) ** 1.5,
    brightness,
  };
}
