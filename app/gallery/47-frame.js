// =====================================================================
// Step 79 — frame a photo inside its holder (like Photo Edits)
// One sheet for every photo holder that is not the free editor: the Story
// template photos and the cover photo of a Hub card. The photo is shown in
// a holder of the same shape as on the page. Drag it to move it inside the
// holder, zoom in or out, Reset. Nothing is cut out of the photo — it only
// changes which part of it shows.
//
//   PGFrame.open({ id, ratio: w/h, frame: { fx, fy, z }, title, onDone(frame|null) })
//   PGFrame.style(frame, isBackground) → the CSS text for an <img> (or a
//   background) that shows the photo framed this way.
//   frame: fx, fy = the point of the photo kept in view (0–100, %), z = zoom (1–3)
// =====================================================================
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d) => (v == null || v === '' || isNaN(+v) ? d : +v);
  function norm(f, dfy) {
    if (!f || typeof f !== 'object') return null;
    const o = { fx: clamp(Math.round(num(f.fx, 50)), 0, 100), fy: clamp(Math.round(num(f.fy, dfy == null ? 40 : dfy)), 0, 100), z: clamp(Math.round(num(f.z, 1) * 100) / 100, 1, 3) };
    return o;
  }
  function style(f, bgMode) {
    f = norm(f); if (!f) return '';
    const pos = f.fx + '% ' + f.fy + '%';
    return (bgMode ? 'background-position:' + pos : 'object-position:' + pos) + (f.z > 1 ? ';scale:' + f.z + ';transform-origin:' + pos : '');
  }
  function apply(node, f, bgMode) {   // set (or clear) the framing on a node already on the page
    if (!node) return;
    f = norm(f);
    const pos = f ? f.fx + '% ' + f.fy + '%' : '';
    if (bgMode) node.style.backgroundPosition = pos; else node.style.objectPosition = pos;
    node.style.scale = f && f.z > 1 ? String(f.z) : ''; node.style.transformOrigin = f && f.z > 1 ? pos : '';
  }

  let open_ = null;
  function close() { if (open_) { open_.back.remove(); open_.sh.remove(); open_ = null; document.body.classList.remove('pgfr-on'); } }
  function open(o) {
    close();
    const ratio = clamp(num(o.ratio, 0.8), 0.3, 3.5);
    let f = norm(o.frame) || { fx: 50, fy: num(o.dfy, 40), z: 1 };
    const back = document.createElement('div'); back.className = 'pgfr-back';
    const sh = document.createElement('div'); sh.className = 'pgfr'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Frame the photo');
    sh.innerHTML = '<div class="pgfr-top"><b>' + pgEsc(o.title || 'Frame the photo') + '</b><button type="button" class="pgfr-x" aria-label="Close">✕</button></div>' +
      '<p class="pgfr-note">Drag the photo to move it inside the frame. Zoom to go closer.</p>' +
      '<div class="pgfr-stage"><div class="pgfr-hold"><img alt="" draggable="false"></div></div>' +
      '<label class="pgfr-zoom"><span>Zoom</span><input type="range" min="1" max="3" step="0.05" aria-label="Zoom"><output></output></label>' +
      '<div class="pgfr-acts"><button type="button" class="pgfr-reset">Reset</button><button type="button" class="pgfr-done">Done</button></div>';
    document.body.append(back, sh);
    document.body.classList.add('pgfr-on');
    open_ = { back, sh };
    const hold = sh.querySelector('.pgfr-hold'), img = hold.querySelector('img'), zr = sh.querySelector('input'), out = sh.querySelector('output');
    // the holder keeps the shape of the place on the page, as big as fits
    const fit = () => { const st = sh.querySelector('.pgfr-stage'), W = st.clientWidth, H = Math.min(window.innerHeight * 0.52, 520); let w = W, hgt = W / ratio; if (hgt > H) { hgt = H; w = H * ratio; } hold.style.width = Math.round(w) + 'px'; hold.style.height = Math.round(hgt) + 'px'; };
    const paint = () => { img.style.cssText = style(f); zr.value = String(f.z); out.textContent = Math.round(f.z * 100) + '%'; };
    img.src = pgImg(o.id, 1200); fit(); paint();
    // drag: the photo follows the finger, so dragging right shows more of the left side
    let d = null;
    hold.addEventListener('pointerdown', e => { e.preventDefault(); hold.setPointerCapture(e.pointerId); d = { x: e.clientX, y: e.clientY, f0: Object.assign({}, f) }; hold.classList.add('on'); });
    hold.addEventListener('pointermove', e => {
      if (!d || !img.naturalWidth) return;
      const r = hold.getBoundingClientRect(), cs = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight) * f.z;
      const ow = Math.max(img.naturalWidth * cs - r.width, r.width * 0.3), oh = Math.max(img.naturalHeight * cs - r.height, r.height * 0.3);
      f.fx = clamp(Math.round(d.f0.fx - (e.clientX - d.x) / ow * 100), 0, 100); f.fy = clamp(Math.round(d.f0.fy - (e.clientY - d.y) / oh * 100), 0, 100); paint();
    });
    const up = () => { d = null; hold.classList.remove('on'); };
    hold.addEventListener('pointerup', up); hold.addEventListener('pointercancel', up);
    hold.addEventListener('wheel', e => { e.preventDefault(); f.z = clamp(Math.round((f.z - e.deltaY * 0.002) * 100) / 100, 1, 3); paint(); }, { passive: false });
    zr.addEventListener('input', () => { f.z = +zr.value; paint(); });
    const shut = () => { close(); window.removeEventListener('resize', fit); };
    window.addEventListener('resize', fit);
    back.addEventListener('click', shut); sh.querySelector('.pgfr-x').addEventListener('click', shut);
    sh.querySelector('.pgfr-reset').addEventListener('click', () => { f = { fx: 50, fy: num(o.dfy, 40), z: 1 }; paint(); sh.querySelector('.pgfr-reset').dataset.reset = '1'; });
    sh.querySelector('.pgfr-done').addEventListener('click', () => { const was = sh.querySelector('.pgfr-reset').dataset.reset && f.z === 1 && f.fx === 50 && f.fy === num(o.dfy, 40); shut(); if (o.onDone) o.onDone(was ? null : Object.assign({}, f)); });
  }
  window.PGFrame = { open, close, style, apply, norm, state: () => (open_ ? { open: true } : null) };
})();
