import { loadLocalAudio, audioErrorMessage } from '../perth/local-audio.js';

const $ = id => document.getElementById(id);
const root = document.querySelector('.visualizer');
const canvas = $('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const audio = $('player');
const settingsIds = ['logoColor', 'titleInput', 'titleColor', 'titleFont', 'titleSize', 'subtitleInput', 'subtitleColor', 'subtitleFont', 'subtitleSize', 'backgroundDim', 'grayscale', 'volume', 'sensitivity'];
const fonts = {
  system: '"Arial Narrow", Impact, "Microsoft YaHei", sans-serif',
  serif: 'Georgia, "Noto Serif SC", serif',
  mono: '"Consolas", "Microsoft YaHei", monospace',
  round: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
};
const state = { logoMode: 'color', logoUrl: null, backgroundUrl: null, audioUrl: null, audioSelection: null, audioFile: null, audioReady: false, pending: false, context: null, analyser: null, spectrum: null, image: new Image(), bgCache: document.createElement('canvas'), frame: 0, bass: 0, mid: 0, treble: 0, time: 0, rain: [] };

try {
  const saved = JSON.parse(localStorage.getItem('resonance:neon-spectrum') || '{}');
  for (const id of settingsIds) {
    if (!(id in saved)) continue;
    const input = $(id);
    if (input.type === 'checkbox') input.checked = Boolean(saved[id]);
    else if (input.type === 'select-one' && [...input.options].some(option => option.value === saved[id])) input.value = saved[id];
    else if (input.type === 'color' && /^#[0-9a-f]{6}$/i.test(saved[id])) input.value = saved[id];
    else if (input.type === 'range' && Number.isFinite(Number(saved[id]))) input.value = saved[id];
    else if (input.type === 'text' && typeof saved[id] === 'string') input.value = saved[id].slice(0, input.maxLength);
  }
  if (saved.logoMode === 'image' || saved.logoMode === 'color') state.logoMode = saved.logoMode;
} catch {}

function saveSettings() {
  const data = Object.fromEntries(settingsIds.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value]));
  data.logoMode = state.logoMode;
  try { localStorage.setItem('resonance:neon-spectrum', JSON.stringify(data)); } catch {}
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function showToast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { $('toast').hidden = true; }, 7000);
}

function setTrackStatus(message, error = false) {
  $('trackName').textContent = message;
  $('trackName').classList.toggle('is-error', error);
  if (error) showToast(message);
}

function syncPlayback() {
  const playing = !audio.paused && !audio.ended;
  $('playButton').textContent = playing ? 'Ⅱ' : '▶';
  $('playButton').setAttribute('aria-label', playing ? '暂停' : '播放');
  $('playButton').disabled = !state.audioReady || state.pending;
  $('seek').disabled = !state.audioReady;
  $('currentTime').textContent = formatTime(audio.currentTime);
  $('duration').textContent = formatTime(audio.duration);
  $('sceneTime').textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  $('seek').value = Number.isFinite(audio.duration) && audio.duration > 0 ? String(Math.round(audio.currentTime / audio.duration * 1000)) : '0';
}

function getAudioContext() {
  if (!state.context) {
    state.context = new AudioContext();
    state.analyser = state.context.createAnalyser();
    state.analyser.fftSize = 1024;
    state.analyser.smoothingTimeConstant = .78;
    const source = state.context.createMediaElementSource(audio);
    source.connect(state.analyser);
    state.analyser.connect(state.context.destination);
    state.spectrum = new Uint8Array(state.analyser.frequencyBinCount);
  }
  return state.context;
}

async function selectAudio(file) {
  state.audioSelection?.abort();
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = null;
  state.audioReady = false;
  state.pending = false;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  state.audioFile = file;
  $('seek').value = '0';
  syncPlayback();
  const selection = new AbortController();
  state.audioSelection = selection;
  setTrackStatus(`正在加载 · ${file.name}`);
  try {
    const url = await loadLocalAudio(audio, file, { signal: selection.signal, getContext: getAudioContext, onFallback: () => setTrackStatus(`正在兼容解码 · ${file.name}`) });
    if (selection.signal.aborted) { URL.revokeObjectURL(url); return; }
    state.audioUrl = url;
    state.audioReady = true;
    setTrackStatus(file.name);
    syncPlayback();
  } catch (error) {
    if (!selection.signal.aborted) setTrackStatus(`${file.name}：${audioErrorMessage(error)}`, true);
  }
}

