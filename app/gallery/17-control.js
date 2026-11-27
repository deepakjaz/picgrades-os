// Control Panel (step 34): the gear in the bottom bar. Three people edit the same app they see:
//   PicGrades (staff login) · the photographer (their studio's login) · the couple (couple link).
// Guests never see the gear: their bar has 4 buttons and curls into a half circle when they scroll.
// Inside: Look (the wedding's theme + Hub layout) and Functions (on/off switches; PicGrades admins also hold the master "plan" switch).
// Everything is saved for the wedding and reaches every guest. Whoever changes something last wins.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgControl() {
  let ROLE = 'guest', STAFF = null, asked = false, checked = false;
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
  const token = () => pgToken();   // only on a staff link (step 61)
  const WHO = {
    picgrades: ['PicGrades', 'You’re signed in as PicGrades.'],
    photographer: ['Photographer', 'You’re signed in as the photographer.'],
    couple: ['Couple', 'This is your wedding app.'],
    demo: ['Demo', 'This is a demo wedding: try every setting.']
  };

  // ---- who is looking ----
  function paintRole() {
    const g = typeof GALLERY !== 'undefined' && GALLERY;
    // step 61: the link decides: a staff link shows the login's role, the couple link the couple, the guest link always a guest (or the demo)
    ROLE = !g || g.isStudio || PREVIEW ? 'guest' : PG_STAFF_LINK ? (STAFF ? STAFF.role : 'guest') : PG_AS === 'couple' ? ((window.pgIsCouple && pgIsCouple()) ? 'couple' : 'guest') : g.demo ? 'demo' : 'guest';
    document.body.classList.toggle('pg-nav4', ROLE === 'guest');
    ['guest', 'couple', 'photographer', 'picgrades', 'demo'].forEach(r => document.body.classList.toggle('pg-role-' + r, ROLE === r));
    const gear = document.querySelector('.tkg-nav-item[data-nav="studio"]');
    if (gear) { gear.setAttribute('aria-label', 'Control Panel'); gear.title = 'Control Panel'; }
    if (window.PGCreate) PGCreate.paint();   // step 58: the couple / staff get Reel and Post Edits as soon as the role is known
    document.dispatchEvent(new CustomEvent('pg:role'));   // step 60c: Find me shows the right words for this role
  }
  function askStaff() {
    if (asked || PREVIEW || !token() || typeof GALLERY === 'undefined' || !GALLERY || GALLERY.isStudio) return;
    asked = true;
    pgApi('myRole', { token: token() }).then(r => { STAFF = r; }).catch(() => {}).finally(() => { checked = true; paintRole(); });   // not this wedding's photographer = a guest here
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
    if ('version' in body) { const v = parse(body.version); if (v && v.id) { d.versions = Object.assign({}, d.versions || {}); if (v.custom) d.versions[v.id] = v.custom; else delete d.versions[v.id]; } }   // step 76
    try { localStorage.setItem(pgDemoKey(), JSON.stringify(d)); } catch (e) {}
    const g = pgDemoMerge(Object.assign({}, GALLERY));
    return Promise.resolve({ theme: g.theme || '', layout: g.layout || '', pages: g.pages || {}, features: g.features || {}, custom: g.custom || { blocks: [] }, versions: g.versions || {} });
  }
  function showLook() {
    if (window.PGTheme) PGTheme.apply(GALLERY.theme || '');
    if (window.PGLayout) PGLayout.apply(GALLERY.layout || '');
  }
  function saveLook(part, box, done) {
    call('coupleLook', 'setLook', part)
      .then(r => { GALLERY.theme = r.theme; GALLERY.layout = r.layout; GALLERY.pages = r.pages || {}; if (r.custom) GALLERY.custom = r.custom; if (r.versions) GALLERY.versions = r.versions; showLook(); if (window.PGGrids) PGGrids.refresh(); paintLook(box); showToast(ROLE === 'demo' ? 'Applied on this phone (demo)' : 'Applied — every guest sees it now'); if (done) done(true); })
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
    const tp = l && l.story && window.PGStoryStudio ? PGStoryStudio.info(l.story) : null;   // step 76: a Template Studio template shows its own colours
    const mini = h('span', 'pgcp-mini' + (l && l.story ? ' story' : '') + (tp ? ' tpl' : ''));
    if (tp) { const P = tp.pal, img = coverPhoto(); mini.style.background = 'linear-gradient(165deg,' + P.bg + ' 0 46%,' + (P.acc2 || P.acc) + ' 46% 47%,' + P.card + ' 47% 72%,' + P.acc + ' 72%)';
      mini.innerHTML = '<em style="color:' + (P.acc2 || P.ink) + ';font-family:\'' + tp.fd + '\',Georgia,serif">' + esc((GALLERY.title || 'A & R').split('&')[0].trim()) + '</em>' + (img ? '<u style="background-image:url(\'' + img + '\')"></u>' : ''); }
    else if (l && l.story) ['hero', '', 'hero', ''].forEach(c => mini.appendChild(h('i', c)));   // a story Hub is one long page (step 53)
    else (l ? l.blocks : [{ size: 'XL', block: 'hero' }, { size: 'W' }, { size: 'W' }, { size: 'L' }, { size: 'W' }, { size: 'W' }]).slice(0, 9).forEach(x => {
      const sz = SIZE[x.size] || SIZE.W, i = h('i', x.block === 'hero' ? 'hero' : '');
      i.style.gridColumn = 'span ' + sz[0]; i.style.gridRow = 'span ' + Math.min(sz[1], x.block === 'hero' ? 3 : 2); mini.appendChild(i);
    });
    const designs = !!(l && l.id !== 'custom' && window.PGTemplateEditor), mine = l && (GALLERY.versions || {})[l.id];
    b.append(mini, h('b', '', esc(l ? l.name : 'Original Hub')), h('small', '', cur ? 'In use' : designs ? (mine ? 'Your version · tap to design' : 'Tap to design') : 'Tap to preview'));
    b.setAttribute('aria-label', (l ? l.name : 'Original Hub') + (cur ? ' (in use)' : designs ? ' — design it' : ' — preview'));
    return b;
  }
  // clean-up #8: the Hub layout screen is a simple list — a name, one short line, and what it is to you
  function layoutRow(l, cur, mine) {
    const b = h('button', 'pgcp-layout pgcp-lrow' + (cur ? ' on' : '')); b.type = 'button'; b.dataset.layout = l ? l.id : '';
    const name = l ? l.name : 'Original Hub', line = l ? (l.venue || (l.story && window.PGStoryStudio && PGStoryStudio.info(l.story) || {}).venue || l.idea || '') : 'The app’s own simple Hub';
    const tag = cur ? '<em class="pgcp-ltag on">In use</em>' : mine ? '<em class="pgcp-ltag">Your version</em>' : '';
    b.innerHTML = '<span class="pgcp-ltxt"><b>' + esc(name) + '</b><small>' + esc(String(line).slice(0, 90)) + '</small></span>' + tag + '<svg class="pgcp-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    b.setAttribute('aria-label', name + (cur ? ' (in use)' : mine ? ' (your version)' : '') + ' — preview');
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
    const th = box.querySelector('.pgcp-themes'), la = box.querySelector('.pgcp-layouts');
    const themes = window.PGTheme ? PGTheme.list() : [], layouts = window.PGLayout ? PGLayout.list() : [];
    if (th) { th.innerHTML = ''; th.appendChild(themeCard(ORIGINAL_T, !GALLERY.theme)); themes.forEach(t => th.appendChild(themeCard(t, GALLERY.theme === t.id))); }
    if (la) {
      // step 76: the layouts in groups — Story, Minimal, and (PicGrades only) the ones being reworked. A layout the couple designed
      // and applied is "in use" under its own name; "Our own Hub" is only a Hub designed from scratch.
      la.innerHTML = '';
      const C = GALLERY.custom || {}, own = GALLERY.layout === 'custom' && !C.base, inUse = l => GALLERY.layout === l.id || (GALLERY.layout === 'custom' && !!C.base && C.base === l.id);
      const group = (title, note, cards) => { if (!cards.length) return; const g = h('div', 'pgcp-lgroup'); g.innerHTML = '<h5>' + esc(title) + '</h5><p class="pgcp-note">' + esc(note) + '</p>'; const row = h('div', 'pgcp-row'); cards.forEach(c => row.appendChild(c)); g.appendChild(row); la.appendChild(g); };
      // clean-up #8: Yours first (in use, your versions, your own Hub), then Stories and Free canvas. Minimal and the old card layouts are hidden (PicGrades staff still see them at the bottom).
      const V = GALLERY.versions || {}, shownIds = {}, yours = [];
      const canvas = l => !!l.canvas, story = l => !!l.story && !l.canvas, older = l => !story(l) && !canvas(l);   // a canvas layout also carries story 'canvas'
      if (C.story && own) yours.push(layoutRow({ id: 'custom', name: 'Our own Hub', idea: 'The Hub you designed' }, true));   // a story Hub changed in the editor (step 54)
      else if (C.blocks && C.blocks.length && (own || !C.base)) yours.push(layoutRow({ id: 'custom', name: 'Our own Hub', idea: 'The Hub you designed' }, own));
      if (!GALLERY.layout) yours.push(layoutRow(null, true));
      layouts.filter(l => inUse(l)).forEach(l => { shownIds[l.id] = 1; yours.push(layoutRow(l, true, !!V[l.id])); });
      layouts.filter(l => V[l.id] && !shownIds[l.id]).forEach(l => { shownIds[l.id] = 1; yours.push(layoutRow(l, false, true)); });
      group('Yours', 'In use now, and the layouts you have made your own.', yours);
      const rest = f => layouts.filter(l => !shownIds[l.id] && f(l)).map(l => layoutRow(l, false, false));
      group('Stories', 'One long page that tells the wedding as a story while guests scroll.', rest(story));
      const storyNames = {}; layouts.filter(story).forEach(l => { storyNames[l.name] = 1; });
      group('Free canvas', 'Every part placed by hand, separately for phone and laptop.', rest(canvas).map(r => { const n = r.querySelector('b'); if (n && storyNames[n.textContent]) n.textContent += ' · canvas'; return r; }));   // same name as a story: tell them apart
      if (ROLE === 'picgrades') group('Minimal and older · PicGrades only', 'Hidden from couples and photographers.', (GALLERY.layout ? [layoutRow(null, false)] : []).concat(rest(older)));
      collectionGroups(la, group);
    }
    box.querySelectorAll('.pgcp-pagestyles').forEach(ps => { const key = ps.dataset.pagekey; ps.innerHTML = ''; Object.keys(PAGE_DEFS[key].styles).forEach(k => ps.appendChild(styleCard(key, k, curStyle(key) === k))); });
  }
  // step 76: tapping a layout opens it straight in an editor (no preview page first): the Template editor for a story template,
  // the Hub editor for a card layout. Original Hub has nothing to design, so it keeps the preview.
  function closeSheet() { const s = document.querySelector('.pgcp-sheet'); if (s) { s.remove(); document.documentElement.classList.remove('pgcp-open'); document.querySelectorAll('.overlay-backdrop.show').forEach(x => x.remove()); } }
  // step 77: layouts from collections (the Canvas tab): yours first, then each collection, then the ones shared with this wedding
  let cvList = null;
  function collectionGroups(la, group) {
    if (ROLE === 'demo' || ROLE === 'guest') { if (GALLERY.canvas && GALLERY.canvas.id === 'cv-demo') group('Your layouts', 'Made on this phone (demo).', [cvCard({ id: 'cv-demo', name: GALLERY.canvas.name })]); return; }
    // shown at the top of the list (step 77c): the layouts you saved first, newest first, then your collections, then what others shared
    const paint = r => {
      if (!la.isConnected) return;
      la.querySelectorAll('.pgcp-lgroup.cv').forEach(x => x.remove());
      const anchor = la.firstChild, newest = (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
      const L = (r.layouts || []).slice().sort(newest), used = {}, made = [];
      const add = (t, n, cards) => { const before = la.children.length; group(t, n, cards); if (la.children.length > before) { const g = la.lastElementChild; g.classList.add('cv'); made.push(g); } };
      const mine = L.filter(l => !l.collection && l.mine);
      add('Your layouts', 'Made with the layout editor. Newest first.', mine.map(cvCard)); mine.forEach(l => { used[l.id] = 1; });
      (r.collections || []).slice().sort((a, b) => (b.mine - a.mine) || newest(a, b)).forEach(c => { const ls = L.filter(l => l.collection === c.id); ls.forEach(l => { used[l.id] = 1; }); add(c.name, c.note || (c.mine ? 'Your collection.' : 'A collection shared with you.'), ls.map(cvCard)); });
      add('Shared with you', 'Layouts others shared with this wedding.', L.filter(l => !used[l.id]).map(cvCard));
      made.forEach(g => la.insertBefore(g, anchor));
    };
    if (cvList) paint(cvList);
    pgApi('canvasList', {}).then(r => { cvList = r; paint(r); }).catch(() => {});
  }
  function cvCard(l) {   // clean-up #8b: a saved layout is a simple row too
    return layoutRow({ id: l.id, name: l.name, idea: 'Saved layout · tap to design' }, GALLERY.layout === l.id, false);
  }
  // clean-up #1: an editor opened from the Control Panel goes back there (Hub layout) when closed with ✕ / back — never straight to the Hub
  // clean-up #5: ✕ in the editor comes back to the layout's preview (if it was opened from one), else to the layouts list
  const fromPanel = (pvId) => { window.pgEditorBack = () => { open('layout'); if (pvId) setTimeout(() => { const pn = document.querySelector('.pgcp-sheet .pgcp-layouts'); if (pn) preview({ layout: pvId }, pn.closest('.pgcp-pane').parentNode); }, 60); }; };
  // which editor designs this layout (null = none)
  function designer(id) {
    if (!id) return null;
    if (id === 'custom') return GALLERY.layout === 'custom' && window.PGCanvasEditor ? () => PGCanvasEditor.open('current') : () => PGHubEditor.open();   // step 97: "Our own Hub" opens in the one editor too
    if (/^cv-/.test(id) && window.PGCanvasEditor) return () => PGCanvasEditor.open(id);   // step 77: a layout from a collection
    const l = window.PGLayout && PGLayout.find(id); if (!l) return null;
    if ((l.canvas || (!l.story && (l.blocks || []).length)) && window.PGCanvasEditor) return () => PGCanvasEditor.open(id);   // step 77d: card layouts open in the free editor too
    if (l.story && l.editor && window.PGCanvasEditor) return () => PGCanvasEditor.open(id);   // step 97: a story layout with an editor version opens in the one editor
    if (l.story && window.PGTemplateEditor && PGTemplateEditor.handles(l.story)) return () => PGTemplateEditor.open(id);   // story layouts without an editor version yet (staff-only ones)
    if (window.PGHubEditor) return () => PGHubEditor.open({ from: id });
    return null;
  }
  function designLayout(id, pvId) {
    const go = designer(id); if (!go) return false;
    fromPanel(pvId); closeSheet(); go(); return true;
  }
  function lookPane(part) {
    part = part || 'all';
    const p = h('div', 'pgcp-pane',
      (part === 'all' || part === 'theme' ? (part === 'all' ? '<h4>Theme</h4>' : '') + '<p class="pgcp-note">Colours, fonts and icons of the whole app. Tap one to see every page in it first — guests see it only when you press Apply.</p><div class="pgcp-row pgcp-themes"></div>' : '') +
      (part === 'all' || part === 'layout' ? (part === 'all' ? '<h4>Hub layout</h4>' : '') + '<p class="pgcp-note">How the Hub is arranged. Tap one to see it as guests do, then Use this or Edit. Each layout keeps your version, so you can come back to it.</p>' +
      '<div class="pgcp-designs" hidden>'   /* clean-up #8b: removed for everyone (Edit is in each layout's preview) */ + '' + '<button type="button" class="pgcp-design pgcp-canvas">✎ Design your own Hub — drag and drop</button><button type="button" class="pgcp-design pgcp-grided">Card editor (grid, header and logo)</button></div><div class="pgcp-layouts"></div>' : '') +
      (part === 'all' || part === 'pages' ? Object.keys(PAGE_DEFS).map(key => '<h4>' + PAGE_DEFS[key].title + '</h4><p class="pgcp-note">' + PAGE_DEFS[key].note + '</p><div class="pgcp-row pgcp-pagestyles" data-pagekey="' + key + '"></div>').join('') : ''));
    p.addEventListener('click', e => {
      const t = e.target.closest('.pgcp-tcard'); if (t) { preview({ theme: t.dataset.theme }, p.parentNode); return; }
      if (e.target.closest('.pgcp-canvas')) { fromPanel(); closeSheet(); PGCanvasEditor.open('current'); return; }   // step 77d: starts from the Hub the wedding has now
      if (e.target.closest('.pgcp-grided')) { fromPanel(); closeSheet(); PGHubEditor.open(); return; }   // the card editor stays (header and logo places live there for now)
      const st = e.target.closest('.pgcp-style'); if (st) { preview({ pages: { [st.dataset.pagekey]: st.dataset.style } }, p.parentNode); return; }
      const l = e.target.closest('.pgcp-layout'); if (l) { const id = l.dataset.layout; if (id === 'custom' || /^cv-/.test(id)) { if (!designLayout(id)) preview({ layout: id }, p.parentNode); } else preview({ layout: id }, p.parentNode); }   // clean-up #5: preview first, then Use this / Edit
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
      '<p class="pgcp-pv-note">Only you can see this preview.</p><div class="pgcp-pv-acts"><button type="button" class="pgcp-pv-edit" hidden>Edit</button><button type="button" class="mk-btn-peach ios-wide pgcp-pv-apply">' + (ROLE === 'demo' ? 'Apply on this phone' : 'Apply to the wedding') + '</button></div></div>';
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
    // clean-up #5: a layout preview offers Edit (opens its editor; ✕ there comes back to this preview) next to Use this
    const ed = wrap.querySelector('.pgcp-pv-edit');
    if ('layout' in want && !pk && state.layout && designer(state.layout)) { ed.hidden = false; ed.addEventListener('click', () => { const id = state.layout; close(); designLayout(id, id); }); }
    const same = pk ? state.styles[pk] === curStyle(pk) : state.theme === (GALLERY.theme || '') && state.layout === (GALLERY.layout || '');
    const ap = wrap.querySelector('.pgcp-pv-apply');
    if ('layout' in want && !pk) ap.textContent = ROLE === 'demo' ? 'Use this on this phone' : 'Use this';
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
    const note = h('p', 'pgcp-note', 'Switch off anything you don’t want in this wedding app. Root Moment and the photos are always there.');
    const p = h('div', 'pgcp-pane'); p.appendChild(note);
    // step 49: photo counts live only here — the app itself shows no numbers of photos
    const evs = GALLERY.events || [], total = evs.reduce((t, e) => t + e.photos.length, 0);
    const stats = h('div', 'pgcp-stats', '<div class="pgcp-stat"><b>' + evs.length + '</b><span>Collections</span></div><div class="pgcp-stat"><b>' + total.toLocaleString('en-IN') + '</b><span>Photos</span></div>' +
      '<details class="pgcp-statlist"><summary>Photos in each collection</summary>' + evs.map(e => '<p><span>' + esc(e.name) + '</span><b>' + e.photos.length.toLocaleString('en-IN') + '</b></p>').join('') + '</details>' +
      '<small>Only you see these numbers. Guests never see how many photos there are.</small>');
    p.insertBefore(stats, p.firstChild);
    const list = h('div', 'pgf-list'), canLock = !!(STAFF && STAFF.canLock);
    if (canLock) note.textContent += ' The small “Plan” switch is PicGrades’ own: off locks a function for the couple and the photographer.';
    if (window.PGPlan && PGPlan.basic()) p.insertBefore(PGPlan.note('Your free trial has ended. Find me, Reel Edits, Post Edits and guest moments are part of the paid plan — everything else stays free until ' + PGPlan.until() + '.'), note.nextSibling);
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

  // ---- Publish (step 62b): a new wedding is a Draft; guests can open the link only after the couple or the photographer publishes ----
  function publishStrip() {
    const wrap = h('div', 'pgpub');
    const paint = () => {
      const live = GALLERY.status !== 'Draft', ev = GALLERY.events || [];
      const photos = ev.reduce((t, e) => t + (e.photos || []).length, 0) + (GALLERY.root || []).length;
      const fm = (GALLERY.features || {}).findme !== 'off';
      const cover = ((GALLERY.story || {}).cover || []).length > 0;
      const items = [[photos > 0, photos ? photos + ' photos are in' : 'No photos yet'], [ev.length > 0, ev.length ? ev.length + (ev.length === 1 ? ' event found' : ' events found') : 'No event folders found'],
        [cover, cover ? 'Cover photos chosen' : 'Cover photos not chosen (optional · Story tab)', true]];
      if (fm) items.push([!!GALLERY.faceSearch, GALLERY.faceSearch ? 'Faces are read: Find me is ready' : 'Faces not read yet: Find me will not work', false,
        !GALLERY.faceSearch && pgSavedToken() ? '/app/faces.html?g=' + encodeURIComponent(GALLERY_ID) : '']);   // step 65c: read them now, on this phone
      const ready = photos > 0;
      wrap.className = 'pgpub ' + (live ? 'live' : 'draft');
      wrap.innerHTML = '<div class="pgpub-row"><span class="pgpub-dot"></span><div class="pgpub-txt"><b>' + (live ? 'Live' : 'Draft') + '</b><small>' +
        (live ? 'Guests can open the guest link.' : 'Guests can’t see this yet. Check everything, then publish.') + '</small></div>' +
        (ROLE === 'demo' ? '' : '<button type="button" class="pgpub-btn ' + (live ? 'off' : 'on') + '"' + (!live && !ready ? ' disabled' : '') + '>' + (live ? 'Unpublish' : 'Publish') + '</button>') + '</div>' +
        (live ? '' : '<ul class="pgpub-list">' + items.map(([ok, t, opt, href]) => '<li class="' + (ok ? 'ok' : opt ? 'opt' : 'no') + '">' + esc(t) +
          (href ? ' <a class="pgpub-go" href="' + esc(href) + '" target="_blank" rel="noopener">Read faces now</a>' : '') + '</li>').join('') + '</ul>');
      const b = wrap.querySelector('.pgpub-btn'); if (!b) return;
      b.addEventListener('click', () => {
        if (live && !confirmBox()) return;
        b.disabled = true; b.textContent = live ? 'Unpublishing…' : 'Publishing…';
        pgApi('publishGallery', Object.assign(ROLE === 'couple' ? {} : { token: token() }, { publish: !live })).then(r => {
          GALLERY.status = r.status; paint(); if (window.PGLinks && PGLinks.paint) PGLinks.paint(); document.dispatchEvent(new CustomEvent('pg:status'));
          showToast(r.status === 'Draft' ? 'Back to Draft — guests can’t open it now' : 'Published — guests can open the guest link now');
        }).catch(err => { showToast(err.message); paint(); });
      });
    };
    // unpublishing stops guests who already have the link: ask once, inside the panel (no browser pop-up)
    function confirmBox() { if (wrap.dataset.sure === '1') { wrap.dataset.sure = ''; return true; } wrap.dataset.sure = '1'; showToast('Guests will be stopped. Tap Unpublish again to confirm'); setTimeout(() => { wrap.dataset.sure = ''; }, 5000); return false; }
    paint(); return wrap;
  }

  // ---- the panel (step 64): a full-screen app page, like a phone's Settings ----
  // Home: who you are, Draft / Live, then a list of sections. Tap a section → it opens full screen with ‹ back.
  // On a computer it is the same phone-sized panel in the middle of the screen.
  const ICON = {
    theme: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.6 1.7-1.6H16a5 5 0 0 0 5-5C21 6.1 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="8" r="1.2"/>',
    layout: '<rect x="3.5" y="3.5" width="7" height="9" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.5"/>',
    pages: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    story: '<path d="M12 3.8l2.4 5 5.4.6-4 3.7 1.1 5.3L12 15.7l-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z"/>',
    guests: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    functions: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    requests: '<path d="M4 6.5h16v11H4z"/><path d="M4 7l8 6 8-6"/>',
    access: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    found: '<circle cx="12" cy="9" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/><path d="M16.5 4.5l1.3 1.3 2.6-2.6"/>',
    photographer: '<path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z"/><circle cx="12" cy="13.3" r="3.3"/>'
  };
  const icon = (k, c) => '<i class="pgcp-ic" style="background:' + c + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + '</svg></i>';
  function sections() {
    const themes = window.PGTheme ? PGTheme.list() : [], layouts = window.PGLayout ? PGLayout.list() : [];
    const th = themes.find(t => t.id === GALLERY.theme), la = layouts.find(l => l.id === GALLERY.layout);
    const feats = window.PGFeatures ? PGFeatures.list() : [], onN = feats.filter(([k]) => ((GALLERY.features || {})[k] || 'on') === 'on').length;
    const st = GALLERY.story || {};
    const groups = [
      ['Look', [['theme', 'Theme', th ? th.name : 'Original', '#c2410c'], ['layout', 'Hub layout', GALLERY.layout === 'custom' ? 'Our own Hub' : la ? la.name : 'Original', '#7c3aed'], ['pages', 'Page styles', 'Events, photos, notes', '#0e7490']]],
      ['Photos', [['story', 'Story & highlights', (st.wh || []).length ? (st.wh || []).length + ' Wedding Highlights' : 'Choose what guests see first', '#d97706']].concat(
        (ROLE !== 'guest' && ROLE !== 'demo' && (GALLERY.timeGroups || []).length ? [['timeGroups', 'Events from photo time', (GALLERY.timeGroups || []).length + ' groups to name', '#b45309']] : []),
        window.PGGate && ROLE !== 'demo' && !GALLERY.isStudio ? [['guests', 'Guest photos', GALLERY.guestPhotos === 'findme' ? 'Only after Find me' : 'Open to everyone', '#15803d']] : [])],
      ['App', [['functions', 'Functions', feats.length ? onN + ' of ' + feats.length + ' on' : '', '#2563eb']]]
    ];
    // step 65a: Guests — who Find me found (the couple, and PicGrades for support; not the photographer) and the requests
    const guestRows = (window.PGFound && (ROLE === 'couple' || ROLE === 'picgrades') ? [['found', 'Found with Find me', PGFound.summary(), '#0891b2']] : [])
      .concat(window.PGRules ? [['requests', 'Requests', 'Downloads and Find me', '#db2777']] : [])
      .concat(window.PGAccess && ROLE !== 'guest' && ROLE !== 'demo' && !GALLERY.isStudio ? [['access', 'Who can see', 'Invite links for family and friends', '#0f766e']] : []);   // step 89
    if (guestRows.length) groups.splice(2, 0, ['Guests', guestRows]);
    if (STAFF) groups.push(['Studio', [['photographer', 'Photographer', GALLERY.photographer && GALLERY.photographer.name ? GALLERY.photographer.name : 'Name, Instagram, website', '#57534e']]]);
    return groups;
  }
  const TITLE = { theme: 'Theme', layout: 'Hub layout', pages: 'Page styles', look: 'Look', story: 'Story & highlights', guests: 'Guest photos', functions: 'Functions', requests: 'Requests', photographer: 'Photographer', found: 'Found with Find me', timeGroups: 'Events from photo time' };
  function guestsPane() {
    const p = h('div', 'pgcp-pane');
    p.appendChild(PGGate.choice());
    if (window.PGPlan && PGPlan.basic() && GALLERY.guestPhotos === 'findme') p.appendChild(PGPlan.note('Find me is off since the free trial ended, so guests see only the Wedding Highlights. Choose “Open to everyone” to show them every photo, or upgrade to keep Find me.'));
    return p;
  }
  // Step 80: name the loose-photo groups made from camera capture times.
  function timeGroupsPane() {
    const groups = GALLERY.timeGroups || [], p = h('div', 'pgcp-pane pg-t1-pane');
    if (!groups.length) { p.appendChild(h('p', 'pgcp-note', 'There are no photo-time groups to name.')); return p; }
    const total = groups.reduce((n, g) => n + Number(g.count || (g.photos || []).length || 0), 0);
    p.innerHTML = '<p class="pgcp-note pg-t1-intro">Grouped by photo time (3+ hour gap or new day). Name each group to create events.</p>' +
      '<div class="pg-t1-summary"><b>' + groups.length + ' groups</b><span>' + total.toLocaleString('en-IN') + ' photos</span><span>Only you see these counts</span></div>' +
      '<div class="pg-t1-grid"></div><div class="pg-t1-footer"><button type="button" class="pg-t1-save">Save names</button><span class="pg-t1-status" role="status" aria-live="polite"></span></div>';
    const grid = p.querySelector('.pg-t1-grid');
    const parseTime = value => {
      const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(String(value || ''));
      return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
    };
    const dateText = d => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeText = d => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).replace(':00', '');
    groups.forEach(group => {
      const card = h('article', 'pg-t1-card'); card.dataset.key = group.key;
      const photos = (group.photos || []).slice(0, 4), thumbs = h('div', 'pg-t1-thumbs');
      photos.forEach((photo, i) => {
        const tile = h('div', 'pg-t1-thumb');
        const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.src = pgImg(photo.id, 200);
        tile.appendChild(img);
        if (i === 3 && group.count > 4) tile.appendChild(h('span', 'pg-t1-more', '+' + (group.count - 4) + ' more'));
        thumbs.appendChild(tile);
      });
      for (let i = photos.length; i < 4; i++) thumbs.appendChild(h('div', 'pg-t1-thumb empty'));
      const start = parseTime(group.start), end = parseTime(group.end);
      const range = start && end ? (dateText(start) + ', ' + timeText(start) + ' – ' + (start.toDateString() === end.toDateString() ? timeText(end) : dateText(end) + ', ' + timeText(end))) : '';
      const meta = h('div', 'pg-t1-meta', '<strong>' + esc(range) + '</strong><span>' + Number(group.count || photos.length).toLocaleString('en-IN') + ' photos</span>');
      const field = h('div', 'pg-t1-field');
      const input = document.createElement('input'); input.type = 'text'; input.maxLength = 40; input.value = group.name || group.defaultName || ''; input.placeholder = 'Name this event'; input.setAttribute('aria-label', 'Name this event for ' + (range || group.key)); input.dataset.timeName = group.key;
      const clear = h('button', 'pg-t1-clear', '×'); clear.type = 'button'; clear.setAttribute('aria-label', 'Clear event name'); clear.hidden = !input.value;
      input.addEventListener('input', () => { clear.hidden = !input.value; });
      clear.addEventListener('click', () => { input.value = ''; clear.hidden = true; input.focus(); });
      field.append(input, clear);
      const chips = h('div', 'pg-t1-chips');
      ['Haldi', 'Mehndi', 'Sangeet', 'Wedding', 'Reception', 'Mayra', 'Cocktail', 'Other'].forEach(name => {
        const b = h('button', 'pg-t1-chip', name); b.type = 'button'; b.dataset.name = name;
        b.addEventListener('click', () => { if (name === 'Other') { input.focus(); return; } input.value = name; clear.hidden = false; input.focus(); });
        chips.appendChild(b);
      });
      card.append(meta, thumbs, field, chips); grid.appendChild(card);
    });
    p.querySelector('.pg-t1-save').addEventListener('click', () => {
      const button = p.querySelector('.pg-t1-save'), status = p.querySelector('.pg-t1-status'), names = {};
      p.querySelectorAll('[data-time-name]').forEach(input => { names[input.dataset.timeName] = input.value; });
      button.disabled = true; button.textContent = 'Saving…'; status.textContent = '';
      pgApi('nameTimeGroups', { names: JSON.stringify(names) }).then(r => {
        GALLERY.timeGroups = r.timeGroups || []; GALLERY.events = r.events || GALLERY.events || [];
        if (window.renderGalleries) renderGalleries(); if (window.PGEvents) PGEvents.paint();
        button.textContent = 'Saved'; status.textContent = 'Your event names are saved.';
        showToast('Event names saved');
      }).catch(err => { button.textContent = 'Save names'; status.textContent = err.message; })
        .finally(() => { button.disabled = false; });
    });
    return p;
  }

  let tab = 'home', repaint = () => {}, goTo = () => {};
  function open(start) {
    if (document.querySelector('.pgcp-sheet')) { if (start) goTo(start); return; }   // step 59: a double tap on the gear opened two panels
    const back = h('div', 'overlay-backdrop show pgcp-dim'), box = h('div', 'pgcp-sheet pgcp-app');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'pgcpTitle');
    const who = WHO[ROLE] || WHO.couple;
    box.innerHTML = '<header class="pgcp-bar"><button type="button" class="pgcp-nav-back" aria-label="Back to the Control Panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>Back</span></button>' +
      '<h3 class="pgcp-bar-title" id="pgcpTitle">Control Panel</h3><button type="button" class="pgcp-x" aria-label="Close the Control Panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>' +
      '<div class="pgcp-scroll"><div class="pgcp-body"></div></div>';
    const body = box.querySelector('.pgcp-body'), scroll = box.querySelector('.pgcp-scroll'), title = box.querySelector('.pgcp-bar-title');
    const close = () => { box.classList.add('out'); back.classList.remove('show'); document.documentElement.classList.remove('pgcp-open'); setTimeout(() => { box.remove(); back.remove(); }, 220); repaint = () => {}; goTo = () => {}; };
    back.addEventListener('click', close); box.querySelector('.pgcp-x').addEventListener('click', close);
    box.querySelector('.pgcp-nav-back').addEventListener('click', () => goTo('home', true));
    box.addEventListener('keydown', e => { if (e.key === 'Escape') { if (tab !== 'home') goTo('home', true); else close(); } });
    function home() {
      const wrap = h('div', 'pgcp-home');
      wrap.appendChild(h('div', 'pgcp-hero', '<div><h2>' + esc(GALLERY.title || 'Your wedding') + '</h2><p class="pgcp-who">' + who[1] +
        (ROLE === 'demo' ? ' Your changes stay on this phone only, so everyone can play — <button type="button" class="pgcp-reset">start again</button>.' : ' Changes reach every guest straight away.') + '</p></div><span class="pgcp-badge">' + who[0] + '</span>'));
      if (ROLE !== 'demo' && !GALLERY.isStudio) wrap.appendChild(publishStrip());
      if (window.PGPlan && PGPlan.line()) wrap.appendChild(PGPlan.line());   // step 65d: free trial / free basic gallery
      const list = h('nav', 'pgcp-tabs pgcp-list'); list.setAttribute('aria-label', 'Sections');
      sections().forEach(([g, rows]) => {
        list.appendChild(h('p', 'pgcp-group', esc(g)));
        const card = h('div', 'pgcp-card');
        rows.forEach(([k, name, val, c]) => card.insertAdjacentHTML('beforeend', '<button type="button" class="pgcp-item" data-tab="' + k + '">' + icon(k, c) +
          '<span class="pgcp-item-t"><b>' + esc(name) + '</b>' + (val ? '<small>' + esc(val) + '</small>' : '') + '</span><svg class="pgcp-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>'));
        list.appendChild(card);
      });
      wrap.appendChild(list);
      list.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; if (b.dataset.tab === 'access' && window.PGAccess) return PGAccess.open(); goTo(b.dataset.tab); });   // step 89: Who can see opens full screen
      const rs = wrap.querySelector('.pgcp-reset');
      if (rs) rs.addEventListener('click', () => { try { localStorage.removeItem(pgDemoKey()); } catch (e) {} showToast('Back to the demo as it was'); setTimeout(() => location.reload(), 500); });
      return wrap;
    }
    function pane(k) {
      if (k === 'theme' || k === 'layout' || k === 'pages' || k === 'look') return lookPane(k === 'look' ? 'all' : k);
      if (k === 'timeGroups') return timeGroupsPane();
      if (k === 'photographer') return photogPane();
      if (k === 'story' && window.PGStoryPicks) return PGStoryPicks.pane();
      if (k === 'requests' && window.PGRules) return PGRules.pane();
      if (k === 'guests' && window.PGGate) return guestsPane();
      if (k === 'found' && window.PGFound) return PGFound.pane();
      return funcPane();
    }
    repaint = () => {
      if (tab === 'photographer' && !STAFF) tab = 'home';
      const isHome = tab === 'home';
      box.classList.toggle('at-home', isHome);
      title.textContent = isHome ? 'Control Panel' : TITLE[tab] || 'Control Panel';
      body.innerHTML = ''; body.appendChild(isHome ? home() : pane(tab)); body.dataset.tab = tab;
      if (['theme', 'layout', 'pages', 'look'].indexOf(tab) > -1) { paintLook(body); Promise.all([window.PGTheme && PGTheme.ready, window.PGLayout && PGLayout.ready]).then(() => paintLook(body)); }
    };
    goTo = (k, backwards) => {
      const was = tab; tab = k || 'home'; box.classList.toggle('pgcp-t1-open', tab === 'timeGroups'); repaint(); scroll.scrollTop = 0;
      body.classList.remove('slide-in', 'slide-back'); void body.offsetWidth; if (was !== tab) body.classList.add(backwards ? 'slide-back' : 'slide-in');
      const f = tab === 'home' ? box.querySelector('[data-tab="' + was + '"]') : box.querySelector('.pgcp-nav-back'); if (f) f.focus({ preventScroll: true });
    };
    document.body.append(back, box); document.documentElement.classList.add('pgcp-open');
    requestAnimationFrame(() => box.classList.add('in'));
    tab = start || 'home'; box.classList.toggle('pgcp-t1-open', tab === 'timeGroups'); repaint();
    box.tabIndex = -1; box.focus({ preventScroll: true });   // the panel itself, so no ring appears on a button straight away
  }
  // the Hub editor (23-editor.js) publishes through the same saving as the panel (couple link, login, or this phone in a demo)
  // called by an editor after its ✕ / back closed it (not after Apply)
  window.pgBackToPanel = () => { const f = window.pgEditorBack; window.pgEditorBack = null; if (f) setTimeout(f, 0); };
  window.PGControl = { designLayout, role: () => ROLE, checked: () => checked, open, go: k => (document.querySelector('.pgcp-sheet') ? goTo(k) : open(k)), refresh: paintRole, save: body => call('coupleLook', 'setLook', body) };
})();
