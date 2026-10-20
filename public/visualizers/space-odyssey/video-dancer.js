// Luminance-matted frames from the user-provided Pixabay 75551 clip.
// Fixed crop and time-indexed atlases keep preview, seeking and export identical.
export const VIDEO_DANCER_FRAMES = 380;
export const VIDEO_DANCER_FPS = 24;
export function videoDancerFrame(time) {
  const frame = Math.floor(Math.max(0, Number.isFinite(time) ? time : 0) * VIDEO_DANCER_FPS);
  return frame % VIDEO_DANCER_FRAMES;
}

const W = 240, H = 456, PER_SHEET = 64;
let sheets;
let ready;
export function loadVideoDancer() {
  if (ready) return ready;
  sheets = Array.from({ length: 6 }, (_, i) => {
    const img = new Image();
    img.src = new URL(`./video-dancer/atlas-${String(i + 1).padStart(2, '0')}.png`, import.meta.url).href;
    return img;
  });
  ready = Promise.all(sheets.map(img => img.decode())).catch(error => {
    ready = null;
    sheets = null;
    throw error;
  });
  return ready;
}

let layer;
export function drawVideoDancer(ctx, { x, y, height, time, energy, glow }) {
  const frame = videoDancerFrame(time);
  const atlas = sheets?.[Math.floor(frame / PER_SHEET)];
  if (!atlas?.complete || !atlas.naturalWidth) return;
  layer ||= document.createElement('canvas');
  if (layer.width !== W) { layer.width = W; layer.height = H; }
  const mask = layer.getContext('2d');
  mask.clearRect(0, 0, W, H);
  const local = frame % PER_SHEET;
  mask.drawImage(atlas, (local % 8) * W, Math.floor(local / 8) * H, W, H, 0, 0, W, H);
  mask.globalCompositeOperation = 'source-in';
  const color = mask.createLinearGradient(0, 0, W, H);
  color.addColorStop(0, '#d9ffff');
  color.addColorStop(.38, '#69f1ff');
  color.addColorStop(1, '#f278ef');
  mask.fillStyle = color;
  mask.fillRect(0, 0, W, H);
  mask.globalCompositeOperation = 'source-over';
  const strength = Math.max(0, Math.min(1, energy || 0));
  const width = height * W / H;
  ctx.save();
  ctx.globalAlpha = .82 + strength * .18;
  ctx.shadowColor = '#69e8ff';
  ctx.shadowBlur = height * .055 * glow * (.45 + strength);
  ctx.drawImage(layer, x - width / 2, y - height, width, height);
  ctx.restore();
}
