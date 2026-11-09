// Hub: shuffling covers, highlights, notes, counts.
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
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
// The four numbers on the Hub open what they count.
function pgStatTap(k) {
  if (k === 'photos' || k === 'events') return switchViewFromNav('gallery');
  if (k === 'notes') {
    const sec = document.getElementById('pghNotesSec');
    if (sec && !sec.classList.contains('hidden')) return sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return switchViewFromNav('rooms');
  }
  if (k === 'hearts') {
    const likes = GALLERY.likes || {}, loved = pgAllPhotos().filter(x => likes[x.p.id] > 0).sort((a, b) => likes[b.p.id] - likes[a.p.id]).map(x => x.p);
    if (!loved.length) { showToast('No hearts yet — double-tap a photo you love'); return; }
    // a short-lived set, only for this viewing (not added to the gallery's collections)
    if (window.pgOpenEvent) return pgOpenEvent('Loved photos', loved);   // a grid of them (step 35), opened for this viewing only
    GALLERY.personal = (GALLERY.personal || []).filter(x => !x.loved).concat([{ name: 'Loved photos', photos: loved, loved: true }]);
    openCollection('Loved photos', 0);
    GALLERY.personal = GALLERY.personal.filter(x => !x.loved);
  }
}
let pgHeroTimer = null;
function pgRenderHub() {
  const all = pgAllPhotos();
  const likes = GALLERY.likes || {}, notesN = GALLERY.notes || {};
  const totalLikes = Object.values(likes).reduce((t, v) => t + v, 0), totalNotes = Object.values(notesN).reduce((t, v) => t + v, 0);
  const stat = (v, l) => '<button type="button" data-stat="' + l.toLowerCase() + '"><b>' + Number(v).toLocaleString('en-IN') + '</b><span>' + l + '</span></button>';
  document.getElementById('pghStats').innerHTML = stat(all.length, 'Photos') + stat((GALLERY.events || []).length, 'Events') + stat(totalLikes, 'Hearts') + stat(totalNotes, 'Notes');
  document.querySelectorAll('#pghStats [data-stat]').forEach(b => b.addEventListener('click', () => pgStatTap(b.dataset.stat)));
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
    t.addEventListener('click', () => (window.pgOpenEvent ? pgOpenEvent(ev.name) : openCollection(ev.name, 0)));
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
