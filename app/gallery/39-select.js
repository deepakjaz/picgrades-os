// Pick many photos at once (step 63a): on an event page the couple, the photographer and PicGrades press and hold a photo
// (or tap "Select"), tap more, then add them all to the Wedding Highlights or to this event's highlights in one go.
// Guests never see it. Uses the same saving as the Story picks (29-story-picks.js), so the 15-photo limits stay.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgSelect() {
  const MAX = 15;
  const view = document.getElementById('view-event'); if (!view) return;
  const can = () => !!(window.PGStoryPicks && PGStoryPicks.canPick());
  let on = false, sel = [];
  const ev = () => (window.pgEventNow && pgEventNow()) || null;
  const isWedding = () => { const e = ev(); return !!(e && (GALLERY.events || []).some(x => x.name === e.name)); };
  const idOf = cell => { const e = ev(); return e && e.photos[+cell.dataset.i] ? e.photos[+cell.dataset.i].id : ''; };

  // the "Select" button next to the photos-per-row control
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pgsel-btn'; btn.textContent = 'Select';
  btn.addEventListener('click', () => (on ? stop() : start()));
  view.querySelector('.pgx-bar').appendChild(btn);

  const bar = document.createElement('div'); bar.className = 'pgsel-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Selected photos');
  document.body.appendChild(bar);

  function paintBar() {
    const e = ev(), P = PGStoryPicks.picks(), wh = P.wh.length, hl = e ? (P.hl[e.name] || []).length : 0;
    bar.innerHTML = '<div class="pgsel-top"><b>' + (sel.length ? sel.length + ' selected' : 'Tap photos to select') + '</b><button type="button" data-a="x">Cancel</button></div>' +
      '<div class="pgsel-acts"><button type="button" data-a="wh"' + (sel.length ? '' : ' disabled') + '>Add to Wedding Highlights <small>' + wh + ' / ' + MAX + '</small></button>' +
      (isWedding() ? '<button type="button" data-a="hl"' + (sel.length ? '' : ' disabled') + '>Add to ' + pgEsc(e.name) + ' highlights <small>' + hl + ' / ' + MAX + '</small></button>' : '') + '</div>';
  }
  function paintCells() { view.querySelectorAll('.pgx-cell').forEach(c => c.classList.toggle('pgsel-on', sel.indexOf(idOf(c)) > -1)); }
  function start(firstCell) {
    if (!can()) return;
    on = true; sel = []; document.body.classList.add('pgsel-mode'); btn.textContent = 'Done';
    if (firstCell) { const id = idOf(firstCell); if (id) sel.push(id); }
    paintBar(); paintCells();
  }
  function stop() { on = false; sel = []; document.body.classList.remove('pgsel-mode'); btn.textContent = 'Select'; paintCells(); }

  bar.addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'); if (!b || b.disabled) return;
    if (b.dataset.a === 'x') return stop();
    const P = PGStoryPicks.picks(), name = (ev() || {}).name;
    const list = b.dataset.a === 'wh' ? P.wh : (P.hl[name] || []).slice();
    const fresh = sel.filter(id => list.indexOf(id) < 0), room = MAX - list.length;
    if (!fresh.length) { showToast('These photos are already in'); return stop(); }
    if (room <= 0) { showToast('Already ' + MAX + ' — remove some in Control Panel › Story first'); return; }
    const add = fresh.slice(0, room); add.forEach(id => list.push(id));
    if (b.dataset.a === 'hl') P.hl[name] = list;
    const where = b.dataset.a === 'wh' ? 'Wedding Highlights' : name + ' highlights';
    PGStoryPicks.save(P).then(() => showToast(add.length + ' added to ' + where + (add.length < fresh.length ? ' (the limit is ' + MAX + ')' : ''))).catch(() => {});
    stop();
  });

  // in select mode a tap selects instead of opening the photo
  view.addEventListener('click', e => {
    if (!on) return; const c = e.target.closest('.pgx-cell'); if (!c) return;
    e.stopPropagation(); e.preventDefault();
    if (held) { held = false; return; }   // the release of the press-and-hold is not a tap
    const id = idOf(c), i = sel.indexOf(id); if (!id) return;
    if (i > -1) sel.splice(i, 1); else sel.push(id);
    c.classList.toggle('pgsel-on', i < 0); paintBar();
  }, true);

  // press and hold a photo (about half a second) starts select mode with that photo
  let t = 0, held = false, x0 = 0, y0 = 0;
  const cancel = () => clearTimeout(t);
  view.addEventListener('pointerdown', e => {
    if (on || !can()) return; const c = e.target.closest('.pgx-cell'); if (!c) return;
    held = false; x0 = e.clientX; y0 = e.clientY;
    t = setTimeout(() => { held = true; start(c); if (navigator.vibrate) navigator.vibrate(15); }, 480);
  });
  view.addEventListener('pointermove', e => { if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 10) cancel(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => view.addEventListener(k, cancel));
  view.addEventListener('pointerup', () => { if (held) setTimeout(() => { held = false; }, 400); });   // some phones send no tap after a long press
  view.addEventListener('contextmenu', e => { if (can() && e.target.closest('.pgx-cell')) e.preventDefault(); });

  // leaving the event page ends select mode
  const stopIfAway = () => { if (on && !view.classList.contains('active')) stop(); };
  new MutationObserver(stopIfAway).observe(view, { attributes: true, attributeFilter: ['class'] });
  window.PGSelect = { start, stop, on: () => on, selected: () => sel.slice() };
})();
