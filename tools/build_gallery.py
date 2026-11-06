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
rep('<span>結婚</span>\n      <span>27</span>', '<span class="pg-mono" id="pgMono"></span>')
rep('<button type="button" class="mk-stamp-badge" id="stampThemeBtn" title="Toggle Light/Dark">', '<button type="button" class="mk-stamp-badge" id="stampThemeBtn" title="Light / dark" aria-label="Couple monogram · switch light or dark">')

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
    '<p class="pg-module-sub">Every event of the day. Open a collection to see all its photos.</p>\n    <button type="button" class="pg-findme hidden" data-findme><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="9" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3"/></svg><span>Find me · see all your photos</span></button>')

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
  <div class="pgm-head"><div><div class="pgm-head-title" id="pgmTitle"></div><div class="pgm-head-sub" id="pgmSub">Root Moment</div></div><button type="button" class="pgm-findme hidden" data-findme aria-label="Find me"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="9" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3"/></svg><span>Find me</span></button></div>
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
    id: photo.id, n: n, title: (ceremony === 'Root Moment' ? GALLERY.title : ceremony) + ' · ' + n + '/' + total, story: '',
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
  const ev = (GALLERY.personal || []).concat(GALLERY.events).find(e => e.name === name) || GALLERY.events[0];
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
  (GALLERY.personal || []).concat(GALLERY.events || []).forEach((ev) => {
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
    pgMonogram();
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
    switchView(['gallery', 'moments', 'hub', 'rooms', 'studio'].indexOf(startView) > -1 ? startView : 'hub');
    bootEl.classList.add('hide');
  }).catch(err => { bootMsg.textContent = err.message; });
})();""")

# ===================== Full-screen collection viewer (2026-11-06) =====================
# Collection photos open full screen: no text on top of the photo, swipe/scroll up = next photo,
# down = previous. Details live in an (i) sheet. Tap = hide/show controls, double-tap = heart.
rep('<div class="mk-photo-hero" id="mkPhotoHero">', '<div class="pgv-feed" id="pgvFeed" aria-label="Photos"></div>\n    <div class="mk-photo-hero" id="mkPhotoHero">\n      <div class="pgv-blur" id="pgvBlur"></div>')
rep('<section class="mk-editorial-sheet" id="mkEditorialSheet" aria-live="polite">', '<section class="mk-editorial-sheet" id="mkEditorialSheet" aria-live="polite">\n      <button type="button" class="pgv-sheet-close" id="pgvInfoClose" aria-label="Close details">×</button>')
rep('<!-- ==================== ROOT MOMENT: TKG MOMENTS REELS ==================== -->', r'''<div class="pgv-top" id="pgvTop">
  <button type="button" class="pgv-ic" id="pgvBack" aria-label="All collections"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
  <div class="pgv-count" id="pgvCount"></div>
</div>
<div class="pgv-bar" id="pgvBar">
  <button type="button" class="pgv-ic pgv-like" id="pgvLike" aria-label="Like"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span id="pgvLikeCount"></span></button>
  <button type="button" class="pgv-ic" id="pgvNote" aria-label="Notes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span id="pgvNoteCount"></span></button>
  <button type="button" class="pgv-ic" id="pgvShare" aria-label="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg></button>
  <button type="button" class="pgv-ic" id="pgvInfo" aria-label="Photo details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.5"/></svg></button>
</div>

<!-- ==================== ROOT MOMENT: TKG MOMENTS REELS ==================== -->''')

# the Gemini "scroll through the photo into its story" engine is replaced by full-screen navigation
rep('(function initReelsMomentBoundaryScroll() {', '(function initReelsMomentBoundaryScroll() {\n  return; // replaced by full-screen viewer navigation (pgViewerNav)')

rep('.pgm-empty{', r'''/* page scroll fix: body must not be its own scroll box (it blocked scrolling on the collections page) */
body{overflow-x:visible!important}
html{overflow-x:hidden}
/* ===== Full-screen collection viewer ===== */
body.pgv-on{overflow:hidden}
body.pgv-on .mk-header,body.pgv-on .tkg-global-nav{display:none!important}
#view-root.active{position:fixed;inset:0;z-index:5;background:#0b0908;overflow:hidden}
#view-root .mk-root-stage{max-width:none;margin:0;padding:0;height:100vh;height:100dvh;min-height:0}
#view-root .mk-photo-hero{position:absolute;inset:0;width:100%;height:100%;background:transparent;touch-action:none;cursor:pointer;overflow:hidden}
#view-root .mk-photo-fade-top,#view-root .mk-photo-fade-bottom,#view-root .mk-counter-pill,#view-root .mk-next-moment-cue,#view-root #mkViewProjectBtn,#view-root .mk-show-more-btn{display:none!important}
#view-root .mk-photo-layer{z-index:1}
.pgv-blur{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(32px) brightness(.42) saturate(1.1);transform:scale(1.12);z-index:0}
#view-root .mk-filmstrip-rail{top:calc(64px + env(safe-area-inset-top,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));transition:opacity .25s ease}
.pgv-top,.pgv-bar{display:none;position:fixed;left:0;right:0;z-index:95;transition:opacity .25s ease}
body.pgv-on .pgv-top,body.pgv-on .pgv-bar{display:flex}
.pgv-top{top:0;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px 22px;background:linear-gradient(to bottom,rgba(0,0,0,.55),transparent);pointer-events:none}
.pgv-bar{bottom:0;align-items:center;gap:10px;padding:22px 16px calc(env(safe-area-inset-bottom,0px) + 16px);background:linear-gradient(to top,rgba(0,0,0,.55),transparent);pointer-events:none}
.pgv-ic{pointer-events:auto;height:42px;min-width:42px;padding:0 10px;border-radius:21px;border:1px solid rgba(255,255,255,.18);background:rgba(20,16,14,.42);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;font:700 12px/1 var(--font-sans)}
.pgv-ic svg{width:22px;height:22px}
.pgv-ic span:empty{display:none}
.pgv-like.liked{color:#FF1744}.pgv-like.liked svg{fill:currentColor}
.pgv-count{color:rgba(255,255,255,.8);font:500 11px/1 var(--font-mono);letter-spacing:.1em;padding-right:calc(var(--rail-width) + var(--rail-right-gap))}
body.pgv-clean .pgv-top,body.pgv-clean .pgv-bar,body.pgv-clean #view-root .mk-filmstrip-rail{opacity:0;pointer-events:none}
body.pgv-clean .pgv-top *,body.pgv-clean .pgv-bar *{pointer-events:none}
#view-root .mk-editorial-sheet{position:fixed;left:0;right:0;bottom:0;margin:0 auto;max-width:640px;max-height:72vh;max-height:72dvh;overflow-y:auto;padding:28px 22px calc(26px + env(safe-area-inset-bottom,0px));background:var(--bg-cream);transform:translateY(105%);transition:transform .3s cubic-bezier(.22,1,.36,1);z-index:120;box-shadow:0 -12px 40px rgba(0,0,0,.35)}
body.pgv-info #view-root .mk-editorial-sheet{transform:none}
body.pgv-info #view-root .mk-filmstrip-rail,body.pgv-info .pgv-top,body.pgv-info .pgv-bar{opacity:0;pointer-events:none}
body.pgv-info .pgv-top *,body.pgv-info .pgv-bar *{pointer-events:none}
.pgv-sheet-close{position:absolute;top:10px;right:12px;width:34px;height:34px;border:1px solid var(--border-hairline);background:var(--bg-box);color:var(--ink);font-size:20px;line-height:1;cursor:pointer}
.pgv-pop{position:fixed;width:110px;height:110px;margin:-55px 0 0 -55px;color:#FF1744;z-index:130;pointer-events:none;animation:pgmPop .8s ease forwards;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}
.pgm-empty{''')

assert s.count("</body>") == 1
s = s.replace("</body>", r"""<script>
(function pgViewerNav() {
  const view = document.getElementById('view-root'), hero = document.getElementById('pgvFeed'), body = document.body;
  const blur = document.getElementById('pgvBlur'), countEl = document.getElementById('pgvCount');
  const likeEl = document.getElementById('pgvLike'), likeCountEl2 = document.getElementById('pgvLikeCount'), noteCountEl2 = document.getElementById('pgvNoteCount');
  const isOn = () => view.classList.contains('active') && !document.querySelector('.reg-overlay.show') && !body.classList.contains('pgv-info');

  const _apply = applyActiveMoment;
  applyActiveMoment = function (idx) {
    _apply(idx);
    const m = MOMENTS[activeIdx]; if (!m) return;
    countEl.textContent = (activeIdx + 1) + ' / ' + MOMENTS.length;
    blur.style.backgroundImage = 'url("' + m.photoUrl + '")';
    pgvSync();
  };
  function pgvSync() {
    const m = MOMENTS[activeIdx]; if (!m || !GALLERY) return;
    likeEl.classList.toggle('liked', !!(GALLERY.mine || {})[m.id]);
    likeCountEl2.textContent = (GALLERY.likes || {})[m.id] || '';
    noteCountEl2.textContent = (GALLERY.notes || {})[m.id] || '';
  }
  const _sync = syncCounts;
  syncCounts = function (id) { _sync(id); pgvSync(); };
  const _switch = switchView;
  switchView = function (key) {
    _switch(key);
    body.classList.toggle('pgv-on', key === 'root');
    if (key !== 'root') body.classList.remove('pgv-info', 'pgv-clean');
  };

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
        if (!(GALLERY.mine || {})[m.id]) pgToggleLike(m);
        const p = document.createElement('div'); p.className = 'pgv-pop'; p.style.left = x + 'px'; p.style.top = y + 'px';
        p.innerHTML = ICON_POP; document.body.appendChild(p); setTimeout(() => p.remove(), 850);
      }
      return;
    }
    lastTap = now;
    tapTimer = setTimeout(() => body.classList.toggle('pgv-clean'), 320);
  }
  hero.addEventListener('click', (e) => { if (Date.now() - lastTouch < 700) return; tap(e.clientX, e.clientY); });

  window.addEventListener('keydown', (e) => {
    if (!view.classList.contains('active')) return;
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
</script>
</body>""", 1)

# ===================== Find me (face search) + couple monogram (2026-11-06) =====================
s = s.replace("card.type = 'button'; card.className = 'pg-collection';", "card.type = 'button'; card.className = 'pg-collection' + (ev.personal ? ' is-personal' : '');", 1)
rep('<div class="pg-toast" id="pgToast"></div>', r'''<div class="overlay-backdrop" id="fmBackdrop"></div>
<div class="reg-overlay fm-sheet" id="fmSheet" role="dialog" aria-modal="true" aria-labelledby="fmTitle">
  <button type="button" class="pgv-sheet-close" id="fmClose" aria-label="Close">×</button>
  <h3 class="fm-title" id="fmTitle">Find your photos</h3>
  <p class="fm-sub">Take a selfie or choose a photo of yourself. It stays on your phone — nothing is uploaded.</p>
  <div class="fm-cam hidden" id="fmCam"><video id="fmVideo" playsinline muted autoplay></video><canvas id="fmOverlay"></canvas><span class="fm-hint" id="fmHint">Look at the camera</span></div>
  <div class="fm-actions" id="fmActions">
    <button type="button" class="mk-btn-peach" id="fmCamBtn">Use camera</button>
    <label class="fm-upload">Choose a photo<input type="file" accept="image/*" id="fmFile" hidden></label>
  </div>
  <button type="button" class="mk-btn-peach fm-shoot hidden" id="fmShoot" disabled>Take selfie</button>
  <div class="fm-busy hidden" id="fmBusy" role="status" aria-live="polite"><i class="fm-spin"></i><div><b id="fmBusyTitle">Searching your photos</b><span id="fmBusyStep">Reading your face…</span></div></div>
  <p class="fm-status" id="fmStatus" aria-live="polite"></p>
  <div class="fm-result hidden" id="fmResult">
    <div class="fm-thumbs" id="fmThumbs"></div>
    <button type="button" class="mk-btn-peach" id="fmOpen">See your photos</button>
    <button type="button" class="fm-link" id="fmAgain">Try another photo</button>
  </div>
</div>
<div class="pg-toast" id="pgToast"></div>''')

rep('.pgm-empty{', r'''/* couple monogram (replaces the red stamp) */
.mk-stamp-badge{width:44px;height:44px;border-radius:50%;background:var(--bg-box);color:var(--ink);border:1px solid var(--border-hairline);outline:none;box-shadow:none;padding:0;overflow:hidden}
.pg-mono{font-family:var(--font-serif);font-weight:400;font-size:15px;letter-spacing:.02em;line-height:1}
.pg-mono img{width:44px;height:44px;object-fit:cover;display:block}
/* Find me */
.pg-findme{margin:4px 0 22px;display:inline-flex;align-items:center;gap:10px;min-height:46px;padding:10px 18px;border:1px solid var(--ink);background:var(--ink);color:var(--bg-cream);font:600 .8rem/1 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.pg-findme svg,.pgm-findme svg{width:20px;height:20px;flex:none}
.pgm-head{align-items:flex-start}
.pgm-findme{pointer-events:auto;display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:19px;border:1px solid rgba(255,255,255,.3);background:rgba(20,16,14,.45);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff;font:700 12px/1 var(--font-sans);cursor:pointer}
.pg-findme.hidden,.pgm-findme.hidden{display:none}
.pg-collection.is-personal .pg-cover{outline:2px solid var(--ink);outline-offset:3px}
.pg-collection.is-personal small::after{content:' · only on this phone'}
.fm-sheet{max-width:520px}
.fm-sheet .hidden{display:none!important}
.fm-title{font-family:var(--font-serif);font-weight:400;font-size:1.9rem;margin:8px 40px 4px 0}
.fm-sub{font-size:.78rem;color:var(--ink-faint);margin:0 0 14px;line-height:1.5}
.fm-cam{position:relative;width:100%;aspect-ratio:3/4;max-height:52vh;background:#000;overflow:hidden;margin-bottom:12px}
.fm-cam video,.fm-cam canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
.fm-hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;font:600 12px/1 var(--font-sans);padding:8px 12px;border-radius:14px;white-space:nowrap}
.fm-hint.ok{background:#1f6f43}
.fm-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.fm-upload{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid var(--border-hairline);background:var(--bg-box);color:var(--ink);font:600 .75rem/1 var(--font-mono);letter-spacing:.05em;text-transform:uppercase;cursor:pointer}
.fm-shoot{width:100%;margin-top:4px}
.fm-busy{display:flex;align-items:center;gap:14px;background:var(--bg-box);border:1px solid var(--border-hairline);border-radius:16px;padding:14px 16px;margin:6px 0 4px;box-shadow:0 8px 24px rgba(0,0,0,.08)}
.fm-sheet .fm-busy.hidden{display:none!important}
.fm-busy b{display:block;font:600 .9rem/1.2 var(--font-sans);color:var(--ink)}
.fm-busy span{display:block;font:500 .72rem/1.3 var(--font-mono);color:var(--ink-faint);margin-top:3px}
.fm-spin{flex:none;width:26px;height:26px;border-radius:50%;border:3px solid var(--border-hairline);border-top-color:var(--ink);animation:fmspin .8s linear infinite}
@keyframes fmspin{to{transform:rotate(360deg)}}
.fm-status{font-size:.8rem;color:var(--ink);margin:12px 0 0;min-height:1em}
.fm-thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:10px 0 12px}
.fm-thumbs img{width:100%;aspect-ratio:1;object-fit:cover;background:var(--bg-box)}
.fm-result .mk-btn-peach{width:100%}
.fm-link{display:block;margin:10px auto 0;background:none;border:0;color:var(--ink-faint);text-decoration:underline;font:inherit;font-size:.75rem;cursor:pointer;min-height:36px}
.pgm-empty{''')

assert s.count("</body>") == 1
s = s.replace("</body>", r"""<script>
function pgMonogram() {
  const el = document.getElementById('pgMono'); if (!el || !GALLERY) return;
  if (GALLERY.logoUrl) { el.innerHTML = '<img alt="" src="' + pgEsc(GALLERY.logoUrl) + '">'; return; }
  const parts = String(GALLERY.title || '').split(/\s*(?:&|\band\b|\+|\/|,|·)\s*/i).map(x => x.trim()).filter(Boolean);
  el.textContent = parts.length >= 2 ? parts[0][0].toUpperCase() + '&' + parts[1][0].toUpperCase() : String(GALLERY.title || 'PG').slice(0, 2).toUpperCase();
}
(function pgFindMe() {
  const $ = (id) => document.getElementById(id);
  let FLAT = null, stream = null, loopTimer = null, coreReady = null, lastResult = null;
  const sheet = $('fmSheet'), back = $('fmBackdrop'), video = $('fmVideo'), overlay = $('fmOverlay');
  function status(t) { $('fmStatus').textContent = t || ''; }
  function loadCore() {
    if (!coreReady) coreReady = new Promise((res, rej) => { if (window.PGFaces) return res(); const s = document.createElement('script'); s.src = '/app/faces-core.js'; s.onload = res; s.onerror = () => { coreReady = null; rej(new Error('Could not load face search. Check the internet and try again.')); }; document.head.appendChild(s); });
    return coreReady;
  }
  function prepare() {
    status('Getting face search ready… the first time takes a few seconds.');
    return loadCore().then(() => Promise.all([PGFaces.load(), FLAT ? null : pgApi('getFaces').then(r => { FLAT = PGFaces.flatten(r.faces); })])).then(() => status(''));
  }
  function reset() { $('fmResult').classList.add('hidden'); $('fmActions').classList.remove('hidden'); $('fmCam').classList.add('hidden'); $('fmShoot').classList.add('hidden'); status(''); }
  function open() { reset(); back.classList.add('show'); sheet.classList.add('show'); prepare().catch(e => status(e.message)); }
  function close() { stopCam(); back.classList.remove('show'); sheet.classList.remove('show'); }
  function stopCam() { clearTimeout(loopTimer); loopTimer = null; if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } video.srcObject = null; }

  function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status('This browser cannot use the camera here. Choose a photo instead.'); return; }
    status('Allow the camera when your phone asks.');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false }).then(s => {
      stream = s; video.srcObject = s; $('fmCam').classList.remove('hidden'); $('fmActions').classList.add('hidden'); $('fmShoot').classList.remove('hidden'); status('');
      return video.play().catch(() => {});
    }).then(() => prepare()).then(loop).catch(e => {
      stopCam(); reset();
      status(e && e.name === 'NotAllowedError' ? 'Camera permission was blocked. Choose a photo instead (or allow the camera in your browser settings).' : (e && e.message) || 'The camera could not start. Choose a photo instead.');
    });
  }
  function loop() {
    if (!stream) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (!w) { loopTimer = setTimeout(loop, 250); return; }
    PGFaces.locate(video, 0.5).then(list => {
      if (!stream) return;
      overlay.width = w; overlay.height = h;
      const ctx = overlay.getContext('2d'); ctx.clearRect(0, 0, w, h);
      const big = list.sort((a, b) => b.box.width - a.box.width)[0];
      const ok = big && big.box.width > w * 0.18;
      if (big) { ctx.strokeStyle = ok ? '#3ddc84' : '#ffffff'; ctx.lineWidth = Math.max(3, w / 160); const b = big.box; ctx.strokeRect(b.x, b.y, b.width, b.height); }
      $('fmHint').textContent = ok ? 'Face found ✓ Tap “Take selfie”' : big ? 'Come a little closer' : 'Look at the camera';
      $('fmHint').classList.toggle('ok', !!ok); $('fmShoot').disabled = !ok;
      loopTimer = setTimeout(loop, 300);
    }).catch(() => { loopTimer = setTimeout(loop, 600); });
  }
  function shoot() {
    if (!stream || !video.videoWidth) return;
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext('2d').drawImage(video, 0, 0);
    stopCam(); $('fmCam').classList.add('hidden'); $('fmShoot').classList.add('hidden');
    findIn(c);
  }
  // a small card shows what is happening; we let the screen paint before the heavy face work starts
  const busy = (on, step) => { $('fmBusy').classList.toggle('hidden', !on); if (step) $('fmBusyStep').textContent = step; };
  const paint = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));
  function findIn(input) {
    status(''); $('fmActions').classList.add('hidden'); $('fmCam').classList.add('hidden'); $('fmShoot').classList.add('hidden');
    busy(true, 'Getting face search ready…');
    return paint().then(prepare).then(() => { busy(true, 'Reading your face…'); return paint(); }).then(() => PGFaces.detect(input, 0.5)).then(found => {
      if (!found.length) { busy(false); reset(); status('No face found. Use a clear, front-facing photo in good light.'); return; }
      busy(true, 'Matching with ' + new Set(FLAT.map(x => x.pid)).size + ' photos…');
      return paint().then(() => {
        const me = found.sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height)[0];
        const m = PGFaces.match(me.descriptor, FLAT); busy(false); showResult(m, found.length > 1);
      });
    }).catch(e => { busy(false); reset(); status(e.message); });
  }
  function photoIndex() {
    const map = {}, order = [];
    (GALLERY.events || []).concat([{ name: 'Root Moment', photos: GALLERY.root || [] }]).forEach(ev => ev.photos.forEach(p => { if (!map[p.id]) { map[p.id] = p; order.push(p.id); } }));
    return { map, order };
  }
  function showResult(m, several) {
    const idx = photoIndex(), inOrder = (ids) => { const set = new Set(ids); return idx.order.filter(id => set.has(id)).map(id => idx.map[id]); };
    const sure = inOrder(m.sure), maybe = inOrder(m.maybe);
    GALLERY.personal = [];
    if (sure.length) GALLERY.personal.push({ name: 'Your photos', photos: sure, personal: true });
    if (maybe.length) GALLERY.personal.push({ name: 'Maybe you', photos: maybe, personal: true });
    renderGalleries();
    lastResult = sure.length ? 'Your photos' : maybe.length ? 'Maybe you' : null;
    $('fmActions').classList.add('hidden');
    if (!lastResult) { $('fmResult').classList.remove('hidden'); $('fmThumbs').innerHTML = ''; $('fmOpen').classList.add('hidden'); status('We could not find you in this gallery. Try a clearer, front-facing photo in good light.'); return; }
    $('fmOpen').classList.remove('hidden');
    status((sure.length ? sure.length + ' photo' + (sure.length === 1 ? '' : 's') + ' of you' : 'No sure matches') + (maybe.length ? ' · ' + maybe.length + ' maybe you' : '') + (several ? ' (we used the biggest face in your photo)' : ''));
    $('fmThumbs').innerHTML = '';
    (sure.length ? sure : maybe).slice(0, 8).forEach(p => { const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.src = pgImg(p.id, 300); im.onerror = function () { this.onerror = null; this.src = pgImgFallback(p.id, 300); }; $('fmThumbs').appendChild(im); });
    $('fmOpen').textContent = sure.length ? (sure.length === 1 ? 'See your photo' : 'See your ' + sure.length + ' photos') : (maybe.length === 1 ? 'See the possible photo' : 'See ' + maybe.length + ' possible photos');
    $('fmResult').classList.remove('hidden');
  }
  $('fmCamBtn').addEventListener('click', startCam);
  $('fmShoot').addEventListener('click', shoot);
  $('fmFile').addEventListener('change', function () {
    const f = this.files[0]; this.value = ''; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => { findIn(im).then(() => URL.revokeObjectURL(url)); };
    im.onerror = () => { status('That file could not be opened. Choose a JPG or PNG photo.'); URL.revokeObjectURL(url); };
    im.src = url;
  });
  $('fmOpen').addEventListener('click', () => { if (!lastResult) return; close(); openCollection(lastResult, 0); });
  $('fmAgain').addEventListener('click', reset);
  $('fmClose').addEventListener('click', close);
  back.addEventListener('click', close);
  document.querySelectorAll('[data-findme]').forEach(b => b.addEventListener('click', open));
  const _render = renderGalleries;
  renderGalleries = function () { _render(); document.querySelectorAll('[data-findme]').forEach(b => b.classList.toggle('hidden', !(GALLERY && GALLERY.faceSearch))); };
})();
</script>
</body>""", 1)

# ===================== Visual Hub + shuffling covers + notes wall (2026-11-06) =====================
# Root Moment: photographer's 00_Root_Moment stays in their order; if there is none, a fresh random mix each visit.
rep("""    syncCounts(m.id);
    showToast('Note added');""", """    syncCounts(m.id);
    (GALLERY.recentNotes = GALLERY.recentNotes || []).unshift({ photoId: m.id, name: name, text: val, at: '' });
    if (window.pgRenderNotes) pgRenderNotes();
    showToast('Note added');""")
s = s.replace("""    document.getElementById('pgHubRootText').textContent = ((GALLERY.root || []).length || Math.min(12, (GALLERY.events || []).length)) + ' chosen moments from the photographer, one full photo at a time.';
    document.getElementById('pgHubEventsText').textContent = (GALLERY.events || []).map(e => e.name).join(' · ') + ' — ' + total + ' photos in all.';
