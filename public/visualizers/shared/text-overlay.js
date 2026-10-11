// Drawn into the scene canvas so the preview and exported frames contain the same text.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function drawTextOverlay(ctx, width, height, options = {}) {
  const rows = [
    { text: options.title?.trim(), size: clamp(height * .064, 22, 76), weight: 800 },
    { text: options.subtitle?.trim(), size: clamp(height * .033, 15, 38), weight: 600 },
    { text: options.author?.trim(), size: clamp(height * .025, 13, 28), weight: 500 },
  ].filter(row => row.text);
  if (!options.enabled || !rows.length) return;

  const position = options.position || 'bottom-left';
  const center = position.endsWith('center');
  const top = position.startsWith('top');
  const marginX = width * .06;
  const marginY = height * .075;
  const x = center ? width / 2 : marginX;
  const maxWidth = center ? width * .84 : width * .72;
  const gap = height * .013;
  const lineHeights = rows.map(row => row.size * 1.22);
  const blockHeight = lineHeights.reduce((sum, value) => sum + value, 0) + gap * (rows.length - 1);
  let y = top ? marginY : height - marginY - blockHeight;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = center ? 'center' : 'left';
  ctx.fillStyle = options.color || '#ffffff';
  ctx.shadowColor = '#02030bea';
  ctx.shadowBlur = Math.max(7, height * .016);
  ctx.shadowOffsetY = Math.max(2, height * .004);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    let size = row.size;
    ctx.font = `${row.weight} ${size}px Inter, "Segoe UI", "Microsoft YaHei", sans-serif`;
    while (size > 12 && ctx.measureText(row.text).width > maxWidth) {
      size -= 1;
      ctx.font = `${row.weight} ${size}px Inter, "Segoe UI", "Microsoft YaHei", sans-serif`;
    }
    ctx.fillText(row.text, x, y, maxWidth);
    y += lineHeights[index] + gap;
  }
  ctx.restore();
}
