// Step 98b — change a photo right where you see it on the Hub (the couple, the photographer, PicGrades).
// Step 103: on a ready template this saves only the couple's choice (the same as "Try your photos"), never a copy of the design;
// a layout made in the Advanced editor (cv-…) still updates its own copy.
// On a canvas Hub layout every photo is its own part: tap it (or a section's background photo) and choose
// Change photo · Move & zoom · Reset. The change is saved as this wedding's own copy of the layout
// (canvasSave, "this wedding"), applied at once, so every guest sees it. Guests' taps are unchanged.
// Story and card layouts keep their own ways (Story & highlights; the editor). Part of app/gallery.html.
(function pgHubPhoto() {
  const OWNERS = ['couple', 'photographer', 'picgrades'];
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const role = () => (window.PGControl ? PGControl.role() : 'guest');
  // the canvas doc the Hub shows now: the wedding's own (cv-…) or a ready canvas layout
  function current() {
    const id = GALLERY.layout || '';
    const cb = id === 'custom' && GALLERY.custom && GALLERY.custom.story && GALLERY.custom.story.kind === 'canvas' && !GALLERY.custom.story.doc ? GALLERY.custom.base : '';
    const bl = cb && window.PGLayout && PGLayout.find(cb);
    if (bl && bl.canvas) return { id, choices: true, base: cb, doc: PGTune.overlayCanvas(bl.canvas, GALLERY.custom.story), name: bl.name, tune: clone(GALLERY.custom.story) };   // step 103: a template with the couple's choices
    if (/^cv-/.test(id) && GALLERY.canvas && GALLERY.canvas.doc) return { id, mine: true, doc: clone(GALLERY.canvas.doc), name: GALLERY.canvas.name, base: GALLERY.canvas.base || '' };
    const l = id && window.PGLayout && PGLayout.find(id);
    if (l && l.canvas) { const v = (GALLERY.versions || {})[l.id]; const tv = v && v.story && v.story.kind === 'canvas' ? clone(v.story) : { kind: 'canvas' }; return { id, choices: true, base: l.id, doc: PGTune.overlayCanvas(l.canvas, tv), name: l.name, tune: tv }; }   // step 103
    return null;
  }
  const editable = () => OWNERS.indexOf(role()) > -1 && !!current();
  function find(doc, elId) { for (const s of doc.sections || []) { const e = (s.els || []).find(x => x.id === elId); if (e) return e; } return null; }

  // step 104: taps change photos only after the owner switches on "Change photos" — otherwise the Hub works like a guest's
  let on = false;
  function bar() {
    let b = document.getElementById('pghpBar');
    const hub = document.querySelector('#pgStory .pgc'), show = editable() && hub && hub.offsetParent !== null;
    if (!show) { if (b) b.remove(); document.body.classList.remove('pghp-on'); on = false; return; }
    if (document.querySelector('.pce, .pgte, .pgcp-sheet, .pghp.in')) { if (b) b.hidden = true; return; }   // a sheet or editor is open: wait (stay on)
    if (!b) { b = document.createElement('div'); b.id = 'pghpBar'; b.className = 'pghp-bar'; document.body.appendChild(b);
      b.addEventListener('click', ev => { if (ev.target.closest('[data-x]')) setOn(!on); }); }
    b.innerHTML = on ? '<span>Tap a photo to change it. Guests do not see this.</span><button type="button" data-x class="pghp-done">Done</button>'
                     : '<button type="button" data-x class="pghp-go" aria-label="Change photos on this Hub"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>Change photos</button>';
    b.hidden = false; b.classList.toggle('on', on);
  }
  function setOn(v) { on = !!v; document.body.classList.toggle('pghp-on', on); bar(); }
  // a tap on a photo of the Hub (capture: before anything else reacts)
  document.addEventListener('click', ev => {
    const root = ev.target.closest && ev.target.closest('.pgc');
    if (!on || !root || ev.target.closest('.pce, .pgcp-sheet, .pgcp-pv, [data-ev], [data-act], .pgc-vid, button, a') || !editable()) return;
    const el = ev.target.closest('.pgc-el.pgc-t-photo'), sec = ev.target.closest('.pgc-sec');
    let what = null;
    if (el && el.dataset.el) what = { kind: 'el', id: el.dataset.el, node: el, img: el.querySelector('img') };
    else if (sec && !ev.target.closest('.pgc-el') && sec.querySelector(':scope > .pgc-stick > .pgc-bgimg')) what = { kind: 'bg', id: sec.dataset.sec, node: sec.querySelector('.pgc-stick'), img: sec.querySelector('.pgc-bgimg') };
    if (!what) return;
    ev.preventDefault(); ev.stopPropagation();
    what.mode = root.dataset.mode === 'l' ? 'l' : 'p';
    sheet(what);
  }, true);

  // the small sheet: Change photo · Move & zoom · Reset
  function sheet(w) {
    shut();
    const back = document.createElement('div'); back.className = 'pghp-back';
    const sh = document.createElement('div'); sh.className = 'pghp'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'This photo');
    sh.innerHTML = '<div class="pghp-top"><img alt="" src="' + esc(w.img ? w.img.src : '') + '"><div><b>' + (w.kind === 'bg' ? 'Background photo' : 'This photo') + '</b><small>Guests see your change at once</small></div><button type="button" class="pghp-x" aria-label="Close">✕</button></div>' +
      '<div class="pghp-acts"><button type="button" data-a="change">Change photo</button><button type="button" data-a="frame">Move &amp; zoom</button><button type="button" data-a="reset">Reset</button></div>';
    back.addEventListener('click', shut); sh.querySelector('.pghp-x').addEventListener('click', shut);
    sh.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { const a = b.dataset.a; shut();
      if (a === 'change') pick(w); else if (a === 'frame') frame(w); else save(w, t => { delete t.fx; delete t.fy; delete t.zm; delete t.z; }, 'Framing reset'); }));
    document.body.append(back, sh); requestAnimationFrame(() => sh.classList.add('in'));
  }
  function shut() { document.querySelectorAll('.pghp, .pghp-back, .pghp-pick').forEach(x => x.remove()); }

  // choose any of the wedding's photos
  function pick(w) {
    const st = GALLERY.story || {}, groups = [];
    if ((st.cover || []).length) groups.push(['Cover photos', st.cover]);
    if ((st.wh || []).length) groups.push(['Wedding highlights', st.wh]);
    (GALLERY.events || []).forEach(e => { const ids = (e.photos || []).map(p => p.id); if (ids.length) groups.push([e.name, ids]); });
    const back = document.createElement('div'); back.className = 'pghp-back';
    const sh = document.createElement('div'); sh.className = 'pghp pghp-pick in'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Choose a photo');
    sh.innerHTML = '<div class="pghp-top"><div><b>Choose a photo</b><small>' + (GALLERY.guestPhotos === 'findme' ? 'Guests see the photo you choose here, even before Find me.' : 'Any photo of the wedding.') + '</small></div><button type="button" class="pghp-x" aria-label="Close">✕</button></div><div class="pghp-list">' +
      groups.map(([n, ids]) => '<h6>' + esc(n) + '</h6><div class="pghp-grid">' + ids.slice(0, 90).map(id => '<button type="button" data-id="' + esc(id) + '" aria-label="Choose this photo"><img loading="lazy" alt="" src="' + pgImg(id, 240) + '"></button>').join('') + '</div>').join('') + '</div>';
    back.addEventListener('click', shut); sh.querySelector('.pghp-x').addEventListener('click', shut);
    sh.querySelector('.pghp-list').addEventListener('click', ev => { const b = ev.target.closest('[data-id]'); if (!b) return; shut();
      save(w, (t, part) => { part.src = { k: 'id', id: b.dataset.id }; delete t.fx; delete t.fy; delete t.zm; delete t.z; }, 'Photo changed'); });
    document.body.append(back, sh);
  }
  // move & zoom inside its frame (the same sheet as Photo Edits)
  function frame(w) {
    const r = w.node.getBoundingClientRect(), cur = current(); if (!cur || !window.PGFrame) return;
    const part = w.kind === 'bg' ? (cur.doc.sections.find(s => s.id === w.id) || {}).bg : find(cur.doc, w.id); if (!part) return;
    const t = w.kind === 'bg' ? part : (w.mode === 'l' && part.sl ? part.sl : part.s || {});
    const id = w.img && (w.img.dataset.photo || ((/\/d\/([^=?]+)/.exec(w.img.src) || [])[1]));
    PGFrame.open({ id, ratio: r.height ? r.width / r.height : 1, dfy: w.kind === 'bg' ? 35 : 30, frame: t.fx != null || t.fy != null ? { fx: t.fx, fy: t.fy, z: w.kind === 'bg' ? t.z : t.zm } : null, title: 'Move & zoom',
      onDone: f => save(w, tt => { if (!f) { delete tt.fx; delete tt.fy; delete tt.zm; delete tt.z; return; } tt.fx = f.fx; tt.fy = f.fy; if (w.kind === 'bg') { if (f.z > 1) tt.z = f.z; else delete tt.z; } else { if (f.z > 1) tt.zm = f.z; else delete tt.zm; } }, f ? 'Framing saved' : 'Framing reset') });
  }
  // change the doc, save it as this wedding's own copy, apply it
  let busy = false;
  // step 103: keep only the choice for this spot (photo, framing), apply the template with the couple's choices
  function saveChoice(cur, w, fn, done) {
    const slot = w.kind === 'bg' ? 'bg-' + w.id : w.id, t = cur.tune; t.kind = 'canvas';
    const probe = { s: {}, src: null };
    const old = (t.frame || {})[slot]; if (old) { probe.s.fx = old.fx; probe.s.fy = old.fy; if (w.kind === 'bg') probe.s.z = old.z; else probe.s.zm = old.z; }
    fn(probe.s, probe);
    if (probe.src && probe.src.k === 'id') { t.photos = Object.assign({}, t.photos, { [slot]: probe.src.id }); }
    const z = w.kind === 'bg' ? probe.s.z : probe.s.zm;
    if (probe.s.fx != null || probe.s.fy != null) t.frame = Object.assign({}, t.frame, { [slot]: { fx: probe.s.fx || 0, fy: probe.s.fy || 0, z: z || 1 } });
    else if (t.frame) { delete t.frame[slot]; if (!Object.keys(t.frame).length) delete t.frame; }
    const custom = { base: cur.base, story: t, blocks: [] };
    busy = true; showToast('Saving…');
    PGControl.save({ version: JSON.stringify({ id: cur.base, custom }), layout: 'custom', custom: JSON.stringify(custom) }).then(r => {
      if (r.versions) GALLERY.versions = r.versions; GALLERY.layout = r.layout || 'custom'; GALLERY.custom = r.custom || custom;
      if (window.PGLayout) PGLayout.refresh(); showToast(done + ' — every guest sees it now');
    }).catch(err => showToast((err && err.message) || 'Could not save')).then(() => { busy = false; });
  }
  function save(w, fn, done) {
    const cur = current(); if (!cur || busy) return;
    if (cur.choices) return saveChoice(cur, w, fn, done);
    const doc = cur.doc;
    if (w.kind === 'bg') { const s = doc.sections.find(x => x.id === w.id); if (!s || !s.bg) return; fn(s.bg, s.bg); }
    else { const e = find(doc, w.id); if (!e) return; const t = w.mode === 'l' && e.sl ? e.sl : (e.s = e.s || {}); fn(t, e); }
    busy = true; showToast('Saving…');
    const item = { kind: 'layout', name: cur.name || doc.name || 'Our Hub', scope: 'wedding', doc, base: cur.base || undefined };   // step 101: the wedding's one copy of this template
    const put = id => pgApi('canvasSave', { item: Object.assign({}, item, id ? { id } : {}) });
    (cur.mine ? put(GALLERY.layout).catch(() => put(null)) : put(null))   // a ready layout (or someone else's) becomes this wedding's own copy
      .then(res => (res.id === GALLERY.layout ? Promise.resolve({ layout: res.id }) : PGControl.save({ layout: res.id })).then(r => {
        GALLERY.layout = r.layout || res.id; GALLERY.canvas = { id: res.id, name: item.name, doc: res.doc || doc, base: cur.base || '' };
        if (window.PGLayout) PGLayout.refresh(); showToast(done + ' — every guest sees it now');
      }))
      .catch(err => showToast((err && err.message) || 'Could not save'))
      .then(() => { busy = false; });
  }
  if (window.pgAfter) pgAfter('pgRenderHub', () => setTimeout(bar, 300));
  ['popstate', 'hashchange'].forEach(n => window.addEventListener(n, () => setTimeout(bar, 60)));
  document.addEventListener('click', () => setTimeout(bar, 80));   // a view or an editor may have opened or closed
  window.PGHubPhoto = { editable, setOn, isOn: () => on, bar, open: (kind, id, mode) => { const n = kind === 'bg' ? document.querySelector('.pgc-sec[data-sec="' + CSS.escape(id) + '"] > .pgc-stick') : document.querySelector('.pgc-el[data-el="' + CSS.escape(id) + '"]'); if (n) sheet({ kind, id, node: n, img: n.querySelector(kind === 'bg' ? '.pgc-bgimg' : 'img'), mode: mode || 'p' }); } };
})();
