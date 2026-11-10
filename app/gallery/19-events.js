// Events page styles (step 37): the page that lists all the events. Chosen for the wedding in the Control Panel (Look › Events page).
//   cards    — the original cards (default)
//   shapes   — each event's photos inside a shape that fits its name: Cocktail in a wine glass, Haldi in a marigold,
//              Mehendi in a paisley, Sangeet in a dhol, Wedding in a mandap arch, Reception in an oval mirror,
//              Engagement in a heart, Baraat in a chhatri dome, Garba / Dandiya in a circle, anything else in an arch
//   carousel — big cards to swipe through, one event at a time
//   mosaic   — big and small event cards mixed
// The photos inside change slowly (the same soft slideshow as the cards). Tapping an event opens its page.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgEventsPage() {
  const STYLES = ['cards', 'shapes', 'carousel', 'mosaic'];
  // shapes drawn in a 100-wide box; [viewBox height, path or svg body]
  const SHAPES = {
    glass: [110, '<path d="M18 4H82C82 40 70 56 54 59V92H70Q74 92 74 97V104H26V97Q26 92 30 92H46V59C30 56 18 40 18 4Z"/>'],
    marigold: [100, '<circle cx="50" cy="50" r="24"/>' + Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5; return '<circle cx="' + (50 + 31 * Math.cos(a)).toFixed(1) + '" cy="' + (50 + 31 * Math.sin(a)).toFixed(1) + '" r="16"/>'; }).join('')],
    paisley: [110, '<path d="M72 4C96 30 98 72 70 94C46 112 12 100 8 70C5 46 26 30 48 36C62 40 70 28 72 4Z"/>'],
    dhol: [100, '<path d="M14 18Q50 2 86 18Q98 50 86 82Q50 98 14 82Q2 50 14 18Z"/>'],
    mandap: [120, '<path d="M8 118V52C8 34 28 26 40 20C46 17 48 10 50 2C52 10 54 17 60 20C72 26 92 34 92 52V118Z"/>'],
    mirror: [120, '<ellipse cx="50" cy="60" rx="46" ry="58"/>'],
    heart: [92, '<path d="M50 90C20 68 2 50 2 28C2 12 14 2 28 2C38 2 46 8 50 16C54 8 62 2 72 2C86 2 98 12 98 28C98 50 80 68 50 90Z"/>'],
    chhatri: [110, '<path d="M10 108V64H4C6 32 28 12 50 10C72 12 94 32 96 64H90V108Z"/>'],
    circle: [100, '<circle cx="50" cy="50" r="48"/>'],
    arch: [120, '<path d="M6 118V48A44 44 0 0 1 94 48V118Z"/>']
  };
  // most specific names first ("Mehendi party" is a Mehendi, not a cocktail)
  const WORDS = [
    [/haldi|pithi|turmeric|ubtan/i, 'marigold'], [/mehe?n?di|henna/i, 'paisley'], [/sangeet|music|dholki|ladies/i, 'dhol'],
    [/garba|dandiya|raas/i, 'circle'], [/baraat|barat|groom entry/i, 'chhatri'],
    [/wedding|phera|vivah|shaadi|lagan|muhurtham|kalyanam|nikah|anand karaj|varmala|jaimala/i, 'mandap'],
    [/reception/i, 'mirror'], [/engagement|roka|sagai|\bring\b|pre.?wedding|couple|proposal/i, 'heart'],
    [/cocktail|sundowner|drinks|\bbar\b|party/i, 'glass']
  ];
  const shapeOf = name => { const w = WORDS.find(([re]) => re.test(name || '')); return w ? w[1] : 'arch'; };
  const svgOf = (k, extra) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ' + SHAPES[k][0] + '"' + (extra || '') + '>' + SHAPES[k][1] + '</svg>';
  const maskUrl = k => 'url("data:image/svg+xml,' + encodeURIComponent(svgOf(k)) + '")';
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  function style() {
    const q = new URLSearchParams(location.search).get('eventsstyle');
    const w = (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.pages) || {};
    return STYLES.indexOf(q) > -1 ? q : STYLES.indexOf(w.events) > -1 ? w.events : 'cards';
  }
  const open = ev => (window.pgOpenEvent ? pgOpenEvent(ev.name) : openCollection(ev.name, 0));
  const count = ev => ev.photos.length + (ev.photos.length === 1 ? ' photo' : ' photos');

  function shapeCard(ev) {
    const k = shapeOf(ev.name), b = h('button', 'pge-shape pge-' + k); b.type = 'button'; b.dataset.shape = k;
    b.setAttribute('aria-label', 'Open ' + ev.name + ', ' + count(ev));
    const fig = h('span', 'pge-fig');   // every shape sits in the same box, so the names line up
    const cover = h('span', 'pg-cover pge-photo'); cover.style.webkitMaskImage = cover.style.maskImage = maskUrl(k);
    pgRotCover(cover, ev.photos, 600);
    fig.appendChild(cover);
    fig.insertAdjacentHTML('beforeend', svgOf(k, ' class="pge-line" aria-hidden="true" preserveAspectRatio="xMidYMid meet"'));
    b.append(fig, h('b', 'pge-name', pgEsc(ev.name)), h('small', 'pge-count', count(ev)));
    b.addEventListener('click', () => open(ev));
    return b;
  }
  function photoCard(ev, cls) {
    const b = h('button', cls); b.type = 'button'; b.setAttribute('aria-label', 'Open ' + ev.name + ', ' + count(ev));
    const cover = h('span', 'pg-cover'); pgRotCover(cover, ev.photos, 900);
    b.append(cover, h('span', 'pge-cap', '<b>' + pgEsc(ev.name) + '</b><small>' + count(ev) + '</small>'));
    b.addEventListener('click', () => open(ev));
    return b;
  }
  function paint() {
    const wrap = document.getElementById('pgGalleryMasonry'); if (!wrap || typeof GALLERY === 'undefined' || !GALLERY) return;
    const st = style(), page = document.getElementById('view-gallery');
    STYLES.forEach(s => page.classList.toggle('pge-on-' + s, s === st));
    if (st === 'cards') return;   // renderGalleries already drew the original cards
    const list = (GALLERY.personal || []).concat(GALLERY.events || []).filter(ev => ev.photos && ev.photos.length);
    wrap.innerHTML = ''; wrap.className = 'pge pge-' + st;
    if (st === 'shapes') list.forEach(ev => wrap.appendChild(shapeCard(ev)));
    else if (st === 'carousel') {
      const track = h('div', 'pge-track'); list.forEach(ev => track.appendChild(photoCard(ev, 'pge-slide'))); wrap.appendChild(track);
      const dots = h('div', 'pge-dots'); list.forEach((ev, i) => { const d = h('i', i ? '' : 'on'); dots.appendChild(d); }); wrap.appendChild(dots);
      track.addEventListener('scroll', () => { const w = track.firstChild ? track.firstChild.getBoundingClientRect().width : 1, i = Math.round(track.scrollLeft / (w + 12)); [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i)); }, { passive: true });
    } else {
      const SIZES = ['xl', 's', 's', 'w', 't', 's', 's', 'w'];
      list.forEach((ev, i) => wrap.appendChild(photoCard(ev, 'pge-tile pge-' + (i ? SIZES[i % SIZES.length] : 'xl'))));
    }
  }
  pgAfter('renderGalleries', paint);
  window.PGEvents = { style, styles: () => STYLES.slice(), shapeOf, svgOf, paint };
})();
