// Guests (name + mobile), couple link, saved Find me collections, uploads, couple review, approved guest moments in Root Moment.
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
// ---------- guests, couple, staff ----------
const PGK = (k) => 'pg_' + k + '_' + GALLERY_ID;
function pgStore(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(PGK(k)) || 'null'); localStorage.setItem(PGK(k), JSON.stringify(v)); } catch (e) { return null; } }
// the couple key comes from the /c/ link (01-core, step 61); a guest link never sends it
const _pgApi = pgApi;
pgApi = function (action, body) { const ck = PG_AS === 'couple' ? pgStore('couple') : null; return _pgApi(action, Object.assign(ck ? { coupleKey: ck } : {}, body || {})); };
function pgGuest() { return pgStore('guest'); }
function pgIsStaff() { return !!pgToken(); }
function pgIsCouple() { return PG_AS === 'couple' && !!(GALLERY && GALLERY.isCouple); }   // only on the couple's link (step 61)
function pgOpenMode() { return !GALLERY || GALLERY.guestGate !== 'on'; } // demo: everything open; Settings › guestGate = on brings the guest checks back
function pgGuestBody() { const g = pgGuest(); return g ? { guestId: g.guestId, guestKey: g.guestKey } : {}; }

// "Tell us who you are" (name + mobile, OTP later)
let pgIdNext = null;
function pgNeedGuest(next, why) {
  if (pgGuest()) { next(); return; }
  pgIdNext = next;
  const $ = (id) => document.getElementById(id);
  $('idSub').textContent = (why ? why + ' ' : '') + 'Your name and number stay with the couple and the photographer, and your number is deleted 6 months after the wedding.';
  $('idStatus').textContent = ''; $('idBackdrop').classList.add('show'); $('idSheet').classList.add('show');
  setTimeout(() => $('idName').focus(), 250);
}
(function pgIdentity() {
  const $ = (id) => document.getElementById(id), close = () => { $('idBackdrop').classList.remove('show'); $('idSheet').classList.remove('show'); };
  $('idClose').addEventListener('click', () => { pgIdNext = null; close(); }); $('idBackdrop').addEventListener('click', () => { pgIdNext = null; close(); });
  $('idGo').addEventListener('click', () => {
    const b = $('idGo'); b.disabled = true; $('idStatus').textContent = 'Saving…';
    pgApi('guestJoin', { name: $('idName').value, phone: $('idPhone').value }).then(r => {
      pgStore('guest', { guestId: r.guestId, guestKey: r.guestKey, name: r.name }); close();
      const n = pgIdNext; pgIdNext = null; showToast('Welcome, ' + r.name.split(' ')[0]); if (n) setTimeout(n, 280);
    }).catch(e => { $('idStatus').textContent = e.message; }).finally(() => { b.disabled = false; });
  });
})();
// Find me needs the guest's name first (capture phase, before the Find me sheet opens)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-findme]'); if (!b || pgOpenMode() || pgGuest() || pgIsCouple() || pgIsStaff()) return;
  e.stopImmediatePropagation(); e.preventDefault();
  pgNeedGuest(() => b.click(), 'First, tell us who you are — then take a selfie to find your photos.');
}, true);
// Reels: couple and photographer anytime; guests after their name + Find me (when face search is on)
const _openReel = pgOpenReel;
pgOpenReel = function (photos, choose) {
  if (pgOpenMode() || pgIsCouple() || pgIsStaff()) return _openReel(photos, choose);
  pgNeedGuest(() => {
    if (GALLERY.faceSearch && !pgStore('found')) { showToast('First find your photos — then make your reel'); setTimeout(() => document.getElementById('pgcFind').click(), 300); return; }
    _openReel(photos, choose);
  }, 'Tell us who you are to make a reel.');
};

