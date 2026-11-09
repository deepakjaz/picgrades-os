// Core: loads the wedding, collections, filmstrip, viewer basics, Root Moment, hearts, notes, navigation, start-up.
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
// ===== PicGrades OS live data (replaces the demo array) =====
// ---------- feature hooks ----------
// Features add to the core screens with pgAfter('renderMoments', fn) / pgBefore(...) instead of wrapping the
// functions again and again. Hooks run in the order the feature files load (see the list of files in gallery.html).
const PG_HOOKS = { before: {}, after: {} };
function pgBefore(name, fn) { (PG_HOOKS.before[name] = PG_HOOKS.before[name] || []).push(fn); }
function pgAfter(name, fn) { (PG_HOOKS.after[name] = PG_HOOKS.after[name] || []).push(fn); }
function pgHookable(name) {
  const core = window[name];
  window[name] = function () {
    const args = arguments;
    (PG_HOOKS.before[name] || []).forEach(f => f.apply(null, args));
    const r = core.apply(this, args);
    (PG_HOOKS.after[name] || []).forEach(f => f.apply(null, args));
    return r;
  };
}
const API = (window.PG_CONFIG || {}).apiUrl;
// a photographer's page (/p/<name>) uses the same app; its id is 'p-<name>' so nothing mixes with a wedding
const PG_STUDIO_SLUG = (new URLSearchParams(location.search).get('p') || (location.pathname.match(/\/p\/([a-z0-9-]+)/) || [])[1] || '').trim().toLowerCase();
const GALLERY_ID = PG_STUDIO_SLUG ? 'p-' + PG_STUDIO_SLUG : (new URLSearchParams(location.search).get('g') || (location.pathname.match(/\/g\/([a-z0-9]+)/) || [])[1] || '').trim();
let GALLERY = null;            // manifest from the backend
let ROOT_SET = [];             // Root Moment list
let CURRENT_SET = 'root';      // 'root' or an event name
let MOMENTS = [];              // list shown in the viewer (Root Moment or one event)
function pgDevice() {
  try { let d = localStorage.getItem('pg_device'); if (!d) { d = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('pg_device', d); } return d; }
  catch (e) { if (!window.__pgDev) window.__pgDev = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36); return window.__pgDev; }
}
function pgApi(action, body) {
  return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action, g: GALLERY_ID, device: pgDevice() }, PG_STUDIO_SLUG ? { slug: PG_STUDIO_SLUG } : {}, body || {})) })
    .then(r => r.json()).then(res => { if (!res.ok) throw new Error(res.error || 'Something went wrong.'); return res; });
}
function pgImg(id, w) { return 'https://lh3.googleusercontent.com/d/' + id + '=w' + w; }
// Phones get photos sized for their screen (an iPhone shows ~1200 px across; 2048 px photos use 3× the memory and make Safari reload the page).
// Downloads still use the full 2048 px photo.
const PG_PHONE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) || Math.min(screen.width, screen.height) < 820;
const PG_FULL_W = PG_PHONE ? 1280 : 2048, PG_THUMB_W = 200;
function pgImgFallback(id, w) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + w; }
function pgEsc(t) { const d = document.createElement('div'); d.textContent = String(t == null ? '' : t); return d.innerHTML; }
function pgDate(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '.' + m[2] + '.' + m[1].slice(2) : ''; }
function pgMoment(photo, ceremony, n, total) {
  return {
    id: photo.id, n: n, title: (ceremony === 'Root Moment' ? GALLERY.title : ceremony) + ' · ' + n + '/' + total, story: '',
    date: pgDate(GALLERY.eventDate), couple: String(GALLERY.title || '').toUpperCase(), ceremony: ceremony.toUpperCase(),
    camera: '', lens: GALLERY.studio ? ('EDITED BY PICGRADES · ' + String(GALLERY.studio).toUpperCase()) : '',
    photoUrl: pgImg(photo.id, PG_FULL_W), thumbUrl: pgImg(photo.id, PG_THUMB_W),
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
}

const rootStage = document.getElementById('mkRootStage');
const stripScroller = document.getElementById('mkFilmstripScroller');
const imgA = document.getElementById('mkImgA');
const imgB = document.getElementById('mkImgB');
const titleEl = document.getElementById('mkTitle');
const storyEl = document.getElementById('mkStory');
const metaDate = document.getElementById('mkMetaDate');
const metaCouple = document.getElementById('mkMetaCouple');
const metaCategory = document.getElementById('mkMetaCategory');
const metaCamera = document.getElementById('mkMetaCamera');
const metaLens = document.getElementById('mkMetaLens');
const counterText = document.getElementById('mkCounterText');
const nextMomentLabel = document.getElementById('mkNextMomentLabel');
const likeBtn = document.getElementById('mkLikeBtn');
const likeCountEl = document.getElementById('mkLikeCount');
const commentCountEl = document.getElementById('mkCommentCount');
const nav = document.getElementById('globalNav');

let activeIdx = -1;
let activeLayer = 'A';
let thumbEls = [];

// ============================================================================
// V11 DUAL-MODE SYNCHRONISATION ENGINE
// Mode A (Main Moment Reels Scroll):
//   - Scrolls naturally through the current moment's photo + story + metadata.
//   - When the user reaches the bottom boundary of the moment and continues
//     scrolling down (or reaches the top boundary and pulls up), advances
//     to the next/previous moment, resets scroll to top, and syncs filmstrip.
// Mode B (Side Filmstrip Direct Navigation):
//   - Tapping a thumbnail or scrolling the filmstrip jumps immediately to
//     that moment without requiring the user to scroll the current story first.
// ============================================================================
let isProgrammaticStripScroll = false;
let programmaticStripTimer = null;
let programmaticTargetTop = null;

function clearProgrammaticStripLock() {
  isProgrammaticStripScroll = false;
  programmaticTargetTop = null;
  if (programmaticStripTimer !== null) {
    clearTimeout(programmaticStripTimer);
    programmaticStripTimer = null;
  }
}

function scheduleProgrammaticStripRelease(delayMs) {
  if (programmaticStripTimer !== null) {
    clearTimeout(programmaticStripTimer);
  }
  programmaticStripTimer = setTimeout(() => {
    isProgrammaticStripScroll = false;
    programmaticTargetTop = null;
    programmaticStripTimer = null;
  }, delayMs);
}

function initFilmstrip() {
  stripScroller.innerHTML = '';
  MOMENTS.forEach((m, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mk-thumb-item';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-label', `Photo ${idx + 1} of ${MOMENTS.length}`);
    const im = document.createElement('img');
    im.src = m.thumbUrl; im.alt = ''; im.loading = idx < 12 ? 'eager' : 'lazy'; im.decoding = 'async';
    im.dataset.full = m.thumbUrl; im.dataset.live = '1';
    im.onerror = function () { this.onerror = null; this.src = pgImgFallback(m.id, PG_THUMB_W); };
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
    card.type = 'button'; card.className = 'pg-collection' + (ev.personal ? ' is-personal' : '');
    card.setAttribute('aria-label', 'Open ' + ev.name + ' collection, ' + ev.photos.length + ' photos');
    const cover = document.createElement('div'); cover.className = 'pg-cover';
    pgRotCover(cover, ev.photos);
    const h = document.createElement('h3'); h.textContent = ev.name;
    const sm = document.createElement('small'); sm.textContent = ev.photos.length + ' photos';
    card.appendChild(cover); card.appendChild(h); card.appendChild(sm);
    card.addEventListener('click', () => (window.pgOpenEvent ? pgOpenEvent(ev.name) : openCollection(ev.name, 0)));
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
// Double-tap a photo: heart on if it was off, heart off if it was on (the heart button does the same).
// Shows a red heart when liking, a white outline heart when taking the like back.
function pgDoubleTapLike(m, pop) {
  const had = !!(GALLERY.mine || {})[m.id];
  pgToggleLike(m);
  if (pop) { if (had) pop.classList.add('off'); pop.innerHTML = had ? ICON_POP_OFF : ICON_POP; }
}
const ICON_POP_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
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
        const pop = document.createElement('div'); pop.className = 'pgm-pop'; pgDoubleTapLike(m, pop); item.appendChild(pop);
        setTimeout(() => pop.remove(), 850);
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
// each phone remembers its own hearts for this wedding
function pgSaveMine() { try { localStorage.setItem('pg_mine_' + GALLERY_ID, JSON.stringify(Object.keys(GALLERY.mine || {}))); } catch (e) {} }
function pgLoadMine() { const out = {}; try { (JSON.parse(localStorage.getItem('pg_mine_' + GALLERY_ID) || '[]') || []).forEach(id => { out[id] = true; }); } catch (e) {} return out; }
function pgToggleLike(m) {
  if (likeBusy[m.id]) return;
  likeBusy[m.id] = true;
  const was = !!GALLERY.mine[m.id];
  if (was) delete GALLERY.mine[m.id]; else GALLERY.mine[m.id] = true;
  GALLERY.likes[m.id] = Math.max(0, (GALLERY.likes[m.id] || 0) + (was ? -1 : 1));
  syncCounts(m.id);
  pgApi('likePhoto', { photoId: m.id, liked: !was }).then(res => {
    GALLERY.likes[m.id] = res.likes; if (res.liked) GALLERY.mine[m.id] = true; else delete GALLERY.mine[m.id];
    pgSaveMine();
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

function centerThumbnail(idx, smooth = true) {
  const el = thumbEls[idx];
  if (!el) return null;
  const activeSlotOffset = stripScroller.clientHeight * 0.48;
  const rawTarget = el.offsetTop - activeSlotOffset + (el.offsetHeight / 2);
  const maxScroll = Math.max(0, stripScroller.scrollHeight - stripScroller.clientHeight);
  const clampedTarget = Math.max(0, Math.min(maxScroll, rawTarget));

  stripScroller.scrollTo({
    top: clampedTarget,
    behavior: smooth ? 'smooth' : 'auto'
  });
  return clampedTarget;
}

function applyActiveMoment(idx) {
  if (idx < 0 || idx >= MOMENTS.length) return;
  const isSameIndex = (idx === activeIdx);
  activeIdx = idx;
  const m = MOMENTS[idx];

  thumbEls.forEach((el, i) => {
    const dist = Math.abs(i - idx);
    el.classList.toggle('is-active', i === idx);
    el.classList.toggle('is-near', dist === 1);
    el.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });

  // (the old big photo behind the viewer is hidden; the viewer feed shows the photos, so nothing is loaded here)

  titleEl.textContent = m.title;
  storyEl.textContent = m.story;
  metaDate.textContent = m.date;
  metaCouple.textContent = m.couple;
  metaCategory.textContent = m.ceremony;
  metaCamera.textContent = m.camera;
  metaLens.textContent = m.lens;
  [[metaDate, m.date], [metaCouple, m.couple], [metaCategory, m.ceremony], [metaCamera, m.camera], [metaLens, m.lens]].forEach(([el, v]) => {
    el.classList.toggle('is-empty', !v);
    if (el.previousElementSibling) el.previousElementSibling.classList.toggle('is-empty', !v);
  });
  storyEl.style.display = m.story ? '' : 'none';
  const moreBtn = document.getElementById('mkShowMoreBtn'); if (moreBtn) moreBtn.style.display = m.story ? '' : 'none';
  counterText.textContent = `${idx + 1}/${MOMENTS.length}`;

  if (nextMomentLabel) {
    if (idx < MOMENTS.length - 1) {
      nextMomentLabel.textContent = `Keep scrolling for photo ${idx + 2}/${MOMENTS.length} ↓`;
    } else {
      nextMomentLabel.textContent = `Last photo of ${CURRENT_SET} (${MOMENTS.length}/${MOMENTS.length}) · scroll up for previous ↑`;
    }
  }

  syncCounts(m.id);
}

// Mode B: Direct jump via Filmstrip click, Gallery selection, or Keyboard
function selectMomentDirectly(idx, smoothStrip = true) {
  const clamped = Math.max(0, Math.min(MOMENTS.length - 1, idx));

  clearProgrammaticStripLock();
  isProgrammaticStripScroll = true;

  // Reset main window scroll to top of the newly selected moment
  window.scrollTo({ top: 0, behavior: 'auto' });
  applyActiveMoment(clamped);

  const targetTop = centerThumbnail(clamped, smoothStrip);
  programmaticTargetTop = targetTop;

  if (!smoothStrip || targetTop === null || Math.abs(stripScroller.scrollTop - targetTop) <= 1.5) {
    requestAnimationFrame(clearProgrammaticStripLock);
  } else {
    scheduleProgrammaticStripRelease(180);
  }
}

// Mode A: Reels-style advance when user scrolls past the bottom or top boundary of the current moment


// ---- MODE B HANDLERS: Side Filmstrip Direct Scroll & Takeover ----
stripScroller.addEventListener('pointerdown', clearProgrammaticStripLock, { passive: true });
stripScroller.addEventListener('touchstart', clearProgrammaticStripLock, { passive: true });
stripScroller.addEventListener('wheel', clearProgrammaticStripLock, { passive: true });
stripScroller.addEventListener('scrollend', () => {
  if (isProgrammaticStripScroll) clearProgrammaticStripLock();
}, { passive: true });

let stripRaf = false;
stripScroller.addEventListener('scroll', () => {
  if (isProgrammaticStripScroll) {
    if (programmaticTargetTop !== null && Math.abs(stripScroller.scrollTop - programmaticTargetTop) <= 1.5) {
      clearProgrammaticStripLock();
    } else {
      scheduleProgrammaticStripRelease(120);
    }
    return;
  }

  if (!stripRaf) {
    stripRaf = true;
    requestAnimationFrame(() => {
      stripRaf = false;
      if (isProgrammaticStripScroll || !thumbEls.length) return;
      const rect = stripScroller.getBoundingClientRect();
      if (rect.height <= 0) return;
      const activeLineY = rect.top + (rect.height * 0.48);
      let bestIdx = 0;
      let bestDist = Infinity;
      // only look near the current photo (measuring hundreds of thumbnails every frame makes the strip stutter)
      const from = activeIdx > 40 ? activeIdx - 40 : 0, to = activeIdx >= 0 ? Math.min(thumbEls.length, activeIdx + 41) : thumbEls.length;
      for (let i = from; i < to; i++) {
        const r = thumbEls[i].getBoundingClientRect();
        const cY = r.top + (r.height / 2);
        const d = Math.abs(cY - activeLineY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx !== activeIdx) {
        // Direct filmstrip scroll updates the moment immediately and resets page scroll to top
        window.scrollTo({ top: 0, behavior: 'auto' });
        applyActiveMoment(bestIdx);
      }
    });
  }
}, { passive: true });

// ---- MODE A HANDLERS: Full-Moment Reels Boundary Detection (Main Stage) ----
function isRootViewActive() {
  const rootView = document.getElementById('view-root');
  return rootView && rootView.classList.contains('active') && !document.querySelector('.reg-overlay.show');
}



// (old boundary scrolling from the first design removed — the viewer feed handles it)

// Keyboard navigation
function pgTyping(e) { const t = e.target; return !!(t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) || document.body.classList.contains('rl-on') || document.body.classList.contains('ps-on'); }
window.addEventListener('keydown', (e) => {
  if (!isRootViewActive() || pgTyping(e)) return;
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    selectMomentDirectly(activeIdx + 1, true);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    selectMomentDirectly(activeIdx - 1, true);
  }
});

// Controls
document.getElementById('mkShowMoreBtn').addEventListener('click', () => {
  document.getElementById('mkMetaTable').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
document.getElementById('mkPrevOrTopBtn').addEventListener('click', () => {
  if (window.scrollY > 20) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    selectMomentDirectly(activeIdx - 1, true);
  }
});
document.getElementById('mkViewProjectBtn').addEventListener('click', () => { switchView('gallery'); });

// Social & Comments
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('pgToast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
likeBtn.addEventListener('click', () => { const m = MOMENTS[activeIdx]; if (m) pgToggleLike(m); });

const commentBackdrop = document.getElementById('commentBackdrop');
const commentSheet = document.getElementById('commentSheet');
const commentListContainer = document.getElementById('commentListContainer');

function renderNotes(list) {
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
    (GALLERY.recentNotes = GALLERY.recentNotes || []).unshift({ photoId: m.id, name: name, text: val, at: '' });
    if (window.pgRenderNotes) pgRenderNotes();
    showToast('Note added');
    return pgApi('getNotes', { photoId: m.id }).then(res => renderNotes(res.notes));
  }).catch(err => showToast(err.message)).finally(() => { btn.disabled = false; });
});
document.getElementById('mkShareBtn').addEventListener('click', pgShare);

// TKG Dock Directional Scroll & View Switching
(function initDirectionalPillScroll() {
  if (!nav) return;
  let lastWinY = window.scrollY || document.documentElement.scrollTop || 0;
  let lastStripY = stripScroller ? stripScroller.scrollTop : 0;

  window.addEventListener('scroll', () => {
    const current = window.scrollY || document.documentElement.scrollTop || 0;
    const atEnd = current + window.innerHeight >= document.documentElement.scrollHeight - 24;   // at the bottom the full bar comes back (the page has room for it)
    if (current <= 4 || (atEnd && current > 0)) nav.classList.remove('scrolled');
    else if (current - lastWinY > 6) nav.classList.add('scrolled');
    else if (current - lastWinY < -6) nav.classList.remove('scrolled');
    lastWinY = current;
  }, { passive: true });

  if (stripScroller) {
    stripScroller.addEventListener('scroll', () => {
      const current = stripScroller.scrollTop;
      const atEnd = current + stripScroller.clientHeight >= stripScroller.scrollHeight - 24;
      if (current <= 4 || (atEnd && current > 0)) nav.classList.remove('scrolled');
      else if (current - lastStripY > 6) nav.classList.add('scrolled');
      else if (current - lastStripY < -6) nav.classList.remove('scrolled');
      lastStripY = current;
    }, { passive: true });
  }
})();

(function animateMomentsNavIcon() {
  const el = document.querySelector('.tkg-nav-moments');
  if (!el) return;
  let toggles = 0;
  const iv = setInterval(() => {
    el.classList.toggle('tkg-swap');
    if (++toggles >= 4) clearInterval(iv);
  }, 2500);
})();

function switchView(viewKey) {
  clearProgrammaticStripLock();
  document.querySelectorAll('.pg-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + viewKey);
  if (target) target.classList.add('active');

  document.body.classList.toggle('pgm-on', viewKey === 'moments');
  document.querySelectorAll('.tkg-nav-item').forEach(item => {
    const match = item.dataset.nav === (viewKey === 'root' || viewKey === 'event' ? 'gallery' : viewKey);
    item.classList.toggle('active', match);
    if (match) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  nav.classList.remove('scrolled');
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (viewKey === 'root') {
    requestAnimationFrame(() => selectMomentDirectly(activeIdx >= 0 ? activeIdx : 0, false));
  }
}
function switchViewFromNav(viewKey) {
  switchView(viewKey);
}

document.querySelectorAll('.tkg-nav-item[data-nav]').forEach(link => {
  link.addEventListener('click', (e) => { e.preventDefault(); switchViewFromNav(link.dataset.nav); });
});
document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => switchViewFromNav(btn.dataset.goto));
});

document.getElementById('stampThemeBtn').addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.getAttribute('data-tkg-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-tkg-theme', next);
  showToast(next === 'dark' ? 'Dark mode' : 'Light mode');
  try { localStorage.setItem('pg_theme', next); } catch (e) {}
});
document.getElementById('mkQuickCurlBtn').addEventListener('click', () => { nav.classList.toggle('scrolled'); });
document.getElementById('mkMenuBtn').addEventListener('click', () => { switchView('hub'); });

// Initialise with live data
(function boot() {
  try { const t = localStorage.getItem('pg_theme'); if (t) document.documentElement.setAttribute('data-tkg-theme', t); } catch (e) {}
  const bootEl = document.getElementById('pgBoot'), bootMsg = document.getElementById('pgBootMsg');
  if (!API || !GALLERY_ID) { bootMsg.textContent = 'This gallery link is incomplete. Please check the link you received.'; return; }
  // The gallery opens at once from the copy kept on this phone, then the fresh copy is fetched in the background.
  // If the phone had to reload the page, the guest comes back to the same collection and photo.
  const CK = 'pg_gal_' + GALLERY_ID;
  let kept = null; try { const k = JSON.parse(localStorage.getItem(CK) || 'null'); if (k && k.at > Date.now() - 7 * 864e5 && k.gallery) kept = k; } catch (e) {}
  const fresh = pgApi(PG_STUDIO_SLUG ? 'getStudio' : 'getGallery').then(res => { try { localStorage.setItem(CK, JSON.stringify({ at: Date.now(), gallery: res.gallery })); } catch (e) {} return res; });
  let started = false;
  // wait until every part of the page is set up (later scripts add features to the gallery)
  const ready = new Promise(r => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r, { once: true }) : r());
  if (kept) { started = true; ready.then(() => start({ gallery: kept.gallery }, true)); }
  Promise.all([fresh, ready]).then(([res]) => {
    if (!started) { started = true; return start(res, false); }
    // already showing the kept copy: bring in new hearts, notes and approved posts without moving the guest
    GALLERY.likes = res.gallery.likes || {}; GALLERY.notes = res.gallery.notes || {}; GALLERY.recentNotes = res.gallery.recentNotes; GALLERY.isCouple = res.gallery.isCouple;
    GALLERY.faceSearch = res.gallery.faceSearch; GALLERY.guestGate = res.gallery.guestGate;
    // the wedding's look and switches may have changed in the Control Panel since this phone's copy was kept
    const look = x => JSON.stringify([x.theme || '', x.layout || '', x.features || {}, x.pages || {}]), lookChanged = look(res.gallery) !== look(GALLERY);
    GALLERY.theme = res.gallery.theme || ''; GALLERY.layout = res.gallery.layout || ''; GALLERY.features = res.gallery.features || {}; GALLERY.pages = res.gallery.pages || {};
    if (lookChanged) pgRenderHub();   // theme, layout and switches follow the Hub (14–16)
    const newPosts = JSON.stringify(res.gallery.guestPosts || []) !== JSON.stringify(GALLERY.guestPosts || []);
    GALLERY.guestPosts = res.gallery.guestPosts || [];
    if (newPosts && !document.getElementById('view-moments').classList.contains('active')) { ROOT_SET = buildRootSet(); renderMoments(); }
    renderGalleries();
  }).catch(err => { if (!started) bootMsg.textContent = err.message; });
  function start(res, fromKept) {
    GALLERY = res.gallery; GALLERY.likes = GALLERY.likes || {}; GALLERY.notes = GALLERY.notes || {}; GALLERY.mine = Object.assign(pgLoadMine(), GALLERY.mine || {});
    const total = (GALLERY.events || []).reduce((t, e) => t + e.photos.length, 0) || (GALLERY.root || []).length;
    document.title = GALLERY.title + ' · PicGrades';
    document.getElementById('pgCoupleTitle').textContent = GALLERY.title;
    pgMonogram();
    const dateTxt = pgDate(GALLERY.eventDate);
    document.getElementById('pgHubEyebrow').textContent = GALLERY.title + (dateTxt ? ' · ' + dateTxt : '');
    document.getElementById('pgHubTitle').textContent = 'Wedding Hub';
    document.getElementById('pgGalleryEyebrow').textContent = GALLERY.title + ' · ' + total + ' photos';
    document.getElementById('pgStudioName').textContent = GALLERY.studio || 'Your photographer';
    document.getElementById('pgStudioSub').textContent = 'Photographed by ' + (GALLERY.studio || 'your photographer') + ' · edited and delivered with PicGrades.';
    document.getElementById('pgStudioProject').textContent = GALLERY.title;
    document.getElementById('pgStudioStats').textContent = total + ' photos · ' + (GALLERY.events || []).length + ' events' + (dateTxt ? ' · ' + dateTxt : '');
    ROOT_SET = buildRootSet();
    renderGalleries();
    renderMoments();
    pgRenderHub();
    pgSetAppMeta();
    if ((GALLERY.events || []).length) useSet(GALLERY.events[0].name);
    const startView = (location.hash || '').replace('#', '');
    let back = null; try { back = JSON.parse(sessionStorage.getItem('pg_pos_' + GALLERY_ID) || 'null'); } catch (e) {}
    if (back && back.at > Date.now() - 30 * 60000 && back.view === 'root' && (GALLERY.personal || []).concat(GALLERY.events || []).some(e => e.name === back.set)) openCollection(back.set, back.idx || 0);
    else switchView(back && back.at > Date.now() - 30 * 60000 && ['gallery', 'moments', 'hub', 'rooms', 'studio'].indexOf(back.view) > -1 ? back.view
      : ['gallery', 'moments', 'hub', 'rooms', 'studio'].indexOf(startView) > -1 ? startView : 'hub');
    bootEl.classList.add('hide');
    window.pgBootFromKept = fromKept;
  }
})();
['useSet', 'initFilmstrip', 'renderGalleries', 'renderMoments', 'syncCounts', 'applyActiveMoment', 'switchView'].forEach(pgHookable);
