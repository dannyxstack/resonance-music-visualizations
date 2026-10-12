export interface LiveExportControls {
  sync(): void;
  dispose(): void;
}

export function mountLiveExport(container: HTMLElement, options: {
  canvas: HTMLCanvasElement;
  audio: HTMLAudioElement;
  getFile(): File | null;
  sceneName: string;
  play?: () => Promise<void> | void;
  pause?: () => void;
  prepare?: () => Promise<void> | void;
}): LiveExportControls;
