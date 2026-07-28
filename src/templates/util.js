// Shared helpers for the static site build.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function head({ title, description, ogTitle, ogDesc }) {
  const ogT = ogTitle || title;
  const ogD = ogDesc || description;
  return `<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="/assets/index-BACcG_oH.css"/>
<link rel="stylesheet" href="/assets/desktop.css"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:title" content="${esc(ogT)}"/>
<meta property="og:description" content="${esc(ogD)}"/>
<meta property="og:image" content="/og.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="SPRING Private Wedding Design"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(ogT)}"/>
<meta name="twitter:description" content="${esc(ogD)}"/>
<meta name="twitter:image" content="/og.png"/>
</head>`;
}

function header(navBase) {
  return `<header class="site-header"><a href="/" class="brand" aria-label="SPRING home"><span>SPRING</span><sup>®</sup><span class="brand-line">— Private Wedding Design</span></a><nav aria-label="Primary navigation"><a href="${navBase}#work">Work</a><a href="${navBase}#info">Info</a></nav></header>`;
}

module.exports = { esc, head, header };
