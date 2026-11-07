// Photo viewer bar: counter, back, info, hearts in the viewer, keys and wheel.
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
(function pgViewerNav() {
  const view = document.getElementById('view-root'), hero = document.getElementById('pgvFeed'), body = document.body;
  const blur = document.getElementById('pgvBlur'), countEl = document.getElementById('pgvCount');
  const likeEl = document.getElementById('pgvLike'), likeCountEl2 = document.getElementById('pgvLikeCount'), noteCountEl2 = document.getElementById('pgvNoteCount');
  const isOn = () => view.classList.contains('active') && !document.querySelector('.reg-overlay.show') && !body.classList.contains('pgv-info');

  pgAfter('applyActiveMoment', () => {
    const m = MOMENTS[activeIdx]; if (!m) return;
    countEl.textContent = (activeIdx + 1) + ' / ' + MOMENTS.length;
    blur.style.backgroundImage = 'url("' + pgImg(m.id, 60) + '")';
    pgvSync();
  });
  function pgvSync() {
    const m = MOMENTS[activeIdx]; if (!m || !GALLERY) return;
    likeEl.classList.toggle('liked', !!(GALLERY.mine || {})[m.id]);
    likeCountEl2.textContent = (GALLERY.likes || {})[m.id] || '';
    noteCountEl2.textContent = (GALLERY.notes || {})[m.id] || '';
  }
  pgAfter('syncCounts', () => pgvSync());
  pgAfter('switchView', (key) => {
    body.classList.toggle('pgv-on', key === 'root');
    if (key !== 'root') body.classList.remove('pgv-info', 'pgv-clean');
  });

  function go(d) {
    if (!MOMENTS.length) return;
    const t = activeIdx + d;
    if (t < 0) { showToast('First photo of ' + CURRENT_SET); return; }
    if (t >= MOMENTS.length) { showToast('Last photo of ' + CURRENT_SET); return; }
    selectMomentDirectly(t, true);
  }
  // mouse wheel / trackpad: down = next, up = previous
  let acc = 0, lockUntil = 0, accTimer = null;
  view.addEventListener('wheel', (e) => {
    if (!isOn()) return;
    if (e.target.closest('.mk-filmstrip-rail, .mk-editorial-sheet')) return;
    if (e.ctrlKey || (window.pgvIsZoomed && pgvIsZoomed())) return; // zoom / pan
    e.preventDefault();
    if (Date.now() < lockUntil) return;
    acc += e.deltaY; clearTimeout(accTimer); accTimer = setTimeout(() => { acc = 0; }, 200);
    if (Math.abs(acc) >= 40) { go(acc > 0 ? 1 : -1); acc = 0; lockUntil = Date.now() + 450; }
  }, { passive: false });

  // touch: swipe up = next, swipe down = previous (left/right also works); tap = hide/show controls; double-tap = heart
  let sx = null, sy = 0, lastTouch = 0, lastTap = 0, tapTimer = null;
  function tap(x, y) {
    if (body.classList.contains('pgv-info')) { body.classList.remove('pgv-info'); return; }
    const now = Date.now();
    if (now - lastTap < 320) {
      clearTimeout(tapTimer); lastTap = 0;
      if (window.pgvZoomReset && pgvZoomReset()) return; // double-tap on a zoomed photo = back to whole photo
      const m = MOMENTS[activeIdx];
      if (m) {
        const p = document.createElement('div'); p.className = 'pgv-pop'; p.style.left = x + 'px'; p.style.top = y + 'px';
        pgDoubleTapLike(m, p); document.body.appendChild(p); setTimeout(() => p.remove(), 850);
      }
      return;
    }
    lastTap = now;
    tapTimer = setTimeout(() => body.classList.toggle('pgv-clean'), 320);
  }
  hero.addEventListener('click', (e) => { if (Date.now() - lastTouch < 700) return; tap(e.clientX, e.clientY); });

  window.addEventListener('keydown', (e) => {
    if (!view.classList.contains('active') || pgTyping(e)) return;
    if (e.key === 'Escape') { if (body.classList.contains('pgv-info')) body.classList.remove('pgv-info'); else switchView('gallery'); return; }
    if (!isOn()) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  });

  document.getElementById('pgvBack').addEventListener('click', () => switchView('gallery'));
  likeEl.addEventListener('click', () => { const m = MOMENTS[activeIdx]; if (m) pgToggleLike(m); });
  document.getElementById('pgvNote').addEventListener('click', () => document.getElementById('mkCommentBtn').click());
  document.getElementById('pgvShare').addEventListener('click', pgShare);
  document.getElementById('pgvInfo').addEventListener('click', () => body.classList.add('pgv-info'));
  document.getElementById('pgvInfoClose').addEventListener('click', () => body.classList.remove('pgv-info'));
  if (view.classList.contains('active')) body.classList.add('pgv-on');
})();
