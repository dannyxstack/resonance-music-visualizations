const fraction = value => value - Math.floor(value);
const noise = value => fraction(Math.sin(value * 127.1 + 31.7) * 43758.5453);

// Position depends only on audio time, so pausing, seeking and frame export agree.
export function recedingStar(index, time, width, height) {
  const duration = 13 + noise(index + 19) * 12;
  const progress = Math.max(0, time) / duration + noise(index + 67);
  const cycle = Math.floor(progress);
  const age = fraction(progress);
  const side = Math.floor(noise(index * 7 + cycle * 29 + 4) * 4);
  const along = noise(index * 11 + cycle * 31 + 8);
  const edgeX = side === 0 ? 0 : side === 1 ? width : along * width;
  const edgeY = side === 2 ? 0 : side === 3 ? height : along * height;
  const brightness = .35 + noise(index * 13 + cycle * 17 + 12) * .65;
  return {
    x: edgeX + (width * .5 - edgeX) * age,
    y: edgeY + (height * .5 - edgeY) * age,
    radius: (.45 + brightness * 1.65) * (1 - age * .55),
    alpha: brightness * Math.min(1, age * 18) * (1 - age) ** 1.5,
  };
}
