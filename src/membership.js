const guest = { tier: 'guest', maxSeconds: 30, maxWidth: 1280, watermark: true, maxProjects: 0 };
let session = null;
const listeners = new Set();
export async function api(path, options = {}) {
  const response = await fetch('/api' + path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败 (${response.status})`);
  return data;
}
export async function loadSession() {
  try { session = await api('/me'); } catch { session = { policy: guest, unavailable: true }; }
  for (const listener of listeners) listener(session);
  return session;
}
export function onSession(listener) { listeners.add(listener); if (session) listener(session); return () => listeners.delete(listener); }
export function currentSession() { return session; }
export function drawBrandMark(ctx, width, height) {
  const font = Math.max(14, Math.round(width * .016));
  ctx.save(); ctx.font = `700 ${font}px Arial, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  const x = width - font * 1.1, y = height - font * .95;
  const text = 'RESONANCE'; const span = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - span - font * .6, y - font * 1.25, span + font * .9, font * 1.55);
  ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fillText(text, x, y);
  ctx.restore();
}
export async function beginExport() { const data = await api('/exports', { method: 'POST' }); return data; }
export async function endExport(id, completed) { if (id) await api(`/exports/${id}/${completed ? 'complete' : 'cancel'}`, { method: 'POST' }); await loadSession(); }
function inputValue(element) { return element.type === 'checkbox' || element.type === 'radio' ? element.checked : element.value; }
function collectConfig() {
  const controls = {};
  document.querySelectorAll('input[id], select[id], textarea[id]').forEach(element => {
    if (element.type === 'file' || element.type === 'password' || element.type === 'email' || element.closest('.shared-export-panel, .member-panel, .member-dialog') || /audioFile|backgroundFile|cityImage|logoImage|export|seek/i.test(element.id)) return;
    controls[element.id] = inputValue(element);
  });
  return { controls };
}
function applyConfig(config) {
  for (const [id, value] of Object.entries(config?.controls || {})) {
    const element = document.getElementById(id);
    if (!element || element.type === 'file' || element.closest('.shared-export-panel, .member-panel, .member-dialog')) continue;
    if (element.tagName === 'SELECT' && ![...element.options].some(option => option.value === String(value))) continue;
    if (element.type === 'checkbox' || element.type === 'radio') { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set; setter?.call(element, Boolean(value)); }
    else if (element.type === 'range' || element.type === 'number') { const n = Number(value); if (!Number.isFinite(n)) continue; { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(element, String(Math.max(Number(element.min || n), Math.min(Number(element.max || n), n)))); } }
    else { const proto = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set; setter?.call(element, String(value).slice(0, element.maxLength > 0 ? element.maxLength : 1000)); }
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
function ensureStyle() { if (document.getElementById('member-style')) return; const style = document.createElement('style'); style.id = 'member-style'; style.textContent = `.member-panel{border:1px solid #ffffff36;border-radius:12px;padding:12px;margin:16px 0;color:inherit}.member-panel h3{margin:0 0 8px}.member-panel p{margin:6px 0;font-size:13px;line-height:1.5}.member-panel button,.member-dialog button{cursor:pointer}.member-panel input,.member-panel select{max-width:100%;box-sizing:border-box}.member-panel .member-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.member-dialog{position:fixed;z-index:99999;inset:0;background:#050914dd;display:grid;place-items:center;padding:16px}.member-dialog[hidden]{display:none}.member-card{background:#172132;color:white;max-width:420px;width:100%;padding:24px;border:1px solid #68758b;border-radius:16px;box-shadow:0 14px 60px #0009;font:15px/1.5 Arial,sans-serif}.member-card h2{margin:0 0 12px}.member-card label{display:block;margin:10px 0}.member-card input{display:block;width:100%;box-sizing:border-box;padding:9px;margin-top:4px}.member-card .member-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.member-card button{padding:7px 11px}.member-card [data-message]{min-height:1.4em;color:#ffdc86}`; document.head.append(style); }
export function openAccount() {
  ensureStyle(); let dialog = document.querySelector('.member-dialog');
  if (!dialog) { dialog = document.createElement('div'); dialog.className = 'member-dialog'; dialog.addEventListener('click', event => { if (event.target === dialog) dialog.hidden = true; }); dialog.addEventListener('keydown', event => { if (event.key === 'Escape') dialog.hidden = true; }); document.body.append(dialog); }
  dialog.hidden = false;
  const show = async () => {
    const data = await loadSession(); const p = data.policy;
    dialog.innerHTML = `<div class="member-card" role="dialog" aria-modal="true" aria-label="账户与会员"><button data-close style="float:right">×</button><h2>RESONANCE 账户</h2><p data-summary></p><div data-body></div><p data-message role="status"></p></div>`;
    dialog.querySelector('[data-close]').onclick = () => { dialog.hidden = true; }; dialog.querySelector('[data-close]').focus();
    const summary = dialog.querySelector('[data-summary]'); const body = dialog.querySelector('[data-body]'); const message = dialog.querySelector('[data-message]');
    summary.textContent = data.email ? `${data.email} · ${p.tier === 'pro' ? 'Pro' : `免费 · 本月已导出 ${p.usedExports || 0}/3 次`}` : '游客：可导出 30 秒 720p 带角标短片';
    if (data.email) {
      body.innerHTML = `<p>免费版：每月 3 次完整导出，单次最长 5 分钟。Pro：1080p、无角标、不限次数。</p><div class="member-actions"><button data-upgrade>升级 Pro</button><button data-manage>管理订阅</button><button data-logout>退出登录</button></div>`;
      body.querySelector('[data-upgrade]').hidden = p.tier === 'pro';
      body.querySelector('[data-manage]').hidden = !data.hasSubscription;
      body.querySelector('[data-upgrade]').onclick = async () => { try { const x = await api('/billing/checkout', { method: 'POST' }); window.top.location.assign(x.url); } catch(e) { message.textContent = e.message; } };
      body.querySelector('[data-manage]').onclick = async () => { try { const x = await api('/billing/portal', { method: 'POST' }); window.top.location.assign(x.url); } catch(e) { message.textContent = e.message; } };
      body.querySelector('[data-logout]').onclick = async () => { await api('/logout', { method: 'POST' }); if (window.parent !== window) window.parent.postMessage({ type: 'resonance-auth-change' }, location.origin); await show(); };
    } else {
      body.innerHTML = `<div class="member-actions"><button data-mode="login">登录</button><button data-mode="register">注册</button><button data-mode="forgot">找回密码</button></div><form data-form><label>邮箱<input name="email" type="email" required autocomplete="email"></label><label data-password>密码<input name="password" type="password" required minlength="10" autocomplete="current-password"></label><button type="submit">登录</button></form>`;
      const form = body.querySelector('form'); let mode = 'login'; const switchMode = next => { mode = next; form.querySelector('[data-password]').hidden = mode === 'forgot'; form.querySelector('[name=password]').required = mode !== 'forgot'; form.querySelector('button').textContent = { login: '登录', register: '注册', forgot: '发送重置邮件' }[mode]; message.textContent = ''; };
      body.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => switchMode(button.dataset.mode));
      form.onsubmit = async event => { event.preventDefault(); try { const fields = Object.fromEntries(new FormData(form)); await api(mode === 'forgot' ? '/password/forgot' : `/${mode}`, { method: 'POST', body: JSON.stringify(fields) }); if (mode === 'forgot') message.textContent = '若邮箱已注册，重置邮件将发送给你。'; else { await show(); window.dispatchEvent(new Event('resonance-auth-change')); if (window.parent !== window) window.parent.postMessage({ type: 'resonance-auth-change' }, location.origin); } } catch(e) { message.textContent = e.message; } };
    }
  };
  void show();
}
export function mountProjectStorage(container, sceneId, { getSceneConfig, applySceneConfig } = {}) {
  ensureStyle(); const section = document.createElement('section'); section.className = 'member-panel'; section.innerHTML = `<h3>云端配置</h3><p>仅保存场景参数与文字。音乐和图片仍在本地，重新打开时需重新选择。</p><div class="member-row"><input data-name maxlength="100" placeholder="配置名称" aria-label="配置名称"><button data-save>保存配置</button></div><div class="member-row"><select data-list aria-label="已保存配置"><option value="">选择配置</option></select><button data-load>载入</button><button data-delete>删除</button></div><p data-status role="status"></p>`;container.append(section);
  const $ = s => section.querySelector(s), status = text => { $('[data-status]').textContent = text; };
  const refresh = async () => { try { const data = await api('/projects'); $('[data-list]').innerHTML = '<option value="">选择配置</option>'; for (const item of data.projects.filter(p => p.sceneId === sceneId)) { const option = document.createElement('option'); option.value = String(item.id); option.textContent = item.name; option.dataset.config = JSON.stringify(item.config); $('[data-list]').append(option); } } catch { $('[data-list]').innerHTML = '<option value="">登录后可保存</option>'; } };
  $('[data-save]').onclick = async () => { const name = $('[data-name]').value.trim() || `${sceneId} ${new Date().toLocaleString()}`; try { await api('/projects', { method: 'POST', body: JSON.stringify({ sceneId, name, config: { ...collectConfig(), scene: getSceneConfig?.() || null } }) }); status('配置已保存。重新打开时需重新选择音乐和图片。'); await refresh(); } catch(e) { status(e.message); if (e.message.includes('登录')) openAccount(); } };
  $('[data-load]').onclick = () => { const option = $('[data-list]').selectedOptions[0]; if (!option?.dataset.config) return; const config = JSON.parse(option.dataset.config); applyConfig(config); if (config.scene && applySceneConfig) applySceneConfig(config.scene); status('配置已载入。音乐和图片请重新选择。'); };
  $('[data-delete]').onclick = async () => { const id = $('[data-list]').value; if (!id) return; try { await api('/projects/' + id, { method: 'DELETE' }); await refresh(); status('已删除。'); } catch(e) { status(e.message); } };
  const unsubscribe = onSession(refresh); void refresh(); return { dispose() { unsubscribe(); section.remove(); } };
}
if (location.hash.startsWith('#/reset?token=')) { const token = new URLSearchParams(location.hash.slice(location.hash.indexOf('?') + 1)).get('token'); const password = prompt('请输入新密码（至少 10 个字符）'); if (token && password) api('/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) }).then(() => alert('密码已重置，请登录。')).catch(e => alert(e.message)); }