// ---------- saved "Find me" collections (on this phone + a link for any phone) ----------
function pgPhotoById() { const m = {}; (GALLERY.events || []).forEach(e => e.photos.forEach(p => { m[p.id] = p; })); (GALLERY.root || []).forEach(p => { m[p.id] = m[p.id] || p; }); return m; }
function pgLoadSavedSets() {
  const map = pgPhotoById(), sets = pgStore('sets') || [];
  const keep = (GALLERY.personal || []).filter(x => !x.saved);
  GALLERY.personal = sets.map(s => ({ name: s.name, photos: s.ids.map(id => map[id]).filter(Boolean), personal: true, saved: true, code: s.code })).filter(x => x.photos.length).concat(keep);
}
function pgAddSavedSet(set) { const sets = (pgStore('sets') || []).filter(s => s.code !== set.code && s.name !== set.name); sets.unshift(set); pgStore('sets', sets.slice(0, 20)); pgLoadSavedSets(); renderGalleries(); pgRenderMine(); }
(function pgSaveFound() {
  const $ = (id) => document.getElementById(id);
  // remember that this phone did Find me; offer "Save as…"
  pgBefore('renderGalleries', () => {
    const tmp = (GALLERY.personal || []).filter(x => !x.saved && (x.name === 'Your photos' || x.name === 'Maybe you'));
    if (tmp.length && !pgStore('found')) pgStore('found', 1);
  });
  new MutationObserver(() => {
    if ($('fmResult').classList.contains('hidden') || $('fmOpen').classList.contains('hidden')) return;   // step 60b: nothing found = nothing to save
    const g = pgGuest(); $('fmSaveName').value = $('fmSaveName').value || ((g ? g.name.split(' ')[0] + "'s" : 'My') + ' photos');
    $('fmSave').classList.remove('hidden'); $('fmSaved').classList.add('hidden');
  }).observe($('fmResult'), { attributes: true, attributeFilter: ['class'] });
  $('fmSaveBtn').addEventListener('click', () => {
    const set = (GALLERY.personal || []).find(x => x.name === 'Your photos') || (GALLERY.personal || []).find(x => x.name === 'Maybe you');
    if (!set) return;
    const name = $('fmSaveName').value.trim() || 'My photos', ids = set.photos.map(p => p.id);
    $('fmSaveBtn').disabled = true;
    pgApi('saveSet', Object.assign({ name, ids }, pgGuestBody())).then(r => {
      pgAddSavedSet({ code: r.code, name: r.name, ids });
      const link = location.origin + '/g/' + GALLERY_ID + '?set=' + r.code;
      $('fmSave').classList.add('hidden'); $('fmSaved').classList.remove('hidden');
      $('fmSaved').innerHTML = 'Saved as <b>' + pgEsc(r.name) + '</b> on this phone. <a href="#" id="fmCopy">Copy link</a> to open it anywhere.';
      $('fmCopy').addEventListener('click', (e) => { e.preventDefault(); if (navigator.share) navigator.share({ title: r.name, url: link }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => showToast('Link copied')); });
    }).catch(e => showToast(e.message)).finally(() => { $('fmSaveBtn').disabled = false; });
  });
})();

// ---------- my moments (status + thank-you) and the Create row ----------
function pgRenderMine(posts) {
  const box = document.getElementById('pgcMine'), sets = pgStore('sets') || [];
  const rows = [];
  sets.slice(0, 4).forEach(s => rows.push('<button type="button" class="pgc-pill" data-set="' + pgEsc(s.code) + '"><img alt="" src="' + pgImg(s.ids[0], 120) + '"><span><b>' + pgEsc(s.name) + '</b><br>Your saved set</span><em class="ok">Saved</em></button>'));
  (posts || pgRenderMine.posts || []).slice(0, 6).forEach(p => {
    const st = p.status === 'approved' ? '<em class="ok">Approved</em>' : p.status === 'hidden' ? '<em class="no">Not shown</em>' : '<em>In review</em>';
    if (p.status === 'review' && p.thumb) { rows.push('<div class="pgc-pill"><img alt="" src="' + p.thumb + '"><span>Your ' + (p.type === 'video' ? 'video' : p.type === 'post' ? 'post' : p.type === 'album' ? 'album' : 'photo') + (p.caption ? ' · ' + pgEsc(p.caption) : '') + '</span>' + st + '</div>'); return; }   // step 50: private until approved
    if (p.type === 'album' || p.type === 'post') { rows.push('<div class="pgc-pill"><img alt="" src="' + pgImg(String(p.fileId).split(',')[0], 120) + '"><span>Your ' + (p.type === 'post' ? 'post' : 'album') + '</span>' + st + '</div>'); return; }
    rows.push('<div class="pgc-pill">' + (p.type === 'photo' ? '<img alt="" src="' + pgImg(p.fileId, 120) + '">' : '<img alt="" src="' + pgImgFallback(p.fileId, 120) + '">') + '<span>Your ' + (p.type === 'video' ? 'video' : 'photo') + (p.caption ? ' · ' + pgEsc(p.caption) : '') + '</span>' + st + '</div>');
  });
  if (posts) pgRenderMine.posts = posts;
  box.innerHTML = rows.join(''); box.classList.toggle('hidden', !rows.length);
  box.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => { const s = (pgStore('sets') || []).find(x => x.code === b.dataset.set); if (s) pgOpenEvent(s.name); }));
}
function pgNotice(t, p) { const n = document.getElementById('pgNotice'); document.getElementById('pgNoticeT').textContent = t; document.getElementById('pgNoticeP').textContent = p; n.classList.remove('hidden'); }
document.getElementById('pgNoticeX').addEventListener('click', () => document.getElementById('pgNotice').classList.add('hidden'));
function pgCheckMyPosts() {
  if (!pgGuest()) return;
  pgApi('myPosts', pgGuestBody()).then(r => {
    pgRenderMine(r.posts);
    const seen = pgStore('seen') || [], fresh = r.posts.filter(p => p.status === 'approved' && seen.indexOf(p.postId) < 0);
    if (fresh.length) { pgNotice((fresh.length === 1 ? 'Your moment is' : fresh.length + ' of your moments are') + ' now in Root Moment ♥', r.thanks); pgStore('seen', seen.concat(fresh.map(p => p.postId))); }
  }).catch(() => {});
}

