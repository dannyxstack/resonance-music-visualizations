import bayAreaBackground from '../assets/map/bay-area-background.png';
import { companies } from '../config/companies';
import { connections } from '../config/connections';
import type { AudioFeatures } from '../types/audio';
import type { TempoAnalysis } from '../types/tempo';
import type { MotionType } from '../types/company';
import { ParticleEngine } from '../particles/ParticleEngine';
import { beatCycleStepAt, logoActionAt, motionBeatAt, rayPulseAt, rayTargets, shiftHexHue } from './logoMotion';
import { energyByMethod } from '../../../../public/visualizers/shared/analysis.js';

const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const rayColors: Partial<Record<MotionType, string>> = {
  whiteRays: '#ffffff',
  yellowRays: '#ffe45a',
  purpleRays: '#c78cff',
};

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
  private fallbackHueBeats = 0;
  private previousBeatSignal = false;
  private previousTime = 0;

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
    lowDrive: Float32Array | null,
    playing: boolean,
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

    const actionBeat = motionBeatAt(time, tempo, Math.max(lowLevel, features.onset, features.beat ? 1 : 0), playing);
    const rhythmPulse = rayPulseAt(time, tempo, Math.max(lowLevel, features.onset, features.beat ? 1 : 0), playing);
    if (time < this.previousTime - .05) {
      this.fallbackHueBeats = 0;
      this.previousBeatSignal = false;
    }
    this.previousTime = time;
    const beatSignal = playing && features.beat;
    if (!tempo && beatSignal && !this.previousBeatSignal) this.fallbackHueBeats += 1;
    this.previousBeatSignal = beatSignal;
    const hueStep = beatCycleStepAt(time, tempo, this.fallbackHueBeats) % 6;
    if (rhythmPulse > .03) {
      const strength = rhythmPulse * (reducedMotion ? .35 : 1);
      ctx.save();
      ctx.lineCap = 'round';
      for (const source of companies) {
        const color = rayColors[source.motion];
        if (!color) continue;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        for (const target of rayTargets(source, companies, actionBeat.index)) {
          const x1 = source.x * width, y1 = source.y * height;
          const x2 = target.x * width, y2 = target.y * height;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.globalAlpha = strength * .16;
          ctx.lineWidth = 4;
          ctx.shadowBlur = 4;
          ctx.stroke();
          ctx.globalAlpha = Math.min(1, strength * 1.4);
          ctx.lineWidth = 2.4;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    const unit = Math.max(18, Math.min(width * .033, height * .059));
    for (const company of companies) {
      const live = clamp(features[company.frequencyBand] * company.intensity + features.onset * .12);
      const beatPosition = tempo && tempo.beatInterval > 0 ? (time - tempo.firstBeatTime) / tempo.beatInterval : null;
      const beatIndex = beatPosition === null ? 0 : Math.round(beatPosition);
      const beatDistance = beatPosition === null ? Infinity : Math.abs(time - (tempo!.firstBeatTime + beatIndex * tempo!.beatInterval));
      const beatWindow = tempo ? Math.min(.18, tempo.beatInterval * .36) : .18;
      const beat = beatPosition !== null && time >= tempo!.firstBeatTime ? Math.max(0, 1 - beatDistance / beatWindow) : 0;
      const bandIndex = ['sub', 'bass', 'lowMid', 'mid', 'high', 'air'].indexOf(company.frequencyBand);
      const target = energyByMethod(energyMethod, live, beat, Boolean(tempo), lowLevel, lowReady,
        { drive: lowDrive, time, index: bandIndex, count: 6, playing });
      const previous = this.energy.get(company.id) || 0;
      const value = ['low-envelope', 'low-columns', 'low-wave'].includes(energyMethod) && lowReady
        ? target : previous + (target - previous) * company.response;
      this.energy.set(company.id, value);
      const pulse = ['low-envelope', 'low-columns', 'low-wave'].includes(energyMethod) && lowReady
        ? lowLevel : tempo ? beat : clamp(features.onset);
      const motion = reducedMotion ? 0 : 1;
      const hash = Array.from(company.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const action = logoActionAt(company.motion, time,
        company.motion === 'shake' ? rhythmPulse : actionBeat.pulse,
        actionBeat.index, unit, reducedMotion, hash);
      const anchorX = company.x * width, anchorY = company.y * height;
      const x = anchorX + action.offsetX, y = anchorY + action.offsetY;
      if ((company.motion === 'beatJump' || company.motion === 'beatSideStep') && actionBeat.pulse > .08) {
        ctx.save();
        ctx.globalAlpha = actionBeat.pulse * .48;
        ctx.strokeStyle = company.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(anchorX, anchorY); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(anchorX, anchorY, unit * .38, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      const breath = company.motion === 'breath' ? Math.sin(time * 1.6 + hash) * .075 * motion : 0;
      const baseRadius = unit * .5 * (1 + value * .08 * intensity + breath);
      const radius = baseRadius * (1
        + (company.motion === 'pulse' ? pulse * .24 : 0)
        + (company.motion === 'beatGrow' ? pulse * .42 : 0));
      const glowLevel = company.motion === 'glow'
        ? clamp((.12 + value * .12 + rhythmPulse * (reducedMotion ? .27 : .76)) * intensity)
        : 0;
      const haloColor = company.motion === 'haloHueShift'
        ? shiftHexHue(company.color, hueStep * 60)
        : company.color;
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = haloColor;
      ctx.shadowBlur = company.motion === 'glow' ? 4 + glowLevel * 55 : 8 + value * 24 * intensity;
      ctx.globalAlpha = company.motion === 'glow' ? .08 + glowLevel * .88 : .3 + value * .3;
      ctx.fillStyle = haloColor;
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (company.motion === 'glow') {
        ctx.strokeStyle = company.color;
        ctx.globalAlpha = .1 + glowLevel * .85;
        ctx.lineWidth = 1 + glowLevel * 4;
        ctx.beginPath(); ctx.arc(0, 0, radius * (1.4 + glowLevel * .35), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (company.motion === 'orbit') {
        const phase = time * (hash % 2 ? 1.8 : -1.8) * (reducedMotion ? .35 : 1) + hash;
        const orbitRadius = radius * 2;
        ctx.font = `900 ${Math.max(12, radius * 1.1)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd75e';
        ctx.strokeStyle = '#fff0a3';
        ctx.lineWidth = .45;
        ctx.shadowColor = '#ffc533';
        ctx.shadowBlur = 7;
        for (let symbol = 0; symbol < 4; symbol += 1) {
          const angle = phase + symbol * Math.PI / 2;
          ctx.save();
          ctx.translate(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius);
          // The glyph's bottom points inward at every position around the logo.
          ctx.rotate(angle + Math.PI / 2);
          ctx.fillText('$', 0, 0);
          ctx.strokeText('$', 0, 0);
          ctx.restore();
        }
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = '#0d1624';
      ctx.beginPath();
      if (company.motion === 'beatShape' && beatPosition !== null) {
        const sides = [4, 6, 8, 0][Math.max(0, Math.floor(beatPosition)) % 4];
        if (sides) {
          for (let side = 0; side < sides; side++) {
            const angle = side / sides * Math.PI * 2 - Math.PI / 2;
            if (side) ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            else ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          }
          ctx.closePath();
        } else {
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
        }
      } else ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = haloColor;
      ctx.lineWidth = 1.2 + value * 1.6;
      ctx.stroke();
      if (company.motion === 'ripple') {
        for (let ring = 0; ring < 2; ring++) {
          const phase = (time * 1.7 + ring * .5) % 1;
          ctx.globalAlpha = (.55 + value * .35) * (1 - phase);
          ctx.lineWidth = 1.5 + value * 1.5;
          ctx.beginPath(); ctx.arc(0, 0, radius * (1.1 + phase * 1.35), 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      const logo = this.logos.get(company.id);
      ctx.save();
      if (company.motion === 'spin' || company.motion === 'spin2x' || company.motion === 'beatTilt') {
        ctx.rotate(action.rotation);
        ctx.strokeStyle = company.color;
        ctx.lineWidth = 2.4;
        ctx.globalAlpha = .9;
        ctx.beginPath(); ctx.arc(0, 0, radius * 1.3, -2.4, -.3); ctx.stroke();
        ctx.fillStyle = '#f8fbff';
        ctx.beginPath(); ctx.arc(Math.cos(-.3) * radius * 1.3, Math.sin(-.3) * radius * 1.3, 2.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (logo?.complete && logo.naturalWidth) {
        const logoRadius = company.motion === 'beatGrow' ? baseRadius : radius;
        const contentSize = logoRadius * 1.43 * (company.logoScale || 1) * (company.motion === 'beatLogoGrow' ? 1 + pulse * .68 : 1);
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
      ctx.restore();
    }
    this.particles.render(ctx, width, height, companies, features, deltaMs, time * 1000, reducedMotion, false);
    ctx.restore();
  }
}
