import { useEffect, useRef } from "react";

export function useAnimationFrame(callback: (deltaMs: number, now: number) => void): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let animationId = 0;
    let previous = performance.now();

    const frame = (now: number): void => {
      const delta = now - previous;
      previous = now;
      callbackRef.current(delta, now);
      animationId = requestAnimationFrame(frame);
    };

    animationId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationId);
  }, []);
}
