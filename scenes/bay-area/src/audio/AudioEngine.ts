import { FFT_CONFIG } from "../config/visualization";
import type { AudioFeatures } from "../types/audio";
import { SILENCE_FEATURES } from "../types/audio";
import { FeatureExtractor } from "./FeatureExtractor";

type EngineListener = (features: AudioFeatures) => void;

export class AudioEngine {
  readonly audio: HTMLAudioElement;

  private audioContext: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private animationId = 0;
  private objectUrl: string | null = null;
  private readonly extractor = new FeatureExtractor();
  private readonly listeners = new Set<EngineListener>();

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.audio.crossOrigin = "anonymous";
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  loadFile(file: File): void {
    if (!file.type.startsWith("audio/")) {
      throw new Error("Please choose a supported audio file.");
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    this.audio.load();
    this.extractor.reset();
    this.emit(SILENCE_FEATURES);
  }

  async play(): Promise<void> {
    await this.ensureGraph();
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
    await this.audio.play();
    this.startAnalysis();
  }

  pause(): void {
    this.audio.pause();
    this.stopAnalysis();
  }

  seek(time: number): void {
    if (Number.isFinite(time)) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.duration));
    }
  }

  get duration(): number {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  dispose(): void {
    this.stopAnalysis();
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
    void this.audioContext?.close();
  }

  private async ensureGraph(): Promise<void> {
    if (!this.audioContext) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextCtor();
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_CONFIG.fftSize;
      this.analyser.smoothingTimeConstant = FFT_CONFIG.smoothingTimeConstant;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    }

    if (!this.source) {
      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
  }

  private startAnalysis(): void {
    if (this.animationId) {
      return;
    }

    const frame = (): void => {
      this.animationId = requestAnimationFrame(frame);
      this.readFrame();
    };

    frame();
  }

  private stopAnalysis(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
    this.emit({ ...SILENCE_FEATURES, beat: false });
  }

  private readFrame(): void {
    if (!this.audioContext || !this.analyser || !this.frequencyData || !this.timeDomainData) {
      return;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    this.emit(
      this.extractor.extract(
        this.frequencyData,
        this.timeDomainData,
        this.audioContext.sampleRate,
        this.analyser.fftSize,
        performance.now(),
      ),
    );
  }

  private emit(features: AudioFeatures): void {
    for (const listener of this.listeners) {
      listener(features);
    }
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
