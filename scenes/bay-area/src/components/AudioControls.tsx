import type { TempoAnalysis, TempoProgress } from "../types/tempo";
import { useId } from "react";
import { BPM_METHODS, ENERGY_METHODS } from "../../../../public/visualizers/shared/analysis.js";

interface AudioControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fileName: string | null;
  error: string | null;
  intensity: number;
  catalogOpen: boolean;
  tempo: TempoAnalysis | null;
  tempoProgress: TempoProgress | null;
  bpmMethod: string;
  energyMethod: string;
  lowProgress: number | null;
  lowReady: boolean;
  lowFailed: boolean;
  onFile: (file: File) => void | Promise<void>;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onIntensity: (value: number) => void;
  onBpmMethod: (method: string) => void;
  onEnergyMethod: (method: string) => void;
  onReanalyze: () => void;
  onToggleCatalog: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00";
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

export function AudioControls({
  isPlaying,
  currentTime,
  duration,
  fileName,
  error,
  intensity,
  catalogOpen,
  tempo,
  tempoProgress,
  bpmMethod,
  energyMethod,
  lowProgress,
  lowReady,
  lowFailed,
  onFile,
  onPlay,
  onPause,
  onSeek,
  onIntensity,
  onBpmMethod,
  onEnergyMethod,
  onReanalyze,
  onToggleCatalog,
}: AudioControlsProps): React.ReactElement {
  const fileId = useId();

  return (
    <section className="controls" aria-label="Audio controls">
      <div className="transport-row">
        <label className="file-button" htmlFor={fileId}>
          Open Audio
        </label>
        <input
          id={fileId}
          className="visually-hidden"
          type="file"
          accept="audio/*,.mp3"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              void onFile(file);
            }
          }}
        />
        <button
          type="button"
          className="icon-button play-button"
          onClick={isPlaying ? onPause : onPlay}
          disabled={!fileName}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="privacy-pill">Audio stays on this device</span>
      </div>

      <div className="seek-row">
        <span>{formatTime(currentTime)}</span>
        <input
          className="seek"
          type="range"
          min="0"
          max={Math.max(0, duration)}
          step="0.01"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          aria-label="Seek audio"
          disabled={!duration}
        />
        <span>{formatTime(duration)}</span>
      </div>

      <div className="meta-row">
        <span className="track-name">{fileName ?? "Choose a local MP3 or audio file"}</span>
        {tempoProgress ? (
          <div className="tempo-progress" aria-label={`${tempoProgress.phase} beat analysis`}>
            <span>{tempoProgress.phase}</span>
            <div className="tempo-progress-track">
              <i style={{ width: `${Math.round(tempoProgress.progress * 100)}%` }} />
            </div>
          </div>
        ) : tempo ? (
          <span className="tempo-pill">BPM {tempo.bpm.toFixed(1)} · 首拍偏移 {tempo.firstBeatTime.toFixed(2)} 秒</span>
        ) : null}
        <label className="bpm-method-control">
          <span>预分析方法</span>
          <select value={bpmMethod} onChange={event => onBpmMethod(event.currentTarget.value)}>
            {BPM_METHODS.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}
          </select>
        </label>
        <button type="button" className="bpm-reanalyze" onClick={onReanalyze} disabled={!fileName || Boolean(tempoProgress)}>重新分析 BPM</button>
        <label className="bpm-method-control">
          <span>节点能量方法</span>
          <select value={energyMethod} onChange={event => onEnergyMethod(event.currentTarget.value)}>
            {ENERGY_METHODS.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}
          </select>
        </label>
        <span className="tempo-pill">低频包络 {lowProgress !== null ? `${Math.round(lowProgress * 100)}%` : lowReady ? '已就绪' : lowFailed ? '分析失败，使用实时能量' : '等待选曲'}</span>
        <label className="intensity-control">
          <span>Energy</span>
          <input
            type="range"
            min="0.25"
            max="1.2"
            step="0.01"
            value={intensity}
            onChange={(event) => onIntensity(Number(event.currentTarget.value))}
            aria-label="Master visualization intensity"
          />
        </label>
        <button
          type="button"
          className="catalog-icon-button"
          onClick={onToggleCatalog}
          aria-label={catalogOpen ? "Close company catalog" : "Open company catalog"}
          aria-expanded={catalogOpen}
          aria-controls="company-catalog-panel"
        >
          <svg className="fa-list-icon" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zm144 16c-17.7 0-32 14.3-32 32s14.3 32 32 32h288c17.7 0 32-14.3 32-32s-14.3-32-32-32H184zM40 208c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24H40zm144 16c-17.7 0-32 14.3-32 32s14.3 32 32 32h288c17.7 0 32-14.3 32-32s-14.3-32-32-32H184zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24H40zm144 16c-17.7 0-32 14.3-32 32s14.3 32 32 32h288c17.7 0 32-14.3 32-32s-14.3-32-32-32H184z"
            />
          </svg>
        </button>
      </div>

      {error ? <p className="error-message">{error}</p> : null}
    </section>
  );
}
