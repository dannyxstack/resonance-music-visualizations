import { readFileSync, writeFileSync } from 'node:fs';

const points = JSON.parse(readFileSync(new URL('../public/visualizers/earth-spin/land-dots.json', import.meta.url), 'utf8'));
const rad = Math.PI / 180;
const rotation = -0.35;
const tilt = 12 * rad;
const cx = 480, cy = 270, radius = 190;
const project = (latitude, longitude) => {
  const lat = latitude * rad, lon = longitude * rad;
  const x = Math.cos(lat) * Math.sin(lon + rotation);
  const z = Math.cos(lat) * Math.cos(lon + rotation);
  return { x: cx + x * radius, y: cy - (Math.sin(lat) * Math.cos(tilt) - z * Math.sin(tilt)) * radius,
    depth: Math.sin(lat) * Math.sin(tilt) + z * Math.cos(tilt) };
};
let seed = 18273;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const stars = Array.from({ length: 75 }, () => `<circle cx="${(random() * 960).toFixed(1)}" cy="${(random() * 540).toFixed(1)}" r="${(0.4 + random() * 1.6).toFixed(1)}" fill="#c2e6ff" opacity="${(0.25 + random() * 0.6).toFixed(2)}"/>`).join('');
const dots = [];
for (let i = 0; i < points.length; i += 4) {
  const point = project(points[i + 1], points[i]);
  if (point.depth < 0) continue;
  dots.push(`<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="1.35" fill="#3a94d5" opacity="${(0.32 + point.depth * 0.5).toFixed(2)}"/>`);
}
const bars = [];
for (let index = 0; index < 24; index++) {
  const band = index < 12 ? index : 23 - index;
  const longitude = index * 15;
  const height = 4 + (0.22 + 0.56 * Math.abs(Math.sin(index * 2.11))) * 26;
  const vertices = [];
  for (let sample = 0; sample <= 12; sample++) {
    const point = project(-height + sample / 12 * height * 2, longitude);
    if (point.depth > 0) vertices.push(`${vertices.length ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`);
  }
  if (vertices.length > 1) bars.push(`<path d="${vertices.join(' ')}" fill="none" stroke="hsl(${188 + band / 11 * 115} 100% 72%)" stroke-width="6" stroke-linecap="round"/>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><radialGradient id="space"><stop stop-color="#152d4c"/><stop offset="1" stop-color="#040b19"/></radialGradient><radialGradient id="globe" cx="36%" cy="31%" r="75%"><stop stop-color="#f8feff"/><stop offset=".54" stop-color="#d5efff"/><stop offset="1" stop-color="#477ba6"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="12"/></filter><clipPath id="clip"><circle cx="480" cy="270" r="190"/></clipPath></defs><rect width="960" height="540" fill="url(#space)"/>${stars}<circle cx="480" cy="270" r="202" fill="#60baf6" opacity=".27" filter="url(#glow)"/><circle cx="480" cy="270" r="190" fill="url(#globe)" stroke="#d7f5ff" stroke-width="2"/><g clip-path="url(#clip)">${dots.join('')}<g opacity=".34"><ellipse cx="480" cy="270" rx="190" ry="37" fill="none" stroke="#8cecff" stroke-width="2"/></g><g filter="url(#glow)" opacity=".5">${bars.join('')}</g>${bars.join('')}</g><text x="38" y="53" fill="#e6f8ff" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="4">EARTH SPIN</text><text x="38" y="80" fill="#96bad0" font-family="Arial,sans-serif" font-size="12" letter-spacing="2">24 BANDS · ONE PLANET</text></svg>`;
writeFileSync(new URL('../public/art/earth-spin.svg', import.meta.url), svg);
