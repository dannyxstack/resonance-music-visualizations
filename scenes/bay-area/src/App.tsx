import { useEffect, useRef, useState } from "react";
import { analyzeTempo } from "./audio/TempoAnalyzer";
import { AudioControls } from "./components/AudioControls";
import { AudioTransport } from "./components/AudioTransport";
import { CompanyCatalog } from "./components/CompanyCatalog";
import { DebugPanel } from "./components/DebugPanel";
import { Visualization } from "./components/Visualization";
import { useAudioEngine } from "./hooks/useAudioEngine";
import type { BrandAnimationMode } from "./types/company";
import type { TempoAnalysis, TempoProgress } from "./types/tempo";
import { analyzeLowFrequencyFile } from "../../../public/visualizers/shared/low-envelope.js";

export default function App(): React.ReactElement {
  const audio = useAudioEngine();
  const [debugOpen, setDebugOpen] = useState(false);
  const [masterIntensity, setMasterIntensity] = useState(0.82);
  const [metrics, setMetrics] = useState({ fps: 60, particleCount: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [tempo, setTempo] = useState<TempoAnalysis | null>(null);
  const [tempoProgress, setTempoProgress] = useState<TempoProgress | null>(null);
  const [bpmMethod, setBpmMethod] = useState('beat-grid');
  const [energyMethod, setEnergyMethod] = useState('live');
  const [lowEnvelope, setLowEnvelope] = useState<Float32Array | null>(null);
  const [lowProgress, setLowProgress] = useState<number | null>(null);
  const [lowFailed, setLowFailed] = useState(false);
  const lowTokenRef = useRef(0);
  const analysisTokenRef = useRef(0);
  const selectedFileRef = useRef<File | null>(null);
  const animationMode: BrandAnimationMode = "safe-wrapper";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => setReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = (): void => setPreviewFullscreen(document.fullscreenElement?.id === 'scenePreview');
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
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

  const analyzeSelected = async (file: File, method: string): Promise<void> => {
    const token = ++analysisTokenRef.current;
    setTempo(null);
    setTempoProgress({ phase: "Reading", progress: 0 });
    try {
      const nextTempo = await analyzeTempo(file, method, progress => {
        if (analysisTokenRef.current === token) setTempoProgress(progress);
      }, () => analysisTokenRef.current !== token);
      if (analysisTokenRef.current === token) setTempo(nextTempo);
    } catch {
      if (analysisTokenRef.current === token) setTempo(null);
    } finally {
      if (analysisTokenRef.current === token) setTempoProgress(null);
    }
  };

  const analyzeLowSelected = async (file: File): Promise<void> => {
    const token = ++lowTokenRef.current;
    setLowEnvelope(null);
    setLowProgress(0);
    setLowFailed(false);
    try {
      const env = await analyzeLowFrequencyFile(file, () => lowTokenRef.current !== token,
        progress => { if (lowTokenRef.current === token) setLowProgress(progress); });
      if (lowTokenRef.current === token) setLowEnvelope(env);
    } catch {
      if (lowTokenRef.current === token) { setLowEnvelope(null); setLowFailed(true); }
    } finally {
      if (lowTokenRef.current === token) setLowProgress(null);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Bay Area Audio-Reactive Tech Ecosystem</p>
          <h1>Living Technology Map</h1>
        </div>
        <div className="header-actions"><span className="mode-pill">Brand animation: {animationMode}</span><button type="button" className="control-toggle" aria-pressed={previewFullscreen} onClick={() => { const preview = document.getElementById('scenePreview'); if (document.fullscreenElement === preview) void document.exitFullscreen().catch(() => {}); else void preview?.requestFullscreen().catch(() => {}); }}>{previewFullscreen ? '退出全屏' : '画面全屏'}</button><button type="button" className="control-toggle" aria-expanded={controlsOpen} onClick={() => setControlsOpen(open => !open)}>{controlsOpen ? '收起控制区' : '展开控制区'}</button></div>
      </header>

      <Visualization
        featuresRef={audio.featuresRef}
        masterIntensity={masterIntensity}
        reducedMotion={reducedMotion}
        audioElement={audio.engine.audio}
        tempo={tempo}
        energyMethod={energyMethod}
        lowEnvelope={lowEnvelope}
        onMetrics={(fps, particleCount) => setMetrics({ fps, particleCount })}
        onNodeLayout={setNodePositions}
      />

      <div className="control-zone">{controlsOpen ? <><AudioControls
        fileName={audio.fileName}
        intensity={masterIntensity}
        catalogOpen={catalogOpen}
        tempoProgress={tempoProgress}
        bpmMethod={bpmMethod}
        energyMethod={energyMethod}
        onEnergyMethod={setEnergyMethod}
        onBpmMethod={method => { analysisTokenRef.current++; setTempoProgress(null); setBpmMethod(method); }}
        onReanalyze={() => { if (selectedFileRef.current) void analyzeSelected(selectedFileRef.current, bpmMethod); }}
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
      </> : <div className="controls-collapsed-note">画面预览 · 控制区已收起</div>}</div>
      <AudioTransport isPlaying={audio.isPlaying} currentTime={audio.currentTime} duration={audio.duration}
        fileName={audio.fileName} error={audio.error} tempo={tempo} tempoProgress={tempoProgress}
        lowProgress={lowProgress} lowReady={Boolean(lowEnvelope)} lowFailed={lowFailed}
        onFile={async file => {
          selectedFileRef.current = file;
          audio.pause();
          audio.loadFile(file);
          void analyzeSelected(file, bpmMethod);
          void analyzeLowSelected(file);
          if (selectedFileRef.current === file) await audio.play();
        }}
        onPlay={() => void audio.play()} onPause={audio.pause} onSeek={audio.seek} />
    </div>
  );
}
