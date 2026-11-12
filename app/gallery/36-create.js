// Reel Edits and Post Edits after Find me (step 58).
//   · A guest sees Reel Edits / Post Edits only after Find me has found them; before that they appear on no layout.
//     The couple, the photographer and PicGrades always have them. A demo wedding has them too (to try the makers with the
//     demo photos: saving and sharing are off there).
//   · Find me is used once: afterwards its tile becomes "Your photos" (24-rules.js). When the guest opens their photos
//     ("Your photos", "Maybe you" or a set they saved), a pinned bar offers Make a Reel / Make a Post with those photos.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgCreate() {
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const can = () => {
    if (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.demo) return true;
    return !!(window.PGRules && (PGRules.free() || PGRules.found()));
  };
  let last = null;
  function paint() {
    const v = can(); document.body.classList.toggle('pg-can-create', v);
    // the role (couple link, staff login) or a Find me result can arrive after the Hub was drawn: draw it again once
    if (last !== null && v !== last && window.PGLayout && PGLayout.refresh && document.body.dataset.view === 'hub') { last = v; setTimeout(() => PGLayout.refresh(), 0); return; }
    last = v;
  }
  ['pgRenderHub', 'renderGalleries', 'switchView'].forEach(n => pgAfter(n, paint));

  // ---- the pinned bar on the guest's own photos ----
  const REEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8h18M8 3l3 5M14 3l3 5"/><path d="M10 12v5l4-2.5z"/></svg>';
  const POST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="13" height="16" rx="2"/><path d="M19 7v10M22 9v6"/></svg>';
  let bar = null;
  const mineSet = name => { const s = (GALLERY.personal || []).find(x => x.name === name); return s && (s.personal || s.saved || s.code || name === 'Your photos' || name === 'Maybe you') ? s : null; };
  function show(name, photos) {
    hide(); if (!can()) return;
    const set = mineSet(name); if (!set) return;
    const list = (photos && photos.length ? photos : set.photos) || []; if (!list.length) return;
    bar = h('div', 'pgcr-bar', '<span>Make something with your photos</span><button type="button" data-k="reel">' + REEL + 'Make a Reel</button><button type="button" data-k="post">' + POST + 'Make a Post</button>');
    bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Create with your photos');
    bar.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; if (b.dataset.k === 'reel') pgOpenReel(list); else pgOpenPost(list.slice(0, 1)); });
    document.body.appendChild(bar); document.body.classList.add('pg-crbar');
  }
  function hide() { if (bar) { bar.remove(); bar = null; } document.body.classList.remove('pg-crbar'); }
  const open0 = window.pgOpenEvent;
  if (open0) window.pgOpenEvent = function (name, photos) { const r = open0.apply(this, arguments); if (document.body.dataset.view === 'event') show(name, photos); return r; };
  pgAfter('switchView', v => { if (v !== 'event' && v !== 'viewer') hide(); });

  paint();
  window.PGCreate = { can, paint };
})();
