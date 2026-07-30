// Shared helpers for the static site build.
const SITE_BASE = 'https://singular-pixie-8792b1.netlify.app';
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 把封面原图路径映射到轻量缩略图（页面显示用，省流量）。
// /media/projects/x/gallery-01.jpg -> /media/projects/x/gallery-01.thumb.webp
function thumbUrl(cover) {
  if (!cover) return cover;
  const i = cover.lastIndexOf('.');
  if (i < 0) return cover;
  return cover.slice(0, i) + '.thumb.webp';
}

// 把画廊原图路径映射到轻量缩略图（页面显示用，省流量）。
// /media/projects/x/gallery-01.png -> /media/projects/x/gallery-01.gthumb.webp
function galleryThumbUrl(src) {
  if (!src) return src;
  const i = src.lastIndexOf('.');
  if (i < 0) return src;
  return src.slice(0, i) + '.gthumb.webp';
}

// 选择联系方式：key 为 'b' 时用第二套(contactB)，否则用站点顶部默认(第一套)。
function contactFor(site, key) {
  if (key === 'b' && site.contactB) return site.contactB;
  return {
    phone: site.phone,
    phoneTel: site.phoneTel,
    contactNote: site.contactNote,
    wechatQr: site.wechatQr
  };
}

function head({ title, description, ogTitle, ogDesc, ogImage }) {
  const ogT = ogTitle || title;
  const ogD = ogDesc || description;
  let og = (ogImage && ogImage.trim()) ? ogImage.trim() : '/og.png';
  if (og.startsWith('/')) og = SITE_BASE + og;
  return `<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="/assets/index-BACcG_oH.css"/>
<link rel="stylesheet" href="/assets/desktop.css"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:title" content="${esc(ogT)}"/>
<meta property="og:description" content="${esc(ogD)}"/>
<meta property="og:image" content="${esc(og)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="SPRING Private Wedding Design"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(ogT)}"/>
<meta name="twitter:description" content="${esc(ogD)}"/>
<meta name="twitter:image" content="${esc(og)}"/>
</head>`;
}

function header(navBase) {
  const brandHref = navBase === '#' ? '/' : navBase;
  return `<header class="site-header"><a href="${brandHref}" class="brand" aria-label="SPRING home"><span>SPRING</span><sup>®</sup><span class="brand-line">— Private Wedding Design</span></a><nav aria-label="Primary navigation"><a href="${navBase}#work">Work</a><a href="${navBase}#info">Info</a></nav></header>`;
}

module.exports = { esc, head, header, thumbUrl, galleryThumbUrl, contactFor };