// ---------- upload to Root Moment ----------
(function pgUpload() {
  const $ = (id) => document.getElementById(id); let files = [];
  const open = () => pgNeedGuest(() => { files = []; $('upList').innerHTML = ''; $('upGo').disabled = true; $('upForm').classList.remove('hidden'); $('upDone').classList.add('hidden'); $('upStatus').textContent = ''; $('upBackdrop').classList.add('show'); $('upSheet').classList.add('show'); }, 'Tell us who you are to share your moments.');
  const close = () => { $('upBackdrop').classList.remove('show'); $('upSheet').classList.remove('show'); };
  $('pgcUpload').addEventListener('click', open); $('pgmAdd').addEventListener('click', open);
  $('upClose').addEventListener('click', close); $('upBackdrop').addEventListener('click', close);
  $('upFiles').addEventListener('change', function () {
    files = Array.from(this.files || []).slice(0, 10); this.value = '';
    $('upList').innerHTML = ''; $('upStatus').textContent = '';
    files.forEach((f, i) => {
      const d = document.createElement('div'), url = URL.createObjectURL(f);
      d.innerHTML = (f.type.indexOf('video') === 0 ? '<video muted playsinline src="' + url + '"></video><span>Video</span>' : '<img alt="" src="' + url + '">');
      if (f.type.indexOf('video') === 0 && f.size > 20 * 1024 * 1024) { d.querySelector('span').textContent = 'Too big'; f.tooBig = true; }
      $('upList').appendChild(d);
    });
    if (files.some(f => f.tooBig)) $('upStatus').textContent = 'Videos must be under 20 MB — big ones will be skipped.';
    $('upGo').disabled = !files.some(f => !f.tooBig);
  });
  function shrink(file) {   // photos: long side 2048 px, JPEG — quick to send
    return new Promise((res) => {
      const im = new Image(), url = URL.createObjectURL(file);
      im.onload = () => { const r = Math.min(1, 2048 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.86) }); };
      im.onerror = () => { URL.revokeObjectURL(url); const fr = new FileReader(); fr.onload = () => res({ mime: file.type || 'image/jpeg', data: fr.result }); fr.readAsDataURL(file); };
      im.src = url;
    });
  }
  function asData(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res({ mime: file.type || 'video/mp4', data: fr.result }); fr.onerror = rej; fr.readAsDataURL(file); }); }
  $('upGo').addEventListener('click', async () => {
    const b = $('upGo'); b.disabled = true; let sent = 0; const list = $('upList').children;
    for (let i = 0; i < files.length; i++) {
      const f = files[i]; if (f.tooBig) continue;
      $('upStatus').textContent = 'Sending ' + (sent + 1) + ' of ' + files.filter(x => !x.tooBig).length + '… keep this screen open';
      try {
        const d = f.type.indexOf('video') === 0 ? await asData(f) : await shrink(f);
        await pgApi('uploadMoment', Object.assign({ mime: d.mime, base64: d.data, caption: $('upCaption').value }, pgGuestBody()));
        sent++; if (list[i]) list[i].classList.add('done');
      } catch (e) { $('upStatus').textContent = e.message; b.disabled = false; if (!sent) return; }
    }
    $('upForm').classList.add('hidden'); $('upDone').classList.remove('hidden'); $('upStatus').textContent = '';
    $('upDoneTxt').textContent = (sent === 1 ? 'Your moment is' : 'Your ' + sent + ' moments are') + ' in review. ' + (GALLERY.title || 'The couple') + ' will approve ' + (sent === 1 ? 'it' : 'them') + ' soon — you will see the update right here. We really appreciate you sharing with us.';
    $('upCaption').value = ''; pgCheckMyPosts();
  });
})();