""", "", 1)
rep("""    renderMoments();""", """    renderMoments();
    pgRenderHub();""")
s, n = re.subn(r'<section class="pg-view" id="view-hub">.*?</section>', r'''<section class="pg-view" id="view-hub">
  <div class="pgh-hero" id="pghHero" role="button" tabindex="0" aria-label="Open this photo">
    <img class="pgh-hero-img is-on" id="pghHeroA" alt=""><img class="pgh-hero-img" id="pghHeroB" alt="">
    <div class="pgh-hero-scrim"></div>
    <div class="pgh-hero-text">
      <div class="pgh-eyebrow" id="pgHubEyebrow"></div>
      <h2 class="pgh-title" id="pgHubTitle">Wedding Hub</h2>
      <div class="pgh-now" id="pghNow"></div>
    </div>
  </div>
  <div class="pg-module-wrap pgh-wrap">
    <div class="pgh-stats" id="pghStats"></div>
    <button type="button" class="pg-findme hidden" data-findme><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="9" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3"/></svg><span>Find me · see all your photos</span></button>
    <div class="pgh-sec"><div class="pgh-head"><h3>Events</h3><button type="button" class="pgh-more" data-goto="gallery">All galleries →</button></div><div class="pgh-row" id="pghEvents"></div></div>
    <div class="pgh-sec hidden" id="pghLovedSec"><div class="pgh-head"><h3>Most loved</h3></div><div class="pgh-row pgh-row-sm" id="pghLoved"></div></div>
    <div class="pgh-sec hidden" id="pghNotesSec"><div class="pgh-head"><h3>Recent notes</h3><button type="button" class="pgh-more" data-goto="rooms">All notes →</button></div><div class="pgh-notes" id="pghNotes"></div></div>
    <div class="pgh-sec"><button type="button" class="pgh-studio" data-goto="studio"><span>Photographed by</span><b id="pghStudio"></b><em>→</em></button></div>
  </div>
</section>''', s, count=1, flags=re.S)
assert n == 1
s, n = re.subn(r'<section class="pg-view" id="view-rooms">.*?</section>', r'''<section class="pg-view" id="view-rooms">
  <div class="pg-module-wrap">
    <div class="pg-module-eyebrow">Notes &amp; blessings</div>
    <h2 class="pg-module-title">From family &amp; friends</h2>
    <p class="pg-module-sub">Every note left on the photos. Open any photo and tap the note icon to add yours.</p>
    <div class="pgh-notes" id="pgWall"></div>
  </div>
</section>''', s, count=1, flags=re.S)
assert n == 1

rep('.pgm-empty{', r'''/* ===== Hub ===== */
.pgh-hero{position:relative;width:100%;height:72vh;height:72dvh;min-height:420px;overflow:hidden;background:#0b0908;cursor:pointer}
.pgh-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;opacity:0;transform:scale(1.06);transition:opacity 1.2s ease,transform 7s ease-out}
.pgh-hero-img.is-on{opacity:1;transform:scale(1)}
.pgh-hero-scrim{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.35) 0%,transparent 28%,transparent 50%,rgba(0,0,0,.72) 100%)}
.pgh-hero-text{position:absolute;left:0;right:0;bottom:0;padding:0 20px 26px;color:#fff;max-width:880px;margin:0 auto}
.pgh-eyebrow{font:500 .68rem/1 var(--font-mono);letter-spacing:.12em;text-transform:uppercase;opacity:.85;margin-bottom:8px}
.pgh-title{font-family:var(--font-serif);font-weight:400;font-size:clamp(2.4rem,9vw,4rem);line-height:1;margin:0 0 10px}
.pgh-now{font:500 .72rem/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;opacity:.9;min-height:1em;transition:opacity .4s}
.pgh-wrap{padding-top:22px}
.pgh-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border-hairline);border:1px solid var(--border-hairline);margin-bottom:18px}
.pgh-stats div{background:var(--bg-box);padding:12px 8px;text-align:center}
.pgh-stats b{display:block;font-family:var(--font-serif);font-weight:400;font-size:1.6rem;line-height:1.1}
.pgh-stats span{font:500 .6rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
.pgh-sec{margin-top:26px}
.pgh-sec.hidden{display:none}
.pgh-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:10px}
.pgh-head h3{font-family:var(--font-serif);font-weight:400;font-size:1.6rem;margin:0}
.pgh-more{background:none;border:0;color:var(--ink-soft);font:500 .7rem/1 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;min-height:36px;padding:0}
.pgh-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(150px,44%);gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;scrollbar-width:none;margin:0 -18px;padding-left:18px;padding-right:18px}
.pgh-row::-webkit-scrollbar{display:none}
@media (min-width:700px){.pgh-row{grid-auto-columns:minmax(180px,23%)}}
.pgh-row-sm{grid-auto-columns:minmax(110px,32%)}
@media (min-width:700px){.pgh-row-sm{grid-auto-columns:minmax(120px,15%)}}
.pgh-tile{scroll-snap-align:start;display:block;background:none;border:0;padding:0;text-align:left;color:var(--ink);cursor:pointer;font:inherit}
.pgh-tile .pg-cover{position:relative;aspect-ratio:4/5;overflow:hidden;background:var(--bg-box);border:1px solid var(--border-hairline)}
.pgh-row-sm .pgh-tile .pg-cover{aspect-ratio:1}
.pgh-tile h4{font-family:var(--font-serif);font-weight:400;font-size:1.2rem;margin:8px 0 0}
.pgh-tile small{font:500 .62rem/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
.pgh-heart{position:absolute;left:6px;bottom:6px;background:rgba(0,0,0,.55);color:#fff;font:700 11px/1 var(--font-sans);padding:5px 7px;border-radius:12px}
.pg-cover .pg-rot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity 1s ease}
.pg-cover .pg-rot.is-on{opacity:1}
.pgh-notes{display:flex;flex-direction:column;gap:1px;background:var(--border-hairline);border:1px solid var(--border-hairline)}
.pgh-note{display:grid;grid-template-columns:56px 1fr;gap:12px;align-items:start;background:var(--bg-box);padding:12px;border:0;text-align:left;color:var(--ink);cursor:pointer;font:inherit;width:100%}
.pgh-note img{width:56px;height:56px;object-fit:cover;background:var(--bg-cream)}
.pgh-note b{font:600 .8rem/1.2 var(--font-sans)}
.pgh-note p{margin:4px 0 0;font-size:.82rem;line-height:1.45;color:var(--ink-soft);word-break:break-word}
.pgh-note small{display:block;margin-top:4px;font:500 .6rem/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
.pgh-empty{background:var(--bg-box);padding:16px;font-size:.8rem;color:var(--ink-soft)}
.pgh-studio{display:flex;align-items:center;gap:10px;width:100%;background:var(--bg-box);border:1px solid var(--border-hairline);padding:16px;color:var(--ink);cursor:pointer;font:inherit;text-align:left}
.pgh-studio span{font:500 .65rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
.pgh-studio b{font-family:var(--font-serif);font-weight:400;font-size:1.3rem;flex:1}
.pgh-studio em{font-style:normal}
.pgm-empty{''')

# collection covers: two layers so they can softly change photo
s = s.replace("""    const im = document.createElement('img');
    const c = ev.photos[0];
    im.src = pgImg(c.id, 720); im.alt = ''; im.loading = 'lazy';
    im.onerror = function () { this.onerror = null; this.src = pgImgFallback(c.id, 720); };
    cover.appendChild(im);""", """    pgRotCover(cover, ev.photos);""", 1)
assert "pgRotCover(cover, ev.photos);" in s

assert s.count("</body>") == 1
s = s.replace("</body>", r"""<script>
// ---- shuffling covers: every visit starts on a random photo, then softly changes every few seconds ----
const PG_ROT = [];
function pgPick(list) { return list[Math.floor(Math.random() * list.length)]; }
function pgShuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pgRotCover(cover, photos, w) {
  w = w || 720;
  const a = document.createElement('img'), b = document.createElement('img');
  a.className = 'pg-rot is-on'; b.className = 'pg-rot'; a.alt = b.alt = '';
  const first = pgPick(photos);
  a.src = pgImg(first.id, w); a.onerror = function () { this.onerror = null; this.src = pgImgFallback(first.id, w); };
  cover.appendChild(a); cover.appendChild(b);
  if (photos.length > 1) PG_ROT.push({ cover, photos, w, cur: first.id, layers: [a, b], on: 0 });
}
function pgRotStep() {
  if (document.hidden) return;
  const live = PG_ROT.filter(r => r.cover.isConnected && r.cover.offsetParent !== null);
  for (let i = PG_ROT.length - 1; i >= 0; i--) if (!PG_ROT[i].cover.isConnected) PG_ROT.splice(i, 1);
  if (!live.length) return;
  const r = pgPick(live);
  let p = pgPick(r.photos); if (p.id === r.cur) p = pgPick(r.photos);
  const next = r.layers[1 - r.on], cur = r.layers[r.on];
  next.onload = () => { next.classList.add('is-on'); cur.classList.remove('is-on'); r.on = 1 - r.on; r.cur = p.id; };
  next.onerror = function () { this.onerror = null; this.src = pgImgFallback(p.id, r.w); };
  next.src = pgImg(p.id, r.w);
}
setInterval(pgRotStep, 2600);

