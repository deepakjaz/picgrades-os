// Found with Find me (step 65a) — Control Panel › Guests.
// The couple sees every guest Find me found: their face cut from a wedding photo (never their selfie), name, mobile,
// Bride's / Groom's side, whether they attended, how many photos and when. Tap a guest to see the photos they are in.
// Only the couple (and PicGrades, for support) — the server refuses everyone else (Code.gs foundList_).
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgFound() {
  let last = null;   // the list from the last time the pane was opened (for the row's summary)
  const SIDE = { bride: 'Bride’s side', groom: 'Groom’s side', both: 'Both sides' };
  // the face, cut out of the wedding photo with CSS (the same maths as faces-core.js cropStyle)
  function crop(face, size) {
    if (!face) return '';
    const bw = face.box[2] / 1000, bx = face.box[0] / 1000, by = face.box[1] / 1000, bh = face.box[3] / 1000;
    const Wi = size / (bw * 1.6), Hi = Wi * (face.h / face.w), cx = (bx + bw / 2) * Wi, cy = (by + bh / 2) * Hi;
    return 'background-image:url("' + pgImg(face.pid, 800) + '"),url("' + pgImgFallback(face.pid, 800) + '");background-size:' + Wi.toFixed(1) + 'px ' + Hi.toFixed(1) + 'px;background-position:' +
      (size / 2 - cx).toFixed(1) + 'px ' + (size / 2 - cy).toFixed(1) + 'px;background-repeat:no-repeat';
  }
  function when(at) { const d = new Date(String(at).replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
  function auth() { return PGControl.role() === 'couple' ? {} : { token: pgToken() || pgSavedToken() }; }

  function pane() {
    const p = document.createElement('div'); p.className = 'pgcp-pane pgfd';
    p.innerHTML = '<p class="pgcp-note">Guests who found themselves with Find me. Each face is from your wedding photos — we never keep anyone’s selfie. Only you can see this list.</p><div class="pgfd-list"><p class="pgfd-wait">Loading…</p></div>';
    const box = p.querySelector('.pgfd-list');
    pgApi('foundList', auth()).then(r => {
      last = r.guests || [];
      if (!last.length) { box.innerHTML = '<div class="pgfd-empty"><b>No one yet</b><span>When guests find themselves with Find me, they appear here with their face, name and side.</span></div>'; return; }
      const found = last.filter(x => x.status === 'ok').length, close = last.length - found;
      box.innerHTML = '<p class="pgfd-count">' + found + ' found' + (close ? ' · ' + close + ' close match' + (close > 1 ? 'es' : '') + ' waiting in Requests' : '') + '</p><div class="pgcp-card">' +
        last.map((x, i) => '<button type="button" class="pgfd-row" data-i="' + i + '">' +
          '<span class="pgfd-face" style=\'' + crop(x.face, 56) + '\' aria-hidden="true">' + (x.face ? '' : pgEsc((x.name || '?').charAt(0))) + '</span>' +
          '<span class="pgfd-t"><b>' + pgEsc(x.name || 'Guest') + '</b><small>' + [SIDE[x.side], x.attended === 'yes' ? 'Attended' : x.attended === 'no' ? 'Didn’t attend' : ''].filter(Boolean).map(pgEsc).join(' · ') + '</small>' +
          '<small>' + (x.status === 'close' ? '<i class="pgfd-tag">Close match</i> ' : '') + x.count + ' photo' + (x.count === 1 ? '' : 's') + (when(x.at) ? ' · ' + when(x.at) : '') + '</small></span>' +
          (x.phone ? '<a class="pgfd-call" href="tel:' + pgEsc(x.phone) + '" aria-label="Call ' + pgEsc(x.name || 'guest') + '">' + pgEsc(x.phone) + '</a>' : '') + '</button>').join('') + '</div>';
    }).catch(err => { box.innerHTML = '<p class="pgfd-wait">' + pgEsc(err.message) + '</p>'; });
    box.addEventListener('click', e => {
      if (e.target.closest('.pgfd-call')) return;   // the number opens the phone app
      const b = e.target.closest('.pgfd-row'); if (!b || !last) return;
      const x = last[+b.dataset.i], map = pgPhotoById(), photos = (x.photos || []).map(id => map[id]).filter(Boolean);
      if (!photos.length) return showToast('These photos are not in the gallery any more');
      const s = document.querySelector('.pgcp-sheet .pgcp-x'); if (s) s.click();
      setTimeout(() => pgOpenEvent(x.name + ' · ' + photos.length + ' photo' + (photos.length === 1 ? '' : 's'), photos), 240);
    });
    return p;
  }
  function summary() { return last ? (last.length ? last.length + ' guest' + (last.length === 1 ? '' : 's') : 'No one yet') : 'Guests who found themselves'; }
  window.PGFound = { pane, summary };
})();
