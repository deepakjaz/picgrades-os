"""Builds app/gallery.html from the approved Gemini design (reference/gemini-root-moment-v11.html).
The design (CSS, layout, Root Moment reels/filmstrip engine) is kept as-is; only the demo
data and demo-only handlers are replaced with real data from the PicGrades OS backend.
Run: python3 tools/build_gallery.py reference/gemini-root-moment-v11.html app/gallery.html"""
import re, sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:80])
    s = s.replace(old, new)

# ---- title, header, stamp ----
s = re.sub(r'<title>.*?</title>', '<title>PicGrades · Wedding Gallery</title>', s, count=1, flags=re.S)
rep('<span>Aarav &amp; Kavya</span>', '<span id="pgCoupleTitle">Wedding Gallery</span>')
rep('<span>結婚</span>\n      <span>27</span>', '<span>結婚</span>\n      <span id="pgStampYear"></span>')

# ---- root moment demo copy ----
rep('<h1 class="mk-editorial-title" id="mkTitle">The First Shower of Marigolds (2027)</h1>', '<h1 class="mk-editorial-title" id="mkTitle"></h1>')
rep('<p class="mk-editorial-story" id="mkStory">In the courtyard at dawn...</p>', '<p class="mk-editorial-story" id="mkStory"></p>')
for a, b in [('id="mkMetaDate">25.01.27', 'id="mkMetaDate">'), ('id="mkMetaCouple">AARAV &amp; KAVYA', 'id="mkMetaCouple">'),
             ('id="mkMetaCategory">HALDI COURTYARD', 'id="mkMetaCategory">'), ('id="mkMetaCamera">FUJIFILM GFX 100', 'id="mkMetaCamera">'),
             ('id="mkMetaLens">50MM F/1.2 · PICGRADES WARM', 'id="mkMetaLens">')]:
    rep(a, b)
rep('<span id="mkLikeCount">48</span>', '<span id="mkLikeCount">0</span>')
rep('<span id="mkCommentCount">2</span>', '<span id="mkCommentCount">0</span>')
rep('<span id="mkNextMomentLabel">Scroll past end for Moment 2/12 ↓</span>\n        <span>Demo Preview</span>', '<span id="mkNextMomentLabel"></span>\n        <span id="pgSetLabel"></span>')
rep('<div class="mk-counter-num" id="mkCounterText">1/12</div>', '<div class="mk-counter-num" id="mkCounterText"></div>')

# ---- galleries view ----
rep('<div class="pg-module-eyebrow">Full Archive · Demo Preview</div>', '<div class="pg-module-eyebrow" id="pgGalleryEyebrow">Full Archive</div>')
rep('<p class="pg-module-sub">Tap any photograph below to open it directly inside the Root Moment filmstrip viewer. Scroll down this page to watch the TKG dock curl into its compact circle.</p>',
    '<p class="pg-module-sub">Every event of the day. Open a collection to see all its photos.</p>')

rep('<div class="pg-gallery-masonry" id="pgGalleryMasonry"></div>', '<div id="pgGalleryMasonry"></div>')

# ---- nav + buttons: Root Moment → TKG Moments reels ----
rep('<a href="#root" class="tkg-nav-item tkg-nav-moments active" data-nav="root" aria-label="Root Moment" title="Root Moment" aria-current="page">',
    '<a href="#moments" class="tkg-nav-item tkg-nav-moments active" data-nav="moments" aria-label="Root Moment" title="Root Moment" aria-current="page">')
rep('<button type="button" class="mk-btn-peach" data-goto="root">Open Root Moment →</button>', '<button type="button" class="mk-btn-peach" data-goto="moments">Open Root Moment →</button>')
rep('<button type="button" class="mk-btn-peach" data-goto="root">Return to Root Moment →</button>', '<button type="button" class="mk-btn-peach" data-goto="moments">Open Root Moment →</button>')
rep('<button type="button" class="mk-btn-peach" id="mkViewProjectBtn">View Event Gallery</button>', '<button type="button" class="mk-btn-peach" id="mkViewProjectBtn">← All collections</button>')
# the viewer opens as a collection gallery, not as the landing view
rep('<main class="pg-view active" id="view-root">', '<main class="pg-view" id="view-root">')
# TKG Moments reels view (Root Moment)
rep('<!-- ==================== VIEW 2: EVENT GALLERIES ==================== -->', '''<!-- ==================== ROOT MOMENT: TKG MOMENTS REELS ==================== -->
<section class="pg-view active" id="view-moments" aria-label="Root Moment">
  <div class="pgm-head"><div><div class="pgm-head-title" id="pgmTitle"></div><div class="pgm-head-sub" id="pgmSub">Root Moment</div></div></div>
  <div class="pgm-feed" id="pgmFeed"></div>
</section>

<!-- ==================== VIEW 2: EVENT GALLERIES ==================== -->''')