// Root Moment: keep the photographer's own 00_Root_Moment order; with no folder, a fresh mix from every event each visit
buildRootSet = function () {
  let list = GALLERY.root || [];
  if (!list.length) {
    const pools = (GALLERY.events || []).map(e => pgShuffle(e.photos));
    list = [];
    for (let round = 0; list.length < 12 && pools.some(p => p.length); round++) pools.forEach(p => { if (p.length && list.length < 12) list.push(p.shift()); });
  }
  return list.map((p, i) => pgMoment(p, 'Root Moment', i + 1, list.length));
};

function pgAllPhotos() {
  const out = [], seen = {};
  (GALLERY.events || []).forEach(ev => ev.photos.forEach((p, i) => { if (!seen[p.id]) { seen[p.id] = 1; out.push({ p, ev: ev.name, i }); } }));
  (GALLERY.root || []).forEach((p) => { if (!seen[p.id]) { seen[p.id] = 1; out.push({ p, ev: null, i: 0 }); } });
  return out;
}
function pgOpenPhoto(id) {
  const ev = (GALLERY.events || []).find(e => e.photos.some(p => p.id === id));
  if (ev) { openCollection(ev.name, ev.photos.findIndex(p => p.id === id)); return; }
  switchView('moments');
  const item = document.querySelector('.pgm-item[data-pid="' + id + '"]');
  if (item) requestAnimationFrame(() => item.scrollIntoView({ behavior: 'auto' }));
}
function pgAgo(at) {
  if (!at) return 'just now';
  const t = new Date(String(at).replace(' ', 'T') + '+05:30').getTime(), s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago';
  if (s < 86400 * 30) return Math.round(s / 86400) + ' days ago';
  return pgDate(String(at));
}
function pgNoteEl(n) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'pgh-note';
  const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.src = pgImg(n.photoId, 200); im.onerror = function () { this.onerror = null; this.src = pgImgFallback(n.photoId, 200); };
  const box = document.createElement('div');
  box.innerHTML = '<b>' + pgEsc(n.name) + '</b><p>' + pgEsc(n.text) + '</p><small>' + pgEsc(pgAgo(n.at)) + '</small>';
  b.appendChild(im); b.appendChild(box);
  b.addEventListener('click', () => pgOpenPhoto(n.photoId));
  return b;
}
function pgRenderNotes() {
  const list = GALLERY.recentNotes || [];
  const hub = document.getElementById('pghNotes'), wall = document.getElementById('pgWall');
  hub.replaceChildren(...list.slice(0, 4).map(pgNoteEl));
  document.getElementById('pghNotesSec').classList.toggle('hidden', !list.length);
  if (list.length) wall.replaceChildren(...list.map(pgNoteEl));
  else { const e = document.createElement('div'); e.className = 'pgh-empty'; e.textContent = 'No notes yet. Open any photo and tap the note icon to leave the first blessing.'; wall.replaceChildren(e); }
}
let pgHeroTimer = null;
function pgRenderHub() {
  const all = pgAllPhotos();
  const likes = GALLERY.likes || {}, notesN = GALLERY.notes || {};
  const totalLikes = Object.values(likes).reduce((t, v) => t + v, 0), totalNotes = Object.values(notesN).reduce((t, v) => t + v, 0);
  const stat = (v, l) => '<div><b>' + Number(v).toLocaleString('en-IN') + '</b><span>' + l + '</span></div>';
  document.getElementById('pghStats').innerHTML = stat(all.length, 'Photos') + stat((GALLERY.events || []).length, 'Events') + stat(totalLikes, 'Hearts') + stat(totalNotes, 'Notes');
  document.getElementById('pghStudio').textContent = GALLERY.studio || 'Your photographer';
  document.getElementById('pgHubTitle').textContent = GALLERY.title || 'Wedding Hub';
  document.getElementById('pgHubEyebrow').textContent = 'Wedding Hub' + (pgDate(GALLERY.eventDate) ? ' · ' + pgDate(GALLERY.eventDate) : '');
  // events row (each tile keeps changing its photo)
  const row = document.getElementById('pghEvents'); row.innerHTML = '';
  (GALLERY.events || []).forEach(ev => {
    const t = document.createElement('button'); t.type = 'button'; t.className = 'pgh-tile';
    const c = document.createElement('div'); c.className = 'pg-cover'; pgRotCover(c, ev.photos, 600);
    t.appendChild(c);
    const h = document.createElement('h4'); h.textContent = ev.name; const sm = document.createElement('small'); sm.textContent = ev.photos.length + ' photos';
    t.appendChild(h); t.appendChild(sm);
    t.addEventListener('click', () => openCollection(ev.name, 0));
    row.appendChild(t);
  });
  // most loved
  const loved = all.filter(x => likes[x.p.id]).sort((a, b) => likes[b.p.id] - likes[a.p.id]).slice(0, 10);
  const lr = document.getElementById('pghLoved'); lr.innerHTML = '';
  loved.forEach(x => {
    const t = document.createElement('button'); t.type = 'button'; t.className = 'pgh-tile';
    const c = document.createElement('div'); c.className = 'pg-cover';
    const im = document.createElement('img'); im.className = 'pg-rot is-on'; im.alt = ''; im.loading = 'lazy'; im.src = pgImg(x.p.id, 400); im.onerror = function () { this.onerror = null; this.src = pgImgFallback(x.p.id, 400); };
    const hb = document.createElement('span'); hb.className = 'pgh-heart'; hb.textContent = '♥ ' + likes[x.p.id];
    c.appendChild(im); c.appendChild(hb); t.appendChild(c);
    t.addEventListener('click', () => pgOpenPhoto(x.p.id));
    lr.appendChild(t);
  });
  document.getElementById('pghLovedSec').classList.toggle('hidden', !loved.length);
  pgRenderNotes();
  // hero slideshow: highlights from every event, always changing
  const hero = pgShuffle(all).slice(0, 40), A = document.getElementById('pghHeroA'), B = document.getElementById('pghHeroB'), now = document.getElementById('pghNow');
  let k = 0, on = A, cur = hero[0];
  function show(x, layer) { layer.onerror = function () { this.onerror = null; this.src = pgImgFallback(x.p.id, 1600); }; layer.src = pgImg(x.p.id, 1600); }
  if (hero.length) { show(hero[0], A); now.textContent = hero[0].ev || 'Root Moment'; }
  clearInterval(pgHeroTimer);
  if (hero.length > 1) pgHeroTimer = setInterval(() => {
    if (document.hidden || !document.getElementById('view-hub').classList.contains('active')) return;
    k = (k + 1) % hero.length; const x = hero[k], off = on === A ? B : A;
    off.onload = () => { off.classList.add('is-on'); on.classList.remove('is-on'); on = off; cur = x; now.textContent = x.ev || 'Root Moment'; };
    show(x, off);
  }, 4500);
  const heroEl = document.getElementById('pghHero');
  heroEl.onclick = () => { if (cur) pgOpenPhoto(cur.p.id); };
  heroEl.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && cur) { e.preventDefault(); pgOpenPhoto(cur.p.id); } };
}
</script>
</body>""", 1)

# ===================== Viewer feed, zoom, download, full screen, app install (2026-11-07) =====================
rep('<meta name="theme-color" content="#F6EFEA">', '''<meta name="theme-color" content="#F6EFEA">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Wedding Gallery" id="pgAppTitle">
<link rel="apple-touch-icon" href="/app/icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/app/icons/icon-192.png">''')
rep('<div class="pgv-count" id="pgvCount"></div>', '''<div class="pgv-top-r"><div class="pgv-count" id="pgvCount"></div><button type="button" class="pgv-ic hidden" id="pgvFull" aria-label="Full screen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>''')
rep('''  <button type="button" class="pgv-ic" id="pgvInfo" aria-label="Photo details">''', '''  <button type="button" class="pgv-ic" id="pgvSave" aria-label="Download photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg></button>
  <button type="button" class="pgv-ic" id="pgvZoom" aria-label="Zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5"/></svg></button>
  <button type="button" class="pgv-ic" id="pgvInfo" aria-label="Photo details">''')
rep('<div class="pgh-stats" id="pghStats"></div>', '''<div class="pgh-stats" id="pghStats"></div>
    <div class="pgh-install hidden" id="pghInstall"><div><b>Keep this gallery as an app</b><span id="pghInstallTxt">Opens full screen, straight from your home screen.</span></div><button type="button" class="mk-btn-peach" id="pghInstallBtn">Install</button></div>''')
rep('<div class="pg-toast" id="pgToast"></div>', '''<div class="overlay-backdrop" id="iosBackdrop"></div>
<div class="reg-overlay fm-sheet" id="iosSheet" role="dialog" aria-modal="true" aria-labelledby="iosTitle">
  <button type="button" class="pgv-sheet-close" id="iosClose" aria-label="Close">×</button>
  <h3 class="fm-title" id="iosTitle">Add to Home Screen</h3>
  <p class="fm-sub">On iPhone the gallery opens full screen when it is on your home screen.</p>
  <ol class="ios-steps">
    <li>Tap the <b>Share</b> button <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11v9h12v-9"/></svg> at the bottom (or top) of Safari.</li>
    <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
    <li>Tap <b>Add</b>. Open the gallery from the new icon.</li>
  </ol>
</div>
<div class="pg-toast" id="pgToast"></div>''')

rep('.pgm-empty{', r'''/* ===== viewer: one photo per screen, scrolls like the filmstrip ===== */
#view-root #mkPhotoHero{display:none!important}
.pgv-feed{position:absolute;inset:0;overflow-y:scroll;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none;z-index:1;background:#0b0908}
.pgv-feed::-webkit-scrollbar{display:none}
.pgv-item{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;overflow:hidden;touch-action:pan-y;cursor:pointer}
.pgv-iblur{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(32px) brightness(.42) saturate(1.1);transform:scale(1.12)}
.pgv-item img,.pgm-item .pgm-img{transform-origin:center center;will-change:transform}
.pgv-item img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.is-zoomed{touch-action:none!important;cursor:grab}
.pgv-top-r{display:flex;align-items:center;gap:10px;padding-right:calc(var(--rail-width) + var(--rail-right-gap))}
.pgv-top-r .pgv-count{padding-right:0}
.pgv-ic.hidden{display:none}
.pgv-ic.on{background:rgba(255,255,255,.9);color:#141413}
@media (max-width:380px){.pgv-bar{gap:6px}.pgv-ic{min-width:38px;height:38px;padding:0 8px}}
.mk-header{padding-top:calc(12px + env(safe-area-inset-top,0px))}
.pgh-install{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--ink);color:var(--bg-cream);padding:14px 16px;margin:-4px 0 18px}
.pgh-install.hidden{display:none}
.pgh-install b{display:block;font-family:var(--font-serif);font-weight:400;font-size:1.25rem}
.pgh-install span{font-size:.72rem;opacity:.8}
.pgh-install .mk-btn-peach{flex:none}
.ios-steps{margin:4px 0 8px 18px;padding:0;font-size:.85rem;line-height:1.6;color:var(--ink)}
.ios-steps li{margin-bottom:8px}
.ios-steps svg{width:18px;height:18px;vertical-align:-3px}
.pgm-item{touch-action:pan-y}
.pgm-empty{''')

assert s.count("</body>") == 1
s = s.replace("</body>", r"""<script>
// ---------- zoom: pinch on phones, button / ctrl+wheel / drag on computers. Photos are always shown whole until zoomed. ----------
function pgZoomable(box, img, scroller) {
  let s = 1, x = 0, y = 0, st = null, drag = null;
  function apply() {
    img.style.transform = s > 1.001 ? 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')' : '';
    box.classList.toggle('is-zoomed', s > 1.001);
    scroller.style.overflowY = s > 1.001 ? 'hidden' : '';
  }
  function clamp() { const mx = (s - 1) * box.clientWidth / 2, my = (s - 1) * box.clientHeight / 2; x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y)); }
  function rel(cx, cy) { const r = box.getBoundingClientRect(); return [cx - r.left - r.width / 2, cy - r.top - r.height / 2]; }
  function zoomAt(ns, px, py) { ns = Math.max(1, Math.min(5, ns)); const k = ns / s; x = px - k * (px - x); y = py - k * (py - y); s = ns; if (s <= 1.001) { s = 1; x = y = 0; } clamp(); apply(); }
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  box.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { e.preventDefault(); const m = rel((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2); st = { d: dist(e.touches), s, x, y, m }; scroller.style.overflowY = 'hidden'; }
    else if (e.touches.length === 1 && s > 1) st = { px: e.touches[0].clientX, py: e.touches[0].clientY, x, y };
  }, { passive: false });
  box.addEventListener('touchmove', (e) => {
    if (!st) return;
    if (e.touches.length === 2 && st.d) {
      e.preventDefault();
      const ns = Math.max(1, Math.min(5, st.s * dist(e.touches) / st.d));
      const m = rel((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2), k = ns / st.s;
      x = m[0] - k * (st.m[0] - st.x); y = m[1] - k * (st.m[1] - st.y); s = ns; clamp(); apply();
    } else if (e.touches.length === 1 && s > 1 && st.px !== undefined) {
      e.preventDefault(); x = st.x + e.touches[0].clientX - st.px; y = st.y + e.touches[0].clientY - st.py; clamp(); apply();
    }
  }, { passive: false });
  box.addEventListener('touchend', (e) => {
    if (e.touches.length === 1 && s > 1) { st = { px: e.touches[0].clientX, py: e.touches[0].clientY, x, y }; return; }
    if (!e.touches.length) { if (s < 1.08) reset(); else apply(); st = null; }
  });
  box.addEventListener('wheel', (e) => {
    if (e.ctrlKey) { e.preventDefault(); e.stopPropagation(); const p = rel(e.clientX, e.clientY); zoomAt(s * Math.exp(-e.deltaY / 120), p[0], p[1]); }
    else if (s > 1) { e.preventDefault(); e.stopPropagation(); x -= e.deltaX; y -= e.deltaY; clamp(); apply(); }
  }, { passive: false });
  box.addEventListener('mousedown', (e) => { if (s > 1 && e.button === 0) { drag = { px: e.clientX, py: e.clientY, x, y, moved: false }; e.preventDefault(); } });
  window.addEventListener('mousemove', (e) => { if (!drag) return; x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; if (Math.abs(e.clientX - drag.px) + Math.abs(e.clientY - drag.py) > 4) drag.moved = true; clamp(); apply(); });
  window.addEventListener('mouseup', () => { if (drag && drag.moved) box.dataset.dragged = String(Date.now()); drag = null; });
  function reset() { const was = s > 1; s = 1; x = y = 0; apply(); return was; }
  return { reset, zoomed: () => s > 1.001, toggle: (cx, cy) => { if (s > 1) reset(); else { const p = cx === undefined ? [0, 0] : rel(cx, cy); zoomAt(2.5, p[0], p[1]); } } };
}
document.addEventListener('gesturestart', (e) => e.preventDefault()); // iPhone: no page zoom, our pinch zoom instead