async function togglePlayback() {
  if (!state.audioReady || state.pending) return;
  if (!audio.paused) { audio.pause(); syncPlayback(); return; }
  const selection = state.audioSelection;
  state.pending = true;
  syncPlayback();
  try {
    const context = getAudioContext();
    if (context.state === 'suspended') await context.resume();
    if (selection.signal.aborted) return;
    await audio.play();
  } catch (error) {
    if (!selection.signal.aborted) setTrackStatus(audioErrorMessage(error), true);
  } finally {
    if (selection === state.audioSelection) { state.pending = false; syncPlayback(); }
  }
}

function setLogoMode(mode) {
  state.logoMode = mode;
  const hasImage = mode === 'image' && Boolean(state.logoUrl);
  $('badge').classList.toggle('has-image', hasImage);
  $('logoPreview').hidden = !hasImage;
  $('modeColor').setAttribute('aria-pressed', String(mode === 'color'));
  $('modeImage').setAttribute('aria-pressed', String(mode === 'image'));
  $('logoHint').textContent = mode === 'image' && !state.logoUrl ? '请先选择一张图片；选择后会显示在中心圆盘。' : '图片仅在当前页面使用，文字会显示在图片前方。';
  saveSettings();
}

function syncDesign() {
  const badge = $('badge');
  badge.style.setProperty('--badge-color', $('logoColor').value);
  badge.style.setProperty('--title-color', $('titleColor').value);
  badge.style.setProperty('--subtitle-color', $('subtitleColor').value);
  badge.style.setProperty('--title-size', `${$('titleSize').value}px`);
  badge.style.setProperty('--subtitle-size', `${$('subtitleSize').value}px`);
  badge.style.setProperty('--title-font', fonts[$('titleFont').value] || fonts.system);
  badge.style.setProperty('--subtitle-font', fonts[$('subtitleFont').value] || fonts.system);
  $('titlePreview').textContent = $('titleInput').value;
  $('subtitlePreview').textContent = $('subtitleInput').value;
  for (const id of ['titleSize', 'subtitleSize']) $(`${id}Value`).textContent = `${$(id).value}px`;
  $('volumeValue').textContent = `${$('volume').value}%`;
  $('sensitivityValue').textContent = `${$('sensitivity').value}%`;
  $('backgroundDimValue').textContent = `${$('backgroundDim').value}%`;
  audio.volume = Number($('volume').value) / 100;
  saveSettings();
}

function setPanel(open, clean = false) {
  root.classList.toggle('panel-open', open);
  root.classList.toggle('clean-view', clean);
  $('controlPanel').inert = !open;
  $('panelToggle').setAttribute('aria-expanded', String(open));
  $('toggleLabel').textContent = open ? '收起设置' : '展开设置';
  if (!open && document.activeElement?.closest('#controlPanel')) $('panelToggle').focus();
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.bgCache.width = canvas.width;
  state.bgCache.height = canvas.height;
  renderBackground();
}

function renderBackground() {
  const bg = state.bgCache.getContext('2d');
  const w = state.bgCache.width, h = state.bgCache.height;
  bg.clearRect(0, 0, w, h);
  bg.fillStyle = '#101421'; bg.fillRect(0, 0, w, h);
  if (state.image.complete && state.image.naturalWidth) {
    const scale = Math.max(w / state.image.naturalWidth, h / state.image.naturalHeight);
    const iw = state.image.naturalWidth * scale, ih = state.image.naturalHeight * scale;
    bg.save();
    bg.filter = $('grayscale').checked ? 'grayscale(1) contrast(1.18)' : 'saturate(1.08) contrast(1.08)';
    bg.drawImage(state.image, (w - iw) / 2, (h - ih) / 2, iw, ih);
    bg.restore();
  }
  bg.fillStyle = `rgba(4, 7, 17, ${Number($('backgroundDim').value) / 100})`;
  bg.fillRect(0, 0, w, h);
}

