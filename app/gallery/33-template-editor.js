// Template editor (step 76): tap a Story or Minimal template in Control Panel › Hub layout and it opens here straight away —
// no preview page first. The template is drawn live with this wedding's photos; beside it (below it on a phone):
//   Colours · Photos · Parts · Words · More
// - Colours: the template's own colours, for light and for dark.
// - Photos: any photo of the template can be any of the wedding's photos (or tap the photo in the preview).
// - Parts: show or hide any part (the layers of the Template Studio).
// - Words: the names and the date line.  - More: motion on/off, the Find me button, start again.
// Save keeps this version for the template (nothing changes for guests). Apply makes it the wedding's Hub (and keeps the version).
// Each template remembers its own version: choose it again later and the couple's changes are still there.
(function pgTemplateEditor() {
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const handles = k => !!(window.PGStoryStudio && PGStoryStudio.mods[k]);
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
    E = { id, l, tune, saved: JSON.stringify(tune), undo: [], redo: [], inst: null, dark: isDarkApp(), tab: 'photos', drawerOpen: false };
    const el = h('div', 'pgte'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Design ' + l.name); E.el = el;
    el.innerHTML = '<div class="pgte-top"><button type="button" class="pgte-x" aria-label="Close">‹</button>' +
      '<div class="pgte-title"><b>' + esc(l.name) + '</b><small>' + esc(l.idea || '') + '</small></div>' +
      '<button type="button" class="pgte-ic pgte-undo" aria-label="Undo">↶</button><button type="button" class="pgte-ic pgte-redo" aria-label="Redo">↷</button>' +
      '<button type="button" class="pgte-btn pgte-save">Save</button><button type="button" class="pgte-btn pgte-apply">Apply</button></div>' +
      '<div class="pgte-body"><div class="pgte-stage"><div class="pgte-phone"><div class="pgte-scroll"></div></div><p class="pgte-tip">Scroll the page to see it move. Tap any photo to change it.</p></div>' +
      '<div class="pgte-panel"><div class="pgte-tabs" role="tablist">' + TABS.map(([k, n]) => '<button type="button" role="tab" data-tab="' + k + '">' + n + '</button>').join('') + '<button type="button" class="pgte-drawer-toggle" aria-label="Open tools" aria-expanded="false">⌃</button></div><div class="pgte-pane"></div></div></div>';
    el.querySelector('.pgte-x').addEventListener('click', () => close());
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
    E.inst = PGStoryStudio.mount(E.l.story, sc, PGLayout.storyData(), a => showToast('Guests can use this once the Hub is applied'),
      { tune: E.tune, scroller: sc, ovHost: E.el.querySelector('.pgte-phone'), dark: E.dark, pick: slot => pickPhoto(slot) });
    sc.scrollTop = y; E.inst.refresh();
    E.el.querySelector('.pgte-undo').disabled = !E.undo.length; E.el.querySelector('.pgte-redo').disabled = !E.redo.length;
    const dirty = JSON.stringify(E.tune) !== E.saved; E.el.querySelector('.pgte-save').textContent = dirty ? 'Save' : 'Saved'; E.el.querySelector('.pgte-save').disabled = !dirty;
    panel();
  }

  // ---- the panel ----
  const seg = (name, cur, opts) => '<div class="pgte-seg" data-set="' + name + '">' + opts.map(o => '<button type="button" data-v="' + o[0] + '" class="' + (cur === o[0] ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
  function panel() {
    const pane = E.el.querySelector('.pgte-pane'), t = E.tune;
    E.el.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === E.tab); b.setAttribute('aria-selected', b.dataset.tab === E.tab); });
    let html = '';
    if (E.tab === 'colours') {
      const mode = E.dark ? 'dark' : 'light', own = (t.colors || {})[mode] || {};
      html = '<p class="pgte-note">The template’s own colours. Guests on dark mode see the dark set.</p>' + seg('dark', mode, [['light', 'Light'], ['dark', 'Dark']]) +
        PGStoryStudio.colors(E.l.story, E.dark).map(c => '<label class="pgte-col"><span>' + esc(c.name) + '</span><input type="color" data-col="' + c.k + '" value="' + esc(String(own[c.k] || c.value).slice(0, 7)) + '">' +
          (own[c.k] ? '<button type="button" class="pgte-mini" data-uncol="' + c.k + '">Reset</button>' : '<em>original</em>') + '</label>').join('');
    } else if (E.tab === 'photos') {
      const S = E.inst.slots(), mine = t.photos || {}, seen = {}, total = {};
      S.forEach(s => { s.label = s.label.replace(/^(Event|Chapter|Stop|Fold|Sticker|Story page) · /, '').replace(/\s*\(.*\)$/, '').replace(/^Create · /, ''); total[s.label] = (total[s.label] || 0) + 1; });
      S.forEach(s => { if (total[s.label] > 1) { seen[s.label] = (seen[s.label] || 0) + 1; s.label += ' ' + seen[s.label]; } });   // "Film strip 1, 2, 3…"
      html = '<p class="pgte-note">Every photo on this page. Tap one to choose another of your wedding photos. ' + (GALLERY.guestPhotos === 'findme' ? 'Guests will see the photos you choose here, even before Find me.' : '') + '</p>' +
        '<div class="pgte-slots">' + S.map(s => '<div class="pgte-slotw"><button type="button" class="pgte-slot" data-slot="' + s.k + '"><span style="' + (s.id ? 'background-image:url(\'' + pgImg(s.id, 240) + '\')' : '') + '"></span><b>' + esc(s.label.replace(/^(Event|Chapter|Stop|Fold|Sticker|Story page) · /, '')) + '</b><small>' + (mine[s.k] ? 'Your choice' : 'Automatic') + ((t.frame || {})[s.k] ? ' · framed' : '') + '</small></button>' + (s.id ? '<button type="button" class="pgte-mini pgte-frame" data-frame="' + s.k + '" aria-label="Frame this photo">Frame</button>' : '') + '</div>').join('') + '</div>';
    } else if (E.tab === 'parts') {
      const hid = new Set(t.hide || []);
      html = '<p class="pgte-note">Hide anything you don’t want. Hidden parts stay saved here, so you can bring them back.</p>' +
        E.inst.layers().map(x => '<div class="pgte-layer' + (hid.has(x.key) ? ' off' : '') + '" style="padding-left:' + (10 + x.depth * 16) + 'px"><span>' + esc(x.name) + '</span><button type="button" data-layer="' + x.key + '" aria-pressed="' + !hid.has(x.key) + '">' + (hid.has(x.key) ? 'Hidden' : 'Shown') + '</button></div>').join('');
    } else if (E.tab === 'words') {
      const D = PGLayout.storyData();
      html = '<p class="pgte-note">Leave a box empty to keep the wedding’s own words.</p>' +
        '<label class="pgte-text"><small>Names</small><input type="text" maxlength="60" data-text="names" placeholder="' + esc(D.names) + '" value="' + esc(t.names || '') + '"></label>' +
        '<label class="pgte-text"><small>Date line</small><input type="text" maxlength="80" data-text="date" placeholder="' + esc([D.date, D.place].filter(Boolean).join(' · ')) + '" value="' + esc(t.date || '') + '"></label>';
    } else {
      html = '<div class="pgte-group"><b>Motion</b><p class="pgte-note">Off keeps every part still (the page still opens as guests scroll).</p>' + seg('motion', t.motion === 'off' ? 'off' : 'on', [['on', 'On'], ['off', 'Off']]) + '</div>' +
        '<div class="pgte-group"><b>Find me button</b><p class="pgte-note">Floats on the page while guests scroll.</p>' + seg('findme', t.findme || 'right', [['left', 'Left'], ['right', 'Right'], ['off', 'Off']]) + '</div>' +
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
    pane.querySelectorAll('[data-layer]').forEach(b => b.addEventListener('click', () => change(t => { const s = new Set(t.hide || []), k = b.dataset.layer; if (s.has(k)) s.delete(k); else s.add(k); t.hide = [...s]; if (!t.hide.length) delete t.hide; })));
    pane.querySelectorAll('[data-text]').forEach(inp => inp.addEventListener('change', () => change(t => { const v = inp.value.replace(/[<>]/g, '').trim(); if (v) t[inp.dataset.text] = v; else delete t[inp.dataset.text]; })));
    const rs = pane.querySelector('.pgte-reset'); if (rs) rs.addEventListener('click', () => change(t => { Object.keys(t).forEach(k => { if (k !== 'kind') delete t[k]; }); }));
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
    sh.innerHTML = '<div class="pgte-pick-top"><b>Choose a photo</b>' + (cur ? '<button type="button" class="pgte-mini pgte-frameit">Frame this one</button>' : '') + (mine ? '<button type="button" class="pgte-mini pgte-auto">Use automatic</button>' : '') + '<button type="button" class="pgte-x" aria-label="Close">✕</button></div>' +
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
      if (apply) { GALLERY.layout = r.layout; GALLERY.custom = r.custom; if (r.theme != null) GALLERY.theme = r.theme; E.saved = JSON.stringify(E.tune); close(true); if (window.switchViewFromNav) switchViewFromNav('hub'); window.scrollTo(0, 0);
        showToast(demo ? 'Applied on this phone (demo)' : 'Applied — every guest sees this Hub now'); return; }
      E.saved = JSON.stringify(E.tune); btn.disabled = false; draw(); showToast('Saved — your version of ' + E.l.name + ' is kept. Guests see it once you apply it.');
    }).catch(err => { showToast(err.message || 'Could not save'); btn.disabled = false; btn.textContent = was; });
  }

  window.PGTemplateEditor = { open, close, handles, state: () => (E ? { id: E.id, tab: E.tab, tune: clone(E.tune), dirty: JSON.stringify(E.tune) !== E.saved } : null), tab: k => { if (E) { E.tab = k; setDrawer(true); panel(); } } };
})();
