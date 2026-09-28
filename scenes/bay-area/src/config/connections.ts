import type { EntityConnection } from "../types/company";

export const connections: EntityConnection[] = [
  { from: "openai", to: "anthropic", strength: 0.8 },
  { from: "openai", to: "nvidia", strength: 0.85 },
  { from: "google", to: "nvidia", strength: 0.7 },
  { from: "google", to: "meta", strength: 0.56 },
  { from: "apple", to: "nvidia", strength: 0.5 },
  { from: "apple", to: "intel", strength: 0.48 },
  { from: "salesforce", to: "uber", strength: 0.42 },
  { from: "meta", to: "openai", strength: 0.38 },
];
