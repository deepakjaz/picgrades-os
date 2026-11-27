// Step 98b — change a photo right where you see it on the Hub (the couple, the photographer, PicGrades).
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
    if (/^cv-/.test(id) && GALLERY.canvas && GALLERY.canvas.doc) return { id, mine: true, doc: clone(GALLERY.canvas.doc), name: GALLERY.canvas.name };
    const l = id && window.PGLayout && PGLayout.find(id);
    return l && l.canvas ? { id, mine: false, doc: clone(l.canvas), name: l.name } : null;
  }
  const editable = () => OWNERS.indexOf(role()) > -1 && !!current();
  function find(doc, elId) { for (const s of doc.sections || []) { const e = (s.els || []).find(x => x.id === elId); if (e) return e; } return null; }

  // a tap on a photo of the Hub (capture: before anything else reacts)
  document.addEventListener('click', ev => {
    const root = ev.target.closest && ev.target.closest('.pgc');
    if (!root || ev.target.closest('.pce, .pgcp-sheet, .pgcp-pv, [data-ev], [data-act], .pgc-vid, button, a') || !editable()) return;
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
  function save(w, fn, done) {
    const cur = current(); if (!cur || busy) return;
    const doc = cur.doc;
    if (w.kind === 'bg') { const s = doc.sections.find(x => x.id === w.id); if (!s || !s.bg) return; fn(s.bg, s.bg); }
    else { const e = find(doc, w.id); if (!e) return; const t = w.mode === 'l' && e.sl ? e.sl : (e.s = e.s || {}); fn(t, e); }
    busy = true; showToast('Saving…');
    const item = { kind: 'layout', name: cur.name || doc.name || 'Our Hub', scope: 'wedding', doc };
    const put = id => pgApi('canvasSave', { item: Object.assign({}, item, id ? { id } : {}) });
    (cur.mine ? put(GALLERY.layout).catch(() => put(null)) : put(null))   // a ready layout (or someone else's) becomes this wedding's own copy
      .then(res => (res.id === GALLERY.layout ? Promise.resolve({ layout: res.id }) : PGControl.save({ layout: res.id })).then(r => {
        GALLERY.layout = r.layout || res.id; GALLERY.canvas = { id: res.id, name: item.name, doc: res.doc || doc };
        if (window.PGLayout) PGLayout.refresh(); showToast(done + ' — every guest sees it now');
      }))
      .catch(err => showToast((err && err.message) || 'Could not save'))
      .then(() => { busy = false; });
  }
  // once, for an owner on a canvas Hub: say it can be done
  function hint() {
    if (!editable()) return;
    try { if (localStorage.getItem('pghp_hint')) return; localStorage.setItem('pghp_hint', '1'); } catch (e) { return; }
    showToast('Tip: tap any photo on your Hub to change it or move it in its frame');
  }
  if (window.pgAfter) pgAfter('pgRenderHub', () => setTimeout(hint, 1500));
  window.PGHubPhoto = { editable, open: (kind, id, mode) => { const n = kind === 'bg' ? document.querySelector('.pgc-sec[data-sec="' + CSS.escape(id) + '"] > .pgc-stick') : document.querySelector('.pgc-el[data-el="' + CSS.escape(id) + '"]'); if (n) sheet({ kind, id, node: n, img: n.querySelector(kind === 'bg' ? '.pgc-bgimg' : 'img'), mode: mode || 'p' }); } };
})();
