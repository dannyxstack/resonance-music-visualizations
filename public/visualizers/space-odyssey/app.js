import { loadLocalAudio, audioErrorMessage } from '../perth/local-audio.js';
import { BPM_METHODS, ENERGY_METHODS, fillMethodSelect, analyzeByMethod, beatEnergyAt, energyByMethod, firstBeatOffset } from '../shared/analysis.js';
import { travelingDepth, roadPoint, movingStar } from './scene-motion.js';
import { registerScene } from '../shared/scene.js';
import { bindAnalysisSummary, bindPreviewFullscreen } from '../shared/workspace.js';
import { analyzeLowFrequencyFile, updateLowFrequencyLevel } from '../shared/low-envelope.js';

const $ = id => document.getElementById(id);
const root = $('odyssey');
const canvas = $('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const audio = $('player');
const BAR_COUNT = 72;
const levels = new Float32Array(BAR_COUNT);
const state = {
  width: 0, height: 0, dpr: 1, frame: 0,
  context: null, analyser: null, spectrum: null,
  selection: null, audioFile: null, audioUrl: null, audioReady: false, pending: false,
  analysisToken: 0, bpm: null,
  lowEnvelope: null, lowLevel: 0, lowToken: 0, lastFrameTime: 0,
  backgroundToken: 0, backgroundUrl: null, backgroundImage: null,
  backgroundCanvas: document.createElement('canvas'),
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function setStatus(id, message, error = false) {
  $(id).textContent = message;
  $(id).classList.toggle('is-error', error);
}

function syncControls() {
  const playing = state.audioReady && !audio.paused && !audio.ended;
  root.classList.toggle('is-playing', playing);
  $('playButton').textContent = playing ? 'Ⅱ' : '▶';
  $('playButton').setAttribute('aria-label', playing ? '暂停' : '播放');
  $('playButton').disabled = !state.audioReady || state.pending;
  $('seek').disabled = !state.audioReady;
  $('currentTime').textContent = formatTime(audio.currentTime);
  $('duration').textContent = formatTime(audio.duration);
  $('seek').value = Number.isFinite(audio.duration) && audio.duration > 0 ? String(Math.round(audio.currentTime / audio.duration * 1000)) : '0';
}

function syncSettings() {
  for (const id of ['volume', 'sensitivity', 'glow', 'dim']) $(`${id}Value`).textContent = `${$(id).value}%`;
  $('starsValue').textContent = $('stars').value;
  audio.volume = Number($('volume').value) / 100;
  renderBackgroundCache();
  try {
    localStorage.setItem('resonance:space-odyssey', JSON.stringify({
      volume: $('volume').value, sensitivity: $('sensitivity').value,
      glow: $('glow').value, dim: $('dim').value, stars: $('stars').value, bpmMethod: $('bpmMethod').value,
      leftEnergyMethod: $('leftEnergyMethod').value, rightEnergyMethod: $('rightEnergyMethod').value,
    }));
  } catch {}
}

function setPanel(open) {
  root.classList.toggle('panel-collapsed', !open);
  $('controlPanel').inert = !open;
  $('panelToggle').setAttribute('aria-expanded', String(open));
  $('panelToggle').innerHTML = open ? '收起面板 <span aria-hidden="true">⌃</span>' : '展开面板 <span aria-hidden="true">⌄</span>';
  if (!open && $('controlPanel').contains(document.activeElement)) $('panelToggle').focus();
}

function ensureAudioGraph() {
  if (!state.context) {
    state.context = new AudioContext();
    state.analyser = state.context.createAnalyser();
    state.analyser.fftSize = 2048;
    state.analyser.smoothingTimeConstant = .72;
    state.spectrum = new Uint8Array(state.analyser.frequencyBinCount);
    const source = state.context.createMediaElementSource(audio);
    source.connect(state.analyser);
    state.analyser.connect(state.context.destination);
  }
  return state.context;
}

function showBpm(result, message) {
  $('bpmValue').textContent = result ? result.bpm.toFixed(1) : '--';
  $('firstBeatOffset').textContent = result ? `${firstBeatOffset(result).toFixed(2)} 秒` : '-- 秒';
  $('transportBpm').textContent = $('bpmValue').textContent;
  $('transportOffset').textContent = $('firstBeatOffset').textContent;
  setStatus('bpmStatus', message);
}

async function runBpmAnalysis() {
  if (!state.audioReady || !state.audioFile) return;
  const token = ++state.analysisToken;
  const file = state.audioFile;
  const method = $('bpmMethod').value;
  const label = $('bpmMethod').selectedOptions[0].textContent;
  state.bpm = null;
  $('reanalyzeBpm').disabled = true;
  showBpm(null, `正在用「${label}」分析…`);
  let context;
  try {
    const bytes = await file.arrayBuffer();
    if (token !== state.analysisToken) return;
    context = new AudioContext();
    const decoded = await context.decodeAudioData(bytes);
    if (token !== state.analysisToken) return;
    const result = await analyzeByMethod(decoded, method, () => token !== state.analysisToken, progress => {
      if (token === state.analysisToken) setStatus('bpmStatus', `正在分析… ${Math.round(progress * 100)}%`);
    });
    if (token !== state.analysisToken) return;
    state.bpm = result;
    if (result) {
      const quality = result.confidence >= .45 ? '较稳定' : result.confidence >= .2 ? '一般' : '较低';
      showBpm(result, method === 'beat-grid'
        ? `${label} · 检出 ${result.beats.length} 个节拍点 · 可信度${quality}`
        : `${label} · 节奏可信度${quality}；按全曲固定 BPM 跳动。`);
    } else {
      showBpm(null, '未检测到稳定节奏。可更换方法后重新分析。');
    }
  } catch {
    if (token === state.analysisToken) showBpm(null, '分析失败；音乐仍可播放，可换方法重试。');
  } finally {
    if (context) void context.close();
    if (token === state.analysisToken) $('reanalyzeBpm').disabled = !state.audioReady;
  }
}

async function runLowEnvelopeAnalysis(file) {
  const token = ++state.lowToken;
  state.lowEnvelope = null;
  state.lowLevel = 0;
  setStatus('lowEnvelopeStatus', '正在分析 20–130 Hz 低频包络…');
  try {
    const env = await analyzeLowFrequencyFile(file, () => token !== state.lowToken, progress => {
      if (token === state.lowToken) setStatus('lowEnvelopeStatus', `低频包络分析中… ${Math.round(progress * 100)}%`);
    });
    if (token === state.lowToken) {
      state.lowEnvelope = env;
      setStatus('lowEnvelopeStatus', env ? '低频包络已就绪 · 100 帧/秒' : '低频包络分析已取消');
    }
  } catch {
    if (token === state.lowToken) setStatus('lowEnvelopeStatus', '低频包络分析失败，改用实时能量', true);
  }
}

async function playSelected(selection) {
  if (!state.audioReady || state.pending) return;
  state.pending = true;
  syncControls();
  try {
    const context = ensureAudioGraph();
    if (context.state === 'suspended') await context.resume();
    if (selection.signal.aborted) return;
    await audio.play();
    if (!selection.signal.aborted) setStatus('audioStatus', '正在播放 · 已自动启动');
  } catch (error) {
    if (!selection.signal.aborted) setStatus('audioStatus', `${audioErrorMessage(error)} 可点击播放按钮重试。`, true);
  } finally {
    if (selection === state.selection) { state.pending = false; syncControls(); }
  }
}

async function selectAudio(file) {
  state.analysisToken++;
  state.lowToken++;
  state.lowEnvelope = null;
  state.lowLevel = 0;
  setStatus('lowEnvelopeStatus', '等待音频加载…');
  state.bpm = null;
  showBpm(null, '等待音频加载…');
  $('reanalyzeBpm').disabled = true;
  state.selection?.abort();
  const selection = new AbortController();
  state.selection = selection;
  state.audioReady = false;
  state.pending = false;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = null;
  state.audioFile = file;
  levels.fill(0);
  $('trackName').textContent = file.name;
  setStatus('audioStatus', '正在加载本地音乐…');
  syncControls();
  // Start the audio context from the file-selection gesture when possible.
  try { void ensureAudioGraph().resume().catch(() => {}); } catch {}
  try {
    const loading = loadLocalAudio(audio, file, {
      signal: selection.signal,
      getContext: ensureAudioGraph,
      onFallback: () => setStatus('audioStatus', '正在尝试浏览器兼容解码…'),
    });
    // The first play attempt stays in the picker gesture; retry after canplay if needed.
    void audio.play().catch(() => {});
    const url = await loading;
    if (selection.signal.aborted) { URL.revokeObjectURL(url); return; }
    state.audioUrl = url;
    state.audioReady = true;
    syncControls();
    setStatus('audioStatus', '音频已就绪 · 正在自动播放');
    void runBpmAnalysis();
    void runLowEnvelopeAnalysis(file);
    void playSelected(selection);
  } catch (error) {
    if (!selection.signal.aborted) {
      setStatus('audioStatus', audioErrorMessage(error), true);
      showBpm(null, '音频加载失败，无法分析 BPM。');
    }
  }
}

function setBackground(url, objectUrl = null) {
  const token = ++state.backgroundToken;
  const image = new Image();
  image.onload = () => {
    if (token !== state.backgroundToken) { if (objectUrl) URL.revokeObjectURL(objectUrl); return; }
    if (state.backgroundUrl) URL.revokeObjectURL(state.backgroundUrl);
    state.backgroundUrl = objectUrl;
    state.backgroundImage = image;
    renderBackgroundCache();
  };
  image.onerror = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (token === state.backgroundToken) setStatus('audioStatus', '无法读取这张背景图片，请选择其他图片。', true);
  };
  image.src = url;
}

function renderBackgroundCache() {
  const image = state.backgroundImage;
  if (!state.width || !image?.naturalWidth) return;
  const cache = state.backgroundCanvas;
  cache.width = Math.round(state.width * state.dpr);
  cache.height = Math.round(state.height * state.dpr);
  const bg = cache.getContext('2d');
  const scale = Math.max(cache.width / image.naturalWidth, cache.height / image.naturalHeight);
  const iw = image.naturalWidth * scale;
  const ih = image.naturalHeight * scale;
  bg.fillStyle = '#050713';
  bg.fillRect(0, 0, cache.width, cache.height);
  bg.drawImage(image, (cache.width - iw) / 2, (cache.height - ih) / 2, iw, ih);
  bg.fillStyle = `rgba(2, 4, 13, ${Number($('dim').value) / 100})`;
  bg.fillRect(0, 0, cache.width, cache.height);
  const vignette = bg.createRadialGradient(cache.width * .47, cache.height * .45, cache.width * .1, cache.width * .47, cache.height * .45, cache.width * .75);
  vignette.addColorStop(0, '#00000000');
  vignette.addColorStop(1, '#02030baa');
  bg.fillStyle = vignette;
  bg.fillRect(0, 0, cache.width, cache.height);
}

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 1.7);
  const bounds = $('scenePreview').getBoundingClientRect();
  state.width = Math.max(1, bounds.width);
  state.height = Math.max(1, bounds.height);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  renderBackgroundCache();
}

