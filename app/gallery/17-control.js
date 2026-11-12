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
      if (m.view === 'photo') {   // the photo with the most notes, so "Notes on photos" has something to show
        let best = null; (GALLERY.events || []).forEach(ev => ev.photos.forEach((ph, i) => { const n = (GALLERY.notes || {})[ph.id] || 0; if (!best || n > best.n) best = { ev: ev.name, i, n }; }));
        if (best) openCollection(best.ev, best.i);
      }
      else if (m.view === 'event') { const ev = (GALLERY.events || [])[0]; if (ev && window.pgOpenEvent) pgOpenEvent(ev.name); }
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
    couple: ['Couple', 'This is your wedding app.'],
    demo: ['Demo', 'This is a demo wedding: try every setting.']
  };

  // ---- who is looking ----
  function paintRole() {
    const g = typeof GALLERY !== 'undefined' && GALLERY;
    ROLE = !g || g.isStudio || PREVIEW ? 'guest' : STAFF ? STAFF.role : (window.pgIsCouple && pgIsCouple()) ? 'couple' : g.demo ? 'demo' : 'guest';
    document.body.classList.toggle('pg-nav4', ROLE === 'guest');
    ['guest', 'couple', 'photographer', 'picgrades', 'demo'].forEach(r => document.body.classList.toggle('pg-role-' + r, ROLE === r));
    const gear = document.querySelector('.tkg-nav-item[data-nav="studio"]');
    if (gear) { gear.setAttribute('aria-label', 'Control Panel'); gear.title = 'Control Panel'; }
    if (window.PGCreate) PGCreate.paint();   // step 58: the couple / staff get Reel and Post Edits as soon as the role is known
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
  const call = (coupleAction, staffAction, body) => ROLE === 'demo' ? demoSave(body) : ROLE === 'couple' ? pgApi(coupleAction, body) : pgApi(staffAction, Object.assign({ token: token() }, body));
  // demo wedding: keep the change on this phone only (01-core reads it back on every visit)
  function demoSave(body) {
    const d = pgDemoLocal(), parse = v => (typeof v === 'string' ? JSON.parse(v || '{}') : v || {});
    if ('theme' in body) d.theme = body.theme; if ('layout' in body) d.layout = body.layout;
    if ('pages' in body) d.pages = Object.assign({}, d.pages || {}, parse(body.pages));
    if ('features' in body) d.features = Object.assign({}, d.features || {}, parse(body.features));
    if ('custom' in body) d.custom = parse(body.custom);
    try { localStorage.setItem(pgDemoKey(), JSON.stringify(d)); } catch (e) {}
    const g = pgDemoMerge(Object.assign({}, GALLERY));
    return Promise.resolve({ theme: g.theme || '', layout: g.layout || '', pages: g.pages || {}, features: g.features || {}, custom: g.custom || { blocks: [] } });
  }
  function showLook() {
    if (window.PGTheme) PGTheme.apply(GALLERY.theme || '');
    if (window.PGLayout) PGLayout.apply(GALLERY.layout || '');
  }
  function saveLook(part, box, done) {
    call('coupleLook', 'setLook', part)
      .then(r => { GALLERY.theme = r.theme; GALLERY.layout = r.layout; GALLERY.pages = r.pages || {}; if (r.custom) GALLERY.custom = r.custom; showLook(); if (window.PGGrids) PGGrids.refresh(); paintLook(box); showToast(ROLE === 'demo' ? 'Applied on this phone (demo)' : 'Applied — every guest sees it now'); if (done) done(true); })
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
    const mini = h('span', 'pgcp-mini' + (l && l.story ? ' story' : ''));
    if (l && l.story) ['hero', '', 'hero', ''].forEach(c => mini.appendChild(h('i', c)));   // a story Hub is one long page (step 53)
    else (l ? l.blocks : [{ size: 'XL', block: 'hero' }, { size: 'W' }, { size: 'W' }, { size: 'L' }, { size: 'W' }, { size: 'W' }]).slice(0, 9).forEach(x => {
      const sz = SIZE[x.size] || SIZE.W, i = h('i', x.block === 'hero' ? 'hero' : '');
      i.style.gridColumn = 'span ' + sz[0]; i.style.gridRow = 'span ' + Math.min(sz[1], x.block === 'hero' ? 3 : 2); mini.appendChild(i);
    });
    b.append(mini, h('b', '', esc(l ? l.name : 'Original Hub')), h('small', '', cur ? 'In use' : 'Tap to preview'));
    b.setAttribute('aria-label', (l ? l.name : 'Original Hub') + (cur ? ' (in use)' : ' — preview'));
    return b;
  }
  // Pages (steps 36–37): the style of the Events page (all events) and of the page inside each event
  const PAGE_DEFS = {
    events: { title: 'Events page', note: 'How the list of all events looks. Tap one to preview it.', page: 'gallery', param: 'eventsstyle', def: 'cards',
      styles: { cards: ['Cards', 'The original event cards'], shapes: ['Shapes', 'Each event inside a shape from its name — Cocktail in a wine glass, Haldi in a marigold…'], carousel: ['Carousel', 'Big cards to swipe, one event at a time'], mosaic: ['Mosaic', 'Big and small event cards mixed'] } },
    event: { title: 'Event page', note: 'How the photos look inside each event. Tap one to preview it.', page: 'event', param: 'eventstyle', def: 'collage',
      styles: { collage: ['Collage', 'Each photo keeps its own shape, like a classic gallery'], mosaic: ['Mosaic', 'Big and small tiles mixed'], grid: ['Grid', 'All photos the same size'] } },
    viewer: { title: 'Photo view', note: 'How a photo opens. Tap one to preview it.', page: 'photo', param: 'viewerstyle', def: 'live',
      styles: { live: ['Full screen', 'The current view: full screen with the filmstrip'], classic: ['Classic', 'The photo clean in the middle with arrows, like a traditional gallery'] } },
    comments: { title: 'Notes on photos', note: 'How guests’ notes show on a photo. Tap one to preview it.', page: 'photo', param: 'commentstyle', def: 'below',
      styles: { below: ['Below the photo', 'The latest notes sit under the photo'], typing: ['Typing', 'Notes appear on the photo one by one, as if someone is typing them'], off: ['Only the button', 'Just the note button with its number'] } }
  };
  const curStyle = key => ((GALLERY.pages || {})[key]) || PAGE_DEFS[key].def;
  function styleCard(key, k, cur) {
    const b = h('button', 'pgcp-layout pgcp-style' + (cur ? ' on' : '')); b.type = 'button'; b.dataset.pagekey = key; b.dataset.style = k;
    const mini = h('span', 'pgcp-mini pgcp-mini-' + key + '-' + k), name = PAGE_DEFS[key].styles[k];
    const grid = pat => pat.forEach(([c, r]) => { const i = h('i'); i.style.gridColumn = 'span ' + c; i.style.gridRow = 'span ' + r; mini.appendChild(i); });
    if (key === 'events' && k === 'shapes' && window.PGEvents) ['glass', 'marigold', 'mandap', 'heart'].forEach(sh => mini.insertAdjacentHTML('beforeend', PGEvents.svgOf(sh, ' class="pgcp-shp"')));
    else if (key === 'events' && k === 'carousel') grid([[3, 4], [1, 4]]);
    else if (key === 'events' && k === 'cards') grid([[2, 3], [2, 3], [2, 3], [2, 3]]);
    else if (key === 'comments') { mini.innerHTML = k === 'below' ? '<span class="pgcp-cbelow"><em></em><u></u><u></u></span>' : k === 'typing' ? '<span class="pgcp-ctype"><em></em><u>Lovely ♥<i></i></u></span>' : '<span class="pgcp-coff"><em></em><s></s></span>'; }
    else if (key === 'viewer') { mini.innerHTML = k === 'live' ? '<span class="pgcp-vlive"><em></em><u></u></span>' : '<span class="pgcp-vclassic"><s></s><em></em><s></s></span>'; }
    else if (k === 'mosaic') grid(key === 'events' ? [[4, 3], [2, 2], [2, 2], [4, 2]] : [[2, 2], [1, 1], [1, 1], [1, 2], [1, 1], [2, 1], [1, 1]]);
    else if (k === 'grid') grid(Array(8).fill([1, 1]));
    else [[3, 5, 2], [4, 2, 4], [2, 4, 3]].forEach(col => { const cEl = h('span', 'pgcp-ccol'); col.forEach(n => { const i = h('i'); i.style.height = (n * 9) + 'px'; cEl.appendChild(i); }); mini.appendChild(cEl); });
    b.append(mini, h('b', '', name[0]), h('small', '', cur ? 'In use' : 'Tap to preview'));
    b.setAttribute('aria-label', PAGE_DEFS[key].title + ': ' + name[0] + ' — ' + name[1]);
    return b;
  }
  function paintLook(box) {
    if (!box || !box.isConnected) return;
    const th = box.querySelector('.pgcp-themes'), la = box.querySelector('.pgcp-layouts'); if (!th || !la) return;
    const themes = window.PGTheme ? PGTheme.list() : [], layouts = window.PGLayout ? PGLayout.list() : [];
    th.innerHTML = ''; th.appendChild(themeCard(ORIGINAL_T, !GALLERY.theme)); themes.forEach(t => th.appendChild(themeCard(t, GALLERY.theme === t.id)));
    la.innerHTML = ''; la.appendChild(layoutCard(null, !GALLERY.layout));
    if (GALLERY.custom && GALLERY.custom.story) la.appendChild(layoutCard({ id: 'custom', name: 'Our own Hub', story: GALLERY.custom.story.kind, blocks: [] }, GALLERY.layout === 'custom'));   // a story Hub changed in the editor (step 54)
    else if (GALLERY.custom && GALLERY.custom.blocks && GALLERY.custom.blocks.length) la.appendChild(layoutCard({ id: 'custom', name: 'Our own Hub', blocks: GALLERY.custom.blocks.map(b => ({ block: b.block, size: 'W' })) }, GALLERY.layout === 'custom'));
    layouts.forEach(l => la.appendChild(layoutCard(l, GALLERY.layout === l.id)));
    box.querySelectorAll('.pgcp-pagestyles').forEach(ps => { const key = ps.dataset.pagekey; ps.innerHTML = ''; Object.keys(PAGE_DEFS[key].styles).forEach(k => ps.appendChild(styleCard(key, k, curStyle(key) === k))); });
  }
  function lookPane() {
    const p = h('div', 'pgcp-pane', '<h4>Theme</h4><p class="pgcp-note">Colours, fonts and icons of the whole app. Tap one to see every page in it first — guests see it only when you press Apply.</p><div class="pgcp-row pgcp-themes"></div>' +
      '<h4>Hub layout</h4><p class="pgcp-note">How the Hub is arranged. Tap one to preview it — or design your own: place the cards where you want them, any size.</p>' +
      '<button type="button" class="pgcp-design">✎ Design your own Hub</button><div class="pgcp-row pgcp-layouts"></div>' +
      Object.keys(PAGE_DEFS).map(key => '<h4>' + PAGE_DEFS[key].title + '</h4><p class="pgcp-note">' + PAGE_DEFS[key].note + '</p><div class="pgcp-row pgcp-pagestyles" data-pagekey="' + key + '"></div>').join(''));
    p.addEventListener('click', e => {
      const t = e.target.closest('.pgcp-tcard'); if (t) { preview({ theme: t.dataset.theme }, p.parentNode); return; }
      if (e.target.closest('.pgcp-design')) { const s = document.querySelector('.pgcp-sheet'); if (s) { s.remove(); document.querySelectorAll('.overlay-backdrop.show').forEach(x => x.remove()); } PGHubEditor.open(); return; }
      const st = e.target.closest('.pgcp-style'); if (st) { preview({ pages: { [st.dataset.pagekey]: st.dataset.style } }, p.parentNode); return; }
      const l = e.target.closest('.pgcp-layout'); if (l) preview({ layout: l.dataset.layout }, p.parentNode);
    });
    return p;
  }

  // ---- the preview window ----
  const PAGES = [['hub', 'Hub'], ['gallery', 'Events'], ['event', 'Event'], ['photo', 'Photo'], ['moments', 'Moments'], ['rooms', 'Notes']];
  function preview(want, box) {
    const themes = window.PGTheme ? PGTheme.list() : [], layouts = window.PGLayout ? PGLayout.list() : [];
    const lay = 'layout' in want ? layouts.find(x => x.id === want.layout) || null : layouts.find(x => x.id === GALLERY.layout) || null;
    // a layout comes with its own theme; "Keep my theme" tries it with the wedding's current theme instead
    const pk = want.pages ? Object.keys(want.pages)[0] : null;   // the page whose style is being tried
    const own = ('layout' in want ? want.layout : GALLERY.layout) === 'custom';   // the wedding's own Hub (Hub editor)
    const state = { layout: lay ? lay.id : own ? 'custom' : '', theme: 'theme' in want ? want.theme : (GALLERY.theme || ''), page: pk ? PAGE_DEFS[pk].page : 'hub', dark: document.documentElement.getAttribute('data-tkg-theme') === 'dark',
      styles: Object.keys(PAGE_DEFS).reduce((o, k) => { o[k] = pk === k ? want.pages[k] : curStyle(k); return o; }, {}) };
    const withOwn = 'layout' in want && lay && lay.theme && themes.some(t => t.id === lay.theme);
    if (withOwn) state.theme = lay.theme;
    const nameOf = () => {
      const t = themes.find(x => x.id === state.theme), l = layouts.find(x => x.id === state.layout) || (state.layout === 'custom' ? { name: 'Our own Hub' } : null);
      if (pk) return PAGE_DEFS[pk].title + ' · ' + PAGE_DEFS[pk].styles[state.styles[pk]][0];
      return 'layout' in want ? (l ? l.name : 'Original Hub') + ' · ' + (t ? t.name : 'Original theme') : (t ? t.name : 'Original');
    };
    const wrap = h('div', 'pgcp-pv'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Preview');
    wrap.innerHTML = '<div class="pgcp-pv-top"><button type="button" class="pgcp-pv-back" aria-label="Back">‹ Back</button><div class="pgcp-pv-name"></div>' +
      '<button type="button" class="pgcp-pv-size" aria-label="Preview on a phone or a laptop"></button><button type="button" class="pgcp-pv-dark" aria-pressed="false">Dark</button></div>' +
      '<div class="pgcp-pv-stage"><div class="pgcp-pv-phone"><iframe title="Preview" loading="eager"></iframe><div class="pgcp-pv-wait">Opening preview…</div></div></div>' +
      '<div class="pgcp-pv-pages" role="tablist"></div>' +
      '<div class="pgcp-pv-foot"><label class="pgcp-pv-keep" hidden><input type="checkbox"> Keep my current theme</label>' +
      '<p class="pgcp-pv-note">Only you can see this preview.</p><button type="button" class="mk-btn-peach ios-wide pgcp-pv-apply">' + (ROLE === 'demo' ? 'Apply on this phone' : 'Apply to the wedding') + '</button></div>';
    const fr = wrap.querySelector('iframe'), pages = wrap.querySelector('.pgcp-pv-pages'), wait = wrap.querySelector('.pgcp-pv-wait');
    const post = m => { try { fr.contentWindow.postMessage(Object.assign({ pg: 'preview' }, m), location.origin); } catch (e) {} };
    const load = () => {
      wait.hidden = false;
      fr.src = location.pathname + '?pgpreview=1&theme=' + encodeURIComponent(state.theme || 'original') + '&layout=' + encodeURIComponent(state.layout || 'original') + Object.keys(PAGE_DEFS).map(k => '&' + PAGE_DEFS[k].param + '=' + encodeURIComponent(state.styles[k])).join('') + '#hub';
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
    const same = pk ? state.styles[pk] === curStyle(pk) : state.theme === (GALLERY.theme || '') && state.layout === (GALLERY.layout || '');
    const ap = wrap.querySelector('.pgcp-pv-apply');
    if (same) { ap.textContent = 'This is in use now'; ap.disabled = true; }
    ap.addEventListener('click', () => {
      const part = pk ? { pages: JSON.stringify({ [pk]: state.styles[pk] }) } : 'layout' in want ? { layout: state.layout, theme: state.theme } : { theme: state.theme };
      ap.disabled = true; ap.textContent = 'Applying…';
      saveLook(part, box, ok => { if (ok) close(); else { ap.disabled = false; ap.textContent = ROLE === 'demo' ? 'Apply on this phone' : 'Apply to the wedding'; } });
    });
    // the preview is a real page at phone size (390 × 844) or laptop size (1440 × 900), scaled down to fit this screen
    const stage = wrap.querySelector('.pgcp-pv-stage'), phone = wrap.querySelector('.pgcp-pv-phone'), sizeBtn = wrap.querySelector('.pgcp-pv-size');
    const DEV = { phone: [390, 844], laptop: [1440, 900] };
    let dev = window.innerWidth >= 1000 ? 'laptop' : 'phone';
    const fit = () => { if (!wrap.isConnected) return window.removeEventListener('resize', fit); const [W, H] = DEV[dev], r = stage.getBoundingClientRect(), k = Math.min(r.width / W, r.height / H, 1);
      fr.style.width = W + 'px'; fr.style.height = H + 'px'; phone.classList.toggle('laptop', dev === 'laptop');
      phone.style.width = Math.floor(W * k) + 'px'; phone.style.height = Math.floor(H * k) + 'px'; fr.style.transform = 'scale(' + k + ')'; };
    const paintSize = () => { sizeBtn.textContent = dev === 'phone' ? 'Laptop' : 'Phone'; sizeBtn.title = 'See it on a ' + sizeBtn.textContent.toLowerCase(); };
    sizeBtn.addEventListener('click', () => { dev = dev === 'phone' ? 'laptop' : 'phone'; paintSize(); fit(); }); paintSize();
    window.addEventListener('resize', fit);
    document.body.appendChild(wrap); fit(); load();
  }

  // ---- Functions ----
  function funcPane() {
    const p = h('div', 'pgcp-pane', '<p class="pgcp-note">Switch off anything you don’t want in this wedding app. Root Moment and the photos are always there.</p>');
    // step 49: photo counts live only here — the app itself shows no numbers of photos
    const evs = GALLERY.events || [], total = evs.reduce((t, e) => t + e.photos.length, 0);
    const stats = h('div', 'pgcp-stats', '<div class="pgcp-stat"><b>' + evs.length + '</b><span>Collections</span></div><div class="pgcp-stat"><b>' + total.toLocaleString('en-IN') + '</b><span>Photos</span></div>' +
      '<details class="pgcp-statlist"><summary>Photos in each collection</summary>' + evs.map(e => '<p><span>' + esc(e.name) + '</span><b>' + e.photos.length.toLocaleString('en-IN') + '</b></p>').join('') + '</details>' +
      '<small>Only you see these numbers. Guests never see how many photos there are.</small>');
    p.insertBefore(stats, p.firstChild);
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
    if (window.PGProtect) p.appendChild(PGProtect.pane(call));   // photo protection + watermark (27-protect.js)
    return p;
  }

  // ---- Photographer (step 42): who photographed this wedding; PicGrades also decides whether its own name shows ----
  const PF = [['name', 'Name shown as “Photographed by”', 'e.g. WFA'], ['instagram', 'Instagram', '@handle or link'], ['website', 'Website', 'www…'],
    ['phone', 'Phone / WhatsApp', '+91 …'], ['email', 'Email', ''], ['city', 'City', ''], ['about', 'About', 'A line or two about the photographer']];
  function photogPane() {
    const cur = Object.assign({}, GALLERY.photographer || (STAFF && STAFF.photographer) || {});
    const p = h('div', 'pgcp-pane', '<p class="pgcp-note">Who photographed this wedding. It shows as “Photographed by” in the Hub, on the photographer page and on every photo. Leave the name empty to show the studio of the order' + (STAFF && STAFF.studio ? ' (' + esc(STAFF.studio) + ')' : '') + '.</p>');
    const form = h('form', 'pgcp-form');
    PF.forEach(([k, label, ph]) => { const l = h('label', '', esc(label)); const i = h(k === 'about' ? 'textarea' : 'input'); i.name = k; i.placeholder = ph; i.value = cur[k] || ''; if (k === 'email') i.type = 'email'; if (k === 'phone') i.inputMode = 'tel'; l.appendChild(i); form.appendChild(l); });
    if (ROLE === 'picgrades') {
      const row = h('div', 'pgf-row', '<div><b>Show “Gallery by PicGrades”</b><small>Turn off for clients who cannot show our name</small></div>');
      const sw = h('input', 'pgf-sw'); sw.type = 'checkbox'; sw.name = 'credit'; sw.checked = GALLERY.credit !== false; sw.setAttribute('aria-label', 'Show Gallery by PicGrades');
      row.appendChild(sw); form.appendChild(row);
    }
    const save = h('button', 'mk-btn-peach ios-wide', 'Save photographer'); save.type = 'submit'; form.appendChild(save);
    form.addEventListener('submit', e => {
      e.preventDefault(); const body = { photographer: JSON.stringify(PF.reduce((o, [k]) => { o[k] = form.elements[k].value; return o; }, {})) };
      if (form.elements.credit) body.credit = form.elements.credit.checked ? 'on' : 'off';
      save.disabled = true; save.textContent = 'Saving…';
      pgApi('setPhotographer', Object.assign({ token: token() }, body)).then(r => {
        GALLERY.photographer = r.photographer; GALLERY.credit = r.credit; GALLERY.studio = r.photographer.name || r.studio || GALLERY.studio;
        if (STAFF) { STAFF.photographer = r.photographer; STAFF.credit = r.credit; }
        document.body.classList.toggle('pg-nocredit', r.credit === false);
        if (window.pgRenderHub) pgRenderHub(); showToast('Saved — every guest sees it now');
      }).catch(err => showToast(err.message)).finally(() => { save.disabled = false; save.textContent = 'Save photographer'; });
    });
    p.appendChild(form); return p;
  }

  // ---- the panel ----
  let tab = 'look', repaint = () => {};
  function open() {
    if (document.querySelector('.pgcp-sheet')) return;   // step 59: a double tap on the gear opened two panels
    const back = h('div', 'overlay-backdrop show'), box = h('div', 'reg-overlay show pgcp-sheet');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Control Panel');
    const close = () => { box.remove(); back.remove(); repaint = () => {}; };
    back.addEventListener('click', close);
    const who = WHO[ROLE] || WHO.couple;
    const head = h('div', 'pgcp-head', '<div class="reg-overlay-handle"></div><div class="pgcp-top"><h3 class="fm-title">Control Panel</h3><span class="pgcp-badge">' + who[0] + '</span></div>' +
      '<p class="pgcp-who">' + who[1] + (ROLE === 'demo' ? ' Your changes stay on this phone only, so everyone can play — <button type="button" class="pgcp-reset">start again</button>.' : ' Changes are saved for this wedding and reach every guest straight away.') + '</p>' +
      '<div class="pgcp-tabs' + (STAFF ? ' five' : ' four') + '" role="tablist"><button type="button" role="tab" data-tab="look">Look</button><button type="button" role="tab" data-tab="story">Story</button><button type="button" role="tab" data-tab="functions">Functions</button>' + (window.PGRules ? '<button type="button" role="tab" data-tab="requests">Requests</button>' : '') + (STAFF ? '<button type="button" role="tab" data-tab="photographer">Photographer</button>' : '') + '</div>');
    const body = h('div', 'pgcp-body'), done = h('button', 'mk-btn-peach ios-wide', 'Done'); done.type = 'button'; done.addEventListener('click', close);
    repaint = () => {
      head.querySelectorAll('[data-tab]').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      if (tab === 'photographer' && !STAFF) tab = 'look';
      body.innerHTML = ''; body.appendChild(tab === 'look' ? lookPane() : tab === 'photographer' ? photogPane() : tab === 'story' && window.PGStoryPicks ? PGStoryPicks.pane() : tab === 'requests' && window.PGRules ? PGRules.pane() : funcPane()); body.dataset.tab = tab;
      if (tab === 'look') { paintLook(body); Promise.all([window.PGTheme && PGTheme.ready, window.PGLayout && PGLayout.ready]).then(() => paintLook(body)); }
    };
    const rs = head.querySelector('.pgcp-reset');
    if (rs) rs.addEventListener('click', () => { try { localStorage.removeItem(pgDemoKey()); } catch (e) {} showToast('Back to the demo as it was'); setTimeout(() => location.reload(), 500); });
    head.querySelector('.pgcp-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; repaint(); } });
    box.append(head, body, done); document.body.append(back, box);
    repaint();
  }
  // the Hub editor (23-editor.js) publishes through the same saving as the panel (couple link, login, or this phone in a demo)
  window.PGControl = { role: () => ROLE, open, refresh: paintRole, save: body => call('coupleLook', 'setLook', body) };
})();
