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
  const TABS = [['add', 'Add'], ['style', 'Style'], ['layers', 'Layers'], ['page', 'Page']];
  const TYPE = { photo: 'Photo', names: 'Names', date: 'Date', text: 'Text', events: 'Events', strip: 'Photo strip', action: 'Button', blessings: 'Blessing', credit: 'Credit', shape: 'Shape', card: 'App card' };
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
    E = { role, mode: window.innerWidth >= 700 ? 'l' : 'p', sel: null, undo: [], redo: [], tab: 'add', src: {}, inst: null, zoom: 1, play: false,
      pages: { header: (GALLERY.pages || {}).header || 'right', modeside: (GALLERY.pages || {}).modeside || 'right' } };   // step 78: zoom, Play, the app header's places
    build();
    const start = (doc, src) => { E.doc = doc; E.src = src; E.saved = JSON.stringify(doc); draw(); panel(); };
    if (arg && typeof arg === 'object' && arg.doc) return start(clone(arg.doc), { id: arg.id || '', mine: !!arg.mine });
    if (arg === 'current') {   // "Design your own Hub": start from the Hub the wedding has now
      const G = GALLERY, C = G.custom || {};
      if (/^cv-/.test(G.layout || '') && G.canvas && G.canvas.doc) arg = G.layout;
      else if (G.layout === 'custom' && C.blocks && C.blocks.length && !C.story) return start(fromGrid({ id: 'custom', name: 'Our own Hub', blocks: clone(C.blocks) }), {});
      else { const cl = G.layout && PGLayout.find(G.layout); if (cl && cl.canvas) arg = cl.id; else if (cl && !cl.story && (cl.blocks || []).length) arg = cl.id; else return start(starter(), {}); }
    }
    const l = arg && window.PGLayout ? PGLayout.find(arg) : null;
    if (l && l.canvas) return start(clone(l.canvas), { builtin: l.id });
    if (l && !l.story && (l.blocks || []).length) return start(fromGrid(l), { builtin: l.id, converted: true });   // step 77d: Minimal layouts open here too
    if (arg && /^cv-/.test(arg)) {
      if (GALLERY.canvas && GALLERY.canvas.id === arg && role === 'demo') return start(clone(GALLERY.canvas.doc), { id: arg, mine: true, demo: true });
      E.el.querySelector('.pce-stage').innerHTML = '<p class="pce-wait">Opening…</p>';
      return pgApi('canvasGet', { id: arg }).then(r => { if (E) start(r.doc, { id: r.id, mine: !!r.mine, collection: r.collection, scope: r.scope, name: r.name }); })
        .catch(err => { showToast(err.message || 'Could not open'); close(true); });
    }
    start(starter(), {});
  }
  function setDrawer(open) { if (!E) return; E.drawerOpen = !!open; E.el.classList.toggle('pce-drawer-open', E.drawerOpen); const b = E.el.querySelector('.pce-drawer-toggle'); b.textContent = E.drawerOpen ? '⌄' : '⌃'; b.setAttribute('aria-expanded', String(E.drawerOpen)); b.setAttribute('aria-label', E.drawerOpen ? 'Close tools' : 'Open tools'); }
  function close(force) {
    if (!E) return;
    if (!force && E.doc && JSON.stringify(E.doc) !== E.saved && !window.confirm('Leave without saving your changes?')) return;
    if (E.inst) E.inst.destroy(); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize);
    E.el.remove(); E = null; document.body.classList.remove('pce-on');
    if (window.PGLayout) PGLayout.refresh();
  }

  function build() {
    if (window.PGLayout && PGLayout.stop) PGLayout.stop();
    const el = h('div', 'pce'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Layout editor'); E.el = el;
    el.innerHTML = '<div class="pce-top"><button type="button" class="pce-x" aria-label="Close">‹</button>' +
      '<button type="button" class="pce-title" aria-label="Rename"><b></b><small>Tap an element, then drag it</small></button>' +
      '<button type="button" class="pce-ic pce-undo" aria-label="Undo">↶</button><button type="button" class="pce-ic pce-redo" aria-label="Redo">↷</button>' +
      '<div class="pce-zoom"><button type="button" class="pce-zoom-toggle" aria-label="Zoom">100%</button><div class="pce-zoom-menu" hidden><button type="button" data-z="-">−</button><b>100%</b><button type="button" data-z="+">+</button><button type="button" data-z="1">Fit</button></div></div>' +
      '<button type="button" class="pce-btn pce-play" aria-label="Play" aria-pressed="false">▶</button><button type="button" class="pce-btn pce-save">Save</button><button type="button" class="pce-btn pce-apply">Apply</button></div>' +
      '<div class="pce-body"><div class="pce-stage"></div><div class="pce-panel"><div class="pce-panel-tools"><div class="pce-seg pce-mode"><button type="button" data-mode="p">Phone</button><button type="button" data-mode="l">Laptop</button></div></div><div class="pce-tabs" role="tablist">' + TABS.map(([k, n]) => '<button type="button" data-tab="' + k + '">' + n + '</button>').join('') + '<button type="button" class="pce-drawer-toggle" aria-label="Open tools" aria-expanded="false">⌃</button></div><div class="pce-pane"></div></div></div>';
    el.querySelector('.pce-x').addEventListener('click', () => close());
    el.querySelector('.pce-undo').addEventListener('click', undo);
    el.querySelector('.pce-redo').addEventListener('click', redo);
    el.querySelector('.pce-title').addEventListener('click', () => { const n = window.prompt('Name of this layout', E.doc.name || ''); if (n != null && n.trim()) change(d => { d.name = n.trim().slice(0, 60); }); });
    el.querySelector('.pce-mode').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b && b.dataset.mode !== E.mode) { E.mode = b.dataset.mode; draw(); panel(); } });
    el.querySelector('.pce-drawer-toggle').addEventListener('click', () => setDrawer(!E.drawerOpen));
    el.querySelector('.pce-zoom-toggle').addEventListener('click', () => { E.zoomOpen = !E.zoomOpen; el.querySelector('.pce-zoom-menu').hidden = !E.zoomOpen; });
    el.querySelector('.pce-save').addEventListener('click', () => saveDialog(false));
    el.querySelector('.pce-apply').addEventListener('click', apply);
    el.querySelector('.pce-play').addEventListener('click', () => { E.play = !E.play; if (E.play) { E.sel = null; panel(); } draw(); if (E.play) { const st = el.querySelector('.pce-stage'); st.scrollTop = 0; } });   // watch the motion; any change stops it

    el.querySelector('.pce-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { const same = E.tab === b.dataset.tab; E.tab = b.dataset.tab; setDrawer(!(same && E.drawerOpen)); panel(); } });
    document.body.appendChild(el); document.body.classList.add('pce-on');
    window.addEventListener('keydown', onKey); window.addEventListener('resize', onResize);
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
    page.insertAdjacentHTML('beforeend', '<div class="pce-hdr ' + (E.mode === 'p' ? 'p' : 'l') + '" style="--z:' + (E.pageW / (E.mode === 'p' ? 390 : 1200) * (E.mode === 'p' ? 1 : 1.6)) + '"><i class="lg ' + E.pages.header + '">A&amp;R</i><i class="md ' + E.pages.modeside + '">☾</i><i class="mn ' + E.pages.modeside + '">≡</i></div>');   // where the app header sits on top (Page › Header)
    const zb = E.el.querySelector('.pce-zoom-menu');
    zb.querySelector('b').textContent = Math.round(E.zoom * 100) + '%';
    E.el.querySelector('.pce-zoom-toggle').textContent = Math.round(E.zoom * 100) + '%';
    zb.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { const z = b.dataset.z; E.zoom = z === '1' ? 1 : Math.max(0.3, Math.min(1.6, Math.round((E.zoom + (z === '+' ? 0.1 : -0.1)) * 10) / 10)); zb.hidden = true; E.zoomOpen = false; draw(); });
    page.classList.toggle('pce-playing', E.play); E.el.querySelector('.pce-play').classList.toggle('on', E.play); E.el.querySelector('.pce-play').textContent = E.play ? '■' : '▶'; E.el.querySelector('.pce-play').setAttribute('aria-label', E.play ? 'Stop' : 'Play');
    st.scrollTop = y;
    page.querySelectorAll('.pgc-el').forEach(x => { if (x.dataset.el === E.sel) x.classList.add('pce-on-el'); });
    selBox();
    page.addEventListener('pointerdown', down);
    E.el.querySelector('.pce-title b').textContent = E.doc.name || 'My layout';
    E.el.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === E.mode));
    E.el.querySelector('.pce-undo').disabled = !E.undo.length; E.el.querySelector('.pce-redo').disabled = !E.redo.length;
    const dirty = JSON.stringify(E.doc) !== E.saved; E.el.querySelector('.pce-save').textContent = dirty || !E.src.id ? 'Save' : 'Saved';
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
    box.innerHTML = ['nw', 'ne', 'sw', 'se'].map(c => '<i class="pce-h pce-h-' + c + '" data-h="' + c + '"></i>').join('') + '<i class="pce-h pce-rot" data-h="rot"></i><b class="pce-tag">' + esc(TYPE[f.e.t] || f.e.t) + ' · ' + Math.round(sp.w) + '×' + Math.round(sp.h) + '</b>';
    if (E.frame && E.frame === E.sel) { box.classList.add('pce-framing'); const tg = box.querySelector('.pce-tag'); if (tg) tg.textContent = 'Framing · drag the photo'; }
    page.appendChild(box); E.box = box; E.k = k;
  }

  // ---- drag, resize, rotate ----
  let drag = null;
  function down(ev) {
    if (ev.button > 0 || E.play || ev.target.closest('[contenteditable]')) return;
    const hnd = ev.target.closest('[data-h]'), node = ev.target.closest('.pgc-el');
    if (hnd && E.sel) return start(ev, hnd.dataset.h);
    if (!node) { if (E.sel) { E.sel = null; E.frame = null; draw(); panel(); } return; }
    const id = node.dataset.el, was = id === E.sel;
    if (was && E.frame === id) return start(ev, 'frame', true);   // step 79: framing — dragging moves the photo inside its holder
    if (!was && E.frame) E.frame = null;
    if (!was) { E.sel = id; E.tab = E.tab === 'add' ? 'style' : E.tab; draw(); panel(); }
    if (!was && ev.pointerType === 'touch') return;   // touch: the first tap selects (so the page still scrolls), the next touch drags
    start(ev, 'move', was);
  }
  function start(ev, how, was) {
    const f = find(E.sel); if (!f) return;
    const page = E.el.querySelector('.pce-page'), node = page.querySelector('.pgc-el[data-el="' + CSS.escape(E.sel) + '"]');
    drag = { how, x0: ev.clientX, y0: ev.clientY, sp: Object.assign({}, spot(f.e)), f, node, moved: false, k: kNow(), sec: node.closest('.pgc-sec'), was: !!was };
    if (how === 'frame') { const s = Object.assign({}, f.e.s, E.mode === 'l' && f.e.sl ? f.e.sl : {}), img = node.querySelector('img'); drag.fr = { fx: num(s.fx, 50), fy: num(s.fy, 30), zm: Math.max(1, num(s.zm, 1)), img }; }
    page.classList.add('pce-drag');
    ev.preventDefault();
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
    if (Math.abs(ev.clientX - drag.x0) + Math.abs(ev.clientY - drag.y0) > 3) drag.moved = true;
    if (!drag.moved) return;
    if (drag.how === 'frame') return frameMove(ev);
    const L = snapLines(drag.f, sp), th = SNAP / drag.k, guides = [];
    const snap = (val, list, dir) => { let best = null; list.forEach(l => { if (Math.abs(l - val) < th && (best == null || Math.abs(l - val) < Math.abs(best - val))) best = l; }); if (best != null) guides.push([dir, best]); return best; };
    if (drag.how === 'move') {
      sp.x = s0.x + dx; sp.y = s0.y + dy;
      if (!ev.altKey) {
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
      if (!ev.altKey) { const b = snap(c.indexOf('e') > -1 ? sp.x + sp.w : sp.x, L.xs, 'x'); if (b != null) { if (c.indexOf('e') > -1) sp.w = b - sp.x; else { sp.w += sp.x - b; sp.x = b; } } }
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
    if (!d.moved) { if (d.how === 'move' && d.was && ['names', 'date', 'text', 'credit'].indexOf(d.f.e.t) > -1) editText(d.f.e.id); if (d.how === 'move' && d.was && d.f.e.t === 'photo') frameOn(d.f.e.id); return; }   // a second tap on words: type straight on the page; on a photo: frame it
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
    change(() => { s.els = s.els || []; s.els.push(e); E.sel = e.id; E.tab = 'style'; });
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
  const seg = (key, cur, list) => '<div class="pce-seg sm" data-k="' + key + '">' + list.map(([v, n]) => '<button type="button" data-v="' + esc(v) + '" class="' + (String(cur) === String(v) ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
  const row = (label, inner) => '<label class="pce-row"><span>' + label + '</span>' + inner + '</label>';
  function panel() {
    if (!E || !E.doc) return;
    const pane = E.el.querySelector('.pce-pane');
    E.el.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === E.tab); b.setAttribute('aria-selected', b.dataset.tab === E.tab); });
    pane.innerHTML = E.tab === 'add' ? addPane() : E.tab === 'style' ? stylePane() : E.tab === 'layers' ? layersPane() : pagePane();
    wire(pane);
  }
  function addPane() {
    const b = (t, v, n, note) => '<button type="button" class="pce-add" data-add="' + t + '" data-v="' + (v || '') + '"><b>' + n + '</b><small>' + note + '</small></button>';
    return '<p class="pce-note">Adds to the section you are looking at. Then drag it where you want.</p><div class="pce-adds">' +
      b('photo', '', 'Photo', 'cover, highlight, event or any photo') + b('names', '', 'Names', 'the couple’s names') + b('date', '', 'Date', 'date and place') + b('text', '', 'Text', 'your own words') +
      b('events', 'row', 'Events · cards', 'every event, swipe') + b('events', 'circles', 'Events · circles', 'round event photos') + b('events', 'list', 'Events · list', 'names only') +
      b('strip', '', 'Photo strip', 'photos gliding by') + b('blessings', '', 'Blessing', 'the latest note from guests') + b('credit', '', 'Credit', 'photographed by…') +
      b('action', 'findme', 'Find me', 'button') + b('action', 'reel', 'Make a reel', 'button') + b('action', 'post', 'Make a post', 'button') + b('action', 'memory', 'Add a moment', 'button') + b('action', 'moments', 'Root Moment', 'button') + b('action', 'notes', 'Blessings', 'button') +
      b('shape', 'box', 'Box', 'a card behind things') + b('shape', 'circle', 'Circle', 'a soft round shape') + b('shape', 'line', 'Line', 'a thin divider') + '</div>' +
      '<div class="pce-sub">App cards · the cards of the card layouts</div><div class="pce-adds">' + Object.keys(catalog().CARDS).filter(k => k !== 'findme').map(k => b('card', k, catalog().CARDS[k][0], (catalog().CARDS[k][1] || []).length + ' looks')).join('') + '</div>';
  }
  function stylePane() {
    const f = E.sel && find(E.sel);
    if (!f) return '<p class="pce-note">Tap an element on the page to change it. Or open Add to put a new one in.</p>';
    const e = f.e, lap = E.mode === 'l', own = lap && !!e.sl, s = Object.assign({}, e.s, lap && e.sl ? e.sl : {}), sp = spot(e), t = e.t;
    let c = '<div class="pce-head"><b>' + esc(TYPE[t]) + '</b><span>' + (lap ? 'Laptop' : 'Phone') + '</span></div>';
    // what it shows
    if (t === 'names' || t === 'date' || t === 'text' || t === 'credit') c += row(t === 'text' ? 'Words' : t === 'credit' ? 'Words before the name' : 'Words (empty = the wedding’s own)', '<textarea data-f="text" rows="2" maxlength="400" placeholder="' + (t === 'names' ? esc(PGLayout.storyData().names) : t === 'credit' ? 'Photographed by' : '') + '">' + esc(e.text || '') + '</textarea>');
    if (t === 'photo') c += row('Photo', srcSelect(e.src)) + '<button type="button" class="pce-mini" data-pick="el">Choose a photo…</button>';
    if (t === 'action') c += row('Button', '<select data-f="act">' + Object.keys(PGCanvas.LABEL).map(k => opt(k, PGCanvas.LABEL[k], e.act)).join('') + '</select>') + row('Label (empty = usual)', '<input type="text" data-f="text" maxlength="40" value="' + esc(e.text || '') + '">') + seg('v', e.v || 'pill', [['pill', 'With icon'], ['circle', 'Icon only'], ['text', 'Words only']]);
    if (t === 'events') c += seg('v', e.v || 'row', [['row', 'Cards'], ['circles', 'Circles'], ['list', 'List']]) + (e.v === 'list' ? '' : row('Cards showing at once (' + (lap ? 'laptop' : 'phone') + ')', '<input type="number" step="0.1" min="1" max="8" data-f="per" value="' + num(e.per && typeof e.per === 'object' ? e.per[E.mode] : e.per, lap ? 3.5 : 2.2) + '">'));
    if (t === 'card') { const C = catalog(), vs = (C.CARDS[e.block] || ['', []])[1]; c += '<p class="pce-note">' + esc(cardName(e)) + ' — the same card the card layouts use. It draws itself; choose its look here.</p>' + (vs.length ? row('Look', '<select data-f="variant">' + vs.map(v => opt(v, C.VNAME[v] || v, e.variant || vs[0])).join('') + '</select>') : ''); }
    if (t === 'blessings') c += row('Which blessing', '<select data-f="n">' + [0, 1, 2, 3, 4].map(i => opt(i, i ? 'Number ' + (i + 1) : 'The latest', num(e.n, 0))).join('') + '</select>');
    // look
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
    if (t !== 'card') c += row(t === 'shape' ? 'Colour' : 'Background', colorIn('bg', s.bg));
    if (t === 'photo' || t === 'shape') c += seg('shape', s.shape || '', [['', 'Square'], ['arch', 'Arch'], ['circle', 'Circle']]);
    c += row('Corners', '<input type="range" min="0" max="200" data-s="radius" value="' + num(s.radius, 0) + '"><output>' + num(s.radius, 0) + '</output>');
    c += row('Border', '<input type="range" min="0" max="16" data-s="border" value="' + num(s.border, 0) + '"><output>' + num(s.border, 0) + '</output>') + (s.border ? row('Border colour', colorIn('bcolor', s.bcolor)) : '');
    c += row('Shadow', '<input type="range" min="0" max="4" data-s="shadow" value="' + num(s.shadow, 0) + '"><output>' + num(s.shadow, 0) + '</output>');
    c += row('See-through', '<input type="range" min="0.05" max="1" step="0.05" data-s="opacity" value="' + num(s.opacity, 1) + '"><output>' + num(s.opacity, 1) + '</output>');
    if (t === 'photo') c += '<div class="pce-sub">Frame the photo</div><p class="pce-note">' + (E.frame === e.id ? 'Drag the photo on the page to move it inside its frame. Zoom to go closer.' : 'Tap the photo again (or press Frame) to move it inside its frame, like in Photo Edits.') + '</p>' +
      '<div class="pce-acts"><button type="button" data-do="frame" class="' + (E.frame === e.id ? 'on' : '') + '">' + (E.frame === e.id ? 'Done framing' : 'Frame') + '</button><button type="button" data-do="frameReset">Reset</button></div>' +
      row('Zoom', '<input type="range" min="1" max="3" step="0.05" data-s="zm" value="' + num(s.zm, 1) + '"><output>' + num(s.zm, 1) + '</output>');
    if (t === 'strip') c += row('Focus left ↔ right', '<input type="range" min="0" max="100" data-s="fx" value="' + num(s.fx, 50) + '"><output>' + num(s.fx, 50) + '</output>') + row('Focus top ↕ bottom', '<input type="range" min="0" max="100" data-s="fy" value="' + num(s.fy, 30) + '"><output>' + num(s.fy, 30) + '</output>');
    if (textual) c += row('Inner space', '<input type="range" min="0" max="60" data-s="pad" value="' + num(s.pad, 0) + '"><output>' + num(s.pad, 0) + '</output>');
    const mo = e.m ? e.mo || {} : {}, MOV = [['', 'None'], ['fade', 'Fade in'], ['rise', 'Rise up'], ['drop', 'Drop down'], ['left', 'Slide from left'], ['right', 'Slide from right'], ['grow', 'Grow'], ['blur', 'Blur to sharp'], ['wipe', 'Wipe in'], ['iris', 'Iris open'], ['unfold', 'Unfold'], ['shine', 'Shine once'], ['zoom', 'Slow zoom (keeps going)'], ['float', 'Float (keeps going)']];
    c += '<div class="pce-sub">Motion</div><p class="pce-note">Plays once when it scrolls into view — or keeps going gently. Press ▶ Play to watch.' + (t === 'events' ? ' On event cards they come in one after another.' : '') + '</p>' +
      row('Motion', '<select data-f="m">' + MOV.map(([v, n]) => opt(v, n, e.m || '')).join('') + '</select>') +
      (e.m && ['zoom', 'float'].indexOf(e.m) < 0 ? row('Wait before (s)', '<input type="range" min="0" max="3" step="0.1" data-mo="d" value="' + (num(mo.d, 0) / 1000) + '"><output>' + (num(mo.d, 0) / 1000) + '</output>') + row('Speed (s)', '<input type="range" min="0.3" max="4" step="0.1" data-mo="t" value="' + (num(mo.t, 900) / 1000) + '"><output>' + (num(mo.t, 900) / 1000) + '</output>') : '') +
      row('Scroll depth', '<input type="range" min="-0.5" max="0.5" step="0.05" data-mo="p" value="' + num((e.mo || {}).p, 0) + '"><output>' + num((e.mo || {}).p, 0) + '</output>') + '<p class="pce-note">Scroll depth: below 0 drifts slower than the page (far away), above 0 faster (close).</p>';
    c += '<div class="pce-sub">Exact spot · ' + (lap ? 'laptop' : 'phone') + '</div><div class="pce-spot">' + [['x', 'X'], ['y', 'Y'], ['w', 'W'], ['h', 'H'], ['r', '°']].map(([k, n]) => '<label><small>' + n + '</small><input type="number" data-sp="' + k + '" value="' + Math.round(num(sp[k], 0)) + '"></label>').join('') + '</div>';
    c += '<div class="pce-acts"><button type="button" data-do="dup">Duplicate</button><button type="button" data-do="front">To front</button><button type="button" data-do="back">To back</button><button type="button" data-do="hide">Hide on ' + (lap ? 'laptop' : 'phone') + '</button><button type="button" data-do="del" class="danger">Delete</button></div>';
    return c;
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
  function layersPane() {
    const icon = { photo: '▣', names: 'Aa', date: '◷', text: 'T', events: '▤', strip: '⋯', action: '●', blessings: '❝', credit: '©', shape: '◆', card: '▦' };
    return '<p class="pce-note">Everything on the page, front first. ' + (E.mode === 'l' ? 'Hiding here hides on laptop only.' : 'Hiding here hides on phone only.') + '</p>' + E.doc.sections.map((s, si) =>
      '<div class="pce-lsec"><b>Section ' + (si + 1) + '</b>' + (s.els || []).slice().sort((a, b) => num(spot(b).z, 1) - num(spot(a).z, 1)).map(e => { const sp = spot(e);
        return '<div class="pce-layer' + (e.id === E.sel ? ' on' : '') + (sp.hide ? ' off' : '') + '"><button type="button" data-sel="' + e.id + '"><i>' + icon[e.t] + '</i>' + esc(TYPE[e.t]) + (e.text ? ' · ' + esc(String(e.text).slice(0, 18)) : e.act ? ' · ' + esc(PGCanvas.LABEL[e.act]) : '') + '</button><button type="button" class="pce-eye" data-eye="' + e.id + '" aria-label="' + (sp.hide ? 'Show' : 'Hide') + '">' + (sp.hide ? 'Hidden' : 'Shown') + '</button></div>'; }).join('') + '</div>').join('');
  }
  function pagePane() {
    const s = (E.sel && find(E.sel) || {}).s || sectionInView(), si = E.doc.sections.indexOf(s), bg = (s && s.bg) || {}, C = E.doc.colors || {}, F = E.doc.fonts || {};
    let c = '';
    if (s) {
      c += '<div class="pce-head"><b>Section ' + (si + 1) + ' of ' + E.doc.sections.length + '</b><span>' + (E.mode === 'l' ? 'Laptop' : 'Phone') + '</span></div>';
      c += row('Height', '<input type="range" min="80" max="2400" step="10" data-sec="h" value="' + Math.round(PGCanvas.secH(s, E.mode)) + '"><output>' + Math.round(PGCanvas.secH(s, E.mode)) + '</output>');
      c += row('Stays while scrolling', '<input type="range" min="0" max="1600" step="20" data-sec="stay" value="' + num(+s.stay, 0) + '"><output>' + num(+s.stay, 0) + '</output>') + '<p class="pce-note">The section holds still on the screen for this much scrolling, so its motion can play (0 = scrolls normally).</p>';
      c += row('Background colour', '<span class="pce-col"><input type="color" data-sec="bgc" value="' + esc(String(bg.c || C.bg || '#ffffff').slice(0, 7)) + '">' + (bg.c ? '<button type="button" class="pce-mini" data-sec-unset="c">None</button>' : '<em>layout colour</em>') + '</span>');
      c += row('Background photo', '<select data-sec="bgsrc">' + opt('', 'None', bg.src ? 'x' : '') + srcSelect(bg.src || { k: 'none' }).replace(/^<select data-f="src">|<\/select>$/g, '') + '</select>') + (bg.src ? '<button type="button" class="pce-mini" data-pick="bg">Choose a photo…</button>' + row('Darken photo', '<input type="range" min="0" max="0.8" step="0.05" data-sec="dim" value="' + num(bg.dim, 0) + '"><output>' + num(bg.dim, 0) + '</output>') +
        row('Photo zoom', '<input type="range" min="1" max="3" step="0.05" data-sec="bgz" value="' + num(bg.z, 1) + '"><output>' + num(bg.z, 1) + '</output>') + row('Photo left ↔ right', '<input type="range" min="0" max="100" data-sec="bgfx" value="' + num(bg.fx, 50) + '"><output>' + num(bg.fx, 50) + '</output>') + row('Photo top ↕ bottom', '<input type="range" min="0" max="100" data-sec="bgfy" value="' + num(bg.fy, 35) + '"><output>' + num(bg.fy, 35) + '</output>') : '');
      c += '<div class="pce-acts"><button type="button" data-secdo="up">Move up</button><button type="button" data-secdo="down">Move down</button><button type="button" data-secdo="dup">Duplicate</button><button type="button" data-secdo="add">Add section below</button><button type="button" data-secdo="del" class="danger">Delete section</button></div>';
    }
    c += '<div class="pce-sub">Header · the whole app</div><p class="pce-note">The app header sits on top of every page (the outline in the preview). It changes for the whole wedding when you apply.</p>' +
      row('Logo', seg('hdr-header', E.pages.header, [['left', 'Left'], ['right', 'Right']])) + row('Light / dark and menu', seg('hdr-modeside', E.pages.modeside, [['left', 'Left'], ['right', 'Right']]));
    c += '<div class="pce-sub">Whole layout</div>';
    c += [['bg', 'Page'], ['ink', 'Text'], ['acc', 'Accent'], ['card', 'Cards']].map(([k, n]) => row(n + ' colour', '<input type="color" data-lc="' + k + '" value="' + esc(String(C[k] || '#000000').slice(0, 7)) + '">')).join('');
    c += row('Body font', '<select data-lf="body">' + PGCanvas.FONTS.map(fn => opt(fn, fn, F.body || 'Jost')).join('') + '</select>');
    c += '<div class="pce-acts"><button type="button" data-do="rename">Rename</button>' + (E.mode === 'l' ? '<button type="button" data-do="lapreset">Laptop: start again from the phone</button>' : '') + '</div>';
    return c;
  }
  function panelSpot() { if (E && E.tab === 'style') { const f = find(E.sel); if (!f) return; const sp = spot(f.e); E.el.querySelectorAll('[data-sp]').forEach(i => { i.value = Math.round(num(sp[i.dataset.sp], 0)); }); } }

  // what the panel's controls change
  function styleTarget(e) { if (E.mode === 'l' && e.sl) return e.sl; return (e.s = e.s || {}); }
  function wire(pane) {
    const on = (sel, evn, fn) => pane.querySelectorAll(sel).forEach(x => x.addEventListener(evn, fn));
    on('[data-add]', 'click', ev => add(ev.currentTarget.dataset.add, ev.currentTarget.dataset.v));
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
      if (k === 'p') { if (v) mo.p = v; else delete mo.p; } else mo[k] = Math.round(v * 1000); if (k === 'd' && !mo.d) delete mo.d; if (Object.keys(mo).length) e.mo = mo; else delete e.mo; }); });
    on('[data-sp]', 'change', ev => { const x = ev.currentTarget; change(() => { const sp = Object.assign({}, spot(e)); sp[x.dataset.sp] = parseFloat(x.value) || 0; setSpot(e, sp); }, true); });
    on('[data-do]', 'click', ev => { const d = ev.currentTarget.dataset.do;
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
        colP.then(colId => { E.doc.name = name; return pgApi('canvasSave', { item: { id: mineEdit && !copy ? E.src.id : undefined, kind: 'layout', name, collection: colId || undefined, scope, doc: E.doc } }); })
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
    if (thenApply) { GALLERY.layout = 'cv-demo'; GALLERY.canvas = d.canvas; close(true); window.scrollTo(0, 0); showToast('Applied on this phone (demo)'); } else { draw(); showToast('Saved on this phone (demo)'); }
  }

  // ---- apply ----
  function apply() {
    const dirty = JSON.stringify(E.doc) !== E.saved;
    if (E.src.builtin && !dirty) return applyId(E.src.builtin, null);
    if (E.src.id && E.src.mine && !dirty && E.role !== 'demo') return applySaved();   // a ready layout, unchanged (a Minimal layout stays the card layout it was)
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
    if ((gp.header || 'right') !== E.pages.header || (gp.modeside || 'right') !== E.pages.modeside) body.pages = JSON.stringify(E.pages);
    return PGControl.save(body).then(r => { if (r.pages) GALLERY.pages = r.pages;
      GALLERY.layout = r.layout; if (canvas) GALLERY.canvas = canvas; if (r.custom) GALLERY.custom = r.custom;
      E.saved = JSON.stringify(E.doc); close(true); if (window.switchViewFromNav) switchViewFromNav('hub'); window.scrollTo(0, 0);
      showToast('Applied — every guest sees this Hub now');
    }).catch(err => { showToast(err.message || 'Could not apply'); btn.disabled = false; btn.textContent = 'Apply'; });
  }

  window.PGCanvasEditor = { open, close, state: () => (E ? { frame: E.frame || null, zoom: E.zoom, play: E.play, pages: Object.assign({}, E.pages), mode: E.mode, sel: E.sel, tab: E.tab, doc: E.doc && clone(E.doc), src: Object.assign({}, E.src), dirty: E.doc && JSON.stringify(E.doc) !== E.saved } : null),
    select: id => { if (E) { E.sel = id; E.tab = 'style'; draw(); panel(); } }, tab: k => { if (E) { E.tab = k; setDrawer(true); panel(); } }, mode: m => { if (E) { E.mode = m; draw(); panel(); } } };
})();
