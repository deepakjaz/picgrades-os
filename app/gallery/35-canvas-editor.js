// The ONE editor (step 97, built on the free-canvas editor of step 77): every Hub layout opens here — canvas layouts,
// card layouts (converted) and story layouts that have an editor version. Approved design: docs/handover/gemini/universal-editor-mockup.html
// Top bar: ‹ back · undo · redo · ⋯ (Phone/Laptop, Simple/Free, zoom, Save, rename) · ▶ Play · Apply.
// Tools (bottom drawer on a phone, right panel on a laptop): Add · Layers · Pages · Collections · Theme · Media.
// A selected part has three tabs: Design (its look), Motion (the motion library), Connect (what it shows).
// Simple mode snaps parts to a grid of rows and columns (set per section); Free places them anywhere.
// Free-canvas editor (step 77, phase 2): design any Hub layout by hand — on a phone or a laptop.
// Tap an element to select it, then drag it, pull a corner to resize it, the round handle to turn it. Snap lines keep things lined up.
// Phone and Laptop each keep their own placement (switch at the top). Panels:
//   Add    — the app's elements (photo, names, date, text, events, photo strip, buttons, blessing, credit, shapes)
//   Style  — what the element shows, its look (font, size, colours, corners, border, shadow…), its motion, its exact spot
//   Layers — every element of every section: select, show/hide on this screen, bring forward / back
//   Page   — the section (height, background colour or photo) and the layout (colours, fonts, name)
// Save keeps it in a collection (Code.gs canvasSave: who sees it — me / this wedding / my weddings / every wedding for PicGrades).
// Apply makes it the wedding's Hub (a copy is saved first when it isn't yours yet).
(function pgCanvasEditor() {
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const r1 = v => Math.round(v * 10) / 10;
  const uid = p => p + Math.random().toString(36).slice(2, 8);
  // step 97: line icons from the approved mockup
  const SV = (d, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IC = {
    back: SV('<path d="M15 6l-6 6 6 6"/>', 2), undo: SV('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'), redo: SV('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>', stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    add: SV('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>'), layers: SV('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
    page: SV('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5"/>'), collections: SV('<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>'),
    theme: SV('<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="10" r="1.3"/><path d="M12 21a3 3 0 0 1 0-6h1.5"/>'),
    media: SV('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-6 6"/>'),
    design: SV('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>'), motion: SV('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
    connect: SV('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>')
  };
  // 'style' is the selected part's own panel (Design · Motion · Connect); 'page' is the Pages tool (sections + header)
  const TABS = [['add', 'Add'], ['layers', 'Layers'], ['page', 'Pages'], ['collections', 'Layouts'], ['theme', 'Theme'], ['media', 'Media']];
  const SUBTABS = [['design', 'Design'], ['motion', 'Motion'], ['connect', 'Connect']];
  const TYPE = { photo: 'Photo', names: 'Names', date: 'Date', text: 'Text', events: 'Events', strip: 'Photo strip', action: 'Button', blessings: 'Blessing', credit: 'Credit', shape: 'Shape', card: 'App card', art: 'Element', video: 'Video' };
  const catalog = () => (window.PGHubEditor && PGHubEditor.catalog ? PGHubEditor.catalog() : { CARDS: {}, VNAME: {} });
  const cardName = e => ((catalog().CARDS[e.block] || [])[0]) || e.block;
  const SNAP = 6;   // px
  let E = null;

  // ---- a new layout starts with this ----
  function starter() {
    return { v: 1, name: 'My layout', colors: { bg: '#f6f1ea', ink: '#2a2420', acc: '#a07d4c', acc2: '#c9a56a', card: '#ffffff' }, fonts: { head: 'Cormorant Garamond', body: 'Jost' },
      sections: [{ id: uid('s'), h: { p: 844, l: 760 }, els: [
        { id: uid('e'), t: 'photo', p: { x: 30, y: 90, w: 330, h: 500, z: 1 }, l: { x: 120, y: 100, w: 440, h: 600, z: 1 }, s: { shape: 'arch', radius: 6, fy: 28 }, src: { k: 'cover', n: 0 }, m: 'fade' },
        { id: uid('e'), t: 'names', p: { x: 20, y: 606, w: 350, h: 70, z: 2 }, l: { x: 640, y: 300, w: 460, h: 140, z: 2 }, s: { font: 'Cormorant Garamond', size: 40, italic: true, align: 'center' }, sl: { size: 64, align: 'left' }, m: 'rise' },
        { id: uid('e'), t: 'date', p: { x: 20, y: 680, w: 350, h: 26, z: 2 }, l: { x: 640, y: 450, w: 460, h: 30, z: 2 }, s: { size: 12, ls: 0.25, upper: true, align: 'center', color: '#a07d4c' }, sl: { align: 'left', size: 14 } },
        { id: uid('e'), t: 'action', act: 'findme', p: { x: 125, y: 724, w: 140, h: 40, z: 3 }, l: { x: 640, y: 510, w: 170, h: 48, z: 3 }, s: { border: 1, bcolor: '#a07d4c', color: '#2a2420', radius: 24, size: 14, weight: 500 } }] },
      { id: uid('s'), h: { p: 420, l: 520 }, els: [
        { id: uid('e'), t: 'events', p: { x: 20, y: 40, w: 370, h: 300, z: 1 }, l: { x: 120, y: 60, w: 960, h: 380, z: 1 }, s: { radius: 14, size: 14 }, v: 'row', per: { p: 2.2, l: 3.4 } }] }] };
  }
  // what a new element looks like when added
  function fresh(t, v) {
    const base = { id: uid('e'), t, p: { x: 45, y: 40, w: 300, h: 60, z: 5 } };
    if (t === 'photo') Object.assign(base, { p: { x: 45, y: 40, w: 300, h: 380, z: 5 }, s: { radius: 12, fy: 30 }, src: { k: 'auto' } });
    if (t === 'names') Object.assign(base, { p: { x: 20, y: 40, w: 350, h: 70, z: 5 }, s: { font: 'Cormorant Garamond', size: 40, italic: true, align: 'center' } });
    if (t === 'date') Object.assign(base, { p: { x: 20, y: 40, w: 350, h: 28, z: 5 }, s: { size: 12, ls: 0.25, upper: true, align: 'center' } });
    if (t === 'text') Object.assign(base, { s: { size: 16, align: 'center' }, text: 'Your words here' });
    if (t === 'events') Object.assign(base, { p: { x: 20, y: 40, w: 370, h: v === 'list' ? 220 : v === 'circles' ? 160 : 280, z: 5 }, s: { radius: 12, size: 14 }, v: v || 'row' });
    if (t === 'strip') Object.assign(base, { p: { x: 0, y: 40, w: 390, h: 220, z: 5 }, s: { radius: 8 } });
    if (t === 'action') Object.assign(base, { p: { x: 45, y: 40, w: 300, h: 52, z: 5 }, s: { bg: '#2a2420', color: '#ffffff', radius: 26, size: 15, weight: 500 }, act: v || 'findme' });
    if (t === 'blessings') Object.assign(base, { p: { x: 30, y: 40, w: 330, h: 150, z: 5 }, s: { font: 'Cormorant Garamond', size: 22, italic: true, align: 'center' } });
    if (t === 'credit') Object.assign(base, { p: { x: 20, y: 40, w: 350, h: 28, z: 5 }, s: { size: 11, ls: 0.2, upper: true, align: 'center', opacity: 0.7 } });
    if (t === 'card') { const C = catalog().CARDS[v] || ['', []]; Object.assign(base, { p: { x: 20, y: 40, w: 350, h: v === 'studio' || v === 'install' || v === 'review' ? 90 : 260, z: 5 }, block: v, variant: C[1][0] || undefined }); }
    if (t === 'art' && v && typeof v === 'object') { const w = 160, hh = Math.max(44, Math.min(320, Math.round(w * (v.h || 1) / (v.w || 1)))); Object.assign(base, { p: { x: (390 - w) / 2, y: 40, w, h: hh, z: 6 }, src: { k: 'art', id: v.id, o: v.occasion } }); }   // step 97: a picture from the elements library
    if (t === 'video') Object.assign(base, { p: { x: 20, y: 40, w: 350, h: 197, z: 5 }, s: { radius: 14 }, v: 'loop' });   // step 97b: a YouTube / Drive video (16:9 to start)
    if (t === 'shape') Object.assign(base, v === 'line' ? { p: { x: 95, y: 40, w: 200, h: 2, z: 5 }, s: { bg: '#a07d4c' } } : v === 'circle' ? { p: { x: 145, y: 40, w: 100, h: 100, z: 5 }, s: { bg: '#a07d4c', shape: 'circle', opacity: 0.3 } } : { p: { x: 45, y: 40, w: 300, h: 200, z: 1 }, s: { bg: '#ffffff', radius: 16, shadow: 1 } });
    return base;
  }

  // ---- a card layout (Minimal, or "Our own Hub") becomes a free layout: every card keeps its place on the phone and on the laptop ----
  const hex = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c || ''); return m && (m[4] == null || +m[4] > 0.5) ? '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('') : ''; };   // see-through colours don't count
  function fromGrid(l) {
    const sec = { id: uid('s'), h: { p: 844, l: 760 }, els: [] }, doc = { v: 1, name: l.name || 'My layout', colors: {}, fonts: {}, sections: [sec] }, made = new Map();
    [['p', 'phone', PGCanvas.PW], ['l', 'wide', PGCanvas.LW]].forEach(([m, scr, W]) => {
      const box = h('div', 'pgl-grid'); box.style.cssText = 'position:absolute;left:-30000px;top:0;width:' + W + 'px;max-width:none'; document.body.appendChild(box);
      try {
        const out = PGLayout.build(box, l, scr, W, true) || [], br = box.getBoundingClientRect(); let bottom = 0;
        out.forEach(o => { const r = o.el.getBoundingClientRect(); if (!r.width) return;
          let e = made.get(o.b0); if (!e) { e = { id: uid('e'), t: 'card', block: o.b0.block, p: { x: 0, y: 0, w: 40, h: 40, z: 1, hide: true } }; if (o.b0.variant) e.variant = o.b0.variant; if (o.b0.set) e.set = clone(o.b0.set); made.set(o.b0, e); }
          e[m] = { x: r1(r.left - br.left), y: r1(r.top - br.top), w: r1(r.width), h: r1(r.height), z: 1 }; bottom = Math.max(bottom, r.top - br.top + r.height); });
        sec.h[m] = Math.ceil(bottom + (m === 'p' ? 110 : 80));
      } finally { box.remove(); }
    });
    made.forEach(e => { if (!e.l) e.l = { x: 0, y: 0, w: 40, h: 40, z: 1, hide: true }; sec.els.push(e); });
    const bg = [document.getElementById('view-hub'), document.body, document.documentElement].reduce((v, n) => v || (n ? hex(getComputedStyle(n).backgroundColor) : ''), '');   // the page colour guests see behind the cards
    if (bg) doc.colors.bg = bg;
    return doc;
  }

  // ---- open ----
  function open(arg) {
    if (E) return;
    const role = window.PGControl ? PGControl.role() : 'guest';
    E = { role, mode: window.innerWidth >= 700 ? 'l' : 'p', sel: null, undo: [], redo: [], tab: 'add', sub: 'design', snap: 'free', src: {}, inst: null, zoom: 1, play: false,
      pages: hdrNow(), logo: undefined };   // step 99d: logo = a new logo picture (data URL), '' = remove it, undefined = unchanged   // step 78: zoom, Play, the app header's places
    build();
    const start = (doc, src) => { E.doc = doc; E.src = src; E.saved = JSON.stringify(doc); draw(); panel(); tips(); };
    if (arg && typeof arg === 'object' && arg.doc) return start(clone(arg.doc), { id: arg.id || '', mine: !!arg.mine });
    if (arg === 'current') {   // "Design your own Hub": start from the Hub the wedding has now
      const G = GALLERY, C = G.custom || {};
      if (/^cv-/.test(G.layout || '') && G.canvas && G.canvas.doc) arg = G.layout;
      else if (G.layout === 'custom' && C.blocks && C.blocks.length && !C.story) return start(fromGrid({ id: 'custom', name: 'Our own Hub', blocks: clone(C.blocks) }), {});
      else { const cl = G.layout && PGLayout.find(G.layout); if (cl && (cl.canvas || cl.editor)) arg = cl.id; else if (cl && !cl.story && (cl.blocks || []).length) arg = cl.id; else return start(starter(), {}); }
    }
    let l = arg && window.PGLayout ? PGLayout.find(arg) : null;
    if (l && l.story && l.editor) l = PGLayout.find(l.editor) || l;   // step 97: a story layout opens its editor version (Living Story → Living Story (editor))
    // step 101: one copy of each template per wedding — if this wedding already has its copy, open that copy (not the original)
    if (l && (l.canvas || (!l.story && (l.blocks || []).length)) && role !== 'demo') {
      const fresh = () => (l.canvas ? start(clone(l.canvas), { builtin: l.id, base: l.id }) : start(fromGrid(l), { builtin: l.id, base: l.id, converted: true }));
      if (GALLERY.canvas && GALLERY.canvas.base === l.id && /^cv-/.test(GALLERY.layout || '')) arg = GALLERY.layout;
      else {
        E.el.querySelector('.pce-stage').innerHTML = '<p class="pce-wait">Opening…</p>';
        return pgApi('canvasList', {}).then(r => { if (!E) return; const c = (r.layouts || []).find(x => x.base === l.id && x.scope === 'wedding' && x.galleryId === String(GALLERY.galleryId || ''));
          if (!c) return fresh(); return pgApi('canvasGet', { id: c.id }).then(g => { if (E) start(g.doc, { id: g.id, mine: true, scope: 'wedding', name: g.name, base: l.id }); }); }).catch(() => { if (E) fresh(); });
      }
    }
    else if (l && l.canvas) return start(clone(l.canvas), { builtin: l.id, base: l.id });
    else if (l && !l.story && (l.blocks || []).length) return start(fromGrid(l), { builtin: l.id, base: l.id, converted: true });   // step 77d: Minimal layouts open here too
    if (arg && /^cv-/.test(arg)) {
      if (GALLERY.canvas && GALLERY.canvas.id === arg && role === 'demo') return start(clone(GALLERY.canvas.doc), { id: arg, mine: true, demo: true });
      E.el.querySelector('.pce-stage').innerHTML = '<p class="pce-wait">Opening…</p>';
      return pgApi('canvasGet', { id: arg }).then(r => { if (E) start(r.doc, { id: r.id, mine: !!r.mine || (r.scope === 'wedding' && r.galleryId === String(GALLERY.galleryId || '')), collection: r.collection, scope: r.scope, name: r.name, base: r.base || '' }); })
        .catch(err => { showToast(err.message || 'Could not open'); close(true); });
    }
    start(starter(), {});
  }
  function setDrawer(open) {
    if (!E) return;
    E.drawerOpen = !!open;
    E.el.classList.toggle('pce-drawer-open', E.drawerOpen);
    const b = E.el.querySelector('.pce-drawer-toggle');
    b.textContent = E.drawerOpen ? '⌄' : '⌃';
    b.setAttribute('aria-expanded', String(E.drawerOpen));
    b.setAttribute('aria-label', E.drawerOpen ? 'Close tools' : 'Open tools');
    if (E.drawerOpen && E.sel) requestAnimationFrame(() => {
      if (!E || !E.drawerOpen || !E.sel) return;
      const stage = E.el.querySelector('.pce-stage');
      const node = E.el.querySelector('.pce-page .pgc-el[data-el="' + CSS.escape(E.sel) + '"]');
      if (stage && node) node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }
  function close(force) {
    if (!E) return;
    if (!force && E.doc && JSON.stringify(E.doc) !== E.saved && !window.confirm('Leave without saving your changes?')) return;
    if (E.inst) E.inst.destroy(); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize);
    E.el.remove(); E = null; document.body.classList.remove('pce-on');
    if (window.PGLayout) PGLayout.refresh();
  }

  function build() {
    if (window.PGLayout && PGLayout.stop) PGLayout.stop();
    const el = h('div', 'pce pce97'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Layout editor'); E.el = el;
    // step 97: the top bar of the approved mockup — ‹ · undo · redo · ⋯ · ▶ · Apply (the title and Save show on a laptop too)
    el.innerHTML = '<div class="pce-top"><button type="button" class="pce-x" aria-label="Back">' + IC.back + '</button>' +
      '<button type="button" class="pce-ic pce-undo" aria-label="Undo">' + IC.undo + '</button><button type="button" class="pce-ic pce-redo" aria-label="Redo">' + IC.redo + '</button>' +
      '<button type="button" class="pce-title" aria-label="Rename"><b></b><small>Tap a part to change it</small></button>' +
      '<span class="pce-gap"></span>' +
      '<div class="pce-more"><button type="button" class="pce-ic pce-more-btn" aria-label="More" aria-haspopup="true" aria-expanded="false">' + IC.more + '</button>' +
        '<div class="pce-menu" hidden><div class="pce-menu-row"><span>Screen</span><div class="pce-seg pce-mode"><button type="button" data-mode="p">Phone</button><button type="button" data-mode="l">Laptop</button></div></div>' +
        '<div class="pce-menu-row"><span>Placing</span><div class="pce-seg pce-snap"><button type="button" data-snap="simple">Simple</button><button type="button" data-snap="free">Free</button></div></div>' +
        '<div class="pce-menu-row"><span>Zoom</span><div class="pce-zrow"><button type="button" class="pce-zoom-toggle" hidden>100%</button><div class="pce-zoom-menu"><button type="button" data-z="-" aria-label="Smaller">−</button><b>100%</b><button type="button" data-z="+" aria-label="Bigger">+</button><button type="button" data-z="1">Fit</button></div></div></div>' +
        '<button type="button" class="pce-menu-item" data-menu="original">Back to original</button><button type="button" class="pce-menu-item" data-menu="rename">Rename this layout</button><button type="button" class="pce-menu-item" data-menu="save">Save as a copy / to a collection…</button></div></div>' +
      '<button type="button" class="pce-ic pce-play" aria-label="Play" aria-pressed="false">' + IC.play + '</button><button type="button" class="pce-btn pce-save">Save</button><button type="button" class="pce-btn pce-apply">Apply</button></div>' +
      '<div class="pce-body"><div class="pce-stage"></div><div class="pce-panel"><div class="pce-tabs" role="tablist">' + TABS.map(([k, n]) => '<button type="button" data-tab="' + k + '" role="tab">' + IC[k] + '<span>' + n + '</span></button>').join('') + '<button type="button" class="pce-drawer-toggle" aria-label="Open tools" aria-expanded="false">⌃</button></div><div class="pce-pane"></div></div></div>';
    el.querySelector('.pce-x').addEventListener('click', () => { close(); if (!E && window.pgBackToPanel) pgBackToPanel(); });   // clean-up #1: back to where it was opened from
    el.querySelector('.pce-undo').addEventListener('click', undo);
    el.querySelector('.pce-redo').addEventListener('click', redo);
    const rename = () => { const n = window.prompt('Name of this layout', E.doc.name || ''); if (n != null && n.trim()) change(d => { d.name = n.trim().slice(0, 60); }); };
    el.querySelector('.pce-title').addEventListener('click', rename);
    const menu = el.querySelector('.pce-menu'), moreBtn = el.querySelector('.pce-more-btn');
    const shutMenu = () => { menu.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); };
    moreBtn.addEventListener('click', ev => { ev.stopPropagation(); menu.hidden = !menu.hidden; moreBtn.setAttribute('aria-expanded', String(!menu.hidden)); });
    el.addEventListener('pointerdown', ev => { if (!menu.hidden && !ev.target.closest('.pce-more')) shutMenu(); });
    el.querySelector('.pce-mode').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) shutMenu(); if (b && b.dataset.mode !== E.mode) { E.mode = b.dataset.mode; draw(); panel(); } });
    el.querySelector('.pce-snap').addEventListener('click', e => { const b = e.target.closest('[data-snap]'); if (b) shutMenu(); if (b && b.dataset.snap !== E.snap) { E.snap = b.dataset.snap; draw(); panel(); if (E.snap === 'simple') showToast('Simple: parts snap to the grid. Set rows and columns in Pages.'); } });
    el.querySelectorAll('[data-menu]').forEach(b => b.addEventListener('click', () => { shutMenu(); if (b.dataset.menu === 'rename') rename(); else if (b.dataset.menu === 'original') backToOriginal(); else saveDialog(false); }));
    el.querySelector('.pce-drawer-toggle').addEventListener('click', () => setDrawer(!E.drawerOpen));
    el.querySelector('.pce-zoom-toggle').addEventListener('click', () => { E.zoom = 1; draw(); });
    el.querySelector('.pce-save').addEventListener('click', quickSave);   // step 99e: their own layout saves straight over itself
    el.querySelector('.pce-apply').addEventListener('click', apply);
    el.querySelector('.pce-play').addEventListener('click', () => { E.play = !E.play; if (E.play) { E.sel = null; panel(); } draw(); if (E.play) { const st = el.querySelector('.pce-stage'); st.scrollTop = 0; } });   // watch the motion; any change stops it
    el.querySelector('.pce-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { const same = E.tab === b.dataset.tab; E.tab = b.dataset.tab; setDrawer(!(same && E.drawerOpen)); panel(); } });
    document.body.appendChild(el); document.body.classList.add('pce-on');
    window.addEventListener('keydown', onKey); window.addEventListener('resize', onResize);
  }
  // step 97: three quick tips, shown once on this phone
  function tips() {
    try { if (localStorage.getItem('pce_tips_97')) return; localStorage.setItem('pce_tips_97', '1'); } catch (e) { return; }
    // a small card over the top of the page — it never blocks a tap, and goes at the first tap or after 8 seconds
    const t = h('div', 'pce-tips', '<b>Tap any part to change it</b><span>Its look, its motion, or what it shows. Add puts in photos, words and elements. ▶ plays the motion.</span>');
    const st = E.el.querySelector('.pce-body'); st.appendChild(t);
    const go = () => { t.remove(); E && E.el.removeEventListener('pointerdown', go, true); };
    E.el.addEventListener('pointerdown', go, true); setTimeout(go, 8000);
  }
  let rzT = 0; function onResize() { clearTimeout(rzT); rzT = setTimeout(() => { if (E && E.doc) draw(); }, 150); }

  // ---- history ----
  function change(fn, keepPanel) {
    E.undo.push(JSON.stringify(E.doc)); if (E.undo.length > 80) E.undo.shift(); E.redo = []; E.play = false;
    fn(E.doc); draw(); if (!keepPanel) panel();
  }
  function undo() { if (!E.undo.length) return; E.redo.push(JSON.stringify(E.doc)); E.doc = JSON.parse(E.undo.pop()); fixSel(); draw(); panel(); }
  function redo() { if (!E.redo.length) return; E.undo.push(JSON.stringify(E.doc)); E.doc = JSON.parse(E.redo.pop()); fixSel(); draw(); panel(); }
  function fixSel() { if (E.sel && !find(E.sel)) E.sel = null; }

  // ---- finding things ----
  function find(id) { for (const s of E.doc.sections) { const e = (s.els || []).find(x => x.id === id); if (e) return { s, e }; } return null; }
  const D = () => (E.mode === 'p' ? PGCanvas.PW : PGCanvas.LW);
  const kNow = () => E.pageW / D();
  function spot(e) { return PGCanvas.spotOf(e, E.mode); }
  function setSpot(e, sp) {   // the spot on this screen (laptop: becomes its own spot)
    const out = { x: r1(sp.x), y: r1(sp.y), w: r1(Math.max(4, sp.w)), h: r1(Math.max(2, sp.h)), z: num(sp.z, 1) };
    if (sp.r) out.r = r1(sp.r); if (sp.hide) out.hide = true;
    if (E.mode === 'p') e.p = out; else e.l = out;
  }
  function sectionInView() {
    const st = E.el.querySelector('.pce-stage'), secs = [...E.el.querySelectorAll('.pce-page .pgc-sec')], mid = st.getBoundingClientRect().top + st.clientHeight / 2;
    let best = 0; secs.forEach((x, i) => { const r = x.getBoundingClientRect(); if (r.top <= mid) best = i; }); return E.doc.sections[best] || E.doc.sections[0];
  }

  // ---- draw the page ----
  function draw() {
    const st = E.el.querySelector('.pce-stage'), y = st.scrollTop;
    if (E.inst) { E.inst.destroy(); E.inst = null; }
    st.innerHTML = '';
    const page = h('div', 'pce-page'); st.appendChild(page);
    E.pageW = Math.round((E.mode === 'p' ? Math.min(390, st.clientWidth) : Math.max(1, st.clientWidth - 40)) * E.zoom);   // zoom draws the page smaller or bigger (the spots stay the same)
    page.style.width = E.pageW + 'px';
    E.inst = PGCanvas.render(page, E.doc, Object.assign({}, PGLayout.storyData(), { can: null }), () => {}, { mode: E.mode, width: () => E.pageW, scroller: st, still: !E.play, editing: !E.play, onTap: () => true });
    page.insertAdjacentHTML('beforeend', '<div class="pce-hdr ' + (E.mode === 'p' ? 'p' : 'l') + '" style="--z:' + (E.pageW / (E.mode === 'p' ? 390 : 1200) * (E.mode === 'p' ? 1 : 1.6)) + '">' + (E.pages.logo === 'none' ? '' : '<i class="lg ' + E.pages.header + '">' + (E.pages.logo === 'image' && hdrLogo() ? '<img alt="" src="' + esc(hdrLogo()) + '">' : 'A&amp;R') + '</i>') + '<i class="md ' + E.pages.modeside + '">☾</i><i class="mn ' + E.pages.modeside + '">≡</i></div>');   // where the app header sits on top (Page › Header)
    const zb = E.el.querySelector('.pce-zoom-menu');
    zb.querySelector('b').textContent = Math.round(E.zoom * 100) + '%';
    E.el.querySelector('.pce-zoom-toggle').textContent = Math.round(E.zoom * 100) + '%';
    zb.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { const z = b.dataset.z; E.zoom = z === '1' ? 1 : Math.max(0.3, Math.min(1.6, Math.round((E.zoom + (z === '+' ? 0.1 : -0.1)) * 10) / 10)); draw(); });
    const pb = E.el.querySelector('.pce-play'); page.classList.toggle('pce-playing', E.play); pb.classList.toggle('on', E.play); pb.innerHTML = E.play ? IC.stop : IC.play; pb.setAttribute('aria-label', E.play ? 'Stop' : 'Play'); pb.setAttribute('aria-pressed', String(E.play));
    E.el.querySelectorAll('[data-snap]').forEach(b => b.classList.toggle('on', b.dataset.snap === E.snap));
    if (E.snap === 'simple' && !E.play) gridLines(page);
    st.scrollTop = y;
    page.querySelectorAll('.pgc-el').forEach(x => { if (x.dataset.el === E.sel) x.classList.add('pce-on-el'); });
    selBox();
    page.addEventListener('pointerdown', down);
    E.el.querySelector('.pce-title b').textContent = E.doc.name || 'My layout';
    E.el.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === E.mode));
    E.el.querySelector('.pce-undo').disabled = !E.undo.length; E.el.querySelector('.pce-redo').disabled = !E.redo.length;
    const dirty = JSON.stringify(E.doc) !== E.saved; E.el.querySelector('.pce-save').textContent = dirty || !E.src.id ? 'Save' : 'Saved';
  }
  // step 97: Simple mode — each section shows its grid (rows × columns, with a gap); parts snap to it
  function gridOf(s) { const g = s.grid || {}; return { r: Math.max(1, Math.min(24, num(g.r, 6))), c: Math.max(1, Math.min(12, num(g.c, E.mode === 'l' ? 4 : 2))), g: Math.max(0, Math.min(80, num(g.g, 16))) }; }
  function cells(s) { const G = gridOf(s), W = D(), H = PGCanvas.secH(s, E.mode), cw = (W - G.g * (G.c + 1)) / G.c, rh = (H - G.g * (G.r + 1)) / G.r; return Object.assign(G, { cw, rh }); }
  function gridLines(page) {
    const k = kNow();
    E.doc.sections.forEach(s => { const sec = page.querySelector('.pgc-sec[data-sec="' + CSS.escape(s.id) + '"]'), inn = sec && sec.querySelector('.pgc-in'); if (!inn) return;
      const G = cells(s), box = h('div', 'pce-sgrid');
      box.style.cssText = 'left:' + inn.offsetLeft + 'px;top:' + sec.offsetTop + 'px;width:' + inn.offsetWidth + 'px;height:' + (PGCanvas.secH(s, E.mode) * k) + 'px';
      let html = ''; for (let c = 0; c < G.c; c++) for (let r = 0; r < G.r; r++) html += '<i style="left:' + ((G.g + c * (G.cw + G.g)) * k) + 'px;top:' + ((G.g + r * (G.rh + G.g)) * k) + 'px;width:' + (G.cw * k) + 'px;height:' + (G.rh * k) + 'px"></i>';
      box.innerHTML = html; page.appendChild(box); });
  }
  function snapToGrid(f, sp, resizing) {   // the nearest cell edges; a resize keeps whole cells
    const G = cells(f.s), stepX = G.cw + G.g, stepY = G.rh + G.g;
    const cx = Math.max(0, Math.min(G.c - 1, Math.round((sp.x - G.g) / stepX))), cy = Math.max(0, Math.min(G.r - 1, Math.round((sp.y - G.g) / stepY)));
    if (resizing) { const nc = Math.max(1, Math.round((sp.w + G.g) / stepX)), nr = Math.max(1, Math.round((sp.h + G.g) / stepY)); sp.w = nc * stepX - G.g; sp.h = nr * stepY - G.g; }
    else { sp.x = G.g + cx * stepX; sp.y = G.g + cy * stepY; }
    return sp;
  }
  // the selection frame with its handles
  function selBox() {
    const page = E.el.querySelector('.pce-page'); if (!page) return;
    page.querySelectorAll('.pce-sel,.pce-guide').forEach(x => x.remove());
    if (!E.sel) return;
    const node = page.querySelector('.pgc-el[data-el="' + CSS.escape(E.sel) + '"]'); const f = find(E.sel);
    if (!node || !f) return;
    const sec = node.closest('.pgc-sec'), inn = node.parentElement, sp = spot(f.e), k = kNow();
    const box = h('div', 'pce-sel'); box.style.cssText = 'left:' + (inn.offsetLeft + node.offsetLeft) + 'px;top:' + (sec.offsetTop + node.offsetTop) + 'px;width:' + node.offsetWidth + 'px;height:' + node.offsetHeight + 'px;' + (sp.r ? 'rotate:' + sp.r + 'deg' : '');
    box.innerHTML = ['nw', 'ne', 'sw', 'se'].map(c => '<i class="pce-h pce-h-' + c + '" data-h="' + c + '"></i>').join('') + '<i class="pce-h pce-rot" data-h="rot"></i><i class="pce-mv" data-h="move" role="button" aria-label="Move">✥ Move</i>' + (f.e.t === 'photo' ? '<i class="pce-chg" data-h="chg" role="button" aria-label="Change photo">Change photo</i>' : '') + '<b class="pce-tag">' + esc(TYPE[f.e.t] || f.e.t) + ' · ' + Math.round(sp.w) + '×' + Math.round(sp.h) + '</b>';
    if (E.frame && E.frame === E.sel) { box.classList.add('pce-framing'); const tg = box.querySelector('.pce-tag'); if (tg) tg.textContent = 'Framing · drag the photo'; }
    page.appendChild(box); E.box = box; E.k = k;
  }

  // ---- drag, resize, rotate ----
  let drag = null;
  function down(ev) {
    if (ev.button > 0 || E.play || ev.target.closest('[contenteditable]')) return;
    const hnd = ev.target.closest('[data-h]'), node = ev.target.closest('.pgc-el');
    if (hnd && E.sel && hnd.dataset.h === 'chg') { ev.preventDefault(); return pickPhoto('el'); }   // clean-up #3: change the photo straight from the page
    if (hnd && E.sel) return start(ev, hnd.dataset.h);
    if (!node) { if (E.sel) { E.sel = null; E.frame = null; draw(); panel(); } return; }
    const id = node.dataset.el, was = id === E.sel;
    if (was && E.frame === id) return start(ev, 'frame', true);   // step 79: framing — dragging moves the photo inside its holder
    if (!was && E.frame) E.frame = null;
    if (!was) { E.sel = id; E.tab = 'style'; E.sub = 'design'; draw(); panel(); if (!E.drawerOpen) setDrawer(true); return; }   // step 97: tapping a part opens its Design (the drawer opens; the part stays in view above it)   // clean-up #2: the first tap / click only selects — nothing moves
    if (ev.pointerType === 'touch') return start(ev, 'tap', true);   // phone: touching the selected part never drags it (the page scrolls); drag ✥ Move to move it
    start(ev, 'move', was);
  }
  function start(ev, how, was) {
    const f = find(E.sel); if (!f) return;
    const page = E.el.querySelector('.pce-page'), node = page.querySelector('.pgc-el[data-el="' + CSS.escape(E.sel) + '"]');
    drag = { how, x0: ev.clientX, y0: ev.clientY, sp: Object.assign({}, spot(f.e)), f, node, moved: false, k: kNow(), sec: node.closest('.pgc-sec'), was: !!was };
    if (how === 'frame') { const s = Object.assign({}, f.e.s, E.mode === 'l' && f.e.sl ? f.e.sl : {}), img = node.querySelector('img'); drag.fr = { fx: num(s.fx, 50), fy: num(s.fy, 30), zm: Math.max(1, num(s.zm, 1)), img }; }
    if (how !== 'tap') { page.classList.add('pce-drag'); ev.preventDefault(); }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true }); window.addEventListener('pointercancel', cancel, { once: true });
  }
  function snapLines(f, sp) {   // where things line up in this section: the middle, the sides, the other elements' edges and middles
    const xs = [0, D() / 2, D()], ys = [0, PGCanvas.secH(f.s, E.mode) / 2];
    (f.s.els || []).forEach(o => { if (o.id === f.e.id) return; const s = PGCanvas.spotOf(o, E.mode); if (!s || s.hide) return; xs.push(s.x, s.x + s.w / 2, s.x + s.w); ys.push(s.y, s.y + s.h / 2, s.y + s.h); });
    return { xs, ys };
  }
  function move(ev) {
    if (!drag) return;
    const dx = (ev.clientX - drag.x0) / drag.k, dy = (ev.clientY - drag.y0) / drag.k, s0 = drag.sp, sp = Object.assign({}, s0);
    if (Math.abs(ev.clientX - drag.x0) + Math.abs(ev.clientY - drag.y0) > 6) drag.moved = true;
    if (!drag.moved || drag.how === 'tap') return;
    if (drag.how === 'frame') return frameMove(ev);
    const L = snapLines(drag.f, sp), th = SNAP / drag.k, guides = [];
    const snap = (val, list, dir) => { let best = null; list.forEach(l => { if (Math.abs(l - val) < th && (best == null || Math.abs(l - val) < Math.abs(best - val))) best = l; }); if (best != null) guides.push([dir, best]); return best; };
    if (drag.how === 'move') {
      sp.x = s0.x + dx; sp.y = s0.y + dy;
      if (E.snap === 'simple') snapToGrid(drag.f, sp, false);   // step 97
      else if (!ev.altKey) {
        const cx = [sp.x, sp.x + sp.w / 2, sp.x + sp.w], cy = [sp.y, sp.y + sp.h / 2, sp.y + sp.h];
        for (let i = 0; i < 3; i++) { const b = snap(cx[i], L.xs, 'x'); if (b != null) { sp.x = b - [0, sp.w / 2, sp.w][i]; break; } }
        for (let i = 0; i < 3; i++) { const b = snap(cy[i], L.ys, 'y'); if (b != null) { sp.y = b - [0, sp.h / 2, sp.h][i]; break; } }
      }
    } else if (drag.how === 'rot') {
      const r = drag.node.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90; if (a > 180) a -= 360;
      if (!ev.shiftKey) { [-180, -90, -45, 0, 45, 90, 180].forEach(s => { if (Math.abs(a - s) < 4) a = s; }); }
      sp.r = Math.round(a);
    } else {
      const c = drag.how, ratio = s0.w / s0.h, keep = ev.shiftKey && drag.f.e.t === 'photo';
      if (c.indexOf('e') > -1) sp.w = s0.w + dx; if (c.indexOf('w') > -1) { sp.w = s0.w - dx; sp.x = s0.x + dx; }
      if (c.indexOf('s') > -1) sp.h = s0.h + dy; if (c.indexOf('n') > -1) { sp.h = s0.h - dy; sp.y = s0.y + dy; }
      if (keep) { const nh = sp.w / ratio; if (c.indexOf('n') > -1) sp.y -= nh - sp.h; sp.h = nh; }
      sp.w = Math.max(8, sp.w); sp.h = Math.max(2, sp.h);
      if (E.snap === 'simple') snapToGrid(drag.f, sp, true);   // step 97
      else if (!ev.altKey) { const b = snap(c.indexOf('e') > -1 ? sp.x + sp.w : sp.x, L.xs, 'x'); if (b != null) { if (c.indexOf('e') > -1) sp.w = b - sp.x; else { sp.w += sp.x - b; sp.x = b; } } }
    }
    drag.now = sp;
    const k = drag.k, n = drag.node.style;   // live: move the element itself; the page is drawn again on release
    n.left = sp.x * k + 'px'; n.top = sp.y * k + 'px'; n.width = sp.w * k + 'px'; n.height = sp.h * k + 'px'; n.rotate = sp.r ? sp.r + 'deg' : '';
    const b = E.box.style, inn = drag.node.parentElement; b.left = inn.offsetLeft + sp.x * k + 'px'; b.top = drag.sec.offsetTop + sp.y * k + 'px'; b.width = sp.w * k + 'px'; b.height = sp.h * k + 'px'; b.rotate = sp.r ? sp.r + 'deg' : '';
    const tag = E.box.querySelector('.pce-tag'); if (tag) tag.textContent = (drag.how === 'rot' ? sp.r + '°' : Math.round(sp.x) + ', ' + Math.round(sp.y) + ' · ' + Math.round(sp.w) + '×' + Math.round(sp.h));
    const page = E.el.querySelector('.pce-page'); page.querySelectorAll('.pce-guide').forEach(x => x.remove());
    guides.forEach(([dir, v]) => { const g = h('i', 'pce-guide ' + dir); if (dir === 'x') { g.style.left = inn.offsetLeft + v * k + 'px'; g.style.top = drag.sec.offsetTop + 'px'; g.style.height = drag.sec.offsetHeight + 'px'; } else { g.style.top = drag.sec.offsetTop + v * k + 'px'; g.style.left = inn.offsetLeft + 'px'; g.style.width = inn.offsetWidth + 'px'; } page.appendChild(g); });
  }
  function cancel() { window.removeEventListener('pointermove', move); drag = null; if (E) draw(); }
  function up() {
    window.removeEventListener('pointermove', move);
    const page = E.el.querySelector('.pce-page'); if (page) page.classList.remove('pce-drag');
    const d = drag; drag = null; if (!d) return;
    if (!d.moved || d.how === 'tap') { if (d.moved) return; if ((d.how === 'move' || d.how === 'tap') && d.was && ['names', 'date', 'text', 'credit'].indexOf(d.f.e.t) > -1) editText(d.f.e.id); if ((d.how === 'move' || d.how === 'tap') && d.was && d.f.e.t === 'photo') frameOn(d.f.e.id); return; }   // a second tap on words: type straight on the page; on a photo: frame it
    if (d.how === 'frame') { if (d.fr.now) change(() => { const t = styleTarget(d.f.e); t.fx = d.fr.now.fx; t.fy = d.fr.now.fy; }, true); return; }
    if (!d.now) return;
    // dropped over another section: it moves into that section (both screens keep their place on the page)
    const secs = [...page.querySelectorAll('.pgc-sec')], k = d.k, cy = d.sec.offsetTop + (d.now.y + d.now.h / 2) * k;
    const to = secs.find(x => cy >= x.offsetTop && cy < x.offsetTop + x.offsetHeight), from = d.sec;
    change(doc => {
      const f = find(d.f.e.id); if (!f) return;
      setSpot(f.e, Object.assign({}, spot(f.e), d.now));
      if (to && to !== from) {
        const ts = doc.sections.find(x => x.id === to.dataset.sec), fs = f.s; if (!ts) return;
        const fi = doc.sections.indexOf(fs), ti = doc.sections.indexOf(ts);
        ['p', 'l'].forEach(m => { const top = i => doc.sections.slice(0, i).reduce((a, x) => a + PGCanvas.secH(x, m) + (+x.stay || 0), 0), sp = PGCanvas.spotOf(f.e, m);
          if (m !== E.mode && !f.e[m] && m === 'l') return;   // laptop made from the phone follows by itself
          const o = Object.assign({}, sp, { y: r1(sp.y + top(fi) - top(ti)) }); if (m === 'p') f.e.p = o; else f.e.l = o; });
        fs.els = fs.els.filter(x => x.id !== f.e.id); ts.els = ts.els || []; ts.els.push(f.e);
      }
    }, true);
    panelSpot();
  }
  // step 79: frame a photo like in Photo Edits — drag the photo inside its holder, zoom in or out, Reset
  function frameOn(id) { E.frame = id; E.tab = 'style'; draw(); panel(); }
  function frameMove(ev) {
    const d = drag, fr = d.fr, img = fr.img, r = d.node.getBoundingClientRect(); if (!img || !img.naturalWidth) return;
    const cs = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight) * fr.zm, ow = Math.max(img.naturalWidth * cs - r.width, r.width * 0.3), oh = Math.max(img.naturalHeight * cs - r.height, r.height * 0.3);
    const fx = Math.round(Math.max(0, Math.min(100, fr.fx - (ev.clientX - d.x0) / ow * 100))), fy = Math.round(Math.max(0, Math.min(100, fr.fy - (ev.clientY - d.y0) / oh * 100)));
    fr.now = { fx, fy }; img.style.objectPosition = fx + '% ' + fy + '%'; if (fr.zm > 1) img.style.transformOrigin = fx + '% ' + fy + '%';
    const tag = E.box && E.box.querySelector('.pce-tag'); if (tag) tag.textContent = 'Framing · ' + fx + '%, ' + fy + '%';
  }
  // type straight on the page (names, date, text, credit): Enter or tapping away keeps it, Esc leaves it
  function editText(id) {
    const n = E.el.querySelector('.pce-page .pgc-el[data-el="' + CSS.escape(id) + '"] .pgc-body'), f = find(id); if (!n || !f) return;
    n.setAttribute('contenteditable', 'plaintext-only'); n.classList.add('pce-typing'); if (E.box) E.box.style.display = 'none';
    n.focus(); const r = document.createRange(); r.selectNodeContents(n); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r);
    let done = false;
    const finish = keep => { if (done) return; done = true; n.removeAttribute('contenteditable'); const v = n.innerText.replace(/[<>]/g, '').trim();
      if (keep && v !== String(f.e.text || '')) change(() => { const g = find(id); if (!g) return; const orig = g.e.t === 'names' ? PGLayout.storyData().names : ''; if (v && v !== orig) g.e.text = v.slice(0, 400); else delete g.e.text; }); else draw(); };
    n.addEventListener('blur', () => finish(true), { once: true });
    n.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); finish(true); } if (ev.key === 'Escape') { ev.preventDefault(); finish(false); } });
  }
  function onKey(ev) {
    if (!E || /INPUT|TEXTAREA|SELECT/.test((ev.target || {}).tagName || '')) return;
    const mod = ev.ctrlKey || ev.metaKey;
    if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); return ev.shiftKey ? redo() : undo(); }
    if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); return redo(); }
    if (!E.sel) return;
    if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); return duplicate(); }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); return remove(); }
    const step = ev.shiftKey ? 10 : 1, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
    if (mv) { ev.preventDefault(); change(() => { const f = find(E.sel); const sp = spot(f.e); setSpot(f.e, Object.assign({}, sp, { x: sp.x + mv[0], y: sp.y + mv[1] })); }, true); panelSpot(); }
  }

  // ---- element actions ----
  function add(t, v) {
    const s = E.doc.sections.length ? sectionInView() : null; if (!s) return;
    const e = fresh(t, v), st = E.el.querySelector('.pce-stage'), secNode = E.el.querySelector('.pce-page .pgc-sec[data-sec="' + CSS.escape(s.id) + '"]');
    const k = kNow(), inViewY = secNode ? Math.max(20, (st.scrollTop + st.clientHeight * .35 - secNode.offsetTop) / k) : 40;
    e.p.y = Math.min(inViewY, PGCanvas.secH(s, 'p') - e.p.h - 10); if (e.p.y < 0) e.p.y = 10;
    if (E.mode === 'l') { const a = PGCanvas.spotOf(e, 'l'); e.l = { x: (PGCanvas.LW - a.w) / 2, y: Math.min(inViewY, PGCanvas.secH(s, 'l') - a.h - 10), w: a.w, h: a.h, z: a.z }; }
    if (t === 'photo' && v) e.src = { k: 'id', id: v };   // step 97: a photo chosen in Media
    change(() => { s.els = s.els || []; s.els.push(e); E.sel = e.id; E.tab = 'style'; E.sub = t === 'video' ? 'connect' : 'design'; });   // a new video asks for its link first
  }
  function duplicate() { const f = find(E.sel); if (!f) return; const c = clone(f.e); c.id = uid('e'); ['p', 'l'].forEach(m => { if (c[m]) { c[m].x += 12; c[m].y += 12; } }); change(() => { f.s.els.push(c); E.sel = c.id; }); }
  function remove() { const f = find(E.sel); if (!f) return; change(() => { f.s.els = f.s.els.filter(x => x.id !== f.e.id); E.sel = null; }); }
  function order(dir) {
    const f = find(E.sel); if (!f) return;
    change(() => { const all = f.s.els.map(x => num(spot(x).z, 1)), sp = spot(f.e); setSpot(f.e, Object.assign({}, sp, { z: Math.max(0, Math.min(99, dir > 0 ? Math.max.apply(null, all) + 1 : Math.min.apply(null, all) - 1)) })); });
  }
  function toggleHide(id) { const f = find(id); if (!f) return; change(() => { const sp = spot(f.e); setSpot(f.e, Object.assign({}, sp, { hide: !sp.hide })); if (E.sel === id && !sp.hide) E.sel = null; }); }

  // ---- the panel ----
  const opt = (v, n, cur) => '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(n) + '</option>';
  // step 99d: the app header's settings as saved for the wedding
  function hdrNow() { const g = GALLERY.pages || {}; return { header: g.header || 'right', modeside: g.modeside || 'right', hdrmode: g.hdrmode || 'scroll', logo: g.logo || 'mono' }; }
  const hdrLogo = () => (E.logo !== undefined ? E.logo : (GALLERY.logoUrl || GALLERY.logoRaw || ''));
  const seg = (key, cur, list) => '<div class="pce-seg sm" data-k="' + key + '">' + list.map(([v, n]) => '<button type="button" data-v="' + esc(v) + '" class="' + (String(cur) === String(v) ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
  const row = (label, inner) => '<label class="pce-row"><span>' + label + '</span>' + inner + '</label>';
  function panel() {
    if (!E || !E.doc) return;
    const pane = E.el.querySelector('.pce-pane');
    if (E.tab === 'style' && !(E.sel && find(E.sel))) E.tab = 'add';
    E.el.dataset.pane = E.tab;   // clean-up #6
    E.el.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === E.tab); b.setAttribute('aria-selected', b.dataset.tab === E.tab); });
    pane.innerHTML = E.tab === 'style' ? partPane() : E.tab === 'add' ? addPane() : E.tab === 'layers' ? layersPane() : E.tab === 'page' ? pagePane() :
      E.tab === 'collections' ? collectionsPane() : E.tab === 'theme' ? themePane() : mediaPane();
    wire(pane);
    if (E.tab === 'collections') fillCollections(pane);
  }
  const tile = (t, v, n, note) => '<button type="button" class="pce-add" data-add="' + t + '" data-v="' + (v || '') + '"><b>' + n + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</button>';
  function addPane() {
    return '<div class="pce-sub">Basics</div><div class="pce-adds">' + tile('photo', '', 'Photo', 'any wedding photo') + tile('video', '', 'Video', 'YouTube or Drive') + tile('names', '', 'Names') + tile('date', '', 'Date') + tile('text', '', 'Text', 'your own words') +
      tile('shape', 'box', 'Box') + tile('shape', 'circle', 'Circle') + tile('shape', 'line', 'Line') + '</div>' +
      '<div class="pce-sub">Elements</div>' + elementsGrid('add') +
      '<div class="pce-sub">App parts</div><div class="pce-adds">' + tile('events', 'row', 'Events', 'cards') + tile('events', 'circles', 'Events', 'circles') + tile('events', 'list', 'Events', 'list') +
      tile('strip', '', 'Photo strip', 'photos gliding by') + tile('blessings', '', 'Blessing', 'latest note') + tile('credit', '', 'Credit', 'photographed by') + '</div>' +
      '<div class="pce-sub">Buttons</div><div class="pce-adds">' + ['findme', 'reel', 'post', 'memory', 'moments', 'notes'].map(a => tile('action', a, PGCanvas.LABEL[a])).join('') + '</div>' +
      '<div class="pce-sub">App cards</div><div class="pce-adds">' + Object.keys(catalog().CARDS).filter(k => k !== 'findme').map(k => tile('card', k, catalog().CARDS[k][0], (catalog().CARDS[k][1] || []).length + ' looks')).join('') + '</div>';
  }
  // ---- the elements library (app/elements/index.json): ready-made pictures by occasion ----
  let ELS = null, elsP = null;
  function loadEls() { if (!elsP) elsP = fetch('/app/elements/index.json').then(r => r.json()).then(j => { ELS = { occ: j.occasions || {}, items: j.items || [] }; return ELS; }).catch(() => { elsP = null; ELS = { occ: {}, items: [] }; return ELS; }); return elsP; }
  function elementsGrid(where) {
    if (!ELS) { loadEls().then(() => { if (E && (E.tab === 'add' || E.tab === 'media' || (E.tab === 'style' && E.sub === 'connect'))) panel(); }); return '<p class="pce-note">Loading the elements…</p>'; }
    const occ = E.elOcc || 'all', q = (E.elQ || '').toLowerCase(), keys = Object.keys(ELS.occ);
    const list = ELS.items.filter(x => (occ === 'all' || x.occasion === occ) && (!q || (x.name + ' ' + (x.tags || []).join(' ')).toLowerCase().indexOf(q) > -1));
    return '<input type="search" class="pce-elq" placeholder="Search elements" value="' + esc(E.elQ || '') + '" aria-label="Search elements">' +
      (keys.length > 1 ? '<div class="pce-chips">' + [['all', 'All']].concat(keys.map(k => [k, ELS.occ[k]])).map(([k, n]) => '<button type="button" data-occ="' + esc(k) + '" class="' + (occ === k ? 'on' : '') + '">' + esc(n) + '</button>').join('') + '</div>' : '') +
      '<div class="pce-els" data-where="' + where + '">' + (list.length ? list.map(x => '<button type="button" data-art="' + esc(x.id) + '" title="' + esc(x.name) + '" aria-label="' + esc(x.name) + '"><img loading="lazy" alt="" src="' + esc(x.file) + '"></button>').join('') : '<p class="pce-note">No element matches.</p>') + '</div>';
  }
  // ---- the selected part: Design · Motion · Connect ----
  function partPane() {
    const f = find(E.sel), e = f.e;
    return '<div class="pce-part"><div class="pce-head"><b>' + esc(TYPE[e.t] || e.t) + (e.text ? ' · ' + esc(String(e.text).slice(0, 20)) : '') + '</b><button type="button" class="pce-mini" data-do="deselect">Done</button></div>' +
      '<div class="pce-subtabs" role="tablist">' + SUBTABS.map(([k, n]) => '<button type="button" role="tab" data-sub="' + k + '" class="' + (E.sub === k ? 'on' : '') + '" aria-selected="' + (E.sub === k) + '">' + IC[k] + '<span>' + n + '</span></button>').join('') + '</div></div>' +
      (E.sub === 'motion' ? motionPane(e) : E.sub === 'connect' ? connectPane(e) : designPane(f));
  }
  function connectPane(e) {
    const t = e.t, lap = E.mode === 'l'; let c = '';
    if (t === 'names' || t === 'date' || t === 'text' || t === 'credit') c += row(t === 'text' ? 'Words' : t === 'credit' ? 'Words before the name' : 'Words (empty = the wedding’s own)', '<textarea data-f="text" rows="2" maxlength="400" placeholder="' + (t === 'names' ? esc(PGLayout.storyData().names) : t === 'credit' ? 'Photographed by' : '') + '">' + esc(e.text || '') + '</textarea>');
    if (t === 'photo') c += row('Photo', srcSelect(e.src)) + '<button type="button" class="pce-mini" data-pick="el">Choose a photo…</button>';
    if (t === 'action') c += row('Button', '<select data-f="act">' + Object.keys(PGCanvas.LABEL).map(k => opt(k, PGCanvas.LABEL[k], e.act)).join('') + '</select>') + row('Label (empty = usual)', '<input type="text" data-f="text" maxlength="40" value="' + esc(e.text || '') + '">') + seg('v', e.v || 'pill', [['pill', 'With icon'], ['circle', 'Icon only'], ['text', 'Words only']]);
    if (t === 'events') c += seg('v', e.v || 'row', [['row', 'Cards'], ['circles', 'Circles'], ['list', 'List']]) + (e.v === 'list' ? '' : row('Cards showing at once (' + (lap ? 'laptop' : 'phone') + ')', '<input type="number" step="0.1" min="1" max="8" data-f="per" value="' + num(e.per && typeof e.per === 'object' ? e.per[E.mode] : e.per, lap ? 3.5 : 2.2) + '">'));
    if (t === 'strip') c += row('Photos from', srcSelect(e.src));
    if (t === 'card') { const C = catalog(), vs = (C.CARDS[e.block] || ['', []])[1]; c += '<p class="pce-note">' + esc(cardName(e)) + ' — the same card the card layouts use. It draws itself; choose its look here.</p>' + (vs.length ? row('Look', '<select data-f="variant">' + vs.map(v => opt(v, C.VNAME[v] || v, e.variant || vs[0])).join('') + '</select>') : ''); }
    if (t === 'blessings') c += row('Which blessing', '<select data-f="n">' + [0, 1, 2, 3, 4].map(i => opt(i, i ? 'Number ' + (i + 1) : 'The latest', num(e.n, 0))).join('') + '</select>');
    if (t === 'art') c += '<p class="pce-note">Tap another element to swap this one.</p>' + elementsGrid('swap');
    if (t === 'video') { const src = e.src || {}, link = src.k === 'yt' ? (src.sh ? 'https://youtube.com/shorts/' : 'https://youtu.be/') + src.id : src.k === 'drive' ? 'https://drive.google.com/file/d/' + src.id + '/view' : '';
      c += row('Video link', '<input type="url" data-vlink="1" inputmode="url" placeholder="Paste a YouTube, Shorts or Google Drive link" value="' + esc(link) + '">') +
        (src.k === 'drive' ? '<p class="pce-note">Google Drive: the video must be shared as “Anyone with the link”. Drive’s player always shows its play button, so guests tap to play.</p>'
          : seg('v', e.v === 'player' ? 'player' : 'loop', [['loop', 'Plays by itself'], ['player', 'Tap to play']]) + '<p class="pce-note">' + (e.v === 'player' ? 'Guests tap to play, with sound and controls.' : 'Plays by itself, muted, again and again — like a TV. It fills its box like a photo.') + '</p>'); }
    if (t === 'shape') c += '<p class="pce-note">A shape shows only its colour. Change it in Design.</p>';
    return c;
  }
  function designPane(f) {
    const e = f.e, lap = E.mode === 'l', own = lap && !!e.sl, s = Object.assign({}, e.s, lap && e.sl ? e.sl : {}), sp = spot(e), t = e.t;
    let c = '';
    if (t === 'photo') c += '<div class="pce-acts"><button type="button" data-pick="el">Change photo</button><button type="button" data-do="frame" class="' + (E.frame === e.id ? 'on' : '') + '">' + (E.frame === e.id ? 'Done framing' : 'Move & zoom') + '</button><button type="button" data-do="frameReset">Reset</button></div>' +
      '<p class="pce-note">' + (E.frame === e.id ? 'Drag the photo on the page to move it inside its frame.' : 'Move & zoom moves the photo inside its frame, like in Photo Edits.') + '</p>' + row('Zoom', '<input type="range" min="1" max="3" step="0.05" data-s="zm" value="' + num(s.zm, 1) + '"><output>' + num(s.zm, 1) + '</output>');
    if (lap) c += '<label class="pce-check"><input type="checkbox" data-f="ownstyle"' + (own ? ' checked' : '') + '> Laptop has its own look (changes below stay on laptop)</label>';
    const textual = ['names', 'date', 'text', 'credit', 'action', 'blessings', 'events'].indexOf(t) > -1;
    if (textual) {
      c += row('Font', '<select data-s="font">' + opt('', 'Layout font', '') + PGCanvas.FONTS.map(fn => opt(fn, fn, s.font || '')).join('') + '</select>');
      c += row('Size', '<input type="range" min="8" max="140" data-s="size" value="' + num(s.size, 16) + '"><output>' + num(s.size, 16) + '</output>');
      c += seg('align', s.align || 'left', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']]);
      c += '<div class="pce-toggles">' + [['italic', 'Italic'], ['upper', 'CAPITALS']].map(([k, n]) => '<button type="button" data-tog="' + k + '" class="' + (s[k] ? 'on' : '') + '">' + n + '</button>').join('') + '<select data-s="weight">' + [300, 400, 500, 600, 700].map(w => opt(w, 'Weight ' + w, num(s.weight, 400))).join('') + '</select></div>';
      c += row('Letter spacing', '<input type="range" min="-0.05" max="0.6" step="0.01" data-s="ls" value="' + num(s.ls, 0) + '"><output>' + num(s.ls, 0) + '</output>');
      c += row('Line height', '<input type="range" min="0.8" max="2.2" step="0.05" data-s="lh" value="' + num(s.lh, 1.3) + '"><output>' + num(s.lh, 1.3) + '</output>');
      c += row('Text colour', colorIn('color', s.color));
    }
    if (t !== 'card' && t !== 'art') c += row(t === 'shape' ? 'Colour' : 'Background', colorIn('bg', s.bg));
    if (t === 'photo' || t === 'shape') c += seg('shape', s.shape || '', [['', 'Square'], ['arch', 'Arch'], ['circle', 'Circle']]);
    if (t !== 'art') c += row('Corners', '<input type="range" min="0" max="200" data-s="radius" value="' + num(s.radius, 0) + '"><output>' + num(s.radius, 0) + '</output>') +
      row('Border', '<input type="range" min="0" max="16" data-s="border" value="' + num(s.border, 0) + '"><output>' + num(s.border, 0) + '</output>') + (s.border ? row('Border colour', colorIn('bcolor', s.bcolor)) : '') +
      row('Shadow', '<input type="range" min="0" max="4" data-s="shadow" value="' + num(s.shadow, 0) + '"><output>' + num(s.shadow, 0) + '</output>');
    c += row('See-through', '<input type="range" min="0.05" max="1" step="0.05" data-s="opacity" value="' + num(s.opacity, 1) + '"><output>' + num(s.opacity, 1) + '</output>');
    if (t === 'strip') c += row('Focus left ↔ right', '<input type="range" min="0" max="100" data-s="fx" value="' + num(s.fx, 50) + '"><output>' + num(s.fx, 50) + '</output>') + row('Focus top ↕ bottom', '<input type="range" min="0" max="100" data-s="fy" value="' + num(s.fy, 30) + '"><output>' + num(s.fy, 30) + '</output>');
    if (textual) c += row('Inner space', '<input type="range" min="0" max="60" data-s="pad" value="' + num(s.pad, 0) + '"><output>' + num(s.pad, 0) + '</output>');
    c += '<div class="pce-sub">Exact spot · ' + (lap ? 'laptop' : 'phone') + '</div><div class="pce-spot">' + [['x', 'X'], ['y', 'Y'], ['w', 'W'], ['h', 'H'], ['r', '°']].map(([k, n]) => '<label><small>' + n + '</small><input type="number" data-sp="' + k + '" value="' + Math.round(num(sp[k], 0)) + '"></label>').join('') + '</div>';
    c += '<div class="pce-acts"><button type="button" data-do="dup">Duplicate</button><button type="button" data-do="front">To front</button><button type="button" data-do="back">To back</button><button type="button" data-do="hide">Hide on ' + (lap ? 'laptop' : 'phone') + '</button><button type="button" data-do="del" class="danger">Delete</button></div>';
    return c;
  }
  // ---- the motion library: tap a tile, it plays on the page ----
  const MLIB = [
    ['Comes in', [['', 'None'], ['fade', 'Fade'], ['slide', 'Slide'], ['grow', 'Zoom in'], ['zoom-out', 'Zoom out'], ['blur', 'Blur'], ['wipe', 'Wipe'], ['iris', 'Iris'], ['unfold', 'Unfold'], ['shine', 'Shine'],
      ['spin', 'Spin'], ['flip', 'Flip'], ['turn', 'Turn'], ['bounce', 'Bounce'], ['glide', 'Glide'], ['arc', 'Arc'], ['reveal', 'Reveal'], ['shutters', 'Shutters']]],
    ['Keeps moving', [['zoom', 'Slow zoom'], ['float', 'Float'], ['pulse', 'Pulse'], ['swing', 'Swing'], ['wobble', 'Wobble'], ['spin-slow', 'Spin slowly'], ['breathe', 'Breathe']]],
    ['With the scroll', [['parallax', 'Depth'], ['fade-on-scroll', 'Fade in'], ['grow-on-scroll', 'Grow']]]];
  const SLIDE = { rise: 'bottom', drop: 'top', left: 'left', right: 'right' }, SLIDE_M = { bottom: 'rise', top: 'drop', left: 'left', right: 'right' };
  const family = e => { const m = e.m || ''; if (SLIDE[m]) return 'slide'; if (m === 'flip-x' || m === 'flip-y') return 'flip'; if (!m && e.mo && e.mo.p) return 'parallax'; return m; };
  function motionPane(e) {
    const fam = family(e), mo = e.mo || {}, enter = PGCanvas.ENTER.indexOf(e.m) > -1, dirs = [['bottom', 'Below'], ['top', 'Above'], ['left', 'Left'], ['right', 'Right']];
    let c = MLIB.map(([g, list]) => '<div class="pce-sub">' + g + '</div><div class="pce-mgrid">' + list.map(([v, n]) => '<button type="button" data-mt="' + v + '" class="pce-mtile' + (fam === v ? ' on' : '') + '" aria-pressed="' + (fam === v) + '"><i class="pce-mg pce-mg-' + (v || 'none') + '"></i><span>' + n + '</span></button>').join('') + '</div>').join('');
    if (fam) c += '<div class="pce-sub">Adjust</div>';
    if (fam === 'slide') c += row('Comes from', seg('mdir', SLIDE[e.m], dirs));
    if (fam === 'flip') c += row('Turns', seg('mflip', e.m, [['flip-x', 'Top to bottom'], ['flip-y', 'Side to side']]));
    if (['bounce', 'glide', 'arc'].indexOf(fam) > -1) c += row('Comes from', seg('mdir', mo.dir || (fam === 'glide' ? 'left' : 'bottom'), dirs));
    if (fam && fam !== 'parallax' && fam !== 'fade' && fam !== 'blur' && fam !== 'shine' && SCROLL(fam) === false) c += row('Strength', '<input type="range" min="10" max="100" step="5" data-mo="str" value="' + num(mo.str, 50) + '"><output>' + num(mo.str, 50) + '</output>');
    if (enter) c += row('Wait before (s)', '<input type="range" min="0" max="3" step="0.1" data-mo="d" value="' + (num(mo.d, 0) / 1000) + '"><output>' + (num(mo.d, 0) / 1000) + '</output>') + row('Speed (s)', '<input type="range" min="0.3" max="4" step="0.1" data-mo="t" value="' + (num(mo.t, 900) / 1000) + '"><output>' + (num(mo.t, 900) / 1000) + '</output>');
    if (fam === 'parallax' || fam) c += row('Scroll depth', '<input type="range" min="-0.5" max="0.5" step="0.05" data-mo="p" value="' + num(mo.p, 0) + '"><output>' + num(mo.p, 0) + '</output>') + '<p class="pce-note">Below 0 drifts slower than the page (far away), above 0 faster (close).</p>';
    return c + '<p class="pce-note">Tap a tile to see it on the page. Press ▶ to watch the whole page.' + (e.t === 'events' ? ' Event cards come in one after another.' : '') + '</p>';
  }
  const SCROLL = v => PGCanvas.SCROLLM.indexOf(v) > -1;
  function setMotion(e, v) {
    const mo = Object.assign({}, e.mo); delete mo.dir;
    if (!v) { delete e.m; delete e.mo; return; }
    if (v === 'parallax') { delete e.m; e.mo = { p: num(mo.p, 0) || 0.25 }; return; }
    e.m = v === 'slide' ? 'rise' : v === 'flip' ? 'flip-x' : v;
    if (Object.keys(mo).length) e.mo = mo; else delete e.mo;
  }
  function replay() {   // play the selected part's motion once on the page
    const page = E.el.querySelector('.pce-page'), root = page && page.querySelector('.pgc'), n = E.sel && page.querySelector('.pgc-el[data-el="' + CSS.escape(E.sel) + '"]'); if (!root || !n) return;
    clearTimeout(E.rpT); root.classList.remove('pgc-still'); n.classList.remove('in'); void n.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('in')));
    E.rpT = setTimeout(() => { if (E && !E.play && root.isConnected) root.classList.add('pgc-still'); }, 2600);
  }
  function layersPane() {
    const icon = { photo: '▣', names: 'Aa', date: '◷', text: 'T', events: '▤', strip: '⋯', action: '●', blessings: '❝', credit: '©', shape: '◆', card: '▦', art: '✿', video: '▶' };
    return '<p class="pce-note">Everything on the page, front first. ' + (E.mode === 'l' ? 'Hiding here hides on laptop only.' : 'Hiding here hides on phone only.') + '</p><div class="pce-lsec"><b>Guest actions</b><div class="pce-layer pce-global-layer"><span><i>◎</i>Find me</span><small>Floating guest action</small></div></div>' + E.doc.sections.map((s, si) =>
      '<div class="pce-lsec"><b>Section ' + (si + 1) + '</b>' + (s.els || []).slice().sort((a, b) => num(spot(b).z, 1) - num(spot(a).z, 1)).map(e => { const sp = spot(e);
        return '<div class="pce-layer' + (e.id === E.sel ? ' on' : '') + (sp.hide ? ' off' : '') + '"><button type="button" data-sel="' + e.id + '"><i>' + icon[e.t] + '</i>' + esc(TYPE[e.t]) + (e.text ? ' · ' + esc(String(e.text).slice(0, 18)) : e.act ? ' · ' + esc(PGCanvas.LABEL[e.act]) : '') + '</button><button type="button" class="pce-eye" data-eye="' + e.id + '" aria-label="' + (sp.hide ? 'Show' : 'Hide') + '">' + (sp.hide ? 'Hidden' : 'Shown') + '</button></div>'; }).join('') + '</div>').join('');
  }
  // Pages: the Hub's sections (in order) and the one you are looking at, plus the app header
  function pagePane() {
    const s = (E.sel && find(E.sel) || {}).s || sectionInView(), si = E.doc.sections.indexOf(s), bg = (s && s.bg) || {}, C = E.doc.colors || {};
    let c = '<div class="pce-sub">Sections of the Hub</div><div class="pce-secs">' + E.doc.sections.map((x, i) => '<button type="button" data-goto="' + esc(x.id) + '" class="' + (x === s ? 'on' : '') + '"><b>' + (i + 1) + '</b><span>' + (x.els || []).length + ' parts</span></button>').join('') + '<button type="button" data-secdo="add" class="pce-secadd" aria-label="Add a section">+</button></div>';
    if (s) {
      c += '<div class="pce-head"><b>Section ' + (si + 1) + ' of ' + E.doc.sections.length + '</b><span>' + (E.mode === 'l' ? 'Laptop' : 'Phone') + '</span></div>';
      c += row('Height', '<input type="range" min="80" max="2400" step="10" data-sec="h" value="' + Math.round(PGCanvas.secH(s, E.mode)) + '"><output>' + Math.round(PGCanvas.secH(s, E.mode)) + '</output>');
      c += row('Stays while scrolling', '<input type="range" min="0" max="1600" step="20" data-sec="stay" value="' + num(+s.stay, 0) + '"><output>' + num(+s.stay, 0) + '</output>') + '<p class="pce-note">The section holds still on the screen for this much scrolling, so its motion can play (0 = scrolls normally).</p>';
      if (E.snap === 'simple') { const G = gridOf(s); c += '<div class="pce-sub">Grid · Simple mode</div><div class="pce-spot">' + [['r', 'Rows', G.r, 1, 24], ['c', 'Columns', G.c, 1, 12], ['g', 'Gap', G.g, 0, 80]].map(([k, n, v, lo, hi]) => '<label><small>' + n + '</small><input type="number" data-grid="' + k + '" min="' + lo + '" max="' + hi + '" value="' + v + '"></label>').join('') + '</div>'; }
      c += row('Background colour', '<span class="pce-col"><input type="color" data-sec="bgc" value="' + esc(String(bg.c || C.bg || '#ffffff').slice(0, 7)) + '">' + (bg.c ? '<button type="button" class="pce-mini" data-sec-unset="c">None</button>' : '<em>layout colour</em>') + '</span>');
      c += row('Background photo', '<select data-sec="bgsrc">' + opt('', 'None', bg.src ? 'x' : '') + srcSelect(bg.src || { k: 'none' }).replace(/^<select data-f="src">|<\/select>$/g, '') + '</select>') + (bg.src ? '<button type="button" class="pce-mini" data-pick="bg">Choose a photo…</button>' + row('Darken photo', '<input type="range" min="0" max="0.8" step="0.05" data-sec="dim" value="' + num(bg.dim, 0) + '"><output>' + num(bg.dim, 0) + '</output>') +
        row('Photo zoom', '<input type="range" min="1" max="3" step="0.05" data-sec="bgz" value="' + num(bg.z, 1) + '"><output>' + num(bg.z, 1) + '</output>') + row('Photo left ↔ right', '<input type="range" min="0" max="100" data-sec="bgfx" value="' + num(bg.fx, 50) + '"><output>' + num(bg.fx, 50) + '</output>') + row('Photo top ↕ bottom', '<input type="range" min="0" max="100" data-sec="bgfy" value="' + num(bg.fy, 35) + '"><output>' + num(bg.fy, 35) + '</output>') : '');
      c += '<div class="pce-acts"><button type="button" data-secdo="up">Move up</button><button type="button" data-secdo="down">Move down</button><button type="button" data-secdo="dup">Duplicate</button><button type="button" data-secdo="add">Add section below</button><button type="button" data-secdo="del" class="danger">Delete section</button></div>';
    }
    c += '<div class="pce-sub">Header · the whole app</div><p class="pce-note">The app header sits on top of every page (the outline in the preview). It changes for the whole wedding when you apply.</p>' +
      row('When the page scrolls', seg('hdr-hdrmode', E.pages.hdrmode, [['scroll', 'Scrolls away'], ['fixed', 'Stays on top'], ['auto', 'Hides, comes back']])) +
      row('Logo', seg('hdr-logo', E.pages.logo, [['mono', 'Initials'], ['image', 'Our logo'], ['none', 'No logo']])) +
      (E.pages.logo === 'image' ? '<div class="pce-acts pce-logo"><span class="pce-logo-pv">' + (hdrLogo() ? '<img alt="Your logo" src="' + esc(hdrLogo()) + '">' : '<em>No logo yet</em>') + '</span><button type="button" data-do="logoUp">' + (hdrLogo() ? 'Change logo' : 'Upload logo') + '</button>' + (hdrLogo() ? '<button type="button" data-do="logoDel" class="danger">Remove</button>' : '') + '<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden data-logofile></div><p class="pce-note">A PNG or SVG with a see-through background looks best. It is made small (256 px) so it loads fast.</p>' : '') +
      (E.pages.logo === 'none' ? '' : row('Logo place', seg('hdr-header', E.pages.header, [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']]))) + row('Light / dark and menu', seg('hdr-modeside', E.pages.modeside, [['left', 'Left'], ['right', 'Right']]));
    if (E.mode === 'l') c += '<div class="pce-acts"><button type="button" data-do="lapreset">Laptop: start again from the phone</button></div>';
    return c;
  }
  // Theme: ready colour sets, the four colours, the two fonts
  const PALETTES = [['Ivory & gold', { bg: '#f7f3ec', ink: '#241f1c', acc: '#9a7b4f', acc2: '#c9a56a', card: '#ffffff' }], ['Blush', { bg: '#faf3f0', ink: '#3b2a2a', acc: '#c27c7c', acc2: '#e3b5a4', card: '#ffffff' }],
    ['Sage', { bg: '#f3f5ef', ink: '#26302a', acc: '#6f8f72', acc2: '#a9c0a0', card: '#ffffff' }], ['Night', { bg: '#121011', ink: '#f3ece2', acc: '#d4a85a', acc2: '#8a6d3b', card: '#1d1a19' }],
    ['Royal', { bg: '#1a1330', ink: '#f6efe2', acc: '#d9b26a', acc2: '#7a4fa0', card: '#241b40' }], ['Haldi', { bg: '#fff8e6', ink: '#3a2a12', acc: '#e0a100', acc2: '#f2c94c', card: '#ffffff' }]];
  function themePane() {
    const C = E.doc.colors || {}, F = E.doc.fonts || {};
    return '<div class="pce-sub">Colour sets</div><div class="pce-pals">' + PALETTES.map(([n, p], i) => '<button type="button" data-pal="' + i + '" aria-label="' + esc(n) + '"><i>' + ['bg', 'ink', 'acc', 'acc2'].map(k => '<em style="background:' + p[k] + '"></em>').join('') + '</i><span>' + esc(n) + '</span></button>').join('') + '</div>' +
      '<div class="pce-sub">Colours</div>' + [['bg', 'Page'], ['ink', 'Text'], ['acc', 'Accent'], ['card', 'Cards']].map(([k, n]) => row(n, '<input type="color" data-lc="' + k + '" value="' + esc(String(C[k] || '#000000').slice(0, 7)) + '">')).join('') +
      '<div class="pce-sub">Fonts</div>' + row('Headings', '<select data-lf="head">' + PGCanvas.FONTS.map(fn => opt(fn, fn, F.head || 'Cormorant Garamond')).join('') + '</select>') + row('Body', '<select data-lf="body">' + PGCanvas.FONTS.map(fn => opt(fn, fn, F.body || 'Jost')).join('') + '</select>');
  }
  // Collections: your saved layouts, and the ready layouts — open any of them here
  function collectionsPane() { return '<div class="pce-cols"><p class="pce-note">Loading your layouts…</p></div>'; }
  function fillCollections(pane) {
    const box = pane.querySelector('.pce-cols'), staff = E.role === 'picgrades';
    const ready = (window.PGLayout ? PGLayout.list() : []).filter(l => (l.canvas || l.editor || (!l.story && (l.blocks || []).length)) && (staff || l.group !== 'progress'));
    const card = (id, n, note) => '<button type="button" data-open="' + esc(id) + '"><b>' + esc(n) + '</b>' + (note ? '<small>' + esc(note) + '</small>' : '') + '</button>';
    const paint = mine => { if (!E || E.tab !== 'collections' || !box.isConnected) return;
      box.innerHTML = (mine.length ? '<div class="pce-sub">Your layouts</div><div class="pce-adds">' + mine.map(x => card(x.id, x.name, x.collectionName || '')).join('') + '</div>' : '') +
        '<div class="pce-sub">Ready layouts</div><div class="pce-adds">' + ready.map(l => card(l.id, l.name, l.group === 'progress' ? 'In progress' : '')).join('') + '</div><p class="pce-note">Opening another layout replaces the one on the page.</p>';
      box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openOther(b.dataset.open))); };
    if (E.role === 'demo' || E.role === 'guest') return paint([]);
    pgApi('canvasList', {}).then(r => { const cols = {}; (r.collections || []).forEach(c => { cols[c.id] = c.name; }); paint((r.layouts || []).filter(x => x.mine).map(x => Object.assign({}, x, { collectionName: cols[x.collection] || '' }))); }).catch(() => paint([]));
  }
  function openOther(id) {
    if (JSON.stringify(E.doc) !== E.saved && !window.confirm('Open another layout? Changes you have not saved are lost.')) return;
    const keep = { mode: E.mode, snap: E.snap }; close(true); open(id); if (E) { E.snap = keep.snap; if (E.mode !== keep.mode) { E.mode = keep.mode; draw(); panel(); } }
  }
  // Media: the wedding's photos and the elements library — tap to use
  function mediaPane() {
    const st = GALLERY.story || {}, groups = [];
    if ((st.cover || []).length) groups.push(['Cover photos', st.cover]);
    if ((st.wh || []).length) groups.push(['Wedding highlights', st.wh]);
    (GALLERY.events || []).forEach(e => { const ids = (e.photos || []).map(p => p.id); if (ids.length) groups.push([e.name, ids]); });
    const f = E.sel && find(E.sel), photoSel = f && f.e.t === 'photo';
    return '<p class="pce-note">' + (photoSel ? 'Tap a photo to put it in the selected photo.' : 'Tap a photo to add it to the page.') + '</p>' +
      groups.map(([n, ids]) => '<div class="pce-sub">' + esc(n) + '</div><div class="pce-mrow">' + ids.slice(0, 30).map(id => '<button type="button" data-photo="' + esc(id) + '"><img loading="lazy" alt="" src="' + pgImg(id, 200) + '"></button>').join('') + '</div>').join('') +
      '<div class="pce-sub">Elements</div>' + elementsGrid('add');
  }
  const colorIn = (k, v) => '<span class="pce-col"><input type="color" data-s="' + k + '" value="' + esc(String(v || '#000000').slice(0, 7)) + '">' + (v ? '<button type="button" class="pce-mini" data-unset="' + k + '">None</button>' : '<em>none</em>') + '</span>';
  function srcSelect(src) {
    src = src || { k: 'auto' }; const D0 = PGLayout.storyData(), o = [opt('auto', 'Automatic', src.k === 'auto' ? 'auto' : '')];
    [0, 1, 2].forEach(n => o.push(opt('cover:' + n, 'Cover photo ' + (n + 1), src.k === 'cover' && num(src.n, 0) === n ? 'cover:' + n : '')));
    [0, 1, 2, 3, 4, 5].forEach(n => o.push(opt('hl:' + n, 'Highlight ' + (n + 1), src.k === 'hl' && num(src.n, 0) === n ? 'hl:' + n : '')));
    (D0.events || []).forEach((e, i) => o.push(opt('ev:' + i, 'Event: ' + e.name, src.k === 'ev' && num(src.i, 0) === i ? 'ev:' + i : '')));
    if (src.k === 'id') o.push(opt('id', 'The photo you chose', 'id'));
    return '<select data-f="src">' + o.join('') + '</select>';
  }
  function panelSpot() { if (E && E.tab === 'style') { const f = find(E.sel); if (!f) return; const sp = spot(f.e); E.el.querySelectorAll('[data-sp]').forEach(i => { i.value = Math.round(num(sp[i.dataset.sp], 0)); }); } }

  // what the panel's controls change
  function styleTarget(e) { if (E.mode === 'l' && e.sl) return e.sl; return (e.s = e.s || {}); }
  function wire(pane) {
    const on = (sel, evn, fn) => pane.querySelectorAll(sel).forEach(x => x.addEventListener(evn, fn));
    on('[data-add]', 'click', ev => add(ev.currentTarget.dataset.add, ev.currentTarget.dataset.v));
    // step 97: the part's three tabs, the motion library, the elements, the wedding's photos, sections, grid, colour sets
    on('[data-sub]', 'click', ev => { E.sub = ev.currentTarget.dataset.sub; panel(); });
    on('[data-vlink]', 'change', ev => { const g = find(E.sel); if (!g) return; const v = PGCanvas.videoFromLink(ev.currentTarget.value);   // step 97b
      if (!v) { if (ev.currentTarget.value.trim()) showToast('That link isn’t a YouTube or Google Drive video'); return; }
      change(() => { g.e.src = v; const sp = spot(g.e); if (v.sh && sp.w > sp.h) setSpot(g.e, Object.assign({}, sp, { h: Math.round(sp.w * 16 / 9) })); });   // a Short stands up
      showToast(v.k === 'drive' ? 'Drive video added' : v.sh ? 'Short added' : 'YouTube video added'); });
    on('[data-mt]', 'click', ev => { const v = ev.currentTarget.dataset.mt, g = find(E.sel); if (!g) return; change(() => setMotion(g.e, v)); replay(); });
    on('.pce-elq', 'input', ev => { const x = ev.currentTarget, at = x.selectionStart; E.elQ = x.value; panel(); const n = E.el.querySelector('.pce-elq'); if (n) { n.focus(); try { n.setSelectionRange(at, at); } catch (er) {} } });
    on('[data-occ]', 'click', ev => { E.elOcc = ev.currentTarget.dataset.occ; panel(); });
    on('[data-art]', 'click', ev => { const it = (ELS && ELS.items || []).find(x => x.id === ev.currentTarget.dataset.art); if (!it) return;
      if (ev.currentTarget.closest('.pce-els').dataset.where === 'swap') { const g = find(E.sel); if (g) change(() => { g.e.src = { k: 'art', id: it.id, o: it.occasion }; }); } else add('art', it); });
    on('[data-photo]', 'click', ev => { const id = ev.currentTarget.dataset.photo, g = E.sel && find(E.sel);
      if (g && g.e.t === 'photo') change(() => { g.e.src = { k: 'id', id }; delete styleTarget(g.e).fx; delete styleTarget(g.e).fy; }); else add('photo', id); });
    on('[data-goto]', 'click', ev => { const n = E.el.querySelector('.pce-page .pgc-sec[data-sec="' + CSS.escape(ev.currentTarget.dataset.goto) + '"]'); E.sel = null; if (n) n.scrollIntoView({ block: 'start', behavior: 'smooth' }); setTimeout(() => { if (E) { draw(); panel(); } }, 350); });
    on('[data-grid]', 'change', ev => { const x = ev.currentTarget, sec = (E.sel && find(E.sel) || {}).s || sectionInView(); change(() => { const G = gridOf(sec); G[x.dataset.grid] = Math.max(+x.min, Math.min(+x.max, Math.round(+x.value) || 0)); sec.grid = { r: G.r, c: G.c, g: G.g }; }); });
    on('[data-pal]', 'click', ev => { const pal = PALETTES[+ev.currentTarget.dataset.pal]; if (pal) change(doc => { doc.colors = Object.assign({}, doc.colors, pal[1]); }); });
    on('[data-sel]', 'click', ev => { E.sel = ev.currentTarget.dataset.sel; draw(); panel(); const n = E.el.querySelector('.pce-page .pgc-el[data-el="' + CSS.escape(E.sel) + '"]'); if (n) n.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    on('[data-eye]', 'click', ev => toggleHide(ev.currentTarget.dataset.eye));
    const f = E.sel && find(E.sel), e = f && f.e;
    // style: live while sliding, one undo step per change
    pane.querySelectorAll('[data-s]').forEach(x => {
      const live = () => { const t = styleTarget(e), k = x.dataset.s; let v = x.type === 'range' || x.type === 'number' ? parseFloat(x.value) : x.value; if (x.tagName === 'SELECT' && k === 'weight') v = +v;
        if (v === '' || (k === 'font' && !v)) delete t[k]; else t[k] = v; const o = x.nextElementSibling; if (o && o.tagName === 'OUTPUT') o.textContent = x.value; draw(); };
      if (x.type === 'range' || x.type === 'color') { x.addEventListener('pointerdown', () => { E.undo.push(JSON.stringify(E.doc)); E.redo = []; }, { once: false }); x.addEventListener('input', live); x.addEventListener('change', () => { live(); panel(); }); }
      else x.addEventListener('change', () => change(() => { const t = styleTarget(e), k = x.dataset.s; const v = x.dataset.s === 'weight' ? +x.value : x.value; if (!v) delete t[k]; else t[k] = v; }));
    });
    on('[data-unset]', 'click', ev => change(() => { delete styleTarget(e)[ev.currentTarget.dataset.unset]; }));
    on('[data-tog]', 'click', ev => change(() => { const t = styleTarget(e), k = ev.currentTarget.dataset.tog; if (t[k]) delete t[k]; else t[k] = true; }));
    on('[data-k] button', 'click', ev => { const k = ev.currentTarget.closest('[data-k]').dataset.k, v = ev.currentTarget.dataset.v;
      if (k.indexOf('hdr-') === 0) { E.pages[k.slice(4)] = v; draw(); panel(); return; }   // the header: kept with the editor, saved on Apply
      if (k === 'mdir' || k === 'mflip') { change(() => { if (k === 'mflip') e.m = v; else if (SLIDE[e.m]) e.m = SLIDE_M[v]; else e.mo = Object.assign({}, e.mo, { dir: v }); }); replay(); return; }   // step 97: where a motion comes from
      change(() => { if (k === 'align' || k === 'shape') { const t = styleTarget(e); if (v) t[k] = v; else delete t[k]; } else if (k === 'm') { if (v === 'none') delete e.m; else e.m = v; } else e[k] = v; }); });
    on('[data-f]', 'change', ev => { const x = ev.currentTarget, k = x.dataset.f;
      if (k === 'ownstyle') return change(() => { if (x.checked) e.sl = {}; else delete e.sl; });
      change(() => {
        if (k === 'text') { const v = x.value.replace(/[<>]/g, ''); if (v.trim()) e.text = v; else delete e.text; }
        else if (k === 'act') e.act = x.value;
        else if (k === 'variant') e.variant = x.value;
        else if (k === 'm') { if (x.value) e.m = x.value; else delete e.m; }
        else if (k === 'n') e.n = +x.value;
        else if (k === 'per') { const p = e.per && typeof e.per === 'object' ? e.per : { p: num(e.per, 2.2), l: num(e.per, 3.5) }; p[E.mode] = Math.max(1, Math.min(8, parseFloat(x.value) || 2)); e.per = p; }
        else if (k === 'src') e.src = srcOf(x.value);
      });
    });
    on('[data-mo]', 'input', ev => { const o = ev.currentTarget.nextElementSibling; if (o) o.textContent = ev.currentTarget.value; });
    on('[data-mo]', 'change', ev => { const x = ev.currentTarget, k = x.dataset.mo; change(() => { const mo = Object.assign({}, e.mo); const v = parseFloat(x.value) || 0;
      if (k === 'p') { if (v) mo.p = v; else delete mo.p; } else if (k === 'str') mo.str = Math.round(v); else mo[k] = Math.round(v * 1000); if (k === 'd' && !mo.d) delete mo.d; if (Object.keys(mo).length) e.mo = mo; else delete e.mo; }); if (k !== 'p') replay(); });
    on('[data-sp]', 'change', ev => { const x = ev.currentTarget; change(() => { const sp = Object.assign({}, spot(e)); sp[x.dataset.sp] = parseFloat(x.value) || 0; setSpot(e, sp); }, true); });
    on('[data-logofile]', 'change', ev => { const f = ev.currentTarget.files && ev.currentTarget.files[0]; if (!f || !window.PGHeader) return;
      PGHeader.shrink(f).then(u => { E.logo = u; draw(); panel(); }).catch(err => showToast(err.message || 'Could not use that picture')); });
    on('[data-do]', 'click', ev => { const d = ev.currentTarget.dataset.do;
      if (d === 'deselect') { E.sel = null; E.frame = null; E.tab = 'add'; draw(); panel(); return; }
      if (d === 'logoUp') { const f = E.el.querySelector('[data-logofile]'); if (f) f.click(); return; }   // step 99d: the couple's own logo
      if (d === 'logoDel') { E.logo = ''; draw(); panel(); return; }
      if (d === 'dup') duplicate(); if (d === 'del') remove(); if (d === 'front') order(1); if (d === 'back') order(-1); if (d === 'hide') toggleHide(E.sel);
      if (d === 'rename') E.el.querySelector('.pce-title').click();
      if (d === 'frame') { E.frame = E.frame === E.sel ? null : E.sel; draw(); panel(); }
      if (d === 'frameReset') { const f = find(E.sel); if (f) change(() => { const t = styleTarget(f.e); delete t.fx; delete t.fy; delete t.zm; }); }
      if (d === 'lapreset' && window.confirm('Put every element back where the phone has it (bigger, in the middle)?')) change(doc => doc.sections.forEach(s => { delete (s.h || {}).l; (s.els || []).forEach(x => { delete x.l; delete x.sl; }); }));
    });
    on('[data-pick]', 'click', ev => pickPhoto(ev.currentTarget.dataset.pick));
    // section
    const s = (E.sel && find(E.sel) || {}).s || sectionInView();
    on('[data-sec]', 'input', ev => { const x = ev.currentTarget; if (['h', 'dim', 'stay', 'bgz', 'bgfx', 'bgfy'].indexOf(x.dataset.sec) > -1) { const o = x.nextElementSibling; if (o) o.textContent = x.value; } });
    on('[data-sec]', 'change', ev => { const x = ev.currentTarget, k = x.dataset.sec;
      change(() => { s.h = s.h || {}; s.bg = s.bg || {};
        if (k === 'h') s.h[E.mode] = Math.max(80, Math.min(2400, +x.value));
        if (k === 'bgc') s.bg.c = x.value;
        if (k === 'dim') s.bg.dim = +x.value;
        if (k === 'bgz') { if (+x.value > 1) s.bg.z = +x.value; else delete s.bg.z; }
        if (k === 'bgfx') s.bg.fx = +x.value; if (k === 'bgfy') s.bg.fy = +x.value;
        if (k === 'stay') { if (+x.value) s.stay = +x.value; else delete s.stay; }
        if (k === 'bgsrc') { if (x.value) s.bg.src = srcOf(x.value); else delete s.bg.src; }
        if (!Object.keys(s.bg).length) delete s.bg; });
    });
    on('[data-sec-unset]', 'click', () => change(() => { if (s.bg) delete s.bg.c; }));
    on('[data-secdo]', 'click', ev => { const d = ev.currentTarget.dataset.secdo, L = E.doc.sections, i = L.indexOf(s);
      if (d === 'del' && L.length > 1 && !window.confirm('Delete this section and everything in it?')) return;
      change(() => {
        if (d === 'up' && i > 0) L.splice(i - 1, 0, L.splice(i, 1)[0]);
        if (d === 'down' && i < L.length - 1) L.splice(i + 1, 0, L.splice(i, 1)[0]);
        if (d === 'dup') { const c = clone(s); c.id = uid('s'); (c.els || []).forEach(x => { x.id = uid('e'); }); L.splice(i + 1, 0, c); }
        if (d === 'add') L.splice(i + 1, 0, { id: uid('s'), h: { p: 500, l: 520 }, els: [] });
        if (d === 'del' && L.length > 1) { L.splice(i, 1); E.sel = null; }
      });
    });
    on('[data-lc]', 'change', ev => change(doc => { doc.colors = doc.colors || {}; doc.colors[ev.currentTarget.dataset.lc] = ev.currentTarget.value; }));
    on('[data-lf]', 'change', ev => change(doc => { doc.fonts = doc.fonts || {}; doc.fonts[ev.currentTarget.dataset.lf] = ev.currentTarget.value; }));
  }
  function srcOf(v) { const [k, n] = String(v).split(':'); if (k === 'auto' || !k) return { k: 'auto' }; if (k === 'ev') return { k: 'ev', i: +n || 0, n: 0 }; if (k === 'id') { const f = E.sel && find(E.sel); return (f && f.e.src) || { k: 'auto' }; } return { k, n: +n || 0 }; }

  // choose any of the wedding's photos (an element, or a section's background)
  function pickPhoto(what) {
    const st = GALLERY.story || {}, groups = [];
    if ((st.cover || []).length) groups.push(['Cover photos', st.cover]);
    if ((st.wh || []).length) groups.push(['Wedding highlights', st.wh]);
    (GALLERY.events || []).forEach(e => { const ids = (e.photos || []).map(p => p.id); if (ids.length) groups.push([e.name, ids]); });
    const back = h('div', 'pce-back'), sh = h('div', 'pce-pick');
    sh.innerHTML = '<div class="pce-pick-top"><b>Choose a photo</b><button type="button" class="pce-x" aria-label="Close">✕</button></div><p class="pce-note">' + (GALLERY.guestPhotos === 'findme' ? 'Guests will see the photo you choose here, even before Find me.' : 'Any photo of the wedding.') + '</p><div class="pce-pick-list">' +
      groups.map(([n, ids]) => '<h6>' + esc(n) + '</h6><div class="pce-grid">' + ids.slice(0, 60).map(id => '<button type="button" data-id="' + esc(id) + '"><img loading="lazy" alt="" src="' + pgImg(id, 240) + '"></button>').join('') + '</div>').join('') + '</div>';
    const shut = () => { back.remove(); sh.remove(); };
    back.addEventListener('click', shut); sh.querySelector('.pce-x').addEventListener('click', shut);
    sh.querySelector('.pce-pick-list').addEventListener('click', ev => { const b = ev.target.closest('[data-id]'); if (!b) return; shut();
      change(() => { const src = { k: 'id', id: b.dataset.id };
        if (what === 'bg') { const s = (E.sel && find(E.sel) || {}).s || sectionInView(); s.bg = Object.assign({}, s.bg, { src }); } else { const f = find(E.sel); if (f) f.e.src = src; } }); });
    E.el.append(back, sh);
  }

  // ---- save into a collection ----
  function scopesFor(role) {
    return role === 'picgrades' ? [['me', 'Only me'], ['wedding', 'This wedding'], ['studio', 'All my weddings'], ['all', 'Every wedding (PicGrades)']] :
      role === 'photographer' ? [['me', 'Only me'], ['wedding', 'This wedding'], ['studio', 'All my weddings']] : [['me', 'Only us'], ['wedding', 'Everyone at our wedding']];
  }
  // step 99e: a layout that is already this wedding's own saves in place — no name or collection question again.
  // Only the first save of a ready layout asks (it makes the wedding's own copy). Other weddings never see it.
  function quickSave() {
    if (E.role === 'demo' || !((E.src.id && E.src.mine) || E.src.base)) return saveDialog(false);
    const btn = E.el.querySelector('.pce-save'); if (btn) btn.disabled = true;
    return saveOwn()
      .then(() => { showToast('Saved — only this wedding sees it'); }).catch(err => showToast(err.message || 'Could not save')).then(() => { if (btn) btn.disabled = false; });
  }
  // step 101: save into this wedding's one copy of the template (made the first time, updated after that)
  function saveOwn() {
    return pgApi('canvasSave', { item: { id: E.src.id && E.src.mine ? E.src.id : undefined, kind: 'layout', name: E.doc.name || 'Our Hub', collection: E.src.collection || undefined, scope: E.src.scope || 'wedding', base: E.src.base || undefined, doc: E.doc } })
      .then(res => { E.src = Object.assign({}, E.src, { id: res.id, mine: true, scope: res.scope, builtin: undefined, converted: undefined }); E.saved = JSON.stringify(E.doc); draw(); return res; });
  }
  // step 101: back to the template as it was made (their copy stays until they save or apply)
  function backToOriginal() {
    const l = E.src.base && window.PGLayout && PGLayout.find(E.src.base); if (!l) { showToast('This one has no original template'); return; }
    if (!window.confirm('Go back to the original ' + (l.name || 'template') + '? Your changes go when you save.')) return;
    change(doc => { const o = l.canvas ? clone(l.canvas) : fromGrid(l); Object.keys(doc).forEach(k => delete doc[k]); Object.assign(doc, o); });
    showToast('Back to the original — Save to keep it');
  }
  function saveDialog(thenApply) {
    if (E.role === 'demo') { demoKeep(thenApply); return Promise.resolve(); }
    const back = h('div', 'pce-back'), sh = h('div', 'pce-pick pce-savebox');
    sh.innerHTML = '<div class="pce-pick-top"><b>Save to a collection</b><button type="button" class="pce-x" aria-label="Close">✕</button></div><div class="pce-savebody"><p class="pce-note">Loading your collections…</p></div>';
    const shut = () => { back.remove(); sh.remove(); };
    back.addEventListener('click', shut); sh.querySelector('.pce-x').addEventListener('click', shut);
    E.el.append(back, sh);
    return pgApi('canvasList', {}).then(r => {
      const cols = (r.collections || []).filter(c => c.mine), mineEdit = E.src.id && E.src.mine, sc = scopesFor(E.role);
      sh.querySelector('.pce-savebody').innerHTML =
        row('Name', '<input type="text" class="pce-sname" maxlength="60" value="' + esc(E.doc.name || '') + '">') +
        row('Collection', '<select class="pce-scol">' + opt('', 'No collection', E.src.collection || '') + cols.map(c => opt(c.id, c.name, E.src.collection || '')).join('') + opt('+new', 'New collection…', '') + '</select>') +
        '<input type="text" class="pce-snewcol" maxlength="60" placeholder="New collection name" hidden>' +
        row('Who can see it', '<select class="pce-sscope">' + sc.map(([v, n]) => opt(v, n, E.src.scope || (thenApply || E.role === 'couple' ? 'wedding' : 'me'))).join('') + '</select>') +
        (mineEdit ? '<label class="pce-check"><input type="checkbox" class="pce-scopy"> Save as a new copy (keep the old one)</label>' : '') +
        '<button type="button" class="pce-btn pce-sgo">' + (thenApply ? 'Save and apply' : 'Save') + '</button>';
      const colSel = sh.querySelector('.pce-scol'), nc = sh.querySelector('.pce-snewcol');
      colSel.addEventListener('change', () => { nc.hidden = colSel.value !== '+new'; if (!nc.hidden) nc.focus(); });
      sh.querySelector('.pce-sgo').addEventListener('click', () => {
        const name = sh.querySelector('.pce-sname').value.trim() || 'My layout', scope = sh.querySelector('.pce-sscope').value, copy = sh.querySelector('.pce-scopy') && sh.querySelector('.pce-scopy').checked;
        const btn = sh.querySelector('.pce-sgo'); btn.disabled = true; btn.textContent = 'Saving…';
        const colP = colSel.value === '+new' ? (nc.value.trim() ? pgApi('canvasSave', { item: { kind: 'collection', name: nc.value.trim(), scope } }).then(c => c.id) : Promise.resolve('')) : Promise.resolve(colSel.value);
        colP.then(colId => { E.doc.name = name; return pgApi('canvasSave', { item: { id: mineEdit && !copy ? E.src.id : undefined, copy: copy || !mineEdit ? 1 : undefined, kind: 'layout', name, collection: colId || undefined, scope, doc: E.doc } }); })
          .then(res => { E.src = { id: res.id, mine: true, collection: res.collection, scope: res.scope }; E.saved = JSON.stringify(E.doc); shut(); draw(); showToast('Saved to ' + (res.collection ? 'the collection' : 'your layouts')); if (thenApply) applySaved(); })
          .catch(err => { showToast(err.message || 'Could not save'); btn.disabled = false; btn.textContent = 'Save'; });
      });
    }).catch(err => { shut(); showToast(err.message || 'Could not load your collections'); });
  }
  // demo weddings keep everything on this phone
  function demoKeep(thenApply) {
    const d = pgDemoLocal(); d.canvas = { id: 'cv-demo', name: E.doc.name || 'My layout', doc: clone(E.doc) }; if (thenApply) d.layout = 'cv-demo';
    try { localStorage.setItem(pgDemoKey(), JSON.stringify(d)); } catch (e) {}
    pgDemoMerge(GALLERY); E.src = { id: 'cv-demo', mine: true, demo: true }; E.saved = JSON.stringify(E.doc);
    if (thenApply) { GALLERY.layout = 'cv-demo'; GALLERY.canvas = d.canvas; window.pgEditorBack = null; close(true); window.scrollTo(0, 0); showToast('Applied on this phone (demo)'); } else { draw(); showToast('Saved on this phone (demo)'); }
  }

  // ---- apply ----
  function apply() {
    const dirty = JSON.stringify(E.doc) !== E.saved;
    if (E.src.builtin && !dirty) return applyId(E.src.builtin, null);
    if (E.src.id && E.src.mine && !dirty && E.role !== 'demo') return applySaved();
    if (E.role !== 'demo' && E.src.base && (dirty || !E.src.id)) return saveOwn().then(() => applySaved()).catch(err => showToast(err.message || 'Could not save'));   // step 101: their copy, no questions   // a ready layout, unchanged (a Minimal layout stays the card layout it was)
    if (E.role === 'demo') return demoKeep(true);
    if (!E.src.id || !E.src.mine || dirty) {
      if (E.src.id && E.src.mine && dirty) return pgApi('canvasSave', { item: { id: E.src.id, kind: 'layout', name: E.doc.name || 'My layout', collection: E.src.collection || undefined, scope: E.src.scope || 'wedding', doc: E.doc } }).then(() => { E.saved = JSON.stringify(E.doc); applySaved(); }).catch(err => showToast(err.message || 'Could not save'));
      return saveDialog(true);
    }
    applySaved();
  }
  function applySaved() { return applyId(E.src.id, { id: E.src.id, name: E.doc.name, doc: clone(E.doc) }); }
  function applyId(id, canvas) {
    const btn = E.el.querySelector('.pce-apply'); btn.disabled = true; btn.textContent = 'Applying…';
    const gp = GALLERY.pages || {}, body = { layout: id };
    const was = hdrNow(); if (Object.keys(E.pages).some(k => was[k] !== E.pages[k])) body.pages = JSON.stringify(E.pages);   // step 99d: the header too
    if (E.logo !== undefined) body.logo = E.logo;
    return PGControl.save(body).then(r => { if (r.pages) GALLERY.pages = r.pages; if ('logoUrl' in r) GALLERY.logoUrl = r.logoUrl; if (window.PGHeader) PGHeader.apply();
      GALLERY.layout = r.layout; if (canvas) GALLERY.canvas = canvas; if (r.custom) GALLERY.custom = r.custom;
      E.saved = JSON.stringify(E.doc); window.pgEditorBack = null; close(true); if (window.switchViewFromNav) switchViewFromNav('hub'); window.scrollTo(0, 0);
      showToast('Applied — every guest sees this Hub now');
    }).catch(err => { showToast(err.message || 'Could not apply'); btn.disabled = false; btn.textContent = 'Apply'; });
  }

  window.PGCanvasEditor = { open, close, state: () => (E ? { sub: E.sub, snap: E.snap, frame: E.frame || null, zoom: E.zoom, play: E.play, pages: Object.assign({}, E.pages), mode: E.mode, sel: E.sel, tab: E.tab, doc: E.doc && clone(E.doc), src: Object.assign({}, E.src), dirty: E.doc && JSON.stringify(E.doc) !== E.saved } : null),
    select: id => { if (E) { E.sel = id; E.tab = 'style'; E.sub = 'design'; draw(); panel(); } }, tab: k => { if (E) { E.tab = k; setDrawer(true); panel(); } }, sub: k => { if (E) { E.sub = k; panel(); } },
    mode: m => { if (E) { E.mode = m; draw(); panel(); } }, snap: v => { if (E) { E.snap = v; draw(); panel(); } } };
})();