// ---------- couple: review guest moments + thank-you note ----------
(function pgCouple() {
  const $ = (id) => document.getElementById(id);
  const close = () => { $('cpBackdrop').classList.remove('show'); $('cpSheet').classList.remove('show'); };
  $('cpClose').addEventListener('click', close); $('cpBackdrop').addEventListener('click', close);
  function media(p) {
    // step 50: a post waiting for review is private on Drive — show the preview the server made (videos play once approved)
    if (p.status === 'review' && p.thumb) return '<img alt="" src="' + p.thumb + '">' + (p.type === 'video' ? '<span class="cp-vnote">Video · plays once approved (you can hide it again any time)</span>' : '');
    if (p.type === 'album' || p.type === 'post') return '<img alt="" src="' + pgImg(String(p.fileId).split(',')[0], 300) + '">'; return p.type === 'video' ? '<video muted playsinline preload="metadata" src="/api/stream?g=' + encodeURIComponent(GALLERY_ID) + '&id=' + encodeURIComponent(p.fileId) + '#t=0.5"></video>' : '<img alt="" src="' + pgImg(p.fileId, 300) + '">'; }
  function load() {
    return pgApi('coupleQueue').then(r => {
      $('cpThanks').value = r.thanks || '';
      $('pgcReviewTxt').textContent = r.waiting.length ? r.waiting.length + ' waiting' : 'All done';
      $('pgcReview').classList.toggle('badge', !!r.waiting.length);
      $('cpList').innerHTML = r.waiting.length ? '' : '<p class="cp-empty">Nothing waiting. New guest moments will appear here.</p>';
      r.waiting.forEach(p => {
        const d = document.createElement('div'); d.className = 'cp-item';
        d.innerHTML = media(p) + '<div><b>' + pgEsc(p.name) + '</b><p>' + pgEsc(p.caption || (p.type === 'video' ? 'Video' : 'Photo')) + '</p><div class="cp-btns"><button type="button" class="yes">Approve</button><button type="button">Hide</button></div></div>';
        const [yes, no] = d.querySelectorAll('button');
        const act = (decision) => { yes.disabled = no.disabled = true; pgApi('couplePost', { postId: p.postId, decision, keep: pgStore('hideKeep') ? '7d' : '' }).then(() => { d.remove(); showToast(decision === 'approve' ? 'Approved — now in Root Moment' : 'Hidden'); load(); if (decision === 'approve') pgReloadPosts(); }).catch(e => { showToast(e.message); yes.disabled = no.disabled = false; }); };
        yes.addEventListener('click', () => act('approve')); no.addEventListener('click', () => act('hide'));
        $('cpList').appendChild(d);
      });
      // step 52: hidden in the last 7 days → "Show again" (a trashed file comes back out of Drive's trash)
      const hid = (r.decided || []).filter(x => x.status === 'hidden');
      if (hid.length) {
        const hh = document.createElement('p'); hh.className = 'cp-hidh'; hh.textContent = 'Hidden — deleted after 7 days'; $('cpList').appendChild(hh);
        hid.forEach(p => {
          const d = document.createElement('div'); d.className = 'cp-item cp-hidden';
          d.innerHTML = (p.thumb ? '<img alt="" src="' + p.thumb + '">' : '<span class="cp-nothumb"></span>') + '<div><b>' + pgEsc(p.name) + '</b><p>' + pgEsc(p.caption || (p.type === 'video' ? 'Video' : 'Photo')) + '</p><div class="cp-btns"><button type="button" class="yes">Show again</button></div></div>';
          d.querySelector('button').addEventListener('click', e => { e.target.disabled = true; pgApi('couplePost', { postId: p.postId, decision: 'approve' }).then(() => { showToast('Shown again — back in Root Moment'); load(); pgReloadPosts(); }).catch(err => { showToast(err.message); e.target.disabled = false; }); });
          $('cpList').appendChild(d);
        });
      }
    }).catch(e => { $('cpStatus').textContent = e.message; });
  }
  $('cpKeep').checked = !!pgStore('hideKeep');
  $('cpKeep').addEventListener('change', e => { pgStore('hideKeep', e.target.checked ? 1 : 0); showToast(e.target.checked ? 'Hidden moments are kept 7 days' : 'Hidden moments go to the bin at once'); });
  $('pgcReview').addEventListener('click', () => { $('cpStatus').textContent = ''; $('cpBackdrop').classList.add('show'); $('cpSheet').classList.add('show'); load(); });
  $('cpThanksSave').addEventListener('click', () => pgApi('coupleThanks', { text: $('cpThanks').value }).then(() => showToast('Thank-you note saved')).catch(e => showToast(e.message)));
  window.pgCoupleInit = function () { if (pgIsCouple()) { $('pgcReview').classList.remove('hidden'); load(); } };
})();

