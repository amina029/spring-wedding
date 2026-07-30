'use strict';

const $ = sel => document.querySelector(sel);
const state = { current: null, site: null };

// ---------- API ----------
async function apiGet(p) {
  const r = await fetch(p); if (!r.ok) throw new Error('请求失败 ' + p); return r.json();
}
async function apiPost(p, body) {
  const r = await fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('保存失败 ' + r.status));
  return j;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 2600);
}

// ---------- 视图切换 ----------
function show(view) {
  for (const v of ['#listView', '#editorView', '#siteView']) $(v).classList.add('hidden');
  $(view).classList.remove('hidden');
  if (view === '#listView') loadList();
}

// ---------- 项目列表 ----------
async function loadList() {
  $('#projectGrid').innerHTML = '<div class="loading">加载中…</div>';
  const data = await apiGet('/api/projects');
  const grid = $('#projectGrid'); grid.innerHTML = '';
  for (const p of data.projects) {
    const card = document.createElement('div');
    card.className = 'card';
    const img = p.cover ? `<img class="thumb" src="${p.cover}" loading="lazy" onerror="this.style.opacity=.3"/>` : '<div class="thumb"></div>';
    card.innerHTML = `${img}<div class="meta"><div class="t">${esc(p.title)}</div><div class="s">${esc(p.slug)}</div></div>`;
    card.onclick = () => openProject(p.slug);
    grid.appendChild(card);
  }
}

// ---------- 打开项目 ----------
async function openProject(slug) {
  show('#editorView');
  $('#editorTitle').textContent = '编辑：' + slug;
  state.current = await apiGet('/api/project/' + encodeURIComponent(slug));
  $('#previewBtn').href = '/preview/' + slug;
  fillBasic();
  renderDesc();
  renderGallery();
}

function fillBasic() {
  const p = state.current;
  $('#f_eyebrow').value = p.eyebrow || '';
  $('#f_title').value = p.title || '';
  $('#f_statement').value = p.statement || '';
  $('#f_tone').value = p.tone || '';
  $('#f_cover').value = p.cover || '';
  $('#coverPreview').src = p.cover || '';
  $('#f_film_src').value = (p.film && p.film.src) || '';
  $('#f_film_poster').value = (p.film && p.film.poster) || '';
}
function collectBasic() {
  const p = state.current;
  p.eyebrow = $('#f_eyebrow').value.trim();
  p.title = $('#f_title').value.trim();
  p.statement = $('#f_statement').value.trim();
  p.tone = $('#f_tone').value.trim();
  p.cover = $('#f_cover').value.trim();
  const src = $('#f_film_src').value.trim();
  const poster = $('#f_film_poster').value.trim();
  p.film = src ? { src, poster: poster || src } : undefined;
}

// ---------- 描述 ----------
function renderDesc() {
  const wrap = $('#descList'); wrap.innerHTML = '';
  const arr = state.current.description || (state.current.description = []);
  arr.forEach((para, i) => {
    const row = document.createElement('div'); row.className = 'desc-item';
    row.innerHTML = `<textarea rows="2">${esc(para)}</textarea><button class="ghost-btn" title="删除">✕</button>`;
    row.querySelector('textarea').oninput = e => arr[i] = e.target.value;
    row.querySelector('button').onclick = () => { arr.splice(i, 1); renderDesc(); };
    wrap.appendChild(row);
  });
}
$('#addDescBtn').onclick = () => { state.current.description.push(''); renderDesc(); };

