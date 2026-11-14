// No photos without Find me (step 63b).
// A wedding set to "only after Find me": guests see the Wedding Highlights and Root Moment. Tapping an event before Find me shows the
// privacy message (if you attended, our photographer captured you → Find me). After Find me, each event shows its highlights and,
// at the bottom, "Ask the couple for every <event> photo" (the couple approves in Control Panel › Requests).
// The server sends a guest's phone only what they may see (Code.gs gateManifest_); this file is the friendly side of it.
// The couple and the photographer choose in Control Panel › Functions: "Only after Find me" or "Open to everyone".
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgGate() {
  const on = () => !!(typeof GALLERY !== 'undefined' && GALLERY && GALLERY.gated);
  const findmeOn = () => (GALLERY.features || {}).findme !== 'off' && GALLERY.faceSearch;
  const evOf = name => (GALLERY.events || []).find(e => e.name === name) || null;
  const blocked = ev => !!(ev && ev.teaserOnly && !ev.isHighlights);

  // ---- the privacy message ----
  const back = document.createElement('div'); back.className = 'pggt-back';
  const sheet = document.createElement('div'); sheet.className = 'pggt-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'pggtTitle');
  document.body.append(back, sheet);
  const close = () => { back.classList.remove('show'); sheet.classList.remove('show'); };
  back.addEventListener('click', close);
  function ask(evName) {
    const can = findmeOn();
    sheet.innerHTML = '<div class="pggt-grab"></div><p class="pggt-eyebrow">' + pgEsc(evName || 'The wedding photos') + '</p>' +
      '<h3 id="pggtTitle">' + (can ? 'Find yourself to see the photos' : 'These photos are private') + '</h3>' +
      '<p>' + (can ? 'To keep everyone’s photos private, each guest sees the photos they are in. If you attended, our photographer has captured you: take a quick selfie and we will find your photos.'
        : 'The couple shares the Wedding Highlights with everyone. For more photos, please ask the couple.') + '</p>' +
      '<div class="pggt-acts">' + (can ? '<button type="button" class="pggt-main" data-a="find">Find me</button>' : '') +
      ((GALLERY.highlights || []).length ? '<button type="button" class="pggt-alt" data-a="hl">See the Wedding Highlights</button>' : '') +
      '<button type="button" class="pggt-link" data-a="x">Not now</button></div>';
    back.classList.add('show'); sheet.classList.add('show');
    const f = sheet.querySelector('.pggt-main') || sheet.querySelector('button'); if (f) f.focus();
  }
  sheet.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    close();
    if (b.dataset.a === 'find') { const fb = document.querySelector('[data-findme]'); if (fb) fb.click(); }   // the same way as every Find me button (name + phone first)
    if (b.dataset.a === 'hl') realOpenEvent('Wedding Highlights');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('show')) close(); });

  // ---- opening an event: blocked before Find me ----
  const realOpenEvent = window.pgOpenEvent;
  if (realOpenEvent) window.pgOpenEvent = function (name, photos) {
    if (on() && !photos && blocked(evOf(name))) return ask(name);
    const r = realOpenEvent.apply(this, arguments);
    paintMore(name);
    return r;
  };
  const realOpenCollection = window.openCollection;
  window.openCollection = function (name, idx) {
    if (on() && blocked(evOf(name))) return ask(name);
    return realOpenCollection.apply(this, arguments);
  };
  // the Hub's photos open the Wedding Highlights when they are one of them
  const realOpenPhoto = window.pgOpenPhoto;
  if (realOpenPhoto) window.pgOpenPhoto = function (id) {
    if (on()) {
      const hl = evOf('Wedding Highlights'), i = hl ? hl.photos.findIndex(p => p.id === id) : -1;
      if (i > -1) return realOpenCollection('Wedding Highlights', i);
      const ev = (GALLERY.events || []).find(e => !e.isHighlights && e.photos.some(p => p.id === id));
      if (ev && blocked(ev)) return ask(ev.name);
    }
    return realOpenPhoto.apply(this, arguments);
  };

  // ---- after Find me: "ask for every photo of this event" at the bottom of the event page ----
  function paintMore(name) {
    const view = document.getElementById('view-event'); if (!view) return;
    let box = view.querySelector('.pggt-more'); if (box) box.remove();
    const ev = evOf(name);
    if (!on() || !ev || ev.isHighlights || ev.full || !GALLERY.found) return;
    box = document.createElement('div'); box.className = 'pggt-more';
    const asked = (pgStore('more') || {})[name];
    box.innerHTML = '<p>These are the ' + pgEsc(name) + ' highlights' + (GALLERY.found ? ' and your photos are in “Your photos”' : '') + '.</p>' +
      (asked ? '<p class="pggt-asked">You asked the couple for every ' + pgEsc(name) + ' photo. We will email you when they open them.</p>'
        : '<button type="button" class="pggt-alt">Ask the couple for every ' + pgEsc(name) + ' photo</button>' +
          '<form class="pggt-form" hidden><label>Your email, so we can tell you<input type="email" required autocomplete="email" placeholder="you@example.com"></label><button type="submit" class="pggt-main">Send request</button></form>');
    view.querySelector('.pgx-body').after(box);
    const btn = box.querySelector('.pggt-alt'), form = box.querySelector('.pggt-form');
    if (!btn) return;
    btn.addEventListener('click', () => { btn.hidden = true; form.hidden = false; form.querySelector('input').focus(); });
    form.addEventListener('submit', e => {
      e.preventDefault(); const sub = form.querySelector('button'); sub.disabled = true; sub.textContent = 'Sending…';
      pgApi('askAccess', Object.assign({ event: name, email: form.querySelector('input').value.trim() }, pgGuestBody())).then(r => {
        const m = pgStore('more') || {}; m[name] = r.reqId; pgStore('more', m);
        showToast(r.status === 'approved' ? 'Already approved — reload to see them' : 'Request sent to the couple'); paintMore(name);
      }).catch(err => { showToast(err.message); sub.disabled = false; sub.textContent = 'Send request'; });
    });
  }

  // Find me found this guest: fetch again so the events' highlights come in (the server decides what this phone may see)
  function found() {
    if (!on() || GALLERY.found) return;
    pgApi('getGallery').then(res => {
      const n = res.gallery; ['events', 'root', 'pool', 'highlights', 'gated', 'found', 'guestPhotos', 'likes', 'notes'].forEach(k => { if (k in n) GALLERY[k] = n[k]; });
      pgGatePrep(); renderGalleries(); if (window.pgRenderHub) pgRenderHub();
    }).catch(() => {});
  }

  // ---- Control Panel › Functions: the couple / photographer choose ----
  function choice() {
    const box = document.createElement('div'); box.className = 'pggt-choice';
    const paint = () => {
      const mode = GALLERY.guestPhotos === 'findme' ? 'findme' : 'open';
      box.innerHTML = '<b>Guest photos</b><small>Who can see the event photos with the guest link. The Wedding Highlights and Root Moment are always open.</small>' +
        '<div class="pggt-seg" role="radiogroup" aria-label="Guest photos">' +
        '<button type="button" role="radio" data-m="findme" aria-checked="' + (mode === 'findme') + '">Only after Find me<small>Each guest sees their own photos and the event highlights</small></button>' +
        '<button type="button" role="radio" data-m="open" aria-checked="' + (mode === 'open') + '">Open to everyone<small>A traditional gallery: every photo for anyone with the link</small></button></div>';
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b || b.getAttribute('aria-checked') === 'true') return;
      const mode = b.dataset.m, before = GALLERY.guestPhotos;
      GALLERY.guestPhotos = mode; paint();
      pgApi('guestPhotos', { mode }).then(r => { GALLERY.guestPhotos = r.guestPhotos; paint(); showToast(r.guestPhotos === 'open' ? 'Guests can see every photo' : 'Guests see photos only after Find me'); })
        .catch(err => { GALLERY.guestPhotos = before; paint(); showToast(err.message); });
    });
    paint(); return box;
  }

  // the gallery page says what this guest can see
  pgAfter('renderGalleries', () => {
    const sub = document.getElementById('pgGallerySub'); if (!sub) return;
    sub.textContent = !on() ? 'Every event of the day. Open a collection to see all its photos.'
      : GALLERY.found ? 'Your photos and the highlights of every event. To see more of an event, ask the couple from its page.'
      : findmeOn() ? 'The Wedding Highlights are for everyone. Use Find me to see your photos and every event’s highlights.'
      : 'The Wedding Highlights are for everyone. For more photos, please ask the couple.';
  });
  window.PGGate = { ask, found, choice, on };
})();
