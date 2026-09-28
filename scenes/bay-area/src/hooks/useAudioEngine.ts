import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { AudioEngine } from "../audio/AudioEngine";
import type { AudioFeatures } from "../types/audio";
import { SILENCE_FEATURES } from "../types/audio";

export interface AudioEngineState {
  engine: AudioEngine;
  featuresRef: MutableRefObject<AudioFeatures>;
  features: AudioFeatures;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  fileName: string | null;
  loadFile: (file: File) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
}

export function useAudioEngine(): AudioEngineState {
  const engineRef = useRef<AudioEngine | null>(null);
  const featuresRef = useRef<AudioFeatures>(SILENCE_FEATURES);
  const [features, setFeatures] = useState<AudioFeatures>(SILENCE_FEATURES);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      return undefined;
    }

    let lastFeatureCommit = 0;
    const unsubscribe = engine.subscribe((nextFeatures) => {
      featuresRef.current = nextFeatures;
      const now = performance.now();
      if (now - lastFeatureCommit > 100 || nextFeatures.beat) {
        setFeatures(nextFeatures);
        lastFeatureCommit = now;
      }
    });

    const onTime = (): void => setCurrentTime(engine.audio.currentTime || 0);
    const onDuration = (): void => setDuration(engine.duration);
    const onPlay = (): void => setIsPlaying(true);
    const onPause = (): void => setIsPlaying(false);
    const onError = (): void => {
      setError("This audio file could not be loaded. Try another local MP3 or audio file.");
      setIsPlaying(false);
    };

    engine.audio.addEventListener("timeupdate", onTime);
    engine.audio.addEventListener("durationchange", onDuration);
    engine.audio.addEventListener("loadedmetadata", onDuration);
    engine.audio.addEventListener("play", onPlay);
    engine.audio.addEventListener("pause", onPause);
    engine.audio.addEventListener("ended", onPause);
    engine.audio.addEventListener("error", onError);

    return () => {
      unsubscribe();
      engine.audio.removeEventListener("timeupdate", onTime);
      engine.audio.removeEventListener("durationchange", onDuration);
      engine.audio.removeEventListener("loadedmetadata", onDuration);
      engine.audio.removeEventListener("play", onPlay);
      engine.audio.removeEventListener("pause", onPause);
      engine.audio.removeEventListener("ended", onPause);
      engine.audio.removeEventListener("error", onError);
      engine.dispose();
    };
  }, []);

  const engine = engineRef.current;

  return {
    engine,
    featuresRef,
    features,
    isPlaying,
    currentTime,
    duration,
    error,
    fileName,
    loadFile: (file: File) => {
      setError(null);
      setFileName(file.name);
      try {
        engine.loadFile(file);
        setDuration(0);
        setCurrentTime(0);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The audio file could not be loaded.");
      }
    },
    play: async () => {
      setError(null);
      try {
        await engine.play();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Playback could not start.");
      }
    },
    pause: () => engine.pause(),
    seek: (time: number) => engine.seek(time),
  };
}
