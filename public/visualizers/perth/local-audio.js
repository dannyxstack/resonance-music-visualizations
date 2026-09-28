const MIME_TYPES = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac',
  wav: 'audio/wav', wave: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg',
  flac: 'audio/flac', webm: 'audio/webm',
};

export function audioErrorMessage(error) {
  if (error?.name === 'NotAllowedError') return '浏览器阻止了播放，请再次点击播放按钮。';
  if (error?.name === 'TimeoutError') return '音频加载超时，请重新选择文件。';
  if (error?.name === 'NotSupportedError' || [3, 4].includes(error?.code)) {
    return '无法解码这首音乐：文件可能损坏或使用了浏览器不支持的编码。请尝试标准 MP3 或 PCM WAV 文件。';
  }
  return '无法读取或播放音频，请重新选择文件。';
}

function abortError() {
  return new DOMException('Audio selection changed', 'AbortError');
}

function waitUntilReady(audio, url, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(abortError()); return; }
    const finish = (error) => {
      clearTimeout(timer);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('error', onError);
      signal.removeEventListener('abort', onAbort);
      if (error) reject(error); else resolve();
    };
    const onReady = () => { if (audio.readyState >= 3) finish(); };
    const onError = () => { if (audio.error) finish(audio.error); };
    const onAbort = () => finish(abortError());
    const timer = setTimeout(() => finish(new DOMException('Audio load timed out', 'TimeoutError')), 20000);
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('error', onError);
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      audio.src = url;
      // Explicitly reset a previous failed source and initiate loading before play().
      audio.load();
    } catch (error) { finish(error); }
  });
}

// Web Audio can decode some sources that the media element rejects. Repackage
// decoded samples as standard PCM WAV; this is local and is not a new codec.
export function toPcmWav(buffer) {
  const channels = buffer.numberOfChannels;
  const dataSize = buffer.length * channels * 2;
  if (!channels || dataSize > 0xffffffff - 36) throw new Error('Audio is too large for WAV');
  const bytes = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bytes);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, dataSize, true);
  const samples = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
  let offset = 44;
  for (let frame = 0; frame < buffer.length; frame++) {
    for (const channel of samples) {
      const value = Math.max(-1, Math.min(1, channel[frame]));
      view.setInt16(offset, Math.round(value * (value < 0 ? 32768 : 32767)), true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

export async function loadLocalAudio(audio, file, { signal, getContext, onFallback = () => {} }) {
  if (!file.size) throw new DOMException('Empty audio file', 'NotSupportedError');
  let url;
  const assign = async (blob) => {
    if (signal.aborted) throw abortError();
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    await waitUntilReady(audio, url, signal);
  };
  try {
    const extension = file.name.split('.').pop().toLowerCase();
    const mime = MIME_TYPES[extension] || file.type;
    try {
      await assign(new Blob([file], { type: mime }));
    } catch (error) {
      if (signal.aborted) throw abortError();
      if (error?.name !== 'NotSupportedError' && ![3, 4].includes(error?.code)) throw error;
      onFallback();
      // Check cancellation both before and after decoding so a slow earlier
      // selection cannot overwrite the track the user chose more recently.
      const bytes = await file.arrayBuffer();
      if (signal.aborted) throw abortError();
      let decoded;
      try { decoded = await getContext().decodeAudioData(bytes); }
      catch { throw new DOMException('Audio decoding failed', 'NotSupportedError'); }
      if (signal.aborted) throw abortError();
      await assign(toPcmWav(decoded));
    }
    return url;
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    throw error;
  }
}
