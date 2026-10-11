import { dancerPose } from './dancer-motion.js';

const sprite = new Image();
sprite.src = new URL('./dancer-frames.svg', import.meta.url).href;
const FRAME_WIDTH = 96;
const FRAME_HEIGHT = 192;
const FRAME_COUNT = 8;

function segment(ctx, from, to, width, accent) {
  ctx.beginPath();
  ctx.moveTo(...from);
  ctx.lineTo(...to);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = accent;
  ctx.lineWidth = width + .022;
  ctx.stroke();
  ctx.strokeStyle = '#050a18';
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawSkeleton(ctx, pose, glow) {
  ctx.save();
  ctx.shadowColor = '#74e8ff';
  ctx.shadowBlur = 11 * glow;
  const hip = [pose.sway * .3, -.43];
  const shoulder = [pose.sway, -.71];
  const leftFoot = [-.15 - pose.sway * .2, -pose.leftLift];
  const rightFoot = [.15 - pose.sway * .2, -pose.rightLift];
  segment(ctx, hip, [-.1 + pose.sway * .1, -.22], .075, '#88dfff');
  segment(ctx, [-.1 + pose.sway * .1, -.22], leftFoot, .065, '#88dfff');
  segment(ctx, hip, [.11 + pose.sway * .1, -.23], .075, '#f49ae9');
  segment(ctx, [.11 + pose.sway * .1, -.23], rightFoot, .065, '#f49ae9');
  segment(ctx, [-.14, -.65], [-.24 - pose.leftArm * .45, -.52 - pose.leftArm], .055, '#88dfff');
  segment(ctx, [-.24 - pose.leftArm * .45, -.52 - pose.leftArm], [-.28 - pose.leftArm, -.4 - pose.leftArm * 1.7], .048, '#88dfff');
  segment(ctx, [.14, -.65], [.24 + pose.rightArm * .45, -.52 - pose.rightArm], .055, '#f49ae9');
  segment(ctx, [.24 + pose.rightArm * .45, -.52 - pose.rightArm], [.28 + pose.rightArm, -.4 - pose.rightArm * 1.7], .048, '#f49ae9');
  ctx.beginPath();
  ctx.moveTo(shoulder[0] - .115, shoulder[1]);
  ctx.quadraticCurveTo(shoulder[0], -.76, shoulder[0] + .115, shoulder[1]);
  ctx.lineTo(hip[0] + .085, hip[1]);
  ctx.quadraticCurveTo(hip[0], -.38, hip[0] - .085, hip[1]);
  ctx.closePath();
  ctx.fillStyle = '#050a18';
  ctx.strokeStyle = '#b4dcff';
  ctx.lineWidth = .018;
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(shoulder[0], -.865, .087, .108, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#050a18';
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawSprite(ctx, pose, motion) {
  if (!sprite.complete || !sprite.naturalWidth) return false;
  const strength = Math.max(0, Math.min(1, motion));
  const drawFrame = (frame, alpha) => {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, frame * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT, -.25, -1, .5, 1);
  };
  drawFrame(0, 1 - strength);
  drawFrame(pose.frame, strength * (1 - pose.blend));
  drawFrame((pose.frame + 1) % FRAME_COUNT, strength * pose.blend);
  ctx.globalAlpha = 1;
  return true;
}

export function drawDancer(ctx, { mode, x, y, height, time, bpm, firstBeatTime, energy, motion, glow }) {
  if (mode === 'off') return;
  const pose = dancerPose(time, bpm, firstBeatTime, energy, motion);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = `rgba(65,205,255,${.12 + pose.pulse * .16})`;
  ctx.shadowColor = '#70dfff';
  ctx.shadowBlur = 17 * glow;
  ctx.beginPath(); ctx.ellipse(0, 3, height * .17, Math.max(2, height * .025), 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.translate(pose.sway * height, -pose.bounce * height);
  ctx.scale(height, height);
  if (mode === 'sprite') {
    ctx.shadowColor = '#86d8ff';
    ctx.shadowBlur = 10 * glow;
    if (!drawSprite(ctx, pose, motion)) drawSkeleton(ctx, pose, glow);
  } else drawSkeleton(ctx, pose, glow);
  ctx.restore();
}
