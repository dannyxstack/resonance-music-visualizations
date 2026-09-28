import type { MoneyParticle } from "./particleTypes";

let nextParticleId = 1;

export function createEmitParticle(x: number, y: number, color: string, energy: number): MoneyParticle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.021 + Math.random() * 0.018 + energy * 0.014;

  return {
    id: nextParticleId++,
    x,
    y,
    originX: x,
    originY: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: 0,
    spin: 0,
    scale: 0.75 + Math.random() * 0.72,
    opacity: 1,
    life: 0,
    maxLife: 1.1 + Math.random() * 0.9,
    maxDistance: 0.12 + Math.random() * 0.035,
    mode: "emit",
    color,
  };
}

export function createAbsorbParticle(targetX: number, targetY: number, color: string): MoneyParticle {
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.12 + Math.random() * 0.16;
  const startX = Math.min(0.96, Math.max(0.04, targetX + Math.cos(angle) * distance));
  const startY = Math.min(0.94, Math.max(0.06, targetY + Math.sin(angle) * distance));

  return {
    id: nextParticleId++,
    x: startX,
    y: startY,
    originX: targetX,
    originY: targetY,
    vx: (targetX - startX) * 0.022,
    vy: (targetY - startY) * 0.022,
    targetX,
    targetY,
    rotation: Math.random() * Math.PI * 2,
    spin: 0,
    scale: 0.9 + Math.random() * 0.55,
    opacity: 0.9,
    life: 0,
    maxLife: 1.4 + Math.random() * 1.0,
    maxDistance: 0.16,
    mode: "absorb",
    color,
  };
}

export function createAmbientParticle(): MoneyParticle {
  return {
    id: nextParticleId++,
    x: Math.random(),
    y: Math.random(),
    originX: 0.5,
    originY: 0.5,
    vx: -0.004 + Math.random() * 0.008,
    vy: -0.003 + Math.random() * 0.006,
    rotation: Math.random() * Math.PI * 2,
    spin: -0.015 + Math.random() * 0.03,
    scale: 0.45 + Math.random() * 0.5,
    opacity: 0.28,
    life: 0,
    maxLife: 6 + Math.random() * 5,
    maxDistance: 1,
    mode: "ambient",
    color: "#c9d0dc",
  };
}
