const { esc, head, header, thumbUrl, contactFor } = require('./util');

function renderHome(site, projects, contactKey) {
  const c = contactFor(site, contactKey);
  const cq = contactKey === 'b' ? '?c=b' : '';
  const kicker = esc(site.kicker);
  const titleLead = esc(site.titleLead);
  const titleEm = esc(site.titleEm);

  const cards = site.projects.map((slug, i) => {
    const p = projects[slug];
    if (!p) return '';
    const idx = String(i + 1).padStart(2, '0');
    return `<article class="project-card">
<a href="/project/${slug}${cq}" aria-label="View ${esc(p.title)}">
<div class="project-card-media">
<picture><img src="${esc(thumbUrl(p.cover))}" alt="${esc(p.title)} wedding design project cover" class="project-cover" loading="lazy" decoding="async"/></picture>
<div class="project-shade"></div>
<div class="project-card-copy">
<h2>${esc(p.title)}</h2>
<p>Private Wedding Commission</p>
</div>
<span class="project-index">${idx}</span>
</div>
<div class="project-card-meta" aria-hidden="true">
<span>${esc(p.tone)}</span>
<span>View project ↗</span>
</div>
</a></article>`;
  }).join('\n');

  const footer = `<footer class="site-footer" id="info">
<div class="footer-intro">
<p class="eyebrow">${esc(site.footerEyebrow)}</p>
<h2>${esc(site.footerTitle)}</h2>
<p class="footer-body">${esc(site.footerBody)}</p>
</div>
<div class="contact-grid">
<div>
<p class="eyebrow">Private commissions</p>
<a class="contact-phone" href="tel:${esc(c.phoneTel)}">${esc(c.phone)}</a>
<p class="contact-note">${esc(c.contactNote)}</p>
</div>
<img class="qr-code" src="${esc(c.wechatQr)}" alt="WeChat contact QR code" loading="lazy"/>
</div>
<div class="logo-panel">
<span class="logo-wordmark">SPRING<sup>®</sup></span>
</div>
<div class="footer-bottom">
<span>SPRING © 2026</span>
<a href="#top">Back to top ↑</a>
</div>
</footer>`;

  return `<!DOCTYPE html><html lang="en">
${head({
    title: 'SPRING — Private Wedding Design',
    description: 'SPRING creates one-of-one wedding environments through spatial design, floral art and cinematic direction.',
    ogTitle: 'SPRING — Private Wedding Design',
    ogDesc: 'One-of-one environments for private celebrations.',
    ogImage: site.ogImage
  })}
<body><main id="top" class="site-shell">
${header(contactKey === 'b' ? '/home-b.html' : '#')}
<section class="home-intro" aria-labelledby="intro-title">
<p class="intro-kicker">${kicker}</p>
<h1 id="intro-title">${titleLead}<em>${titleEm}</em></h1>
<div class="intro-foot">
<span>Selected work</span>
<span>Scroll ↓</span>
</div>
</section>
<section id="work" class="work-list" aria-label="Selected wedding design projects">
${cards}
</section>
${footer}
</main>
</body>
</html>`;
}

module.exports = { renderHome };
