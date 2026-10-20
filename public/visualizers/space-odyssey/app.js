import { loadLocalAudio, audioErrorMessage } from '../perth/local-audio.js';
import { BPM_METHODS, ENERGY_METHODS, fillMethodSelect, analyzeByMethod, beatEnergyAt, energyByMethod, firstBeatOffset } from '../shared/analysis.js';
import { travelingDepth, roadPoint, movingStar } from './scene-motion.js';
import { registerScene } from '../shared/scene.js';
import { bindAnalysisSummary, bindPreviewFullscreen } from '../shared/workspace.js';
import { analyzeLowFrequencyFile, buildLowFrequencyDrive, sampleLowFrequencyDrive, updateLowFrequencyLevel } from '../shared/low-envelope.js';
import { analyzeOfflineSpectrum } from '../shared/offline-spectrum.js';
import { drawTextOverlay } from '../shared/text-overlay.js';
import { exportCanvasVideo, downloadVideo } from '../shared/video-export.js?v=export-3';
import { drawDancer } from './dancer.js';
import { drawVideoDancer, loadVideoDancer } from './video-dancer.js';

const $ = id => document.getElementById(id);
const root = $('odyssey');
const canvas = $('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const audio = $('player');
const BAR_COUNT = 72;
const levels = new Float32Array(BAR_COUNT);
let drawing = null;
const state = {
  width: 0, height: 0, dpr: 1, frame: 0,
  context: null, analyser: null, spectrum: null,
  selection: null, audioFile: null, audioUrl: null, audioReady: false, pending: false,
  analysisToken: 0, bpm: null,
  lowEnvelope: null, lowDrive: null, lowLevel: 0, lowToken: 0, lastFrameTime: 0,
  backgroundToken: 0, backgroundUrl: null, backgroundImage: null,
  backgroundCanvas: document.createElement('canvas'),
  bpmPromise: null, lowPromise: null, exportController: null,
};

function sceneSettings() {
  return {
    sensitivity: Number($('sensitivity').value) / 100,
    glow: Number($('glow').value) / 75,
    dim: Number($('dim').value) / 100,
    stars: Number($('stars').value),
    leftEnergyMethod: $('leftEnergyMethod').value,
    rightEnergyMethod: $('rightEnergyMethod').value,
    dancerMode: $('dancerMode').value,
    dancerStyle: $('dancerStyle').value,
    dancerSize: Number($('dancerSize').value) / 100,
    dancerDepth: Number($('dancerDepth').value) / 100,
    dancerMotion: Number($('dancerMotion').value) / 100,
    dancerGlow: Number($('dancerGlow').value) / 100,
    text: {
      enabled: $('showText').checked,
      title: $('sceneTitle').value,
      subtitle: $('sceneSubtitle').value,
      author: $('sceneAuthor').value,
      position: $('textPosition').value,
      color: $('textColor').value,
    },
  };
}

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
  $('exportVideo').disabled = !state.audioReady || Boolean(state.exportController);
}

