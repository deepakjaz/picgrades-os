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
  function loadCore() {
    if (!coreReady) coreReady = new Promise((res, rej) => { if (window.PGFaces) return res(); const s = document.createElement('script'); s.src = '/app/faces-core.js'; s.onload = res; s.onerror = () => { coreReady = null; rej(new Error('Could not load face search. Check the internet and try again.')); }; document.head.appendChild(s); });
    return coreReady;
  }
  function prepare() {
    status('Getting face search ready… the first time takes a few seconds.');
    return loadCore().then(() => PGFaces.load()).then(() => status(''));
  }
  function reset() { $('fmResult').classList.add('hidden'); $('fmActions').classList.remove('hidden'); $('fmCam').classList.add('hidden'); $('fmShoot').classList.add('hidden'); status(''); }
  function open() { reset(); back.classList.add('show'); sheet.classList.add('show'); prepare().catch(e => status(e.message)); }
  function close() { stopCam(); back.classList.remove('show'); sheet.classList.remove('show'); }
  function stopCam() { clearTimeout(loopTimer); loopTimer = null; if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } video.srcObject = null; }

  function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status('This browser cannot use the camera here. Choose a photo instead.'); return; }
    status('Allow the camera when your phone asks.');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false }).then(s => {
      stream = s; video.srcObject = s; $('fmCam').classList.remove('hidden'); $('fmActions').classList.add('hidden'); $('fmShoot').classList.remove('hidden'); status('');
      return video.play().catch(() => {});
    }).then(() => prepare()).then(loop).catch(e => {
      stopCam(); reset();
      status(e && e.name === 'NotAllowedError' ? 'Camera permission was blocked. Choose a photo instead (or allow the camera in your browser settings).' : (e && e.message) || 'The camera could not start. Choose a photo instead.');
    });
  }
  function loop() {
    if (!stream) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (!w) { loopTimer = setTimeout(loop, 250); return; }
    PGFaces.locate(video, 0.5).then(list => {
      if (!stream) return;
      overlay.width = w; overlay.height = h;
      const ctx = overlay.getContext('2d'); ctx.clearRect(0, 0, w, h);
      const big = list.sort((a, b) => b.box.width - a.box.width)[0];
      const ok = big && big.box.width > w * 0.18;
      if (big) { ctx.strokeStyle = ok ? '#3ddc84' : '#ffffff'; ctx.lineWidth = Math.max(3, w / 160); const b = big.box; ctx.strokeRect(b.x, b.y, b.width, b.height); }
      $('fmHint').textContent = ok ? 'Face found ✓ Tap “Take selfie”' : big ? 'Come a little closer' : 'Look at the camera';
      $('fmHint').classList.toggle('ok', !!ok); $('fmShoot').disabled = !ok;
      loopTimer = setTimeout(loop, 300);
    }).catch(() => { loopTimer = setTimeout(loop, 600); });
  }
  function shoot() {
    if (!stream || !video.videoWidth) return;
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
    const sure = inOrder(m.sure), maybe = inOrder(m.maybe);
    GALLERY.personal = [];
    if (sure.length) GALLERY.personal.push({ name: 'Your photos', photos: sure, personal: true });
    if (maybe.length) GALLERY.personal.push({ name: 'Maybe you', photos: maybe, personal: true });
    renderGalleries();
    lastResult = sure.length ? 'Your photos' : maybe.length ? 'Maybe you' : null;
    $('fmActions').classList.add('hidden');
    if (!lastResult) { $('fmResult').classList.remove('hidden'); $('fmThumbs').innerHTML = ''; $('fmOpen').classList.add('hidden'); status('We could not find you in this gallery. Try a clearer, front-facing photo in good light.'); return; }
    $('fmOpen').classList.remove('hidden');
    status((sure.length ? sure.length + ' photo' + (sure.length === 1 ? '' : 's') + ' of you' : 'No sure matches') + (maybe.length ? ' · ' + maybe.length + ' maybe you' : '') + (several ? ' (we used the biggest face in your photo)' : ''));
    $('fmThumbs').innerHTML = '';
    (sure.length ? sure : maybe).slice(0, 8).forEach(p => { const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.src = pgImg(p.id, 300); im.onerror = function () { this.onerror = null; this.src = pgImgFallback(p.id, 300); }; $('fmThumbs').appendChild(im); });
    $('fmOpen').textContent = sure.length ? (sure.length === 1 ? 'See your photo' : 'See your ' + sure.length + ' photos') : (maybe.length === 1 ? 'See the possible photo' : 'See ' + maybe.length + ' possible photos');
    $('fmResult').classList.remove('hidden');
  }
  $('fmCamBtn').addEventListener('click', startCam);
  $('fmShoot').addEventListener('click', shoot);
  $('fmFile').addEventListener('change', function () {
    const f = this.files[0]; this.value = ''; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => { findIn(im).then(() => URL.revokeObjectURL(url)); };
    im.onerror = () => { status('That file could not be opened. Choose a JPG or PNG photo.'); URL.revokeObjectURL(url); };
    im.src = url;
  });
  $('fmOpen').addEventListener('click', () => { if (!lastResult) return; close(); openCollection(lastResult, 0); });
  $('fmAgain').addEventListener('click', reset);
  $('fmClose').addEventListener('click', close);
  back.addEventListener('click', close);
  document.querySelectorAll('[data-findme]').forEach(b => b.addEventListener('click', open));
  pgAfter('renderGalleries', () => document.querySelectorAll('[data-findme]').forEach(b => b.classList.toggle('hidden', !(GALLERY && GALLERY.faceSearch))));
})();
