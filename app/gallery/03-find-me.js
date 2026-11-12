// Couple monogram + Find me (selfie → your photos).
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
function pgMonogram() {
  const el = document.getElementById('pgMono'); if (!el || !GALLERY) return;
  if (GALLERY.logoUrl) { el.innerHTML = '<img alt="" src="' + pgEsc(GALLERY.logoUrl) + '">'; return; }   // (the nav keeps "PG" when a logo picture is used)
  const parts = String(GALLERY.title || '').split(/\s*(?:&|\band\b|\+|\/|,|·)\s*/i).map(x => x.trim()).filter(Boolean);
  el.textContent = parts.length >= 2 ? parts[0][0].toUpperCase() + '&' + parts[1][0].toUpperCase() : String(GALLERY.title || 'PG').slice(0, 2).toUpperCase();
  // the Hub button in the nav bar shows the same initials (it follows light / dark like the header button)
  const nav = document.getElementById('pgNavMono'); if (nav) { nav.textContent = el.textContent || 'PG'; nav.setAttribute('font-size', el.textContent.length > 3 ? '10' : el.textContent.length > 2 ? '12' : '14'); }
}
(function pgFindMe() {
  const $ = (id) => document.getElementById(id);
  let stream = null, loopTimer = null, coreReady = null, lastResult = null;
  const sheet = $('fmSheet'), back = $('fmBackdrop'), video = $('fmVideo'), overlay = $('fmOverlay');
  function status(t) { $('fmStatus').textContent = t || ''; }
  // Step 60: guests use the camera only (no uploaded photo, so no cropped Instagram picture) and pass a live check:
  // turn the head to one side and the other, then look straight. The couple and the photographer can still choose a photo.
  function strict() { const r = window.PGControl ? PGControl.role() : 'guest'; return !(r === 'couple' || r === 'photographer' || r === 'picgrades' || (window.pgIsCouple && pgIsCouple())); }
  let live = null;
  const LIVE_SIDE = 0.12, LIVE_STRAIGHT = 0.07;
  function loadCore() {
    if (!coreReady) coreReady = new Promise((res, rej) => { if (window.PGFaces) return res(); const s = document.createElement('script'); s.src = '/app/faces-core.js'; s.onload = res; s.onerror = () => { coreReady = null; rej(new Error('Could not load face search. Check the internet and try again.')); }; document.head.appendChild(s); });
    return coreReady;
  }
  function prepare() {
    status('Getting face search ready… the first time takes a few seconds.');
    return loadCore().then(() => PGFaces.load()).then(() => status(''));
  }
  function reset() { const how = document.querySelector('#fmSheet .fm-sub-how'); if (how) how.textContent = strict() ? 'Take a selfie with the camera: a quick live check (turn your head, then look straight) makes sure it is really you.' : 'Take a selfie or choose a photo of yourself.'; live = null; askBox().classList.add('hidden'); $('fmFile').closest('label').classList.toggle('hidden', strict()); $('fmResult').classList.add('hidden'); $('fmActions').classList.remove('hidden'); $('fmCam').classList.add('hidden'); $('fmShoot').classList.add('hidden'); status(''); }
  function open() { reset(); back.classList.add('show'); sheet.classList.add('show'); prepare().catch(e => status(e.message)); }
  function close() { stopCam(); back.classList.remove('show'); sheet.classList.remove('show'); }
  function stopCam() { clearTimeout(loopTimer); loopTimer = null; if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } video.srcObject = null; }

  function startCam() {
    const other = strict() ? 'Please open this link in Chrome or Safari and allow the camera.' : 'Choose a photo instead.';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status('This browser cannot use the camera here. ' + other); return; }
    status('Allow the camera when your phone asks.');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false }).then(s => {
      stream = s; video.srcObject = s; $('fmCam').classList.remove('hidden'); $('fmActions').classList.add('hidden'); $('fmShoot').classList.remove('hidden'); status('');
      return video.play().catch(() => {});
    }).then(() => prepare()).then(loop).catch(e => {
      stopCam(); reset();
      status(e && e.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow the camera in your browser settings' + (strict() ? '.' : ', or choose a photo instead.') : (e && e.message) || 'The camera could not start. ' + other);
    });
  }
  function loop() {
    if (!stream) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (!w) { loopTimer = setTimeout(loop, 250); return; }
    const guest = strict();
    (guest ? PGFaces.pose(video, 0.5).then(p => p ? [p] : []) : PGFaces.locate(video, 0.5)).then(list => {
      if (!stream) return;
      overlay.width = w; overlay.height = h;
      const ctx = overlay.getContext('2d'); ctx.clearRect(0, 0, w, h);
      const big = list.sort((a, b) => b.box.width - a.box.width)[0];
      const ok = big && big.box.width > w * 0.18;
      let hint = ok ? 'Face found ✓ Tap “Take selfie”' : big ? 'Come a little closer' : 'Look at the camera', ready = !!ok;
      if (guest) {
        if (!live) live = { stage: 'find', lo: 0, hi: 0 };
        ready = false;
        if (ok) {
          const y = big.yaw || 0;
          if (live.stage === 'find') live.stage = 'turn';
          if (live.stage === 'turn') {
            live.lo = Math.min(live.lo, y); live.hi = Math.max(live.hi, y);
            const one = live.lo < -LIVE_SIDE || live.hi > LIVE_SIDE;
            if (live.lo < -LIVE_SIDE && live.hi > LIVE_SIDE) live.stage = 'back';
            hint = live.stage === 'back' ? 'Now look straight at the camera' : one ? 'Good ✓ Now slowly turn to the other side' : 'Live check: slowly turn your head to one side';
          }
          if (live.stage === 'back') { if (Math.abs(y) < LIVE_STRAIGHT) live.stage = 'done'; else hint = 'Now look straight at the camera'; }
          if (live.stage === 'done') { ready = true; hint = 'Live check passed ✓ Tap “Take selfie”'; }
        }
        sheet.dataset.live = live.stage;
      }
      if (big) { ctx.strokeStyle = ready ? '#3ddc84' : '#ffffff'; ctx.lineWidth = Math.max(3, w / 160); const b = big.box; ctx.strokeRect(b.x, b.y, b.width, b.height); }
      $('fmHint').textContent = hint;
      $('fmHint').classList.toggle('ok', ready); $('fmShoot').disabled = !ready;
      loopTimer = setTimeout(loop, guest ? 200 : 300);
    }).catch(() => { loopTimer = setTimeout(loop, 600); });
  }
  function shoot() {
    if (!stream || !video.videoWidth) return;
    if (strict() && (!live || live.stage !== 'done')) return;   // the live check comes first
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext('2d').drawImage(video, 0, 0);
    stopCam(); $('fmCam').classList.add('hidden'); $('fmShoot').classList.add('hidden');
    findIn(c);
  }
  // a small card shows what is happening; we let the screen paint before the heavy face work starts
  const busy = (on, step) => { $('fmBusy').classList.toggle('hidden', !on); if (step) $('fmBusyStep').textContent = step; };
  const paint = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));
  function findIn(input) {
    status(''); $('fmActions').classList.add('hidden'); $('fmCam').classList.add('hidden'); $('fmShoot').classList.add('hidden');
    busy(true, 'Getting face search ready…');
    return paint().then(prepare).then(() => { busy(true, 'Reading your face…'); return paint(); }).then(() => PGFaces.detect(input, 0.5)).then(found => {
      if (!found.length) { busy(false); reset(); status('No face found. Use a clear, front-facing photo in good light.'); return; }
      busy(true, 'Matching with the wedding photos…');
      // only this one face code is sent; the matching happens on the PicGrades server
      const me = found.sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height)[0];
      return pgApi('findFaces', { d: PGFaces.pack(me.descriptor) }).then(m => { busy(false); showResult(m, found.length > 1); });
    }).catch(e => { busy(false); reset(); status(e.message); });
  }
  function photoIndex() {
    const map = {}, order = [];
    (GALLERY.events || []).concat([{ name: 'Root Moment', photos: GALLERY.root || [] }]).forEach(ev => ev.photos.forEach(p => { if (!map[p.id]) { map[p.id] = p; order.push(p.id); } }));
    return { map, order };
  }
  function showResult(m, several) {
    const idx = photoIndex(), inOrder = (ids) => { const set = new Set(ids); return idx.order.filter(id => set.has(id)).map(id => idx.map[id]); };
    if (m.unclear || m.close) { GALLERY.personal = []; $('fmActions').classList.add('hidden'); lastResult = null; }
    if (m.unclear) { status('We could not be sure this is you: your face looks close to more than one person here. Try again in good light, alone, looking straight.'); $('fmActions').classList.remove('hidden'); return; }
    if (m.close) { status(''); showAsk(m.need || 3); return; }
    const sure = inOrder(m.sure), maybe = inOrder(m.maybe);
    GALLERY.personal = [];
    if (sure.length) GALLERY.personal.push({ name: 'Your photos', photos: sure, personal: true });
    if (maybe.length) GALLERY.personal.push({ name: 'Maybe you', photos: maybe, personal: true });
    renderGalleries();
    lastResult = sure.length ? 'Your photos' : maybe.length ? 'Maybe you' : null;
    $('fmActions').classList.add('hidden');
    // step 60b: nothing found = nothing to save or make: only "Try another selfie"
    const none = !lastResult;
    ['fmOpen', 'fmSave', 'fmReel', 'fmPost'].forEach(id => $(id).classList.toggle('hidden', none)); $('fmSaved').classList.add('hidden');
    $('fmAgain').textContent = strict() ? 'Try another selfie' : 'Try another photo';
    if (none) { $('fmResult').classList.remove('hidden'); $('fmThumbs').innerHTML = ''; status(strict() ? 'We could not find you in this wedding’s photos. Try again in good light, looking straight at the camera.' : 'We could not find you in this gallery. Try a clearer, front-facing photo in good light.'); return; }
    status((sure.length ? 'We found your photos' : 'These may be you') + (sure.length && maybe.length ? ' · and a few that may be you' : '') + (several ? ' (we used the biggest face in your photo)' : ''));   // step 49: no counts
    $('fmThumbs').innerHTML = '';
    (sure.length ? sure : maybe).slice(0, 8).forEach(p => { const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.src = pgImg(p.id, 300); im.onerror = function () { this.onerror = null; this.src = pgImgFallback(p.id, 300); }; $('fmThumbs').appendChild(im); });
    $('fmOpen').textContent = sure.length ? 'See your photos' : 'See the possible photos';
    $('fmResult').classList.remove('hidden');
  }
  // a close match: fewer photos than needed. Nothing is shown; the guest leaves an email and the couple approves.
  function askBox() {
    let b = $('fmAsk'); if (b) return b;
    b = document.createElement('div'); b.id = 'fmAsk'; b.className = 'fm-ask hidden';
    b.innerHTML = '<b>You are a close match</b><p id="fmAskText"></p><div class="fm-ask-row"><input type="email" id="fmAskEmail" placeholder="Your email" autocomplete="email" aria-label="Your email"><button type="button" class="mk-btn-peach" id="fmAskSend">Send</button></div><p class="fm-ask-done hidden" id="fmAskDone"></p><button type="button" class="fm-link" id="fmAskAgain">Try another selfie</button>';
    $('fmStatus').after(b);
    b.querySelector('#fmAskAgain').addEventListener('click', reset);
    b.querySelector('#fmAskSend').addEventListener('click', () => {
      const email = $('fmAskEmail').value.trim(), btn = $('fmAskSend');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showToast('Please write a valid email address'); $('fmAskEmail').focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      pgApi('askAccess', Object.assign({ email }, window.pgGuestBody ? pgGuestBody() : {})).then(() => {
        b.querySelector('.fm-ask-row').classList.add('hidden');
        $('fmAskDone').textContent = 'Request sent ✓ When the couple approves, we will email you the link to your photos.'; $('fmAskDone').classList.remove('hidden');
      }).catch(e => showToast(e.message)).finally(() => { btn.disabled = false; btn.textContent = 'Send'; });
    });
    return b;
  }
  function showAsk(need) {
    const b = askBox();
    $('fmAskText').textContent = 'We found you in fewer than ' + need + ' photos, so the couple needs to approve before you can see them. Share your email and we will send your access link.';
    b.querySelector('.fm-ask-row').classList.remove('hidden'); $('fmAskDone').classList.add('hidden');
    b.classList.remove('hidden');
  }
  $('fmCamBtn').addEventListener('click', startCam);
  $('fmShoot').addEventListener('click', shoot);
  $('fmFile').addEventListener('change', function () {
    const f = this.files[0]; this.value = ''; if (!f || strict()) return;   // guests: camera only (step 60)
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => { findIn(im).then(() => URL.revokeObjectURL(url)); };
    im.onerror = () => { status('That file could not be opened. Choose a JPG or PNG photo.'); URL.revokeObjectURL(url); };
    im.src = url;
  });
  $('fmOpen').addEventListener('click', () => { if (!lastResult) return; close(); if (window.pgOpenEvent) pgOpenEvent(lastResult); else openCollection(lastResult, 0); });
  $('fmAgain').addEventListener('click', reset);
  $('fmClose').addEventListener('click', close);
  back.addEventListener('click', close);
  document.querySelectorAll('[data-findme]').forEach(b => b.addEventListener('click', open));
  pgAfter('renderGalleries', () => document.querySelectorAll('[data-findme]').forEach(b => b.classList.toggle('hidden', !(GALLERY && GALLERY.faceSearch))));
})();
