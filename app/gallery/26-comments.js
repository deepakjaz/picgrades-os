// Notes on the photo view (step 47). Chosen for the wedding in the Control Panel (Look › Notes on photos):
//   below  — the photo's notes sit under it (classic view) or in a soft panel over the bottom of the photo (full-screen view)
//   typing — the notes appear on the photo one by one, as if the person were typing them right now
//   off    — only the note button with its number (as before)
// Works in both photo views. Only photos that have notes ask the server; answers are kept while the page is open.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgComments() {
  const STYLES = ['below', 'typing', 'off'];
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function style() {
    const q = new URLSearchParams(location.search).get('commentstyle');
    const w = (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.pages) || {};
    return STYLES.indexOf(q) > -1 ? q : STYLES.indexOf(w.comments) > -1 ? w.comments : 'below';
  }
  const cache = {};   // photoId → { n, list }
  function notesOf(id) {
    const n = (GALLERY.notes || {})[id] || 0;
    if (!n) return Promise.resolve([]);
    const c = cache[id]; if (c && c.n === n) return Promise.resolve(c.list);
    return pgApi('getNotes', { photoId: id }).then(r => { const list = (r.notes || []).slice().reverse(); cache[id] = { n, list }; return list; }).catch(() => []);
  }
  let box = null, at = null, timer = null, token = 0;   // the panel, where it is shown, the typing timer
  function clear() { clearTimeout(timer); timer = null; token++; if (box) { if (box.parentNode && box.parentNode.style) box.parentNode.style.removeProperty('--pgcm-h'); box.remove(); box = null; } at = null; }
  function show(m, where) {   // where: { host, kind: 'live' | 'classic' }
    clear(); const st = style(); if (st === 'off' || !m || !GALLERY || (window.pgFeatureOn && !pgFeatureOn('notes'))) return;
    const my = token; at = { id: m.id, where };
    notesOf(m.id).then(list => {
      if (my !== token || !list.length) return;
      box = h('div', 'pgcm pgcm-' + st + ' pgcm-' + where.kind); box.setAttribute('aria-live', 'polite');
      if (st === 'below') below(box, list, m); else typing(box, list, m, my);
      where.host.appendChild(box);
      if (where.kind === 'classic' && st === 'below') where.host.style.setProperty('--pgcm-h', (box.offsetHeight + 26) + 'px');   // the photo moves up to make room
      requestAnimationFrame(() => box && box.classList.add('in'));
    });
  }
  const noteHtml = n => '<b>' + pgEsc(n.name) + '</b><span>' + pgEsc(n.text) + '</span>';
  function below(el, list, m) {
    const shown = list.slice(0, 3);
    el.innerHTML = '<div class="pgcm-list">' + shown.map(n => '<p class="pgcm-n">' + noteHtml(n) + '</p>').join('') + '</div>' +
      '<button type="button" class="pgcm-all">' + (list.length > shown.length ? 'See all ' + list.length + ' notes' : 'Add a note') + '</button>';
    el.querySelector('.pgcm-all').addEventListener('click', e => { e.stopPropagation(); openNotes(m, m.title); });
  }
  // typing: "Mira is writing…", then her note appears letter by letter, stays a moment, then the next one
  function typing(el, list, m, my) {
    el.innerHTML = '<div class="pgcm-bubble"><b class="pgcm-who"></b><span class="pgcm-text"></span><i class="pgcm-caret"></i></div>';
    el.addEventListener('click', e => { e.stopPropagation(); openNotes(m, m.title); });
    const who = el.querySelector('.pgcm-who'), txt = el.querySelector('.pgcm-text'), bub = el.querySelector('.pgcm-bubble');
    let k = 0;
    const next = () => {
      if (my !== token) return;
      const n = list[k % list.length]; k++;
      bub.classList.remove('out'); bub.classList.add('writing'); who.textContent = n.name; txt.textContent = '';
      const chars = Array.from(n.text);
      if (calm) { txt.textContent = n.text; bub.classList.remove('writing'); timer = setTimeout(() => { bub.classList.add('out'); timer = setTimeout(next, 500); }, 3600); return; }
      let i = 0;
      const type = () => {
        if (my !== token) return;
        if (i >= chars.length) { bub.classList.remove('writing'); timer = setTimeout(() => { if (list.length === 1 && k > 1) return; bub.classList.add('out'); timer = setTimeout(next, 450); }, 2600 + Math.min(2000, chars.length * 25)); return; }
        txt.textContent += chars[i++];
        const c = chars[i - 1]; timer = setTimeout(type, /[.,!?]/.test(c) ? 220 : 38 + Math.random() * 50);
      };
      timer = setTimeout(type, 700);   // "is writing…" for a moment first
    };
    next();
  }
  // ---- which photo is on screen ----
  const root = document.getElementById('view-root');
  pgAfter('applyActiveMoment', () => {
    if (document.body.classList.contains('pgcv-on')) return;
    const m = typeof MOMENTS !== 'undefined' && MOMENTS[activeIdx];
    if (m && root.classList.contains('active')) show(m, { host: root, kind: 'live' });
  });
  pgAfter('switchView', v => { if (v !== 'root' && at && at.where.kind === 'live') clear(); });
  document.addEventListener('pg:classic-photo', e => { const d = e.detail || {}; if (d.photo) show(d.photo, { host: d.el, kind: 'classic' }); else clear(); });
  // a new note → the panel shows it straight away
  pgAfter('syncCounts', () => {
    if (!at) return; const n = (GALLERY.notes || {})[at.id] || 0, c = cache[at.id];
    if (c && c.n === n) return;
    if (at.where.kind === 'live') { const m = MOMENTS[activeIdx]; if (m && m.id === at.id) show(m, at.where); }
    else { const cur = window.pgViewerClassic && pgViewerClassic.photo && pgViewerClassic.photo(); if (cur && cur.id === at.id) show(cur, at.where); }
  });
  window.PGComments = { style, refresh: () => { if (!at) return; const w = at.where; if (w.kind === 'live') show(MOMENTS[activeIdx], w); else if (window.pgViewerClassic && pgViewerClassic.photo) show(pgViewerClassic.photo(), w); } };
})();
