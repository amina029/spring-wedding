#!/usr/bin/env node
/**
 * SPRING 作品集 · 本地可视化编辑器
 * 运行：node server.js   （默认 http://localhost:5055）
 *
 * 功能：
 *  - 读取 content/*.json 展示项目卡片 / 站点设置
 *  - 在网页里直观编辑文本、画廊（拖拽排序 / 删除 / 上传）
 *  - 保存时：写 JSON → 跑 build.js 重生成 HTML → git 提交 → 推送到 GitHub
 *  - Netlify 检测到推送后自动部署
 *
 * 安全：GitHub Token 只存在本机 admin-custom/.env，不会出现在网页/仓库里。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');        // 仓库根目录 (spring-wedding-git)
const PUBLIC = path.join(__dirname, 'public');
const ENV_PATH = path.join(__dirname, '.env');
const PORT = process.env.PORT || 5055;
const REMOTE_REPO = 'amina029/spring-wedding';
const BRANCH = 'main';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

// ---------- token ----------
function loadToken() {
  try {
    const txt = fs.readFileSync(ENV_PATH, 'utf-8');
    const m = txt.match(/GITHUB_TOKEN\s*=\s*(\S+)/);
    return m ? m[1].trim() : '';
  } catch { return ''; }
}
function saveToken(t) {
  fs.writeFileSync(ENV_PATH, `GITHUB_TOKEN=${t.trim()}\n`, 'utf-8');
}

// ---------- helpers ----------
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}
function serveFile(res, filePath, forceType) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    const type = forceType || MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}
function readBody(req, limit = 100 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(Buffer.concat(chunks).toString('utf-8')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
function git(args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: ROOT }, (e, so, se) => {
      if (e) reject(new Error((se || so || e.message).toString()));
      else resolve((so || '').toString());
    });
  });
}

// 串行锁，避免同时保存造成 git 冲突
let chain = Promise.resolve();
function withLock(fn) {
  const run = chain.then(fn, fn);
  chain = run.then(() => {}, () => {});
  return run;
}

function projPath(slug) { return path.join(ROOT, 'content', 'projects', `${slug}.json`); }
function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }

function listProjects() {
  const site = readJSON(path.join(ROOT, 'content', 'site.json'));
  const projects = site.projects.map(slug => {
    let title = slug, cover = '';
    try {
      const p = readJSON(projPath(slug));
      title = p.title || slug;
      cover = p.cover || '';
    } catch {}
    return { slug, title, cover };
  });
  return { order: site.projects, projects };
}

// 写文件 + 构建 + 提交 + 推送
async function commitAndPush(message) {
  // 1) 重新生成 HTML
  await new Promise((res, rej) => {
    execFile(process.execPath, ['build.js'], { cwd: ROOT }, (e, so, se) => {
      if (e) rej(new Error('build.js 失败:\n' + (se || e.message)));
      else res(so);
    });
  });
  // 2) 暂存（内容源、构建产物、上传的媒体；避免误带编辑器自身 / 备份目录）
  await git(['add', 'content', 'index.html', 'project', 'media']);
  // 3) 提交（若无可提交内容则跳过）
  const status = await git(['status', '--porcelain']);
  if (!status.trim()) return { ok: true, committed: false, pushed: false, message: '没有变动' };
  await git(['commit', '-m', message]);
  // 4) 推送
  const token = loadToken();
  let pushArg;
  if (token) {
    pushArg = [`https://${token}@github.com/${REMOTE_REPO}.git`, `HEAD:${BRANCH}`];
  } else {
    pushArg = ['origin', BRANCH];
  }
  const pushOut = await git(['push', ...pushArg]);
  const commitHash = (await git(['rev-parse', '--short', 'HEAD'])).trim();
  return { ok: true, committed: true, pushed: true, commit: commitHash, pushOut: pushOut.trim() };
}

// ---------- API ----------
async function handleApi(req, res, url) {
  const p = url.pathname;

  if (p === '/api/projects' && req.method === 'GET') {
    return sendJSON(res, 200, listProjects());
  }
  if (p === '/api/site' && req.method === 'GET') {
    return sendJSON(res, 200, readJSON(path.join(ROOT, 'content', 'site.json')));
  }
  if (p.startsWith('/api/project/') && req.method === 'GET') {
    const slug = decodeURIComponent(p.slice('/api/project/'.length));
    try { return sendJSON(res, 200, readJSON(projPath(slug))); }
    catch { return sendJSON(res, 404, { error: 'not found' }); }
  }

  if (p === '/api/token' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const t = (body.token || '').trim();
    if (!t) return sendJSON(res, 400, { error: 'missing token' });
    if (/\s/.test(t) || /https?:\/\//.test(t) || !/^(gh[pousr]_|github_pat_)/.test(t)) {
      return sendJSON(res, 400, { error: 'token 格式不对：请只粘贴以 ghp_（或 github_pat_）开头的那串字符，不要带 http://、空格或别的文字' });
    }
    saveToken(t);
    return sendJSON(res, 200, { ok: true });
  }
  if (p === '/api/token/status' && req.method === 'GET') {
    return sendJSON(res, 200, { set: !!loadToken() });
  }
  if (p === '/api/status' && req.method === 'GET') {
    try {
      const st = (await git(['status', '--porcelain'])).trim();
      const br = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
      return sendJSON(res, 200, { git: st ? '有未提交改动' : '干净', branch: br, tokenSet: !!loadToken() });
    } catch (e) { return sendJSON(res, 200, { git: 'unknown', error: e.message }); }
  }

  if (p === '/api/upload' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const { slug, filename, data, brand } = body;
    if (!filename || !data) return sendJSON(res, 400, { error: 'missing fields' });
    const m = data.match(/^data:([^;]+);base64,(.+)$/);
    const b64 = m ? m[2] : data;
    const buf = Buffer.from(b64, 'base64');
    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const dir = brand ? path.join(ROOT, 'media', 'brand') : path.join(ROOT, 'media', 'projects', slug);
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, safeName);
    fs.writeFileSync(out, buf);
    const prefix = brand ? '/media/brand' : `/media/projects/${slug}`;
    return sendJSON(res, 200, { ok: true, path: `${prefix}/${safeName}` });
  }

  if (p.startsWith('/api/project/') && req.method === 'POST') {
    const slug = decodeURIComponent(p.slice('/api/project/'.length));
    const body = JSON.parse(await readBody(req));
    if (!body || typeof body !== 'object' || body.slug !== slug)
      return sendJSON(res, 400, { error: 'slug mismatch' });
    // count 自动算成实际张数
    if (Array.isArray(body.gallery)) {
      for (const g of body.gallery) if (g && Array.isArray(g.items)) g.count = g.items.length;
    }
    const result = await withLock(async () => {
      fs.writeFileSync(projPath(slug), JSON.stringify(body, null, 2) + '\n', 'utf-8');
      return await commitAndPush(`editor: update ${slug}`);
    });
    return sendJSON(res, result.ok ? 200 : 500, result);
  }

  if (p === '/api/site' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const result = await withLock(async () => {
      fs.writeFileSync(path.join(ROOT, 'content', 'site.json'), JSON.stringify(body, null, 2) + '\n', 'utf-8');
      return await commitAndPush('editor: update site settings');
    });
    return sendJSON(res, result.ok ? 200 : 500, result);
  }

  if (p === '/api/project-delete' && req.method === 'POST') {
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return sendJSON(res, 400, { error: 'bad json' }); }
    const slug = (body.slug || '').trim();
    if (!/^[a-z0-9-]+$/i.test(slug)) return sendJSON(res, 400, { error: 'invalid slug' });
    if (!fs.existsSync(projPath(slug))) return sendJSON(res, 404, { error: 'project not found' });
    const result = await withLock(async () => {
      // 1) 从站点顺序移除
      const site = readJSON(path.join(ROOT, 'content', 'site.json'));
      site.projects = (site.projects || []).filter(s => s !== slug);
      fs.writeFileSync(path.join(ROOT, 'content', 'site.json'), JSON.stringify(site, null, 2) + '\n', 'utf-8');
      // 2) 删内容 JSON
      fs.unlinkSync(projPath(slug));
      // 3) 删本地媒体与已生成 HTML 目录（GitHub 上的媒体成孤儿无害，不影响显示）
      fs.rmSync(path.join(ROOT, 'media', 'projects', slug), { recursive: true, force: true });
      fs.rmSync(path.join(ROOT, 'project', slug), { recursive: true, force: true });
      return await commitAndPush(`editor: delete ${slug}`);
    });
    return sendJSON(res, result.ok ? 200 : 500, result);
  }

  if (p === '/api/project-create' && req.method === 'POST') {
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return sendJSON(res, 400, { error: 'bad json' }); }
    const title = (body.title || '').trim();
    if (!title) return sendJSON(res, 400, { error: '请填写案例名称' });
    let slug = (body.slug || '').trim().toLowerCase();
    if (!slug) {
      const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      slug = base || ('case-' + Date.now());
    } else {
      slug = slug.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (!/^[a-z0-9-]+$/.test(slug)) return sendJSON(res, 400, { error: '案例ID只能包含字母、数字和连字符（建议用英文/拼音）' });
    if (fs.existsSync(projPath(slug))) return sendJSON(res, 409, { error: '该案例ID已存在，请换一个' });
    const result = await withLock(async () => {
      const proj = {
        slug,
        eyebrow: '',
        title,
        statement: '',
        description: [],
        tone: '',
        cover: '',
        gallery: []
      };
      fs.writeFileSync(projPath(slug), JSON.stringify(proj, null, 2) + '\n', 'utf-8');
      const site = readJSON(path.join(ROOT, 'content', 'site.json'));
      site.projects = site.projects || [];
      site.projects.push(slug);
      fs.writeFileSync(path.join(ROOT, 'content', 'site.json'), JSON.stringify(site, null, 2) + '\n', 'utf-8');
      return await commitAndPush(`editor: create ${slug}`);
    });
    if (!result.ok) return sendJSON(res, 500, result);
    return sendJSON(res, 200, { ok: true, slug, ...result });
  }

  return sendJSON(res, 404, { error: 'unknown api' });
}

// ---------- static / routing ----------
const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end(); }
  const p = decodeURIComponent(url.pathname);

  if (p.startsWith('/api/')) return handleApi(req, res, url).catch(e => sendJSON(res, 500, { error: e.message }));

  // 预览生成的页面
  if (p === '/preview-home') return serveFile(res, path.join(ROOT, 'index.html'));
  if (p === '/preview-home-b') return serveFile(res, path.join(ROOT, 'home-b.html'));
  if (p.startsWith('/preview/')) {
    const slug = p.slice('/preview/'.length).replace(/\.html$/, '');
    return serveFile(res, path.join(ROOT, 'project', slug, 'index.html'));
  }
  // 媒体 / 静态资源（缩略图）
  if (p.startsWith('/media/') || p.startsWith('/assets/')) {
    const fp = path.normalize(path.join(ROOT, p));
    if (fp.startsWith(ROOT)) return serveFile(res, fp);
    res.writeHead(403); return res.end('forbidden');
  }
  // 编辑器界面
  if (p === '/' || p === '/index.html') return serveFile(res, path.join(PUBLIC, 'index.html'));
  if (p === '/app.js') return serveFile(res, path.join(PUBLIC, 'app.js'));
  if (p === '/style.css') return serveFile(res, path.join(PUBLIC, 'style.css'));

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  SPRING 可视化编辑器已启动`);
  console.log(`  ➜  http://localhost:${PORT}\n`);
  console.log(`  提示：第一次保存前，请点右上角「设置」填入 GitHub Token（个人访问令牌）。\n`);
});