function roadGeometry() {
  return depth => roadPoint(depth, state.width, state.height, false);
}

function drawRail(pointAt, side, glow) {
  const path = () => {
    const far = pointAt(0);
    const near = pointAt(1);
    ctx.beginPath();
    ctx.moveTo(far[side], far.y);
    ctx.lineTo(near[side], near.y);
  };
  const color = side === 'left' ? '#74edff' : '#ff8df6';
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 22 * glow;
  ctx.strokeStyle = side === 'left' ? `rgba(57, 178, 255, ${.24 * glow})` : `rgba(221, 82, 255, ${.24 * glow})`;
  ctx.lineWidth = 14 * glow;
  path(); ctx.stroke();
  ctx.shadowBlur = 11 * glow;
  ctx.lineWidth = 3.1;
  ctx.strokeStyle = color;
  path(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ffffffb8';
  path(); ctx.stroke();
  ctx.restore();
}

function drawRoad(pointAt, beatPulse, time) {
  const near = pointAt(1);
  const far = pointAt(0);
  const glow = Number($('glow').value) / 75 * (1 + beatPulse * .2);
  const roadFill = ctx.createLinearGradient(0, far.y, 0, near.y);
  roadFill.addColorStop(0, '#0c1e3b20');
  roadFill.addColorStop(1, '#020513b0');
  ctx.beginPath();
  ctx.moveTo(far.left, far.y);
  ctx.lineTo(near.left, near.y);
  ctx.lineTo(near.right, near.y);
  ctx.lineTo(far.right, far.y);
  ctx.closePath();
  ctx.fillStyle = roadFill;
  ctx.fill();

  ctx.save();
  ctx.lineWidth = 1;
  for (let i = 0; i < 22; i++) {
    const depth = travelingDepth(i, 22, time);
    const p = pointAt(depth);
    ctx.strokeStyle = `rgba(132, 160, 225, ${.035 + depth * .15 + beatPulse * .03})`;
    ctx.beginPath(); ctx.moveTo(p.left, p.y); ctx.lineTo(p.right, p.y); ctx.stroke();
  }
  ctx.setLineDash([10, 20]);
  ctx.lineDashOffset = -time * 65;
  ctx.strokeStyle = `rgba(177, 195, 255, ${.18 + beatPulse * .16})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(far.center, far.y); ctx.lineTo(near.center, near.y); ctx.stroke();
  ctx.restore();
  drawRail(pointAt, 'left', glow);
  drawRail(pointAt, 'right', glow);
}

function updateSpectrum() {
  const active = state.audioReady && !audio.paused && !audio.ended && state.analyser && state.context.state === 'running';
  if (active) state.analyser.getByteFrequencyData(state.spectrum);
  const sensitivity = Number($('sensitivity').value) / 100;
  for (let i = 0; i < BAR_COUNT; i++) {
    let target = 0;
    if (active) {
      const frequency = 45 * (11000 / 45) ** (i / (BAR_COUNT - 1));
      const hzPerBin = state.context.sampleRate / state.analyser.fftSize;
      const bin = Math.max(1, Math.min(state.spectrum.length - 2, Math.round(frequency / hzPerBin)));
      target = (state.spectrum[bin - 1] + state.spectrum[bin] + state.spectrum[bin + 1]) / (3 * 255) * sensitivity;
    }
    levels[i] += (target - levels[i]) * (target > levels[i] ? .34 : .095);
  }
}

function drawBars(pointAt, beatPulse, time) {
  const glow = Number($('glow').value) / 75;
  const order = Array.from({ length: BAR_COUNT }, (_, index) => index)
    .sort((a, b) => travelingDepth(a, BAR_COUNT, time) - travelingDepth(b, BAR_COUNT, time));
  for (const i of order) {
    const depth = travelingDepth(i, BAR_COUNT, time);
    const p = pointAt(depth);
    const width = 1.2 + depth * 5.2;
    for (const side of ['left', 'right']) {
      const method = $(side === 'left' ? 'leftEnergyMethod' : 'rightEnergyMethod').value;
      const strength = energyByMethod(method, levels[i], beatPulse, Boolean(state.bpm), state.lowLevel, Boolean(state.lowEnvelope));
      const length = Math.min(p.half * .82, p.half * (.07 + strength * .68));
      const from = p[side];
      const to = from + (side === 'left' ? length : -length);
      const color = side === 'left' ? '#80dfff' : '#f4a5fc';
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = (6 + depth * 14) * glow;
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.globalAlpha = (.5 + depth * .35 + beatPulse * .08) * Math.min(1, depth * 12);
      ctx.beginPath(); ctx.moveTo(from, p.y); ctx.lineTo(to, p.y); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1, width * .34);
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = (.36 + strength * .32) * Math.min(1, depth * 12);
      ctx.beginPath(); ctx.moveTo(from, p.y); ctx.lineTo(to, p.y); ctx.stroke();
      ctx.restore();
    }
  }
}

function drawStars(time) {
  const count = Number($('stars').value);
  for (let index = 0; index < count; index++) {
    const star = movingStar(index, time, state.width, state.height);
    if (star.alpha < .01) continue;
    ctx.save();
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = star.brightness > .7 ? '#eff7ff' : '#b8d6ff';
    ctx.shadowColor = star.brightness > .7 ? '#b0daff' : '#799cde';
    ctx.shadowBlur = star.radius * (4 + star.brightness * 4);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    if (star.brightness > .84) {
      ctx.strokeStyle = '#d9edff';
      ctx.lineWidth = .65;
      ctx.beginPath();
      ctx.moveTo(star.x - star.radius * 3, star.y);
      ctx.lineTo(star.x + star.radius * 3, star.y);
      ctx.moveTo(star.x, star.y - star.radius * 3);
      ctx.lineTo(star.x, star.y + star.radius * 3);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function renderScene(time, dt) {
  state.lowLevel = updateLowFrequencyLevel(state.lowEnvelope, time, state.audioReady && !audio.paused && !audio.ended, dt, state.lowLevel);
  const { width: w, height: h } = state;
  if (!w || !h) return;
  if (state.backgroundImage?.naturalWidth) ctx.drawImage(state.backgroundCanvas, 0, 0, w, h);
  else { ctx.fillStyle = '#050713'; ctx.fillRect(0, 0, w, h); }
  drawStars(time);

  let beatPulse = 0;
  if (state.bpm && state.audioReady && !audio.paused && !audio.ended) {
    beatPulse = beatEnergyAt(state.bpm, time);
  }
  const visualPulse = state.lowEnvelope && ($('leftEnergyMethod').value === 'low-envelope' || $('rightEnergyMethod').value === 'low-envelope')
    ? state.lowLevel : beatPulse;
  root.style.setProperty('--beat-pulse', visualPulse.toFixed(3));
  const pointAt = roadGeometry();
  updateSpectrum();
  drawRoad(pointAt, visualPulse, time);
  drawBars(pointAt, beatPulse, time);
}

function drawFrame(now) {
  state.frame = requestAnimationFrame(drawFrame);
  const dt = state.lastFrameTime ? Math.min(0.1, (now - state.lastFrameTime) / 1000) : 0;
  state.lastFrameTime = now;
  renderScene(state.audioReady ? audio.currentTime : 0, dt);
}

let savedSettings = {};
try {
  const saved = JSON.parse(localStorage.getItem('resonance:space-odyssey') || '{}');
  savedSettings = saved;
  for (const id of ['volume', 'sensitivity', 'glow', 'dim', 'stars']) {
    if (Number.isFinite(Number(saved[id]))) $(id).value = saved[id];
  }
} catch {}

fillMethodSelect($('bpmMethod'), BPM_METHODS, savedSettings.bpmMethod || 'beat-grid');
fillMethodSelect($('leftEnergyMethod'), ENERGY_METHODS, savedSettings.leftEnergyMethod || 'live');
fillMethodSelect($('rightEnergyMethod'), ENERGY_METHODS, savedSettings.rightEnergyMethod || 'mix');

for (const id of ['volume', 'sensitivity', 'glow', 'dim', 'stars']) $(id).addEventListener('input', syncSettings);
for (const id of ['leftEnergyMethod', 'rightEnergyMethod']) $(id).addEventListener('change', syncSettings);
$('bpmMethod').addEventListener('change', () => {
  syncSettings();
  if (!state.audioReady) return;
  if (!state.bpm) {
    state.analysisToken++;
    $('reanalyzeBpm').disabled = false;
    setStatus('bpmStatus', '已切换方法，点击重新分析 BPM。');
  } else setStatus('bpmStatus', '当前显示上次结果，点击重新分析 BPM 更新。');
});
$('reanalyzeBpm').addEventListener('click', () => void runBpmAnalysis());
$('audioFile').addEventListener('change', event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (file) void selectAudio(file);
});
$('playButton').addEventListener('click', () => {
  if (!state.audioReady || state.pending) return;
  if (!audio.paused) { audio.pause(); setStatus('audioStatus', '已暂停'); syncControls(); }
  else void playSelected(state.selection);
});
$('seek').addEventListener('input', event => {
  if (state.audioReady && Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value) / 1000 * audio.duration;
});
$('backgroundFile').addEventListener('change', event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const url = URL.createObjectURL(file);
  setBackground(url, url);
});
$('resetBackground').addEventListener('click', () => setBackground('nebula.png'));
$('panelToggle').addEventListener('click', () => setPanel(root.classList.contains('panel-collapsed')));
$('closePanel').addEventListener('click', () => setPanel(false));
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
  if (event.key.toLowerCase() === 'h') { event.preventDefault(); setPanel(root.classList.contains('panel-collapsed')); }
  if (event.code === 'Space' && !event.repeat && event.target?.tagName !== 'BUTTON') {
    event.preventDefault(); $('playButton').click();
  }
});
audio.addEventListener('timeupdate', syncControls);
audio.addEventListener('loadedmetadata', syncControls);
audio.addEventListener('playing', syncControls);
audio.addEventListener('pause', syncControls);
audio.addEventListener('ended', () => { syncControls(); setStatus('audioStatus', '播放结束'); });
audio.addEventListener('error', () => {
  if (!state.audioReady) return;
  state.audioReady = false;
  syncControls();
  setStatus('audioStatus', audioErrorMessage(audio.error), true);
});
window.addEventListener('resize', resize);
window.addEventListener('pagehide', () => {
  state.analysisToken++;
  state.selection?.abort();
  audio.pause();
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  if (state.backgroundUrl) URL.revokeObjectURL(state.backgroundUrl);
  cancelAnimationFrame(state.frame);
  void state.context?.close();
});

setPanel(!window.matchMedia('(max-width: 640px)').matches);
syncSettings();
resize();
setBackground('nebula.png');
registerScene({ canvas, resize, renderFrame: renderScene, getTime: () => audio.currentTime || 0 });
bindAnalysisSummary($('bpmStatus'), $('lowEnvelopeStatus'), $('transportAnalysis'));
bindPreviewFullscreen($('scenePreview'), $('fullscreenPreview'));
new ResizeObserver(resize).observe($('scenePreview'));
state.frame = requestAnimationFrame(drawFrame);
