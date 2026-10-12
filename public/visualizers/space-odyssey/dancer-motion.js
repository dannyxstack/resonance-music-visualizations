import { dancerMotions } from './motions/index.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function capturedDancerPose(style, time, bpm, firstBeatTime, energy, motion = 1) {
  const clip = dancerMotions[style];
  if (!clip) return null;
  const tempo = Number.isFinite(bpm) && bpm > 0 ? clamp(bpm, 60, 200) : 110;
  const beat = Math.max(0, time - (Number.isFinite(firstBeatTime) ? firstBeatTime : 0)) * tempo / 60;
  const framePosition = (beat % 4) / 4 * clip.frames.length;
  const first = Math.floor(framePosition);
  const next = (first + 1) % clip.frames.length;
  const fraction = framePosition - first;
  const base = clip.frames[0];
  const seamStart = clip.frames.length - Math.min(9, Math.round(clip.frames.length * .18));
  const seamProgress = clamp((framePosition - seamStart) / (clip.frames.length - seamStart), 0, 1);
  const seamBlend = seamProgress * seamProgress * (3 - 2 * seamProgress);
  const amount = clamp(motion, 0, 1.5) * (.72 + .28 * clamp(energy, 0, 1));
  const joints = clip.joints.map((_, joint) => {
    const offset = joint * 2;
    const x = (clip.frames[first][offset] * (1 - fraction) + clip.frames[next][offset] * fraction) * (1 - seamBlend) + base[offset] * seamBlend;
    const y = (clip.frames[first][offset + 1] * (1 - fraction) + clip.frames[next][offset + 1] * fraction) * (1 - seamBlend) + base[offset + 1] * seamBlend;
    return [base[offset] + (x - base[offset]) * amount, base[offset + 1] + (y - base[offset + 1]) * amount];
  });
  return { joints, pulse: clamp(energy, 0, 1) };
}

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
