// Photo grids (step 35): the classic gallery page for each event (like Pixieset) and Moments as an Instagram-style grid.
// 2 photos in a row by default; the guest chooses up to 5 (the buttons, or pinch with two fingers). Each phone remembers its choice.
// Bigger screens show more in a row (tablet +2, laptop / TV +4). Tapping a photo opens it the same way as today:
// the full-screen viewer for an event, the Root Moment feed for Moments.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgGrids() {
  const MIN = 2, MAX = 5;
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  let cols = Math.min(MAX, Math.max(MIN, parseInt(store('pg_cols'), 10) || MIN));
  const colsNow = () => { const w = window.innerWidth; return cols + (w >= 1100 ? 4 : w >= 600 ? 2 : 0); };
  const thumbW = () => { const c = colsNow(), px = Math.min(window.innerWidth, 1600) / c; return px > 260 ? 800 : px > 160 ? 500 : 360; };
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // ---- columns: buttons + pinch ----
  const grids = new Set();
  function paintCols() {
    document.querySelectorAll('.pgx-grid').forEach(g => { g.style.setProperty('--c', colsNow()); g.dataset.cols = cols; });
    document.querySelectorAll('.pgx-cols button').forEach(b => { const on = +b.dataset.n === cols; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function setCols(n) { n = Math.min(MAX, Math.max(MIN, n)); if (n === cols) return; cols = n; store('pg_cols', String(n)); paintCols(); grids.forEach(fn => fn()); }
  function colsControl(dark) {
    const box = h('div', 'pgx-cols' + (dark ? ' dark' : '')); box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Photos in a row');
    for (let n = MIN; n <= MAX; n++) {
      const b = h('button', '', '<span>' + '<i></i>'.repeat(n) + '</span>'); b.type = 'button'; b.dataset.n = n;
      b.setAttribute('aria-label', n + ' in a row'); b.title = n + ' in a row'; b.addEventListener('click', () => setCols(n)); box.appendChild(b);
    }
    return box;
  }
  function pinch(el) {
    let d0 = 0, done = false;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    el.addEventListener('touchstart', e => { if (e.touches.length === 2) { d0 = dist(e.touches); done = false; } }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (e.touches.length !== 2 || !d0 || done) return;
      const k = dist(e.touches) / d0;
      if (k < 0.75) { setCols(cols + 1); done = true; } else if (k > 1.33) { setCols(cols - 1); done = true; }
    }, { passive: true });
    el.addEventListener('touchend', () => { d0 = 0; }, { passive: true });
    // the pinch changes the grid, not the page zoom (iPhone Safari zooms the page otherwise)
    el.addEventListener('gesturestart', e => e.preventDefault()); el.addEventListener('gesturechange', e => e.preventDefault());
    el.addEventListener('touchmove', e => { if (e.touches.length === 2 && e.cancelable) e.preventDefault(); }, { passive: false });
  }
  window.addEventListener('resize', () => { paintCols(); grids.forEach(fn => fn()); });

  // one grid: items = [{ src(w), video, alt }], open(i)
  function grid(items, open) {
    const g = h('div', 'pgx-grid'); g.style.setProperty('--c', colsNow());
    items.forEach((it, i) => {
      const b = h('button', 'pgx-cell' + (it.video ? ' is-video' : '')); b.type = 'button'; b.setAttribute('aria-label', it.alt || 'Photo ' + (i + 1));
      const img = h('img'); img.alt = ''; img.loading = i < 12 ? 'eager' : 'lazy'; img.decoding = 'async'; img.src = it.src(thumbW());
      if (it.fallback) img.onerror = function () { this.onerror = null; this.src = it.fallback(thumbW()); };
      b.appendChild(img);
      if (it.video) b.appendChild(h('span', 'pgx-play', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'));
      b.addEventListener('click', () => open(i));
      g.appendChild(b);
    });
    pinch(g);
    return g;
  }
  const photoItems = photos => photos.map((p, i) => ({ src: w => pgImg(p.id, w), fallback: w => pgImgFallback(p.id, w), alt: 'Photo ' + (i + 1) }));

  // ---- the event page ----
  const view = h('section', 'pg-view'); view.id = 'view-event'; view.setAttribute('aria-label', 'Event photos');
  view.innerHTML = '<div class="pgx-page"><div class="pgx-top"><button type="button" class="pgx-back" aria-label="All events"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg><span>Events</span></button></div>' +
    '<header class="pgx-head"><div class="pg-module-eyebrow" id="pgxEyebrow"></div><h2 class="pg-module-title" id="pgxTitle"></h2><p class="pgx-sub" id="pgxSub"></p></header>' +
    '<div class="pgx-bar"></div><div class="pgx-body"></div></div>';
  const home = document.getElementById('view-gallery'); home.parentNode.insertBefore(view, home.nextSibling);
  view.querySelector('.pgx-bar').appendChild(colsControl(false));
  view.querySelector('.pgx-back').addEventListener('click', () => switchView('gallery'));
  let EV = null;   // { name, photos, temp }
  function paintEvent() {
    if (!EV) return;
    const body = view.querySelector('.pgx-body'); body.innerHTML = '';
    body.appendChild(grid(photoItems(EV.photos), i => openPhoto(i)));
  }
  grids.add(paintEvent);
  function findSet(name) { return (GALLERY.personal || []).concat(GALLERY.events || []).find(e => e.name === name) || null; }
  function openPhoto(i) {
    // a set that is not one of the wedding's own (Loved photos) is added for this viewing only, like before
    if (!findSet(EV.name)) { GALLERY.personal = (GALLERY.personal || []).filter(x => !x.pgxTemp).concat([{ name: EV.name, photos: EV.photos, pgxTemp: true }]); openCollection(EV.name, i); GALLERY.personal = GALLERY.personal.filter(x => !x.pgxTemp); }
    else openCollection(EV.name, i);
  }
  // open an event (or any set of photos) as a grid page
  window.pgOpenEvent = function (name, photos) {
    const ev = findSet(name); photos = photos || (ev && ev.photos) || [];
    if (!photos.length) { showToast('No photos here yet'); return; }
    EV = { name, photos };
    document.getElementById('pgxEyebrow').textContent = GALLERY.title || '';
    document.getElementById('pgxTitle').textContent = name;
    document.getElementById('pgxSub').textContent = photos.length + (photos.length === 1 ? ' photo' : ' photos') + (GALLERY.studio ? ' · Photographed by ' + GALLERY.studio : '');
    paintEvent(); paintCols(); switchView('event');
  };
  // the viewer's back arrow returns to the grid it came from
  window.pgViewerBackTo = () => (EV && CURRENT_SET === EV.name ? 'event' : 'gallery');

  // ---- Moments: grid first, tap = the Root Moment feed at that photo ----
  const mv = document.getElementById('view-moments'), feed = document.getElementById('pgmFeed');
  const mwrap = h('div', 'pgx-mgrid'); mv.insertBefore(mwrap, feed);
  const mbar = h('div', 'pgx-mbar'); mbar.appendChild(colsControl(true)); mwrap.appendChild(mbar);
  const mbody = h('div', 'pgx-mbody'); mwrap.appendChild(mbody);
  const toGrid = h('button', 'pgm-chip pgx-togrid', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>');
  toGrid.type = 'button'; toGrid.setAttribute('aria-label', 'Back to the grid');
  const headR = mv.querySelector('.pgm-head-r'); if (headR) headR.insertBefore(toGrid, headR.firstChild);
  let feedCloser = null;
  function showGrid() { document.body.classList.add('pgm-grid'); if (feedCloser) { const c = feedCloser; feedCloser = null; pgBackDrop(c); } }
  function showFeed(i) {
    document.body.classList.remove('pgm-grid');
    const it = feed.children[i]; if (it) feed.scrollTop = it.offsetTop;
    if (!feedCloser) { feedCloser = () => { feedCloser = null; document.body.classList.add('pgm-grid'); }; pgBackPush(feedCloser); }
  }
  toGrid.addEventListener('click', showGrid);
  function paintMoments() {
    const items = Array.from(feed.children).filter(x => x.classList.contains('pgm-item') || x.querySelector('img,video'));
    mbody.innerHTML = '';
    if (!items.length) { mbody.innerHTML = '<div class="pgm-empty">The Root Moment is being prepared. Open the Gallery to see all photos.</div>'; return; }
    mbody.appendChild(grid(items.map((x, i) => {
      // the feed unloads far-away photos to save iPhone memory, so the grid asks for each photo by its id
      const img = x.querySelector('img.pgm-img') || x.querySelector('img'), vid = x.querySelector('video'), pid = x.dataset.pid;
      const raw = (img && img.getAttribute('src')) || (vid && vid.getAttribute('poster')) || '';
      return { src: w => (pid && !vid ? pgImg(pid, w) : raw.replace(/=w\d+/, '=w' + w)), fallback: pid ? w => pgImgFallback(pid, w) : null, video: !!vid, alt: 'Moment ' + (i + 1) };
    }), i => showFeed(Array.from(feed.children).indexOf(items[i]))));
  }
  grids.add(paintMoments);
  let t = null; new MutationObserver(() => { clearTimeout(t); t = setTimeout(paintMoments, 60); }).observe(feed, { childList: true });
  document.body.classList.add('pgm-grid');
  // opening Moments from the bar always starts at the grid
  pgAfter('switchView', v => { if (v === 'moments') showGrid(); else if (v !== 'moments' && feedCloser) showGrid(); });
  paintCols();
  window.PGGrids = { cols: () => cols, setCols, colsNow };
})();
