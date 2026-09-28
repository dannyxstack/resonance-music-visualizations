import './style.css';
import { projects, filterProjects } from './projects.js';

const icons = {
  wave: '<path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const app = document.querySelector('#app');
const state = { query: '', category: '全部作品', favoritesOnly: false, favorites: [] };
try { const stored = JSON.parse(localStorage.getItem('resonance:favorites') || '[]'); if (Array.isArray(stored)) state.favorites = stored.filter(id => projects.some(p => p.id === id)); } catch {}
const asset = path => `${import.meta.env.BASE_URL}${path}`;
const logo = `<a class="logo" href="#" aria-label="RESONANCE 首页"><span class="logo-mark">${icon('wave')}</span>RESONANCE<span class="logo-dot">®</span></a>`;
let cleanup = () => {};

function saveFavorite(id) {
  state.favorites = state.favorites.includes(id) ? state.favorites.filter(value => value !== id) : [...state.favorites, id];
  try { localStorage.setItem('resonance:favorites', JSON.stringify(state.favorites)); } catch {}
}

function renderHome() {
  const featured = projects.find(p => p.featured) || projects[0];
  app.innerHTML = `<header class="header">${logo}<nav aria-label="主导航"><a class="active" href="#collection">探索作品 <span>${String(projects.length).padStart(2, '0')}</span></a><button id="my-favorites">${icon('heart')} 我的收藏</button></nav><span class="header-note"><i></i> SOUND INTO SIGHT</span></header>
  <main class="home"><section class="intro"><div><div class="eyebrow"><span></span> AN INDEPENDENT VISUAL EXPERIENCE</div><h1>让声音，<span>有迹可循。</span></h1><p>在城市、光影与数字世界之间，找到属于你的音乐形状。</p></div><div class="intro-side">用耳朵聆听。<br>用眼睛感受。<span>VOLUME 001 — ${featured.year}</span></div></section>
  <section class="hero" aria-label="精选作品"><img src="${asset(featured.cover)}" alt="${featured.title}精选场景"/><div class="hero-shade"></div><div class="hero-top"><span class="feature-label"><i></i> 本期精选 / FEATURED</span><span class="hero-index">01 / ${String(projects.length).padStart(2, '0')}</span></div><div class="hero-content"><span class="eyebrow">${featured.location}</span><h2>${featured.title}</h2><p>${featured.description}</p><a class="primary" href="#/experience/${featured.id}">进入视听空间 ${icon('arrow')}</a></div><div class="hero-caption"><span class="mini-wave">▂ ▅ ▃ ▇ ▄ ▂ ▆ ▃ ▅</span><span>YOUR MUSIC. YOUR UNIVERSE.</span></div></section>
  <section id="collection" class="collection"><div class="collection-heading"><div><span class="eyebrow">THE COLLECTION</span><h2>探索视听世界 <span id="result-count"></span></h2></div><p>每一首音乐，都有另一种打开方式。</p></div><div class="toolbar"><div class="filters" role="group" aria-label="作品分类">${['全部作品', ...new Set(projects.map(p => p.category))].map(c => `<button data-category="${c}" class="filter">${c}</button>`).join('')}<button class="filter favorite-filter" id="favorite-filter">${icon('heart')} 收藏</button></div><label class="search">${icon('search')}<input id="search" type="search" placeholder="搜索风格、城市、关键词…" aria-label="搜索作品"/><kbd>/</kbd></label></div><div class="grid" id="project-grid"></div></section>
  <section class="closing"><span class="closing-symbol">${icon('wave')}</span><div><h3>世界还在生长，下一种共振即将发生。</h3><p>更多城市，更多风格，更多音乐的可能。</p></div><span class="closing-note">AN EVER-GROWING COLLECTION ${icon('arrow')}</span></section></main><footer><span>© ${new Date().getFullYear()} RESONANCE</span><span>为音乐而生 · 在浏览器中感受</span><span><i></i> 音频仅在本地处理</span></footer>`;
  const search = document.querySelector('#search');
  search.value = state.query;
  search.addEventListener('input', () => { state.query = search.value; renderCards(); });
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { state.category = button.dataset.category; renderCards(); }));
  const toggleFavorites = () => { state.favoritesOnly = !state.favoritesOnly; renderCards(); document.querySelector('#collection').scrollIntoView({ behavior: 'smooth' }); };
  document.querySelector('#my-favorites').onclick = toggleFavorites;
  document.querySelector('#favorite-filter').onclick = toggleFavorites;
  const onKey = e => { if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); search.focus(); } };
  window.addEventListener('keydown', onKey);
  cleanup = () => window.removeEventListener('keydown', onKey);
  renderCards();
}

