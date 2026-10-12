// Shared browser-side encoder. Scenes supply a deterministic draw(time, frame) callback.
// Mediabunny is loaded only after the user starts an export.
let mediaLibrary;
async function getMediaLibrary() {
  mediaLibrary ||= import('./vendor/mediabunny.min.js');
  return mediaLibrary;
}

const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

export async function exportCanvasVideo(options) {
  const { mode = 'auto', onMode } = options;
  const hasWebCodecs = typeof VideoEncoder !== 'undefined';
  if (mode === 'offline' && !hasWebCodecs) {
    throw new Error(window.isSecureContext
      ? '当前页面无法使用 WebCodecs 视频编码。请选择「自动选择」或「实时录制」。'
      : '当前访问地址不是安全上下文，WebCodecs 不可用。可改用 localhost、127.0.0.1 或 HTTPS，或选择实时录制。');
  }
  if (mode === 'realtime' || !hasWebCodecs) {
    onMode?.('realtime');
    return recordCanvasVideoRealtime(options);
  }
  try {
    onMode?.('offline');
    return await encodeCanvasVideoOffline(options);
  } catch (error) {
    // Unsupported codec combinations vary by browser and operating system.
    if (mode !== 'auto' || error?.name === 'AbortError' || error?.code !== 'NO_CODEC') throw error;
    onMode?.('realtime');
    return recordCanvasVideoRealtime(options);
  }
}

async function encodeCanvasVideoOffline({ audioBuffer, width, height, fps, render, signal, onProgress, metadata }) {
  if (!audioBuffer || !Number.isFinite(audioBuffer.duration) || audioBuffer.duration <= 0) throw new Error('请选择可解码的音乐文件。');
  const media = await getMediaLibrary();
  const { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioBufferSource,
    Quality, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec } = media;
  const videoQuality = new Quality({ bitrate: width >= 1920 ? (fps >= 60 ? 8_000_000 : 6_000_000) : (fps >= 60 ? 4_500_000 : 3_500_000) });
  const audioQuality = new Quality({ bitrate: 192_000 });
  const videoOptions = { width, height, frameRate: fps, quality: videoQuality };
  const audioOptions = { sampleRate: audioBuffer.sampleRate, numberOfChannels: audioBuffer.numberOfChannels, quality: audioQuality };
  let codec = await getFirstEncodableVideoCodec(['avc'], videoOptions);
  let audioCodec = await getFirstEncodableAudioCodec(['aac'], audioOptions);
  let format = codec && audioCodec ? new Mp4OutputFormat() : null;
  if (!format) {
    codec = await getFirstEncodableVideoCodec(['vp9', 'vp8'], videoOptions);
    audioCodec = await getFirstEncodableAudioCodec(['opus'], audioOptions);
    if (codec && audioCodec) format = new WebMOutputFormat();
  }
  if (!format) {
    const error = new Error('此浏览器没有可用的 WebCodecs 音视频编码组合。');
    error.code = 'NO_CODEC';
    throw error;
  }
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('无法创建导出画布。');
  const output = new Output({ format, target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, { codec, quality: videoQuality, frameRate: fps });
  const audioSource = new AudioBufferSource({ codec: audioCodec, quality: audioQuality });
  output.addVideoTrack(videoSource, { frameRate: fps });
  output.addAudioTrack(audioSource);
  if (metadata?.title || metadata?.author) output.setMetadataTags({ title: metadata.title || '', artist: metadata.author || '' });

  let completed = false;
  let audioError;
  try {
    await output.start();
    // Feed audio concurrently, so the muxer always has both tracks available.
    const audioTask = audioSource.add(audioBuffer).catch(error => { audioError = error; });
    const frames = Math.max(1, Math.ceil(audioBuffer.duration * fps));
    for (let frame = 0; frame < frames; frame++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
      if (audioError) throw audioError;
      const time = frame / fps;
      render({ context, canvas, time, frame, delta: 1 / fps });
      await videoSource.add(time, Math.min(1 / fps, audioBuffer.duration - time), { keyFrame: frame % (fps * 2) === 0 });
      if (frame % 8 === 0 || frame === frames - 1) {
        onProgress?.((frame + 1) / frames);
        await yieldToBrowser();
      }
    }
    await audioTask;
    if (audioError) throw audioError;
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    await output.finalize();
    completed = true;
    return { buffer: output.target.buffer, mimeType: format.mimeType, extension: format.fileExtension };
  } finally {
    if (!completed) await output.cancel().catch(() => {});
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function recordCanvasVideoRealtime({ audioBuffer, audioContext, width, height, fps, render, signal, onProgress }) {
  if (!audioBuffer || !Number.isFinite(audioBuffer.duration) || audioBuffer.duration <= 0) throw new Error('请选择可解码的音乐文件。');
  if (!audioContext || typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('此浏览器既无法逐帧编码，也不支持 canvas 实时录制。');
  }
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('此浏览器没有可用的 WebM 录制格式。');
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
  if (audioContext.state === 'suspended') await audioContext.resume();
  if (audioContext.state !== 'running') throw new Error('浏览器尚未允许播放录制音频，请再次点击导出。');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('无法创建录制画布。');
  render({ context, canvas, time: 0, frame: 0, delta: 1 / fps });
  const videoStream = canvas.captureStream(fps);
  const destination = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(destination);
  const stream = new MediaStream([...videoStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: width >= 1920 ? 6_000_000 : 3_500_000,
    audioBitsPerSecond: 192_000,
  });
  const chunks = [];
  let animationFrame = 0;
  let settled = false;
  let started = false;
  let lastFrame = 0;
  let startTime = 0;
  try {
    const recorded = new Promise((resolve, reject) => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = event => reject(event.error || new Error('浏览器录制失败。'));
      recorder.onstop = () => {
        if (signal?.aborted) reject(new DOMException('Export cancelled', 'AbortError'));
        else resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
      };
      source.onended = () => { if (recorder.state !== 'inactive') recorder.stop(); };
    });
    const abort = () => {
      if (started) { try { source.stop(); } catch {} }
      if (recorder.state !== 'inactive') recorder.stop();
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      recorder.start(1000);
      startTime = audioContext.currentTime + .06;
      source.start(startTime);
      started = true;
      const tick = () => {
        if (recorder.state === 'inactive' || signal?.aborted) return;
        const elapsed = Math.max(0, audioContext.currentTime - startTime);
        const frame = Math.min(Math.ceil(audioBuffer.duration * fps) - 1, Math.floor(elapsed * fps));
        if (frame > lastFrame) {
          lastFrame = frame;
          render({ context, canvas, time: elapsed, frame, delta: 1 / fps });
          onProgress?.(Math.min(1, elapsed / audioBuffer.duration));
        }
        animationFrame = requestAnimationFrame(tick);
      };
      animationFrame = requestAnimationFrame(tick);
      const blob = await recorded;
      settled = true;
      return { blob, mimeType: blob.type || mimeType, extension: '.webm', mode: 'realtime' };
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  } finally {
    cancelAnimationFrame(animationFrame);
    if (!settled && recorder.state !== 'inactive') recorder.stop();
    if (started) { try { source.stop(); } catch {} }
    stream.getTracks().forEach(track => track.stop());
    canvas.width = 0;
    canvas.height = 0;
  }
}

export function downloadVideo({ buffer, blob: recordedBlob, mimeType, extension }, name) {
  const blob = recordedBlob || new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name || 'visualization'}${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
