// Zoom, download, the viewer feed (one photo per screen, synced with the filmstrip), Root Moment zoom/download, install as an app.
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
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
// Phones: a website cannot write into the Photos app directly.
// iPhone → the share menu, which shows "Save Image" only for a real JPEG (Google sometimes sends WebP, so we turn every photo into JPEG first).
// Android → a normal download (lands in Downloads and shows in the gallery); its share menu often has no save option.
const PG_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
async function pgAsJpeg(blob) {
  if (blob && blob.type === 'image/jpeg') return blob;
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const out = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.94)); c.width = c.height = 1;
    return out || blob;
  } finally { URL.revokeObjectURL(url); }
}
async function pgDownload(m) {
  if (!m) return;
  const name = pgFileName(m);
  const saveBlob = (blob) => {
    const file = new File([blob], name, { type: 'image/jpeg' });
    if (PG_IOS && navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file] });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000); showToast('Photo saved');
  };
  try {
    if (pgBlobCache[m.id]) { await saveBlob(pgBlobCache[m.id]); return; }
    showToast('Getting the photo…');
    const r = await fetch(pgImg(m.id, 2048)); if (!r.ok) throw new Error('fetch');
    const blob = await pgAsJpeg(await r.blob()); pgBlobCache[m.id] = blob;
    const keys = Object.keys(pgBlobCache); if (keys.length > 6) delete pgBlobCache[keys[0]];   // keep only the last few photos in memory
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
  // Each photo is in one of three states: '' (nothing loaded), 'thumb' (the small filmstrip picture, already in the
  // phone's cache) or 'full'. While the guest flicks the filmstrip only thumbnails are shown; the full photo comes
  // when the strip stops. Photos far away are let go, so the iPhone never runs out of memory.
  function show(it, q) {
    if (!it.bl.style.backgroundImage) it.bl.style.backgroundImage = 'url("' + pgImg(it.m.id, 60) + '")';
    if (q === 'thumb' && it.q) return;
    if (q === 'full' && it.q === 'full') return;
    it.im.onerror = function () { this.onerror = null; this.src = pgImgFallback(it.m.id, q === 'full' ? PG_FULL_W : PG_THUMB_W); };
    it.im.src = q === 'full' ? it.m.photoUrl : it.m.thumbUrl; it.q = q;
    if (!it.z) it.z = pgZoomable(it.el, it.im, feed);
  }
  function load(i, thumbsOnly) {
    // this photo and the next one in full; the one before and the one after next as thumbnails (ready to sharpen)
    for (let j = i - 1; j <= i + 2; j++) { const it = items[j]; if (it) show(it, !thumbsOnly && (j === i || j === i + 1) ? 'full' : 'thumb'); }
    items.forEach((it, k) => { if (it.q && Math.abs(k - i) > 3) { it.im.onerror = null; it.im.src = PG_BLANK; it.q = ''; if (it.z) it.z.reset(); } });
  }
  let fullTimer = null;
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
  pgAfter('useSet', () => build());
  pgAfter('applyActiveMoment', () => {
    if (fromFeed || !items.length) return;
    const target = activeIdx, near = Math.abs(target - feedIdx) <= 1;
    items.forEach(it => it.z && it.z.reset());
    feedIdx = target;
    clearTimeout(fullTimer);
    if (userOnStrip()) { load(target, true); const sharpen = () => { if (userOnStrip()) fullTimer = setTimeout(sharpen, 250); else load(activeIdx); }; fullTimer = setTimeout(sharpen, 300); }
    else load(target);
    // from the filmstrip: jump straight to the photo (no slow slide that could be read as the guest scrolling back)
    requestAnimationFrame(() => scrollToIdx(target, near && !userOnStrip() && view.classList.contains('active')));
  });
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
  pgAfter('renderMoments', () => {
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
  });
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
      const ck = typeof pgStore === 'function' ? pgStore('couple') : null;   // the couple's installed app opens in couple mode
      l.href = '/api/manifest?g=' + encodeURIComponent(GALLERY_ID) + '&n=' + encodeURIComponent(GALLERY.title || 'Wedding Gallery') + (ck ? '&c=' + encodeURIComponent(ck) : '');
      document.head.appendChild(l);
    }
  };
})();
