// Feature switches (step 33): each function of the wedding app can be on or off. Root Moment itself is always on.
// The backend sends GALLERY.features = { findme, reel, post, upload, notes, hearts, download, share, install } → 'on' | 'off' | 'locked'.
// 'locked' = PicGrades has not given this function (by plan); it behaves like off and the couple cannot switch it on.
// Off means gone everywhere: its buttons and Hub blocks hide, and the function itself refuses to run (double-tap heart, etc.).
// The couple, the photographer and PicGrades switch them in the Control Panel (the gear in the bottom bar, 17-control.js).
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
    notes: '.pgcv-note,#pgvNote,#mkCommentBtn,.pgm-actions [aria-label="Moment Notes"],#pghNotesSec,.pgl-notes',
    hearts: '.pgcv-like,#pgvLike,.pgm-like,#pghLovedSec,.pgl-loved,.pgh-heart',
    download: '.pgcv-dl,#pgvSave,.pgm-actions [aria-label="Download photo"]',
    share: '.pgcv-share,#pgvShare,.pgm-actions [aria-label="Share"]',
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

  pgAfter('pgRenderHub', () => { if (!GALLERY.features) GALLERY.features = {}; paint(); guards(); });
  window.PGFeatures = { keys: () => KEYS.map(k => k[0]), list: () => KEYS.map(k => k.slice()), on, paint };
})();
