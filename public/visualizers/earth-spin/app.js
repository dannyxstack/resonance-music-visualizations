import { loadLocalAudio, audioErrorMessage } from '../perth/local-audio.js';
import { BPM_METHODS, ENERGY_METHODS, fillMethodSelect, analyzeByMethod, beatEnergyAt, energyByMethod, firstBeatOffset } from '../shared/analysis.js';
import { analyzeLowFrequencyEnvelope, updateLowFrequencyLevel } from '../shared/low-envelope.js';
import { registerScene } from '../shared/scene.js';
import { bindAnalysisSummary, bindPreviewFullscreen } from '../shared/workspace.js';
import { BAR_BANDS, latitudeForLevel } from './spectrum-layout.js';
import { CITY_GDP, CITY_ENERGY_METHODS, CITY_LIGHT_COLORS, cityEnergyForMethod, cityLightValue, cityLightRadius } from './city-lights.js';

const $ = id => document.getElementById(id);
const root = $('earthApp');
const canvas = $('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const audio = $('player');
const RAD = Math.PI / 180;
const TILT = 12 * RAD;
const SIN_TILT = Math.sin(TILT);
const COS_TILT = Math.cos(TILT);
const TAU = Math.PI * 2;
const levels = new Float32Array(12);
const minCityGdp = Math.min(...CITY_GDP.map(city => city.gdp));
const maxCityGdp = Math.max(...CITY_GDP.map(city => city.gdp));
const cityPositions = CITY_GDP.map(city => {
  const latitude = city.lat * RAD, longitude = city.lon * RAD;
  const cos = Math.cos(latitude);
  return { ...city, x: cos * Math.sin(longitude), y: Math.sin(latitude), z: cos * Math.cos(longitude) };
});
const state = {
  width: 1, height: 1, dpr: 1, analyser: null, spectrum: null, context: null,
  audioReady: false, pending: false, audioFile: null, audioUrl: null, selection: null,
  selectionToken: 0, bpmToken: 0, lowToken: 0, bpm: null, decoded: null,
  lowEnvelope: null, lowLevel: 0, land: new Float32Array(0), stars: [],
  lastFrame: performance.now(),
};

const saved = (() => { try { return JSON.parse(localStorage.getItem('resonance:earth-spin') || '{}'); } catch { return {}; } })();
fillMethodSelect($('bpmMethod'), BPM_METHODS, saved.bpmMethod || 'beat-grid');
fillMethodSelect($('energyMethod'), ENERGY_METHODS, saved.energyMethod || 'mix');
fillMethodSelect($('cityEnergyMethod'), CITY_ENERGY_METHODS, saved.cityEnergyMethod || 'beat');
fillMethodSelect($('cityLightColor'), CITY_LIGHT_COLORS, saved.cityLightColor || 'amber');
for (const id of ['globeScale', 'spinSpeed', 'starCount', 'dotSize', 'cityBaseSize', 'cityPulseSize', 'sensitivity', 'volume']) {
  if (Number.isFinite(Number(saved[id])) && saved[id] !== undefined) {
    const input = $(id);
    input.value = String(Math.min(Number(input.max), Math.max(Number(input.min), Number(saved[id]))));
  }
}

function clamp(value, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function saveSettings() {
  const settings = Object.fromEntries(['globeScale', 'spinSpeed', 'starCount', 'dotSize', 'cityBaseSize', 'cityPulseSize', 'sensitivity', 'volume', 'bpmMethod', 'energyMethod', 'cityEnergyMethod', 'cityLightColor'].map(id => [id, $(id).value]));
  try { localStorage.setItem('resonance:earth-spin', JSON.stringify(settings)); } catch {}
}
function syncSettings() {
  $('globeScaleValue').textContent = `${$('globeScale').value}%`;
  $('spinSpeedValue').textContent = `${(Number($('spinSpeed').value) / 100).toFixed(1)}×`;
  $('starCountValue').textContent = $('starCount').value;
  $('dotSizeValue').textContent = `${$('dotSize').value}%`;
  $('cityBaseSizeValue').textContent = `${$('cityBaseSize').value} px`;
  $('cityPulseSizeValue').textContent = `${$('cityPulseSize').value} px`;
  $('sensitivityValue').textContent = `${$('sensitivity').value}%`;
  $('volumeValue').textContent = `${$('volume').value}%`;
  audio.volume = Number($('volume').value) / 100;
  saveSettings();
}
function setStatus(id, message) { $(id).textContent = message; }
function setPanel(open) {
  root.classList.toggle('panel-collapsed', !open);
  $('controlPanel').inert = !open;
  $('panelToggle').setAttribute('aria-expanded', String(open));
  $('panelToggle').innerHTML = open ? '收起参数 <span aria-hidden="true">⌃</span>' : '展开参数 <span aria-hidden="true">⌄</span>';
  if (!open && $('controlPanel').contains(document.activeElement)) $('panelToggle').focus();
}
function syncPlayback() {
  const playing = state.audioReady && !audio.paused && !audio.ended;
  $('playButton').textContent = playing ? 'Ⅱ' : '▶';
  $('playButton').setAttribute('aria-label', playing ? '暂停' : '播放');
  $('playButton').disabled = !state.audioReady || state.pending;
  $('seek').disabled = !state.audioReady || !Number.isFinite(audio.duration);
  $('currentTime').textContent = formatTime(audio.currentTime);
  $('duration').textContent = formatTime(audio.duration);
  $('seek').value = Number.isFinite(audio.duration) && audio.duration > 0 ? String(Math.round(audio.currentTime / audio.duration * 1000)) : '0';
}
function showBpm(result, message) {
  const value = result ? result.bpm.toFixed(1) : '--';
  const firstBeat = firstBeatOffset(result);
  const offset = Number.isFinite(firstBeat) ? `${firstBeat.toFixed(2)} 秒` : '-- 秒';
  $('bpmValue').textContent = $('transportBpm').textContent = value;
  $('firstBeatOffset').textContent = $('transportOffset').textContent = offset;
  setStatus('bpmStatus', message);
}

function ensureAudioGraph() {
  if (!state.context) {
    state.context = new AudioContext();
    state.analyser = state.context.createAnalyser();
    state.analyser.fftSize = 8192;
    state.analyser.smoothingTimeConstant = 0.42;
    state.spectrum = new Float32Array(state.analyser.frequencyBinCount);
    const source = state.context.createMediaElementSource(audio);
    source.connect(state.analyser);
    state.analyser.connect(state.context.destination);
  }
  return state.context;
}
async function startPlayback(selection) {
  state.pending = true;
  syncPlayback();
  try {
    const context = ensureAudioGraph();
    if (context.state === 'suspended') await context.resume();
    if (selection.signal.aborted) return;
    await audio.play();
    if (!selection.signal.aborted) setStatus('audioStatus', '正在播放 · 地球随音乐旋转');
  } catch (error) {
    if (!selection.signal.aborted) setStatus('audioStatus', audioErrorMessage(error));
  } finally {
    if (selection === state.selection) { state.pending = false; syncPlayback(); }
  }
}
async function runBpmAnalysis(buffer, token) {
  const method = $('bpmMethod').value;
  const methodLabel = $('bpmMethod').selectedOptions[0].textContent;
  const bpmToken = ++state.bpmToken;
  state.bpm = null;
  $('reanalyzeBpm').disabled = true;
  showBpm(null, `正在用「${methodLabel}」分析…`);
  try {
    const result = await analyzeByMethod(buffer, method,
      () => token !== state.selectionToken || bpmToken !== state.bpmToken,
      progress => { if (token === state.selectionToken && bpmToken === state.bpmToken) setStatus('bpmStatus', `BPM 预分析中… ${Math.round(progress * 100)}%`); });
    if (token !== state.selectionToken || bpmToken !== state.bpmToken) return;
    state.bpm = result;
    showBpm(result, result ? `${methodLabel} · 已完成` : '未检测到稳定节奏，可更换方法后重新分析');
  } catch {
    if (token === state.selectionToken && bpmToken === state.bpmToken) showBpm(null, 'BPM 分析失败，音乐仍可播放');
  } finally {
    if (token === state.selectionToken && bpmToken === state.bpmToken) $('reanalyzeBpm').disabled = false;
  }
}
async function runLowAnalysis(buffer, token) {
  const lowToken = ++state.lowToken;
  state.lowEnvelope = null;
  state.lowLevel = 0;
  setStatus('lowEnvelopeStatus', '正在分析 20–130 Hz 低频包络…');
  try {
    const envelope = await analyzeLowFrequencyEnvelope(buffer,
      () => token !== state.selectionToken || lowToken !== state.lowToken,
      progress => { if (token === state.selectionToken && lowToken === state.lowToken) setStatus('lowEnvelopeStatus', `低频包络分析中… ${Math.round(progress * 100)}%`); });
    if (token !== state.selectionToken || lowToken !== state.lowToken) return;
    state.lowEnvelope = envelope;
    setStatus('lowEnvelopeStatus', envelope ? '低频包络已就绪 · 100 帧/秒' : '低频包络分析已取消');
  } catch {
    if (token === state.selectionToken && lowToken === state.lowToken) setStatus('lowEnvelopeStatus', '低频包络分析失败，使用实时频谱');
  }
}
async function analyzeSelectedFile(file, token) {
  let context;
  try {
    setStatus('bpmStatus', '正在解码本地音频…');
    setStatus('lowEnvelopeStatus', '等待音频解码…');
    const bytes = await file.arrayBuffer();
    if (token !== state.selectionToken) return;
    context = new AudioContext();
    const buffer = await context.decodeAudioData(bytes);
    if (token !== state.selectionToken) return;
    state.decoded = buffer;
    await Promise.all([runBpmAnalysis(buffer, token), runLowAnalysis(buffer, token)]);
  } catch {
    if (token === state.selectionToken) {
      showBpm(null, '无法解码音频以预分析 BPM，仍可尝试播放');
      setStatus('lowEnvelopeStatus', '低频包络分析失败，使用实时频谱');
    }
  } finally { if (context) void context.close(); }
}
async function selectAudio(file) {
  state.selection?.abort();
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  const selection = new AbortController();
  const token = ++state.selectionToken;
  ++state.bpmToken; ++state.lowToken;
  state.selection = selection;
  state.audioFile = file;
  state.audioUrl = null;
  state.audioReady = false;
  state.decoded = null;
  state.bpm = null;
  state.lowEnvelope = null;
  state.lowLevel = 0;
  levels.fill(0);
  audio.pause(); audio.removeAttribute('src'); audio.load();
  $('trackName').textContent = file.name;
  $('trackName').title = file.name;
  $('reanalyzeBpm').disabled = true;
  showBpm(null, '等待音频加载…');
  setStatus('lowEnvelopeStatus', '等待音频加载…');
  setStatus('audioStatus', `正在加载：${file.name}`);
  syncPlayback();
  try {
    const url = await loadLocalAudio(audio, file, { signal: selection.signal, getContext: ensureAudioGraph,
      onFallback: () => setStatus('audioStatus', '正在尝试浏览器兼容解码…') });
    if (selection.signal.aborted) { URL.revokeObjectURL(url); return; }
    state.audioUrl = url;
    state.audioReady = true;
    syncPlayback();
    void analyzeSelectedFile(file, token);
    void startPlayback(selection);
  } catch (error) {
    if (!selection.signal.aborted) {
      setStatus('audioStatus', audioErrorMessage(error));
      showBpm(null, '音频加载失败，无法预分析 BPM');
      setStatus('lowEnvelopeStatus', '音频加载失败');
    }
  }
}

function makeStars() {
  let seed = 0x9e3779b9;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  state.stars = Array.from({ length: 260 }, () => ({ x: random(), y: random(), radius: 0.35 + random() * 1.5,
    alpha: 0.25 + random() * 0.7, phase: random() * TAU, speed: 0.35 + random() * 1.15 }));
}
async function loadLandDots() {
  try {
    const response = await fetch(new URL('./land-dots.json', import.meta.url));
    if (!response.ok) throw new Error('land data unavailable');
    const coordinates = await response.json();
    const land = new Float32Array(coordinates.length / 2 * 3);
    for (let i = 0; i < coordinates.length; i += 2) {
      const lon = coordinates[i] * RAD;
      const lat = coordinates[i + 1] * RAD;
      const cos = Math.cos(lat);
      const index = i / 2 * 3;
      land[index] = cos * Math.sin(lon);
      land[index + 1] = Math.sin(lat);
      land[index + 2] = cos * Math.cos(lon);
    }
    state.land = land;
  } catch { setStatus('audioStatus', '陆地点阵加载失败，请刷新页面重试'); }
}

function resize() {
  const bounds = $('scenePreview').getBoundingClientRect();
  state.dpr = Math.min(devicePixelRatio || 1, 2);
  state.width = Math.max(1, bounds.width);
  state.height = Math.max(1, bounds.height);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
}
function projectVector(x, y, z, sinRotation, cosRotation, cx, cy, radius) {
  const turnedX = x * cosRotation + z * sinRotation;
  const turnedZ = z * cosRotation - x * sinRotation;
  const tiltedY = y * COS_TILT - turnedZ * SIN_TILT;
  const depth = y * SIN_TILT + turnedZ * COS_TILT;
  return { x: cx + turnedX * radius, y: cy - tiltedY * radius, depth };
}
function projectLatLon(latitude, longitude, sinRotation, cosRotation, cx, cy, radius) {
  const cosLat = Math.cos(latitude);
  return projectVector(cosLat * Math.sin(longitude), Math.sin(latitude), cosLat * Math.cos(longitude),
    sinRotation, cosRotation, cx, cy, radius);
}
function drawStars(width, height, time) {
  const count = Number($('starCount').value);
  for (let i = 0; i < count; i++) {
    const star = state.stars[i];
    const alpha = star.alpha * (0.72 + 0.28 * Math.sin(time * star.speed + star.phase));
    ctx.fillStyle = `rgba(185,224,255,${alpha})`;
    ctx.beginPath(); ctx.arc(star.x * width, star.y * height, star.radius, 0, TAU); ctx.fill();
    if (star.radius > 1.4) {
      ctx.fillStyle = `rgba(120,190,255,${alpha * 0.12})`;
      ctx.beginPath(); ctx.arc(star.x * width, star.y * height, star.radius * 4, 0, TAU); ctx.fill();
    }
  }
}
function drawEquator(cx, cy, radius, sinRotation, cosRotation, front) {
  ctx.beginPath();
  let drawing = false;
  for (let i = 0; i <= 240; i++) {
    const point = projectLatLon(0, i / 240 * TAU, sinRotation, cosRotation, cx, cy, radius);
    const visible = front ? point.depth > 0 : point.depth <= 0;
    if (!visible) { drawing = false; continue; }
    if (!drawing) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
    drawing = true;
  }
  ctx.strokeStyle = front ? 'rgba(115,230,255,.42)' : 'rgba(115,230,255,.07)';
  ctx.lineWidth = front ? 1.7 : 1;
  ctx.stroke();
}
function drawBar(index, value, cx, cy, radius, sinRotation, cosRotation, front) {
  const longitude = index / 24 * TAU;
  const extent = latitudeForLevel(value) * RAD;
  ctx.beginPath();
  let drawing = false;
  for (let sample = 0; sample <= 20; sample++) {
    const latitude = -extent + sample / 20 * extent * 2;
    const point = projectLatLon(latitude, longitude, sinRotation, cosRotation, cx, cy, radius * 1.009);
    const visible = front ? point.depth > 0.008 : point.depth <= 0.008;
    if (!visible) { drawing = false; continue; }
    if (!drawing) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
    drawing = true;
  }
  const band = BAR_BANDS[index];
  const hue = 188 + band / 11 * 115;
  ctx.lineCap = 'round';
  if (!front) {
    ctx.strokeStyle = `hsla(${hue},100%,78%,.12)`;
    ctx.lineWidth = 3;
    ctx.stroke();
    return;
  }
  ctx.shadowColor = `hsl(${hue},100%,70%)`;
  ctx.shadowBlur = 13 + value * 14;
  ctx.strokeStyle = `hsla(${hue},100%,67%,.40)`;
  ctx.lineWidth = Math.max(5, radius * 0.035);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `hsl(${hue},95%,${72 + value * 17}%)`;
  ctx.lineWidth = Math.max(2.7, radius * 0.018);
  ctx.stroke();
}
function drawLand(cx, cy, radius, sinRotation, cosRotation) {
  const size = Math.max(0.8, radius * 0.006 * Number($('dotSize').value) / 100);
  const buckets = Array.from({ length: 4 }, () => []);
  const land = state.land;
  for (let i = 0; i < land.length; i += 3) {
    const point = projectVector(land[i], land[i + 1], land[i + 2], sinRotation, cosRotation, cx, cy, radius * 1.003);
    if (point.depth <= 0.015) continue;
    buckets[Math.min(3, Math.floor(point.depth * 4))].push(point);
  }
  const colors = ['rgba(53,144,211,.28)', 'rgba(49,139,210,.45)', 'rgba(43,131,204,.62)', 'rgba(34,122,200,.76)'];
  for (let bucket = 0; bucket < 4; bucket++) {
    ctx.fillStyle = colors[bucket];
    ctx.beginPath();
    for (const point of buckets[bucket]) {
      const dotRadius = size * (0.78 + bucket * 0.12);
      ctx.moveTo(point.x + dotRadius, point.y);
      ctx.arc(point.x, point.y, dotRadius, 0, TAU);
    }
    ctx.fill();
  }
}
function drawCityLights(cx, cy, radius, sinRotation, cosRotation, motion) {
  const color = CITY_LIGHT_COLORS.find(item => item.value === $('cityLightColor').value)?.hex || CITY_LIGHT_COLORS[0].hex;
  const baseSize = Number($('cityBaseSize').value);
  const pulseSize = Number($('cityPulseSize').value);
  const projected = cityPositions.map(city => ({
    city,
    point: projectVector(city.x, city.y, city.z, sinRotation, cosRotation, cx, cy, radius * 1.008),
  })).filter(({ point }) => point.depth > 0.045);
  projected.sort((a, b) => a.point.depth - b.point.depth);
  for (const { city, point } of projected) {
    const value = cityLightValue(city.gdp, minCityGdp, maxCityGdp, motion);
    ctx.globalAlpha = value / 2;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(point.x, point.y, cityLightRadius(baseSize, pulseSize, value), 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function readSpectrum(dt, time) {
  const playing = state.audioReady && !audio.paused && !audio.ended;
  const method = $('energyMethod').value;
  const beat = beatEnergyAt(state.bpm, time);
  state.lowLevel = updateLowFrequencyLevel(state.lowEnvelope, time, playing, dt, state.lowLevel);
  if (playing && state.analyser) state.analyser.getFloatFrequencyData(state.spectrum);
  const sensitivity = Number($('sensitivity').value) / 100;
  const nyquist = state.context ? state.context.sampleRate / 2 : 22050;
  const binHz = nyquist / (state.spectrum?.length || 4096);
  let liveTotal = 0;
  for (let band = 0; band < 12; band++) {
    let live = 0;
    if (playing && state.spectrum) {
      const low = 38 * Math.pow(14000 / 38, band / 12);
      const high = 38 * Math.pow(14000 / 38, (band + 1) / 12);
      const first = Math.max(1, Math.floor(low / binHz));
      const last = Math.min(state.spectrum.length - 1, Math.ceil(high / binHz));
      let peak = -110;
      for (let k = first; k <= last; k++) peak = Math.max(peak, state.spectrum[k]);
      live = Math.pow(clamp((peak + 85) / 65), 1.5);
    }
    liveTotal += live;
    const target = playing ? energyByMethod(method, clamp(live * sensitivity), beat, Boolean(state.bpm), state.lowLevel, Boolean(state.lowEnvelope)) : 0;
    if (method === 'low-envelope' && state.lowEnvelope) levels[band] = target;
    else {
      const response = target > levels[band] ? 17 : 4;
      levels[band] += (target - levels[band]) * (1 - Math.exp(-response * dt));
    }
  }
  const live = clamp(liveTotal / 12 * sensitivity);
  return playing ? cityEnergyForMethod($('cityEnergyMethod').value, live, beat, state.lowLevel) : 0;
}
function renderScene(time, delta = 1 / 60) {
  const width = state.width, height = state.height;
  const dt = Math.min(0.08, Math.max(0, delta));
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  const backdrop = ctx.createRadialGradient(width * 0.49, height * 0.47, 20, width * 0.49, height * 0.47, width * 0.8);
  backdrop.addColorStop(0, '#10223c'); backdrop.addColorStop(.55, '#071326'); backdrop.addColorStop(1, '#030915');
  ctx.fillStyle = backdrop; ctx.fillRect(0, 0, width, height);
  drawStars(width, height, time);
  const cityMotion = readSpectrum(dt, time);

  const cx = width * 0.51, cy = height * 0.515;
  const radius = Math.min(height * 0.365, width * 0.28) * Number($('globeScale').value) / 100;
  const rotation = 0.55 + time * 0.095 * Number($('spinSpeed').value) / 100;
  const sinRotation = Math.sin(rotation), cosRotation = Math.cos(rotation);
  const glow = ctx.createRadialGradient(cx, cy, radius * .72, cx, cy, radius * 1.35);
  glow.addColorStop(0, 'rgba(67,170,247,0)'); glow.addColorStop(.65, 'rgba(67,170,247,.11)'); glow.addColorStop(1, 'rgba(67,170,247,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, radius * 1.35, 0, TAU); ctx.fill();

  const globe = ctx.createRadialGradient(cx - radius * .4, cy - radius * .46, radius * .05, cx + radius * .15, cy + radius * .22, radius * 1.25);
  globe.addColorStop(0, '#f7fdff'); globe.addColorStop(.42, '#e0f4ff'); globe.addColorStop(.76, '#a7d5eb'); globe.addColorStop(1, '#315b83');
  ctx.fillStyle = globe; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(211,246,255,.8)'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius - 1, 0, TAU); ctx.clip();
  drawEquator(cx, cy, radius, sinRotation, cosRotation, false);
  for (let i = 0; i < 24; i++) drawBar(i, levels[BAR_BANDS[i]], cx, cy, radius, sinRotation, cosRotation, false);
  drawLand(cx, cy, radius, sinRotation, cosRotation);
  drawEquator(cx, cy, radius, sinRotation, cosRotation, true);
  for (let i = 0; i < 24; i++) drawBar(i, levels[BAR_BANDS[i]], cx, cy, radius, sinRotation, cosRotation, true);
  drawCityLights(cx, cy, radius, sinRotation, cosRotation, cityMotion);
  ctx.restore();
}

function animate(now) {
  const dt = Math.min(.08, Math.max(0, (now - state.lastFrame) / 1000));
  state.lastFrame = now;
  renderScene(audio.currentTime || 0, dt);
  requestAnimationFrame(animate);
}

$('audioFile').addEventListener('change', event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void selectAudio(file); });
$('playButton').addEventListener('click', () => { if (!state.audioReady) return; if (audio.paused) void startPlayback(state.selection); else audio.pause(); });
$('seek').addEventListener('input', () => { if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number($('seek').value) / 1000 * audio.duration; });
$('reanalyzeBpm').addEventListener('click', () => { if (state.decoded) void runBpmAnalysis(state.decoded, state.selectionToken); });
$('bpmMethod').addEventListener('change', () => { saveSettings(); if (state.decoded) setStatus('bpmStatus', '已切换方法，点击重新分析 BPM'); });
$('energyMethod').addEventListener('change', saveSettings);
$('cityEnergyMethod').addEventListener('change', saveSettings);
$('cityLightColor').addEventListener('change', saveSettings);
for (const id of ['globeScale', 'spinSpeed', 'starCount', 'dotSize', 'cityBaseSize', 'cityPulseSize', 'sensitivity', 'volume']) $(id).addEventListener('input', syncSettings);
$('panelToggle').addEventListener('click', () => setPanel(root.classList.contains('panel-collapsed')));
$('closePanel').addEventListener('click', () => setPanel(false));
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
  if (event.key.toLowerCase() === 'h') { event.preventDefault(); setPanel(root.classList.contains('panel-collapsed')); }
  if (event.code === 'Space' && !event.repeat && state.audioReady) { event.preventDefault(); if (audio.paused) void startPlayback(state.selection); else audio.pause(); }
});
for (const event of ['timeupdate', 'loadedmetadata', 'playing', 'pause', 'ended']) audio.addEventListener(event, syncPlayback);
audio.addEventListener('error', () => { if (state.audioReady) { state.audioReady = false; syncPlayback(); setStatus('audioStatus', audioErrorMessage(audio.error)); } });
window.addEventListener('beforeunload', () => { state.selection?.abort(); if (state.audioUrl) URL.revokeObjectURL(state.audioUrl); void state.context?.close(); });

makeStars();
$('cityCount').textContent = $('cityDataCount').textContent = String(CITY_GDP.length);
for (const city of [...CITY_GDP].sort((a, b) => b.gdp - a.gdp)) {
  const row = document.createElement('li');
  const name = document.createElement('span');
  const value = document.createElement('span');
  name.textContent = city.name + (city.proxy ? ' *' : '');
  value.textContent = `$${city.gdp.toLocaleString('en-US', { maximumFractionDigits: 1 })}B · ${city.year}`;
  row.append(name, value);
  $('cityGdpList').append(row);
}
syncSettings();
bindAnalysisSummary($('bpmStatus'), $('lowEnvelopeStatus'), $('transportAnalysis'));
bindPreviewFullscreen($('scenePreview'), $('fullscreenPreview'));
registerScene({ canvas, resize, renderFrame: renderScene, getTime: () => audio.currentTime || 0 });
new ResizeObserver(resize).observe($('scenePreview'));
resize();
void loadLandDots();
requestAnimationFrame(animate);