// ---------- download (no name or number asked) ----------
const pgBlobCache = {};
function pgFileName(m) {
  const slug = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [slug(GALLERY.title) || 'wedding', slug(m.ceremony || m.set || 'photo'), String(m.n || (MOMENTS.indexOf(m) + 1) || 1).padStart(3, '0')].join('_') + '.jpg';
}
async function pgDownload(m) {
  if (!m) return;
  const name = pgFileName(m), phone = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const saveBlob = (blob) => {
    const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
    if (phone && navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file] });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000); showToast('Photo saved');
  };
  try {
    if (pgBlobCache[m.id]) { await saveBlob(pgBlobCache[m.id]); return; }
    showToast('Getting the photo…');
    const r = await fetch(pgImg(m.id, 2048)); if (!r.ok) throw new Error('fetch');
    const blob = await r.blob(); pgBlobCache[m.id] = blob;
    try { await saveBlob(blob); }
    catch (e) { if (e && e.name === 'AbortError') return; if (e && e.name === 'NotAllowedError') { showToast('Photo ready — tap download again to save'); return; } throw e; }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    window.open('https://drive.google.com/uc?export=download&id=' + encodeURIComponent(m.id), '_blank', 'noopener');
  }
}

// ---------- viewer feed: one photo per screen; swipe/scroll moves the whole photo, like the filmstrip ----------
(function pgViewerFeed() {
  const feed = document.getElementById('pgvFeed'), view = document.getElementById('view-root');
  let items = [], feedIdx = 0, fromFeed = false, scrollTimer = null, lockUntil = 0;
  // While the app moves the photos itself (filmstrip, arrows, thumbnails), the feed's own scroll events are ignored,
  // so the filmstrip and the big photo never pull each other back.
  function build() {
    feed.innerHTML = ''; feedIdx = 0;
    items = MOMENTS.map((m, i) => {
      const el = document.createElement('div'); el.className = 'pgv-item'; el.dataset.i = i;
      const bl = document.createElement('div'); bl.className = 'pgv-iblur';
      const im = document.createElement('img'); im.alt = (GALLERY.title || '') + ' · ' + (CURRENT_SET || '') + ' ' + (i + 1); im.decoding = 'async'; im.draggable = false;
      el.appendChild(bl); el.appendChild(im); feed.appendChild(el);
      return { el, im, bl, m, z: null };
    });
  }
  function load(i) {
    for (let j = i - 1; j <= i + 2; j++) {
      const it = items[j]; if (!it || it.im.getAttribute('src')) continue;
      it.im.onerror = function () { this.onerror = null; this.src = pgImgFallback(it.m.id, 2048); it.bl.style.backgroundImage = 'url("' + pgImgFallback(it.m.id, 60) + '")'; };
      it.im.src = it.m.photoUrl || pgImg(it.m.id, 2048);
      it.bl.style.backgroundImage = 'url("' + pgImg(it.m.id, 60) + '")';
      it.z = pgZoomable(it.el, it.im, feed);
    }
  }
  function cur() { return items[feedIdx]; }
  window.pgvIsZoomed = () => !!(cur() && cur().z && cur().z.zoomed());
  window.pgvZoomReset = () => !!(cur() && cur().z && cur().z.reset());
  function scrollToIdx(i, smooth) {
    const h = feed.clientHeight; if (!h) return;
    if (Math.abs(feed.scrollTop - i * h) < 2) return;
    lockUntil = Date.now() + (smooth ? 700 : 250);
    feed.scrollTo({ top: i * h, behavior: smooth ? 'smooth' : 'auto' });
  }
  const userOnStrip = () => Date.now() - stripTouchAt < 900;
  let stripTouchAt = 0, stripFingerAt = 0;
  ['touchstart', 'touchmove', 'pointerdown', 'wheel'].forEach(ev => stripScroller.addEventListener(ev, () => { stripTouchAt = stripFingerAt = Date.now(); }, { passive: true }));
  // the glide after the finger lifts still counts as the guest using the filmstrip (only if a finger touched it just before)
  stripScroller.addEventListener('scroll', () => { if (Date.now() - stripFingerAt < 2500) stripTouchAt = Date.now(); }, { passive: true });
  const _useSet = useSet;
  useSet = function (name) { _useSet(name); build(); };
  const _apply = applyActiveMoment;
  applyActiveMoment = function (idx) {
    _apply(idx);
    if (fromFeed || !items.length) return;
    const target = activeIdx, near = Math.abs(target - feedIdx) <= 1;
    items.forEach(it => it.z && it.z.reset());
    feedIdx = target; load(target);
    // from the filmstrip: jump straight to the photo (no slow slide that could be read as the guest scrolling back)
    requestAnimationFrame(() => scrollToIdx(target, near && !userOnStrip() && view.classList.contains('active')));
  };
  function waitMs() { const now = Date.now(); return Math.max(120, lockUntil - now + 60, userOnStrip() ? stripTouchAt + 960 - now : 0); }
  function settle() {
    if (Date.now() < lockUntil || userOnStrip()) { scrollTimer = setTimeout(settle, waitMs()); return; }
    const h = feed.clientHeight; if (!h || !items.length) return;
    if (Math.abs(feed.scrollTop / h - Math.round(feed.scrollTop / h)) > 0.08) return; // still moving between photos
    const i = Math.max(0, Math.min(items.length - 1, Math.round(feed.scrollTop / h)));
    load(i);
    if (i !== activeIdx) {
      items.forEach((it, k) => { if (k !== i && it.z) it.z.reset(); });
      feedIdx = i; fromFeed = true;
      try { selectMomentDirectly(i, true); } finally { fromFeed = false; }
    }
  }
  feed.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(settle, waitMs()); }, { passive: true });
  window.addEventListener('resize', () => { if (items.length) scrollToIdx(feedIdx, false); });
  // buttons
  document.getElementById('pgvSave').addEventListener('click', () => pgDownload(MOMENTS[activeIdx]));
  const zb = document.getElementById('pgvZoom');
  zb.addEventListener('click', () => { const it = cur(); if (!it) return; load(feedIdx); it.z.toggle(); zb.classList.toggle('on', it.z.zoomed()); });
  feed.addEventListener('scroll', () => zb.classList.remove('on'), { passive: true });
  const fsb = document.getElementById('pgvFull'), de = document.documentElement;
  const fsOk = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  if (fsOk && !/iPhone|iPod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches) fsb.classList.remove('hidden');
  fsb.addEventListener('click', () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { const r = (de.requestFullscreen || de.webkitRequestFullscreen).call(de); if (r && r.catch) r.catch(() => {}); }
  });
  // a drag to pan must not count as a tap
  feed.addEventListener('click', (e) => { const it = e.target.closest('.pgv-item'); if (it && it.dataset.dragged && Date.now() - Number(it.dataset.dragged) < 300) e.stopImmediatePropagation(); }, true);
})();

