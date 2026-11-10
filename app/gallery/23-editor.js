// Hub editor (step 44): the couple, the photographer and PicGrades design their own Hub, like a website builder.
// The Hub is shown on its grid. Tap a card to select it, then:
//   · drag the ✥ handle (or the card itself, with a mouse) to move it — it snaps to the grid cells
//   · drag the corner handle to make it bigger or smaller, or pick a ready size
//   · change its style, swap it for another function, hide it on this screen, or remove it
//   · "Add card" brings back any card that is not on the Hub
// Cards never overlap: the others move down out of the way and everything closes up (no holes).
// Phone, tablet and laptop are arranged separately (Phone / Tablet / Laptop). The couple's logo can sit left or right.
// Preview shows the draft on this phone only; Publish makes it the wedding's Hub for every guest.
// Only the Hub for now; the other pages follow the chosen layout.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgHubEditor() {
  const COLS = { phone: 4, tall: 8, wide: 12 }, FRAME = { phone: 390, tall: 820, wide: 1440 }, LABEL = { phone: 'Phone', tall: 'Tablet', wide: 'Laptop' };
  const CARDS = {
    hero: ['Cover photos', ['full-bleed', 'slideshow', 'collage-3', 'collage-5', 'polaroid-stack', 'split']],
    findme: ['Find me', ['photo', 'icon', 'glass', 'slideshow']], reel: ['Reel Edits', ['icon', 'photo', 'glass', 'slideshow']], post: ['Post Edits', ['icon', 'photo', 'glass', 'slideshow']],
    upload: ['Add a moment', ['icon', 'photo', 'glass', 'slideshow']],   // 'slideshow' is used by 14 cards in the ready layouts (step 49 audit)
    events: ['Events', ['carousel', 'grid-2', 'mosaic-slideshow', 'list', 'stack', 'editorial-bands']],
    loved: ['Most loved', ['strip', 'mosaic']], notes: ['Notes', ['cards', 'bubbles']], studio: ['Photographer', ['card', 'banner']],
    install: ['Add to Home Screen', ['card', 'pill']], review: ['Thank the photographer', ['card', 'pill']]
  };
  const VNAME = { 'full-bleed': 'One big photo', slideshow: 'Slideshow', 'collage-3': 'Collage of 3', 'collage-5': 'Collage of 5', 'polaroid-stack': 'Polaroids', split: 'Photo + names',
    icon: 'Icon', photo: 'Photo', glass: 'Glass', carousel: 'Carousel', 'grid-2': 'Grid', 'mosaic-slideshow': 'Mosaic', list: 'List', stack: 'Stacked', 'editorial-bands': 'Bands',
    strip: 'Strip', mosaic: 'Mosaic', cards: 'Cards', bubbles: 'Bubbles', card: 'Card', banner: 'Banner', pill: 'Pill' };
  // ready sizes [cols, rows] for each screen
  const SIZES = {
    phone: [['Small', 1, 1], ['Wide', 2, 1], ['Square', 2, 2], ['Tall', 2, 3], ['Large', 4, 2], ['Big', 4, 3], ['Full', 4, 4]],
    tall: [['Small', 2, 2], ['Wide', 4, 2], ['Square', 4, 4], ['Tall', 4, 6], ['Large', 8, 4], ['Big', 8, 6]],
    wide: [['Small', 2, 2], ['Wide', 4, 2], ['Square', 4, 4], ['Tall', 4, 6], ['Large', 6, 4], ['Big', 8, 5], ['Full', 12, 4]]
  };
  const DEF = { hero: { phone: [4, 3], tall: [8, 5], wide: [8, 5] }, act: { phone: [2, 2], tall: [4, 2], wide: [4, 2] }, events: { phone: [4, 3], tall: [8, 4], wide: [12, 4] },
    loved: { phone: [4, 2], tall: [8, 3], wide: [6, 3] }, notes: { phone: [4, 2], tall: [8, 3], wide: [6, 3] }, studio: { phone: [4, 1], tall: [8, 1], wide: [12, 1] } };
  const defSize = (k, scr) => (DEF[k] || DEF.act)[scr];
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const KEY = () => 'pg_hubdraft_' + GALLERY_ID;
  const store = v => { try { if (v === null) localStorage.removeItem(KEY()); else localStorage.setItem(KEY(), JSON.stringify(v)); } catch (e) {} };
  const loadDraft = () => { try { return JSON.parse(localStorage.getItem(KEY()) || 'null'); } catch (e) { return null; } };
  let previewing = false;
  window.PGHubDraft = () => (previewing ? loadDraft() : null);   // 15-layout shows the draft while previewing

  // ---- grid maths ----
  const over = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  function pack(sizes, cols) {   // first free place, row by row (like the layouts)
    const out = [];
    sizes.forEach(([w, ht]) => { w = Math.min(w, cols);
      for (let y = 0; ; y++) { let done = false; for (let x = 0; x + w <= cols; x++) { const p = [x, y, w, ht]; if (!out.some(q => q && over(q, p))) { out.push(p); done = true; break; } } if (done) break; } });
    return out;
  }
  // the moved card keeps its place; any card in the way moves down; then everything floats up so no holes are left
  function settle(P, moved, keepMoved) {
    const idx = P.map((p, i) => i).filter(i => P[i]);
    const others = idx.filter(i => i !== moved).sort((a, b) => P[a][1] - P[b][1] || P[a][0] - P[b][0]);
    const placed = moved != null && P[moved] ? [moved] : [];
    others.forEach(i => { let p = P[i], g = 0;
      while (g++ < 500) { const hit = placed.filter(j => over(P[j], p)); if (!hit.length) break; p = [p[0], Math.max(...hit.map(j => P[j][1] + P[j][3])), p[2], p[3]]; }
      P[i] = p; placed.push(i); });
    idx.slice().sort((a, b) => P[a][1] - P[b][1] || P[a][0] - P[b][0]).forEach(i => {
      if (keepMoved && i === moved) return;
      while (P[i][1] > 0) { const t = [P[i][0], P[i][1] - 1, P[i][2], P[i][3]]; if (idx.some(j => j !== i && P[j] && over(P[j], t))) break; P[i] = t; }
    });
    return P;
  }

  // ---- a draft from a layout: every card gets a place on each screen ----
  function fromLayout(lay) {
    const blocks = (lay.blocks || []).filter(b => CARDS[b.block]).map(b => ({ block: b.block, variant: b.variant || CARDS[b.block][1][0], pos: {}, hide: (b.hide || []).slice(), _src: b }));
    Object.keys(COLS).forEach(scr => {
      const planned = new Map((PGLayout.plan(lay, scr) || []).map(it => [it.b0, it]));
      const list = blocks.filter(b => b.hide.indexOf(scr) < 0);
      const P = pack(list.map(b => { const it = planned.get(b._src); return it ? [it.cols, it.rows] : (b._src.pos && b._src.pos[scr] ? b._src.pos[scr].slice(2) : PGLayout.sizeOf(b._src, scr)); }), COLS[scr]);
      list.forEach((b, i) => { b.pos[scr] = P[i]; });
    });
    blocks.forEach(b => delete b._src);
    return { base: lay.id || '', blocks, header: ((GALLERY.pages || {}).header) || 'right', modeside: ((GALLERY.pages || {}).modeside) || 'right' };
  }
  function startDraft() {
    const saved = loadDraft(); if (saved && saved.blocks && saved.blocks.length) return saved;
    if (GALLERY.layout === 'custom' && GALLERY.custom && GALLERY.custom.blocks.length) return Object.assign(clone(GALLERY.custom), { header: (GALLERY.pages || {}).header || 'right', modeside: (GALLERY.pages || {}).modeside || 'right' });
    const lay = PGLayout.find(GALLERY.layout) || PGLayout.list()[0];
    return fromLayout(lay);
  }

  // ---- the editor ----
  let E = null;   // { el, d (draft), scr, sel, undo: [], redo: [] }
  function snapshot() { E.undo.push(JSON.stringify(E.d)); if (E.undo.length > 60) E.undo.shift(); E.redo = []; paintUndo(); }
  function commit() { store(E.d); draw(); }
  function paintUndo() { E.el.querySelector('.pged-undo').disabled = !E.undo.length; E.el.querySelector('.pged-redo').disabled = !E.redo.length; }
  const layoutOf = d => ({ id: 'custom', name: 'Our own Hub', blocks: d.blocks.map(b => ({ block: b.block, variant: b.variant, pos: b.pos, hide: b.hide })) });

  function open() {
    if (E) return;
    E = { d: startDraft(), scr: window.innerWidth < 600 ? 'phone' : window.innerWidth >= 1100 ? 'wide' : 'tall', sel: -1, undo: [], redo: [] };
    const el = h('div', 'pged'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Hub editor'); E.el = el;
    el.innerHTML = '<div class="pged-top"><button type="button" class="pged-x" aria-label="Close the editor">✕</button><b class="pged-title">Edit Hub</b>' +
      '<button type="button" class="pged-ic pged-undo" aria-label="Undo">↶</button><button type="button" class="pged-ic pged-redo" aria-label="Redo">↷</button>' +
      '<button type="button" class="pged-btn pged-prev">Preview</button><button type="button" class="pged-btn pged-pub">Publish</button></div>' +
      '<div class="pged-bar"><div class="pged-seg pged-screens" role="tablist">' + Object.keys(COLS).map(s => '<button type="button" data-scr="' + s + '">' + LABEL[s] + '</button>').join('') + '</div>' +
      '<div class="pged-seg pged-logo" aria-label="Logo"><span>Logo</span><button type="button" data-logo="left">Left</button><button type="button" data-logo="right">Right</button></div>' +
      '<div class="pged-seg pged-mode" aria-label="Light / dark button"><span>Light/dark</span><button type="button" data-mode="left">Left</button><button type="button" data-mode="right">Right</button></div>' +
      '<button type="button" class="pged-btn pged-add">+ Add card</button><select class="pged-from" aria-label="Start from a layout"></select></div>' +
      '<div class="pged-canvas"><div class="pged-frame"><div class="pgl-grid pged-grid"></div></div><p class="pged-hint">Tap a card to choose it. Drag ✥ to move it, drag the corner to change its size.</p></div>' +
      '<div class="pged-tools" hidden></div>';
    const from = el.querySelector('.pged-from');
    from.innerHTML = '<option value="">Start again from a layout…</option>' + PGLayout.list().map(l => '<option value="' + l.id + '">' + pgEsc(l.name) + '</option>').join('');
    from.addEventListener('change', () => { const l = PGLayout.find(from.value); from.value = ''; if (!l) return; if (!confirmBox('Start again from “' + l.name + '”? Your changes so far are replaced (Undo brings them back).')) return; snapshot(); E.d = Object.assign(fromLayout(l), { header: E.d.header }); E.sel = -1; commit(); });
    el.querySelector('.pged-x').addEventListener('click', close);
    el.querySelector('.pged-undo').addEventListener('click', () => { if (!E.undo.length) return; E.redo.push(JSON.stringify(E.d)); E.d = JSON.parse(E.undo.pop()); E.sel = -1; paintUndo(); commit(); });
    el.querySelector('.pged-redo').addEventListener('click', () => { if (!E.redo.length) return; E.undo.push(JSON.stringify(E.d)); E.d = JSON.parse(E.redo.pop()); E.sel = -1; paintUndo(); commit(); });
    el.querySelector('.pged-screens').addEventListener('click', e => { const b = e.target.closest('[data-scr]'); if (b) { E.scr = b.dataset.scr; E.sel = -1; draw(); } });
    el.querySelector('.pged-logo').addEventListener('click', e => { const b = e.target.closest('[data-logo]'); if (!b) return; snapshot(); E.d.header = b.dataset.logo; commit(); });
    el.querySelector('.pged-mode').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; snapshot(); E.d.modeside = b.dataset.mode; commit(); });   // step 49: the light/dark button moves on its own
    el.querySelector('.pged-add').addEventListener('click', addSheet);
    el.querySelector('.pged-prev').addEventListener('click', preview);
    el.querySelector('.pged-pub').addEventListener('click', publish);
    window.addEventListener('resize', draw);
    document.body.appendChild(el); document.body.classList.add('pged-on');
    endPreview(true); store(E.d); paintUndo(); draw();
  }
  function close() { if (!E) return; window.removeEventListener('resize', draw); E.el.remove(); E = null; document.body.classList.remove('pged-on'); }
  function confirmBox(t) { return window.confirm(t); }

  // draw the draft for the chosen screen, scaled to fit
  function draw() {
    if (!E) return;
    const el = E.el, scr = E.scr, d = E.d, cols = COLS[scr];
    el.querySelectorAll('[data-scr]').forEach(b => b.classList.toggle('on', b.dataset.scr === scr));
    el.querySelectorAll('[data-logo]').forEach(b => b.classList.toggle('on', b.dataset.logo === (d.header || 'right')));
    el.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === (d.modeside || 'right')));
    const canvas = el.querySelector('.pged-canvas'), frame = el.querySelector('.pged-frame'), grid = el.querySelector('.pged-grid');
    const W = FRAME[scr], k = Math.min(1, (canvas.clientWidth - 24) / W);
    grid.style.width = W + 'px'; grid.style.transform = 'scale(' + k + ')';
    const shown = PGLayout.build(grid, layoutOf(d), scr, W, true);
    E.k = k; E.cards = [];
    d.blocks.forEach((b, i) => {
      if (!b.pos[scr] || (b.hide || []).indexOf(scr) > -1) return;
      let it = shown.find(x => x.b0.block === b.block && x.b0.pos === b.pos && x.b0.variant === b.variant);
      let card = it && it.el;
      if (!card) {   // a function switched off (or nothing to show yet): a placeholder keeps its place
        card = h('section', 'pgl-b pged-ghost', '<span>' + CARDS[b.block][0] + '<small>not shown to guests right now</small></span>');
        card.style.gridColumn = (b.pos[scr][0] + 1) + ' / span ' + b.pos[scr][2]; card.style.gridRow = (b.pos[scr][1] + 1) + ' / span ' + b.pos[scr][3]; grid.appendChild(card);
      }
      card.dataset.i = i; card.classList.add('pged-card'); card.classList.toggle('pged-sel', i === E.sel);
      const ov = h('div', 'pged-ov', '<span class="pged-name">' + CARDS[b.block][0] + '</span>' + (i === E.sel ? '<button type="button" class="pged-move" aria-label="Move">✥</button><button type="button" class="pged-size" aria-label="Change size"></button>' : ''));
      card.appendChild(ov); E.cards[i] = card;
      card.addEventListener('click', e => { if (E.dragged) return; e.preventDefault(); e.stopPropagation(); E.sel = i; draw(); }, true);
      if (i === E.sel) { drag(card, ov.querySelector('.pged-move'), 'move', i); drag(card, ov.querySelector('.pged-size'), 'size', i); drag(card, card, 'move', i, true); }   // with a mouse the whole card drags
    });
    frame.style.height = Math.ceil(grid.offsetHeight * k) + 'px'; frame.style.width = Math.ceil(W * k) + 'px';
    tools();
  }
  // move / resize by dragging (finger or mouse); the layout follows live
  function drag(card, handle, kind, i, mouseOnly) {
    if (!handle) return;
    handle.addEventListener('pointerdown', e => {
      if (mouseOnly && e.pointerType !== 'mouse') return;
      if (mouseOnly && e.target.closest('.pged-move,.pged-size')) return;
      e.preventDefault(); e.stopPropagation();
      const scr = E.scr, grid = E.el.querySelector('.pged-grid'), cs = getComputedStyle(grid), u = parseFloat(grid.style.getPropertyValue('--u')), gap = parseFloat(cs.columnGap) || 10;
      const step = (u + gap) * E.k, x0 = e.clientX, y0 = e.clientY, base = E.d.blocks.map(b => (b.pos[scr] && (b.hide || []).indexOf(scr) < 0 ? b.pos[scr].slice() : null));
      const orig = base[i], cols = COLS[scr]; let last = '', moved = false;
      handle.setPointerCapture(e.pointerId); card.classList.add('pged-dragging');
      const mv = ev => {
        const dx = Math.round((ev.clientX - x0) / step), dy = Math.round((ev.clientY - y0) / step);
        if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 4) moved = true;
        const P = base.map(p => p && p.slice());
        P[i] = kind === 'move' ? [Math.max(0, Math.min(cols - orig[2], orig[0] + dx)), Math.max(0, orig[1] + dy), orig[2], orig[3]]
          : [orig[0], orig[1], Math.max(1, Math.min(cols - orig[0], orig[2] + dx)), Math.max(1, Math.min(12, orig[3] + dy))];
        const key = P[i].join(','); if (key === last) return; last = key;
        settle(P, i, true);
        P.forEach((p, j) => { const c = E.cards[j]; if (!p || !c) return; c.style.gridColumn = (p[0] + 1) + ' / span ' + p[2]; c.style.gridRow = (p[1] + 1) + ' / span ' + p[3]; });
        E.live = P;
      };
      const up = () => {
        handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up);
        card.classList.remove('pged-dragging');
        if (moved && E.live) { snapshot(); const P = settle(E.live, i, false); E.d.blocks.forEach((b, j) => { if (P[j]) b.pos[scr] = P[j]; }); E.live = null; commit(); }
        E.dragged = moved; setTimeout(() => { if (E) E.dragged = false; }, 50);
      };
      handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    });
  }
  // the selected card's tools: style, ready sizes, swap, hide here, remove
  function tools() {
    const box = E.el.querySelector('.pged-tools'), i = E.sel, b = E.d.blocks[i];
    if (!b) { box.hidden = true; box.innerHTML = ''; return; }
    const scr = E.scr, p = b.pos[scr];
    box.hidden = false;
    box.innerHTML = '<div class="pged-trow"><b>' + CARDS[b.block][0] + '</b><button type="button" class="pged-done" aria-label="Done">Done</button></div>' +
      '<div class="pged-trow"><label>Style <select class="pged-var">' + CARDS[b.block][1].map(v => '<option value="' + v + '"' + (v === b.variant ? ' selected' : '') + '>' + (VNAME[v] || v) + '</option>').join('') + '</select></label>' +
      '<label>Card <select class="pged-swap">' + Object.keys(CARDS).map(k => '<option value="' + k + '"' + (k === b.block ? ' selected' : '') + '>' + CARDS[k][0] + '</option>').join('') + '</select></label></div>' +
      '<div class="pged-sizes">' + SIZES[scr].map(([n, w, ht]) => '<button type="button" data-w="' + w + '" data-h="' + ht + '"' + (p && p[2] === w && p[3] === ht ? ' class="on"' : '') + '>' + n + '<small>' + w + '×' + ht + '</small></button>').join('') + '</div>' +
      '<div class="pged-trow"><button type="button" class="pged-hide">Hide on ' + LABEL[scr] + '</button><button type="button" class="pged-del">Remove from the Hub</button></div>';
    box.querySelector('.pged-done').addEventListener('click', () => { E.sel = -1; draw(); });
    box.querySelector('.pged-var').addEventListener('change', ev => { snapshot(); b.variant = ev.target.value; commit(); });
    box.querySelector('.pged-swap').addEventListener('change', ev => { snapshot(); b.block = ev.target.value; b.variant = CARDS[b.block][1][0]; commit(); });
    box.querySelectorAll('.pged-sizes button').forEach(x => x.addEventListener('click', () => {
      snapshot(); const w = Math.min(+x.dataset.w, COLS[scr]), ht = +x.dataset.h, P = E.d.blocks.map(q => (q.pos[scr] && (q.hide || []).indexOf(scr) < 0 ? q.pos[scr].slice() : null));
      P[i] = [Math.min(P[i][0], COLS[scr] - w), P[i][1], w, ht]; settle(P, i, false); E.d.blocks.forEach((q, j) => { if (P[j]) q.pos[scr] = P[j]; }); commit();
    }));
    box.querySelector('.pged-hide').addEventListener('click', () => { snapshot(); b.hide = (b.hide || []).concat(scr); E.sel = -1; tidy(scr); commit(); showToast(CARDS[b.block][0] + ' is hidden on ' + LABEL[scr] + ' — Add card brings it back'); });
    box.querySelector('.pged-del').addEventListener('click', () => { snapshot(); E.d.blocks.splice(i, 1); E.sel = -1; Object.keys(COLS).forEach(tidy); commit(); });
  }
  function tidy(scr) { const P = E.d.blocks.map(q => (q.pos[scr] && (q.hide || []).indexOf(scr) < 0 ? q.pos[scr].slice() : null)); settle(P, null, false); E.d.blocks.forEach((q, j) => { if (P[j]) q.pos[scr] = P[j]; }); }
  // add a card (new, or one hidden on this screen) at the end of the Hub
  function addSheet() {
    const scr = E.scr, back = h('div', 'overlay-backdrop show'), sh = h('div', 'reg-overlay show pged-addsheet');
    const hidden = E.d.blocks.map((b, i) => [b, i]).filter(([b]) => (b.hide || []).indexOf(scr) > -1);
    sh.innerHTML = '<div class="reg-overlay-handle"></div><h3 class="fm-title">Add a card</h3>' +
      (hidden.length ? '<p class="pgcp-note">Hidden on ' + LABEL[scr] + '</p><div class="pged-cards">' + hidden.map(([b, i]) => '<button type="button" data-show="' + i + '">' + CARDS[b.block][0] + '</button>').join('') + '</div>' : '') +
      '<p class="pgcp-note">New card</p><div class="pged-cards">' + Object.keys(CARDS).map(k => '<button type="button" data-new="' + k + '">' + CARDS[k][0] + '</button>').join('') + '</div>' +
      '<button type="button" class="mk-btn-peach ios-wide">Close</button>';
    const shut = () => { back.remove(); sh.remove(); };
    back.addEventListener('click', shut); sh.querySelector('.ios-wide').addEventListener('click', shut);
    sh.addEventListener('click', e => {
      const s = e.target.closest('[data-show]'), n = e.target.closest('[data-new]'); if (!s && !n) return;
      snapshot();
      const bottom = sc => Math.max(0, ...E.d.blocks.map(q => (q.pos[sc] && (q.hide || []).indexOf(sc) < 0 ? q.pos[sc][1] + q.pos[sc][3] : 0)));
      if (s) { const b = E.d.blocks[+s.dataset.show]; b.hide = b.hide.filter(x => x !== scr); const sz = b.pos[scr] ? b.pos[scr].slice(2) : defSize(b.block, scr); b.pos[scr] = [0, bottom(scr), sz[0], sz[1]]; E.sel = +s.dataset.show; }
      else { const k = n.dataset.new, b = { block: k, variant: CARDS[k][1][0], pos: {}, hide: [] }; Object.keys(COLS).forEach(sc => { const sz = defSize(k, sc); b.pos[sc] = [0, bottom(sc), Math.min(sz[0], COLS[sc]), sz[1]]; }); E.d.blocks.push(b); E.sel = E.d.blocks.length - 1; }
      shut(); commit();
      setTimeout(() => { const c = E && E.cards[E.sel]; if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
    });
    document.body.append(back, sh);
  }

  // ---- preview on this phone, then publish ----
  let banner = null;
  function applyHeader() {
    const d = previewing ? loadDraft() : null, pg = (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.pages) || {};
    const side = (d && d.header) || pg.header || 'right', mode = (d && d.modeside) || pg.modeside || 'right';
    document.body.classList.toggle('pg-logo-left', side === 'left');
    document.body.classList.toggle('pg-mode-left', mode === 'left');
  }
  function preview() {
    store(E.d); close(); previewing = true; PGLayout.refresh(); applyHeader(); switchViewFromNav('hub'); window.scrollTo(0, 0);
    banner = h('div', 'pged-banner', '<span>Preview — only you can see this</span><button type="button" class="pged-bk">Keep editing</button><button type="button" class="pged-bp">Publish</button><button type="button" class="pged-bx" aria-label="Leave the preview">✕</button>');
    banner.querySelector('.pged-bk').addEventListener('click', open);
    banner.querySelector('.pged-bp').addEventListener('click', publish);
    banner.querySelector('.pged-bx').addEventListener('click', () => endPreview());
    document.body.appendChild(banner);
  }
  function endPreview(quiet) {
    if (banner) { banner.remove(); banner = null; }
    if (!previewing) return; previewing = false; if (!quiet) { PGLayout.refresh(); applyHeader(); }
  }
  function publish() {
    const d = E ? E.d : loadDraft(); if (!d || !d.blocks.length) { showToast('Add at least one card first'); return; }
    const body = { layout: 'custom', custom: JSON.stringify({ base: d.base || '', blocks: d.blocks.map(b => ({ block: b.block, variant: b.variant, pos: b.pos, hide: b.hide })) }), pages: JSON.stringify({ header: d.header || 'right', modeside: d.modeside || 'right' }) };
    const btn = E ? E.el.querySelector('.pged-pub') : null; if (btn) { btn.disabled = true; btn.textContent = 'Publishing…'; }
    PGControl.save(body).then(r => {
      GALLERY.layout = r.layout; GALLERY.custom = r.custom; GALLERY.pages = r.pages || GALLERY.pages; if (r.theme != null) GALLERY.theme = r.theme;
      store(null); close(); endPreview(true); previewing = false; PGLayout.refresh(); applyHeader(); switchViewFromNav('hub');
      showToast(PGControl.role() === 'demo' ? 'Published on this phone (demo)' : 'Published — every guest sees your Hub now');
    }).catch(err => { showToast(err.message); if (btn) { btn.disabled = false; btn.textContent = 'Publish'; } });
  }
  pgAfter('pgRenderHub', applyHeader);
  window.PGHubEditor = { open, close, preview, publish, draft: () => (E ? clone(E.d) : loadDraft()), state: () => (E ? { scr: E.scr, sel: E.sel, undo: E.undo.length } : null), settle, pack };
})();