# ---- hub view ----
rep('<div class="pg-module-eyebrow">Aarav &amp; Kavya · 25.01.2027</div>', '<div class="pg-module-eyebrow" id="pgHubEyebrow"></div>')
rep('<h2 class="pg-module-title">Client Wedding Hub</h2>', '<h2 class="pg-module-title" id="pgHubTitle">Wedding Hub</h2>')
rep('<p class="pg-module-sub">The couple-facing archive home connecting Root Moment, Event Galleries, Memory Rooms, Family Tree, and wedding games.</p>',
    '<p class="pg-module-sub">Your wedding in one place: the Root Moment story, every event gallery, and notes from family and friends.</p>')
rep('<p>Curated editorial highlights using the Mia Kwan vertical filmstrip and full-moment Reels scroll.</p>', '<p id="pgHubRootText">The photographer\'s chosen highlights, one full moment at a time.</p>')
rep('<p>Full ceremony collections across Haldi, Mehendi, Sangeet, Wedding Pheras, and Reception.</p>', '<p id="pgHubEventsText">Full collections from every event.</p>')
rep('<p>Permission-scoped family contribution spaces (UI preview — backend access rules connect in Stage 2).</p>', '<p>Private spaces where each side of the family adds its own memories. Coming soon.</p>')
rep('<button type="button" class="mk-btn-peach" data-goto="rooms">Preview Rooms →</button>', '<button type="button" class="mk-btn-peach" data-goto="rooms">About Rooms →</button>')

# ---- rooms view ----
rep('<div class="pg-module-eyebrow">Stage 2 Module · UI Preview Only</div>', '<div class="pg-module-eyebrow">Coming soon</div>')
s = re.sub(r'<p class="pg-module-sub">Honest preview state:.*?</p>', '<p class="pg-module-sub">Memory Rooms will let the bride\'s and groom\'s families add their own photos and stories, each in a private room. We will open them in a later update.</p>', s, count=1, flags=re.S)

# ---- studio view → photographer profile card ----
rep('<div class="pg-module-eyebrow">Photographer Mode · Workspace</div>', '<div class="pg-module-eyebrow">Photographed by</div>')
rep('<h2 class="pg-module-title">PicGrades Studio</h2>', '<h2 class="pg-module-title" id="pgStudioName"></h2>')
s = re.sub(r'<p class="pg-module-sub">Project management view for curating.*?</p>', '<p class="pg-module-sub" id="pgStudioSub"></p>', s, count=1, flags=re.S)
rep('<h3>Project: Aarav &amp; Kavya</h3>', '<h3 id="pgStudioProject"></h3>')
rep('<p>Status: Prototype Review · 12 Root Moments staged · Client-owned Drive architecture.</p>', '<p id="pgStudioStats"></p>')

# ---- notes sheet ----
rep('id="commentSheetHeading">Moment Notes (Preview)</h3>', 'id="commentSheetHeading">Moment Notes</h3>')
s = re.sub(r'<p style="font-size:0\.72rem; color:var\(--ink-faint\); margin:4px 0 12px;">\s*Demo preview only.*?</p>',
           '<p style="font-size:0.72rem; color:var(--ink-faint); margin:4px 0 12px;">Leave a blessing or a memory for this photo. Everyone with the gallery link can read it.</p>', s, count=1, flags=re.S)
rep('<form id="commentForm" style="display:flex; gap:8px; margin-top:12px;">',
    '<form id="commentForm" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:12px;">\n    <input type="text" id="commentName" placeholder="Your name" maxlength="40" aria-label="Your name"\n      style="flex:1 1 100%; padding:10px; background:var(--bg-box); border:1px solid var(--border-hairline); color:var(--ink); font-family:var(--font-mono); font-size:0.75rem;">')
