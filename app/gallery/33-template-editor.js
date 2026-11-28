// Template editor (step 76): tap a Story or Minimal template in Control Panel › Hub layout and it opens here straight away —
// no preview page first. The template is drawn live with this wedding's photos; beside it (below it on a phone):
//   Colours · Photos · Parts · Words · More
// - Colours: the template's own colours, for light and for dark.
// - Photos: any photo of the template can be any of the wedding's photos (or tap the photo in the preview).
// - Parts: show or hide any part (the layers of the Template Studio).
// - Words: the names and the date line.  - More: motion on/off, the Find me button, start again.
// Save keeps this version for the template (nothing changes for guests). Apply makes it the wedding's Hub (and keeps the version).
// Each template remembers its own version: choose it again later and the couple's changes are still there.
// Step 103: this is "Try your photos" for EVERY template (canvas, Living Story, Editorial too, through 54-tune.js). Only the couple's
// choices are kept — never a copy of the design — so the template, its motion and its scroll stay exactly as made.
// Canvas templates also offer the Advanced editor (More); story templates have only this.
(function pgTemplateEditor() {
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const handles = k => !!(window.PGTune && PGTune.handles(k));
  const TABS = [['colours', 'Colours'], ['photos', 'Photos'], ['parts', 'Parts'], ['words', 'Words'], ['more', 'More']];
  let E = null;   // { id, l, el, tune, saved, undo, redo, inst, dark, tab }

  // the couple's saved version of this template, or the one in use, or a fresh start
  function versionOf(id, kind) {
    const v = (GALLERY.versions || {})[id] || (GALLERY.layout === 'custom' && GALLERY.custom && GALLERY.custom.base === id ? GALLERY.custom : null);
    const t = v && v.story && v.story.kind === kind ? clone(v.story) : { kind };
    t.kind = kind; return t;
  }
  const isDarkApp = () => document.documentElement.getAttribute('data-tkg-theme') === 'dark';

  function open(id) {
    const l = window.PGLayout && PGLayout.find(id); if (!l || !handles(l.story) || E) return false;
    if (PGLayout.stop) PGLayout.stop();   // the Hub's own copy of a template uses the same ids: stop it while editing
    const tune = versionOf(id, l.story);
    E = { id, l, tune, saved: JSON.stringify(tune), undo: [], redo: [], inst: null, dark: isDarkApp(), tab: 'photos', drawerOpen: false, kind: l.story };
    const el = h('div', 'pgte'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Design ' + l.name); E.el = el;
    el.innerHTML = '<div class="pgte-top"><button type="button" class="pgte-x" aria-label="Close">‹</button>' +
      '<div class="pgte-title"><b>' + esc(l.name) + '</b><small>Try your photos</small></div>' +
      '<button type="button" class="pgte-ic pgte-undo" aria-label="Undo">↶</button><button type="button" class="pgte-ic pgte-redo" aria-label="Redo">↷</button>' +
      '<button type="button" class="pgte-btn pgte-save">Save</button><button type="button" class="pgte-btn pgte-apply">Apply</button></div>' +
      '<div class="pgte-body"><div class="pgte-stage"><div class="pgte-phone"><div class="pgte-scroll"></div></div><p class="pgte-tip">Scroll the page to see it move. Tap any photo to change it.</p></div>' +
      '<div class="pgte-panel"><div class="pgte-tabs" role="tablist">' + TABS.map(([k, n]) => '<button type="button" role="tab" data-tab="' + k + '">' + n + '</button>').join('') + '<button type="button" class="pgte-drawer-toggle" aria-label="Open tools" aria-expanded="false">⌃</button></div><div class="pgte-pane"></div></div></div>';
    el.querySelector('.pgte-x').addEventListener('click', () => { close(); if (!E && window.pgBackToPanel) pgBackToPanel(); });   // clean-up #1: back to where it was opened from
    el.querySelector('.pgte-undo').addEventListener('click', () => { if (!E.undo.length) return; E.redo.push(JSON.stringify(E.tune)); E.tune = JSON.parse(E.undo.pop()); draw(); });
    el.querySelector('.pgte-redo').addEventListener('click', () => { if (!E.redo.length) return; E.undo.push(JSON.stringify(E.tune)); E.tune = JSON.parse(E.redo.pop()); draw(); });
    el.querySelector('.pgte-save').addEventListener('click', () => save(false));
    el.querySelector('.pgte-apply').addEventListener('click', () => save(true));
    el.querySelector('.pgte-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { const same = E.tab === b.dataset.tab; E.tab = b.dataset.tab; setDrawer(!(same && E.drawerOpen)); panel(); } });
    el.querySelector('.pgte-drawer-toggle').addEventListener('click', () => setDrawer(!E.drawerOpen));
    document.body.appendChild(el); document.body.classList.add('pgte-on');
    draw();
    return true;
  }
  function setDrawer(open) { if (!E) return; E.drawerOpen = !!open; E.el.classList.toggle('pgte-drawer-open', E.drawerOpen); const b = E.el.querySelector('.pgte-drawer-toggle'); b.textContent = E.drawerOpen ? '⌄' : '⌃'; b.setAttribute('aria-expanded', String(E.drawerOpen)); b.setAttribute('aria-label', E.drawerOpen ? 'Close tools' : 'Open tools'); }
  function close(force) {
    if (!E) return;
    if (!force && JSON.stringify(E.tune) !== E.saved && !window.confirm('Leave without saving your changes to ' + E.l.name + '?')) return;
    if (E.inst) E.inst.destroy(); E.el.remove(); E = null; document.body.classList.remove('pgte-on');
    if (window.PGLayout) PGLayout.refresh();
  }
  function change(fn) { E.undo.push(JSON.stringify(E.tune)); if (E.undo.length > 60) E.undo.shift(); E.redo = []; fn(E.tune); draw(); }

  // ---- the live template ----
  function draw() {
    const sc = E.el.querySelector('.pgte-scroll'), y = sc.scrollTop;
    if (E.inst) E.inst.destroy();
    sc.innerHTML = '';
    E.inst = PGTune.mount(E.kind, sc, PGLayout.storyData(), a => showToast('Guests can use this once the Hub is applied'),
      { tune: E.tune, scroller: sc, ovHost: E.el.querySelector('.pgte-phone'), dark: E.dark, pick: slot => pickPhoto(slot), pickText: k => pickText(k), doc: E.l.canvas });
    sc.scrollTop = y; E.inst.refresh();
    E.el.querySelector('.pgte-undo').disabled = !E.undo.length; E.el.querySelector('.pgte-redo').disabled = !E.redo.length;
    const dirty = JSON.stringify(E.tune) !== E.saved; E.el.querySelector('.pgte-save').textContent = dirty ? 'Save' : 'Saved'; E.el.querySelector('.pgte-save').disabled = !dirty;
    panel();
  }

  // ---- the panel ----
  const seg = (name, cur, opts) => '<div class="pgte-seg" data-set="' + name + '">' + opts.map(o => '<button type="button" data-v="' + o[0] + '" class="' + (cur === o[0] ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
  function panel() {
    const pane = E.el.querySelector('.pgte-pane'), t = E.tune;
    if (E.tab === 'colours' && !PGTune.colors(E.kind, E.dark, E.l.canvas).length) E.tab = 'photos';
    E.el.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === E.tab); b.setAttribute('aria-selected', b.dataset.tab === E.tab); if (b.dataset.tab === 'colours') b.hidden = !PGTune.colors(E.kind, E.dark, E.l.canvas).length; });
    let html = '';
    if (E.tab === 'colours') {
      const mode = E.dark ? 'dark' : 'light', own = (t.colors || {})[mode] || {};
      html = '<p class="pgte-note">The template’s own colours. Guests on dark mode see the dark set.</p>' + seg('dark', mode, [['light', 'Light'], ['dark', 'Dark']]) +
        PGTune.colors(E.kind, E.dark, E.l.canvas).map(c => '<label class="pgte-col"><span>' + esc(c.name) + '</span><input type="color" data-col="' + c.k + '" value="' + esc(String(own[c.k] || c.value).slice(0, 7)) + '">' +
          (own[c.k] ? '<button type="button" class="pgte-mini" data-uncol="' + c.k + '">Reset</button>' : '<em>original</em>') + '</label>').join('');
    } else if (E.tab === 'photos') {
      const S = E.inst.slots(), mine = t.photos || {}, seen = {}, total = {};
      S.forEach(s => { s.label = s.label.replace(/^(Event|Chapter|Stop|Fold|Sticker|Story page) · /, '').replace(/\s*\(.*\)$/, '').replace(/^Create · /, ''); total[s.label] = (total[s.label] || 0) + 1; });
      S.forEach(s => { const m = /^e(\d+)h(\d+)$/.exec(s.k); if (m) { s.label = (((GALLERY.events || [])[+m[1]] || {}).name || 'Event ' + (+m[1] + 1)) + ' · photo ' + (+m[2] + 1); total[s.label] = 1; } });   // clean-up #4: an event's own strip photos are named after the event
      S.forEach(s => { if (total[s.label] > 1) { seen[s.label] = (seen[s.label] || 0) + 1; s.label += ' ' + seen[s.label]; } });   // "Film strip 1, 2, 3…"
      html = '<p class="pgte-note">Every photo on this page. Tap one to choose another of your wedding photos. ' + (GALLERY.guestPhotos === 'findme' ? 'Guests will see the photos you choose here, even before Find me.' : '') + '</p>' +
        '<div class="pgte-slots">' + S.map(s => '<div class="pgte-slotw"><button type="button" class="pgte-slot" data-slot="' + s.k + '"><span style="' + (s.id ? 'background-image:url(\'' + pgImg(s.id, 240) + '\')' : '') + '"></span><b>' + esc(s.label.replace(/^(Event|Chapter|Stop|Fold|Sticker|Story page) · /, '')) + '</b><small>' + (mine[s.k] ? 'Your choice' : 'Automatic') + ((t.frame || {})[s.k] ? ' · framed' : '') + '</small></button>' + (s.id && PGTune.canFrame(E.kind) ? '<button type="button" class="pgte-mini pgte-frame" data-frame="' + s.k + '" aria-label="Frame this photo">Frame</button>' : '') + '</div>').join('') + '</div>';
    } else if (E.tab === 'parts') {
      const hid = new Set(t.hide || []);
      (t.sections || []).forEach(q => { if (q.on === false) hid.add(q.k); });
      if (E.inst.canOrder) {   // step 106: drag a part up or down by its handle (touch or mouse); hide the ones you don't want
        const ord = orderedParts(t);
        html = '<p class="pgte-note">Drag ⠿ to move a part up or down. Hide anything you don’t want — it stays saved here.</p>' +
          (E.inst.canKit ? '<button type="button" class="pgte-addkit">+ Add a part from another template</button>' : '') + '<div class="pgte-order">' +
          ord.map(x => '<div class="pgte-layer pgte-orow' + (hid.has(x.key) ? ' off' : '') + (x.kit ? ' kit' : '') + '" data-okey="' + esc(x.key) + '"><button type="button" class="pgte-grip" aria-label="Drag to move ' + esc(x.name) + '">⠿</button><span>' + esc(x.name) + '</span>' +
            (x.kit ? '<button type="button" data-unkit="' + esc(x.key) + '">Remove</button>' : '<button type="button" data-layer="' + esc(x.key) + '" aria-pressed="' + !hid.has(x.key) + '">' + (hid.has(x.key) ? 'Hidden' : 'Shown') + '</button>') + '</div>').join('') + '</div>' +
          (E.kind === 'canvas' ? '<details class="pgte-more-parts"><summary>Hide smaller things (a button, a photo…)</summary>' + E.inst.layers().filter(x => x.depth > 0).map(x => '<div class="pgte-layer' + (hid.has(x.key) ? ' off' : '') + '" style="padding-left:14px"><span>' + esc(x.name) + '</span><button type="button" data-layer="' + esc(x.key) + '" aria-pressed="' + !hid.has(x.key) + '">' + (hid.has(x.key) ? 'Hidden' : 'Shown') + '</button></div>').join('') + '</details>' : '');
      } else html = '<p class="pgte-note">Hide anything you don’t want. Hidden parts stay saved here, so you can bring them back.</p>' +
        E.inst.layers().map(x => '<div class="pgte-layer' + (hid.has(x.key) ? ' off' : '') + '" style="padding-left:' + (10 + x.depth * 16) + 'px"><span>' + esc(x.name) + '</span><button type="button" data-layer="' + x.key + '" aria-pressed="' + !hid.has(x.key) + '">' + (hid.has(x.key) ? 'Hidden' : 'Shown') + '</button></div>').join('');
    } else if (E.tab === 'words') {
      const D = PGLayout.storyData();
      html = '<p class="pgte-note">Leave a box empty to keep the wedding’s own words.</p>' +
        '<label class="pgte-text"><small>Names</small><input type="text" maxlength="60" data-text="names" placeholder="' + esc(D.names) + '" value="' + esc(t.names || '') + '"></label>' +
        '<label class="pgte-text"><small>Date line</small><input type="text" maxlength="80" data-text="date" placeholder="' + esc([D.date, D.place].filter(Boolean).join(' · ')) + '" value="' + esc(t.date || '') + '"></label>';
      const TX = E.inst.texts ? E.inst.texts() : [], tx = t.texts || {};   // step 106: every word on the page, part by part (tap a word on the page to come here)
      let lastPart = '';
      html += TX.map(x => (x.part !== lastPart ? '<div class="pgte-tpart">' + esc(lastPart = x.part) + '</div>' : '') +
        '<label class="pgte-text"><small>' + (x.button ? 'Button' : 'Words') + '</small>' + (String(x.text).length > 40 ? '<textarea rows="2" maxlength="120" data-tx="' + esc(x.key) + '" placeholder="' + esc(x.text) + '">' + esc(tx[x.key] || '') + '</textarea>' : '<input type="text" maxlength="120" data-tx="' + esc(x.key) + '" placeholder="' + esc(x.text) + '" value="' + esc(tx[x.key] || '') + '">') + '</label>').join('');
    } else {
      html = '<div class="pgte-group"><b>Motion</b><p class="pgte-note">Off keeps every part still (the page still opens as guests scroll).</p>' + seg('motion', t.motion === 'off' ? 'off' : 'on', [['on', 'On'], ['off', 'Off']]) + '</div>' +
        '<div class="pgte-group"><b>Find me button</b><p class="pgte-note">Floats on the page while guests scroll.</p>' + seg('findme', t.findme || 'right', [['left', 'Left'], ['right', 'Right'], ['off', 'Off']]) + '</div>' +
        (E.kind === 'canvas' && window.PGCanvasEditor ? '<div class="pgte-group"><b>Move things around</b><p class="pgte-note">The Advanced editor moves, resizes and adds parts. It keeps its own copy of this template.</p><button type="button" class="pgte-mini pgte-adv">Open the Advanced editor</button></div>' : '') +
        '<div class="pgte-group"><b>Start again</b><p class="pgte-note">Back to the template as it was made (Undo brings your version back).</p><button type="button" class="pgte-mini pgte-reset">Start again</button></div>';
    }
    pane.innerHTML = html;
    pane.querySelectorAll('[data-set] button').forEach(b => b.addEventListener('click', () => {
      const k = b.closest('[data-set]').dataset.set, v = b.dataset.v;
      if (k === 'dark') { E.dark = v === 'dark'; draw(); return; }
      change(t => { t[k] = v; if (k === 'findme' && v === 'right') delete t.findme; if (k === 'motion' && v === 'on') delete t.motion; });
    }));
    pane.querySelectorAll('[data-col]').forEach(inp => inp.addEventListener('change', () => change(t => { const m = E.dark ? 'dark' : 'light'; t.colors = t.colors || {}; t.colors[m] = Object.assign({}, t.colors[m], { [inp.dataset.col]: inp.value }); })));
    pane.querySelectorAll('[data-uncol]').forEach(b => b.addEventListener('click', () => change(t => { const m = E.dark ? 'dark' : 'light'; delete ((t.colors || {})[m] || {})[b.dataset.uncol]; })));
    pane.querySelectorAll('.pgte-slot').forEach(b => b.addEventListener('click', () => pickPhoto(b.dataset.slot)));
    pane.querySelectorAll('[data-frame]').forEach(b => b.addEventListener('click', () => frameSlot(b.dataset.frame)));
    pane.querySelectorAll('[data-layer]').forEach(b => b.addEventListener('click', () => change(t => { const s = new Set(t.hide || []), k = b.dataset.layer; (t.sections || []).forEach(q => { if (q.k === k && q.on === false) { q.on = true; s.add(k); } });
      if (s.has(k)) s.delete(k); else s.add(k); t.hide = [...s]; if (!t.hide.length) delete t.hide; })));
    pane.querySelectorAll('[data-tx]').forEach(inp => inp.addEventListener('change', () => change(t => { const v = inp.value.replace(/[<>]/g, '').trim(), k = inp.dataset.tx; t.texts = Object.assign({}, t.texts); if (v) t.texts[k] = v; else delete t.texts[k]; if (!Object.keys(t.texts).length) delete t.texts; })));
    const ak = pane.querySelector('.pgte-addkit'); if (ak) ak.addEventListener('click', () => pickKit());   // step 107
    pane.querySelectorAll('[data-unkit]').forEach(b => b.addEventListener('click', () => change(t => { const k = b.dataset.unkit, id = k.split('-')[0];
      t.add = (t.add || []).filter(a => a.id !== id); if (!t.add.length) delete t.add; if (t.sections) { t.sections = t.sections.filter(q => q.k !== k); if (!t.sections.length) delete t.sections; } })));
    pane.querySelectorAll('.pgte-grip').forEach(g => g.addEventListener('pointerdown', ev => dragPart(ev, g.closest('.pgte-orow'))));
    pane.querySelectorAll('[data-text]').forEach(inp => inp.addEventListener('change', () => change(t => { const v = inp.value.replace(/[<>]/g, '').trim(); if (v) t[inp.dataset.text] = v; else delete t[inp.dataset.text]; })));
    const adv = pane.querySelector('.pgte-adv'); if (adv) adv.addEventListener('click', () => { const id = E.id; close(); if (!E) PGCanvasEditor.open(id); });
    const rs = pane.querySelector('.pgte-reset'); if (rs) rs.addEventListener('click', () => change(t => { Object.keys(t).forEach(k => { if (k !== 'kind') delete t[k]; }); }));
  }

  // step 106: the parts in the couple's order (parts they never moved keep their place)
  function orderedParts(t) {
    const all = E.inst.order(), pos = {}; (t.sections || []).forEach((q, i) => { pos[q.k] = i; });
    const known = all.filter(x => x.key in pos).sort((a, b) => pos[a.key] - pos[b.key]); let ki = 0;
    return all.map(x => (x.key in pos ? known[ki++] : x));
  }
  // drag a part row by its handle: the row follows the finger / mouse, the others make room; let go to keep the new order
  function dragPart(ev, row) {
    if (!row) return; ev.preventDefault(); const list = row.parentNode, grip = ev.currentTarget || row.querySelector('.pgte-grip');
    try { grip.setPointerCapture(ev.pointerId); } catch (e) {}
    row.classList.add('drag'); let lastY = ev.clientY;
    const move = e => { lastY = e.clientY; const rows = [...list.children].filter(r => r !== row);
      const after = rows.find(r => { const b = r.getBoundingClientRect(); return lastY < b.top + b.height / 2; });
      if (after) list.insertBefore(row, after); else list.appendChild(row); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); row.classList.remove('drag');
      const keys = [...list.querySelectorAll('.pgte-orow')].map(r => r.dataset.okey);
      change(t => { const off = new Set((t.sections || []).filter(q => q.on === false).map(q => q.k)); t.sections = keys.map(k => ({ k, on: !off.has(k) })); }); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);   // the page, not the handle: moving the row lets go of the handle
  }
  // tap words on the page → the Words tab opens at that box
  function pickText(key) { E.tab = 'words'; setDrawer(true); panel(); const i = E.el.querySelector('[data-tx="' + CSS.escape(key) + '"]'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus({ preventScroll: true }); } }

  // step 107: add a part from another template's design kit — the kits in a row, their parts drawn live with this wedding's photos,
  // where to put it, then Add. Only the choice is kept (which part, from which template, after which part).
  function pickKit() {
    if (!E) return;
    const kits = PGTune.kits(E.id); if (!kits.length) return;
    const D = PGLayout.storyData(), order = orderedParts(E.tune);
    let kit = kits[0].id, part = null, after = order.length ? order[order.length - 1].key : '';
    const back = h('div', 'pgte-back'), sh = h('div', 'pgte-pick pgte-kitsheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Add a part');
    const insts = [];
    const paint = () => {
      insts.splice(0).forEach(i => { if (i && i.destroy) i.destroy(); });
      const k = kits.find(x => x.id === kit);
      sh.innerHTML = '<div class="pgte-pick-top"><b>Add a part</b><button type="button" class="pgte-x" aria-label="Close">✕</button></div>' +
        '<div class="pgte-kitrow" role="tablist">' + kits.map(x => '<button type="button" role="tab" data-kit="' + esc(x.id) + '" class="' + (x.id === kit ? 'on' : '') + '" aria-selected="' + (x.id === kit) + '">' + esc(x.name) + '</button>').join('') + '</div>' +
        '<div class="pgte-kitparts">' + k.parts.map(p => '<button type="button" data-part="' + esc(p.sec) + '" class="pgte-kitpart' + (p.sec === part ? ' on' : '') + '" aria-label="' + esc(p.name) + '"><div class="pgte-kitpv"><div class="pgte-kitin"></div></div><small>' + esc(p.name) + '</small></button>').join('') + '</div>' +
        '<div class="pgte-kitafter"><small>Put it after</small><div class="pgte-kitrow">' + order.map(o => '<button type="button" data-after="' + esc(o.key) + '" class="' + (o.key === after ? 'on' : '') + '">' + esc(o.name) + '</button>').join('') + '</div></div>' +
        '<button type="button" class="pgte-kitadd"' + (part ? '' : ' disabled') + '>' + (part ? 'Add this part' : 'Choose a part') + '</button>';
      sh.querySelectorAll('.pgte-kitpart').forEach(b => { const inner = b.querySelector('.pgte-kitin'); inner.style.width = '390px'; inner.style.zoom = String(120 / 390);
        try { insts.push(PGTune.drawPart(inner, kit, b.dataset.part, E.l.canvas, D)); } catch (e) {} });
      sh.querySelector('.pgte-x').addEventListener('click', shut);
      sh.querySelectorAll('[data-kit]').forEach(b => b.addEventListener('click', () => { kit = b.dataset.kit; part = null; paint(); const on = sh.querySelector('[data-kit].on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); }));
      sh.querySelectorAll('[data-part]').forEach(b => b.addEventListener('click', () => { part = b.dataset.part; sh.querySelectorAll('[data-part]').forEach(x => x.classList.toggle('on', x === b)); const a = sh.querySelector('.pgte-kitadd'); a.disabled = false; a.textContent = 'Add this part'; }));
      sh.querySelectorAll('[data-after]').forEach(b => b.addEventListener('click', () => { after = b.dataset.after; sh.querySelectorAll('[data-after]').forEach(x => x.classList.toggle('on', x === b)); }));
      sh.querySelector('.pgte-kitadd').addEventListener('click', () => { if (!part) return; shut();
        change(t => { const add = t.add || [], used = new Set(add.map(a => a.id)); let n = 1; while (used.has('x' + n)) n++; const id = 'x' + n;
          t.add = add.concat([{ id, from: kit, sec: part, after }]);
          const keys = orderedParts(t).map(o => o.key), off = new Set((t.sections || []).filter(q => q.on === false).map(q => q.k)), nk = id + '-' + part;
          const rest = keys.filter(k => k !== nk), at = rest.indexOf(after); rest.splice(at < 0 ? rest.length : at + 1, 0, nk);
          t.sections = rest.map(k => ({ k, on: !off.has(k) })); });
        showToast('Part added — drag ⠿ to move it'); });
    };
    const shut = () => { insts.forEach(i => { if (i && i.destroy) i.destroy(); }); back.remove(); sh.remove(); };
    back.addEventListener('click', shut);
    E.el.append(back, sh); paint();
  }

  // ---- choose a photo: the cover photos, the highlights, then each event ----
  function pickPhoto(slot) {
    if (!E) return;
    const st = GALLERY.story || {}, groups = [];
    if ((st.cover || []).length) groups.push(['Cover photos', st.cover]);
    if ((st.wh || []).length) groups.push(['Wedding highlights', st.wh]);
    (GALLERY.events || []).forEach(e => { const ids = (e.photos || []).map(p => p.id); if (ids.length) groups.push([e.name, ids]); });
    const cur = E.inst.photo(slot), mine = !!(E.tune.photos || {})[slot];
    const back = h('div', 'pgte-back'), sh = h('div', 'pgte-pick'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Choose a photo');
    sh.innerHTML = '<div class="pgte-pick-top"><b>Choose a photo</b>' + (cur && PGTune.canFrame(E.kind) ? '<button type="button" class="pgte-mini pgte-frameit">Frame this one</button>' : '') + (mine ? '<button type="button" class="pgte-mini pgte-auto">Use automatic</button>' : '') + '<button type="button" class="pgte-x" aria-label="Close">✕</button></div>' +
      '<div class="pgte-pick-list">' + groups.map(([name, ids], gi) => '<h6>' + esc(name) + '</h6><div class="pgte-grid" data-g="' + gi + '">' + ids.slice(0, 48).map(id => '<button type="button" data-id="' + esc(id) + '" class="' + (id === cur ? 'on' : '') + '"><img loading="lazy" alt="" src="' + pgImg(id, 240) + '"></button>').join('') +
        (ids.length > 48 ? '<button type="button" class="pgte-more" data-more="' + gi + '">All ' + ids.length + '</button>' : '') + '</div>').join('') + '</div>';
    const shut = () => { back.remove(); sh.remove(); };
    back.addEventListener('click', shut); sh.querySelector('.pgte-x').addEventListener('click', shut);
    const fit = sh.querySelector('.pgte-frameit'); if (fit) fit.addEventListener('click', () => { shut(); frameSlot(slot); });
    const auto = sh.querySelector('.pgte-auto'); if (auto) auto.addEventListener('click', () => { shut(); change(t => { delete t.photos[slot]; if (!Object.keys(t.photos).length) delete t.photos; }); });
    sh.querySelector('.pgte-pick-list').addEventListener('click', e => {
      const m = e.target.closest('[data-more]'); if (m) { const [, ids] = groups[+m.dataset.more]; m.insertAdjacentHTML('beforebegin', ids.slice(48).map(id => '<button type="button" data-id="' + esc(id) + '"><img loading="lazy" alt="" src="' + pgImg(id, 240) + '"></button>').join('')); m.remove(); return; }
      const b = e.target.closest('[data-id]'); if (!b) return; shut(); change(t => { t.photos = Object.assign({}, t.photos, { [slot]: b.dataset.id }); if (t.frame) { delete t.frame[slot]; if (!Object.keys(t.frame).length) delete t.frame; } });   // a new photo starts unframed
    });
    E.el.append(back, sh);
  }
  // step 79: move the photo inside its holder and zoom, like Photo Edits
  function frameSlot(slot) {
    if (!E || !window.PGFrame) return;
    const id = E.inst.photo(slot); if (!id) return;
    const node = E.el.querySelector('.pss [data-slot="' + slot + '"]');
    let ratio = 0.8, dfy = 40;
    if (node) { const r = node.getBoundingClientRect(); if (r.width && r.height) ratio = r.width / r.height; const op = getComputedStyle(node).objectPosition.split(' '); if (op[1] && /%$/.test(op[1])) dfy = parseFloat(op[1]); }
    PGFrame.open({ id, ratio, dfy, frame: (E.tune.frame || {})[slot], title: 'Frame this photo', onDone: f => change(t => { t.frame = Object.assign({}, t.frame); if (f) t.frame[slot] = f; else delete t.frame[slot]; if (!Object.keys(t.frame).length) delete t.frame; }) });
  }

  // ---- save this version, or apply it to the wedding ----
  function save(apply) {
    const custom = { base: E.id, story: clone(E.tune), blocks: [] }, body = { version: JSON.stringify({ id: E.id, custom }) };
    if (apply) { body.layout = 'custom'; body.custom = JSON.stringify(custom); }
    const btn = E.el.querySelector(apply ? '.pgte-apply' : '.pgte-save'), was = btn.textContent; btn.disabled = true; btn.textContent = apply ? 'Applying…' : 'Saving…';
    return PGControl.save(body).then(r => {
      if (r.versions) GALLERY.versions = r.versions; else { GALLERY.versions = Object.assign({}, GALLERY.versions); GALLERY.versions[E.id] = custom; }
      const demo = PGControl.role() === 'demo';
      if (apply) { GALLERY.layout = r.layout; GALLERY.custom = r.custom; if (r.theme != null) GALLERY.theme = r.theme; E.saved = JSON.stringify(E.tune); window.pgEditorBack = null; close(true); if (window.switchViewFromNav) switchViewFromNav('hub'); window.scrollTo(0, 0);
        showToast(demo ? 'Applied on this phone (demo)' : 'Applied — every guest sees this Hub now'); return; }
      E.saved = JSON.stringify(E.tune); btn.disabled = false; draw(); showToast('Saved — your version of ' + E.l.name + ' is kept. Guests see it once you apply it.');
    }).catch(err => { showToast(err.message || 'Could not save'); btn.disabled = false; btn.textContent = was; });
  }

  window.PGTemplateEditor = { open, close, handles, state: () => (E ? { id: E.id, tab: E.tab, tune: clone(E.tune), dirty: JSON.stringify(E.tune) !== E.saved } : null), tab: k => { if (E) { E.tab = k; setDrawer(true); panel(); } } };
})();
