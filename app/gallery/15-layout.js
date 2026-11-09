// Hub layouts (step 32): the Hub drawn from a layout — which blocks, in what order, what size, which style.
// Layouts live in /app/themes/layouts.json (5 by Gemini "G", 5 by ChatGPT "C"). Blocks sit on a 4-column grid (iPhone-widget style).
// Every block only shows things and then uses the Hub's existing buttons and helpers, so each function works exactly as before.
// Which layout: the wedding's own layout (GALLERY.layout, chosen in the Control Panel, step 34). ?layout=<id> in the link previews one on this phone only.
// No layout = the original Hub, untouched. The photographer's own page (/p/…) keeps its Hub.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgLayouts() {
  let LAYOUTS = [], cur = null;
  const SIZE = { S: [1, 1], W: [2, 1], M: [2, 2], L: [4, 2], XL: [4, 3], XXL: [4, 4] };
  const $ = id => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => pgEsc(String(s == null ? '' : s));
  const img = (id, w, cls) => { const i = h('img', cls || ''); i.alt = ''; i.loading = 'lazy'; i.decoding = 'async'; i.src = pgImg(id, w); i.onerror = function () { this.onerror = null; this.src = pgImgFallback(id, w); }; return i; };
  const tapOn = (el, fn) => { el.addEventListener('click', fn); el.setAttribute('role', 'button'); el.tabIndex = 0; el.addEventListener('keydown', e => { if (e.key === 'Enter') fn(); }); };
  const press = id => { const b = $(id); if (b) b.click(); };
  const ICON = {
    findme: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><circle cx="12" cy="10" r="3"/><path d="M7 17c1.2-2 3-3 5-3s3.8 1 5 3"/>',
    reel: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8h18M8 3l3 5M14 3l3 5"/><path d="M10 12v5l4-2.5z"/>',
    post: '<rect x="3" y="4" width="13" height="16" rx="2"/><path d="M19 7v10M22 9v6"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    install: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/>',
    review: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    arrow: '<path d="M7 17L17 7M9 7h8v8"/>'
  };
  const ic = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[k] || '') + '</svg>';
  const ACT = {   // the four create tiles: label, line, and the existing button they press
    findme: ['Find me', 'Your photos, by face', () => press('pgcFind')],
    reel: ['Reel Edits', 'With music', () => press('pghReel')],
    post: ['Post Edits', 'Posts & carousels', () => press('pgcPost')],
    upload: ['Add a moment', 'Photo or video', () => press('pgcUpload')],
    install: ['Add to Home Screen', 'Opens like an app', () => press('pghInstallBtn')],
    review: ['Thank your photographer', 'A few kind words', () => press('pgcReview')]
  };

  function data() {
    const all = pgAllPhotos(), likes = GALLERY.likes || {}, notes = GALLERY.notes || {};
    return {
      all, likes, events: GALLERY.events || [],
      loved: all.filter(x => likes[x.p.id]).sort((a, b) => likes[b.p.id] - likes[a.p.id]).slice(0, 10),
      notes: (GALLERY.recentNotes || []).slice(0, 4),
      hearts: Object.values(likes).reduce((t, v) => t + v, 0), notesN: Object.values(notes).reduce((t, v) => t + v, 0),
      names: GALLERY.title || 'Our Wedding', date: pgDate(GALLERY.eventDate) || '', studio: GALLERY.studio || 'Your photographer',
      place: GALLERY.city || GALLERY.place || ''
    };
  }
  const picks = (D, n) => pgShuffle(D.all).slice(0, n).map(x => x.p);
  const rot = (box, photos, w) => { const c = h('div', 'pg-cover pgl-fill'); pgRotCover(c, photos.length ? photos : [{ id: '' }], w); box.appendChild(c); return c; };
  const eyebrow = D => [D.date, D.place].filter(Boolean).join(' · ');

  // ---------- blocks ----------
  const B = {};
  B.hero = (el, b, D) => {
    const v = b.variant, P = D.all.map(x => x.p);
    tapOn(el, () => { const p = pgPick(P); if (p) pgOpenPhoto(p.id); });
    const cap = '<div class="pgl-eye">' + esc(eyebrow(D) || 'Wedding Hub') + '</div><h2 class="pgl-names">' + esc(D.names) + '</h2>';
    if (v === 'split') {
      el.classList.add('pgl-split');
      el.append(h('div', 'pgl-splittxt', '<div class="pgl-eye">' + esc(D.place || 'Wedding Hub') + '</div><h2 class="pgl-names">' + esc(D.names) + '</h2><small>' + esc(D.date) + '</small><em>' + D.events.length + ' ceremonies</em>'));
      const ph = h('div', 'pgl-splitph'); rot(ph, P, 900); el.appendChild(ph); return;
    }
    if (v === 'collage-3' || v === 'collage-5') {
      const n = v === 'collage-3' ? 3 : 5, g = h('div', 'pgl-col pgl-col' + n); picks(D, n).forEach(p => { const c = h('div', 'pgl-cell'); c.appendChild(img(p.id, 700)); g.appendChild(c); });
      el.append(g, h('div', 'pgl-cap', cap)); el.classList.add('pgl-collage'); return;
    }
    if (v === 'polaroid-stack') {
      const st = h('div', 'pgl-pola'); picks(D, 2).forEach((p, i) => { const f = h('div', 'pgl-pframe pgl-p' + i); f.appendChild(img(p.id, 700)); st.appendChild(f); });
      el.append(st, h('div', 'pgl-cap pgl-capc', cap)); el.classList.add('pgl-polaroid'); return;
    }
    rot(el, P, 1400); el.append(h('div', 'pgl-scrim'), h('div', 'pgl-over', cap));   // full-bleed / slideshow: one photo, always changing
    el.classList.add('pgl-bleed');
  };
  B.stats = (el, b, D) => {
    const s = [['photos', D.all.length, 'Photos'], ['events', D.events.length, 'Events'], ['hearts', D.hearts, 'Hearts'], ['notes', D.notesN, 'Notes']];
    el.classList.add('pgl-stats-' + b.variant);
    s.forEach(([k, v, l]) => { const x = h('button', 'pgl-stat', '<b>' + Number(v).toLocaleString('en-IN') + '</b><span>' + l + '</span>'); x.type = 'button'; x.addEventListener('click', () => pgStatTap(k)); el.appendChild(x); });
  };
  const action = (el, b, D, k) => {
    const a = ACT[k]; tapOn(el, a[2]); el.classList.add('pgl-act-' + b.variant);
    if (b.variant === 'photo') { rot(el, picks(D, 8), 600); el.appendChild(h('div', 'pgl-scrim')); }
    el.appendChild(h('div', 'pgl-actin', '<i>' + ic(k) + '</i><div><b>' + a[0] + '</b>' + (b.size === 'S' ? '' : '<small>' + a[1] + '</small>') + '</div>' + (b.size === 'S' ? '' : '<em>' + ic('arrow') + '</em>')));
  };
  ['findme', 'reel', 'post', 'upload', 'install', 'review'].forEach(k => { B[k] = (el, b, D) => action(el, b, D, k); });
  B.events = (el, b, D) => {
    const v = b.variant, head = h('div', 'pgl-head', '<h3>Events</h3><button type="button" class="pgl-more">All ' + D.events.length + ' →</button>');
    head.querySelector('button').addEventListener('click', () => switchViewFromNav('gallery'));
    const box = h('div', 'pgl-ev pgl-ev-' + v);
    D.events.forEach((ev, i) => {
      const t = h('button', 'pgl-evt'); t.type = 'button'; t.addEventListener('click', () => pgOpenEvent(ev.name));
      if (v === 'list') { t.appendChild(h('span', 'pgl-num', String(i + 1).padStart(2, '0'))); const th = h('div', 'pgl-evth'); th.appendChild(img((ev.photos[0] || {}).id, 200)); t.appendChild(th); t.appendChild(h('div', 'pgl-evtx', '<b>' + esc(ev.name) + '</b><small>' + ev.photos.length + ' photos</small>')); }
      else { const c = h('div', 'pgl-evc'); rot(c, ev.photos, 700); t.appendChild(c); t.appendChild(h('div', 'pgl-evlab', '<b>' + esc(ev.name) + '</b><small>' + ev.photos.length + ' photos</small>')); }
      box.appendChild(t);
    });
    el.append(head, box);
  };
  B.loved = (el, b, D) => {
    if (!D.loved.length) return false;
    const head = h('div', 'pgl-head', '<h3>Most loved</h3><button type="button" class="pgl-more">See all →</button>'); head.querySelector('button').addEventListener('click', () => pgStatTap('hearts'));
    const box = h('div', 'pgl-lvbox pgl-lvbox-' + b.variant);
    D.loved.slice(0, b.variant === 'mosaic' ? 3 : 10).forEach(x => { const t = h('button', 'pgl-lv'); t.type = 'button'; const li = img(x.p.id, 500); li.loading = 'eager'; t.appendChild(li); t.appendChild(h('span', 'pgh-heart', '♥ ' + D.likes[x.p.id])); t.addEventListener('click', () => pgOpenPhoto(x.p.id)); box.appendChild(t); });
    el.append(head, box);
  };
  B.notes = (el, b, D) => {
    if (!D.notes.length) return false;
    const head = h('div', 'pgl-head', '<h3>Notes from your people</h3><button type="button" class="pgl-more">All →</button>'); head.querySelector('button').addEventListener('click', () => switchViewFromNav('rooms'));
    const box = h('div', 'pgl-ntbox pgl-ntbox-' + b.variant);
    D.notes.slice(0, b.variant === 'bubbles' ? 2 : 4).forEach(n => { const t = h('button', 'pgl-note'); t.type = 'button'; t.appendChild(img(n.photoId, 160)); t.appendChild(h('div', '', '<p>“' + esc(n.text) + '”</p><small>— ' + esc(n.name) + '</small>')); t.addEventListener('click', () => pgOpenPhoto(n.photoId)); box.appendChild(t); });
    el.append(head, box);
  };
  B.studio = (el, b, D) => { tapOn(el, () => switchViewFromNav('studio')); el.classList.add('pgl-studio-' + b.variant); el.innerHTML = '<div><small>Photographed by</small><b>' + esc(D.studio) + '</b></div><em>' + ic('arrow') + '</em>'; };

  // when a block has nothing to show (or its feature is off for this person), it steps aside
  function visible(k) {
    const feat = k === 'loved' ? 'hearts' : k;   // switched-off functions leave the Hub (step 33)
    if (window.pgFeatureOn && ['findme', 'reel', 'post', 'upload', 'notes', 'install', 'hearts'].indexOf(feat) > -1 && !pgFeatureOn(feat)) return false;
    if (k === 'findme') return !!GALLERY.faceSearch;
    if (k === 'review') return !$('pgcReview') || !$('pgcReview').classList.contains('hidden');
    if (k === 'install') return !$('pghInstall') || !$('pghInstall').classList.contains('hidden');
    return true;
  }
  function render() {
    const view = $('view-hub'); if (!view || typeof GALLERY === 'undefined' || !GALLERY) return;
    let box = $('pgLay');
    if (!cur || GALLERY.isStudio) { document.body.classList.remove('pg-lay-on'); if (box) box.remove(); return; }
    if (!box) { box = h('div', 'pgl-grid'); box.id = 'pgLay'; view.prepend(box); }
    box.dataset.layout = cur.id; box.innerHTML = ''; document.body.classList.add('pg-lay-on');
    const D = data();
    (cur.blocks || []).forEach(b => {
      if (!B[b.block] || !visible(b.block)) return;
      const sz = SIZE[b.size] || SIZE.W, el = h('section', 'pgl-b pgl-' + b.block + ' pgl-v-' + b.variant + ' pgl-s' + b.size);
      const rows = b.block === 'stats' ? 1 : b.block === 'studio' ? Math.min(sz[1], 1) : sz[1];   // numbers and the photographer read best one row high
      el.style.gridColumn = 'span ' + sz[0]; el.style.gridRow = 'span ' + rows; el.dataset.block = b.block;
      if (B[b.block](el, b, D) === false) return;
      box.appendChild(el);
    });
  }
  function choose() {
    const q = new URLSearchParams(location.search).get('layout');
    if (q === 'original') return null;   // preview of the original Hub
    const id = q || (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.layout) || '';
    return LAYOUTS.find(l => l.id === id) || null;
  }
  try { localStorage.removeItem('pg_layout_pick'); } catch (e) {}   // old test-menu choice no longer overrides the wedding
  const ready = fetch('/app/themes/layouts.json').then(r => r.json()).then(d => { LAYOUTS = (d.layouts || []).filter(l => l && l.id && Array.isArray(l.blocks)); cur = choose(); if (typeof GALLERY !== 'undefined' && GALLERY) render(); return LAYOUTS; }).catch(() => []);
  pgAfter('pgRenderHub', () => { if (LAYOUTS.length) { cur = choose(); render(); } });
  // apply(id) shows a layout straight away (the Control Panel saves it for the wedding); '' = the original Hub
  window.PGLayout = { ready, list: () => LAYOUTS.slice(), current: () => (cur ? cur.id : ''), render,
    apply: id => { const l = LAYOUTS.find(x => x.id === id) || null; if (id && !l) return false; cur = l; render(); return true; },
    reset: () => { cur = null; render(); } };
})();