rep('placeholder="Add a preview note…" maxlength="140"', 'placeholder="Write a note…" maxlength="280" aria-label="Note"')

# ---- extra CSS (loading/error, event chips, section headings) ----
rep('</style>\n</head>', """.mk-photo-layer{object-fit:contain!important;object-position:center center!important}
.pg-collections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
@media (min-width:640px){.pg-collections{grid-template-columns:repeat(3,minmax(0,1fr))}}
.pg-collection{display:block;width:100%;text-align:left;background:none;border:0;padding:0;color:var(--ink);cursor:pointer;font:inherit}
.pg-collection .pg-cover{position:relative;aspect-ratio:4/5;overflow:hidden;background:var(--bg-box);border:1px solid var(--border-hairline)}
.pg-collection .pg-cover img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease}
.pg-collection:hover .pg-cover img{transform:scale(1.03)}
.pg-collection h3{font-family:var(--font-serif);font-weight:400;font-size:1.5rem;margin:10px 0 2px}
.pg-collection small{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.08em;color:var(--ink-faint);text-transform:uppercase}
.pg-boot{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:var(--bg-cream);color:var(--ink);font-family:var(--font-mono);font-size:.8rem;text-align:center;padding:24px}
.pg-boot h1{font-family:var(--font-serif);font-weight:400;font-size:2rem;margin:0}
.pg-boot.hide{display:none}
.mk-meta-label.is-empty,.mk-meta-value.is-empty{display:none}
#mkLikeBtn.is-liked svg{fill:currentColor}
/* ===== Root Moment = TKG Moments reels (same layout as TKG moments.html) ===== */
body.pgm-on .mk-header{display:none}
#view-moments{position:fixed;inset:0;z-index:5;background:#000}
.pgm-head{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px 12px;background:linear-gradient(to bottom,rgba(0,0,0,.85) 0%,rgba(0,0,0,.4) 70%,transparent 100%);z-index:40;pointer-events:none}
.pgm-head-title{color:#fff;font-family:var(--font-serif);font-size:22px;letter-spacing:-.2px}
.pgm-head-sub{color:rgba(255,255,255,.7);font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.pgm-feed{height:100vh;height:100dvh;overflow-y:scroll;scroll-snap-type:y mandatory;scrollbar-width:none;max-width:560px;margin:0 auto}
.pgm-feed::-webkit-scrollbar{display:none}
.pgm-item{height:100vh;height:100dvh;width:100%;scroll-snap-align:start;scroll-snap-stop:always;position:relative;overflow:hidden;background:#000;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.pgm-blur{position:absolute;inset:-24px;background-size:cover;background-position:center;filter:blur(28px) brightness(.55) saturate(1.1);transform:scale(1.15);z-index:0}
.pgm-img{position:relative;z-index:1;width:100%;height:100%;object-fit:contain;display:block;pointer-events:none}
.pgm-scrim{position:absolute;left:0;right:0;bottom:0;padding:60px 84px calc(110px + env(safe-area-inset-bottom,0px)) 16px;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.4) 50%,transparent 100%);z-index:12;pointer-events:none;color:#fff}
.pgm-name{font-family:var(--font-sans);font-size:14px;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.pgm-meta{color:rgba(255,255,255,.75);font-size:12px;margin-top:4px;font-family:var(--font-mono);letter-spacing:.04em}
.pgm-actions{position:absolute;right:14px;bottom:210px;display:flex;flex-direction:column;gap:14px;z-index:20}
.pgm-btn{position:relative;width:44px;min-height:44px;background:none;border:0;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;filter:drop-shadow(0 2px 5px rgba(0,0,0,.8));transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
.pgm-btn svg{width:28px;height:28px}
.pgm-btn:active{transform:scale(.85)}
.pgm-btn span{font-family:var(--font-sans);font-size:12px;font-weight:700;margin-top:2px}
.pgm-btn .icon-fill{display:none}.pgm-btn.liked .icon-outline{display:none}.pgm-btn.liked .icon-fill{display:block}
.pgm-btn.liked{color:#FF1744}
.pgm-pop{position:absolute;left:50%;top:50%;width:110px;height:110px;margin:-55px 0 0 -55px;color:#FF1744;z-index:30;pointer-events:none;animation:pgmPop .8s ease forwards;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}
@keyframes pgmPop{0%{transform:scale(.2);opacity:0}25%{transform:scale(1.15);opacity:1}55%{transform:scale(.95);opacity:1}100%{transform:scale(1.25);opacity:0}}
.pgm-empty{height:100dvh;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-mono);font-size:.8rem;padding:24px;text-align:center}
</style>
</head>""")
rep('<div class="pg-toast" id="pgToast"></div>', '<div class="pg-toast" id="pgToast"></div>\n<div class="pg-boot" id="pgBoot" role="status"><h1>PicGrades</h1><span id="pgBootMsg">Opening the gallery…</span></div>\n<script src="/app/config.js"></script>')

