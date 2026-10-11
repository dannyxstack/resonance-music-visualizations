const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// All poses derive from audio time, so seeking and frame-by-frame export are repeatable.
export function dancerPose(time, bpm, firstBeatTime, energy, motion = 1) {
  const tempo = Number.isFinite(bpm) && bpm > 0 ? clamp(bpm, 60, 200) : 110;
  const beat = Math.max(0, time - (Number.isFinite(firstBeatTime) ? firstBeatTime : 0)) * tempo / 60;
  const phase = beat % 4;
  const amount = clamp(motion, 0, 1.5);
  const pulse = clamp(energy, 0, 1);
  const step = Math.sin(phase * Math.PI);
  const sway = Math.sin(phase * Math.PI / 2) * .055 * amount;
  const bounce = (.018 + pulse * .075) * Math.max(0, Math.cos(phase * Math.PI * 2)) * amount;
  const framePosition = amount > 0 ? phase * 2 : 0;
  const frame = Math.floor(framePosition);
  return {
    phase, frame, blend: framePosition - frame, sway, bounce,
    leftLift: Math.max(0, step) * .11 * amount,
    rightLift: Math.max(0, -step) * .11 * amount,
    leftArm: Math.sin(phase * Math.PI / 2) * .16 * amount,
    rightArm: Math.cos(phase * Math.PI / 2) * .16 * amount,
    pulse,
  };
}