// ---------- approved guest moments in Root Moment (photos + videos, like TKG Moments) ----------
let pgVidObs = null;
// fetch the latest approved posts, then redraw Root Moment, the Posts & Albums collection and the collections page
function pgReloadPosts() { return pgApi('getGallery').then(r => { GALLERY.guestPosts = r.gallery.guestPosts || []; renderMoments(); if (window.pgAlbumsCollection) pgAlbumsCollection(); renderGalleries(); }).catch(() => {}); }
(function pgGuestReels() {
  pgAfter('renderMoments', () => {
    const feed = document.getElementById('pgmFeed'), posts = (GALLERY && GALLERY.guestPosts) || [];
    if (!posts.length) return;
    const empty = feed.querySelector('.pgm-empty'); if (empty) empty.remove();
    let muted = true;
    if (pgVidObs) pgVidObs.disconnect();
    pgVidObs = new IntersectionObserver((ents) => ents.forEach(en => { const v = en.target; if (en.isIntersecting && en.intersectionRatio > 0.6) { v.muted = muted; const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => {}); }); } else v.pause(); }), { threshold: [0, 0.6, 1] });
    posts.forEach((p, i) => {
      const m = { id: p.fileId, ceremony: 'guest moment', n: i + 1 };
      const item = document.createElement('div'); item.className = 'pgm-item pgm-guest'; item.dataset.pid = p.fileId;
      const blur = document.createElement('div'); blur.className = 'pgm-blur';
      let media;
      if (p.type === 'album' || p.type === 'post') {
        const ids = String(p.fileId).split(','); m.id = ids[0]; item.dataset.pid = ids[0];
        media = document.createElement('div'); media.className = 'pgm-album';
        const dots = document.createElement('div'); dots.className = 'pgm-dots';
        ids.forEach((fid, k) => { const im = document.createElement('img'); im.alt = (p.caption || 'Album') + ' ' + (k + 1); im.loading = 'lazy'; im.src = pgImg(fid, 1600); im.onerror = function () { this.onerror = null; this.src = pgImgFallback(fid, 1600); }; media.appendChild(im); dots.appendChild(document.createElement('i')); });
        if (ids.length > 1) { item.appendChild(dots); dots.firstChild.classList.add('on'); media.addEventListener('scroll', () => { const k = Math.round(media.scrollLeft / media.clientWidth); dots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === k)); }, { passive: true }); }
        blur.style.backgroundImage = 'url("' + pgImg(ids[0], 60) + '")';
      } else if (p.type === 'video') {
        media = document.createElement('video'); media.className = 'pgm-img';
        media.setAttribute('playsinline', ''); media.setAttribute('webkit-playsinline', ''); media.setAttribute('muted', ''); media.playsInline = true; media.muted = true; media.loop = true; media.preload = 'metadata';
        media.src = '/api/stream?g=' + encodeURIComponent(GALLERY_ID) + '&id=' + encodeURIComponent(p.fileId);
        pgVidObs.observe(media);
        const mb = document.createElement('button'); mb.type = 'button'; mb.className = 'pgm-mute'; mb.textContent = '🔇'; mb.setAttribute('aria-label', 'Sound on or off');
        mb.addEventListener('click', (e) => { e.stopPropagation(); muted = !muted; document.querySelectorAll('.pgm-guest video').forEach(v => { v.muted = muted; }); document.querySelectorAll('.pgm-mute').forEach(x => { x.textContent = muted ? '🔇' : '🔊'; }); });
        item.appendChild(mb);
        media.addEventListener('click', (e) => { e.stopPropagation(); if (media.paused) media.play().catch(() => {}); else media.pause(); });
      } else {
        media = document.createElement('img'); media.className = 'pgm-img'; media.alt = 'Shared by ' + p.name; media.loading = 'lazy';
        media.src = pgImg(p.fileId, PG_FULL_W); media.onerror = function () { this.onerror = null; this.src = pgImgFallback(p.fileId, PG_FULL_W); };
        blur.style.backgroundImage = 'url("' + pgImg(p.fileId, 60) + '")';
      }
      const scrim = document.createElement('div'); scrim.className = 'pgm-scrim';
      scrim.innerHTML = '<div class="pgm-name">' + pgEsc(p.caption || GALLERY.title || '') + '</div><div class="pgm-meta">' + (p.type === 'post' ? 'POST' : p.type === 'album' ? 'ALBUM' : 'GUEST MOMENT') + ' · ' + (i + 1) + '/' + posts.length + '</div><span class="pgm-by">by ' + pgEsc(p.name) + '</span>';
      const acts = document.createElement('div'); acts.className = 'pgm-actions';
      const like = document.createElement('button'); like.type = 'button'; like.className = 'pgm-btn pgm-like'; like.setAttribute('aria-label', 'Like'); like.innerHTML = ICON_HEART_OUTLINE + ICON_HEART_FILLED + '<span class="pgm-like-count"></span>';
      const note = document.createElement('button'); note.type = 'button'; note.className = 'pgm-btn'; note.setAttribute('aria-label', 'Notes'); note.innerHTML = ICON_NOTE + '<span class="pgm-note-count"></span>';
      const share = document.createElement('button'); share.type = 'button'; share.className = 'pgm-btn'; share.setAttribute('aria-label', 'Share'); share.innerHTML = ICON_SEND;
      like.addEventListener('click', e => { e.stopPropagation(); pgToggleLike(m); });
      note.addEventListener('click', e => { e.stopPropagation(); openNotes(m, 'Guest moment by ' + p.name); });
      share.addEventListener('click', e => { e.stopPropagation(); pgShare(); });
      acts.appendChild(like); acts.appendChild(note); acts.appendChild(share);
      if (p.type !== 'video' && p.type !== 'album' && p.type !== 'post') {   // guest photos: pinch to zoom and download, like the photographer's photos
        pgZoomable(item, media, feed);
        const dl = document.createElement('button'); dl.type = 'button'; dl.className = 'pgm-btn'; dl.setAttribute('aria-label', 'Download photo');
        dl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';
        dl.addEventListener('click', e => { e.stopPropagation(); pgDownload(m); }); acts.appendChild(dl);
      }
      let lastTap = 0;
      item.addEventListener('click', () => { const now = Date.now(); if (now - lastTap < 400) { const pop = document.createElement('div'); pop.className = 'pgm-pop'; pgDoubleTapLike(m, pop); item.appendChild(pop); setTimeout(() => pop.remove(), 850); lastTap = 0; } else lastTap = now; });
      item.appendChild(blur); item.appendChild(media); item.appendChild(scrim); item.appendChild(acts);
      feed.appendChild(item); syncCounts(m.id);
    });
  });
})();

// ---------- after the gallery loads ----------
pgHookable('pgRenderHub'); pgHookable('pgLoadSavedSets');
pgAfter('pgRenderHub', () => {
  pgLoadSavedSets(); renderGalleries(); pgRenderMine(); pgCheckMyPosts();
  if (PG_AS === 'couple' && pgStore('couple') && !GALLERY.isCouple) pgApi('coupleQueue').then(() => { GALLERY.isCouple = true; if (window.pgCoupleInit) pgCoupleInit(); }).catch(() => { pgStore('couple', null); GALLERY.coupleChecked = true; if (window.PGLinks) PGLinks.paint(); });
  else if (window.pgCoupleInit) pgCoupleInit();
  const code = new URLSearchParams(location.search).get('set');
  if (code) pgApi('getSet', { code }).then(r => { pgAddSavedSet({ code, name: r.name, ids: r.ids }); pgOpenEvent(r.name); }).catch(e => showToast(e.message));
});