# ---- data: replace demo MOMENTS with live loader ----
start = s.index('const MOMENTS = [')
end = s.index('];', start) + 2
s = s[:start] + """// ===== PicGrades OS live data (replaces the demo array) =====
const API = (window.PG_CONFIG || {}).apiUrl;
const GALLERY_ID = (new URLSearchParams(location.search).get('g') || (location.pathname.match(/\\/g\\/([a-z0-9]+)/) || [])[1] || '').trim();
let GALLERY = null;            // manifest from the backend
let ROOT_SET = [];             // Root Moment list
let CURRENT_SET = 'root';      // 'root' or an event name
let MOMENTS = [];              // list shown in the viewer (Root Moment or one event)
function pgDevice() {
  try { let d = localStorage.getItem('pg_device'); if (!d) { d = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('pg_device', d); } return d; }
  catch (e) { if (!window.__pgDev) window.__pgDev = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36); return window.__pgDev; }
}
function pgApi(action, body) {
  return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action, g: GALLERY_ID, device: pgDevice() }, body || {})) })
    .then(r => r.json()).then(res => { if (!res.ok) throw new Error(res.error || 'Something went wrong.'); return res; });
}
function pgImg(id, w) { return 'https://lh3.googleusercontent.com/d/' + id + '=w' + w; }
function pgImgFallback(id, w) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + w; }
function pgEsc(t) { const d = document.createElement('div'); d.textContent = String(t == null ? '' : t); return d.innerHTML; }
function pgDate(iso) { const m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(iso || ''); return m ? m[3] + '.' + m[2] + '.' + m[1].slice(2) : ''; }
function pgMoment(photo, ceremony, n, total) {
  return {
    id: photo.id, title: (ceremony === 'Root Moment' ? GALLERY.title : ceremony) + ' · ' + n + '/' + total, story: '',
    date: pgDate(GALLERY.eventDate), couple: String(GALLERY.title || '').toUpperCase(), ceremony: ceremony.toUpperCase(),
    camera: '', lens: GALLERY.studio ? ('EDITED BY PICGRADES · ' + String(GALLERY.studio).toUpperCase()) : '',
    photoUrl: pgImg(photo.id, 2048), thumbUrl: pgImg(photo.id, 360),
    likes: (GALLERY.likes || {})[photo.id] || 0, liked: !!(GALLERY.mine || {})[photo.id], noteCount: (GALLERY.notes || {})[photo.id] || 0, comments: []
  };
}
function buildRootSet() {
  let list = GALLERY.root || [];
  if (!list.length) list = (GALLERY.events || []).map(e => e.photos[0]).filter(Boolean).slice(0, 12);
  return list.map((p, i) => pgMoment(p, 'Root Moment', i + 1, list.length));
}
function useSet(name) {
  CURRENT_SET = name;
  const ev = GALLERY.events.find(e => e.name === name) || GALLERY.events[0];
  MOMENTS = ev ? ev.photos.map((p, i) => pgMoment(p, ev.name, i + 1, ev.photos.length)) : [];
  CURRENT_SET = ev ? ev.name : '';
  activeIdx = -1;
  initFilmstrip();
  const lbl = document.getElementById('pgSetLabel'); if (lbl) lbl.textContent = CURRENT_SET;
}""" + s[end:]