function setBackground(url) {
  const next = new Image();
  next.onload = () => { state.image = next; renderBackground(); };
  next.onerror = () => showToast('无法读取这张背景图片，请选择其他图片。');
  next.src = url;
}

function smooth(oldValue, target, factor = .19) { return oldValue + (target - oldValue) * factor; }
function energy(from, to) {
  if (!state.spectrum) return 0;
  const hzPerBin = state.context.sampleRate / state.analyser.fftSize;
  const low = Math.max(1, Math.floor(from / hzPerBin));
  const high = Math.min(state.spectrum.length - 1, Math.ceil(to / hzPerBin));
  let total = 0;
  for (let i = low; i <= high; i++) total += state.spectrum[i];
  return total / Math.max(1, high - low + 1) / 255;
}

function makeSpectrum(now) {
  const active = state.audioReady && !audio.paused && state.analyser && state.context.state === 'running';
  if (active) state.analyser.getByteFrequencyData(state.spectrum);
  const idle = .028 + .015 * Math.sin(now * .0014);
  state.bass = smooth(state.bass, active ? energy(35, 220) : idle);
  state.mid = smooth(state.mid, active ? energy(220, 2400) : idle);
  state.treble = smooth(state.treble, active ? energy(2400, 12000) : idle);
  const sensitivity = Number($('sensitivity').value) / 75;
  let outline = '', bars = '';
  const count = 144;
  for (let i = 0; i <= count; i++) {
    const angle = i / count * Math.PI * 2 - Math.PI;
    const earLeft = Math.exp(-Math.pow((angle + 2.46) / .20, 2));
    const earRight = Math.exp(-Math.pow((angle + .68) / .20, 2));
    const ears = 54 * (earLeft + earRight);
    const bin = state.spectrum ? Math.min(state.spectrum.length - 1, Math.floor((i % count) / count * state.spectrum.length * .72)) : 0;
    const energyAt = active ? state.spectrum[bin] / 255 : idle;
    const wave = Math.sin(i * .45 + now * .006) * 2.3;
    const radius = 185 + ears + wave + (state.bass * 12 + energyAt * 14) * sensitivity;
    const x = 300 + Math.cos(angle) * radius, y = 300 + Math.sin(angle) * radius;
    outline += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    if (i === count || i % 2) continue;
    const length = 7 + Math.max(0, energyAt * 46 + state.mid * 17 - 3) * sensitivity;
    const bx = 300 + Math.cos(angle) * (radius + 3), by = 300 + Math.sin(angle) * (radius + 3);
    const ex = 300 + Math.cos(angle) * (radius + length), ey = 300 + Math.sin(angle) * (radius + length);
    bars += `M${bx.toFixed(1)} ${by.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)} `;
  }
  const path = `${outline}Z`;
  $('shape').setAttribute('d', path);
  $('spectrumGlow').setAttribute('d', path);
  $('bars').setAttribute('d', bars);
  $('artwork').style.filter = `drop-shadow(0 0 ${Math.round(9 + state.bass * 35)}px rgba(244, 85, 197, .54))`;
}

function drawFrame(now) {
  state.frame = requestAnimationFrame(drawFrame);
  const w = innerWidth, h = innerHeight;
  ctx.drawImage(state.bgCache, 0, 0, w, h);
  // Quiet falling-light texture keeps the city alive without obscuring it.
  for (const drop of state.rain) {
    drop.y += drop.speed * Math.min(2, (now - state.time) / 16.7 || 1);
    if (drop.y > h + 8) { drop.y = -12; drop.x = Math.random() * w; }
    ctx.strokeStyle = `rgba(219, 228, 250, ${drop.alpha})`;
    ctx.lineWidth = drop.width;
    ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x - 1.5, drop.y + drop.length); ctx.stroke();
  }
  state.time = now;
  makeSpectrum(now);
}