function syncSettings() {
  for (const id of ['volume', 'sensitivity', 'glow', 'dim']) $(`${id}Value`).textContent = `${$(id).value}%`;
  $('starsValue').textContent = $('stars').value;
  for (const id of ['dancerSize', 'dancerDepth', 'dancerMotion', 'dancerGlow']) $(`${id}Value`).textContent = `${$(id).value}%`;
  const videoMode = $('dancerMode').value === 'video';
  $('dancerStyle').disabled = videoMode;
  $('dancerMotion').disabled = videoMode;
  audio.volume = Number($('volume').value) / 100;
  renderBackgroundCache();
  try {
    localStorage.setItem('resonance:space-odyssey', JSON.stringify({
      volume: $('volume').value, sensitivity: $('sensitivity').value,
      glow: $('glow').value, dim: $('dim').value, stars: $('stars').value, bpmMethod: $('bpmMethod').value,
      leftEnergyMethod: $('leftEnergyMethod').value, rightEnergyMethod: $('rightEnergyMethod').value,
      dancerMode: $('dancerMode').value, dancerStyle: $('dancerStyle').value, dancerSize: $('dancerSize').value, dancerDepth: $('dancerDepth').value,
      dancerMotion: $('dancerMotion').value, dancerGlow: $('dancerGlow').value,
      showText: $('showText').checked, sceneTitle: $('sceneTitle').value,
      sceneSubtitle: $('sceneSubtitle').value, sceneAuthor: $('sceneAuthor').value,
      textPosition: $('textPosition').value, textColor: $('textColor').value,
      exportSize: $('exportSize').value, exportFps: $('exportFps').value, exportMode: $('exportMode').value,
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
  state.lowDrive = null;
  state.lowLevel = 0;
  setStatus('lowEnvelopeStatus', '正在分析 20–130 Hz 低频包络…');
  try {
    const env = await analyzeLowFrequencyFile(file, () => token !== state.lowToken, progress => {
      if (token === state.lowToken) setStatus('lowEnvelopeStatus', `低频包络分析中… ${Math.round(progress * 100)}%`);
    });
    if (token === state.lowToken) {
      state.lowEnvelope = env;
      state.lowDrive = buildLowFrequencyDrive(env);
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
  state.exportController?.abort();
  state.analysisToken++;
  state.lowToken++;
  state.lowEnvelope = null;
  state.lowDrive = null;
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
    state.bpmPromise = runBpmAnalysis();
    state.lowPromise = runLowEnvelopeAnalysis(file);
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
  paintBackgroundCache(state.backgroundCanvas, Math.round(state.width * state.dpr), Math.round(state.height * state.dpr), image, Number($('dim').value) / 100);
}

function paintBackgroundCache(cache, width, height, image, dim) {
  cache.width = width;
  cache.height = height;
  const bg = cache.getContext('2d');
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const iw = image.naturalWidth * scale;
  const ih = image.naturalHeight * scale;
  bg.fillStyle = '#050713';
  bg.fillRect(0, 0, cache.width, cache.height);
  bg.drawImage(image, (cache.width - iw) / 2, (cache.height - ih) / 2, iw, ih);
  bg.fillStyle = `rgba(2, 4, 13, ${dim})`;
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
  return depth => roadPoint(depth, drawing.width, drawing.height, false);
}

function drawRail(pointAt, side, glow) {
  const path = () => {
    const far = pointAt(0);
    const near = pointAt(1);
    drawing.ctx.beginPath();
    drawing.ctx.moveTo(far[side], far.y);
    drawing.ctx.lineTo(near[side], near.y);
  };
  const color = side === 'left' ? '#74edff' : '#ff8df6';
  drawing.ctx.save();
  drawing.ctx.shadowColor = color;
  drawing.ctx.shadowBlur = 22 * glow;
  drawing.ctx.strokeStyle = side === 'left' ? `rgba(57, 178, 255, ${.24 * glow})` : `rgba(221, 82, 255, ${.24 * glow})`;
  drawing.ctx.lineWidth = 14 * glow;
  path(); drawing.ctx.stroke();
  drawing.ctx.shadowBlur = 11 * glow;
  drawing.ctx.lineWidth = 3.1;
  drawing.ctx.strokeStyle = color;
  path(); drawing.ctx.stroke();
  drawing.ctx.shadowBlur = 0;
  drawing.ctx.lineWidth = 1;
  drawing.ctx.strokeStyle = '#ffffffb8';
  path(); drawing.ctx.stroke();
  drawing.ctx.restore();
}

function drawRoad(pointAt, beatPulse, time) {
  const near = pointAt(1);
  const far = pointAt(0);
  const glow = drawing.settings.glow * (1 + beatPulse * .2);
  const roadFill = drawing.ctx.createLinearGradient(0, far.y, 0, near.y);
  roadFill.addColorStop(0, '#0c1e3b20');
  roadFill.addColorStop(1, '#020513b0');
  drawing.ctx.beginPath();
  drawing.ctx.moveTo(far.left, far.y);
  drawing.ctx.lineTo(near.left, near.y);
  drawing.ctx.lineTo(near.right, near.y);
  drawing.ctx.lineTo(far.right, far.y);
  drawing.ctx.closePath();
  drawing.ctx.fillStyle = roadFill;
  drawing.ctx.fill();

  drawing.ctx.save();
  drawing.ctx.lineWidth = 1;
  for (let i = 0; i < 22; i++) {
    const depth = travelingDepth(i, 22, time);
    const p = pointAt(depth);
    drawing.ctx.strokeStyle = `rgba(132, 160, 225, ${.035 + depth * .15 + beatPulse * .03})`;
    drawing.ctx.beginPath(); drawing.ctx.moveTo(p.left, p.y); drawing.ctx.lineTo(p.right, p.y); drawing.ctx.stroke();
  }
  drawing.ctx.setLineDash([10, 20]);
  drawing.ctx.lineDashOffset = -time * 65;
  drawing.ctx.strokeStyle = `rgba(177, 195, 255, ${.18 + beatPulse * .16})`;
  drawing.ctx.lineWidth = 1.3;
  drawing.ctx.beginPath(); drawing.ctx.moveTo(far.center, far.y); drawing.ctx.lineTo(near.center, near.y); drawing.ctx.stroke();
  drawing.ctx.restore();
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

function drawBars(pointAt, beatPulse, time, minDepth = 0, maxDepth = 1) {
  const glow = drawing.settings.glow;
  const order = Array.from({ length: BAR_COUNT }, (_, index) => index)
    .sort((a, b) => travelingDepth(a, BAR_COUNT, time) - travelingDepth(b, BAR_COUNT, time));
  for (const i of order) {
    const depth = travelingDepth(i, BAR_COUNT, time);
    if (depth < minDepth || depth >= maxDepth) continue;
    const p = pointAt(depth);
    const width = 1.2 + depth * 5.2;
    for (const side of ['left', 'right']) {
      const method = side === 'left' ? drawing.settings.leftEnergyMethod : drawing.settings.rightEnergyMethod;
      const strength = energyByMethod(method, drawing.levels[i], beatPulse, Boolean(drawing.bpm), drawing.lowLevel, Boolean(drawing.lowEnvelope),
        { drive: drawing.lowDrive, time, index: i, count: BAR_COUNT, playing: drawing.playing });
      const length = Math.min(p.half * .82, p.half * (.07 + strength * .68));
      const from = p[side];
      const to = from + (side === 'left' ? length : -length);
      const color = side === 'left' ? '#80dfff' : '#f4a5fc';
      drawing.ctx.save();
      drawing.ctx.lineCap = 'round';
      drawing.ctx.shadowColor = color;
      drawing.ctx.shadowBlur = (6 + depth * 14) * glow;
      drawing.ctx.lineWidth = width;
      drawing.ctx.strokeStyle = color;
      drawing.ctx.globalAlpha = (.5 + depth * .35 + beatPulse * .08) * Math.min(1, depth * 12);
      drawing.ctx.beginPath(); drawing.ctx.moveTo(from, p.y); drawing.ctx.lineTo(to, p.y); drawing.ctx.stroke();
      drawing.ctx.shadowBlur = 0;
      drawing.ctx.lineWidth = Math.max(1, width * .34);
      drawing.ctx.strokeStyle = '#fff';
      drawing.ctx.globalAlpha = (.36 + strength * .32) * Math.min(1, depth * 12);
      drawing.ctx.beginPath(); drawing.ctx.moveTo(from, p.y); drawing.ctx.lineTo(to, p.y); drawing.ctx.stroke();
      drawing.ctx.restore();
    }
  }
}

function drawRoadDancer(pointAt, time, beatPulse) {
  const mode = drawing.settings.dancerMode;
  if (mode === 'off') return;
  const depth = drawing.settings.dancerDepth;
  const point = pointAt(depth);
  const height = Math.min(point.half * .8, drawing.height * .35) * drawing.settings.dancerSize;
  const energy = drawing.lowDrive ? sampleLowFrequencyDrive(drawing.lowDrive, time)
    : Math.max(beatPulse, (drawing.levels[0] + drawing.levels[1] + drawing.levels[2]) / 3);
  const draw = mode === 'video' ? drawVideoDancer : drawDancer;
  draw(drawing.ctx, {
    mode, style: drawing.settings.dancerStyle, x: point.center, y: point.y, height, time,
    bpm: drawing.bpm?.confidence >= .2 ? drawing.bpm.bpm : 110,
    firstBeatTime: firstBeatOffset(drawing.bpm) || 0,
    energy, motion: drawing.settings.dancerMotion,
    glow: drawing.settings.dancerGlow,
  });
}

function drawStars(time) {
  const count = drawing.settings.stars;
  for (let index = 0; index < count; index++) {
    const star = movingStar(index, time, drawing.width, drawing.height);
    if (star.alpha < .01) continue;
    drawing.ctx.save();
    drawing.ctx.globalAlpha = star.alpha;
    drawing.ctx.fillStyle = star.brightness > .7 ? '#eff7ff' : '#b8d6ff';
    drawing.ctx.shadowColor = star.brightness > .7 ? '#b0daff' : '#799cde';
    drawing.ctx.shadowBlur = star.radius * (4 + star.brightness * 4);
    drawing.ctx.beginPath();
    drawing.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    drawing.ctx.fill();
    if (star.brightness > .84) {
      drawing.ctx.strokeStyle = '#d9edff';
      drawing.ctx.lineWidth = .65;
      drawing.ctx.beginPath();
      drawing.ctx.moveTo(star.x - star.radius * 3, star.y);
      drawing.ctx.lineTo(star.x + star.radius * 3, star.y);
      drawing.ctx.moveTo(star.x, star.y - star.radius * 3);
      drawing.ctx.lineTo(star.x, star.y + star.radius * 3);
      drawing.ctx.stroke();
    }
    drawing.ctx.restore();
  }
}

function renderScene(time, dt, surface = null, features = null, settings = null) {
  const exporting = Boolean(features);
  const playing = exporting || (state.audioReady && !audio.paused && !audio.ended);
  if (!exporting) {
    state.lowLevel = updateLowFrequencyLevel(state.lowEnvelope, time, playing, dt, state.lowLevel);
    updateSpectrum();
  }
  drawing = {
    ctx: surface?.context || ctx,
    width: surface?.width || state.width,
    height: surface?.height || state.height,
    background: surface?.background || state.backgroundCanvas,
    backgroundReady: surface ? Boolean(surface.backgroundReady) : Boolean(state.backgroundImage?.naturalWidth),
    levels: features?.levels || levels,
    lowLevel: exporting ? sampleLowFrequencyDrive(features.lowDrive, time) : state.lowLevel,
    lowDrive: exporting ? features.lowDrive : state.lowDrive,
    lowEnvelope: exporting ? features.lowEnvelope : state.lowEnvelope,
    bpm: exporting ? features.bpm : state.bpm,
    playing,
    settings: settings || sceneSettings(),
  };
  const { width: w, height: h } = drawing;
  if (!w || !h) return;
  if (drawing.backgroundReady) drawing.ctx.drawImage(drawing.background, 0, 0, w, h);
  else { drawing.ctx.fillStyle = '#050713'; drawing.ctx.fillRect(0, 0, w, h); }
  drawStars(time);

  let beatPulse = 0;
  if (drawing.bpm && playing) {
    beatPulse = beatEnergyAt(drawing.bpm, time);
  }
  const visualPulse = drawing.lowEnvelope && (drawing.settings.leftEnergyMethod === 'low-envelope' || drawing.settings.rightEnergyMethod === 'low-envelope')
    ? drawing.lowLevel : beatPulse;
  if (!exporting) root.style.setProperty('--beat-pulse', visualPulse.toFixed(3));
  const pointAt = roadGeometry();
  drawRoad(pointAt, visualPulse, time);
  if (drawing.settings.dancerMode === 'off') drawBars(pointAt, beatPulse, time);
  else {
    const depth = drawing.settings.dancerDepth;
    drawBars(pointAt, beatPulse, time, 0, depth);
    drawRoadDancer(pointAt, time, beatPulse);
    drawBars(pointAt, beatPulse, time, depth, 1);
  }
  drawTextOverlay(drawing.ctx, w, h, drawing.settings.text);
}

function drawFrame(now) {
  state.frame = requestAnimationFrame(drawFrame);
  const dt = state.lastFrameTime ? Math.min(0.1, (now - state.lastFrameTime) / 1000) : 0;
  state.lastFrameTime = now;
  if (!state.exportController) renderScene(state.audioReady ? audio.currentTime : 0, dt);
}

function exportStatus(message, percentage = null, error = false) {
  setStatus('exportStatus', message, error);
  if (percentage !== null) {
    $('exportProgress').hidden = false;
    $('exportProgress').value = Math.max(0, Math.min(100, percentage));
  }
}

async function startExport() {
  if (!state.audioReady || !state.audioFile || state.exportController) return;
  const file = state.audioFile;
  const settings = sceneSettings();
  const [width, height] = $('exportSize').value.split('x').map(Number);
  const fps = Number($('exportFps').value);
  const exportMode = $('exportMode').value;
  const controller = new AbortController();
  state.exportController = controller;
  const resumePlayback = !audio.paused && !audio.ended;
  audio.pause();
  $('cancelExport').hidden = false;
  exportStatus('正在等待节奏分析…', 0);
  syncControls();
  let decodeContext;
  let activeExportMode = exportMode === 'realtime' || (exportMode === 'auto' && typeof VideoEncoder === 'undefined') ? 'realtime' : 'offline';
  try {
    if (exportMode === 'offline' && typeof VideoEncoder === 'undefined') {
      throw new Error(window.isSecureContext
        ? '当前页面无法使用 WebCodecs。请选择「自动选择」或「实时录制」。'
        : '当前访问地址不是安全上下文，WebCodecs 不可用。请选择「自动选择」或「实时录制」，或通过 localhost、127.0.0.1、HTTPS 访问。');
    }
    // Resume during the button gesture; MediaRecorder's audio track uses this context.
    decodeContext = new AudioContext();
    void decodeContext.resume().catch(() => {});
    await Promise.all([state.bpmPromise, state.lowPromise].filter(Boolean));
    if (controller.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const features = { bpm: state.bpm, lowEnvelope: state.lowEnvelope, lowDrive: state.lowDrive };
    exportStatus('正在解码音乐…', 3);
    const audioBuffer = await decodeContext.decodeAudioData(await file.arrayBuffer());
    if (controller.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
    exportStatus('正在计算每帧频谱…', 10);
    const spectrum = await analyzeOfflineSpectrum(audioBuffer, fps, settings.sensitivity, () => controller.signal.aborted,
      progress => exportStatus(`正在计算每帧频谱… ${Math.round(progress * 100)}%`, 10 + progress * 20));
    if (controller.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
    await document.fonts.ready;
    if (settings.dancerMode === 'video') await loadVideoDancer();
    const background = document.createElement('canvas');
    const backgroundImage = state.backgroundImage;
    const backgroundReady = Boolean(backgroundImage?.naturalWidth);
    if (backgroundReady) paintBackgroundCache(background, width, height, backgroundImage, settings.dim);
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || 'space-odyssey';
    exportStatus(activeExportMode === 'realtime' ? '正在实时录制…耗时约为歌曲时长' : '正在逐帧渲染与编码…', 30);
    const result = await exportCanvasVideo({
      audioBuffer, audioContext: decodeContext, width, height, fps, mode: exportMode, signal: controller.signal,
      metadata: { title: settings.text.title || name, author: settings.text.author },
      render: ({ context, time, frame, delta }) => {
        const start = frame * BAR_COUNT;
        renderScene(time, delta, { context, width, height, background, backgroundReady },
          { ...features, levels: spectrum.levels.subarray(start, start + BAR_COUNT) }, settings);
      },
      onMode: mode => {
        activeExportMode = mode;
        if (mode === 'realtime') exportStatus(window.isSecureContext
          ? '正在实时录制…耗时约为歌曲时长' : '当前地址不支持逐帧编码，正在实时录制…', 30);
      },
      onProgress: progress => exportStatus(`${activeExportMode === 'realtime' ? '正在实时录制' : '正在逐帧渲染与编码'}… ${Math.round(progress * 100)}%`, 30 + progress * 65),
    });
    if (controller.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
    exportStatus('视频已完成，正在保存…', 100);
    downloadVideo(result, `${name}-space-odyssey`);
    exportStatus(`导出完成：${result.extension.replace('.', '').toUpperCase()}，包含原音乐`, 100);
  } catch (error) {
    if (error?.name === 'AbortError') exportStatus('已取消导出。', 0);
    else exportStatus(`导出失败：${error?.message || '未知错误'}`, null, true);
  } finally {
    if (decodeContext) void decodeContext.close();
    if (state.exportController === controller) state.exportController = null;
    $('cancelExport').hidden = true;
    syncControls();
    if (resumePlayback && state.audioFile === file && state.audioReady) void playSelected(state.selection);
  }
}

let savedSettings = {};
try {
  const saved = JSON.parse(localStorage.getItem('resonance:space-odyssey') || '{}');
  savedSettings = saved;
  for (const id of ['volume', 'sensitivity', 'glow', 'dim', 'stars', 'dancerSize', 'dancerDepth', 'dancerMotion', 'dancerGlow']) {
    if (saved[id] !== undefined && Number.isFinite(Number(saved[id]))) {
      const input = $(id);
      input.value = String(Math.max(Number(input.min), Math.min(Number(input.max), Number(saved[id]))));
    }
  }
  if (['video', 'skeleton', 'sprite', 'off'].includes(saved.dancerMode)) $('dancerMode').value = saved.dancerMode;
  if (['shuffle', 'jump', 'moonwalk', 'classic'].includes(saved.dancerStyle)) $('dancerStyle').value = saved.dancerStyle;
  for (const id of ['sceneTitle', 'sceneSubtitle', 'sceneAuthor']) if (typeof saved[id] === 'string') $(id).value = saved[id];
  $('showText').checked = Boolean(saved.showText);
  if (['bottom-left', 'bottom-center', 'top-left', 'top-center'].includes(saved.textPosition)) $('textPosition').value = saved.textPosition;
  if (/^#[0-9a-f]{6}$/i.test(saved.textColor || '')) $('textColor').value = saved.textColor;
  if (['1280x720', '1920x1080'].includes(saved.exportSize)) $('exportSize').value = saved.exportSize;
  if (['30', '60'].includes(saved.exportFps)) $('exportFps').value = saved.exportFps;
  if (['auto', 'offline', 'realtime'].includes(saved.exportMode)) $('exportMode').value = saved.exportMode;
} catch {}

fillMethodSelect($('bpmMethod'), BPM_METHODS, savedSettings.bpmMethod || 'beat-grid');
fillMethodSelect($('leftEnergyMethod'), ENERGY_METHODS, savedSettings.leftEnergyMethod || 'live');
fillMethodSelect($('rightEnergyMethod'), ENERGY_METHODS, savedSettings.rightEnergyMethod || 'mix');

for (const id of ['volume', 'sensitivity', 'glow', 'dim', 'stars', 'dancerSize', 'dancerDepth', 'dancerMotion', 'dancerGlow']) $(id).addEventListener('input', syncSettings);
for (const id of ['showText', 'sceneTitle', 'sceneSubtitle', 'sceneAuthor', 'textPosition', 'textColor', 'exportSize', 'exportFps', 'exportMode']) $(id).addEventListener('input', syncSettings);
$('dancerMode').addEventListener('change', syncSettings);
$('dancerStyle').addEventListener('change', syncSettings);
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
$('reanalyzeBpm').addEventListener('click', () => { state.bpmPromise = runBpmAnalysis(); });
$('exportVideo').addEventListener('click', () => void startExport());
$('cancelExport').addEventListener('click', () => state.exportController?.abort());
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
$('resetBackground').addEventListener('click', () => setBackground('Nebula-NGC-6302.webp'));
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
  state.exportController?.abort();
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
setStatus('exportStatus', `编码环境：${window.isSecureContext ? '安全上下文' : '非安全上下文'} · 视频编码 API ${typeof VideoEncoder === 'undefined' ? '不可用' : '可用'} · 实时录制 API ${typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream ? '不可用' : '可用'}`);
loadVideoDancer().then(() => {
  $('videoDancerStatus').textContent = '视频剪影已就绪 · 原速循环，低频驱动光晕。';
}).catch(() => {
  $('videoDancerStatus').textContent = '视频剪影加载失败，请刷新重试，或切换其他舞者样式。';
});
resize();
setBackground('Nebula-NGC-6302.webp');
registerScene({ canvas, resize, renderFrame: renderScene, getTime: () => audio.currentTime || 0 });
bindAnalysisSummary($('bpmStatus'), $('lowEnvelopeStatus'), $('transportAnalysis'));
bindPreviewFullscreen($('scenePreview'), $('fullscreenPreview'));
new ResizeObserver(resize).observe($('scenePreview'));
state.frame = requestAnimationFrame(drawFrame);
