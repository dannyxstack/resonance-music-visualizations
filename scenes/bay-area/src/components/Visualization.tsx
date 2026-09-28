import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { companies } from "../config/companies";
import { connections } from "../config/connections";
import type { AudioFeatures } from "../types/audio";
import type { BrandAnimationMode } from "../types/company";
import type { TempoAnalysis } from "../types/tempo";
import { useAnimationFrame } from "../hooks/useAnimationFrame";
import { ParticleEngine } from "../particles/ParticleEngine";
import { BayAreaMap } from "../visual/BayAreaMap";
import { CompanyNode } from "../visual/CompanyNode";
import { NetworkLayer } from "../visual/NetworkLayer";
import { setCanvasSize } from "../visual/VisualEngine";

interface VisualizationProps {
  featuresRef: MutableRefObject<AudioFeatures>;
  features: AudioFeatures;
  animationMode: BrandAnimationMode;
  masterIntensity: number;
  reducedMotion: boolean;
  audioElement: HTMLAudioElement;
  tempo: TempoAnalysis | null;
  onMetrics: (fps: number, particleCount: number) => void;
  onNodeLayout: (positions: Record<string, { x: number; y: number }>) => void;
}

export function Visualization({
  featuresRef,
  features,
  animationMode,
  masterIntensity,
  reducedMotion,
  audioElement,
  tempo,
  onMetrics,
  onNodeLayout,
}: VisualizationProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mapFrameRef = useRef<HTMLDivElement | null>(null);
  const engine = useMemo(() => new ParticleEngine(), []);
  const fpsRef = useRef(60);
  const [renderFeatures, setRenderFeatures] = useState(features);

  useEffect(() => {
    const interval = window.setInterval(() => setRenderFeatures(featuresRef.current), 120);
    return () => window.clearInterval(interval);
  }, [featuresRef]);

  useEffect(() => {
    const mapFrame = mapFrameRef.current;
    if (!mapFrame) {
      return undefined;
    }

    const updateLayout = (): void => {
      const rect = mapFrame.getBoundingClientRect();
      onNodeLayout(
        Object.fromEntries(
          companies.map((company) => [
            company.id,
            {
              x: Math.round(rect.left + rect.width * company.x),
              y: Math.round(rect.top + rect.height * company.y),
            },
          ]),
        ),
      );
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(mapFrame);
    window.addEventListener("resize", updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [onNodeLayout]);

  useAnimationFrame((deltaMs, now) => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const activeFeatures = featuresRef.current;
    const { width, height } = setCanvasSize(canvas);
    shell.style.setProperty("--global-rms", `${activeFeatures.rms * masterIntensity}`);
    shell.style.setProperty("--global-bass", `${activeFeatures.bass * masterIntensity}`);
    shell.style.setProperty("--global-high", `${activeFeatures.high * masterIntensity}`);
    shell.style.setProperty("--global-onset", `${activeFeatures.onset * masterIntensity}`);

    engine.render(context, width, height, companies, activeFeatures, deltaMs, now, reducedMotion);

    const instantFps = 1000 / Math.max(1, deltaMs);
    fpsRef.current += (instantFps - fpsRef.current) * 0.05;
    onMetrics(fpsRef.current, engine.count);
  });

  return (
    <main ref={shellRef} className="visualization-shell" aria-label="Bay Area audio reactive visualization">
      <div ref={mapFrameRef} className="map-frame">
        <BayAreaMap rms={renderFeatures.rms * masterIntensity} bass={renderFeatures.bass * masterIntensity} />
        <NetworkLayer companies={companies} connections={connections} features={renderFeatures} />
        <div className="node-layer" aria-label="Technology company nodes">
          {companies.map((company) => (
            <CompanyNode
              key={company.id}
              config={company}
              audioFeaturesRef={featuresRef}
              animationMode={animationMode}
              reducedMotion={reducedMotion}
              audioElement={audioElement}
              tempo={tempo}
            />
          ))}
        </div>
        <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />
        <div className="global-ripple" />
      </div>
    </main>
  );
}
