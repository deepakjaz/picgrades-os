// Step 103: "Try your photos" for every template — the couple's choices laid over the real template, never a copy of its design.
// A template's choices (one set per template, kept in the wedding's versions):
//   photos { spot: photoId } · hide [spot] · names · date · colors { light, dark } · frame { spot: { fx, fy, z } } · motion 'off'
// The Template Studio templates (32-story-studio.js) already understand them. This file teaches the rest:
//   - canvas templates (34-canvas.js): the choices go into a copy of the design just before it is drawn
//   - Living Story and Editorial Album (30 / 31): the choices go into the story's photos and parts
// Each kind gives the editor (33-template-editor.js) the same things: mount() → { slots, photo, layers, refresh, destroy }, colors().
(function pgTune() {
  const clone = o => JSON.parse(JSON.stringify(o));
  const TYPE = { photo: 'Photo', title: 'Heading', text: 'Words', names: 'Names', date: 'Date line', action: 'Button', shape: 'Shape', art: 'Decoration', video: 'Video', card: 'Card', strip: 'Photo strip', blessings: 'Blessing', line: 'Line', icon: 'Icon' };
  const COLNAME = { bg: 'Background', ink: 'Words', acc: 'Accent', acc2: 'Second accent', card: 'Cards', sea: 'Extra' };
  const darkApp = () => document.documentElement.getAttribute('data-tkg-theme') === 'dark';

  // ---- canvas ----
  function overlayCanvas(doc, t, dark) {
    doc = clone(doc || { sections: [] }); t = t || {};
    const ph = t.photos || {}, hide = new Set(t.hide || []), fr = t.frame || {};
    doc.sections = (doc.sections || []).filter(s => !hide.has(s.id));
    doc.sections.forEach(s => {
      if (s.bg && s.bg.src && ph['bg-' + s.id]) s.bg.src = { k: 'id', id: ph['bg-' + s.id] };
      if (s.bg && fr['bg-' + s.id]) { const f = fr['bg-' + s.id]; s.bg.fx = f.fx; s.bg.fy = f.fy; s.bg.z = f.z; }
      (s.els || []).forEach(e => {
        if (e.t === 'photo' && ph[e.id]) e.src = { k: 'id', id: ph[e.id] };
        if (e.t === 'photo' && fr[e.id]) { const f = fr[e.id]; e.s = Object.assign({}, e.s, { fx: f.fx, fy: f.fy, zm: f.z }); if (e.sl) e.sl = Object.assign({}, e.sl, { fx: f.fx, fy: f.fy, zm: f.z }); }
        if (hide.has(e.id)) { e.p = Object.assign({}, e.p, { hide: true }); if (e.l) e.l = Object.assign({}, e.l, { hide: true }); }
      });
    });
    const c = (t.colors || {})[dark ? 'dark' : 'light'];
    if (c) doc.colors = Object.assign({}, doc.colors, c);
    return doc;
  }
  function overlayWords(D, t) {
    if (!t) return D; D = Object.assign({}, D);
    if (t.names) D.names = t.names;
    if (t.date) { D.date = t.date; D.place = ''; }
    return D;
  }
  function sectionName(s, i) {
    const has = k => (s.els || []).some(e => e.t === k);
    return has('names') ? 'Opening' : has('card') ? 'Cards' : (s.els || []).some(e => e.t === 'action' && /reel|post/.test(e.act || '')) ? 'Make something' : 'Part ' + (i + 1);
  }
  function mountCanvas(box, D, act, o) {
    const t = o.tune || {}, base = o.doc || (t.doc) || { sections: [] };
    const doc = overlayCanvas(base, t, o.dark != null ? o.dark : darkApp());
    const inst = PGCanvas.render(box, doc, overlayWords(D, t), act || (() => {}), { scroller: o.scroller, still: t.motion === 'off', width: o.width, mode: o.mode });
    const shown = id => { const im = box.querySelector('.pgc-el[data-el="' + CSS.escape(id) + '"] img[data-photo]'); return im ? im.dataset.photo : ''; };
    const bgShown = id => { const im = box.querySelector('.pgc-sec[data-sec="' + CSS.escape(id) + '"] .pgc-bgimg'); return im ? im.dataset.photo : ''; };
    if (o.pick) box.addEventListener('click', ev => {   // tap a photo on the page → choose another
      const el = ev.target.closest('.pgc-t-photo'), sec = !el && ev.target.closest('.pgc-sec');
      if (el && el.dataset.el) { ev.preventDefault(); ev.stopPropagation(); o.pick(el.dataset.el); return; }
      if (sec && sec.querySelector(':scope > .pgc-bgimg, .pgc-bgimg') && !ev.target.closest('.pgc-el')) { ev.preventDefault(); o.pick('bg-' + sec.dataset.sec); }
    }, true);
    return {
      slots() {
        const out = [];
        (base.sections || []).forEach((s, i) => {
          if (s.bg && s.bg.src) out.push({ k: 'bg-' + s.id, label: sectionName(s, i) + ' · background', id: bgShown(s.id) });
          (s.els || []).filter(e => e.t === 'photo').sort((a, b) => ((a.p || {}).y || 0) - ((b.p || {}).y || 0)).forEach((e, j) => out.push({ k: e.id, label: sectionName(s, i) + ' · photo ' + (j + 1), id: shown(e.id) }));
        });
        return out.filter(x => x.id || !(t.hide || []).includes(x.k));
      },
      photo: k => (/^bg-/.test(k) ? bgShown(k.slice(3)) : shown(k)),
      layers() {
        const out = [];
        (base.sections || []).forEach((s, i) => {
          out.push({ key: s.id, name: sectionName(s, i), depth: 0 });
          (s.els || []).forEach(e => out.push({ key: e.id, name: e.name || (TYPE[e.t] || 'Part') + (e.t === 'action' && e.act ? ' · ' + ((PGCanvas.LABEL || {})[e.act] || e.act) : ''), depth: 1 }));
        });
        return out;
      },
      refresh() {}, destroy() { if (inst && inst.destroy) inst.destroy(); }
    };
  }
  function canvasColors(doc, dark) { return Object.keys((doc && doc.colors) || {}).filter(k => COLNAME[k]).map(k => ({ k, name: COLNAME[k], value: doc.colors[k] })); }

  // ---- Living Story / Editorial Album ----
  const STORY = { living: () => window.PGStoryLiving, editorial: () => window.PGStoryEditorial };
  function storyCover(D) {
    if (Array.isArray(D.cover) && D.cover.length) return D.cover.slice();
    const out = []; (D.events || []).forEach(e => { const f = (e.featured || [])[0] || ((e.photos || [])[0] || {}).id; if (f) out.push(f.id || f); }); return out;
  }
  function overlayStory(D, t) {
    D = overlayWords(D, t); const ph = (t && t.photos) || {}; if (!Object.keys(ph).length) return D;
    D = Object.assign({}, D);
    const cover = storyCover(D); Object.keys(ph).forEach(k => { const m = /^cover-(\d+)$/.exec(k); if (m) cover[+m[1]] = ph[k]; }); D.cover = cover.filter(Boolean);
    D.events = (D.events || []).map((e, i) => { const f = ((e.featured && e.featured.length) ? e.featured : (e.photos || []).map(p => p.id || p)).slice(); let ch = false;
      Object.keys(ph).forEach(k => { const m = /^ev-(\d+)-(\d+)$/.exec(k); if (m && +m[1] === i) { f[+m[2]] = ph[k]; ch = true; } }); return ch ? Object.assign({}, e, { featured: f.filter(Boolean) }) : e; });
    if (ph.bride || ph.groom) D.couple = Object.assign({}, D.couple, ph.bride ? { bride: ph.bride } : {}, ph.groom ? { groom: ph.groom } : {});
    return D;
  }
  function mountStory(kind, box, D, act, o) {
    const mod = STORY[kind](), t = o.tune || {}, D2 = overlayStory(D, t);
    box.classList.add('pgs-inbox');
    mod.render(box, D2, act || (() => {}), { first: false, scroller: o.scroller, galleryId: typeof GALLERY_ID !== 'undefined' ? GALLERY_ID : '' });
    const hid = new Set(t.hide || []), secs = (t.sections || []).filter(q => !hid.has(q.k)).concat([...hid].map(k => ({ k, on: false })));
    if (window.PGLayout && PGLayout.storyTune) PGLayout.storyTune(box, Object.assign({}, t, { sections: secs }));
    const slotsOf = () => {
      const out = [], cover = storyCover(D2);
      cover.slice(0, 3).forEach((id, i) => out.push({ k: 'cover-' + i, label: 'Cover · photo ' + (i + 1), id }));
      (D2.events || []).forEach((e, i) => { const f = (e.featured && e.featured.length ? e.featured : (e.photos || []).map(p => p.id || p)); f.slice(0, 3).forEach((id, j) => out.push({ k: 'ev-' + i + '-' + j, label: e.name + ' · photo ' + (j + 1), id: id && (id.id || id) })); });
      if (D2.couple && D2.couple.bride) out.push({ k: 'bride', label: 'Bride portrait', id: D2.couple.bride });
      if (D2.couple && D2.couple.groom) out.push({ k: 'groom', label: 'Groom portrait', id: D2.couple.groom });
      return out;
    };
    if (o.pick) box.addEventListener('click', ev => {
      const im = ev.target.closest('img'); const id = im && (im.dataset.pid || im.dataset.photoId); if (!id) return;
      const s = slotsOf().find(x => x.id === id); if (s) { ev.preventDefault(); ev.stopPropagation(); o.pick(s.k); }
    }, true);
    return {
      slots: slotsOf,
      photo: k => (slotsOf().find(x => x.k === k) || {}).id || '',
      layers: () => (PGLayout.storyPartsOf ? PGLayout.storyPartsOf(box) : []).filter(p => !p.fixed).map(p => ({ key: p.k, name: p.name, depth: 0 })),
      refresh() {}, destroy() { if (mod.destroy) mod.destroy(); }
    };
  }

  // ---- the editor's door ----
  const isStudio = k => !!(window.PGStoryStudio && PGStoryStudio.mods[k]);
  function handles(kind) { return isStudio(kind) || kind === 'canvas' || !!STORY[kind]; }
  function mount(kind, box, D, act, o) {
    if (isStudio(kind)) return PGStoryStudio.mount(kind, box, D, act, o);
    if (kind === 'canvas') return mountCanvas(box, D, act, o);
    return mountStory(kind, box, D, act, o);
  }
  function colors(kind, dark, doc) { return isStudio(kind) ? PGStoryStudio.colors(kind, dark) : kind === 'canvas' ? canvasColors(doc, dark) : []; }
  const canFrame = kind => isStudio(kind);   // Move & zoom on the page itself: the studio templates (canvas has it in the Advanced editor)

  window.PGTune = { handles, mount, colors, canFrame, overlayCanvas, overlayStory, overlayWords };
})();
