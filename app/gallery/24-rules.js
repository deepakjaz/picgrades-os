// Find me + download rules (step 45). PicGrades' privacy policy for every wedding:
//   · Find me always asks the guest's name and mobile first, and each mobile number gets one search.
//     Once Find me has found them, the button becomes "Your photos" (on every phone they sign in with that number).
//   · Guests download only the photos Find me found of them. For any other photo they send a request with their email;
//     the couple approves it in the Control Panel (Requests tab) and the guest gets an email with a download link (?dl=…).
//   · The couple, the photographer and PicGrades download everything and search as often as they like.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgRules() {
  const $ = id => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const token = () => { try { return localStorage.getItem('pg_token') || ''; } catch (e) { return ''; } };
  // who may do everything: the couple link, a staff login for this wedding (PGControl knows the role)
  function free() {
    const r = window.PGControl ? PGControl.role() : 'guest';
    return r === 'couple' || r === 'photographer' || r === 'picgrades' || pgIsCouple();
  }
  const mine = () => pgStore('mine');            // { sure:[ids], maybe:[ids] } once Find me found this guest
  const found = () => { const m = mine(); return !!(m && ((m.sure || []).length || (m.maybe || []).length)); };
  const granted = () => pgStore('granted') || [];
  function canDownload(id) {
    if (free()) return true;
    const m = mine();
    return !!((m && (m.sure || []).indexOf(id) > -1) || granted().indexOf(id) > -1);
  }

  // ---------- keep the Find me result ----------
  function keep(res) {
    if (!res || !((res.sure || []).length || (res.maybe || []).length)) return;
    pgStore('mine', { sure: res.sure || [], maybe: res.maybe || [] }); pgStore('found', 1);
    document.body.classList.add('pg-found'); label();
  }
  function setsFromMine() {   // "Your photos" / "Maybe you" stay in the gallery after a reload
    const m = mine(); if (!m || free() || typeof GALLERY === 'undefined' || !GALLERY) return;
    const map = pgPhotoById(), list = ids => (ids || []).map(id => map[id]).filter(Boolean);
    const rest = (GALLERY.personal || []).filter(x => x.name !== 'Your photos' && x.name !== 'Maybe you');
    const add = [];
    if (list(m.sure).length) add.push({ name: 'Your photos', photos: list(m.sure), personal: true });
    if (list(m.maybe).length) add.push({ name: 'Maybe you', photos: list(m.maybe), personal: true });
    GALLERY.personal = add.concat(rest);
  }
  pgBefore('renderGalleries', setsFromMine);
  // the server's answer to Find me (and to signing in again with the same number) is kept on this phone
  const api = pgApi;
  pgApi = function (action, body) {
    if (action === 'findFaces') {
      body = Object.assign({}, body || {}, pgGuestBody(), token() ? { token: token() } : {});
      return api(action, body).then(r => {
        if (!free()) keep(r);
        if (r && r.again) setTimeout(() => showToast('You already found your photos — here they are'), 400);
        return r;
      });
    }
    if (action === 'guestJoin') return api(action, body).then(r => { if (r && r.found) keep(r.found); return r; });
    return api(action, body);
  };

  // ---------- Find me: name + mobile first, once ----------
  function openMine() { const set = mine() && (mine().sure || []).length ? 'Your photos' : 'Maybe you'; setsFromMine(); if (window.pgOpenEvent) pgOpenEvent(set); else openCollection(set, 0); }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-findme]'); if (!b || free()) return;
    if (found()) { e.preventDefault(); e.stopImmediatePropagation(); openMine(); return; }
    if (!pgGuest()) {
      e.preventDefault(); e.stopImmediatePropagation();
      pgNeedGuest(() => { if (found()) { renderGalleries(); openMine(); } else b.click(); }, 'First, tell us who you are — then take a selfie to find your photos.');
    }
  }, true);
  // after Find me, its buttons say "Your photos"
  function label() {
    if (free() || !found()) { document.body.classList.remove('pg-found'); return; }
    document.body.classList.add('pg-found');
    // (no counts on the button: step 49)
    document.querySelectorAll('[data-findme]').forEach(b => {
      b.setAttribute('aria-label', 'Your photos');
      const s = b.querySelector('span'), t = b.querySelector('b');
      if (t) { t.textContent = 'Your photos'; if (s) s.textContent = 'Found by Find me'; }
      else if (s) s.textContent = b.classList.contains('pg-findme') ? 'Your photos · found by Find me' : 'Your photos';
    });
  }
  pgAfter('renderGalleries', label);
  pgAfter('pgRenderHub', label);
  // the Hub's Find me card (15-layout.js asks for its words here)
  window.PGRules = {
    found, canDownload, free,
    act: k => (k === 'findme' && !free() && found()) ? ['Your photos', 'Found by Find me', openMine] : null,
    pane: requestsPane
  };
  // a guest who signed in on another phone gets their result back from the server
  let asked = false;
  pgAfter('pgRenderHub', () => {
    if (asked || free() || found() || !pgGuest() || !GALLERY || !GALLERY.faceSearch) return;
    asked = true;
    pgApi('myFind', pgGuestBody()).then(r => { if (r.found) { keep(r.found); renderGalleries(); if (window.pgRenderHub) pgRenderHub(); } }).catch(() => {});
  });

  // ---------- downloads ----------
  const dl = window.pgDownload;
  window.pgDownload = function (m) {
    if (!m || canDownload(m.id)) return dl.apply(this, arguments);
    askFor(m);
  };
  function askFor(m) {
    pgNeedGuest(() => sheet(m), 'Tell us who you are to ask for this photo.');
  }
  function sheet(m) {
    if (canDownload(m.id)) { dl(m); return; }
    const asked = pgStore('asked') || [];
    const back = h('div', 'overlay-backdrop show'), box = h('div', 'reg-overlay show pgr-sheet');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Ask to download');
    const close = () => { box.remove(); back.remove(); };
    back.addEventListener('click', close);
    const already = asked.indexOf(m.id) > -1;
    box.innerHTML = '<div class="reg-overlay-handle"></div>' +
      '<div class="pgr-top"><img alt="" src="' + pgImg(m.id, 240) + '"><div><h3 class="fm-title">Ask to download</h3>' +
      '<p class="pgr-why">To protect everyone’s privacy, the PicGrades app lets guests download only the photos <b>Find me</b> found of them. This is the app’s policy, not the couple’s.</p></div></div>' +
      (already ? '<p class="pgr-done">You already asked for this photo. We’ll email you as soon as it is approved.</p>'
        : '<p class="pgr-how">Are you in this photo, or would you like a copy? Ask for it here — once it is approved, the download link comes to your email.</p>' +
          '<label class="pgr-lab">Your email<input type="email" class="pgr-email" autocomplete="email" inputmode="email" placeholder="you@example.com"></label>' +
          '<p class="pgr-status" aria-live="polite"></p>' +
          '<button type="button" class="mk-btn-peach ios-wide pgr-send">Ask for this photo</button>') +
      '<button type="button" class="pgr-close">' + (already ? 'OK' : 'Not now') + '</button>';
    document.body.append(back, box);
    box.querySelector('.pgr-close').addEventListener('click', close);
    const send = box.querySelector('.pgr-send'); if (!send) return;
    const em = box.querySelector('.pgr-email'); em.value = pgStore('email') || '';
    send.addEventListener('click', () => {
      const email = em.value.trim(), st = box.querySelector('.pgr-status');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { st.textContent = 'Please write a valid email address.'; em.focus(); return; }
      send.disabled = true; send.textContent = 'Sending…'; st.textContent = '';
      pgApi('askDownload', Object.assign({ ids: [m.id], email }, pgGuestBody())).then(() => {
        pgStore('email', email); pgStore('asked', (pgStore('asked') || []).concat([m.id]).slice(-200));
        box.querySelector('.pgr-how').textContent = 'Request sent ✓ We’ll email ' + email + ' as soon as it is approved.';
        box.querySelector('.pgr-lab').remove(); send.remove(); box.querySelector('.pgr-close').textContent = 'Done';
      }).catch(err => { st.textContent = err.message; send.disabled = false; send.textContent = 'Ask for this photo'; });
    });
  }
  // the emailed link: ?dl=… unlocks the approved photos on this phone
  (function fromLink() {
    const q = new URLSearchParams(location.search), code = q.get('dl'); if (!code) return;
    q.delete('dl'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    let done = false;
    pgAfter('pgRenderHub', () => {
      if (done) return; done = true;
      pgApi('dlGrant', { grant: code }).then(r => {
        pgStore('granted', Array.from(new Set(granted().concat(r.ids))));
        const map = pgPhotoById(), photos = r.ids.map(id => map[id]).filter(Boolean);
        showToast('Your photos are ready to download');
        if (photos.length && window.pgOpenEvent) setTimeout(() => pgOpenEvent('Approved for you', photos), 500);
      }).catch(e => showToast(e.message));
    });
  })();

  // ---------- Control Panel › Requests (the couple, the photographer, PicGrades) ----------
  function requestsPane() {
    const p = h('div', 'pgcp-pane pgr-pane');
    const role = window.PGControl ? PGControl.role() : 'guest';
    p.appendChild(h('p', 'pgcp-note', 'Guests can download only the photos Find me found of them — that is the app’s privacy policy, so you never have to say no yourselves. When a guest asks for another photo it shows here. Approve, and they get an email with the download link.'));
    if (role === 'demo') { p.appendChild(h('p', 'pgr-empty', 'In a real wedding, guests’ download requests appear here for the couple to approve. (A demo keeps guests’ emails private, so none are shown.)')); return p; }
    const list = h('div', 'pgr-list', '<p class="pgr-empty">Loading…</p>'); p.appendChild(list);
    const auth = () => (role === 'couple' || pgIsCouple()) ? {} : { token: token() };
    const row = (x, waiting) => {
      const r = h('div', 'pgr-row' + (waiting ? '' : ' done'));
      r.innerHTML = '<div class="pgr-thumbs">' + x.ids.slice(0, 3).map(id => '<img alt="" src="' + pgImg(id, 160) + '">').join('') + '</div>' +
        '<div class="pgr-who"><b>' + pgEsc(x.name || 'Guest') + '</b><span>' + pgEsc(x.email) + ' · ' + x.ids.length + ' photo' + (x.ids.length === 1 ? '' : 's') + '</span><small>' + pgEsc(String(x.at || '').slice(0, 16)) + '</small></div>' +
        (waiting ? '<div class="pgr-acts"><button type="button" class="pgr-no">Decline</button><button type="button" class="pgr-yes">Approve</button></div>'
          : '<em class="' + (x.status === 'approved' ? 'ok' : 'no') + '">' + (x.status === 'approved' ? 'Approved · emailed' : 'Declined') + '</em>');
      r.querySelector('.pgr-thumbs').addEventListener('click', () => { const map = pgPhotoById(), ph = x.ids.map(id => map[id]).filter(Boolean); if (ph.length && window.pgOpenEvent) pgOpenEvent('Asked by ' + (x.name || 'a guest'), ph); });
      if (waiting) r.querySelectorAll('.pgr-yes,.pgr-no').forEach(b => b.addEventListener('click', () => {
        const yes = b.classList.contains('pgr-yes'); r.querySelectorAll('button').forEach(z => { z.disabled = true; });
        pgApi('dlDecide', Object.assign({ reqId: x.reqId, decision: yes ? 'approve' : 'decline' }, auth())).then(() => {
          showToast(yes ? 'Approved — ' + (x.name || 'the guest').split(' ')[0] + ' gets the link by email' : 'Declined'); load();
        }).catch(err => { showToast(err.message); r.querySelectorAll('button').forEach(z => { z.disabled = false; }); });
      }));
      return r;
    };
    function load() {
      pgApi('dlRequests', auth()).then(res => {
        list.innerHTML = '';
        list.appendChild(h('h4', 'pgr-h', 'Waiting' + (res.waiting.length ? ' · ' + res.waiting.length : '')));
        if (!res.waiting.length) list.appendChild(h('p', 'pgr-empty', 'No requests waiting.'));
        res.waiting.forEach(x => list.appendChild(row(x, true)));
        if (res.decided.length) { list.appendChild(h('h4', 'pgr-h', 'Answered')); res.decided.forEach(x => list.appendChild(row(x, false))); }
      }).catch(err => { list.innerHTML = '<p class="pgr-empty">' + pgEsc(err.message) + '</p>'; });
    }
    load();
    return p;
  }
})();
