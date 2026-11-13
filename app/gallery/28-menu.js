// The ☰ menu in the header (step 49): everything in the bottom bar, plus the handy extras —
// Find me / Your photos, Loved photos, share the gallery, install the app, light/dark, and the Control Panel for whoever has it.
// Each item only shows when that function is on for this wedding. Part of the wedding gallery (app/gallery.html).
(function pgMenu() {
  const btn = document.getElementById('pgMenuBtn'); if (!btn) return;
  const on = k => !window.pgFeatureOn || pgFeatureOn(k);
  const navIcon = k => { const a = document.querySelector('.tkg-nav-item[data-nav="' + k + '"] svg'); return a ? a.outerHTML : ''; };
  const IC = {
    find: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="9" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14"/></svg>',
    install: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 8v7M9 12l3 3 3-3"/></svg>',
    mode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'
  };
  function items() {
    const v = document.body.dataset.view || 'hub', L = [];
    // step 61c: whose view this is, and the switch links (the badge on screen shows only once)
    if (window.PGLinks && GALLERY && !GALLERY.isStudio) {
      const m = PGLinks.menu();
      L.push(['h', 'Viewing as ' + m.role]);
      m.links.forEach(([t, url]) => L.push([IC.find, t, () => { if (url === '#signin') PGLinks.signIn(); else location.href = url; }]));
    }
    L.push(['h', 'Go to']);
    [['gallery', 'Galleries'], ['moments', 'Root Moment'], ['hub', 'Wedding Hub'], ['rooms', 'Notes']].forEach(([k, t]) => {
      if (k === 'rooms' && !on('notes')) return;
      L.push([navIcon(k), t, () => { const a = document.querySelector('.tkg-nav-item[data-nav="' + k + '"]'); if (a) a.click(); }, v === k]);
    });
    L.push(['h', 'Your photos']);
    const fm = document.querySelector('[data-findme]');
    if (fm && on('findme') && GALLERY && GALLERY.faceSearch) L.push([IC.find, window.PGRules && PGRules.found() && !PGRules.free() ? 'Your photos' : 'Find me', () => fm.click()]);
    if (on('hearts')) L.push([IC.heart, 'Loved photos', () => pgStatTap('hearts')]);
    L.push(['h', 'This gallery']);
    if (on('share') && window.pgShare) L.push([IC.share, 'Share the gallery', () => pgShare()]);
    const inst = document.getElementById('pghInstall');
    if (on('install') && inst && !inst.classList.contains('hidden')) L.push([IC.install, 'Install the app', () => document.getElementById('pghInstallBtn').click()]);
    const dark = document.documentElement.getAttribute('data-tkg-theme') === 'dark';
    L.push([IC.mode, dark ? 'Light mode' : 'Dark mode', () => document.getElementById('pgModeBtn').click()]);
    const gear = document.querySelector('.tkg-nav-item[data-nav="studio"]');
    if (gear && getComputedStyle(gear).display !== 'none' && !document.body.classList.contains('pg-nav4')) { L.push(['h', 'Manage']); L.push([navIcon('studio'), 'Control Panel', () => gear.click()]); }
    return L;
  }
  let wrap = null;
  function close() {
    if (!wrap) return; const w = wrap; wrap = null;
    document.body.classList.remove('pgmenu-on'); btn.setAttribute('aria-expanded', 'false');
    setTimeout(() => w.remove(), 320); btn.focus({ preventScroll: true });
  }
  function open() {
    if (wrap) return close();
    wrap = document.createElement('div'); wrap.className = 'pgmenu-wrap';
    const back = document.createElement('div'); back.className = 'pgmenu-back';
    const p = document.createElement('nav'); p.className = 'pgmenu'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Menu');
    p.innerHTML = '<div class="pgmenu-top"><b>' + pgEsc((GALLERY && GALLERY.title) || 'Menu') + '</b><button type="button" class="pgmenu-x" aria-label="Close menu">×</button></div>';
    items().forEach(([ic, t, fn, cur]) => {
      if (ic === 'h') { const hh = document.createElement('div'); hh.className = 'pgmenu-h'; hh.textContent = t; p.appendChild(hh); return; }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pgmenu-i' + (cur ? ' on' : ''); b.innerHTML = ic + '<span>' + pgEsc(t) + '</span>';
      if (cur) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => { close(); setTimeout(fn, 60); });
      p.appendChild(b);
    });
    // a heading with nothing under it is dropped
    p.querySelectorAll('.pgmenu-h').forEach(hh => { const n = hh.nextElementSibling; if (!n || n.classList.contains('pgmenu-h')) hh.remove(); });
    back.addEventListener('click', close); p.querySelector('.pgmenu-x').addEventListener('click', close);
    wrap.append(back, p); document.body.appendChild(wrap);
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { document.body.classList.add('pgmenu-on'); const f = p.querySelector('.pgmenu-i'); if (f) f.focus({ preventScroll: true }); });
  }
  btn.addEventListener('click', open);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap) close(); });
  window.PGMenu = { open, close };
})();
