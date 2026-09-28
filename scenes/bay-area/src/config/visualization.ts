export const FFT_CONFIG = {
  fftSize: 2048,
  smoothingTimeConstant: 0.75,
} as const;

export const VISUAL_CONFIG = {
  globalIntensity: 0.82,
  maxParticles: 180,
  beatThreshold: 1.35,
  beatCooldownMs: 160,
  mapAudioResponse: 0.1,
  networkPacketSpeed: 0.18,
  reducedMotionParticleScale: 0.35,
} as const;