// ---------- 画廊 ----------
function renderGallery() {
  const g = state.current.gallery || (state.current.gallery = []);
  const box = $('#gallery'); box.innerHTML = '';
  g.forEach((grp, gi) => box.appendChild(renderGroup(grp, gi)));
}
function renderGroup(grp, gi) {
  const div = document.createElement('div'); div.className = 'group';
  const title = document.createElement('div'); title.className = 'group-head';
  title.innerHTML = `<span class="g-title">分组 ${gi + 1}</span>
    <label style="margin:0">列数<input class="gc" type="number" min="1" max="6" value="${grp.gc || 3}"></label>
    <button class="up" title="上移">↑</button><button class="down" title="下移">↓</button>
    <button class="del" title="删除分组">🗑</button>`;
  title.querySelector('.gc').oninput = e => grp.gc = parseInt(e.target.value) || 1;
  title.querySelector('.up').onclick = () => { if (gi > 0) { swap(gi, gi - 1); renderGallery(); } };
  title.querySelector('.down').onclick = () => { if (gi < state.current.gallery.length - 1) { swap(gi, gi + 1); renderGallery(); } };
  title.querySelector('.del').onclick = () => { state.current.gallery.splice(gi, 1); renderGallery(); };
  div.appendChild(title);

  const items = document.createElement('div'); items.className = 'items'; items.dataset.gi = gi;
  (grp.items || (grp.items = [])).forEach((it, ii) => items.appendChild(renderItem(it, gi, ii)));
  div.appendChild(items);

  // 添加图片行
  const add = document.createElement('div'); add.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap';
  add.innerHTML = `<input class="add-path" placeholder="图片路径，如 /media/projects/${state.current.slug}/x.jpg" style="flex:1;min-width:200px">
    <button class="add-path-btn">添加路径</button><button class="up-btn">上传图片</button>
    <input type="file" accept="image/*" hidden>`;
  add.querySelector('.add-path-btn').onclick = () => {
    const v = add.querySelector('.add-path').value.trim(); if (!v) return;
    grp.items.push({ src: v, alt: state.current.slug, caption: [state.current.title || state.current.slug, ''] });
    renderGallery();
  };
  const fileInput = add.querySelector('input[type=file]');
  add.querySelector('.up-btn').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const f = fileInput.files[0]; if (!f) return;
    try { toast('上传中…'); const data = await uploadFile(state.current.slug, f);
      grp.items.push({ src: data.path, alt: state.current.slug, caption: [state.current.title || state.current.slug, ''] });
      renderGallery(); toast('已添加'); }
    catch (e) { toast('上传失败：' + e.message); }
  };
  div.appendChild(add);

  // DnD on items container
  items.addEventListener('dragover', e => { e.preventDefault(); items.classList.add('drag-over'); });
  items.addEventListener('dragleave', () => items.classList.remove('drag-over'));
  items.addEventListener('drop', e => {
    e.preventDefault(); items.classList.remove('drag-over');
    if (!dragSrc) return;
    const toGi = gi;
    const toIi = dropIndex(items, e.clientY);
    moveItem(dragSrc.gi, dragSrc.ii, toGi, toIi);
    dragSrc = null; renderGallery();
  });
  return div;
}
function renderItem(it, gi, ii) {
  const d = document.createElement('div'); d.className = 'item'; d.draggable = true;
  d.dataset.gi = gi; d.dataset.ii = ii;
  d.innerHTML = `<div class="handle">⠿</div><button class="item-del" title="删除">✕</button>
    <img src="${it.src}" onerror="this.style.opacity=.3"/>
    <div class="cap"><input value="${esc((it.caption && it.caption[0]) || '')}" placeholder="标题"><input value="${esc((it.caption && it.caption[1]) || '')}" placeholder="编号"></div>`;
  d.querySelector('.item-del').onclick = e => { e.stopPropagation(); state.current.gallery[gi].items.splice(ii, 1); renderGallery(); };
  d.querySelectorAll('.cap input').forEach((inp, k) => inp.oninput = e => {
    it.caption = it.caption || ['', '']; it.caption[k] = e.target.value;
  });
  d.addEventListener('dragstart', e => {
    if (e.target.matches('input,button')) { e.preventDefault(); return; }
    dragSrc = { gi, ii }; d.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  d.addEventListener('dragend', () => { d.classList.remove('dragging'); dragSrc = null; });
  return d;
}
let dragSrc = null;
function dropIndex(container, y) {
  const items = [...container.querySelectorAll('.item')].filter(e => !e.classList.contains('dragging'));
  for (let i = 0; i < items.length; i++) {
    const r = items[i].getBoundingClientRect();
    if (y < r.top + r.height / 2) return i;
  }
  return items.length;
}
function moveItem(fg, fi, tg, ti) {
  const g = state.current.gallery;
  const [it] = g[fg].items.splice(fi, 1);
  g[tg].items.splice(ti, 0, it);
}
function swap(a, b) { const g = state.current.gallery; [g[a], g[b]] = [g[b], g[a]]; }

// ---------- 上传 ----------
async function uploadFile(slug, file) {
  const dataUrl = await readFileAsDataURL(file);
  return apiPost('/api/upload', { slug, filename: file.name, data: dataUrl });
}
function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });
}

// ---------- 保存项目 ----------
$('#saveBtn').onclick = async () => {
  const btn = $('#saveBtn'); btn.disabled = true; const st = $('#saveStatus'); st.className = 'save-status'; st.textContent = '保存中…';
  try {
    collectBasic();
    state.current.description = state.current.description.filter(x => x !== undefined);
    await apiPost('/api/project/' + encodeURIComponent(state.current.slug), state.current);
    st.className = 'save-status ok';
    st.textContent = '✅ 已保存并推送到 GitHub，Netlify 正在自动部署（约 1 分钟）。可点「预览本页」查看。';
    toast('发布成功 🚀');
  } catch (e) {
    st.className = 'save-status err'; st.textContent = '❌ ' + e.message;
    toast('保存失败');
  } finally { btn.disabled = false; }
};

