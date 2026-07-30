const { esc, head, header, thumbUrl, galleryThumbUrl } = require('./util');

function renderProject(p, site, projects) {
  const bTel = JSON.stringify((site.contactB && site.contactB.phoneTel) || site.phoneTel);
  const order = site.projects;
  const idx = order.indexOf(p.slug);
  const nextIdx = (idx + 1) % order.length;
  const nextSlug = order[nextIdx];
  const np = projects[nextSlug] || p;
  const nextLabel = (p.next && p.next.label) || `Next project · ${String(nextIdx + 1).padStart(2, '0')}`;
  const nextCover = p.next ? p.next.cover : (np.cover || '');

  const film = p.film
    ? `<section class="film-section" aria-label="${esc(p.title)} project film">
<video class="project-film" src="${esc(p.film.src)}" poster="${esc(p.film.poster)}" autoplay muted loop playsinline controls preload="metadata">Your browser does not support embedded video.</video>
<div class="film-caption"><span>Project film</span><span>Sound available</span></div>
</section>`
    : '';

  const gallery = p.gallery.map(g => {
    const items = g.items.map(it => `<figure class="gallery-item">
<picture><img src="${esc(galleryThumbUrl(it.src))}" alt="${esc(it.alt)}" loading="lazy" decoding="async"/></picture>
<figcaption><span>${esc(it.caption[0] || '')}</span><span>${esc(it.caption[1] || '')}</span></figcaption>
</figure>`).join('');
    return `<div class="gallery-group count-${g.count}" style="--gc:${g.gc}">${items}</div>`;
  }).join('\n');

  const descParas = (p.description || []).map(t => `<p>${esc(t)}</p>`).join('\n');
  const description = `${descParas}\n<p class="project-tone">${esc(p.tone)}</p>`;

  const nextImg = nextCover
    ? `<picture><img src="${esc(thumbUrl(nextCover))}" alt="${esc(np.title)} wedding design preview" loading="lazy" decoding="async"/></picture>`
    : `<picture></picture>`;
  const nextSection = `<section class="next-project">
<a href="/project/${nextSlug}">
<span class="eyebrow">${esc(nextLabel)}</span>
<strong>${esc(np.title)}</strong>
${nextImg}
<span class="next-arrow">View project ↗</span>
</a>
</section>`;

  const credits = `<section class="project-credits">
<p class="eyebrow">Project note</p>
<div>
<p>Creative Direction</p>
<p>Spatial Design</p>
<p>Floral Art</p>
<p>Production</p>
</div>
<p class="credit-name">SPRING</p>
</section>`;

  const footer = `<div class="project-footer">
<a href="/">All projects</a>
<a href="tel:${esc(site.phoneTel)}">Contact SPRING</a>
</div>`;

  const metaDesc = p.statement || (p.description && p.description[0]) || '';

  return `<!DOCTYPE html><html lang="en">
${head({
    title: `${p.title} — SPRING`,
    description: metaDesc,
    ogTitle: 'SPRING — Private Wedding Design',
    ogDesc: 'One-of-one environments for private celebrations.',
    ogImage: p.cover
  })}
<body><main id="top" class="site-shell project-page">
${header('/')}
<section class="project-hero">
<p class="eyebrow">${esc(p.eyebrow)}</p>
<h1>${esc(p.title)}</h1>
<p class="project-statement">${esc(p.statement)}</p>
<div class="project-rule"></div>
<div class="project-description">
${description}
</div>
</section>
${film}
<section class="project-gallery" aria-label="${esc(p.title)} gallery">
${gallery}
</section>
${credits}
${nextSection}
${footer}
</main>
<script>
(function(){
  try{
    var c = new URLSearchParams(location.search).get('c');
    if(c !== 'b') return;
    var bTel = ${bTel};
    var tel = document.querySelector('a[href^="tel:"]');
    if(tel && bTel){ tel.setAttribute('href','tel:'+bTel); }
    var links = document.querySelectorAll('a[href^="/"]');
    for(var i=0;i<links.length;i++){
      var a=links[i]; var h=a.getAttribute('href');
      if(h.indexOf('?c=')>=0) continue;
      if(h.indexOf('/assets')===0||h.indexOf('/media')===0) continue;
      var hashIdx=h.indexOf('#'); var path=h; var frag='';
      if(hashIdx>=0){ frag=h.slice(hashIdx); path=h.slice(0,hashIdx); }
      if(path===''||path==='/'){ path='/home-b.html'; }
      else if(path!=='/home-b.html'){ path=path+'?c=b'; }
      a.setAttribute('href', path+frag);
    }
  }catch(e){}
})();
</script>
<script src="/assets/gallery-lightbox.js" defer></script>
</body>
</html>`;
}

module.exports = { renderProject };