# ---- filmstrip builds only the strip; galleries rendered separately ----
fs = s.index('function initFilmstrip() {')
fe = s.index('function centerThumbnail(')
s = s[:fs] + """function initFilmstrip() {
  stripScroller.innerHTML = '';
  MOMENTS.forEach((m, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mk-thumb-item';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-label', `Photo ${idx + 1} of ${MOMENTS.length}`);
    const im = document.createElement('img');
    im.src = m.thumbUrl; im.alt = ''; im.loading = idx < 12 ? 'eager' : 'lazy';
    im.onerror = function () { this.onerror = null; this.src = pgImgFallback(m.id, 360); };
    btn.appendChild(im);
    btn.addEventListener('click', () => { selectMomentDirectly(idx, true); });
    stripScroller.appendChild(btn);
  });
  thumbEls = Array.from(stripScroller.querySelectorAll('.mk-thumb-item'));
}

function renderGalleries() {
  const wrap = document.getElementById('pgGalleryMasonry');
  wrap.innerHTML = '';
  wrap.className = 'pg-collections';
  (GALLERY.events || []).forEach((ev) => {
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'pg-collection';
    card.setAttribute('aria-label', 'Open ' + ev.name + ' collection, ' + ev.photos.length + ' photos');
    const cover = document.createElement('div'); cover.className = 'pg-cover';
    const im = document.createElement('img');
    const c = ev.photos[0];
    im.src = pgImg(c.id, 720); im.alt = ''; im.loading = 'lazy';
    im.onerror = function () { this.onerror = null; this.src = pgImgFallback(c.id, 720); };
    cover.appendChild(im);
    const h = document.createElement('h3'); h.textContent = ev.name;
    const sm = document.createElement('small'); sm.textContent = ev.photos.length + ' photos';
    card.appendChild(cover); card.appendChild(h); card.appendChild(sm);
    card.addEventListener('click', () => openCollection(ev.name, 0));
    wrap.appendChild(card);
  });
}
function openCollection(name, idx) {
  useSet(name);
  switchView('root');
  requestAnimationFrame(() => selectMomentDirectly(idx || 0, false));
}

// ===== Root Moment: TKG Moments reels =====
const ICON_HEART_OUTLINE = '<svg class="icon-outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
const ICON_HEART_FILLED = '<svg class="icon-fill" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
const ICON_NOTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
const ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>';
const ICON_POP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
function renderMoments() {
  const feed = document.getElementById('pgmFeed');
  feed.innerHTML = '';
  document.getElementById('pgmTitle').textContent = GALLERY.title || '';
  if (!ROOT_SET.length) { feed.innerHTML = '<div class="pgm-empty">The Root Moment is being prepared. Open the Gallery to see all photos.</div>'; return; }
  ROOT_SET.forEach((m, i) => {
    const item = document.createElement('div');
    item.className = 'pgm-item'; item.dataset.pid = m.id;
    const blur = document.createElement('div'); blur.className = 'pgm-blur'; blur.style.backgroundImage = 'url("' + pgImg(m.id, 60) + '")';
    const img = document.createElement('img'); img.className = 'pgm-img'; img.alt = (GALLERY.title || '') + ' · Root Moment ' + (i + 1);
    img.src = pgImg(m.id, 1600); img.loading = i < 2 ? 'eager' : 'lazy'; img.decoding = 'async';
    img.onerror = function () { this.onerror = null; this.src = pgImgFallback(m.id, 1600); blur.style.backgroundImage = 'url("' + pgImgFallback(m.id, 60) + '")'; };
    const scrim = document.createElement('div'); scrim.className = 'pgm-scrim';
    scrim.innerHTML = '<div class="pgm-name">' + pgEsc(GALLERY.title || '') + '</div><div class="pgm-meta">ROOT MOMENT ' + (i + 1) + '/' + ROOT_SET.length + (m.date ? ' · ' + pgEsc(m.date) : '') + (GALLERY.studio ? ' · ' + pgEsc(String(GALLERY.studio).toUpperCase()) : '') + '</div>';
    const acts = document.createElement('div'); acts.className = 'pgm-actions';
    const like = document.createElement('button'); like.type = 'button'; like.className = 'pgm-btn pgm-like'; like.setAttribute('aria-label', 'Like');
    like.innerHTML = ICON_HEART_OUTLINE + ICON_HEART_FILLED + '<span class="pgm-like-count"></span>';
    const note = document.createElement('button'); note.type = 'button'; note.className = 'pgm-btn'; note.setAttribute('aria-label', 'Moment Notes');
    note.innerHTML = ICON_NOTE + '<span class="pgm-note-count"></span>';
    const share = document.createElement('button'); share.type = 'button'; share.className = 'pgm-btn'; share.setAttribute('aria-label', 'Share');
    share.innerHTML = ICON_SEND;
    like.addEventListener('click', e => { e.stopPropagation(); pgToggleLike(m); });
    note.addEventListener('click', e => { e.stopPropagation(); openNotes(m, 'Root Moment ' + (i + 1) + '/' + ROOT_SET.length); });
    share.addEventListener('click', e => { e.stopPropagation(); pgShare(); });
    acts.appendChild(like); acts.appendChild(note); acts.appendChild(share);
    // double-tap to like (same as TKG Moments)
    let lastTap = 0;
    item.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 400) {
        const pop = document.createElement('div'); pop.className = 'pgm-pop'; pop.innerHTML = ICON_POP; item.appendChild(pop);
        setTimeout(() => pop.remove(), 850);
        if (!(GALLERY.mine || {})[m.id]) pgToggleLike(m);
        lastTap = 0;
      } else lastTap = now;
    });
    item.appendChild(blur); item.appendChild(img); item.appendChild(scrim); item.appendChild(acts);
    feed.appendChild(item);
    syncCounts(m.id);
  });
}

// ===== shared like / notes / share =====
function syncCounts(id) {
  const likes = (GALLERY.likes || {})[id] || 0, liked = !!(GALLERY.mine || {})[id], notes = (GALLERY.notes || {})[id] || 0;
  document.querySelectorAll('.pgm-item[data-pid="' + id + '"]').forEach(el => {
    const b = el.querySelector('.pgm-like'); b.classList.toggle('liked', liked);
    el.querySelector('.pgm-like-count').textContent = likes || '';
    el.querySelector('.pgm-note-count').textContent = notes || '';
  });
  const cur = MOMENTS[activeIdx];
  if (cur && cur.id === id) {
    likeCountEl.textContent = likes; likeBtn.classList.toggle('is-liked', liked); commentCountEl.textContent = notes;
  }
}
const likeBusy = {};
function pgToggleLike(m) {
  if (likeBusy[m.id]) return;
  likeBusy[m.id] = true;
  const was = !!GALLERY.mine[m.id];
  if (was) delete GALLERY.mine[m.id]; else GALLERY.mine[m.id] = true;
  GALLERY.likes[m.id] = Math.max(0, (GALLERY.likes[m.id] || 0) + (was ? -1 : 1));
  syncCounts(m.id);
  pgApi('likePhoto', { photoId: m.id }).then(res => {
    GALLERY.likes[m.id] = res.likes; if (res.liked) GALLERY.mine[m.id] = true; else delete GALLERY.mine[m.id];
  }).catch(err => {
    if (was) GALLERY.mine[m.id] = true; else delete GALLERY.mine[m.id];
    GALLERY.likes[m.id] = Math.max(0, (GALLERY.likes[m.id] || 0) + (was ? 1 : -1));
    showToast(err.message);
  }).finally(() => { likeBusy[m.id] = false; syncCounts(m.id); });
}
function pgShare() {
  const url = location.origin + '/g/' + encodeURIComponent(GALLERY_ID);
  const title = (GALLERY && GALLERY.title) ? GALLERY.title + ' · PicGrades' : 'PicGrades Gallery';
  if (navigator.share) { navigator.share({ title: title, url: url }).catch(() => {}); return; }
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => showToast('Gallery link copied'), () => showToast(url));
  else showToast(url);
}

""" + s[fe:]

