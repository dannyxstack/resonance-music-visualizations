import { useId } from 'react';
import type { TempoAnalysis, TempoProgress } from '../types/tempo';

interface AudioTransportProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fileName: string | null;
  error: string | null;
  tempo: TempoAnalysis | null;
  tempoProgress: TempoProgress | null;
  lowProgress: number | null;
  lowReady: boolean;
  lowFailed: boolean;
  onFile: (file: File) => void | Promise<void>;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export function AudioTransport({ isPlaying, currentTime, duration, fileName, error,
  tempo, tempoProgress, lowProgress, lowReady, lowFailed, onFile, onPlay, onPause,
  onSeek }: AudioTransportProps): React.ReactElement {
  const fileId = useId();
  const progress = tempoProgress ? `${tempoProgress.phase} ${Math.round(tempoProgress.progress * 100)}%` : tempo ? 'BPM 分析完成' : fileName ? '未检测到稳定 BPM' : '等待选曲';
  const low = lowProgress !== null ? `低频 ${Math.round(lowProgress * 100)}%` : lowReady ? '低频已就绪' : lowFailed ? '低频分析失败' : '';
  return <footer className="bay-transport" aria-label="音乐播放控制">
    <div className="bay-transport-primary">
      <label className="file-button" htmlFor={fileId}>打开音乐</label>
      <input id={fileId} className="visually-hidden" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.webm" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void onFile(file); }} />
      <button type="button" className="icon-button play-button" onClick={isPlaying ? onPause : onPlay} disabled={!fileName} aria-label={isPlaying ? '暂停' : '播放'}>{isPlaying ? '暂停' : '播放'}</button>
      <span className="transport-time">{formatTime(currentTime)}</span>
      <input className="seek" type="range" min="0" max={Math.max(0, duration)} step="0.01" value={Math.min(currentTime, duration || 0)} onChange={event => onSeek(Number(event.currentTarget.value))} aria-label="播放进度" disabled={!duration} />
      <span className="transport-time">{formatTime(duration)}</span>
    </div>
    <div className="bay-transport-secondary"><span className="track-name" title={fileName ?? ''}>{fileName ?? '尚未选择音乐'}</span><span aria-live="polite">{error ?? `${progress}${low ? ` · ${low}` : ''}`}</span><span>BPM <strong>{tempo ? tempo.bpm.toFixed(1) : '--'}</strong></span><span>首拍偏移 <strong>{tempo ? `${tempo.firstBeatTime.toFixed(2)} 秒` : '-- 秒'}</strong></span></div>
  </footer>;
}
