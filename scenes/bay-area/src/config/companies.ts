import type { CompanyNodeConfig, MoneyFlow, MotionType } from "../types/company";
import type { FrequencyBand } from "../types/audio";

const brandPath = (name: string) => new URL(`../assets/brands/${name}.svg`, import.meta.url).href;

interface CompanySpec {
  id: string;
  name: string;
  x: number;
  y: number;
  band: FrequencyBand;
  motion: MotionType;
  response: number;
  intensity: number;
  moneyFlow: MoneyFlow;
  color: string;
  burst?: number;
  scale?: number;
}

const specs: CompanySpec[] = [
  { id: "openai", name: "OpenAI", x: 0.28, y: 0.23, band: "mid", motion: "ripple", response: 0.12, intensity: 0.74, moneyFlow: "absorb", color: "#f1efe7", scale: 0.92 },
  { id: "anthropic", name: "Anthropic", x: 0.22, y: 0.27, band: "high", motion: "ripple", response: 0.09, intensity: 0.66, moneyFlow: "absorb", color: "#d6c7b7", scale: 0.9 },
  { id: "salesforce", name: "Salesforce", x: 0.34, y: 0.25, band: "lowMid", motion: "beatLogoGrow", response: 0.1, intensity: 0.6, moneyFlow: "emit", color: "#35a8e0", burst: 3, scale: 1.06 },
  { id: "uber", name: "Uber", x: 0.31, y: 0.31, band: "sub", motion: "glow", response: 0.16, intensity: 0.52, moneyFlow: "neutral", color: "#ffffff", scale: 0.88 },
  { id: "airbnb", name: "Airbnb", x: 0.24, y: 0.35, band: "air", motion: "orbit", response: 0.16, intensity: 0.55, moneyFlow: "neutral", color: "#ff5a5f" },
  { id: "lyft", name: "Lyft", x: 0.28, y: 0.39, band: "bass", motion: "shake", response: 0.2, intensity: 0.5, moneyFlow: "neutral", color: "#ff00bf", scale: 0.82 },
  { id: "block", name: "Block", x: 0.37, y: 0.34, band: "sub", motion: "beatGrow", response: 0.18, intensity: 0.58, moneyFlow: "emit", color: "#f2f5f7", burst: 4, scale: 0.82 },
  { id: "stripe", name: "Stripe", x: 0.19, y: 0.43, band: "high", motion: "beatShape", response: 0.18, intensity: 0.56, moneyFlow: "absorb", color: "#8b5cf6" },
  { id: "doordash", name: "DoorDash", x: 0.43, y: 0.42, band: "bass", motion: "beatTilt", response: 0.2, intensity: 0.52, moneyFlow: "neutral", color: "#ff3008" },
  { id: "reddit", name: "Reddit", x: 0.18, y: 0.31, band: "mid", motion: "beatJump", response: 0.14, intensity: 0.5, moneyFlow: "neutral", color: "#ff4500" },
  { id: "pinterest", name: "Pinterest", x: 0.26, y: 0.48, band: "lowMid", motion: "beatSideStep", response: 0.12, intensity: 0.48, moneyFlow: "neutral", color: "#e60023" },
  { id: "dropbox", name: "Dropbox", x: 0.35, y: 0.47, band: "air", motion: "spin", response: 0.17, intensity: 0.52, moneyFlow: "neutral", color: "#0061ff" },
  { id: "slack", name: "Slack", x: 0.46, y: 0.31, band: "high", motion: "beatTilt", response: 0.2, intensity: 0.56, moneyFlow: "neutral", color: "#36c5f0" },
  { id: "figma", name: "Figma", x: 0.50, y: 0.37, band: "mid", motion: "beatJump", response: 0.15, intensity: 0.54, moneyFlow: "neutral", color: "#a259ff", scale: 0.9 },
  { id: "meta", name: "Meta", x: 0.42, y: 0.54, band: "air", motion: "orbit", response: 0.18, intensity: 0.56, moneyFlow: "neutral", color: "#5c8dff" },
  { id: "roblox", name: "Roblox", x: 0.34, y: 0.58, band: "bass", motion: "beatJump", response: 0.18, intensity: 0.48, moneyFlow: "neutral", color: "#f2f4f8", scale: 0.82 },
  { id: "oracle", name: "Oracle", x: 0.48, y: 0.56, band: "lowMid", motion: "beatGrow", response: 0.1, intensity: 0.5, moneyFlow: "absorb", color: "#c74634", scale: 1.04 },
  { id: "google", name: "Google", x: 0.49, y: 0.66, band: "mid", motion: "pulse", response: 0.14, intensity: 0.58, moneyFlow: "emit", color: "#6ba5ff", burst: 5 },
  { id: "intuit", name: "Intuit", x: 0.41, y: 0.68, band: "high", motion: "beatSideStep", response: 0.16, intensity: 0.5, moneyFlow: "neutral", color: "#236cff" },
  { id: "linkedin", name: "LinkedIn", x: 0.56, y: 0.58, band: "mid", motion: "beatJump", response: 0.13, intensity: 0.52, moneyFlow: "neutral", color: "#0a66c2" },
  { id: "nvidia", name: "NVIDIA", x: 0.59, y: 0.66, band: "high", motion: "glow", response: 0.22, intensity: 0.72, moneyFlow: "emit", color: "#76b900", burst: 6 },
  { id: "intel", name: "Intel", x: 0.66, y: 0.62, band: "bass", motion: "pulse", response: 0.19, intensity: 0.54, moneyFlow: "neutral", color: "#5aa5ff" },
  { id: "amd", name: "AMD", x: 0.71, y: 0.66, band: "sub", motion: "shake", response: 0.19, intensity: 0.5, moneyFlow: "neutral", color: "#ed1c24" },
  { id: "apple", name: "Apple", x: 0.56, y: 0.75, band: "bass", motion: "beatLogoGrow", response: 0.08, intensity: 0.62, moneyFlow: "absorb", color: "#d8dce4" },
  { id: "adobe", name: "Adobe", x: 0.64, y: 0.74, band: "high", motion: "beatShape", response: 0.18, intensity: 0.54, moneyFlow: "emit", color: "#ff0000", burst: 3 },
  { id: "cisco", name: "Cisco", x: 0.74, y: 0.74, band: "air", motion: "beatTilt", response: 0.16, intensity: 0.48, moneyFlow: "neutral", color: "#00bceb" },
  { id: "netflix", name: "Netflix", x: 0.82, y: 0.68, band: "lowMid", motion: "beatJump", response: 0.12, intensity: 0.52, moneyFlow: "emit", color: "#e50914", burst: 4, scale: 0.84 },
  { id: "paypal", name: "PayPal", x: 0.79, y: 0.55, band: "mid", motion: "beatSideStep", response: 0.1, intensity: 0.48, moneyFlow: "absorb", color: "#0070ba" },
  { id: "ebay", name: "eBay", x: 0.72, y: 0.52, band: "air", motion: "spin", response: 0.15, intensity: 0.46, moneyFlow: "neutral", color: "#86b817" },
  { id: "servicenow", name: "ServiceNow", x: 0.84, y: 0.79, band: "bass", motion: "beatShape", response: 0.13, intensity: 0.5, moneyFlow: "neutral", color: "#86ed78" },
  { id: "snowflake", name: "Snowflake", x: 0.62, y: 0.45, band: "air", motion: "beatLogoGrow", response: 0.18, intensity: 0.58, moneyFlow: "neutral", color: "#29b5e8" },
  { id: "databricks", name: "Databricks", x: 0.69, y: 0.39, band: "lowMid", motion: "shake", response: 0.17, intensity: 0.5, moneyFlow: "emit", color: "#ff3621", burst: 5 },
  { id: "github", name: "GitHub", x: 0.58, y: 0.27, band: "sub", motion: "beatGrow", response: 0.16, intensity: 0.46, moneyFlow: "neutral", color: "#f4f6f8" },
];

export const companies: CompanyNodeConfig[] = specs.map((spec) => ({
  id: spec.id,
  name: spec.name,
  x: spec.x,
  y: spec.y,
  frequencyBand: spec.band,
  motion: spec.motion,
  response: spec.response,
  intensity: spec.intensity,
  moneyFlow: spec.moneyFlow,
  moneyBurst: spec.burst,
  logoScale: spec.scale,
  logo: brandPath(spec.id),
  color: spec.color,
  fallbackLabel: spec.name.slice(0, 1),
}));
