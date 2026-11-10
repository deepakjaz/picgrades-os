// Photo protection (step 48). For guests (not the couple, the photographer or PicGrades):
//   · no right-click, no long-press "Save image", no dragging a photo out, no printing the photos — the Download button is the only way,
//     and it gives only the photos Find me found of them (or that the couple approved, 24-rules.js)
//   · photos that are not theirs are shown at screen size only (1280 px), so a screenshot is never the full photo
//   · a watermark over the photo view, if the couple / photographer switch it on (Control Panel › Functions › Watermark).
//     PicGrades only provides the switch; the words are theirs (default: the wedding's title). Downloads never carry it.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgProtect() {
  const free = () => !window.PGRules || PGRules.free();
  const mineOk = id => window.PGRules && PGRules.canDownload(id);
  const pages = () => (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.pages) || {};
  const wmOn = () => pages().watermark === 'on';
  const wmText = () => (pages().wmtext || (GALLERY && GALLERY.title) || '').trim();
  function paint() { document.body.classList.toggle('pg-guard', !free()); }

  // ---- 1. no right-click / long-press / drag / print on photos ----
  const isPhoto = t => t && t.closest && (t.tagName === 'IMG' || t.closest('.pgwm, .pgv-slide, .pgcv-stage, .pgx-cell, .pgm-item'));
  document.addEventListener('contextmenu', e => { if (!free() && isPhoto(e.target)) e.preventDefault(); }, true);
  document.addEventListener('dragstart', e => { if (!free() && e.target && e.target.tagName === 'IMG') e.preventDefault(); }, true);
  // (the long-press menu on phones is switched off by CSS: -webkit-touch-callout:none on body.pg-guard img)

  // ---- 2. screen-size photos for what is not theirs ----
  const CAP = 1280, img = pgImg, fb = pgImgFallback;
  pgImg = function (id, w) { return img(id, !free() && w > CAP && !mineOk(id) ? CAP : w); };
  pgImgFallback = function (id, w) { return fb(id, !free() && w > CAP && !mineOk(id) ? CAP : w); };

  // ---- 3. the watermark ----
  function wmUrl(text) {
    const t = text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220"><g transform="rotate(-24 170 110)" font-family="Georgia,serif" font-size="22" text-anchor="middle">' +
      '<text x="170" y="118" fill="rgba(0,0,0,.28)" dx="1" dy="1">' + t + '</text><text x="170" y="118" fill="rgba(255,255,255,.5)">' + t + '</text></g></svg>';
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
  }
  function mark(host, id, fixed) {
    let el = host.querySelector(':scope > .pgwm');
    const want = !free() && wmOn() && wmText() && id && !mineOk(id);
    if (!want) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = 'pgwm' + (fixed ? ' pgwm-fixed' : ''); el.setAttribute('aria-hidden', 'true'); host.appendChild(el); }
    el.style.backgroundImage = wmUrl(wmText());
  }
  const root = document.getElementById('view-root');
  const liveId = () => (typeof MOMENTS !== 'undefined' && MOMENTS[activeIdx] && MOMENTS[activeIdx].id) || '';
  pgAfter('applyActiveMoment', () => { if (root) mark(root, liveId(), true); });
  document.addEventListener('pg:classic-photo', e => { const d = e.detail || {}; if (d.photo && d.el) mark(d.el, d.photo.id, false); });
  function refresh() {
    paint();
    if (root) mark(root, liveId(), true);
    const st = document.querySelector('.pgcv-stage'), cur = window.pgViewerClassic && pgViewerClassic.photo && pgViewerClassic.photo();
    if (st && cur) mark(st, cur.id, false);
  }
  pgAfter('pgRenderHub', refresh); pgAfter('switchView', paint);
  if (window.PGControl) { const r = PGControl.refresh; PGControl.refresh = function () { const x = r.apply(this, arguments); refresh(); return x; }; }

  // ---- Control Panel › Functions: photo protection + watermark ----
  function pane(call) {
    const p = document.createElement('div'); p.className = 'pgwm-pane';
    p.innerHTML = '<h4 class="pgr-h">Photo protection</h4>' +
      '<div class="pgf-row"><div><b>Guests can’t save photos</b><small>No right-click, no long-press save, no dragging. Guests download only the photos Find me found of them — others they ask for, and you approve in Requests. This is the app’s privacy policy, always on.</small></div></div>' +
      '<div class="pgf-row"><div><b>Watermark</b><small>Your words across photos guests view. Downloads stay clean.</small></div><div class="pgf-end"><input type="checkbox" class="pgf-sw" aria-label="Watermark"></div></div>' +
      '<label class="pgwm-lab">Watermark words<input type="text" maxlength="40" class="pgwm-text" placeholder="e.g. Tara &amp; Vikram · WFA"></label>' +
      '<div class="pgwm-demo" aria-hidden="true"></div>';
    const sw = p.querySelector('.pgf-sw'), tx = p.querySelector('.pgwm-text'), demo = p.querySelector('.pgwm-demo'), lab = p.querySelector('.pgwm-lab');
    sw.checked = wmOn(); tx.value = pages().wmtext || '';
    const show = () => { lab.hidden = demo.hidden = !sw.checked; demo.style.backgroundImage = wmUrl(tx.value.trim() || (GALLERY.title || '')); };
    const save = (part, msg) => {
      const before = Object.assign({}, GALLERY.pages || {}); GALLERY.pages = Object.assign({}, before, part); refresh();
      call('coupleLook', 'setLook', { pages: JSON.stringify(part) })
        .then(r => { GALLERY.pages = r.pages || GALLERY.pages; refresh(); if (msg) showToast(msg); })
        .catch(err => { GALLERY.pages = before; sw.checked = wmOn(); show(); refresh(); showToast(err.message); });
    };
    sw.addEventListener('change', () => { show(); save({ watermark: sw.checked ? 'on' : 'off', wmtext: tx.value.trim() }, sw.checked ? 'Watermark is on' : 'Watermark is off'); });
    let t = null;
    tx.addEventListener('input', () => { show(); clearTimeout(t); t = setTimeout(() => save({ wmtext: tx.value.trim() }, 'Watermark saved'), 900); });
    show();
    return p;
  }
  window.PGProtect = { pane, refresh };
  paint();
})();
