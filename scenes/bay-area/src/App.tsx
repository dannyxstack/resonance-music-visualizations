import { useEffect, useRef, useState } from "react";
import { analyzeTempo } from "./audio/TempoAnalyzer";
import { AudioControls } from "./components/AudioControls";
import { CompanyCatalog } from "./components/CompanyCatalog";
import { DebugPanel } from "./components/DebugPanel";
import { Visualization } from "./components/Visualization";
import { useAudioEngine } from "./hooks/useAudioEngine";
import type { BrandAnimationMode } from "./types/company";
import type { TempoAnalysis, TempoProgress } from "./types/tempo";

export default function App(): React.ReactElement {
  const audio = useAudioEngine();
  const [debugOpen, setDebugOpen] = useState(false);
  const [masterIntensity, setMasterIntensity] = useState(0.82);
  const [metrics, setMetrics] = useState({ fps: 60, particleCount: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [tempo, setTempo] = useState<TempoAnalysis | null>(null);
  const [tempoProgress, setTempoProgress] = useState<TempoProgress | null>(null);
  const analysisTokenRef = useRef(0);
  const animationMode: BrandAnimationMode = "safe-wrapper";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => setReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() === "d" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        setDebugOpen((open) => !open);
      }
      if (event.code === "Space" && event.target === document.body) {
        event.preventDefault();
        if (audio.isPlaying) {
          audio.pause();
        } else {
          void audio.play();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audio]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Bay Area Audio-Reactive Tech Ecosystem</p>
          <h1>Living Technology Map</h1>
        </div>
        <div className="mode-pill">Brand animation: {animationMode}</div>
      </header>

      <Visualization
        featuresRef={audio.featuresRef}
        features={audio.features}
        animationMode={animationMode}
        masterIntensity={masterIntensity}
        reducedMotion={reducedMotion}
        audioElement={audio.engine.audio}
        tempo={tempo}
        onMetrics={(fps, particleCount) => setMetrics({ fps, particleCount })}
        onNodeLayout={setNodePositions}
      />

      <AudioControls
        isPlaying={audio.isPlaying}
        currentTime={audio.currentTime}
        duration={audio.duration}
        fileName={audio.fileName}
        error={audio.error}
        intensity={masterIntensity}
        catalogOpen={catalogOpen}
        tempo={tempo}
        tempoProgress={tempoProgress}
        onFile={async (file) => {
          const token = analysisTokenRef.current + 1;
          analysisTokenRef.current = token;
          audio.pause();
          audio.loadFile(file);
          setTempo(null);
          setTempoProgress({ phase: "Reading", progress: 0 });
          try {
            const nextTempo = await analyzeTempo(file, (progress) => {
              if (analysisTokenRef.current === token) {
                setTempoProgress(progress);
              }
            });
            if (analysisTokenRef.current === token) {
              setTempo(nextTempo);
            }
          } catch {
            if (analysisTokenRef.current === token) {
              setTempo(null);
            }
          } finally {
            if (analysisTokenRef.current === token) {
              setTempoProgress(null);
              await audio.play();
            }
          }
        }}
        onPlay={() => void audio.play()}
        onPause={audio.pause}
        onSeek={audio.seek}
        onIntensity={setMasterIntensity}
        onToggleCatalog={() => setCatalogOpen((open) => !open)}
      />

      {debugOpen ? (
        <DebugPanel features={audio.features} fps={metrics.fps} particleCount={metrics.particleCount} />
      ) : null}

      <CompanyCatalog
        open={catalogOpen}
        positions={nodePositions}
      />
    </div>
  );
}