// ---------- Root Moment reels: zoom + download, like Instagram ----------
(function pgReelsExtra() {
  const ICON_SAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';
  const _render = renderMoments;
  renderMoments = function () {
    _render();
    const feed = document.getElementById('pgmFeed'), zs = [];
    document.querySelectorAll('#pgmFeed .pgm-item').forEach((item, i) => {
      const m = ROOT_SET[i], img = item.querySelector('.pgm-img'); if (!m || !img) return;
      const z = pgZoomable(item, img, feed); zs.push(z);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pgm-btn'; b.setAttribute('aria-label', 'Download photo'); b.innerHTML = ICON_SAVE;
      b.addEventListener('click', (e) => { e.stopPropagation(); pgDownload(m); });
      const acts = item.querySelector('.pgm-actions'); if (acts) acts.appendChild(b);
    });
    let t = null;
    feed.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => zs.forEach(z => z.zoomed() && !feed.style.overflowY && z.reset()), 120); }, { passive: true });
  };
})();

// ---------- install as an app (PWA) ----------
(function pgInstall() {
  const card = document.getElementById('pghInstall'), btn = document.getElementById('pghInstallBtn');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferred = null;
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; if (!standalone) card.classList.remove('hidden'); });
  window.addEventListener('appinstalled', () => { card.classList.add('hidden'); showToast('Installed — open it from your home screen'); });
  if (!standalone && ios) card.classList.remove('hidden');
  const sheet = document.getElementById('iosSheet'), back = document.getElementById('iosBackdrop');
  const closeIos = () => { sheet.classList.remove('show'); back.classList.remove('show'); };
  document.getElementById('iosClose').addEventListener('click', closeIos); back.addEventListener('click', closeIos);
  btn.addEventListener('click', () => {
    if (deferred) { deferred.prompt(); deferred.userChoice.finally(() => { deferred = null; }); return; }
    if (ios) { sheet.classList.add('show'); back.classList.add('show'); return; }
    showToast('Use your browser menu → Install app / Add to Home screen');
  });
  // per-gallery manifest (name + start page), added once the gallery is known
  window.pgSetAppMeta = function () {
    if (!GALLERY || !GALLERY_ID) return;
    document.getElementById('pgAppTitle').setAttribute('content', String(GALLERY.title || 'Wedding Gallery').slice(0, 30));
    if (!document.querySelector('link[rel=manifest]')) {
      const l = document.createElement('link'); l.rel = 'manifest';
      l.href = '/api/manifest?g=' + encodeURIComponent(GALLERY_ID) + '&n=' + encodeURIComponent(GALLERY.title || 'Wedding Gallery');
      document.head.appendChild(l);
    }
  };
})();
</script>
</body>""", 1)
rep("""    renderMoments();
    pgRenderHub();""", """    renderMoments();
    pgRenderHub();
    pgSetAppMeta();""")

# ===================== iPhone home-screen app: fill the bottom of the screen (2026-11-07) =====================
# In an iPhone home-screen app, iOS can stop "full screen" boxes short of the bottom edge, leaving a light strip.
# We size the photo screens from the real screen height and keep the page behind them dark.
rep('.pgm-empty{', r"""html.pg-dark,body.pgv-on,body.pgm-on{background:#0b0908}
html.ios-app #view-moments,html.ios-app #view-root.active{bottom:auto;height:var(--pg-full-h,100dvh)}
html.ios-app .pgm-feed,html.ios-app .pgm-item,html.ios-app #view-root .mk-root-stage{height:var(--pg-full-h,100dvh)}
.pgm-empty{""")
assert s.count("</body>") == 1
s = s.replace("</body>", r"""<script>
(function pgIosAppHeight() {
  const de = document.documentElement;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const app = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  function dark() { de.classList.toggle('pg-dark', document.body.classList.contains('pgv-on') || document.body.classList.contains('pgm-on')); }
  new MutationObserver(dark).observe(document.body, { attributes: true, attributeFilter: ['class'] }); dark();
  if (!(ios && app)) return;
  de.classList.add('ios-app');
  function size() {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const full = portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width);
    de.style.setProperty('--pg-full-h', Math.max(full, window.innerHeight) + 'px');
  }
  size(); window.addEventListener('resize', size); window.addEventListener('orientationchange', () => setTimeout(size, 300));
})();
</script>
</body>""", 1)

# ===================== Reel maker entry points (2026-11-07) =====================
rep('''  <button type="button" class="pgv-ic" id="pgvInfo" aria-label="Photo details">''', '''  <button type="button" class="pgv-ic" id="pgvReel" aria-label="Make a reel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8h18M8 3l3 5M14 3l3 5"/><path d="m10 12 5 3-5 3z"/></svg></button>
  <button type="button" class="pgv-ic" id="pgvInfo" aria-label="Photo details">''')
rep('''    <button type="button" class="mk-btn-peach" id="fmOpen">See your photos</button>''', '''    <button type="button" class="mk-btn-peach" id="fmOpen">See your photos</button>
    <button type="button" class="fm-upload fm-reel" id="fmReel">Make a reel of your photos</button>''')
s = s.replace('''    <div class="pgh-sec"><div class="pgh-head"><h3>Events</h3>''', '''    <button type="button" class="pg-findme pgh-reel" id="pghReel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8h18M8 3l3 5M14 3l3 5"/><path d="m10 12 5 3-5 3z"/></svg><span>Make a reel · music &amp; your photos</span></button>
    <div class="pgh-sec"><div class="pgh-head"><h3>Events</h3>''', 1)
assert 'id="pghReel"' in s
rep('.pgm-empty{', r'''.fm-reel{width:100%;justify-content:center;margin-top:8px}
.pgh-reel{background:var(--bg-box);color:var(--ink);margin-left:0}
.pgh-wrap .pg-findme{width:100%;justify-content:center;margin:0 0 10px}
.pgm-empty{''')
assert s.count("</body>") == 1
s = s.replace("</body>", r"""<script>
let pgReelLoad = null;
function pgOpenReel(photos) {
  photos = (photos || []).filter(Boolean);
  if (!photos.length) { showToast('No photos to make a reel'); return; }
  if (!pgReelLoad) pgReelLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/app/reel.js'; s.onload = res; s.onerror = () => { pgReelLoad = null; rej(new Error('Could not open the reel maker. Check the internet.')); }; document.head.appendChild(s); });
  pgReelLoad.then(() => PGReel.open({ photos: photos.map(p => ({ id: p.id })), title: GALLERY.title, date: pgDate(GALLERY.eventDate), studio: GALLERY.studio, api: pgApi }))
    .catch(e => showToast(e.message));
}
document.getElementById('pgvReel').addEventListener('click', () => pgOpenReel(MOMENTS.map(m => ({ id: m.id }))));
document.getElementById('fmReel').addEventListener('click', () => {
  const set = (GALLERY.personal || []).find(e => e.name === 'Your photos') || (GALLERY.personal || [])[0];
  document.getElementById('fmClose').click();
  pgOpenReel(set ? set.photos : []);
});
document.getElementById('pghReel').addEventListener('click', () => {
  const pools = (GALLERY.events || []).map(e => pgShuffle(e.photos)), pick = [];
  while (pick.length < 24 && pools.some(p => p.length)) pools.forEach(p => { if (p.length && pick.length < 24) pick.push(p.shift()); });
  pgOpenReel(pick.length ? pick : (GALLERY.root || []));
});
</script>
</body>""", 1)

s = s.replace('aria-label="Memory Rooms" title="Rooms"', 'aria-label="Notes and blessings" title="Notes"')
import collections; left=[s[m.start()-60:m.start()+30] for m in re.finditer('(?i)demo', s)]; print('demo left:', left)
open(out, 'w', encoding='utf-8').write(s)
print('ok', len(s))
