#!/usr/bin/env node
// Build the static site from content/*.json using the templates in src/templates.
// Run: node build.js   (Netlify build command: "node build.js", publish=".")
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const { renderHome } = require('./src/templates/home');
const { renderProject } = require('./src/templates/project');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// --- Load content ---
const site = readJSON(path.join(CONTENT, 'site.json'));
const projects = {};
for (const f of fs.readdirSync(path.join(CONTENT, 'projects'))) {
  if (!f.endsWith('.json')) continue;
  const p = readJSON(path.join(CONTENT, 'projects', f));
  projects[p.slug] = p;
}

// --- Backup original HTML once (safety net) ---
const BACKUP = path.join(ROOT, '_backup_html');
if (!fs.existsSync(path.join(BACKUP, 'index.html'))) {
  fs.mkdirSync(BACKUP, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(BACKUP, 'index.html'));
  const projDir = path.join(BACKUP, 'project');
  fs.mkdirSync(projDir, { recursive: true });
  for (const slug of Object.keys(projects)) {
    const src = path.join(ROOT, 'project', slug, 'index.html');
    if (fs.existsSync(src)) {
      const d = path.join(projDir, slug);
      fs.mkdirSync(d, { recursive: true });
      fs.copyFileSync(src, path.join(d, 'index.html'));
    }
  }
  console.log('Backed up original HTML to _backup_html/');
}

// --- Render home ---
const homeHtml = renderHome(site, projects);
fs.writeFileSync(path.join(ROOT, 'index.html'), homeHtml, 'utf-8');

// --- Render projects ---
let count = 0;
for (const slug of site.projects) {
  const p = projects[slug];
  if (!p) { console.warn('Missing project data for', slug); continue; }
  const html = renderProject(p, site, projects);
  const out = path.join(ROOT, 'project', slug, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf-8');
  count++;
}

console.log(`Build complete: 1 home page + ${count} project pages.`);