for (let i = 0; i < 60; i++) state.rain.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, speed: .16 + Math.random() * .55, length: 3 + Math.random() * 15, alpha: .05 + Math.random() * .19, width: .5 + Math.random() * .9 });

for (const id of settingsIds) $(id).addEventListener('input', () => { syncDesign(); if (id === 'backgroundDim' || id === 'grayscale') renderBackground(); });
$('audioFile').addEventListener('change', event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void selectAudio(file); });
$('playButton').addEventListener('click', () => void togglePlayback());
$('seek').addEventListener('input', event => { if (state.audioReady && Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value) / 1000 * audio.duration; });
$('modeColor').addEventListener('click', () => setLogoMode('color'));
$('modeImage').addEventListener('click', () => { if (!state.logoUrl) $('logoFile').click(); else setLogoMode('image'); });
$('logoFile').addEventListener('change', event => {
  const file = event.target.files?.[0]; event.target.value = '';
  if (!file) return;
  const url = URL.createObjectURL(file);
  $('logoPreview').onload = () => { if (state.logoUrl) URL.revokeObjectURL(state.logoUrl); state.logoUrl = url; setLogoMode('image'); };
  $('logoPreview').onerror = () => { URL.revokeObjectURL(url); showToast('无法读取这张 Logo 图片。'); };
  $('logoPreview').src = url;
});
$('backgroundFile').addEventListener('change', event => {
  const file = event.target.files?.[0]; event.target.value = '';
  if (!file) return;
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.onload = () => { if (state.backgroundUrl) URL.revokeObjectURL(state.backgroundUrl); state.backgroundUrl = url; setBackground(url); };
  probe.onerror = () => { URL.revokeObjectURL(url); showToast('无法读取这张背景图片。'); };
  probe.src = url;
});
$('resetBackground').addEventListener('click', () => { if (state.backgroundUrl) URL.revokeObjectURL(state.backgroundUrl); state.backgroundUrl = null; setBackground('perth-skyline.png'); });
$('panelToggle').addEventListener('click', () => setPanel(!root.classList.contains('panel-open')));
$('closePanel').addEventListener('click', () => setPanel(false));
$('cleanView').addEventListener('click', () => { setPanel(false, true); $('toast').hidden = true; });
$('fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.requestFullscreen(); } catch { showToast('浏览器未允许全屏，可使用浏览器全屏快捷键。'); } });
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
  if (event.key.toLowerCase() === 'h') { event.preventDefault(); setPanel(!root.classList.contains('panel-open')); }
  if (event.code === 'Space' && !event.repeat && event.target?.tagName !== 'BUTTON') { event.preventDefault(); void togglePlayback(); }
});
audio.addEventListener('timeupdate', syncPlayback);
audio.addEventListener('loadedmetadata', syncPlayback);
audio.addEventListener('playing', syncPlayback);
audio.addEventListener('pause', syncPlayback);
audio.addEventListener('ended', () => { syncPlayback(); if (state.audioFile) setTrackStatus(`${state.audioFile.name} · 播放结束`); });
audio.addEventListener('error', () => { if (!state.audioReady) return; state.audioReady = false; syncPlayback(); setTrackStatus(audioErrorMessage(audio.error), true); });
window.addEventListener('resize', resize);
window.addEventListener('pagehide', () => { state.audioSelection?.abort(); audio.pause(); if (state.audioUrl) URL.revokeObjectURL(state.audioUrl); if (state.logoUrl) URL.revokeObjectURL(state.logoUrl); if (state.backgroundUrl) URL.revokeObjectURL(state.backgroundUrl); cancelAnimationFrame(state.frame); void state.context?.close(); });

setPanel(true);
syncDesign();
setLogoMode(state.logoMode === 'image' ? 'color' : state.logoMode);
resize();
setBackground('perth-skyline.png');
state.frame = requestAnimationFrame(drawFrame);
