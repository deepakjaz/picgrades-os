// Step 99d: the app header for every template — how it behaves when the page scrolls, and the logo.
//   pages.hdrmode : 'scroll' (scrolls away with the page, the default) · 'fixed' (stays on top) · 'auto' (hides going down, comes back going up)
//   pages.header  : where the logo sits — 'right' (default) · 'left' · 'center'
//   pages.logo    : 'mono' (the couple's initials, default) · 'image' (their own logo picture) · 'none'
// The editors pass a draft (`over`) to preview before they save.
(function pgHeader() {
  let last = 0, mode = 'scroll';
  function onScroll() {
    const y = window.scrollY || 0, b = document.body;
    b.classList.toggle('pg-hdr-scrolled', y > 24);
    if (mode === 'auto') { if (y > last + 6 && y > 80) b.classList.add('pg-hdr-hide'); else if (y < last - 6 || y < 80) b.classList.remove('pg-hdr-hide'); }
    last = y;
  }
  function apply(over) {
    const pg = Object.assign({}, (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.pages) || {}, over || {}), b = document.body;
    const side = pg.header || 'right', ms = pg.modeside || 'right', logo = pg.logo || 'mono';
    mode = pg.hdrmode || 'scroll';
    b.classList.toggle('pg-logo-left', side === 'left');
    b.classList.toggle('pg-logo-center', side === 'center');
    b.classList.toggle('pg-mode-left', ms === 'left');
    b.classList.toggle('pg-logo-none', logo === 'none');
    b.classList.toggle('pg-hdr-fixed', mode === 'fixed');
    b.classList.toggle('pg-hdr-auto', mode === 'auto');
    if (mode !== 'auto') b.classList.remove('pg-hdr-hide');
    if (over && 'logoUrl' in over && typeof GALLERY !== 'undefined' && GALLERY) {   // a logo picture being tried in the editor
      const keep = GALLERY.logoUrl; GALLERY.logoUrl = logo === 'image' ? over.logoUrl : ''; if (window.pgMonogram) pgMonogram(); GALLERY.logoUrl = keep;
    } else if (window.pgMonogram) pgMonogram();
    onScroll();
  }
  // a picture from the phone → a small square-ish PNG / WebP data URL (at most 256 px), small enough for the Sheet
  function shrink(file) {
    return new Promise((ok, no) => {
      if (!file || !/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return no(new Error('Choose a PNG, JPG, WebP or SVG picture'));
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const k = Math.min(1, 256 / Math.max(im.naturalWidth || 256, im.naturalHeight || 256)), w = Math.max(1, Math.round((im.naturalWidth || 256) * k)), h = Math.max(1, Math.round((im.naturalHeight || 256) * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); URL.revokeObjectURL(url);
        let out = c.toDataURL('image/webp', 0.86); if (!/^data:image\/webp/.test(out)) out = c.toDataURL('image/png');   // (Safari has no WebP encoder)
        if (out.length > 45000) out = c.toDataURL('image/jpeg', 0.8);
        out.length > 45000 ? no(new Error('That logo is too detailed. Try a simpler picture.')) : ok(out);
      };
      im.onerror = () => { URL.revokeObjectURL(url); no(new Error('Could not read that picture')); };
      im.src = url;
    });
  }
  // a small sheet with the header choices, for the card editor (the one editor has them in Pages › Header). Saves at once.
  function sheet() {
    const g = (GALLERY && GALLERY.pages) || {}, st = { hdrmode: g.hdrmode || 'scroll', logo: g.logo || 'mono' }; let data;
    const wrap = document.createElement('div'); wrap.className = 'pghd'; document.body.appendChild(wrap);
    const seg = (k, list) => '<div class="pghd-seg" data-k="' + k + '">' + list.map(([v, n]) => '<button type="button" data-v="' + v + '" class="' + (st[k] === v ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
    const cur = () => (data !== undefined ? data : (GALLERY.logoUrl || GALLERY.logoRaw || ''));
    function paint() {
      wrap.innerHTML = '<div class="pghd-back"></div><div class="pghd-box" role="dialog" aria-label="Header"><b>Header</b>' +
        '<small>When the page scrolls</small>' + seg('hdrmode', [['scroll', 'Scrolls away'], ['fixed', 'Stays on top'], ['auto', 'Hides, comes back']]) +
        '<small>Logo</small>' + seg('logo', [['mono', 'Initials'], ['image', 'Our logo'], ['none', 'No logo']]) +
        (st.logo === 'image' ? '<div class="pghd-logo"><span>' + (cur() ? '<img alt="Your logo" src="' + pgEsc(cur()) + '">' : '<em>No logo yet</em>') + '</span><button type="button" data-up>' + (cur() ? 'Change logo' : 'Upload logo') + '</button><input type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>' : '') +
        '<div class="pghd-acts"><button type="button" data-x>Cancel</button><button type="button" data-ok class="pri">Save</button></div></div>';
      wrap.querySelectorAll('[data-k] button').forEach(b => b.addEventListener('click', () => { st[b.parentNode.dataset.k] = b.dataset.v; paint(); }));
      const f = wrap.querySelector('input[type=file]');
      if (f) { wrap.querySelector('[data-up]').addEventListener('click', () => f.click()); f.addEventListener('change', () => shrink(f.files[0]).then(u => { data = u; paint(); }).catch(e => showToast(e.message))); }
      wrap.querySelector('.pghd-back').addEventListener('click', () => wrap.remove()); wrap.querySelector('[data-x]').addEventListener('click', () => wrap.remove());
      wrap.querySelector('[data-ok]').addEventListener('click', () => {
        if (st.logo === 'image' && !cur()) { showToast('Upload your logo first'); return; }
        const body = { pages: JSON.stringify(st) }; if (data !== undefined) body.logo = data;
        PGControl.save(body).then(r => { if (r.pages) GALLERY.pages = r.pages; if ('logoUrl' in r) GALLERY.logoUrl = r.logoUrl; apply(); wrap.remove(); showToast('Header saved'); }).catch(e => showToast(e.message || 'Could not save'));
      });
    }
    paint();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.PGHeader = { apply, shrink, sheet };
  if (window.pgAfter) pgAfter('pgRenderHub', () => apply());
})();
