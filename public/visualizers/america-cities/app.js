import { loadLocalAudio, audioErrorMessage } from '../perth/local-audio.js';
import { BPM_METHODS, ENERGY_METHODS, fillMethodSelect, analyzeByMethod, beatEnergyAt, energyByMethod, firstBeatOffset } from '../shared/analysis.js';
import { analyzeLowFrequencyEnvelope, buildLowFrequencyDrive, updateLowFrequencyLevel } from '../shared/low-envelope.js';
import { registerScene } from '../shared/scene.js';
import { bindAnalysisSummary, bindPreviewFullscreen } from '../shared/workspace.js';
import { mountLiveExport } from '../shared/live-export-controls.js';

const $ = id => document.getElementById(id);
const root = $('americaApp');
const canvas = $('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const audio = $('player');
const TAU = Math.PI * 2;
const levels = new Float32Array(50);
const mapCanvas = document.createElement('canvas');
const mapCtx = mapCanvas.getContext('2d');
const state = {
  width: 1, height: 1, dpr: 1, context: null, analyser: null, spectrum: null,
  audioReady: false, pending: false, audioFile: null, audioUrl: null, selection: null,
  selectionToken: 0, bpmToken: 0, lowToken: 0, bpm: null, decoded: null,
  lowEnvelope: null, lowDrive: null, lowLevel: 0, cities: [], states: [],
  mapDirty: true, hover: null, projectedCities: [], lastFrame: performance.now(),
};
let exportControls;
const saved = (() => { try { return JSON.parse(localStorage.getItem('resonance:america-cities') || '{}'); } catch { return {}; } })();
fillMethodSelect($('bpmMethod'), BPM_METHODS, saved.bpmMethod || 'beat-grid');
fillMethodSelect($('energyMethod'), ENERGY_METHODS, saved.energyMethod || 'live');
for (const id of ['cameraTilt', 'cameraYaw', 'barHeight', 'sensitivity', 'volume']) {
  if (saved[id] === undefined || !Number.isFinite(Number(saved[id]))) continue;
  $(id).value = String(Math.min(Number($(id).max), Math.max(Number($(id).min), Number(saved[id]))));
}

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
function formatTime(seconds) {
  return Number.isFinite(seconds) && seconds >= 0
    ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '00:00';
}
function saveSettings() {
  const ids = ['cameraTilt', 'cameraYaw', 'barHeight', 'sensitivity', 'volume', 'bpmMethod', 'energyMethod'];
  try { localStorage.setItem('resonance:america-cities', JSON.stringify(Object.fromEntries(ids.map(id => [id, $(id).value])))); } catch {}
}
function syncSettings() {
  $('cameraTiltValue').textContent = `${$('cameraTilt').value}°`;
  $('cameraYawValue').textContent = `${$('cameraYaw').value}°`;
  $('barHeightValue').textContent = `${$('barHeight').value}%`;
  $('sensitivityValue').textContent = `${$('sensitivity').value}%`;
  $('volumeValue').textContent = `${$('volume').value}%`;
  audio.volume = Number($('volume').value) / 100;
  state.mapDirty = true;
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
    state.analyser.smoothingTimeConstant = .42;
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
    if (!selection.signal.aborted) setStatus('audioStatus', '正在播放 · 城市频谱已启动');
  } catch (error) {
    if (!selection.signal.aborted) setStatus('audioStatus', audioErrorMessage(error));
  } finally {
    if (selection === state.selection) { state.pending = false; syncPlayback(); }
  }
}
async function runBpmAnalysis(buffer, token) {
  const method = $('bpmMethod').value;
  const label = $('bpmMethod').selectedOptions[0].textContent;
  const bpmToken = ++state.bpmToken;
  state.bpm = null;
  $('reanalyzeBpm').disabled = true;
  showBpm(null, `正在用「${label}」分析…`);
  try {
    const result = await analyzeByMethod(buffer, method,
      () => token !== state.selectionToken || bpmToken !== state.bpmToken,
      progress => { if (token === state.selectionToken && bpmToken === state.bpmToken) setStatus('bpmStatus', `BPM 预分析中… ${Math.round(progress * 100)}%`); });
    if (token !== state.selectionToken || bpmToken !== state.bpmToken) return;
    state.bpm = result;
    showBpm(result, result ? `${label} · 已完成` : '未检测到稳定节奏，可换方法重新分析');
  } catch {
    if (token === state.selectionToken && bpmToken === state.bpmToken) showBpm(null, 'BPM 分析失败，音乐仍可播放');
  } finally {
    if (token === state.selectionToken && bpmToken === state.bpmToken) $('reanalyzeBpm').disabled = false;
  }
}
async function runLowAnalysis(buffer, token) {
  const lowToken = ++state.lowToken;
  state.lowEnvelope = null; state.lowDrive = null; state.lowLevel = 0;
  setStatus('lowEnvelopeStatus', '正在分析 20–130 Hz 低频包络…');
  try {
    const envelope = await analyzeLowFrequencyEnvelope(buffer,
      () => token !== state.selectionToken || lowToken !== state.lowToken,
      progress => { if (token === state.selectionToken && lowToken === state.lowToken) setStatus('lowEnvelopeStatus', `低频包络分析中… ${Math.round(progress * 100)}%`); });
    if (token !== state.selectionToken || lowToken !== state.lowToken) return;
    state.lowEnvelope = envelope;
    state.lowDrive = buildLowFrequencyDrive(envelope);
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
  Object.assign(state, { selection, audioFile: file, audioUrl: null, audioReady: false, decoded: null,
    bpm: null, lowEnvelope: null, lowDrive: null, lowLevel: 0 });
  exportControls?.sync();
  levels.fill(0);
  audio.pause(); audio.removeAttribute('src'); audio.load();
  $('trackName').textContent = $('trackName').title = file.name;
  $('reanalyzeBpm').disabled = true;
  showBpm(null, '等待音频加载…');
  setStatus('lowEnvelopeStatus', '等待音频加载…');
  setStatus('audioStatus', `正在加载：${file.name}`);
  syncPlayback();
  try {
    const url = await loadLocalAudio(audio, file, { signal: selection.signal, getContext: ensureAudioGraph,
      onFallback: () => setStatus('audioStatus', '正在尝试浏览器兼容解码…') });
    if (selection.signal.aborted) { URL.revokeObjectURL(url); return; }
    state.audioUrl = url; state.audioReady = true;
    exportControls?.sync(); syncPlayback();
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

// Geographic coordinates are placed on a horizontal XZ plane and projected
// through a perspective camera. Vertical Y is the city column height.
function project(lon, lat, elevation = 0) {
  const x = (lon + 96) * .047;
  const z = (lat - 37) * .055;
  const yaw = Number($('cameraYaw').value) * Math.PI / 180;
  const tilt = Number($('cameraTilt').value) * Math.PI / 180;
  const turnedX = x * Math.cos(yaw) - z * Math.sin(yaw);
  const turnedZ = x * Math.sin(yaw) + z * Math.cos(yaw);
  const depth = 4.5 + turnedZ * Math.cos(tilt) - elevation * Math.sin(tilt);
  const perspective = 4.5 / depth;
  const scale = Math.min(state.width * .31, state.height * .57);
  return {
    x: state.width * .5 + turnedX * scale * perspective,
    y: state.height * .55 - (turnedZ * Math.sin(tilt) + elevation * Math.cos(tilt)) * scale * perspective,
    perspective, depth,
  };
}
function traceState(target, rings, elevation) {
  target.beginPath();
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const point = project(ring[i][0], ring[i][1], elevation);
      if (i === 0) target.moveTo(point.x, point.y);
      else target.lineTo(point.x, point.y);
    }
    target.closePath();
  }
}
function rebuildMap() {
  mapCanvas.width = canvas.width;
  mapCanvas.height = canvas.height;
  mapCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  mapCtx.clearRect(0, 0, state.width, state.height);
  if (!state.states.length) return;
  mapCtx.shadowColor = '#17aafa';
  mapCtx.shadowBlur = 22;
  mapCtx.fillStyle = '#071726';
  for (const rings of state.states) { traceState(mapCtx, rings, -.13); mapCtx.fill('evenodd'); }
  mapCtx.shadowBlur = 0;
  mapCtx.strokeStyle = '#2386a9';
  mapCtx.lineWidth = 2;
  for (const rings of state.states) { traceState(mapCtx, rings, -.13); mapCtx.stroke(); }
  const land = mapCtx.createLinearGradient(0, state.height * .25, 0, state.height * .85);
  land.addColorStop(0, '#173f60'); land.addColorStop(.55, '#0e324d'); land.addColorStop(1, '#09243c');
  mapCtx.fillStyle = land;
  for (const rings of state.states) { traceState(mapCtx, rings, 0); mapCtx.fill('evenodd'); }
  mapCtx.strokeStyle = 'rgba(94,212,240,.42)';
  mapCtx.lineWidth = 1;
  for (const rings of state.states) { traceState(mapCtx, rings, 0); mapCtx.stroke(); }
  state.mapDirty = false;
}
function resize() {
  const bounds = $('scenePreview').getBoundingClientRect();
  state.dpr = Math.min(devicePixelRatio || 1, 2);
  state.width = Math.max(1, bounds.width);
  state.height = Math.max(1, bounds.height);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  state.mapDirty = true;
}
async function loadMapData() {
  try {
    const [citiesResponse, statesResponse] = await Promise.all([
      fetch(new URL('./cities.json', import.meta.url)), fetch(new URL('./states.json', import.meta.url)),
    ]);
    if (!citiesResponse.ok || !statesResponse.ok) throw new Error('data unavailable');
    const [cities, states] = await Promise.all([citiesResponse.json(), statesResponse.json()]);
    const populations = cities.map(city => Math.log(city.population));
    const min = Math.min(...populations), max = Math.max(...populations);
    state.cities = cities.map(city => ({ ...city, diameter: 1 + clamp((Math.log(city.population) - min) / (max - min)) * 2 }));
    state.states = states;
    state.mapDirty = true;
    for (const city of state.cities) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const population = document.createElement('span');
      name.textContent = `${city.rank}. ${city.name.replace(/ (city|city \(balance\))$/, '')}, ${city.state}`;
      population.textContent = city.population.toLocaleString('en-US');
      item.append(name, population);
      $('cityList').append(item);
    }
  } catch {
    setStatus('audioStatus', '地图或城市数据加载失败，请刷新页面重试');
  }
}
function liveBand(index, playing) {
  if (!playing || !state.spectrum) return 0;
  const nyquist = state.context.sampleRate / 2;
  const binHz = nyquist / state.spectrum.length;
  const low = 38 * (14000 / 38) ** (index / 50);
  const high = 38 * (14000 / 38) ** ((index + 1) / 50);
  const first = Math.max(1, Math.floor(low / binHz));
  const last = Math.min(state.spectrum.length - 1, Math.ceil(high / binHz));
  let peak = -110;
  for (let bin = first; bin <= last; bin++) peak = Math.max(peak, state.spectrum[bin]);
  return clamp((peak + 85) / 65) ** 1.5;
}
function updateLevels(time, dt) {
  const playing = state.audioReady && !audio.paused && !audio.ended;
  const method = $('energyMethod').value;
  const directLow = ['low-envelope', 'low-columns', 'low-wave'].includes(method) && state.lowEnvelope;
  const beat = beatEnergyAt(state.bpm, time);
  state.lowLevel = updateLowFrequencyLevel(state.lowEnvelope, time, playing, dt, state.lowLevel);
  if (playing && state.analyser) state.analyser.getFloatFrequencyData(state.spectrum);
  for (let i = 0; i < 50; i++) {
    const live = liveBand(i, playing) * Number($('sensitivity').value) / 100;
    const target = playing ? energyByMethod(method, clamp(live), beat, Boolean(state.bpm), state.lowLevel,
      Boolean(state.lowEnvelope), { drive: state.lowDrive, time, index: i, count: 50, playing }) : 0;
    if (directLow) levels[i] = target;
    else levels[i] += (target - levels[i]) * (1 - Math.exp(-(target > levels[i] ? 18 : 4) * dt));
  }
}
function drawBackground(time) {
  const gradient = ctx.createRadialGradient(state.width * .5, state.height * .52, 40,
    state.width * .5, state.height * .52, state.width * .75);
  gradient.addColorStop(0, '#102b48'); gradient.addColorStop(.48, '#071a30'); gradient.addColorStop(1, '#020713');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, state.width, state.height);
  for (let i = 0; i < 80; i++) {
    const x = ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1 * state.width;
    const y = ((Math.sin(i * 269.5) * 28569.1983) % 1 + 1) % 1 * state.height;
    const alpha = .17 + .22 * (1 + Math.sin(time * .55 + i * 6.3)) / 2;
    ctx.fillStyle = `rgba(171,216,255,${alpha})`;
    ctx.beginPath(); ctx.arc(x, y, i % 11 === 0 ? 1.15 : .6, 0, TAU); ctx.fill();
  }
  const glow = ctx.createRadialGradient(state.width * .5, state.height * .67, 20,
    state.width * .5, state.height * .67, state.width * .43);
  glow.addColorStop(0, 'rgba(10,177,241,.15)'); glow.addColorStop(1, 'rgba(10,177,241,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, state.width, state.height);
  ctx.strokeStyle = 'rgba(69,154,196,.1)';
  ctx.lineWidth = .7;
  ctx.beginPath();
  for (let lon = -130; lon <= -60; lon += 5) {
    const a = project(lon, 20, -.2), b = project(lon, 54, -.2);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  for (let lat = 20; lat <= 54; lat += 5) {
    const a = project(-130, lat, -.2), b = project(-60, lat, -.2);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
}
function drawColumn(city, index) {
  const base = project(city.lon, city.lat, .025);
  const height = .045 + levels[index] * .82 * Number($('barHeight').value) / 100;
  const top = project(city.lon, city.lat, .025 + height);
  const radius = city.diameter * 3.15 * base.perspective * Math.min(1, state.width / 960);
  const topRadius = radius * top.perspective / base.perspective;
  const hue = 182 + index / 49 * 102;
  const energy = levels[index];
  ctx.save();
  ctx.shadowColor = `hsl(${hue} 100% 65%)`;
  ctx.shadowBlur = 8 + energy * 16;
  ctx.fillStyle = `hsla(${hue} 100% 73% / ${.38 + energy * .42})`;
  ctx.beginPath(); ctx.ellipse(base.x, base.y, radius * 1.25, radius * .44, 0, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  const side = ctx.createLinearGradient(base.x - radius, 0, base.x + radius, 0);
  side.addColorStop(0, `hsl(${hue} 74% 23%)`);
  side.addColorStop(.45, `hsl(${hue} 93% ${34 + energy * 18}%)`);
  side.addColorStop(1, `hsl(${hue} 94% ${63 + energy * 12}%)`);
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(top.x - topRadius, top.y);
  ctx.lineTo(base.x - radius, base.y);
  ctx.ellipse(base.x, base.y, radius, radius * .32, 0, Math.PI, 0, true);
  ctx.lineTo(top.x + topRadius, top.y);
  ctx.ellipse(top.x, top.y, topRadius, topRadius * .32, 0, 0, Math.PI, true);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = `hsl(${hue} 100% ${70 + energy * 15}%)`;
  ctx.shadowColor = `hsl(${hue} 100% 70%)`;
  ctx.shadowBlur = 7 + energy * 12;
  ctx.beginPath(); ctx.ellipse(top.x, top.y, topRadius, topRadius * .32, 0, 0, TAU); ctx.fill();
  ctx.restore();
  return { city, base, top, radius };
}
function drawHover(item) {
  if (!item) return;
  const { city, top } = item;
  const label = `${city.rank}. ${city.name.replace(/ city.*$| metropolitan government.*$|\/Jefferson County metro government.*$/, '')}, ${city.state}  ·  ${city.population.toLocaleString('en-US')}`;
  ctx.save(); ctx.font = '600 12px Inter, Segoe UI, sans-serif';
  const width = ctx.measureText(label).width + 24;
  const x = clamp(top.x - width / 2, 8, state.width - width - 8);
  const y = Math.max(12, top.y - 44);
  ctx.fillStyle = 'rgba(5,19,34,.92)'; ctx.strokeStyle = 'rgba(143,225,255,.75)'; ctx.lineWidth = 1;
  ctx.fillRect(x, y, width, 29); ctx.strokeRect(x, y, width, 29);
  ctx.fillStyle = '#eafaff'; ctx.fillText(label, x + 12, y + 19);
  ctx.restore();
}
function renderScene(time, delta = 1 / 60) {
  const dt = clamp(delta, 0, .08);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawBackground(time);
  if (state.mapDirty) rebuildMap();
  ctx.drawImage(mapCanvas, 0, 0, state.width, state.height);
  updateLevels(time, dt);
  const ordered = state.cities.map((city, index) => ({ city, index, depth: project(city.lon, city.lat).depth }))
    .sort((a, b) => b.depth - a.depth);
  state.projectedCities = ordered.map(({ city, index }) => drawColumn(city, index));
  const hovered = state.projectedCities.find(item => item.city.rank === state.hover);
  drawHover(hovered);
}
function animate(now) {
  const dt = clamp((now - state.lastFrame) / 1000, 0, .08);
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
for (const id of ['cameraTilt', 'cameraYaw', 'barHeight', 'sensitivity', 'volume']) $(id).addEventListener('input', syncSettings);
$('panelToggle').addEventListener('click', () => setPanel(root.classList.contains('panel-collapsed')));
$('closePanel').addEventListener('click', () => setPanel(false));
canvas.addEventListener('pointermove', event => {
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * state.width / bounds.width;
  const y = (event.clientY - bounds.top) * state.height / bounds.height;
  const nearest = state.projectedCities.map(item => ({ item, distance: Math.min(
    Math.hypot(x - item.top.x, y - item.top.y), Math.hypot(x - item.base.x, y - item.base.y),
  ) })).sort((a, b) => a.distance - b.distance)[0];
  state.hover = nearest?.distance < 18 ? nearest.item.city.rank : null;
  canvas.style.cursor = state.hover ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => { state.hover = null; });
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
  if (event.key.toLowerCase() === 'h') { event.preventDefault(); setPanel(root.classList.contains('panel-collapsed')); }
  if (event.code === 'Space' && !event.repeat && state.audioReady) { event.preventDefault(); if (audio.paused) void startPlayback(state.selection); else audio.pause(); }
});
for (const event of ['timeupdate', 'loadedmetadata', 'playing', 'pause', 'ended']) audio.addEventListener(event, syncPlayback);
audio.addEventListener('error', () => { if (state.audioReady) { state.audioReady = false; syncPlayback(); setStatus('audioStatus', audioErrorMessage(audio.error)); } });
window.addEventListener('beforeunload', () => { state.selection?.abort(); if (state.audioUrl) URL.revokeObjectURL(state.audioUrl); void state.context?.close(); });

syncSettings();
bindAnalysisSummary($('bpmStatus'), $('lowEnvelopeStatus'), $('transportAnalysis'));
bindPreviewFullscreen($('scenePreview'), $('fullscreenPreview'));
exportControls = mountLiveExport($('controlPanel').querySelector('.panel-scroll'), {
  canvas, audio, getFile: () => state.audioReady ? state.audioFile : null, sceneName: 'america-cities',
});
registerScene({ canvas, resize, renderFrame: renderScene, getTime: () => audio.currentTime || 0 });
new ResizeObserver(resize).observe($('scenePreview'));
resize();
void loadMapData();
requestAnimationFrame(animate);
