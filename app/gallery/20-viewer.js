// Photo view styles (step 38). Chosen for the wedding in the Control Panel (Look › Photo view):
//   live    — the current full-screen view with the filmstrip (default)
//   classic — a traditional gallery view, like Pixieset: the photo clean in the middle on the page colour,
//             arrows left and right (swipe on a phone, arrow keys on a laptop), the event name and "3 / 48" at the top,
//             heart, notes, share and download in the top bar. No filmstrip.
// Classic opens over the page you came from (the event's grid stays underneath); close or back returns to it.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgClassicViewer() {
  const STYLES = ['live', 'classic'];
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  function style() {
    const q = new URLSearchParams(location.search).get('viewerstyle');
    const w = (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.pages) || {};
    return STYLES.indexOf(q) > -1 ? q : STYLES.indexOf(w.viewer) > -1 ? w.viewer : 'live';
  }
  const IC = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
  };
  let S = null;   // { name, photos, i, el }
  const cur = () => S && pgMoment(S.photos[S.i], S.name, S.i + 1, S.photos.length);

  function paint() {
    if (!S) return;
    const p = S.photos[S.i], el = S.el, img = el.querySelector('.pgcv-img');
    img.classList.remove('in'); img.alt = S.name + ' · photo ' + (S.i + 1);
    img.onerror = function () { this.onerror = null; this.src = pgImgFallback(p.id, PG_FULL_W); };
    img.onload = () => img.classList.add('in');
    img.src = pgImg(p.id, PG_FULL_W);
    el.querySelector('.pgcv-count').textContent = (S.i + 1) + ' / ' + S.photos.length;
    el.querySelector('.pgcv-prev').disabled = S.i === 0; el.querySelector('.pgcv-next').disabled = S.i === S.photos.length - 1;
    counts();
    document.dispatchEvent(new CustomEvent('pg:classic-photo', { detail: { photo: cur(), el: el.querySelector('.pgcv-stage') } }));   // notes on the photo (26-comments.js)
    [S.i - 1, S.i + 1].forEach(j => { const q = S.photos[j]; if (q) { const pre = new Image(); pre.src = pgImg(q.id, PG_FULL_W); } });   // the next photo is ready when you swipe
  }
  function counts() {
    if (!S) return;
    const id = S.photos[S.i].id, likes = (GALLERY.likes || {})[id] || 0, notes = (GALLERY.notes || {})[id] || 0;
    const lk = S.el.querySelector('.pgcv-like'); lk.classList.toggle('liked', !!(GALLERY.mine || {})[id]);
    lk.querySelector('span').textContent = likes || ''; S.el.querySelector('.pgcv-note span').textContent = notes || '';
  }
  function go(d) { if (!S) return; const j = S.i + d; if (j < 0 || j >= S.photos.length) return; S.i = j; paint(); }

  function open(name, idx) {
    const ev = (GALLERY.personal || []).concat(GALLERY.events || []).find(e => e.name === name);
    if (!ev || !ev.photos.length) return false;
    close();
    const el = h('div', 'pgcv'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', name + ' photos');
    el.innerHTML = '<div class="pgcv-top"><button type="button" class="pgcv-x" aria-label="Close">' + IC.x + '</button>' +
      '<div class="pgcv-title"><b>' + pgEsc(name) + '</b><span class="pgcv-count"></span></div>' +
      '<div class="pgcv-acts"><button type="button" class="pgcv-btn pgcv-like" aria-label="Like">' + ICON_HEART_OUTLINE + ICON_HEART_FILLED + '<span></span></button>' +
      '<button type="button" class="pgcv-btn pgcv-note" aria-label="Notes">' + ICON_NOTE + '<span></span></button>' +
      '<button type="button" class="pgcv-btn pgcv-share" aria-label="Share">' + ICON_SEND + '</button>' +
      '<button type="button" class="pgcv-btn pgcv-dl" aria-label="Download photo">' + IC.dl + '</button></div></div>' +
      '<div class="pgcv-stage"><img class="pgcv-img" alt="" decoding="async"></div>' +
      '<button type="button" class="pgcv-arrow pgcv-prev" aria-label="Previous photo">' + IC.prev + '</button>' +
      '<button type="button" class="pgcv-arrow pgcv-next" aria-label="Next photo">' + IC.next + '</button>';
    S = { name, photos: ev.photos.slice(), i: Math.max(0, Math.min(idx || 0, ev.photos.length - 1)), el };
    el.querySelector('.pgcv-x').addEventListener('click', close);
    el.querySelector('.pgcv-prev').addEventListener('click', () => go(-1));
    el.querySelector('.pgcv-next').addEventListener('click', () => go(1));
    el.querySelector('.pgcv-like').addEventListener('click', () => pgToggleLike(cur()));
    el.querySelector('.pgcv-note').addEventListener('click', () => { const m = cur(); openNotes(m, m.title); });
    el.querySelector('.pgcv-share').addEventListener('click', () => pgShare());
    el.querySelector('.pgcv-dl').addEventListener('click', () => pgDownload(cur()));
    // swipe on a phone; double-tap = heart (same as everywhere else)
    const stage = el.querySelector('.pgcv-stage'); let x0 = null, y0 = 0, lastTap = 0;
    stage.addEventListener('touchstart', e => { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (x0 == null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });
    stage.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 400) { const pop = h('div', 'pgm-pop'); pgDoubleTapLike(cur(), pop); stage.appendChild(pop); setTimeout(() => pop.remove(), 850); lastTap = 0; } else lastTap = now;
    });
    document.body.appendChild(el); document.body.classList.add('pgcv-on');
    paint();
    return true;
  }
  function close() { if (!S) return; S.el.remove(); S = null; document.body.classList.remove('pgcv-on'); document.dispatchEvent(new CustomEvent('pg:classic-photo', { detail: {} })); }
  document.addEventListener('keydown', e => {
    if (!S || document.querySelector('.reg-overlay.show')) return;
    if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'Escape') close();
  });
  pgAfter('syncCounts', counts);   // hearts / notes changed somewhere → this view shows them too

  // every way into a photo goes through openCollection: with the classic style, open this view instead
  const live = window.openCollection;
  window.openCollection = function (name, idx) {
    if (style() === 'classic' && open(name, idx)) return;
    return live.apply(this, arguments);
  };
  window.pgViewerClassic = { style, open, close, photo: () => (S ? cur() : null), current: () => (S ? { name: S.name, i: S.i, n: S.photos.length } : null) };
})();
