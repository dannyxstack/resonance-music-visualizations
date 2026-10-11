function randomFor(slot, salt) {
  const value = Math.sin((slot + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function meteorAt(slot, time, interval, width, bounds) {
  if (slot < 0 || interval <= 0) return null;

  const start = (slot + 0.32 + randomFor(slot, 1) * 0.36) * interval;
  const duration = 0.65 + randomFor(slot, 2) * 0.45;
  const progress = (time - start) / duration;
  if (progress < 0 || progress > 1) return null;

  const skyHeight = Math.max(1, bounds.bottom - bounds.top);
  const direction = randomFor(slot, 3) < 0.5 ? -1 : 1;
  const startX = width * (0.22 + randomFor(slot, 4) * 0.56);
  const startY = bounds.top + skyHeight * (0.08 + randomFor(slot, 5) * 0.34);
  const travelX = direction * width * (0.11 + randomFor(slot, 6) * 0.12);
  const travelY = skyHeight * (0.19 + randomFor(slot, 7) * 0.21);
  const trail = Math.min(progress * 2.2, 1) * (0.26 + randomFor(slot, 8) * 0.18);

  return {
    x: startX + travelX * progress,
    y: startY + travelY * progress,
    tailX: startX + travelX * Math.max(0, progress - trail),
    tailY: startY + travelY * Math.max(0, progress - trail),
    alpha: Math.min(1, progress / 0.12, (1 - progress) / 0.38),
    width: 1.4 + randomFor(slot, 9) * 1.2,
  };
}

export function activeMeteors(time, interval, width, bounds) {
  const slot = Math.floor(time / interval);
  return [slot - 1, slot]
    .map(index => meteorAt(index, time, interval, width, bounds))
    .filter(Boolean);
}
