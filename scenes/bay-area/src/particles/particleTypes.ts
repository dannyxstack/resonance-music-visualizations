export interface MoneyParticle {
  id: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  targetX?: number;
  targetY?: number;
  rotation: number;
  spin: number;
  scale: number;
  opacity: number;
  life: number;
  maxLife: number;
  maxDistance: number;
  mode: "emit" | "absorb" | "ambient";
  color: string;
}