# ---- applyActiveMoment: image fallback, hide empty fields, real counts ----
rep("    nextImg.src = m.photoUrl;", "    nextImg.onerror = function () { this.onerror = null; this.src = pgImgFallback(m.id, 2048); };\n    nextImg.src = m.photoUrl;")
rep("""  metaLens.textContent = m.lens;""", """  metaLens.textContent = m.lens;
  [[metaDate, m.date], [metaCouple, m.couple], [metaCategory, m.ceremony], [metaCamera, m.camera], [metaLens, m.lens]].forEach(([el, v]) => {
    el.classList.toggle('is-empty', !v);
    if (el.previousElementSibling) el.previousElementSibling.classList.toggle('is-empty', !v);
  });
  storyEl.style.display = m.story ? '' : 'none';
  const moreBtn = document.getElementById('mkShowMoreBtn'); if (moreBtn) moreBtn.style.display = m.story ? '' : 'none';""")
rep("  likeCountEl.textContent = m.likes;\n  likeBtn.classList.toggle('is-liked', m.liked);\n  commentCountEl.textContent = m.comments.length;\n}", "  syncCounts(m.id);\n}")

rep("nextMomentLabel.textContent = `Continue scrolling for Moment ${idx + 2}/${MOMENTS.length} ↓`;", "nextMomentLabel.textContent = `Keep scrolling for photo ${idx + 2}/${MOMENTS.length} ↓`;")
rep("nextMomentLabel.textContent = `End of Root Moment (${MOMENTS.length}/${MOMENTS.length}) · Scroll up for previous ↑`;", "nextMomentLabel.textContent = `Last photo of ${CURRENT_SET} (${MOMENTS.length}/${MOMENTS.length}) · scroll up for previous ↑`;")