// 封面上传
$('#coverFile').onchange = async () => {
  const f = $('#coverFile').files[0]; if (!f) return;
  try { toast('上传封面中…'); const d = await uploadFile(state.current.slug, f);
    $('#f_cover').value = d.path; $('#coverPreview').src = d.path; toast('封面已更新'); }
  catch (e) { toast('上传失败：' + e.message); }
};
document.querySelector('[data-upload="cover"]').onclick = () => $('#coverFile').click();

// ---------- 站点设置 ----------
async function openSite() {
  show('#siteView');
  state.site = await apiGet('/api/site');
  const s = state.site;
  $('#s_kicker').value = s.kicker || '';
  $('#s_titleLead').value = s.titleLead || '';
  $('#s_titleEm').value = s.titleEm || '';
  $('#s_footerEyebrow').value = s.footerEyebrow || '';
  $('#s_footerTitle').value = s.footerTitle || '';
  $('#s_footerBody').value = s.footerBody || '';
  $('#s_phone').value = s.phone || '';
  $('#s_phoneTel').value = s.phoneTel || '';
  $('#s_contactNote').value = s.contactNote || '';
  $('#s_wechatQr').value = s.wechatQr || '';
  $('#s_b_phone').value = (s.contactB && s.contactB.phone) || '';
  $('#s_b_phoneTel').value = (s.contactB && s.contactB.phoneTel) || '';
  $('#s_b_contactNote').value = (s.contactB && s.contactB.contactNote) || '';
  $('#s_b_wechatQr').value = (s.contactB && s.contactB.wechatQr) || '';
  renderOrder();
}
function renderOrder() {
  const wrap = $('#orderList'); wrap.innerHTML = '';
  (state.site.projects || []).forEach((slug, i) => {
    const row = document.createElement('div'); row.className = 'order-item';
    row.innerHTML = `<span class="o-title">${esc(slug)}</span>
      <button class="up">↑</button><button class="down">↓</button>`;
    row.querySelector('.up').onclick = () => { if (i > 0) { swapArr(state.site.projects, i, i - 1); renderOrder(); } };
    row.querySelector('.down').onclick = () => { if (i < state.site.projects.length - 1) { swapArr(state.site.projects, i, i + 1); renderOrder(); } };
    wrap.appendChild(row);
  });
}
function swapArr(a, i, j) { [a[i], a[j]] = [a[j], a[i]]; }
$('#siteSaveBtn').onclick = async () => {
  const s = state.site;
  s.kicker = $('#s_kicker').value.trim(); s.titleLead = $('#s_titleLead').value.trim(); s.titleEm = $('#s_titleEm').value.trim();
  s.footerEyebrow = $('#s_footerEyebrow').value.trim(); s.footerTitle = $('#s_footerTitle').value.trim(); s.footerBody = $('#s_footerBody').value.trim();
  s.phone = $('#s_phone').value.trim(); s.phoneTel = $('#s_phoneTel').value.trim(); s.contactNote = $('#s_contactNote').value.trim(); s.wechatQr = $('#s_wechatQr').value.trim();
  s.contactB = {
    phone: $('#s_b_phone').value.trim(),
    phoneTel: $('#s_b_phoneTel').value.trim(),
    contactNote: $('#s_b_contactNote').value.trim(),
    wechatQr: $('#s_b_wechatQr').value.trim()
  };
  const btn = $('#siteSaveBtn'); btn.disabled = true; const st = $('#siteSaveStatus'); st.className = 'save-status'; st.textContent = '保存中…';
  try {
    await apiPost('/api/site', s);
    st.className = 'save-status ok'; st.textContent = '✅ 已保存并推送，Netlify 自动部署中。'; toast('站点设置已发布 🚀');
  } catch (e) { st.className = 'save-status err'; st.textContent = '❌ ' + e.message; toast('保存失败'); }
  finally { btn.disabled = false; }
};

// ---------- 设置 (Token) ----------
$('#settingsBtn').onclick = async () => {
  const st = await apiGet('/api/token/status');
  $('#tokenStatus').textContent = st.set ? '✅ 已保存 Token' : '⚠️ 尚未设置 Token（保存会失败）';
  $('#settingsModal').classList.remove('hidden');
};
$('#tokenCloseBtn').onclick = () => $('#settingsModal').classList.add('hidden');
$('#tokenSaveBtn').onclick = async () => {
  const t = $('#tokenInput').value.trim(); if (!t) return;
  await apiPost('/api/token', { token: t });
  $('#tokenStatus').textContent = '✅ 已保存，现在可以保存并发布了';
  toast('Token 已保存');
  setTimeout(() => $('#settingsModal').classList.add('hidden'), 800);
};

// ---------- 导航 ----------
$('#backBtn').onclick = () => show('#listView');
$('#siteBackBtn').onclick = () => show('#listView');
$('#editSiteBtn').onclick = openSite;

// ---------- 工具 ----------
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// 启动
loadList();
