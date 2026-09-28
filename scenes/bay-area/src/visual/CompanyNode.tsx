import { useEffect, useRef, type MutableRefObject } from "react";
import type { AudioFeatures } from "../types/audio";
import type { BrandAnimationMode, CompanyNodeConfig } from "../types/company";
import type { TempoAnalysis } from "../types/tempo";
import { useAnimationFrame } from "../hooks/useAnimationFrame";

interface CompanyNodeProps {
  config: CompanyNodeConfig;
  audioFeaturesRef: MutableRefObject<AudioFeatures>;
  animationMode: BrandAnimationMode;
  reducedMotion: boolean;
  audioElement: HTMLAudioElement;
  tempo: TempoAnalysis | null;
}

export function CompanyNode({
  config,
  audioFeaturesRef,
  animationMode,
  reducedMotion,
  audioElement,
  tempo,
}: CompanyNodeProps): React.ReactElement {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const glyphRef = useRef<HTMLDivElement | null>(null);
  const energyRef = useRef(0);
  const beatFlashRef = useRef(0);
  const lastBeatRef = useRef(false);
  const shakeProfileRef = useRef<{ phase: number; x: number; y: number; speedX: number; speedY: number } | null>(null);
  const rotateProfileRef = useRef<{ direction: 1 | -1; orbitSpeed: number; logoSpeed: number; phase: number } | null>(null);
  const beatProfileRef = useRef<{
    jumpHeight: number;
    sideDistance: number;
    rate: 0.5 | 1 | 2;
  } | null>(null);

  if (!shakeProfileRef.current) {
    const hash = Array.from(config.id).reduce((total, char) => total + char.charCodeAt(0), 0);
    const angle = (hash * 137.508 * Math.PI) / 180;
    shakeProfileRef.current = {
      phase: hash * 0.37,
      x: Math.cos(angle),
      y: Math.sin(angle),
      speedX: 0.021 + (hash % 7) * 0.0028,
      speedY: 0.027 + (hash % 5) * 0.0031,
    };
  }

  if (!rotateProfileRef.current) {
    const hash = Array.from(config.id).reduce((total, char) => total + char.charCodeAt(0), 0);
    rotateProfileRef.current = {
      direction: hash % 2 === 0 ? 1 : -1,
      orbitSpeed: 0.065 + (hash % 9) * 0.014,
      logoSpeed: 0.018 + (hash % 7) * 0.006,
      phase: (hash * 47) % 360,
    };
  }

  if (!beatProfileRef.current) {
    const hash = Array.from(config.id).reduce((total, char) => total + char.charCodeAt(0), 0);
    const rates: Array<0.5 | 1 | 2> = [1, 0.5, 2, 1, 1];
    beatProfileRef.current = {
      jumpHeight: 8 + (hash % 8) + config.intensity * 7,
      sideDistance: 10 + (hash % 9) + config.intensity * 8,
      rate: rates[hash % rates.length],
    };
  }

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }
    node.style.setProperty("--node-x", `${config.x * 100}%`);
    node.style.setProperty("--node-y", `${config.y * 100}%`);
    node.style.setProperty("--node-color", config.color);
  }, [config]);

  useAnimationFrame((deltaMs, now) => {
    const node = nodeRef.current;
    const glyph = glyphRef.current;
    if (!node || !glyph) {
      return;
    }

    const features = audioFeaturesRef.current;
    const target = Math.min(1, features[config.frequencyBand] * config.intensity + features.onset * 0.12);
    energyRef.current += (target - energyRef.current) * config.response;

    if (features.beat && !lastBeatRef.current && (config.motion === "pulse" || config.motion === "ripple")) {
      beatFlashRef.current = 1;
    }
    lastBeatRef.current = features.beat;
    beatFlashRef.current = Math.max(0, beatFlashRef.current - deltaMs / 380);

    const energy = energyRef.current;
    const motionScale = reducedMotion ? 0.35 : 1;
    const breath = Math.sin(now * 0.0012 + config.x * 10) * 0.006 * motionScale;
    const pulse = beatFlashRef.current * 0.11 * motionScale;
    const motionBoost = config.motion === "pulse" ? 1.4 : config.motion === "breath" ? 0.9 : 1;
    const scale = 1 + energy * 0.09 * motionScale * motionBoost + breath + pulse;
    const rotate =
      animationMode === "expressive-logo" && config.motion === "spin"
        ? Math.sin(now * 0.0018) * 2 * energy * motionScale
        : 0;
    const shakeProfile = shakeProfileRef.current;
    if (!shakeProfile) {
      return;
    }
    const rotateProfile = rotateProfileRef.current;
    if (!rotateProfile) {
      return;
    }
    const beatProfile = beatProfileRef.current;
    if (!beatProfile) {
      return;
    }
    const shake =
      !reducedMotion && config.motion === "shake"
        ? `${Math.sin(now * shakeProfile.speedX + shakeProfile.phase) * energy * 4 * shakeProfile.x}px, ${Math.cos(now * shakeProfile.speedY + shakeProfile.phase) * energy * 4 * shakeProfile.y}px`
        : "0px, 0px";
    const shakeLineTilt =
      !reducedMotion && config.motion === "shake"
        ? (Math.sin(now * 0.05 + shakeProfile.phase) > 0 ? 42 : -42) * Math.min(1, energy * 4)
        : 0;
    const orbitRotate =
      config.motion === "orbit"
        ? rotateProfile.phase + rotateProfile.direction * (now * rotateProfile.orbitSpeed + energy * 260)
        : 0;
    let logoRotate =
      config.motion === "spin" && !reducedMotion
        ? rotateProfile.direction * -1 * (rotateProfile.phase * 0.6 + now * rotateProfile.logoSpeed)
        : 0;
    let beatJump = 0;
    let beatSideStep = 0;
    let beatBrightness = beatFlashRef.current;
    let backgroundScale = 1;
    let beatLogoScale = 1;
    let backgroundClip = "circle(50% at 50% 50%)";
    let backgroundRadius = "50%";
    const tempoBeatEnvelope = (() => {
      if (!tempo || reducedMotion) {
        return 0;
      }
      const beatPosition = (audioElement.currentTime - tempo.firstBeatTime) / tempo.beatInterval;
      const nearestBeat = Math.round(beatPosition);
      const nearestBeatTime = tempo.firstBeatTime + nearestBeat * tempo.beatInterval;
      const distance = Math.abs(audioElement.currentTime - nearestBeatTime);
      const beatWindow = Math.min(0.18, tempo.beatInterval * 0.36);
      const envelope = Math.max(0, 1 - distance / beatWindow);
      return Math.sin(envelope * Math.PI);
    })();

    if (config.motion === "pulse") {
      beatBrightness = Math.max(beatBrightness, tempoBeatEnvelope);
    }

    if (config.motion === "beatGrow") {
      backgroundScale = 1 + tempoBeatEnvelope * (0.38 + config.intensity * 0.22);
      beatBrightness = Math.max(beatBrightness, tempoBeatEnvelope * 0.55);
    }

    if (config.motion === "beatLogoGrow") {
      beatLogoScale = 1 + tempoBeatEnvelope * (0.62 + config.intensity * 0.38);
      beatBrightness = Math.max(beatBrightness, tempoBeatEnvelope * 0.45);
    }

    if (config.motion === "beatShape" && tempo && !reducedMotion) {
      const beatPosition = (audioElement.currentTime - tempo.firstBeatTime) / tempo.beatInterval;
      const beatIndex = Math.max(0, Math.floor(beatPosition));
      const shapeIndex = beatIndex % 4;
      const shapes = [
        { clip: "inset(0% 0% 0% 0% round 8%)", radius: "8%" },
        { clip: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)", radius: "0%" },
        {
          clip: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
          radius: "0%",
        },
        { clip: "circle(50% at 50% 50%)", radius: "50%" },
      ];
      backgroundClip = shapes[shapeIndex].clip;
      backgroundRadius = shapes[shapeIndex].radius;
      backgroundScale = 1 + tempoBeatEnvelope * 0.08;
      beatBrightness = Math.max(beatBrightness, tempoBeatEnvelope * 0.42);
    }

    if (config.motion === "beatJump" && tempo && !reducedMotion) {
      const unitInterval = tempo.beatInterval / beatProfile.rate;
      const beatPosition = (audioElement.currentTime - tempo.firstBeatTime) / unitInterval;
      const nearestUnit = Math.round(beatPosition);
      const wholeBeatIndex = Math.round((nearestUnit * unitInterval) / tempo.beatInterval);
      const allowed = beatProfile.rate !== 0.5 || wholeBeatIndex % 2 === 0;
      const nearestBeatTime = tempo.firstBeatTime + nearestUnit * unitInterval;
      const distance = Math.abs(audioElement.currentTime - nearestBeatTime);
      const jumpWindow = Math.min(0.16, unitInterval * 0.34);
      const envelope = Math.max(0, 1 - distance / jumpWindow);
      beatJump = allowed ? -beatProfile.jumpHeight * Math.sin(envelope * Math.PI) : 0;
    }

    if (config.motion === "beatSideStep" && tempo && !reducedMotion) {
      const beatPosition = (audioElement.currentTime - tempo.firstBeatTime) / tempo.beatInterval;
      const nearestBeat = Math.round(beatPosition);
      const nearestBeatTime = tempo.firstBeatTime + nearestBeat * tempo.beatInterval;
      const distance = Math.abs(audioElement.currentTime - nearestBeatTime);
      const jumpWindow = Math.min(0.17, tempo.beatInterval * 0.34);
      const envelope = Math.max(0, 1 - distance / jumpWindow);
      const pattern = nearestBeat % 4;
      const target = pattern === 0 ? -1 : pattern === 2 ? 1 : 0;
      beatSideStep = target * beatProfile.sideDistance * Math.sin(envelope * Math.PI);
      beatJump = target === 0 ? -beatProfile.jumpHeight * 0.36 * Math.sin(envelope * Math.PI) : 0;
    }

    if (config.motion === "beatTilt" && tempo && !reducedMotion) {
      const beatPosition = (audioElement.currentTime - tempo.firstBeatTime) / tempo.beatInterval;
      const beatIndex = Math.floor(beatPosition);
      const phase = beatPosition - beatIndex;
      if (beatIndex >= 0 && phase >= 0 && phase <= 1) {
        const pattern = beatIndex % 4;
        const direction = pattern === 0 || pattern === 1 ? -1 : 1;
        logoRotate = direction * 45 * Math.sin(phase * Math.PI);
      }
    }

    node.style.setProperty("--energy", energy.toFixed(4));
    node.style.setProperty("--beat-flash", beatFlashRef.current.toFixed(4));
    node.style.setProperty("--beat-brightness", beatBrightness.toFixed(4));
    node.style.setProperty("--background-scale", backgroundScale.toFixed(4));
    node.style.setProperty("--background-clip", backgroundClip);
    node.style.setProperty("--background-radius", backgroundRadius);
    node.style.setProperty("--node-scale", scale.toFixed(4));
    node.style.setProperty("--node-rotate", `${rotate.toFixed(3)}deg`);
    node.style.setProperty("--node-shake", shake);
    node.style.setProperty("--shake-line-rotate", `${shakeLineTilt.toFixed(2)}deg`);
    node.style.setProperty("--orbit-rotate", `${orbitRotate.toFixed(2)}deg`);
    node.style.setProperty("--logo-rotate", `${logoRotate.toFixed(2)}deg`);
    node.style.setProperty("--beat-logo-scale", beatLogoScale.toFixed(4));
    node.style.setProperty("--node-jump", `${beatJump.toFixed(2)}px`);
    node.style.setProperty("--node-side-step", `${beatSideStep.toFixed(2)}px`);
    node.style.setProperty("--jump-energy", `${Math.min(1, (Math.abs(beatJump) + Math.abs(beatSideStep) * 0.7) / 16).toFixed(3)}`);
    node.style.setProperty("--logo-scale", `${config.logoScale ?? 1}`);
  });

  return (
    <div
      ref={nodeRef}
      className={`company-node motion-${config.motion}`}
      style={{ left: `${config.x * 100}%`, top: `${config.y * 100}%` }}
      aria-label={`${config.name} audio reactive node`}
    >
      <div className="node-halo" />
      <div className="node-ripple" />
      <div ref={glyphRef} className="node-glyph">
        {config.logo ? (
          <img className="brand-logo" src={config.logo} alt="" draggable={false} />
        ) : (
          <span>{config.fallbackLabel}</span>
        )}
      </div>
    </div>
  );
}
