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
rep('<span id="mkNextMomentLabel">Scroll past end for Moment 2/12 ↓</span>\n        <span>Demo Preview</span>', '<span id="mkNextMomentLabel"></span>\n        <span id="pgSetLabel">Root Moment</span>')
rep('<div class="mk-counter-num" id="mkCounterText">1/12</div>', '<div class="mk-counter-num" id="mkCounterText"></div>')

# ---- galleries view ----
rep('<div class="pg-module-eyebrow">Full Archive · Demo Preview</div>', '<div class="pg-module-eyebrow" id="pgGalleryEyebrow">Full Archive</div>')
rep('<p class="pg-module-sub">Tap any photograph below to open it directly inside the Root Moment filmstrip viewer. Scroll down this page to watch the TKG dock curl into its compact circle.</p>',
    '<p class="pg-module-sub">Every event of the day. Tap any photograph to open it in the full-screen viewer.</p>\n    <div class="pg-event-chips" id="pgEventChips"></div>')

rep('<div class="pg-gallery-masonry" id="pgGalleryMasonry"></div>', '<div id="pgGalleryMasonry"></div>')

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
rep('</style>\n</head>', """.pg-event-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.pg-event-chips button{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;background:var(--bg-box);color:var(--ink);border:1px solid var(--border-hairline);padding:8px 12px;cursor:pointer;min-height:40px}
.pg-event-heading{font-family:var(--font-serif);font-weight:400;font-size:1.8rem;margin:28px 0 12px;scroll-margin-top:80px}
.pg-event-heading small{font-family:var(--font-mono);font-size:.7rem;color:var(--ink-faint);margin-left:8px;letter-spacing:.08em}
.pg-boot{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:var(--bg-cream);color:var(--ink);font-family:var(--font-mono);font-size:.8rem;text-align:center;padding:24px}
.pg-boot h1{font-family:var(--font-serif);font-weight:400;font-size:2rem;margin:0}
.pg-boot.hide{display:none}
.mk-meta-label.is-empty,.mk-meta-value.is-empty{display:none}
#mkLikeBtn.is-liked svg{fill:currentColor}
</style>
</head>""")
rep('<div class="pg-toast" id="pgToast"></div>', '<div class="pg-toast" id="pgToast"></div>\n<div class="pg-boot" id="pgBoot" role="status"><h1>PicGrades</h1><span id="pgBootMsg">Opening the gallery…</span></div>\n<script src="config.js"></script>')

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
  if (name === 'root') MOMENTS = ROOT_SET;
  else { const ev = GALLERY.events.find(e => e.name === name); MOMENTS = ev ? ev.photos.map((p, i) => pgMoment(p, ev.name, i + 1, ev.photos.length)) : ROOT_SET; }
  activeIdx = -1;
  initFilmstrip();
  const lbl = document.getElementById('pgSetLabel'); if (lbl) lbl.textContent = name === 'root' ? 'Root Moment' : name;
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
  const masonry = document.getElementById('pgGalleryMasonry');
  const chips = document.getElementById('pgEventChips');
  masonry.innerHTML = ''; chips.innerHTML = '';
  (GALLERY.events || []).forEach((ev, eIdx) => {
    const anchor = 'ev-' + eIdx;
    const chip = document.createElement('button');
    chip.type = 'button'; chip.textContent = ev.name + ' · ' + ev.photos.length;
    chip.addEventListener('click', () => { const h = document.getElementById(anchor); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    chips.appendChild(chip);
    const h = document.createElement('h3');
    h.className = 'pg-event-heading'; h.id = anchor;
    h.innerHTML = pgEsc(ev.name) + '<small>' + ev.photos.length + ' PHOTOS</small>';
    masonry.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'pg-gallery-masonry';
    masonry.appendChild(grid);
    ev.photos.forEach((p, idx) => {
      const gItem = document.createElement('div');
      gItem.className = 'pg-gallery-thumb';
      gItem.setAttribute('role', 'button'); gItem.tabIndex = 0;
      const im = document.createElement('img');
      im.src = pgImg(p.id, 720); im.alt = ev.name + ' photo ' + (idx + 1); im.loading = 'lazy';
      im.onerror = function () { this.onerror = null; this.src = pgImgFallback(p.id, 720); };
      const cap = document.createElement('span');
      cap.textContent = (idx + 1) + '/' + ev.photos.length + ' · ' + ev.name.toUpperCase();
      gItem.appendChild(im); gItem.appendChild(cap);
      const open = () => { useSet(ev.name); switchView('root'); requestAnimationFrame(() => selectMomentDirectly(idx, false)); };
      gItem.addEventListener('click', open);
      gItem.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      grid.appendChild(gItem);
    });
  });
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
rep("  commentCountEl.textContent = m.comments.length;\n}", "  commentCountEl.textContent = m.noteCount;\n}")

# ---- view-event-gallery button jumps to this event ----
rep("document.getElementById('mkViewProjectBtn').addEventListener('click', () => { switchView('gallery'); });",
    """document.getElementById('mkViewProjectBtn').addEventListener('click', () => {
  switchView('gallery');
  if (CURRENT_SET !== 'root') { const i = GALLERY.events.findIndex(e => e.name === CURRENT_SET); const h = document.getElementById('ev-' + i); if (h) setTimeout(() => h.scrollIntoView({ block: 'start' }), 50); }
});""")

# ---- likes: real ----
ls = s.index("likeBtn.addEventListener('click', () => {")
le = s.index("const commentBackdrop")
s = s[:ls] + """likeBtn.addEventListener('click', () => {
  const m = MOMENTS[activeIdx];
  if (!m || likeBtn.dataset.busy === '1') return;
  likeBtn.dataset.busy = '1';
  m.liked = !m.liked; m.likes += m.liked ? 1 : -1;
  likeCountEl.textContent = m.likes; likeBtn.classList.toggle('is-liked', m.liked);
  pgApi('likePhoto', { photoId: m.id }).then(res => {
    m.liked = res.liked; m.likes = res.likes;
    GALLERY.likes[m.id] = res.likes; if (res.liked) GALLERY.mine[m.id] = true; else delete GALLERY.mine[m.id];
    ROOT_SET.concat(MOMENTS).forEach(x => { if (x.id === m.id) { x.liked = res.liked; x.likes = res.likes; } });
    if (MOMENTS[activeIdx] === m) { likeCountEl.textContent = m.likes; likeBtn.classList.toggle('is-liked', m.liked); }
  }).catch(err => {
    m.liked = !m.liked; m.likes += m.liked ? 1 : -1;
    likeCountEl.textContent = m.likes; likeBtn.classList.toggle('is-liked', m.liked);
    showToast(err.message);
  }).finally(() => { likeBtn.dataset.busy = ''; });
});

""" + s[le:]

# ---- notes: real ----
cs = s.index("document.getElementById('mkCommentBtn').addEventListener('click', () => {")
ce = s.index("// TKG Dock Directional Scroll")
s = s[:cs] + """function renderNotes(list) {
  commentListContainer.innerHTML = list.length
    ? list.map(c => `<div class="mk-comment-item"><strong>${pgEsc(c.name)}:</strong> ${pgEsc(c.text)}</div>`).join('')
    : '<div class="mk-comment-item">No notes yet. Be the first to leave one.</div>';
}
document.getElementById('mkCommentBtn').addEventListener('click', () => {
  const m = MOMENTS[activeIdx];
  if (!m) return;
  document.getElementById('commentSheetHeading').textContent = `Moment Notes · ${activeIdx + 1}/${MOMENTS.length}`;
  commentListContainer.innerHTML = '<div class="mk-comment-item">Loading notes…</div>';
  try { const nm = localStorage.getItem('pg_note_name'); if (nm) document.getElementById('commentName').value = nm; } catch (e) {}
  commentBackdrop.classList.add('show');
  commentSheet.classList.add('show');
  pgApi('getNotes', { photoId: m.id }).then(res => renderNotes(res.notes)).catch(err => { commentListContainer.innerHTML = '<div class="mk-comment-item">' + pgEsc(err.message) + '</div>'; });
});
commentBackdrop.addEventListener('click', () => { commentBackdrop.classList.remove('show'); commentSheet.classList.remove('show'); });
document.getElementById('commentForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const m = MOMENTS[activeIdx];
  const inp = document.getElementById('commentInput'), nameInp = document.getElementById('commentName');
  const val = inp.value.trim(), name = nameInp.value.trim();
  if (!m) return;
  if (!name) { nameInp.focus(); showToast('Add your name first'); return; }
  if (!val) { inp.focus(); return; }
  const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
  try { localStorage.setItem('pg_note_name', name); } catch (er) {}
  pgApi('addNote', { photoId: m.id, name: name, text: val }).then(() => {
    inp.value = '';
    m.noteCount += 1; GALLERY.notes[m.id] = m.noteCount;
    document.getElementById('mkCommentCount').textContent = m.noteCount;
    showToast('Note added');
    return pgApi('getNotes', { photoId: m.id }).then(res => renderNotes(res.notes));
  }).catch(err => showToast(err.message)).finally(() => { btn.disabled = false; });
});
document.getElementById('mkShareBtn').addEventListener('click', () => {
  const url = location.origin + location.pathname + '?g=' + encodeURIComponent(GALLERY_ID);
  const title = (GALLERY && GALLERY.title) ? GALLERY.title + ' · PicGrades' : 'PicGrades Gallery';
  if (navigator.share) { navigator.share({ title: title, url: url }).catch(() => {}); return; }
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => showToast('Gallery link copied'), () => showToast(url));
  else showToast(url);
});

""" + s[ce:]

# ---- switching to Root Moment from the dock restores the Root Moment set ----
rep("""  if (viewKey === 'root') {
    requestAnimationFrame(() => selectMomentDirectly(activeIdx >= 0 ? activeIdx : 0, false));
  }""", """  if (viewKey === 'root') {
    requestAnimationFrame(() => selectMomentDirectly(activeIdx >= 0 ? activeIdx : 0, false));
  }
}
function switchViewFromNav(viewKey) {
  if (viewKey === 'root' && CURRENT_SET !== 'root') useSet('root');
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
    useSet('root');
    selectMomentDirectly(0, false);
    bootEl.classList.add('hide');
  }).catch(err => { bootMsg.textContent = err.message; });
})();""")

import collections; left=[s[m.start()-60:m.start()+30] for m in re.finditer('(?i)demo', s)]; print('demo left:', left)
open(out, 'w', encoding='utf-8').write(s)
print('ok', len(s))
