import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { companies } from '../config/companies';
import type { AudioFeatures } from '../types/audio';
import type { TempoAnalysis } from '../types/tempo';
import { useAnimationFrame } from '../hooks/useAnimationFrame';
import { CanvasMapScene } from '../visual/CanvasMapScene';
import { setCanvasSize } from '../visual/VisualEngine';
import { updateLowFrequencyLevel } from '../../../../public/visualizers/shared/low-envelope.js';
import { registerScene } from '../../../../public/visualizers/shared/scene.js';

interface VisualizationProps {
  featuresRef: MutableRefObject<AudioFeatures>;
  masterIntensity: number;
  reducedMotion: boolean;
  audioElement: HTMLAudioElement;
  tempo: TempoAnalysis | null;
  energyMethod: string;
  lowEnvelope: Float32Array | null;
  onMetrics: (fps: number, particleCount: number) => void;
  onNodeLayout: (positions: Record<string, { x: number; y: number }>) => void;
}

export function Visualization({
  featuresRef, masterIntensity, reducedMotion, audioElement, tempo,
  energyMethod, lowEnvelope, onMetrics, onNodeLayout,
}: VisualizationProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scene = useMemo(() => new CanvasMapScene(), []);
  const lowLevelRef = useRef(0);
  const fpsRef = useRef(60);
  const onNodeLayoutRef = useRef(onNodeLayout);
  onNodeLayoutRef.current = onNodeLayout;

  useEffect(() => { lowLevelRef.current = 0; }, [lowEnvelope]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateLayout = (): void => {
      const rect = canvas.getBoundingClientRect();
      onNodeLayoutRef.current(Object.fromEntries(companies.map(company => [company.id, {
        x: Math.round(rect.left + rect.width * company.x),
        y: Math.round(rect.top + rect.height * company.y),
      }])));
    };
    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(canvas);
    window.addEventListener('resize', updateLayout);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateLayout); };
  }, []);

  const render = (time: number, deltaMs: number): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = setCanvasSize(canvas);
    lowLevelRef.current = updateLowFrequencyLevel(lowEnvelope, time,
      !audioElement.paused && !audioElement.ended, Math.min(.1, deltaMs / 1000), lowLevelRef.current);
    scene.render(ctx, width, height, featuresRef.current, tempo, time, deltaMs,
      reducedMotion, energyMethod, lowLevelRef.current, Boolean(lowEnvelope), masterIntensity);
    const instantFps = 1000 / Math.max(1, deltaMs);
    fpsRef.current += (instantFps - fpsRef.current) * .05;
    onMetrics(fpsRef.current, scene.particles.count);
  };
  const renderRef = useRef(render);
  renderRef.current = render;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    registerScene({
      canvas,
      resize: () => { setCanvasSize(canvas); },
      renderFrame: (time, delta) => renderRef.current(time, delta * 1000),
      getTime: () => audioElement.currentTime || 0,
    });
  }, [audioElement]);

  useAnimationFrame((deltaMs) => render(audioElement.currentTime || 0, deltaMs));

  return (
    <main className="visualization-shell" aria-label="Bay Area video preview">
      <div className="scene-preview-frame bay-preview-frame" id="scenePreview">
        <canvas ref={canvasRef} className="bay-scene-canvas" aria-label="Technology company map visualization" />
      </div>
    </main>
  );
}
