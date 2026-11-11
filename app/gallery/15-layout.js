// Hub layouts (step 32): the Hub drawn from a layout — which blocks, in what order, what size, which style.
// Layouts live in /app/themes/layouts.json. Blocks sit on a grid of square cells that grows with the screen (step 40):
//   phone (narrower than 600 px) — 4 columns · tall (tablets, upright big screens, phone sideways) — 8 · wide (laptop, TV) — 12.
// A block gives its size for each: "phone": [cols, rows], "tall": [...], "wide": [...] (the brief-v2 packs). Older layouts give
// one phone size ("size": S / W / M / L / XL / XXL); their tall and wide sizes are worked out here, so every layout fills a big screen.
// "hide": ["phone"] etc. leaves a block out on that screen.
// Every block only shows things and then uses the Hub's existing buttons and helpers, so each function works exactly as before.
// Which layout: the wedding's own layout (GALLERY.layout, chosen in the Control Panel, step 34). ?layout=<id> in the link previews one on this phone only.
// No layout = the original Hub, untouched. The photographer's own page (/p/…) keeps its Hub.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgLayouts() {
  let LAYOUTS = [], cur = null;
  const SIZE = { S: [1, 1], W: [2, 1], M: [2, 2], L: [4, 2], XL: [4, 3], XXL: [4, 4] };
  const SCREEN = { phone: { cols: 4, gap: 10, pad: 16, max: 480 }, tall: { cols: 8, gap: 12, pad: 24, max: 1120 }, wide: { cols: 12, gap: 14, pad: 40, max: 1680 } };
  let SCR_FOR = null, SKIP_REPACK = false;   // the editor keeps every card in its place (a placeholder shows the ones guests cannot see now)   // the Hub editor draws a layout for another screen than this one (step 44)
  const realScreen = () => { const w = window.innerWidth, ht = window.innerHeight; return w < 600 ? 'phone' : w >= 1100 && w >= ht ? 'wide' : 'tall'; };
  const screenOf = () => SCR_FOR || realScreen();
  // big-screen sizes for the older (phone-only) layouts: same order, more room
  const WIDE_OF = { hero: { XXL: [8, 5], XL: [8, 5], L: [8, 4], M: [6, 4] }, act: { S: [2, 2], W: [4, 2], M: [4, 3], L: [6, 3] },
    events: [12, 4], loved: [6, 3], notes: [6, 3], studio: [12, 1], stats: [12, 1] };
  const ACTS = ['findme', 'reel', 'post', 'upload', 'install', 'review'];
  function sizeOf(b, scr) {
    if (Array.isArray(b[scr]) && b[scr].length === 2) return b[scr].map(Number);
    const p = SIZE[b.size] || (Array.isArray(b.phone) ? b.phone : SIZE.W);
    if (scr === 'phone') return p;
    if (scr === 'tall') return b.block === 'studio' || b.block === 'stats' ? [8, 1] : [p[0] * 2, p[1] * 2];
    if (b.block === 'hero') return WIDE_OF.hero[b.size] || [8, 5];
    if (ACTS.indexOf(b.block) > -1) return WIDE_OF.act[b.size] || [3, 2];
    if (b.block === 'events' && b.variant === 'list') return [6, 4];
    return WIDE_OF[b.block] || [4, 2];
  }
  // a size letter for the block's styling (small tiles hide their second line), from its real size on this screen
  function letterOf(d, u, gap) {
    const w = d[0] * u + (d[0] - 1) * gap, ht = d[1] * u + (d[1] - 1) * gap;
    return w < 120 || ht < 96 ? 'S' : ht < 170 ? 'W' : w < 360 ? 'M' : ht < 420 ? 'L' : ht < 620 ? 'XL' : 'XXL';
  }
  // the older (phone-only) layouts on a laptop / TV: the hero on the left, the action tiles filling the space beside it
  // exactly, then each list across the page (two side by side when they pair up), so no holes are left
  function planWide(list) {
    const plan = new Map(), acts = list.filter(b => ACTS.indexOf(b.block) > -1), hero = list.find(b => b.block === 'hero');
    let cells = 0; acts.forEach(b => { const big = b.size && b.size !== 'S'; plan.set(b, big ? [4, 2] : [2, 2]); cells += big ? 2 : 1; });   // in 2×2 squares
    if (cells % 2) { const last = acts.filter(b => plan.get(b)[0] === 2).pop(); if (last) { plan.set(last, [4, 2]); cells++; } }
    if (hero) plan.set(hero, [acts.length ? 8 : 12, Math.max(4, cells)]);
    const rest = list.filter(b => b !== hero && acts.indexOf(b) < 0);
    for (let i = 0; i < rest.length; i++) {
      const b = rest[i], nx = rest[i + 1], pairable = x => x && ['loved', 'notes'].indexOf(x.block) > -1;   // the photographer stays a slim banner
      if (b.block === 'events') plan.set(b, b.variant === 'list' && pairable(nx) ? [6, 4] : [12, b.variant === 'list' ? 3 : 4]);
      else if (pairable(b) && pairable(nx)) { plan.set(b, [6, 3]); plan.set(nx, [6, 3]); i++; }
      else plan.set(b, b.block === 'studio' ? [12, 1] : [12, 3]);
      if (b.block === 'events' && b.variant === 'list' && pairable(nx)) { plan.set(nx, [6, 4]); i++; }
    }
    return plan;
  }
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
    const s = [['hearts', D.hearts, 'Hearts'], ['notes', D.notesN, 'Notes']];   // step 49: photo and event counts only in the Control Panel
    el.classList.add('pgl-stats-' + b.variant);
    s.forEach(([k, v, l]) => { const x = h('button', 'pgl-stat', '<b>' + Number(v).toLocaleString('en-IN') + '</b><span>' + l + '</span>'); x.type = 'button'; x.addEventListener('click', () => pgStatTap(k)); el.appendChild(x); });
  };
  const action = (el, b, D, k) => {
    const a = (window.PGRules && PGRules.act(k)) || ACT[k]; tapOn(el, a[2]); el.classList.add('pgl-act-' + b.variant);
    if (b.variant === 'photo' || b.variant === 'slideshow') { rot(el, picks(D, 8), 700); el.appendChild(h('div', 'pgl-scrim')); el.classList.add('pgl-act-photo'); }
    const small = b._letter === 'S';
    el.appendChild(h('div', 'pgl-actin', '<i>' + ic(k) + '</i><div><b>' + a[0] + '</b>' + (small ? '' : '<small>' + a[1] + '</small>') + '</div>' + (small ? '' : '<em>' + ic('arrow') + '</em>')));
  };
  ['findme', 'reel', 'post', 'upload', 'install', 'review'].forEach(k => { B[k] = (el, b, D) => action(el, b, D, k); });
  B.events = (el, b, D) => {
    const v = b.variant, head = h('div', 'pgl-head', '<h3>Events</h3><button type="button" class="pgl-more">See all →</button>');
    head.querySelector('button').addEventListener('click', () => switchViewFromNav('gallery'));
    const box = h('div', 'pgl-ev pgl-ev-' + v);
    // mosaic of slideshows: the first event big (2×2), then as many as fill whole rows (the rest are one tap away in "All")
    let shownN = D.events.length;
    if (v === 'mosaic-slideshow') {
      // columns and count so that every row is full: n events take n + 3 cells (the first is 2×2), at least 2 rows
      const max = { phone: 2, tall: 4, wide: 6 }[screenOf()], n = D.events.length; let best = null;
      for (let c = max; c >= 2 && !best; c--) for (let m = n; m >= 1; m--) if ((m + 3) % c === 0 && m + 3 >= 2 * c) { best = [c, m]; break; }
      if (best) { box.style.gridTemplateColumns = 'repeat(' + best[0] + ',minmax(0,1fr))'; shownN = best[1]; }
    }
    // a grid of events on a big screen fills its block: up to 4 in one row, more in two rows
    if (v === 'grid-2' && screenOf() !== 'phone') { const n = D.events.length; box.style.setProperty('--evc', n <= 4 ? n : Math.ceil(n / 2)); box.classList.add('pgl-ev-fill'); }
    D.events.slice(0, shownN).forEach((ev, i) => {
      const t = h('button', 'pgl-evt'); t.type = 'button'; t.addEventListener('click', () => pgOpenEvent(ev.name));
      if (v === 'editorial-bands') { const c = h('div', 'pgl-evc'); rot(c, ev.photos, 1100); t.appendChild(c); t.appendChild(h('div', 'pgl-evlab', '<small>' + String(i + 1).padStart(2, '0') + '</small><b>' + esc(ev.name) + '</b>')); box.appendChild(t); return; }
      if (v === 'list') { t.appendChild(h('span', 'pgl-num', String(i + 1).padStart(2, '0'))); const th = h('div', 'pgl-evth'); th.appendChild(img((ev.photos[0] || {}).id, 200)); t.appendChild(th); t.appendChild(h('div', 'pgl-evtx', '<b>' + esc(ev.name) + '</b>')); }
      else { const c = h('div', 'pgl-evc'); rot(c, ev.photos, 700); t.appendChild(c); t.appendChild(h('div', 'pgl-evlab', '<b>' + esc(ev.name) + '</b>')); }
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
  B.studio = (el, b, D) => { tapOn(el, () => switchViewFromNav('studio')); el.classList.add('pgl-studio-' + b.variant); const ig = (GALLERY.photographer || {}).instagram; el.innerHTML = '<div><small>Photographed by</small><b>' + esc(D.studio) + '</b>' + (ig ? '<small class="pgl-ig">@' + esc(ig) + '</small>' : '') + '</div><em>' + ic('arrow') + '</em>'; };

  // when a block has nothing to show (or its feature is off for this person), it steps aside
  function visible(k) {
    const feat = k === 'loved' ? 'hearts' : k;   // switched-off functions leave the Hub (step 33)
    if (window.pgFeatureOn && ['findme', 'reel', 'post', 'upload', 'notes', 'install', 'hearts'].indexOf(feat) > -1 && !pgFeatureOn(feat)) return false;
    if (k === 'findme') return !!GALLERY.faceSearch;
    if (k === 'review') return !$('pgcReview') || !$('pgcReview').classList.contains('hidden');
    if (k === 'install') return !$('pghInstall') || !$('pghInstall').classList.contains('hidden');
    return true;
  }
  let shownOn = '';   // which screen the layout was drawn for (it is drawn again when that changes)
  function fit(box, widthPx) {
    const scr = screenOf(), S = SCREEN[scr], wv = Math.min(widthPx || ($('view-hub') || document.body).clientWidth || window.innerWidth, S.max);
    const u = (wv - 2 * S.pad - S.gap * (S.cols - 1)) / S.cols;
    box.style.setProperty('--cols', S.cols); box.style.setProperty('--gap', S.gap + 'px'); box.style.setProperty('--pad', S.pad + 'px');
    box.style.setProperty('--max', S.max + 'px'); box.style.setProperty('--u', Math.max(40, u).toFixed(1) + 'px'); box.dataset.screen = scr;
  }
  // which blocks show on this screen, and the size of each ([cols, rows]); a block with its own place ("pos", the Hub editor) keeps it
  function plan(layout, scr, D) {
    const shown = (layout.blocks || []).filter(b0 => B[b0.block] && visible(b0.block) && !(Array.isArray(b0.hide) && b0.hide.indexOf(scr) > -1)
      && !(b0.block === 'loved' && !D.loved.length) && !(b0.block === 'notes' && !D.notes.length));
    const wide = scr === 'wide' && shown.some(b0 => !Array.isArray(b0.wide) && !(b0.pos && b0.pos.wide)) ? planWide(shown) : null;
    // an own Hub (cards with fixed places) where a card has nothing to show right now (no hearts yet, a function off):
    // the other cards close up in reading order, so guests never see a hole
    const placed = shown.filter(b0 => b0.pos && Array.isArray(b0.pos[scr]));
    const missing = (layout.blocks || []).some(b0 => b0.pos && Array.isArray(b0.pos[scr]) && shown.indexOf(b0) < 0 && !(Array.isArray(b0.hide) && b0.hide.indexOf(scr) > -1));
    const repack = new Map();
    if (missing && placed.length && !SKIP_REPACK) {
      const cols = SCREEN[scr].cols, taken = [], over = (a, c) => a[0] < c[0] + c[2] && c[0] < a[0] + a[2] && a[1] < c[1] + c[3] && c[1] < a[1] + a[3];
      placed.slice().sort((x, y) => x.pos[scr][1] - y.pos[scr][1] || x.pos[scr][0] - y.pos[scr][0]).forEach(b0 => {
        const w = Math.min(b0.pos[scr][2], cols), ht = b0.pos[scr][3];
        for (let y = 0, done = false; !done; y++) for (let x = 0; x + w <= cols; x++) { const p = [x, y, w, ht]; if (!taken.some(q => over(q, p))) { taken.push(p); repack.set(b0, p); done = true; break; } }
      });
      // a card that ends a row with empty cells after it grows to the edge (no gap on the right)
      taken.forEach(p => { while (p[0] + p[2] < cols && !taken.some(q => q !== p && over(q, [p[0] + p[2], p[1], 1, p[3]]))) p[2]++; });
    }
    return shown.map(b0 => {
      const at = repack.get(b0) || (b0.pos && Array.isArray(b0.pos[scr]) ? b0.pos[scr].map(Number) : null);
      const sz = at ? [at[2], at[3]] : (wide && wide.get(b0)) || sizeOf(b0, scr), legacy = !at && !Array.isArray(b0[scr]) && !wide;
      const rows = legacy && (b0.block === 'stats' || b0.block === 'studio') ? 1 : sz[1];   // numbers and the photographer read best one row high
      return { b0, at, cols: Math.min(sz[0], SCREEN[scr].cols), rows };
    });
  }
  // draw a layout into a box: the Hub itself, or the Hub editor's canvas (scr / widthPx: the screen it is drawn for)
  function build(box, layout, scr, widthPx, editing) {
    SCR_FOR = scr || null; SKIP_REPACK = !!editing;
    try {
      box.innerHTML = ''; box.dataset.layout = layout.id; fit(box, widthPx);
      const D = data(), sc = screenOf(), u = parseFloat(box.style.getPropertyValue('--u')), gap = SCREEN[sc].gap, out = [];
      plan(layout, sc, D).forEach(it => {
        const b0 = it.b0, letter = b0.size && sc === 'phone' && !it.at ? b0.size : letterOf([it.cols, it.rows], u, gap), b = Object.assign({}, b0, { _letter: letter });
        const el = h('section', 'pgl-b pgl-' + b.block + ' pgl-v-' + b.variant + ' pgl-s' + letter);
        el.style.gridColumn = it.at ? (it.at[0] + 1) + ' / span ' + it.cols : 'span ' + it.cols;
        el.style.gridRow = it.at ? (it.at[1] + 1) + ' / span ' + it.rows : 'span ' + it.rows; el.dataset.block = b.block;
        if (B[b.block](el, b, D) === false) return;
        box.appendChild(el); out.push({ b0, el });
      });
      return out;
    } finally { SCR_FOR = null; SKIP_REPACK = false; }
  }
  // ---------- Story Hubs (step 53): a whole scrolling page instead of cards ----------
  // "living" = Living Story (Gemini), "editorial" = Editorial Album (ChatGPT). They get the wedding's data and call back here to open things.
  const STORY = { living: () => window.PGStoryLiving, editorial: () => window.PGStoryEditorial };
  let storyOn = null;   // { kind, mod } while a story is on screen
  // Story settings (step 54, changed in the Hub editor): sections shown / hidden / moved, the floating Find me button, the icon bar, the headings.
  // The extra icon bar is OFF unless chosen: our header and bottom bar are already there.
  const SNAME = { 'psh-hero-track': 'Cover', 'psh-stream': 'Glancing photos', 'psh-varmala-track': 'Varmala', 'psh-events-sec': 'Events', 'psh-lab-sec': 'Reel & Post showcase', 'psh-notes-sec': 'Notes', 'psh-foot': 'Closing',
    'pse-hero': 'Cover', 'pse-intro': 'Introduction', 'pse-cover-stream': 'Photo stream', 'pse-events': 'Events', 'pse-vow': 'Varmala', 'pse-loved': 'Most loved', 'pse-notes': 'Notes', 'pse-demo': 'Reel & Post showcase', 'pse-footer': 'Closing' };
  const tuneOf = t => Object.assign({ sections: [], findme: 'right', bar: 'off', texts: {} }, t || {});
  // the story's parts, top to bottom: { k, name, el, fixed } — the cover always stays first
  function storyParts(box) {
    const top = x => { const p = x.parentElement.closest('section, footer'); return !p || !box.contains(p); };   // the Hub page itself is a <section>
    const all = [...box.querySelectorAll('section, footer')].filter(x => top(x) && SNAME[x.classList[0]]);
    return all.map((x, i) => ({ k: x.classList[0], name: SNAME[x.classList[0]], el: x, fixed: i === 0 && /hero/.test(x.classList[0]) }));
  }
  // the headings a couple may reword: big titles and the little lines above them (not event names: those come from the folders)
  function storyTexts(box) {
    const evn = new Set((GALLERY.events || []).map(e => String(e.name).trim().toLowerCase())), out = [];
    storyParts(box).forEach(p => {
      [...p.el.querySelectorAll('h1, h2, .psh-eye, .pse-kicker')].filter(x => x.textContent.trim() && !evn.has(x.textContent.trim().toLowerCase()) && !x.closest('button')).forEach((x, j) => out.push({ key: p.k + ':' + j, el: x, part: p.name, text: x.textContent.trim() }));
    });
    return out;
  }
  function storyTune(box, t) {
    t = tuneOf(t);
    const parts = storyParts(box), byK = {}; parts.forEach(p => { byK[p.k] = p; });
    // reword first (keys follow the original order), then hide and move
    storyTexts(box).forEach(x => { const v = t.texts[x.key]; if (typeof v === 'string' && v.trim()) x.el.textContent = v; });
    (t.sections || []).forEach(q => { const p = byK[q.k]; if (p && !p.fixed) p.el.style.display = q.on === false ? 'none' : ''; });
    const order = (t.sections || []).map(q => byK[q.k]).filter(p => p && !p.fixed);
    if (order.length) { const movable = parts.filter(p => !p.fixed), anchor = movable[movable.length - 1].el.nextSibling, par = movable[0].el.parentElement;
      order.concat(movable.filter(p => order.indexOf(p) < 0)).forEach(p => { if (p.el.parentElement === par) par.insertBefore(p.el, anchor); }); }
    box.classList.toggle('pgs-bar-on', t.bar === 'on');
    let fm = box.querySelector('.pgs-findme');
    if (t.findme !== 'off' && visible('findme')) {
      if (!fm) { fm = h('button', 'pgs-findme', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/></svg><span>Find me</span>'); fm.type = 'button'; fm.addEventListener('click', () => storyAct('findme')); box.appendChild(fm); }
      fm.classList.toggle('left', t.findme === 'left');
    } else if (fm) fm.remove();
  }
  function storyStop() { if (storyOn) { try { storyOn.mod.destroy(); } catch (e) {} storyOn = null; } const s = $('pgStory'); if (s) s.remove(); document.body.classList.remove('pg-story-on'); }
  function storyData() {
    // step 56: the photos come from the couple's / photographer's choice (Control Panel › Story); nothing is guessed
    const P = GALLERY.story || {}, hl = P.hl || {};
    const D0 = data(), evs = (GALLERY.events || []).map(e => ({ name: e.name, photos: (e.photos || []).map(p => ({ id: p.id })), featured: hl[e.name] && hl[e.name].length ? hl[e.name].slice() : undefined }));
    const couple = P.bride && P.groom ? { bride: P.bride, groom: P.groom } : undefined;   // both chosen, or the varmala part is left out
    return { names: D0.names, date: D0.date, place: D0.place, studio: D0.studio, events: evs, couple, cover: (P.cover || []).length ? P.cover.slice() : undefined, loved: D0.loved, notes: (D0.notes || []).map(n => ({ name: n.name, text: n.text, photoId: n.photoId })) };
  }
  function storyAct(a, x) {
    const run = k => { if (!visible(k)) return; const t = (window.PGRules && PGRules.act(k)) || ACT[k]; if (t) t[2](); };
    if (['findme', 'reel', 'post', 'upload', 'install'].indexOf(a) > -1) return run(a);
    if (a === 'memory') return run('upload');
    if (a === 'notes') return switchViewFromNav('rooms');
    if (a === 'loved') return pgStatTap('hearts');
    if (a === 'share') return pgShare();
    if (a === 'studio') return switchViewFromNav('studio');
    if (a === 'event' && x) return window.pgOpenEvent ? pgOpenEvent(x) : openCollection(x, 0);
    if (a === 'photo' && x && x.id) return pgOpenPhoto(x.id);
  }
  function storyRender(view, kind) {
    const mod = STORY[kind] && STORY[kind](); if (!mod) return false;
    const old = $('pgLay'); if (old) old.remove(); document.body.classList.remove('pg-lay-on');
    if (storyOn && storyOn.kind === kind && $('pgStory')) { if (JSON.stringify(cur.tune || null) !== storyOn.tune || JSON.stringify(GALLERY.story || null) !== storyOn.picks) { storyStop(); } else return true; }   // new settings or new story photos: draw again   // already showing: keep the guest's place
    storyStop();
    const box = h('div', 'pgl-story'); box.id = 'pgStory'; view.prepend(box); document.body.classList.add('pg-story-on');
    let asked = false; try { asked = localStorage.getItem('pg_storyq_' + GALLERY_ID) === '1'; } catch (e) {}
    try { mod.render(box, storyData(), storyAct, { first: !asked && !/pgpreview=1/.test(location.search), galleryId: GALLERY_ID }); storyOn = { kind, mod, tune: JSON.stringify(cur.tune || null), picks: JSON.stringify(GALLERY.story || null) }; storyTune(box, cur.tune); }
    catch (e) { console.warn('Story Hub', e); storyStop(); return false; }
    return true;
  }
  pgAfter('switchView', v => { if (v !== 'hub') storyStop(); else if (cur && cur.story && !storyOn) render(); });

  function render() {
    const view = $('view-hub'); if (!view || typeof GALLERY === 'undefined' || !GALLERY) return;
    if (cur && cur.story && !GALLERY.isStudio) { if (document.body.dataset.view && document.body.dataset.view !== 'hub') return; if (storyRender(view, cur.story)) return; }
    storyStop();
    let box = $('pgLay');
    if (!cur || GALLERY.isStudio) { document.body.classList.remove('pg-lay-on'); if (box) box.remove(); return; }
    if (!box) { box = h('div', 'pgl-grid'); box.id = 'pgLay'; view.prepend(box); }
    document.body.classList.add('pg-lay-on'); shownOn = screenOf();
    build(box, cur);
  }
  let rz = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { const box = $('pgLay'); if (!box || !cur) return; if (screenOf() !== shownOn) render(); else fit(box); }); });
  function choose() {
    const q = new URLSearchParams(location.search).get('layout');
    if (q === 'original') return null;   // preview of the original Hub
    const G = typeof GALLERY !== 'undefined' && GALLERY ? GALLERY : {};
    if (window.PGHubDraft && PGHubDraft()) return customOf(PGHubDraft());   // the Hub editor's draft, previewed on this phone only
    const id = q || G.layout || '';
    if (id === 'custom') return G.custom && G.custom.blocks ? customOf(G.custom) : null;   // the wedding's own Hub (made in the Hub editor)
    return LAYOUTS.find(l => l.id === id) || null;
  }
  const customOf = c => (c.story && STORY[c.story.kind] ? { id: 'custom', name: 'Our own Hub', theme: '', story: c.story.kind, tune: c.story, blocks: [] }
    : { id: 'custom', name: 'Our own Hub', theme: '', blocks: (c.blocks || []).map(b => Object.assign({}, b)) });
  try { localStorage.removeItem('pg_layout_pick'); } catch (e) {}   // old test-menu choice no longer overrides the wedding
  const ready = fetch('/app/themes/layouts.json').then(r => r.json()).then(d => { LAYOUTS = (d.layouts || []).filter(l => l && l.id && Array.isArray(l.blocks)); cur = choose(); if (typeof GALLERY !== 'undefined' && GALLERY) render(); return LAYOUTS; }).catch(() => []);
  pgAfter('pgRenderHub', () => { if (LAYOUTS.length) { cur = choose(); render(); } });
  // apply(id) shows a layout straight away (the Control Panel saves it for the wedding); '' = the original Hub
  window.PGLayout = { ready, list: () => LAYOUTS.slice(), current: () => (cur ? cur.id : ''), render, build, plan: (l, scr) => { SCR_FOR = scr; try { return plan(l, scr, data()); } finally { SCR_FOR = null; } },
    SCREEN, sizeOf, find: id => LAYOUTS.find(l => l.id === id) || null, refresh: () => { cur = choose(); render(); },
    apply: id => { const G = typeof GALLERY !== 'undefined' && GALLERY ? GALLERY : {}; const l = id === 'custom' ? (G.custom && (G.custom.story || (G.custom.blocks && G.custom.blocks.length)) ? customOf(G.custom) : null) : LAYOUTS.find(x => x.id === id) || null; if (id && !l) return false; cur = l; render(); return true; },
    reset: () => { cur = null; render(); },
    // for the Hub editor (step 54): the story's parts and headings, read from a hidden copy of the story
    storyInfo: kind => {
      const mod = STORY[kind] && STORY[kind](); if (!mod) return null;
      storyStop();
      const box = h('div', 'pgl-story pgs-probe'); document.body.appendChild(box);
      try { mod.render(box, storyData(), () => {}, { first: false, galleryId: GALLERY_ID });
        return { parts: storyParts(box).map(p => ({ k: p.k, name: p.name, fixed: p.fixed })), texts: storyTexts(box).map(x => ({ key: x.key, part: x.part, text: x.text })) };
      } catch (e) { console.warn('Story Hub', e); return null; }
      finally { try { mod.destroy(); } catch (e) {} box.remove(); }
    },
    stories: () => Object.keys(STORY).map(k => ({ kind: k, layout: LAYOUTS.find(l => l.story === k) })).filter(x => x.layout) };
})();
