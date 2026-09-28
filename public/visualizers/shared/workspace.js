export function bindAnalysisSummary(bpmStatus, lowStatus, target) {
  const update = () => {
    const bpm = bpmStatus?.textContent?.trim() || '等待选曲';
    const low = lowStatus?.textContent?.trim() || '';
    target.textContent = low && !low.includes('选择音乐后') ? `${bpm} · ${low}` : bpm;
  };
  const observer = new MutationObserver(update);
  if (bpmStatus) observer.observe(bpmStatus, { childList: true, characterData: true, subtree: true });
  if (lowStatus) observer.observe(lowStatus, { childList: true, characterData: true, subtree: true });
  update();
  return () => observer.disconnect();
}

export function bindPreviewFullscreen(preview, button) {
  button.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === preview) await document.exitFullscreen();
      else await preview.requestFullscreen();
    } catch {
      button.title = '当前浏览器未允许全屏';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = document.fullscreenElement === preview;
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? '退出全屏（Esc）' : '视觉效果全屏';
  });
}
