import { exportCanvasVideo, downloadVideo } from './video-export.js';

// Records the live scene canvas while replaying the selected file from its start.
// Other scenes can use this without changing their renderer or audio analysis path.
export function mountLiveExport(container, { canvas, audio, getFile, sceneName, play = () => audio.play(), pause = () => audio.pause(), prepare }) {
  const section = document.createElement('section');
  section.className = 'shared-export-panel';
  section.setAttribute('aria-label', '视频导出');
  section.innerHTML = `
    <h3>视频导出</h3>
    <label>分辨率 <select data-export-size><option value="1280x720">1280 × 720</option><option value="1920x1080">1920 × 1080</option></select></label>
    <label>帧率 <select data-export-fps><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label>
    <p>从歌曲开头实时录制 Canvas 画面和原音乐；耗时约为歌曲时长。</p>
    <div class="shared-export-actions"><button type="button" data-export-start disabled>导出视频</button><button type="button" data-export-cancel hidden>取消导出</button></div>
    <progress data-export-progress max="100" value="0" hidden></progress>
    <p data-export-status role="status" aria-live="polite">选择音乐后可导出 WebM 视频</p>`;
  container.append(section);
  const element = selector => section.querySelector(selector);
  const startButton = element('[data-export-start]');
  const cancelButton = element('[data-export-cancel]');
  const progress = element('[data-export-progress]');
  const status = element('[data-export-status]');
  const size = element('[data-export-size]');
  const fpsInput = element('[data-export-fps]');
  const storageKey = `resonance:export:${sceneName}`;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (['1280x720', '1920x1080'].includes(saved.size)) size.value = saved.size;
    if (['30', '60'].includes(saved.fps)) fpsInput.value = saved.fps;
  } catch {}
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({ size: size.value, fps: fpsInput.value })); } catch {}
  };
  size.addEventListener('change', save);
  fpsInput.addEventListener('change', save);

  let controller = null;
  const sync = () => { startButton.disabled = !getFile() || Boolean(controller); };
  const setStatus = (message, failed = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', failed);
  };
  const setProgress = value => {
    progress.hidden = false;
    progress.value = Math.max(0, Math.min(100, value));
  };

  const start = async () => {
    const file = getFile();
    if (!file || controller) return;
    const [width, height] = size.value.split('x').map(Number);
    const fps = Number(fpsInput.value);
    const active = new AbortController();
    controller = active;
    const previousTime = audio.currentTime || 0;
    const resumePlayback = !audio.paused && !audio.ended;
    pause();
    cancelButton.hidden = false;
    setStatus('正在解码音乐…');
    setProgress(0);
    sync();
    let context;
    try {
      context = new AudioContext();
      // Resume in the click handler so browser autoplay policy permits recording.
      void context.resume().catch(() => {});
      if (prepare) await prepare();
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      if (active.signal.aborted || getFile() !== file) throw new DOMException('Export cancelled', 'AbortError');
      setStatus('正在实时录制…');
      setProgress(3);
      const result = await exportCanvasVideo({
        mode: 'realtime', audioBuffer: buffer, audioContext: context, width, height, fps, signal: active.signal,
        onStart: () => {
          audio.currentTime = 0;
          void Promise.resolve(play()).catch(() => active.abort());
        },
        render: ({ context: target, time }) => {
          if (getFile() !== file) { active.abort(); return; }
          if (!audio.paused && Math.abs(audio.currentTime - time) > .15 && time < buffer.duration - .2) audio.currentTime = time;
          target.drawImage(canvas, 0, 0, width, height);
        },
        onProgress: fraction => {
          const percent = Math.round(fraction * 100);
          setProgress(percent);
          setStatus(`正在实时录制… ${percent}%`);
        },
      });
      if (active.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
      const basename = file.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || sceneName;
      downloadVideo(result, `${basename}-${sceneName}`);
      setProgress(100);
      setStatus('导出完成：WebM，包含原音乐');
    } catch (error) {
      if (error?.name === 'AbortError') setStatus('已取消导出。');
      else setStatus(`导出失败：${error?.message || '未知错误'}`, true);
    } finally {
      pause();
      if (getFile() === file) {
        try { audio.currentTime = previousTime; } catch {}
        if (resumePlayback) void Promise.resolve(play()).catch(() => {});
      }
      if (context) void context.close();
      if (controller === active) controller = null;
      cancelButton.hidden = true;
      sync();
    }
  };
  startButton.addEventListener('click', start);
  cancelButton.addEventListener('click', () => controller?.abort());
  audio.addEventListener('loadedmetadata', sync);
  audio.addEventListener('emptied', sync);
  const dispose = () => {
    controller?.abort();
    audio.removeEventListener('loadedmetadata', sync);
    audio.removeEventListener('emptied', sync);
    section.remove();
  };
  sync();
  return { sync, dispose };
}
