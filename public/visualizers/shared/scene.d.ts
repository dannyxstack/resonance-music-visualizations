export interface SceneContract {
  version: 1;
  canvas: HTMLCanvasElement;
  getSize(): { width: number; height: number };
  getTime(): number;
  resize(): void;
  renderFrame(frame?: { time?: number; delta?: number }): void;
}
export function registerScene(config: {
  canvas: HTMLCanvasElement;
  resize: () => void;
  renderFrame: (time: number, delta: number) => void;
  getTime: () => number;
}): SceneContract;
