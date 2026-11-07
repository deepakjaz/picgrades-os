// Opens the reel maker (app/reel.js).
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
let pgReelLoad = null;
function pgOpenReel(photos) {
  photos = (photos || []).filter(Boolean);
  if (!photos.length) { showToast('No photos to make a reel'); return; }
  if (!pgReelLoad) pgReelLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/app/reel.js'; s.onload = res; s.onerror = () => { pgReelLoad = null; rej(new Error('Could not open the reel maker. Check the internet.')); }; document.head.appendChild(s); });
  pgReelLoad.then(() => PGReel.open({ photos: photos.map(p => ({ id: p.id })), title: GALLERY.title, date: pgDate(GALLERY.eventDate), studio: GALLERY.studio, api: pgApi,
    collections: (GALLERY.personal || []).concat(GALLERY.events || []).concat((GALLERY.root || []).length ? [{ name: 'Root Moment', photos: GALLERY.root }] : []).map(c => ({ name: c.name, photos: c.photos.map(p => ({ id: p.id })) })) }))
    .catch(e => showToast(e.message));
}
document.getElementById('pgvReel').addEventListener('click', () => pgOpenReel(MOMENTS.map(m => ({ id: m.id }))));
document.getElementById('fmReel').addEventListener('click', () => {
  const set = (GALLERY.personal || []).find(e => e.name === 'Your photos') || (GALLERY.personal || [])[0];
  document.getElementById('fmClose').click();
  pgOpenReel(set ? set.photos : []);
});
document.getElementById('fmPost').addEventListener('click', () => {
  const set = (GALLERY.personal || []).find(e => e.name === 'Your photos') || (GALLERY.personal || [])[0];
  document.getElementById('fmClose').click();
  pgOpenPost((set ? set.photos : []).slice(0, 10));
});
document.getElementById('pghReel').addEventListener('click', () => {
  const pools = (GALLERY.events || []).map(e => pgShuffle(e.photos)), pick = [];
  while (pick.length < 24 && pools.some(p => p.length)) pools.forEach(p => { if (p.length && pick.length < 24) pick.push(p.shift()); });
  pgOpenReel(pick.length ? pick : (GALLERY.root || []));
});