# ---- view-event-gallery button jumps to this event ----
# (the viewer's "All collections" button keeps the original handler: switchView('gallery'))

# ---- likes: real ----
ls = s.index("likeBtn.addEventListener('click', () => {")
le = s.index("const commentBackdrop")
s = s[:ls] + """likeBtn.addEventListener('click', () => { const m = MOMENTS[activeIdx]; if (m) pgToggleLike(m); });

""" + s[le:]

# ---- notes: real ----
cs = s.index("document.getElementById('mkCommentBtn').addEventListener('click', () => {")
ce = s.index("// TKG Dock Directional Scroll")
s = s[:cs] + """function renderNotes(list) {
  commentListContainer.innerHTML = list.length
    ? list.map(c => `<div class="mk-comment-item"><strong>${pgEsc(c.name)}:</strong> ${pgEsc(c.text)}</div>`).join('')
    : '<div class="mk-comment-item">No notes yet. Be the first to leave one.</div>';
}
let noteTarget = null;
function openNotes(m, label) {
  if (!m) return;
  noteTarget = m;
  document.getElementById('commentSheetHeading').textContent = 'Moment Notes · ' + label;
  commentListContainer.innerHTML = '<div class="mk-comment-item">Loading notes…</div>';
  try { const nm = localStorage.getItem('pg_note_name'); if (nm) document.getElementById('commentName').value = nm; } catch (e) {}
  commentBackdrop.classList.add('show');
  commentSheet.classList.add('show');
  pgApi('getNotes', { photoId: m.id }).then(res => { if (noteTarget === m) renderNotes(res.notes); }).catch(err => { commentListContainer.innerHTML = '<div class="mk-comment-item">' + pgEsc(err.message) + '</div>'; });
}
document.getElementById('mkCommentBtn').addEventListener('click', () => { openNotes(MOMENTS[activeIdx], (CURRENT_SET || '') + ' ' + (activeIdx + 1) + '/' + MOMENTS.length); });
commentBackdrop.addEventListener('click', () => { commentBackdrop.classList.remove('show'); commentSheet.classList.remove('show'); });
document.getElementById('commentForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const m = noteTarget;
  const inp = document.getElementById('commentInput'), nameInp = document.getElementById('commentName');
  const val = inp.value.trim(), name = nameInp.value.trim();
  if (!m) return;
  if (!name) { nameInp.focus(); showToast('Add your name first'); return; }
  if (!val) { inp.focus(); return; }
  const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
  try { localStorage.setItem('pg_note_name', name); } catch (er) {}
  pgApi('addNote', { photoId: m.id, name: name, text: val }).then(() => {
    inp.value = '';
    GALLERY.notes[m.id] = (GALLERY.notes[m.id] || 0) + 1;
    syncCounts(m.id);
    showToast('Note added');
    return pgApi('getNotes', { photoId: m.id }).then(res => renderNotes(res.notes));
  }).catch(err => showToast(err.message)).finally(() => { btn.disabled = false; });
});
document.getElementById('mkShareBtn').addEventListener('click', pgShare);

""" + s[ce:]

# ---- switching to Root Moment from the dock restores the Root Moment set ----
rep("""  document.querySelectorAll('.tkg-nav-item').forEach(item => {
    const match = item.dataset.nav === viewKey;""", """  document.body.classList.toggle('pgm-on', viewKey === 'moments');
  document.querySelectorAll('.tkg-nav-item').forEach(item => {
    const match = item.dataset.nav === (viewKey === 'root' ? 'gallery' : viewKey);""")
