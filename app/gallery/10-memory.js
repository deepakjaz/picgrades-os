// iPhone memory care (let go of far photos), remember the place after a reload.
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
// Phones (iPhone most of all) reload a page that holds too many big photos at once. Keep only the photos
// near the one on screen; the rest are let go and come back when you scroll near them.
const PG_BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
function pgKeepNear(list, i, keep, srcOf) {
  list.forEach((im, k) => {
    const near = Math.abs(k - i) <= keep;
    if (!near && im.dataset.live === '1') { im.onerror = null; im.src = PG_BLANK; im.dataset.live = '0'; }
    else if (near && im.dataset.live !== '1') { const s = srcOf(im, k); if (s) { im.src = s; im.dataset.live = '1'; } }
  });
}
(function pgReelsMemory() {
  const feed = document.getElementById('pgmFeed'); let t = null;
  function tidy() {
    const slides = Array.from(feed.querySelectorAll('.pgm-item')); if (!slides.length) return;
    const i = Math.round(feed.scrollTop / Math.max(1, feed.clientHeight));
    // each slide keeps its own position, so guest videos and albums between photos can never shift which photo is let go
    slides.forEach((sl, k) => { const im = sl.querySelector(':scope > img.pgm-img'); if (!im) return;
      if (!im.dataset.full && im.src && im.src !== PG_BLANK) { im.dataset.full = im.src; im.dataset.live = '1'; }
      pgKeepNear([im], Math.abs(k - i) <= 3 ? 0 : 99, 0, (x) => x.dataset.full); });
  }
  feed.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(tidy, 150); }, { passive: true });
  pgAfter('renderMoments', () => setTimeout(tidy, 50));
})();
// Filmstrip: thumbnails far from the current photo are let go too (a 500-photo strip would otherwise keep 500 pictures in memory).
// They come back from the phone's cache as soon as the strip gets near them.
// Remember where the guest is (this tab only, for 30 minutes), so a reload by the phone brings them back to the same photo.
(function pgRememberPlace() {
  let t = null;
  function save() { clearTimeout(t); t = setTimeout(() => {
    const v = document.querySelector('.pg-view.active'); if (!v || !GALLERY) return;
    try { sessionStorage.setItem('pg_pos_' + GALLERY_ID, JSON.stringify({ at: Date.now(), view: v.id.replace('view-', ''), set: CURRENT_SET, idx: Math.max(0, activeIdx) })); } catch (e) {}
  }, 300); }
  pgAfter('switchView', save);
  pgAfter('applyActiveMoment', save);
})();
(function pgStripMemory() {
  let t = null;
  function tidy() {
    if (!thumbEls.length) return;
    const ims = thumbEls.map(b => b.firstChild).filter(Boolean);
    pgKeepNear(ims, Math.max(0, activeIdx), 60, (im) => im.dataset.full);   // the strip always follows the current photo
  }
  // runs a few times a second while the strip moves, so thumbnails come back before they reach the screen
  stripScroller.addEventListener('scroll', () => { if (!t) t = setTimeout(() => { t = null; tidy(); }, 200); }, { passive: true });
  pgAfter('initFilmstrip', () => setTimeout(tidy, 60));
})();
