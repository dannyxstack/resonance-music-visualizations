import type { FrequencyBand } from "./audio";

export type MotionType =
  | "breath"
  | "pulse"
  | "glow"
  | "shake"
  | "orbit"
  | "spin"
  | "ripple"
  | "beatJump"
  | "beatSideStep"
  | "beatTilt"
  | "beatGrow"
  | "beatLogoGrow"
  | "beatShape";
export type MoneyFlow = "emit" | "absorb" | "neutral";
export type BrandAnimationMode = "safe-wrapper" | "expressive-logo";

export interface CompanyNodeConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  frequencyBand: FrequencyBand;
  motion: MotionType;
  response: number;
  intensity: number;
  moneyFlow: MoneyFlow;
  moneyBurst?: number;
  logoScale?: number;
  logo?: string;
  color: string;
  fallbackLabel: string;
}

export interface EntityConnection {
  from: string;
  to: string;
  strength: number;
}