rep("""  if (viewKey === 'root') {
    requestAnimationFrame(() => selectMomentDirectly(activeIdx >= 0 ? activeIdx : 0, false));
  }""", """  if (viewKey === 'root') {
    requestAnimationFrame(() => selectMomentDirectly(activeIdx >= 0 ? activeIdx : 0, false));
  }
}
function switchViewFromNav(viewKey) {
  switchView(viewKey);""")
rep("link.addEventListener('click', (e) => { e.preventDefault(); switchView(link.dataset.nav); });",
    "link.addEventListener('click', (e) => { e.preventDefault(); switchViewFromNav(link.dataset.nav); });")
rep("  btn.addEventListener('click', () => switchView(btn.dataset.goto));", "  btn.addEventListener('click', () => switchViewFromNav(btn.dataset.goto));")
rep("""  showToast(next === 'dark' ? 'Dark Editorial Mode' : 'Mia Kwan Warm Cream Mode');""", """  showToast(next === 'dark' ? 'Dark mode' : 'Light mode');
  try { localStorage.setItem('pg_theme', next); } catch (e) {}""")

# ---- boot ----
rep("""// Initialise
initFilmstrip();
selectMomentDirectly(0, false);""", """// Initialise with live data
(function boot() {
  try { const t = localStorage.getItem('pg_theme'); if (t) document.documentElement.setAttribute('data-tkg-theme', t); } catch (e) {}
  const bootEl = document.getElementById('pgBoot'), bootMsg = document.getElementById('pgBootMsg');
  if (!API || !GALLERY_ID) { bootMsg.textContent = 'This gallery link is incomplete. Please check the link you received.'; return; }
  pgApi('getGallery').then(res => {
    GALLERY = res.gallery; GALLERY.likes = GALLERY.likes || {}; GALLERY.notes = GALLERY.notes || {}; GALLERY.mine = GALLERY.mine || {};
    const total = (GALLERY.events || []).reduce((t, e) => t + e.photos.length, 0) || (GALLERY.root || []).length;
    document.title = GALLERY.title + ' · PicGrades';
    document.getElementById('pgCoupleTitle').textContent = GALLERY.title;
    document.getElementById('pgStampYear').textContent = (GALLERY.eventDate || '').slice(2, 4) || String(new Date().getFullYear()).slice(2);
    const dateTxt = pgDate(GALLERY.eventDate);
    document.getElementById('pgHubEyebrow').textContent = GALLERY.title + (dateTxt ? ' · ' + dateTxt : '');
    document.getElementById('pgHubTitle').textContent = 'Wedding Hub';
    document.getElementById('pgHubRootText').textContent = ((GALLERY.root || []).length || Math.min(12, (GALLERY.events || []).length)) + ' chosen moments from the photographer, one full photo at a time.';
    document.getElementById('pgHubEventsText').textContent = (GALLERY.events || []).map(e => e.name).join(' · ') + ' — ' + total + ' photos in all.';
    document.getElementById('pgGalleryEyebrow').textContent = GALLERY.title + ' · ' + total + ' photos';
    document.getElementById('pgStudioName').textContent = GALLERY.studio || 'Your photographer';
    document.getElementById('pgStudioSub').textContent = 'Photographed by ' + (GALLERY.studio || 'your photographer') + ' · edited and delivered with PicGrades.';
    document.getElementById('pgStudioProject').textContent = GALLERY.title;
    document.getElementById('pgStudioStats').textContent = total + ' photos · ' + (GALLERY.events || []).length + ' events' + (dateTxt ? ' · ' + dateTxt : '');
    ROOT_SET = buildRootSet();
    renderGalleries();
    renderMoments();
    if ((GALLERY.events || []).length) useSet(GALLERY.events[0].name);
    const startView = (location.hash || '').replace('#', '');
    switchView(['gallery', 'hub', 'rooms', 'studio'].indexOf(startView) > -1 ? startView : 'moments');
    bootEl.classList.add('hide');
  }).catch(err => { bootMsg.textContent = err.message; });
})();""")

import collections; left=[s[m.start()-60:m.start()+30] for m in re.finditer('(?i)demo', s)]; print('demo left:', left)
open(out, 'w', encoding='utf-8').write(s)
print('ok', len(s))
