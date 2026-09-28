import type { AudioFeatures } from "../types/audio";

interface DebugPanelProps {
  features: AudioFeatures;
  fps: number;
  particleCount: number;
}

type NumericFeatureKey = Exclude<keyof AudioFeatures, "beat">;

const rows: NumericFeatureKey[] = ["rms", "sub", "bass", "lowMid", "mid", "high", "air", "spectralFlux", "onset"];

export function DebugPanel({ features, fps, particleCount }: DebugPanelProps): React.ReactElement {
  return (
    <aside className="debug-panel" aria-label="Audio feature debug panel">
      <div className="debug-header">
        <span>Debug</span>
        <span>{Math.round(fps)} FPS</span>
      </div>
      {rows.map((key) => (
        <div className="debug-row" key={key}>
          <span>{key}</span>
          <div className="debug-bar" aria-hidden="true">
            <i style={{ width: `${Math.min(100, features[key] * 100)}%` }} />
          </div>
          <b>{features[key].toFixed(2)}</b>
        </div>
      ))}
      <div className="debug-footer">
        <span>Beat</span>
        <b>{features.beat ? "yes" : "no"}</b>
        <span>Particles</span>
        <b>{particleCount}</b>
      </div>
    </aside>
  );
}
