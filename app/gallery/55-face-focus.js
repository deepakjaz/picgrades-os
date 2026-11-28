// Step 110: photos keep faces in the frame. When a photo loads into a cropped frame (cards that change their photo, covers,
// a template's photos) and nobody framed it by hand, it is centred on the faces read for this wedding — like reels already do.
// Uses the same face boxes as Reel / Post Edits (pgApi('faceBoxes')), loaded once; nothing is stored.
(function pgFaceFocus() {
  let boxes = window.pgFaceBoxes || null, asked = false;
  const waiting = new Set();
  const idOf = img => img.dataset.photo || img.dataset.pid || img.dataset.photoId || ((String(img.currentSrc || img.src).match(/googleusercontent\.com\/d\/([^=?/]+)/) || [])[1] || '');
  function place(img) {
    const B = window.pgFaceBoxes || boxes, id = idOf(img), f = id && B && B[id]; if (!f || !f.length) return;
    if (img.dataset.framed || img.closest('[data-framed]')) return;
    if (img.style.objectPosition && img.dataset.auto !== '1') return;   // framed by the couple / the template
    if (getComputedStyle(img).objectFit !== 'cover') return;
    const big = f.slice().sort((a, b) => b[2] * b[3] - a[2] * a[3])[0];   // the biggest face leads
    const cx = Math.max(0, Math.min(1, big[0] + big[2] / 2)), cy = Math.max(0, Math.min(1, big[1] + big[3] / 2 - 0.04));
    img.style.objectPosition = +(cx * 100).toFixed(1) + '% ' + +(cy * 100).toFixed(1) + '%';
    if (img.style.transformOrigin) img.style.transformOrigin = img.style.objectPosition;
  }
  function load() {
    if (asked || boxes || typeof pgApi !== 'function' || !window.GALLERY || GALLERY.demo) return; asked = true;
    pgApi('faceBoxes').then(r => { const m = {}; Object.keys((r && r.boxes) || {}).forEach(id => { m[id] = r.boxes[id].map(b => b.map(v => v / 1000)); });
      boxes = window.pgFaceBoxes = window.pgFaceBoxes || m; waiting.forEach(place); waiting.clear(); }).catch(() => {});
  }
  document.addEventListener('load', ev => {
    const img = ev.target; if (!img || img.tagName !== 'IMG' || !idOf(img) || /^demo:/.test(idOf(img))) return;
    if (boxes || window.pgFaceBoxes) { boxes = boxes || window.pgFaceBoxes; place(img); } else { waiting.add(img); load(); }
  }, true);
  window.PGFaceFocus = { place, ready: () => !!boxes };
})();
