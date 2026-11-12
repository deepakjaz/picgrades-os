// Step 61b: the photo viewer
//   · swipe the big photo left / right for the next / previous photo (up / down keeps working, like the filmstrip)
//   · a play button: a slideshow of the collection being viewed (3.5 s a photo, loops, keeps the screen on);
//     any touch, key or leaving the viewer stops it
//   · the ⓘ details panel (date, couple, story) is for the photographer and PicGrades only (CSS)
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgViewerPlay() {
  const $ = id => document.getElementById(id), feed = $('pgvFeed'), view = $('view-root');
  if (!feed || !view) return;

  // ---- swipe left / right ----
  let sx = 0, sy = 0, st = 0, multi = false;
  feed.addEventListener('touchstart', e => { multi = e.touches.length > 1; if (multi) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }, { passive: true });
  feed.addEventListener('touchend', e => {
    if (multi || !e.changedTouches.length || (window.pgvIsZoomed && pgvIsZoomed())) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Date.now() - st > 800 || Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const n = MOMENTS.length; if (!n) return;
    const to = dx < 0 ? activeIdx + 1 : activeIdx - 1;   // finger to the left = the next photo, to the right = the previous one
    if (to < 0 || to >= n) return;
    selectMomentDirectly(to, true);
  }, { passive: true });

  // ---- slideshow ----
  const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pgv-ic pgv-play'; btn.id = 'pgvPlay';
  const r = document.querySelector('#pgvTop .pgv-top-r'); if (r) r.insertBefore(btn, r.firstChild);
  let timer = null, lock = null, moving = false;
  const STEP = 3500;
  function paint() { const on = !!timer; btn.innerHTML = on ? PAUSE : PLAY; btn.setAttribute('aria-label', on ? 'Pause the slideshow' : 'Play a slideshow'); btn.classList.toggle('on', on); document.body.classList.toggle('pgv-playing', on); }
  function next() {
    if (!view.classList.contains('active') || !MOMENTS.length) { stop(); return; }
    moving = true;
    try { selectMomentDirectly((activeIdx + 1) % MOMENTS.length, true); } finally { setTimeout(() => { moving = false; }, 900); }
  }
  function play() {
    if (timer || MOMENTS.length < 2) return;
    timer = setInterval(next, STEP); paint();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {}); } catch (e) {}
    if (window.showToast) showToast('Slideshow · tap the photo to stop');
  }
  function stop() { if (!timer) return; clearInterval(timer); timer = null; paint(); try { if (lock) lock.release(); } catch (e) {} lock = null; }
  btn.addEventListener('click', e => { e.stopPropagation(); if (timer) stop(); else play(); });
  // the guest takes over: any touch on the photos or the filmstrip, a key, or leaving the viewer
  ['pointerdown', 'touchstart', 'wheel'].forEach(ev => view.addEventListener(ev, e => { if (timer && !btn.contains(e.target)) stop(); }, { passive: true }));
  window.addEventListener('keydown', () => stop());
  pgAfter('switchView', () => { if (!view.classList.contains('active')) stop(); });
  pgAfter('useSet', () => stop());
  paint();
  window.PGPlay = { play, stop, playing: () => !!timer };
})();
