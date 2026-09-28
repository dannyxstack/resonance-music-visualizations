import type { CompanyNodeConfig } from "../types/company";

export const audioDNA: Record<
  string,
  Pick<CompanyNodeConfig, "frequencyBand" | "motion" | "response" | "intensity" | "moneyFlow">
> = {
  apple: { frequencyBand: "bass", motion: "breath", response: 0.08, intensity: 0.62, moneyFlow: "absorb" },
  google: { frequencyBand: "mid", motion: "pulse", response: 0.14, intensity: 0.58, moneyFlow: "emit" },
  meta: { frequencyBand: "air", motion: "orbit", response: 0.18, intensity: 0.56, moneyFlow: "neutral" },
  nvidia: { frequencyBand: "high", motion: "glow", response: 0.22, intensity: 0.72, moneyFlow: "emit" },
  intel: { frequencyBand: "bass", motion: "pulse", response: 0.19, intensity: 0.54, moneyFlow: "neutral" },
  openai: { frequencyBand: "mid", motion: "ripple", response: 0.12, intensity: 0.7, moneyFlow: "absorb" },
  salesforce: { frequencyBand: "lowMid", motion: "breath", response: 0.1, intensity: 0.6, moneyFlow: "emit" },
  uber: { frequencyBand: "sub", motion: "glow", response: 0.16, intensity: 0.52, moneyFlow: "neutral" },
  anthropic: { frequencyBand: "high", motion: "ripple", response: 0.09, intensity: 0.66, moneyFlow: "absorb" },
};
