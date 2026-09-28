// Common preview contract. Rendering stays with each scene; encoding can consume
// the same canvas and explicit-time render method in a later step.
export function registerScene({ canvas, resize, renderFrame, getTime }) {
  const scene = Object.freeze({
    version: 1,
    canvas,
    getSize: () => ({ width: canvas.width, height: canvas.height }),
    getTime,
    resize,
    renderFrame: ({ time, delta = 0 } = {}) => renderFrame(time ?? getTime(), delta),
  });
  window.resonanceScene = scene;
  return scene;
}
