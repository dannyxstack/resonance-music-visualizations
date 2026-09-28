import type { AudioFeatures } from "../types/audio";
import type { CompanyNodeConfig } from "../types/company";
import { VISUAL_CONFIG } from "../config/visualization";
import type { MoneyParticle } from "./particleTypes";
import { createAbsorbParticle, createAmbientParticle, createEmitParticle } from "./MoneyParticle";

export class ParticleEngine {
  private readonly particles: MoneyParticle[] = [];
  private ambientClock = 0;
  private particleCount = 0;
  private lastBeat = false;
  private lastOnset = false;

  get count(): number {
    return this.particleCount;
  }

  render(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    companies: CompanyNodeConfig[],
    features: AudioFeatures,
    deltaMs: number,
    now: number,
    reducedMotion: boolean,
  ): void {
    context.clearRect(0, 0, width, height);
    const dt = Math.min(0.05, deltaMs / 1000);
    const maxParticles = reducedMotion
      ? Math.floor(VISUAL_CONFIG.maxParticles * VISUAL_CONFIG.reducedMotionParticleScale)
      : VISUAL_CONFIG.maxParticles;

    this.spawn(companies, features, now / 1000, maxParticles, reducedMotion);
    this.update(dt, features);
    this.draw(context, width, height, reducedMotion);
    this.particleCount = this.particles.length;
  }

  private spawn(
    companies: CompanyNodeConfig[],
    features: AudioFeatures,
    nowSeconds: number,
    maxParticles: number,
    reducedMotion: boolean,
  ): void {
    if (this.particles.length >= maxParticles) {
      return;
    }

    if (!reducedMotion && nowSeconds > this.ambientClock && this.particles.length < maxParticles * 0.45) {
      this.particles.push(createAmbientParticle());
      this.ambientClock = nowSeconds + 2.4 + Math.random() * 2.8;
    }

    const onsetHigh = features.onset > 0.16;
    const beatStarted = features.beat && !this.lastBeat;
    const onsetStarted = onsetHigh && !this.lastOnset;
    this.lastBeat = features.beat;
    this.lastOnset = onsetHigh;
    if (!beatStarted && !onsetStarted) {
      return;
    }

    for (const company of companies) {
      if (company.moneyFlow === "neutral" || this.particles.length >= maxParticles) {
        continue;
      }

      const bandEnergy = features[company.frequencyBand] * company.intensity;
      const burstBase = company.moneyBurst ?? (company.moneyFlow === "emit" ? 3 : 2);
      const burstCount = company.moneyFlow === "emit"
        ? Math.max(3, Math.min(6, burstBase + Math.floor(bandEnergy * 2 + Math.random() * 2)))
        : Math.max(2, Math.min(4, burstBase + Math.floor(bandEnergy * 2)));

      for (let index = 0; index < burstCount && this.particles.length < maxParticles; index += 1) {
        if (company.moneyFlow === "emit") {
          this.particles.push(createEmitParticle(company.x, company.y, company.color, bandEnergy));
        } else {
          this.particles.push(createAbsorbParticle(company.x, company.y, company.color));
        }
      }
    }
  }

  private update(dt: number, features: AudioFeatures): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life += dt;
      particle.rotation += particle.spin;

      if (particle.mode === "absorb" && particle.targetX !== undefined && particle.targetY !== undefined) {
        particle.scale *= 1 - dt * 0.07;
      } else if (particle.mode === "ambient") {
        particle.vx += Math.sin(particle.life * 2.2 + particle.id) * dt * 0.002;
        particle.vy += Math.cos(particle.life * 1.8 + particle.id) * dt * 0.0015;
      }

      particle.x += particle.vx * dt * 60;
      particle.y += particle.vy * dt * 60;

      const age = particle.life / particle.maxLife;
      const traveled = Math.hypot(particle.x - particle.originX, particle.y - particle.originY);
      const distanceFade = particle.mode === "ambient" ? 1 : 1 - Math.min(1, traveled / particle.maxDistance);
      const initialFlash = particle.mode === "ambient" ? 1 : 0.82 + Math.max(0, 1 - age * 4) * 0.28;
      particle.opacity = Math.max(0, (1 - age) * distanceFade * (particle.mode === "ambient" ? 0.3 : initialFlash));

      const closeToTarget =
        particle.mode === "absorb" &&
        particle.targetX !== undefined &&
        particle.targetY !== undefined &&
        Math.hypot(particle.targetX - particle.x, particle.targetY - particle.y) < 0.012;

      const tooFar = particle.mode === "emit" && traveled >= particle.maxDistance;

      if (particle.life >= particle.maxLife || particle.opacity < 0.035 || closeToTarget || tooFar) {
        this.particles.splice(index, 1);
      }
    }
  }

  private draw(context: CanvasRenderingContext2D, width: number, height: number, reducedMotion: boolean): void {
    context.save();
    context.font = `${Math.max(10, Math.min(17, width * 0.018))}px Inter, system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (const particle of this.particles) {
      const x = particle.x * width;
      const y = particle.y * height;
      const size = particle.scale * (reducedMotion ? 0.72 : 1);

      context.save();
      context.translate(x, y);
      context.rotate(particle.rotation);
      context.globalAlpha = Math.min(0.72, particle.opacity);
      context.fillStyle = particle.color;
      context.shadowColor = particle.color;
      context.shadowBlur = particle.mode === "ambient" ? 0 : 5;
      context.shadowOffsetY = particle.mode === "ambient" ? 0 : 1;
      context.font = `${Math.max(10, Math.min(18, width * 0.018 * size))}px Inter, system-ui, sans-serif`;
      if (particle.mode !== "ambient") {
        context.lineWidth = Math.max(1.1, width * 0.0012);
        context.strokeStyle = "rgba(2, 5, 10, 0.58)";
        context.strokeText("$", 0, 0);
        context.globalAlpha = Math.min(1, particle.opacity * 0.82);
        context.strokeStyle = "rgba(255, 255, 255, 0.24)";
        context.lineWidth = Math.max(0.5, width * 0.00055);
        context.strokeText("$", 0, 0);
        context.globalAlpha = Math.min(1, particle.opacity);
      }
      context.fillText("$", 0, 0);
      context.restore();

      if (size > 0.9 && particle.mode !== "ambient") {
        context.save();
        context.globalAlpha = particle.opacity * 0.08;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(x, y, 12 * size, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

    context.restore();
  }
}