function renderCards() {
  const filtered = filterProjects(state);
  document.querySelector('#result-count').textContent = String(filtered.length).padStart(2, '0');
  document.querySelectorAll('[data-category]').forEach(b => { b.classList.toggle('selected', b.dataset.category === state.category); b.setAttribute('aria-pressed', String(b.dataset.category === state.category)); });
  for (const id of ['favorite-filter', 'my-favorites']) { const b = document.getElementById(id); b.classList.toggle('selected', state.favoritesOnly); b.setAttribute('aria-pressed', String(state.favoritesOnly)); }
  document.querySelector('#project-grid').innerHTML = filtered.length ? filtered.map(p => `<article class="project-card" style="--accent:${p.accent}"><div class="card-art"><a href="#/experience/${p.id}" aria-label="进入${p.title}"><img src="${asset(p.cover)}" alt="${p.title}场景${p.id === 'bay-area' ? '示意图' : '背景'}" loading="lazy"/><span class="art-overlay"></span><span class="card-category">${p.category}</span><span class="enter-circle">${icon('arrow')}</span><span class="art-coordinates">${p.location}</span></a><button class="favorite ${state.favorites.includes(p.id) ? 'saved' : ''}" data-favorite="${p.id}" aria-label="${state.favorites.includes(p.id) ? '取消收藏' : '收藏'}${p.title}" aria-pressed="${state.favorites.includes(p.id)}">${icon('heart')}</button></div><div class="card-info"><div class="card-number">${String(projects.indexOf(p) + 1).padStart(2, '0')} / ${p.english}</div><a class="card-title" href="#/experience/${p.id}"><h3>${p.title}</h3>${icon('arrow')}</a><p>${p.description}</p><div class="tags">${p.tags.map(t => `<span>${t}</span>`).join('')}<span class="audio-tag">${icon('wave')} AUDIO REACTIVE</span></div></div></article>`).join('') : `<div class="empty">${icon('search')}<h3>${state.favoritesOnly ? '还没有符合条件的收藏' : '没有找到匹配的作品'}</h3><p>试试其他关键词，或回到全部作品继续探索。</p><button id="reset-filters" class="primary">查看全部作品 ${icon('arrow')}</button></div>`;
  document.querySelectorAll('[data-favorite]').forEach(b => b.onclick = () => { saveFavorite(b.dataset.favorite); renderCards(); document.querySelector(`[data-favorite="${b.dataset.favorite}"]`)?.focus(); });
  document.querySelector('#reset-filters')?.addEventListener('click', () => { state.query = ''; state.category = '全部作品'; state.favoritesOnly = false; document.querySelector('#search').value = ''; renderCards(); });
}

function renderExperience(id) {
  const p = projects.find(project => project.id === id);
  if (!p) { app.innerHTML = `<div class="not-found">${logo}<h1>这个视听空间尚未收录。</h1><a class="primary" href="#">返回作品集 ${icon('arrow')}</a></div>`; return; }
  document.title = `${p.title} · RESONANCE`;
  app.innerHTML = `<main class="experience"><header class="experience-header"><a class="back" href="#collection" aria-label="返回作品集">${icon('back')}<span>作品集</span></a><span class="divider"></span><div class="experience-title"><span>${p.english}</span><strong>${p.title}</strong></div><div class="experience-actions"><label class="sr-only" for="scene-switch">切换作品</label><select id="scene-switch">${projects.map(item => `<option value="${item.id}" ${item.id === p.id ? 'selected' : ''}>${item.title}</option>`).join('')}</select><button id="help" aria-expanded="false">使用说明</button><button id="fullscreen" aria-label="全屏效果">${icon('expand')}<span>全屏</span></button></div></header><div id="help-panel" class="help-panel" hidden>${p.instructions} 音频仅在本地处理。切换作品或返回作品集会停止当前播放。</div><div class="scene-frame"><iframe title="${p.title}音乐可视化" src="${asset(p.entry)}" allow="autoplay; fullscreen" allowfullscreen></iframe></div><div class="experience-status"><span><i></i> ${p.location}</span><span>选择音乐，开始你的视听体验</span><span id="scene-status" role="status">正在加载场景…</span></div></main>`;
  const frame = document.querySelector('iframe');
  const timer = setTimeout(() => { document.querySelector('#scene-status').textContent = '加载较慢，可刷新页面重试'; }, 15000);
  frame.addEventListener('load', () => {
    clearTimeout(timer);
    const ready = frame.contentDocument?.querySelector('canvas, #root');
    document.querySelector('#scene-status').textContent = ready ? '音频仅在本地处理' : '场景未加载，请检查构建或刷新页面';
  });
  document.querySelector('#scene-switch').onchange = e => { location.hash = `/experience/${e.target.value}`; };
  document.querySelector('#help').onclick = e => { const panel = document.querySelector('#help-panel'); panel.hidden = !panel.hidden; e.currentTarget.setAttribute('aria-expanded', String(!panel.hidden)); };
  document.querySelector('#fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('.scene-frame').requestFullscreen(); } catch { document.querySelector('#scene-status').textContent = '浏览器暂不支持全屏，可使用浏览器全屏模式'; } };
  cleanup = () => { clearTimeout(timer); frame.src = 'about:blank'; };
}

function route() {
  // Removing the old iframe releases its audio context and animation loops.
  cleanup(); cleanup = () => {};
  document.title = 'RESONANCE · 音乐可视化空间';
  const match = location.hash.match(/^#\/experience\/([^/]+)$/);
  if (match) renderExperience(match[1]); else renderHome();
  if (location.hash === '#collection') requestAnimationFrame(() => document.querySelector('#collection')?.scrollIntoView()); else window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
