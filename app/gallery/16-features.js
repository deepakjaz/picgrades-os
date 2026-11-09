// Feature switches (step 33): each function of the wedding app can be on or off. Root Moment itself is always on.
// The backend sends GALLERY.features = { findme, reel, post, upload, notes, hearts, download, share, install } → 'on' | 'off' | 'locked'.
// 'locked' = PicGrades has not given this function (by plan); it behaves like off and the couple cannot switch it on.
// Off means gone everywhere: its buttons and Hub blocks hide, and the function itself refuses to run (double-tap heart, etc.).
// The couple switches them from the Hub ("Functions"); the photographer from their login (admin page). Both for now.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgFeatures() {
  const KEYS = [
    ['findme', 'Find me', 'Guests find their own photos by face'],
    ['reel', 'Reel Edits', 'Make reels with music'],
    ['post', 'Post Edits', 'Posts, carousels and album strips'],
    ['upload', 'Add a moment', 'Guests add photos and videos to Root Moment (you approve them)'],
    ['notes', 'Notes', 'Blessings and notes on photos'],
    ['hearts', 'Hearts', 'Double-tap to love a photo; Most loved'],
    ['download', 'Downloads', 'Save photos to the phone'],
    ['share', 'Share', 'Share the gallery link'],
    ['install', 'Add to Home Screen', 'Keep the gallery as an app']
  ];
  // what each function shows on screen (hidden when it is off)
  const HIDE = {
    findme: '[data-findme],#pgcFind,.pgm-findme,.pgl-findme,#fmReel,#fmPost',
    reel: '#pghReel,#fmReel,.pgl-reel,.pe-tab[data-mode=reel]',
    post: '#pgcPost,#fmPost,.pgl-post',
    upload: '#pgcUpload,#pgmAdd,.pgl-upload',
    notes: '#pgvNote,#mkCommentBtn,.pgm-actions [aria-label="Moment Notes"],#pghNotesSec,.pgl-notes',
    hearts: '#pgvLike,.pgm-like,#pghLovedSec,.pgl-loved,.pgh-heart',
    download: '#pgvSave,.pgm-actions [aria-label="Download photo"]',
    share: '#pgvShare,.pgm-actions [aria-label="Share"]',
    install: '#pghInstall,.pgl-install'
  };
  const on = k => !(typeof GALLERY !== 'undefined' && GALLERY && GALLERY.features && GALLERY.features[k] && GALLERY.features[k] !== 'on');
  window.pgFeatureOn = on;
  function paint() {
    let st = document.getElementById('pgFeatCss');
    if (!st) { st = document.createElement('style'); st.id = 'pgFeatCss'; document.head.appendChild(st); }
    st.textContent = KEYS.filter(([k]) => !on(k)).map(([k]) => HIDE[k] + '{display:none!important}').join('\n');
    KEYS.forEach(([k]) => document.body.classList.toggle('pg-off-' + k, !on(k)));
  }
  // the functions themselves refuse when off (covers double-tap, keyboard and calls from other screens)
  const guard = (name, k, msg) => {
    const fn = window[name]; if (typeof fn !== 'function' || fn.__pgGuard) return;
    const g = function () { if (!on(k)) { if (msg) showToast(msg); return; } return fn.apply(this, arguments); };
    g.__pgGuard = true; window[name] = g;
  };
  function guards() {
    guard('pgToggleLike', 'hearts'); guard('pgShare', 'share', 'Sharing is switched off for this gallery');
    guard('pgDownload', 'download', 'Downloads are switched off for this gallery'); guard('openNotes', 'notes');
    guard('pgOpenReel', 'reel', 'Reel Edits is switched off for this gallery'); guard('pgOpenPost', 'post', 'Post Edits is switched off for this gallery');
  }
  // anything tapped that belongs to a switched-off function does nothing
  document.addEventListener('click', e => {
    for (const [k] of KEYS) if (!on(k) && e.target.closest && e.target.closest(HIDE[k])) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  }, true);

  // ---- the couple's switches (Hub › Functions) ----
  let btn = null;
  function sheet() {
    const back = document.createElement('div'); back.className = 'overlay-backdrop show';
    const box = document.createElement('div'); box.className = 'reg-overlay show pgf-sheet'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Functions');
    const close = () => { box.remove(); back.remove(); };
    back.addEventListener('click', close);
    box.innerHTML = '<div class="reg-overlay-handle"></div><h3 class="fm-title">Functions</h3><p class="pgf-sub">Switch off anything you don’t want in your wedding app. Root Moment and your photos are always there. Changes reach every guest straight away.</p>';
    const list = document.createElement('div'); list.className = 'pgf-list';
    KEYS.forEach(([k, name, line]) => {
      const st = (GALLERY.features || {})[k] || 'on', locked = st === 'locked';
      const row = document.createElement('label'); row.className = 'pgf-row' + (locked ? ' locked' : '');
      row.innerHTML = '<div><b>' + name + '</b><small>' + (locked ? 'Not included in this gallery’s plan' : line) + '</small></div>';
      const sw = document.createElement('input'); sw.type = 'checkbox'; sw.className = 'pgf-sw'; sw.checked = st === 'on'; sw.disabled = locked; sw.dataset.k = k; sw.setAttribute('aria-label', name);
      sw.addEventListener('change', () => {
        const before = GALLERY.features[k]; GALLERY.features[k] = sw.checked ? 'on' : 'off'; paint(); if (window.pgRenderHub) pgRenderHub();
        pgApi('coupleFeatures', { features: JSON.stringify({ [k]: sw.checked ? 'on' : 'off' }) })
          .then(r => { GALLERY.features = r.features; paint(); showToast(name + (sw.checked ? ' is on' : ' is off')); })
          .catch(err => { GALLERY.features[k] = before; sw.checked = before === 'on'; paint(); if (window.pgRenderHub) pgRenderHub(); showToast(err.message); });
      });
      row.appendChild(sw); list.appendChild(row);
    });
    const done = document.createElement('button'); done.type = 'button'; done.className = 'mk-btn-peach ios-wide'; done.textContent = 'Done'; done.addEventListener('click', close);
    box.append(list, done); document.body.append(back, box);
  }
  function coupleButton() {
    if (btn || typeof GALLERY === 'undefined' || !GALLERY || GALLERY.isStudio || !(window.pgIsCouple ? pgIsCouple() : GALLERY.isCouple)) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pgf-open'; btn.id = 'pgfOpen';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg><span>Functions</span>';
    btn.addEventListener('click', sheet);
    document.getElementById('view-hub').appendChild(btn);
  }
  pgAfter('pgRenderHub', () => { if (!GALLERY.features) GALLERY.features = {}; paint(); guards(); coupleButton(); });
  const ci = window.pgCoupleInit;   // the couple link is confirmed a moment after the page opens
  window.pgCoupleInit = function () { const r = ci ? ci.apply(this, arguments) : undefined; coupleButton(); return r; };
  window.PGFeatures = { keys: () => KEYS.map(k => k[0]), on, paint, open: sheet };
})();
