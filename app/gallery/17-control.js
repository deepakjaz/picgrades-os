// Control Panel (step 34): the gear in the bottom bar. Three people edit the same app they see:
//   PicGrades (staff login) · the photographer (their studio's login) · the couple (couple link).
// Guests never see the gear: their bar has 4 buttons and curls into a half circle when they scroll.
// Inside: Look (the wedding's theme + Hub layout) and Functions (on/off switches; PicGrades admins also hold the master "plan" switch).
// Everything is saved for the wedding and reaches every guest. Whoever changes something last wins.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgControl() {
  let ROLE = 'guest', STAFF = null, asked = false;
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
    ROLE = !g || g.isStudio ? 'guest' : STAFF ? STAFF.role : (window.pgIsCouple && pgIsCouple()) ? 'couple' : 'guest';
    document.body.classList.toggle('pg-nav4', ROLE === 'guest');
    ['guest', 'couple', 'photographer', 'picgrades'].forEach(r => document.body.classList.toggle('pg-role-' + r, ROLE === r));
    const gear = document.querySelector('.tkg-nav-item[data-nav="studio"]');
    if (gear) { gear.setAttribute('aria-label', 'Control Panel'); gear.title = 'Control Panel'; }
  }
  function askStaff() {
    if (asked || !token() || typeof GALLERY === 'undefined' || !GALLERY || GALLERY.isStudio) return;
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
  function saveLook(part, box) {
    const before = { theme: GALLERY.theme || '', layout: GALLERY.layout || '' };
    Object.assign(GALLERY, part); showLook(); paintLook(box);
    call('coupleLook', 'setLook', part)
      .then(r => { GALLERY.theme = r.theme; GALLERY.layout = r.layout; showLook(); paintLook(box); showToast('Saved for every guest'); })
      .catch(err => { Object.assign(GALLERY, before); showLook(); paintLook(box); showToast(err.message); });
  }

  // ---- Look ----
  function themeChip(t, cur) {
    const b = h('button', 'pgcp-theme' + (cur ? ' on' : '')); b.type = 'button'; b.dataset.theme = t ? t.id : '';
    const L = t ? t.light : { bg: '#F6EFEA', accent: '#B8431D', ink: '#1E1A17' }, D = t ? t.dark : { bg: '#141110' };
    b.innerHTML = `<span class="pgcp-sw"><i style="background:${L.bg}"></i><i style="background:${L.accent}"></i><i style="background:${D.bg}"></i></span>` +
      `<b style="font-family:'${t ? t.fonts.display : 'Cormorant Garamond'}',Georgia,serif">${esc(t ? t.name : 'Original')}</b>`;
    b.setAttribute('aria-pressed', cur ? 'true' : 'false');
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
    b.append(mini, h('b', '', esc(l ? l.name : 'Original Hub')));
    b.setAttribute('aria-pressed', cur ? 'true' : 'false');
    return b;
  }
  function paintLook(box) {
    if (!box || !box.isConnected) return;
    const th = box.querySelector('.pgcp-themes'), la = box.querySelector('.pgcp-layouts'); if (!th || !la) return;
    const themes = window.PGTheme ? PGTheme.list() : [], layouts = window.PGLayout ? PGLayout.list() : [];
    th.innerHTML = ''; th.appendChild(themeChip(null, !GALLERY.theme)); themes.forEach(t => th.appendChild(themeChip(t, GALLERY.theme === t.id)));
    la.innerHTML = ''; la.appendChild(layoutCard(null, !GALLERY.layout)); layouts.forEach(l => la.appendChild(layoutCard(l, GALLERY.layout === l.id)));
  }
  function lookPane() {
    const p = h('div', 'pgcp-pane', '<h4>Theme</h4><p class="pgcp-note">Colours and fonts of the whole app.</p><div class="pgcp-row pgcp-themes"></div>' +
      '<h4>Hub layout</h4><p class="pgcp-note">How the Hub is arranged. A layout brings its own theme; change the theme after if you like.</p><div class="pgcp-row pgcp-layouts"></div>');
    p.addEventListener('click', e => {
      const t = e.target.closest('.pgcp-theme'); if (t) { saveLook({ theme: t.dataset.theme }, p.parentNode); return; }
      const l = e.target.closest('.pgcp-layout'); if (!l) return;
      const lay = (window.PGLayout ? PGLayout.list() : []).find(x => x.id === l.dataset.layout);
      saveLook(lay && lay.theme ? { layout: lay.id, theme: lay.theme } : { layout: l.dataset.layout }, p.parentNode);
    });
    return p;
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
