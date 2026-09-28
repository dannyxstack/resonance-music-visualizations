import bayAreaBackground from '../assets/map/bay-area-background.png';
import { companies } from '../config/companies';
import { connections } from '../config/connections';
import type { AudioFeatures } from '../types/audio';
import type { TempoAnalysis } from '../types/tempo';
import { ParticleEngine } from '../particles/ParticleEngine';
import { energyByMethod } from '../../../../public/visualizers/shared/analysis.js';

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

function loadImage(src: string): HTMLImageElement {
  const image = new Image();
  image.src = src;
  return image;
}

export class CanvasMapScene {
  readonly particles = new ParticleEngine();
  private readonly map = loadImage(bayAreaBackground);
  private readonly logos = new Map(companies.map(company => [company.id, company.logo ? loadImage(company.logo) : null]));
  private readonly energy = new Map<string, number>();

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    features: AudioFeatures,
    tempo: TempoAnalysis | null,
    time: number,
    deltaMs: number,
    reducedMotion: boolean,
    energyMethod: string,
    lowLevel: number,
    lowReady: boolean,
    intensity: number,
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#06182a';
    ctx.fillRect(0, 0, width, height);
    if (this.map.complete && this.map.naturalWidth) {
      const scale = Math.max(width / this.map.naturalWidth, height / this.map.naturalHeight);
      const drawWidth = this.map.naturalWidth * scale;
      const drawHeight = this.map.naturalHeight * scale;
      ctx.globalAlpha = .84 + clamp(features.rms) * .13;
      ctx.drawImage(this.map, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(2, 9, 20, .23)';
    ctx.fillRect(0, 0, width, height);

    const byId = new Map(companies.map(company => [company.id, company]));
    const networkActivity = clamp(features.high * .8 + features.onset * .55);
    for (const connection of connections) {
      const from = byId.get(connection.from);
      const to = byId.get(connection.to);
      if (!from || !to) continue;
      const x1 = from.x * width, y1 = from.y * height;
      const x2 = to.x * width, y2 = to.y * height;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - height * .06 * connection.strength;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2);
      ctx.strokeStyle = `rgba(184, 211, 244, ${.12 + connection.strength * .14 + networkActivity * .2})`;
      ctx.lineWidth = .7 + connection.strength * 1.5;
      ctx.stroke();
      const phase = (time / (2.8 - connection.strength) + connection.strength) % 1;
      const px = (1 - phase) ** 2 * x1 + 2 * (1 - phase) * phase * mx + phase ** 2 * x2;
      const py = (1 - phase) ** 2 * y1 + 2 * (1 - phase) * phase * my + phase ** 2 * y2;
      ctx.globalAlpha = .15 + networkActivity * .55;
      ctx.fillStyle = '#e6f4ff'; ctx.beginPath(); ctx.arc(px, py, 1.5 + networkActivity * 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    const unit = Math.max(18, Math.min(width * .033, height * .059));
    for (const company of companies) {
      const live = clamp(features[company.frequencyBand] * company.intensity + features.onset * .12);
      const beat = tempo ? Math.max(0, 1 - Math.abs(time - (tempo.firstBeatTime + Math.round((time - tempo.firstBeatTime) / tempo.beatInterval) * tempo.beatInterval)) / .18) : 0;
      const target = energyByMethod(energyMethod, live, beat, Boolean(tempo), lowLevel, lowReady);
      const previous = this.energy.get(company.id) || 0;
      const value = energyMethod === 'low-envelope' && lowReady ? target : previous + (target - previous) * company.response;
      this.energy.set(company.id, value);
      const pulse = energyMethod === 'low-envelope' && lowReady ? lowLevel : beat;
      let x = company.x * width, y = company.y * height;
      if (!reducedMotion && company.motion === 'shake') { x += Math.sin(time * 25 + company.x * 30) * value * 4; y += Math.cos(time * 29 + company.y * 20) * value * 4; }
      if (!reducedMotion && company.motion === 'beatJump') y -= pulse * unit * .4;
      if (!reducedMotion && company.motion === 'beatSideStep') x += Math.sin(time * 5) * pulse * unit * .35;
      const scale = 1 + value * .12 * intensity
        + (company.motion === 'beatGrow' ? pulse * .3 : 0)
        + (company.motion === 'pulse' ? pulse * .1 : 0)
        + (company.motion === 'breath' ? Math.sin(time * 1.2 + company.x * 10) * .025 : 0);
      const radius = unit * .5 * scale;
      ctx.save();
      ctx.translate(x, y);
      if (!reducedMotion && (company.motion === 'spin' || company.motion === 'orbit')) ctx.rotate(time * (company.motion === 'spin' ? .3 : -.18));
      if (!reducedMotion && company.motion === 'beatTilt') ctx.rotate(Math.sin(time * 4) * pulse * .4);
      ctx.shadowColor = company.color;
      ctx.shadowBlur = 8 + value * 24 * intensity;
      ctx.globalAlpha = .3 + value * .3;
      ctx.fillStyle = company.color;
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0d1624';
      ctx.beginPath();
      if (company.motion === 'beatShape' && tempo && energyMethod !== 'low-envelope') {
        const sides = [4, 6, 8, 12][Math.abs(Math.floor((time - tempo.firstBeatTime) / tempo.beatInterval)) % 4];
        for (let side = 0; side < sides; side++) {
          const angle = side / sides * Math.PI * 2 - Math.PI / 2;
          if (side) ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          else ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
      } else ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = company.color;
      ctx.lineWidth = 1.2 + value * 1.6;
      ctx.stroke();
      if (company.motion === 'ripple') {
        ctx.globalAlpha = .2 + value * .35;
        ctx.beginPath(); ctx.arc(0, 0, radius * (1.25 + pulse * .65), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const logo = this.logos.get(company.id);
      if (logo?.complete && logo.naturalWidth) {
        const contentSize = radius * 1.43 * (company.logoScale || 1) * (company.motion === 'beatLogoGrow' ? 1 + pulse * .46 : 1);
        const imageScale = Math.min(contentSize / logo.naturalWidth, contentSize / logo.naturalHeight);
        const imageWidth = logo.naturalWidth * imageScale;
        const imageHeight = logo.naturalHeight * imageScale;
        ctx.drawImage(logo, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      } else {
        ctx.fillStyle = company.color;
        ctx.font = `700 ${radius}px Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(company.fallbackLabel, 0, 1);
      }
      ctx.restore();
    }
    this.particles.render(ctx, width, height, companies, features, deltaMs, time * 1000, reducedMotion, false);
    ctx.restore();
  }
}
