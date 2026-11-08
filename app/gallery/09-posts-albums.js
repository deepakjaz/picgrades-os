// Posts & Albums collection, opens the post / album maker (app/post.js).
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
// "Posts & Albums" collection = every approved post/album (all slides)
function pgAlbumsCollection() {
  const albums = ((GALLERY && GALLERY.guestPosts) || []).filter(p => p.type === 'album');
  GALLERY.personal = (GALLERY.personal || []).filter(x => !x.albums);
  if (albums.length && !GALLERY.isStudio) GALLERY.personal.push({ name: 'Posts & Albums', photos: [].concat.apply([], albums.map(a => String(a.fileId).split(',').map(id => ({ id })))), albums: true });
}
pgAfter('pgLoadSavedSets', () => pgAlbumsCollection());

let pgPostLoad = null;
function pgAllCollections() { return (GALLERY.personal || []).concat(GALLERY.events || []).concat((GALLERY.root || []).length ? [{ name: 'Root Moment', photos: GALLERY.root }] : []).map(c => ({ name: c.name, photos: c.photos.map(p => ({ id: p.id })) })); }
function pgOpenPost(photos) {
  if (!pgPostLoad) pgPostLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/app/post.js'; s.onload = res; s.onerror = () => { pgPostLoad = null; rej(new Error('Could not open the post maker. Check the internet.')); }; document.head.appendChild(s); });
  const labels = {}; (GALLERY.events || []).forEach(e => e.photos.forEach(p => { labels[p.id] = e.name; }));
  pgPostLoad.then(() => PGPost.open({
    photos: photos, title: GALLERY.title, date: pgDate(GALLERY.eventDate), collections: pgAllCollections(), labels, api: pgApi,
    openReel: (ph) => pgOpenReel(ph),   // photos chosen in Post Edits go straight in
    recent: ((GALLERY && GALLERY.guestPosts) || []).map(p => String(p.fileId || '').split(',')[0]).filter(Boolean).slice(0, 8),
    post: (data) => new Promise((res, rej) => {
      const send = () => { let token = ''; try { token = localStorage.getItem('pg_token') || ''; } catch (e) {}
        pgApi('savePost', Object.assign({ token }, pgGuestBody(), data)).then(r => { if (r.status === 'approved') pgReloadPosts(); else pgCheckMyPosts(); res(r); }).catch(rej); };
      if (pgIsCouple() || pgIsStaff() || pgGuest()) send(); else pgNeedGuest(send, 'Tell us who you are to post.');
    })
  })).then(() => {
    // faces we already read keep people in view when a photo is cropped into the album
    if (!GALLERY.faceSearch) return;
    (window.pgFaceBoxes ? Promise.resolve(window.pgFaceBoxes) : pgApi('faceBoxes').then(r => {
      const m = {}; Object.keys(r.boxes || {}).forEach(id => { m[id] = r.boxes[id].map(b => b.map(v => v / 1000)); }); return (window.pgFaceBoxes = m);
    })).then(m => PGPost.setFaces(m)).catch(() => {});
  }).catch(e => showToast(e.message));
}
document.getElementById('pgcPost').addEventListener('click', () => {
  const pools = (GALLERY.events || []).map(e => pgShuffle(e.photos)), pick = [];
  while (pick.length < 7 && pools.some(p => p.length)) pools.forEach(p => { if (p.length && pick.length < 7) pick.push(p.shift()); });
  pgOpenPost(pick.map(p => ({ id: p.id })));
});
