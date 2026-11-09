// Control Panel (step 34): the gear in the bottom bar. Three people edit the same app they see:
//   PicGrades (staff login) · the photographer (their studio's login) · the couple (couple link).
// Guests never see the gear: their bar has 4 buttons and curls into a half circle when they scroll.
// Inside: Look (the wedding's theme + Hub layout) and Functions (on/off switches; PicGrades admins also hold the master "plan" switch).
// Everything is saved for the wedding and reaches every guest. Whoever changes something last wins.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgControl() {
  let ROLE = 'guest', STAFF = null, asked = false;
  // ?pgpreview: this page is the preview window inside the Control Panel. It shows the app exactly as a guest sees it,
  // with the theme / layout being tried (?theme= / ?layout=), and the panel tells it which page to show.
  const PREVIEW = new URLSearchParams(location.search).has('pgpreview');
  if (PREVIEW) {
    document.documentElement.classList.add('pg-previewing');
    window.addEventListener('message', e => {
      const m = e.data || {}; if (e.origin !== location.origin || m.pg !== 'preview') return;
      if (m.dark != null) document.documentElement.setAttribute('data-tkg-theme', m.dark ? 'dark' : 'light');
      if (!m.view || typeof GALLERY === 'undefined' || !GALLERY) return;
      if (m.view === 'photo') { const ev = (GALLERY.events || [])[0]; if (ev) openCollection(ev.name, 0); }
      else switchViewFromNav(m.view);
      window.scrollTo(0, 0);
    });
    pgAfter('pgRenderHub', () => { try { parent.postMessage({ pg: 'preview-ready' }, location.origin); } catch (e) {} });
  }
  const $ = id => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => pgEsc(String(s == null ? '' : s));
  const token = () => { try { return localStorage.getItem('pg_token') || ''; } catch (e) { return ''; } };
  const WHO = {
    picgrades: ['PicGrades', 'You’re signed in as PicGrades.'],
    photographer: ['Photographer', 'You’re signed in as the photographer.'],
    couple: ['Couple', 'This is your wedding app.']
  };

  // ---- who is looking ----
  function paintRole() {
    const g = typeof GALLERY !== 'undefined' && GALLERY;
    ROLE = !g || g.isStudio || PREVIEW ? 'guest' : STAFF ? STAFF.role : (window.pgIsCouple && pgIsCouple()) ? 'couple' : 'guest';
    document.body.classList.toggle('pg-nav4', ROLE === 'guest');
    ['guest', 'couple', 'photographer', 'picgrades'].forEach(r => document.body.classList.toggle('pg-role-' + r, ROLE === r));
    const gear = document.querySelector('.tkg-nav-item[data-nav="studio"]');
    if (gear) { gear.setAttribute('aria-label', 'Control Panel'); gear.title = 'Control Panel'; }
  }
  function askStaff() {
    if (asked || PREVIEW || !token() || typeof GALLERY === 'undefined' || !GALLERY || GALLERY.isStudio) return;
    asked = true;
    pgApi('myRole', { token: token() }).then(r => { STAFF = r; paintRole(); }).catch(() => {});   // not this wedding's photographer = a guest here
  }
  document.body.classList.add('pg-nav4');   // guests' bar until we know better
  pgAfter('pgRenderHub', () => { paintRole(); askStaff(); });
  const ci = window.pgCoupleInit;   // the couple link is confirmed a moment after the page opens
  window.pgCoupleInit = function () { const r = ci ? ci.apply(this, arguments) : undefined; paintRole(); return r; };

  // the gear opens the panel (for guests it is hidden, and the photographer's page keeps its Studio screen)
  document.addEventListener('click', e => {
    const gear = e.target.closest && e.target.closest('.tkg-nav-item[data-nav="studio"]');
    if (!gear || ROLE === 'guest') return;
    e.preventDefault(); e.stopImmediatePropagation(); open();
  }, true);

  // ---- saving (couple link or login) ----
  const call = (coupleAction, staffAction, body) => ROLE === 'couple' ? pgApi(coupleAction, body) : pgApi(staffAction, Object.assign({ token: token() }, body));
  function showLook() {
    if (window.PGTheme) PGTheme.apply(GALLERY.theme || '');
    if (window.PGLayout) PGLayout.apply(GALLERY.layout || '');
  }
  function saveLook(part, box, done) {
    call('coupleLook', 'setLook', part)
      .then(r => { GALLERY.theme = r.theme; GALLERY.layout = r.layout; showLook(); paintLook(box); showToast('Applied — every guest sees it now'); if (done) done(true); })
      .catch(err => { showToast(err.message); if (done) done(false); });
  }

  // ---- Look: cards → preview (like a phone's theme store) → Apply ----
  // Tapping a theme or a layout opens a preview of the app's pages in it, with this wedding's photos.
  // Only the person previewing sees it. Guests see it only after Apply.
  const coverPhoto = () => { try { const a = pgAllPhotos(); return a.length ? pgImg(a[0].p.id, 400) : ''; } catch (e) { return ''; } };
  const ORIGINAL_T = { id: '', name: 'Original', mood: 'The PicGrades look', fonts: { display: 'Cormorant Garamond', body: 'Inter' }, light: { bg: '#F6EFEA', surface: '#FFFFFF', ink: '#1E1A17', ink2: '#6B625A', line: '#E7DFD6', accent: '#B8431D', onAccent: '#FFFFFF' }, dark: { bg: '#141110' } };
  function themeCard(t, cur) {
    const L = t.light, img = coverPhoto();
    const b = h('button', 'pgcp-tcard' + (cur ? ' on' : '')); b.type = 'button'; b.dataset.theme = t.id;
    b.innerHTML = `<span class="pgcp-phone" style="background:${L.bg};color:${L.ink}">` +
      `<span class="pgcp-ph-hero" style="background:${L.line} ${img ? `url('${img}') center/cover` : ''}"><em style="font-family:'${t.fonts.display}',Georgia,serif">${esc(GALLERY.title || 'A & R')}</em></span>` +
      `<span class="pgcp-ph-row"><i style="background:${L.accent}"></i><i style="background:${L.surface};border-color:${L.line}"></i></span>` +
      `<span class="pgcp-ph-row"><i style="background:${L.surface};border-color:${L.line}"></i><i style="background:${L.surface};border-color:${L.line}"></i></span>` +
      `<span class="pgcp-ph-nav" style="background:${L.surface};border-color:${L.line}"><b style="background:${L.accent}"></b></span></span>` +
      `<b style="font-family:'${t.fonts.display}',Georgia,serif">${esc(t.name)}</b>` + (cur ? '<small>In use</small>' : '<small>Tap to preview</small>');
    b.setAttribute('aria-label', t.name + (cur ? ' (in use)' : ' — preview'));
    return b;
  }
  const SIZE = { S: [1, 1], W: [2, 1], M: [2, 2], L: [4, 2], XL: [4, 3], XXL: [4, 4] };
  function layoutCard(l, cur) {
    const b = h('button', 'pgcp-layout' + (cur ? ' on' : '')); b.type = 'button'; b.dataset.layout = l ? l.id : '';
    const mini = h('span', 'pgcp-mini');
    (l ? l.blocks : [{ size: 'XL', block: 'hero' }, { size: 'W' }, { size: 'W' }, { size: 'L' }, { size: 'W' }, { size: 'W' }]).slice(0, 9).forEach(x => {
      const sz = SIZE[x.size] || SIZE.W, i = h('i', x.block === 'hero' ? 'hero' : '');
      i.style.gridColumn = 'span ' + sz[0]; i.style.gridRow = 'span ' + Math.min(sz[1], x.block === 'hero' ? 3 : 2); mini.appendChild(i);
    });
    b.append(mini, h('b', '', esc(l ? l.name : 'Original Hub')), h('small', '', cur ? 'In use' : 'Tap to preview'));
    b.setAttribute('aria-label', (l ? l.name : 'Original Hub') + (cur ? ' (in use)' : ' — preview'));
    return b;
  }
  function paintLook(box) {
    if (!box || !box.isConnected) return;
    const th = box.querySelector('.pgcp-themes'), la = box.querySelector('.pgcp-layouts'); if (!th || !la) return;
    const themes = window.PGTheme ? PGTheme.list() : [], layouts = window.PGLayout ? PGLayout.list() : [];
    th.innerHTML = ''; th.appendChild(themeCard(ORIGINAL_T, !GALLERY.theme)); themes.forEach(t => th.appendChild(themeCard(t, GALLERY.theme === t.id)));
    la.innerHTML = ''; la.appendChild(layoutCard(null, !GALLERY.layout)); layouts.forEach(l => la.appendChild(layoutCard(l, GALLERY.layout === l.id)));
  }
  function lookPane() {
    const p = h('div', 'pgcp-pane', '<h4>Theme</h4><p class="pgcp-note">Colours, fonts and icons of the whole app. Tap one to see every page in it first — guests see it only when you press Apply.</p><div class="pgcp-row pgcp-themes"></div>' +
      '<h4>Hub layout</h4><p class="pgcp-note">How the Hub is arranged. Tap one to preview it.</p><div class="pgcp-row pgcp-layouts"></div>');
    p.addEventListener('click', e => {
      const t = e.target.closest('.pgcp-tcard'); if (t) { preview({ theme: t.dataset.theme }, p.parentNode); return; }
      const l = e.target.closest('.pgcp-layout'); if (l) preview({ layout: l.dataset.layout }, p.parentNode);
    });
    return p;
  }

  // ---- the preview window ----
  const PAGES = [['hub', 'Hub'], ['gallery', 'Gallery'], ['photo', 'Photo'], ['moments', 'Moments'], ['rooms', 'Notes']];
  function preview(want, box) {
    const themes = window.PGTheme ? PGTheme.list() : [], layouts = window.PGLayout ? PGLayout.list() : [];
    const lay = 'layout' in want ? layouts.find(x => x.id === want.layout) || null : layouts.find(x => x.id === GALLERY.layout) || null;
    // a layout comes with its own theme; "Keep my theme" tries it with the wedding's current theme instead
    const state = { layout: lay ? lay.id : '', theme: 'theme' in want ? want.theme : (GALLERY.theme || ''), page: 'hub', dark: document.documentElement.getAttribute('data-tkg-theme') === 'dark' };
    const withOwn = 'layout' in want && lay && lay.theme && themes.some(t => t.id === lay.theme);
    if (withOwn) state.theme = lay.theme;
    const nameOf = () => {
      const t = themes.find(x => x.id === state.theme), l = layouts.find(x => x.id === state.layout);
      return 'layout' in want ? (l ? l.name : 'Original Hub') + ' · ' + (t ? t.name : 'Original theme') : (t ? t.name : 'Original');
    };
    const wrap = h('div', 'pgcp-pv'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Preview');
    wrap.innerHTML = '<div class="pgcp-pv-top"><button type="button" class="pgcp-pv-back" aria-label="Back">‹ Back</button><div class="pgcp-pv-name"></div>' +
      '<button type="button" class="pgcp-pv-dark" aria-pressed="false">Dark</button></div>' +
      '<div class="pgcp-pv-stage"><div class="pgcp-pv-phone"><iframe title="Preview" loading="eager"></iframe><div class="pgcp-pv-wait">Opening preview…</div></div></div>' +
      '<div class="pgcp-pv-pages" role="tablist"></div>' +
      '<div class="pgcp-pv-foot"><label class="pgcp-pv-keep" hidden><input type="checkbox"> Keep my current theme</label>' +
      '<p class="pgcp-pv-note">Only you can see this preview.</p><button type="button" class="mk-btn-peach ios-wide pgcp-pv-apply">Apply to the wedding</button></div>';
    const fr = wrap.querySelector('iframe'), pages = wrap.querySelector('.pgcp-pv-pages'), wait = wrap.querySelector('.pgcp-pv-wait');
    const post = m => { try { fr.contentWindow.postMessage(Object.assign({ pg: 'preview' }, m), location.origin); } catch (e) {} };
    const load = () => {
      wait.hidden = false;
      fr.src = location.pathname + '?pgpreview=1&theme=' + encodeURIComponent(state.theme || 'original') + '&layout=' + encodeURIComponent(state.layout || 'original') + '#hub';
      wrap.querySelector('.pgcp-pv-name').textContent = nameOf();
    };
    const onMsg = e => { if (e.origin === location.origin && e.source === fr.contentWindow && (e.data || {}).pg === 'preview-ready') { wait.hidden = true; post({ view: state.page, dark: state.dark }); } };
    window.addEventListener('message', onMsg);
    PAGES.forEach(([v, label]) => { const b = h('button', v === state.page ? 'on' : '', label); b.type = 'button'; b.dataset.page = v; b.setAttribute('role', 'tab'); pages.appendChild(b); });
    pages.addEventListener('click', e => {
      const b = e.target.closest('[data-page]'); if (!b) return; state.page = b.dataset.page;
      pages.querySelectorAll('[data-page]').forEach(x => x.classList.toggle('on', x === b)); post({ view: state.page });
    });
    const dk = wrap.querySelector('.pgcp-pv-dark');
    const paintDark = () => { dk.setAttribute('aria-pressed', state.dark ? 'true' : 'false'); dk.textContent = state.dark ? 'Light' : 'Dark'; };
    dk.addEventListener('click', () => { state.dark = !state.dark; paintDark(); post({ dark: state.dark }); }); paintDark();
    const keep = wrap.querySelector('.pgcp-pv-keep');
    if (withOwn && (GALLERY.theme || '') !== lay.theme) {
      keep.hidden = false;
      keep.querySelector('input').addEventListener('change', ev => { state.theme = ev.target.checked ? (GALLERY.theme || '') : lay.theme; load(); });
    }
    const close = () => { window.removeEventListener('message', onMsg); wrap.remove(); };
    wrap.querySelector('.pgcp-pv-back').addEventListener('click', close);
    const same = state.theme === (GALLERY.theme || '') && state.layout === (GALLERY.layout || '');
    const ap = wrap.querySelector('.pgcp-pv-apply');
    if (same) { ap.textContent = 'This is in use now'; ap.disabled = true; }
    ap.addEventListener('click', () => {
      const part = 'layout' in want ? { layout: state.layout, theme: state.theme } : { theme: state.theme };
      ap.disabled = true; ap.textContent = 'Applying…';
      saveLook(part, box, ok => { if (ok) close(); else { ap.disabled = false; ap.textContent = 'Apply to the wedding'; } });
    });
    // the preview is a real phone-sized page (390 × 844), scaled down to fit this screen
    const stage = wrap.querySelector('.pgcp-pv-stage'), phone = wrap.querySelector('.pgcp-pv-phone');
    const fit = () => { if (!wrap.isConnected) return window.removeEventListener('resize', fit); const r = stage.getBoundingClientRect(), k = Math.min(r.width / 390, r.height / 844, 1);
      phone.style.width = Math.floor(390 * k) + 'px'; phone.style.height = Math.floor(844 * k) + 'px'; fr.style.transform = 'scale(' + k + ')'; };
    window.addEventListener('resize', fit);
    document.body.appendChild(wrap); fit(); load();
  }

  // ---- Functions ----
  function funcPane() {
    const p = h('div', 'pgcp-pane', '<p class="pgcp-note">Switch off anything you don’t want in this wedding app. Root Moment and the photos are always there.</p>');
    const list = h('div', 'pgf-list'), canLock = !!(STAFF && STAFF.canLock);
    if (canLock) p.firstChild.textContent += ' The small “Plan” switch is PicGrades’ own: off locks a function for the couple and the photographer.';
    (window.PGFeatures ? PGFeatures.list() : []).forEach(([k, name, line]) => {
      const st = (GALLERY.features || {})[k] || 'on', locked = st === 'locked';
      const row = h('div', 'pgf-row' + (locked ? ' locked' : ''), '<div><b>' + name + '</b><small>' + (locked ? 'Not included in this wedding’s plan' : line) + '</small></div>');
      const sw = h('input', 'pgf-sw'); sw.type = 'checkbox'; sw.checked = st === 'on'; sw.disabled = locked; sw.dataset.k = k; sw.setAttribute('aria-label', name);
      sw.addEventListener('change', () => {
        const before = GALLERY.features[k]; GALLERY.features[k] = sw.checked ? 'on' : 'off'; PGFeatures.paint(); if (window.pgRenderHub) pgRenderHub();
        call('coupleFeatures', 'setFeatures', { features: JSON.stringify({ [k]: sw.checked ? 'on' : 'off' }) })
          .then(r => { GALLERY.features = r.features; PGFeatures.paint(); showToast(name + (sw.checked ? ' is on' : ' is off')); })
          .catch(err => { GALLERY.features[k] = before; sw.checked = before === 'on'; PGFeatures.paint(); if (window.pgRenderHub) pgRenderHub(); showToast(err.message); });
      });
      const end = h('div', 'pgf-end'); end.appendChild(sw);
      if (canLock) {
        const plan = h('label', 'pgcp-plan', '<span>Plan</span>'), pw = h('input', 'pgf-sw pgf-sw-sm'); pw.type = 'checkbox'; pw.checked = !locked; pw.dataset.plan = k; pw.setAttribute('aria-label', name + ' in the plan');
        pw.addEventListener('change', () => {
          pgApi('setAllowed', { token: token(), allowed: JSON.stringify({ [k]: pw.checked ? 'on' : 'off' }) })
            .then(r => { GALLERY.features = r.features; STAFF.allowed = r.allowed; PGFeatures.paint(); if (window.pgRenderHub) pgRenderHub(); repaint(); showToast(name + (pw.checked ? ' is in the plan' : ' is locked')); })
            .catch(err => { pw.checked = !pw.checked; showToast(err.message); });
        });
        plan.appendChild(pw); end.prepend(plan);
      }
      row.appendChild(end); list.appendChild(row);
    });
    p.appendChild(list);
    return p;
  }

  // ---- the panel ----
  let tab = 'look', repaint = () => {};
  function open() {
    const back = h('div', 'overlay-backdrop show'), box = h('div', 'reg-overlay show pgcp-sheet');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Control Panel');
    const close = () => { box.remove(); back.remove(); repaint = () => {}; };
    back.addEventListener('click', close);
    const who = WHO[ROLE] || WHO.couple;
    const head = h('div', 'pgcp-head', '<div class="reg-overlay-handle"></div><div class="pgcp-top"><h3 class="fm-title">Control Panel</h3><span class="pgcp-badge">' + who[0] + '</span></div>' +
      '<p class="pgcp-who">' + who[1] + ' Changes are saved for this wedding and reach every guest straight away.</p>' +
      '<div class="pgcp-tabs" role="tablist"><button type="button" role="tab" data-tab="look">Look</button><button type="button" role="tab" data-tab="functions">Functions</button></div>');
    const body = h('div', 'pgcp-body'), done = h('button', 'mk-btn-peach ios-wide', 'Done'); done.type = 'button'; done.addEventListener('click', close);
    repaint = () => {
      head.querySelectorAll('[data-tab]').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      body.innerHTML = ''; body.appendChild(tab === 'look' ? lookPane() : funcPane()); body.dataset.tab = tab;
      if (tab === 'look') { paintLook(body); Promise.all([window.PGTheme && PGTheme.ready, window.PGLayout && PGLayout.ready]).then(() => paintLook(body)); }
    };
    head.querySelector('.pgcp-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; repaint(); } });
    box.append(head, body, done); document.body.append(back, box);
    repaint();
  }
  window.PGControl = { role: () => ROLE, open, refresh: paintRole };
})();
