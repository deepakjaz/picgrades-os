// Story photos (step 56): the couple or the photographer chooses which photos the story Hubs show —
//   cover photos (up to 15), the bride's and the groom's portraits (the varmala moment), and 10–15 highlights for each event.
// Nothing is guessed: until something is chosen, the story leaves that part out (or uses the event's own photos for highlights).
// How they choose: open any photo → "Story" (only the couple and the photographer see it) → tick Cover / Bride / Groom / Highlight.
// Control Panel › Story shows everything chosen, to reorder or remove.
// Saved for the whole wedding (couple link or login); in a demo wedding it stays on this phone.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgStoryPicks() {
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const MAX = 15;
  const STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>';
  const role = () => (window.PGControl ? PGControl.role() : 'guest');
  const canPick = () => ['couple', 'photographer', 'picgrades', 'demo'].indexOf(role()) > -1;
  const picks = () => { const s = (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.story) || {}; return { cover: (s.cover || []).slice(), bride: s.bride || '', groom: s.groom || '', hl: Object.assign({}, s.hl || {}) }; };
  const eventOf = id => { const ev = ((typeof GALLERY !== 'undefined' && GALLERY && GALLERY.events) || []).find(e => e.photos.some(p => p.id === id)); return ev ? ev.name : ''; };
  const token = () => { try { return localStorage.getItem('pg_token') || ''; } catch (e) { return ''; } };

  // ---- saving ----
  function save(next) {
    const r = role();
    let p;
    if (r === 'demo') {
      const d = pgDemoLocal(); d.story = next; try { localStorage.setItem(pgDemoKey(), JSON.stringify(d)); } catch (e) {}
      p = Promise.resolve({ story: next });
    } else p = pgApi('storyPicks', Object.assign(r === 'couple' ? {} : { token: token() }, { picks: next }));
    return p.then(res => {
      GALLERY.story = res.story || next;
      if (window.PGLayout) PGLayout.refresh();   // a story Hub shows the new choice straight away
      return GALLERY.story;
    }).catch(err => { showToast(err.message || 'Could not save'); throw err; });
  }

  // ---- the "Story" sheet for one photo ----
  function sheet(photo) {
    if (!photo || !photo.id || !canPick()) return;
    const id = photo.id, ev = eventOf(id);
    const back = h('div', 'overlay-backdrop show'), box = h('div', 'reg-overlay show pgsp-sheet');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Use this photo in the story');
    const close = () => { box.remove(); back.remove(); };
    back.addEventListener('click', close);
    function paint() {
      const P = picks(), hl = (P.hl[ev] || []);
      const row = (k, title, sub, on, full) => '<button type="button" class="pgsp-row' + (on ? ' on' : '') + '" data-k="' + k + '"' + (full && !on ? ' data-full="1"' : '') + '><i>' + (on ? '✓' : '') + '</i><span><b>' + title + '</b><small>' + sub + '</small></span></button>';
      box.innerHTML = '<div class="reg-overlay-handle"></div><div class="pgsp-head"><img alt="" src="' + pgImg(id, 240) + '"><div><h3 class="fm-title">Use in the story</h3><p>Choose where this photo appears in the story Hub. Only you see this.</p></div></div>' +
        row('cover', 'Cover photo', P.cover.length + ' of ' + MAX + ' chosen · opens the story', P.cover.indexOf(id) > -1, P.cover.length >= MAX) +
        row('bride', 'Bride’s portrait', P.bride === id ? 'This photo' : P.bride ? 'Another photo is chosen · tap to use this one' : 'Not chosen yet · for the varmala moment', P.bride === id) +
        row('groom', 'Groom’s portrait', P.groom === id ? 'This photo' : P.groom ? 'Another photo is chosen · tap to use this one' : 'Not chosen yet · for the varmala moment', P.groom === id) +
        (ev ? row('hl', 'Highlight of ' + pgEsc(ev), hl.length + ' of ' + MAX + ' chosen · shown when guests enter ' + pgEsc(ev), hl.indexOf(id) > -1, hl.length >= MAX) : '') +
        '<button type="button" class="mk-btn-peach ios-wide pgsp-done">Done</button>';
      box.querySelector('.pgsp-done').addEventListener('click', close);
      box.querySelectorAll('.pgsp-row').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.full) { showToast('Up to ' + MAX + ' — remove one in Control Panel › Story first'); return; }
        const P2 = picks(), k = b.dataset.k, tog = (list) => { const i = list.indexOf(id); if (i > -1) list.splice(i, 1); else list.push(id); return list; };
        if (k === 'cover') tog(P2.cover);
        if (k === 'bride') { P2.bride = P2.bride === id ? '' : id; if (P2.bride && P2.groom === id) P2.groom = ''; }
        if (k === 'groom') { P2.groom = P2.groom === id ? '' : id; if (P2.groom && P2.bride === id) P2.bride = ''; }
        if (k === 'hl') { P2.hl[ev] = tog((P2.hl[ev] || []).slice()); if (!P2.hl[ev].length) delete P2.hl[ev]; }
        box.classList.add('busy');
        save(P2).then(() => { paint(); showToast('Saved — the story shows it now'); }).catch(() => {}).finally(() => box.classList.remove('busy'));
      }));
    }
    paint();
    document.body.append(back, box);
  }

  // ---- the button in the photo views (couple and photographer only) ----
  function curMain() { try { return (typeof MOMENTS !== 'undefined' && activeIdx > -1) ? MOMENTS[activeIdx] : null; } catch (e) { return null; } }
  function mainButton() {
    const wrap = document.querySelector('.mk-actions-wrap'); if (!wrap) return;
    let b = document.getElementById('mkStoryBtn');
    if (!b) {
      b = h('button', 'mk-social-pill pgsp-btn', STAR + '<span>Story</span>'); b.type = 'button'; b.id = 'mkStoryBtn'; b.setAttribute('aria-label', 'Use this photo in the story');
      b.addEventListener('click', () => sheet(curMain()));
      const share = document.getElementById('mkShareBtn'); if (share) share.after(b); else wrap.appendChild(b);
    }
    // the photo view's icon bar (the usual way photos open): the same button as an icon
    const bar = document.getElementById('pgvBar');
    if (bar && !document.getElementById('pgvStory')) {
      const ic = h('button', 'pgv-ic pgsp-btn', STAR); ic.type = 'button'; ic.id = 'pgvStory'; ic.setAttribute('aria-label', 'Use this photo in the story'); ic.title = 'Use in the story';
      ic.addEventListener('click', () => sheet(curMain()));
      const sh = document.getElementById('pgvShare'); if (sh) sh.after(ic); else bar.appendChild(ic);
    }
  }   // shown only to the couple / photographer / PicGrades / demo by CSS (body.pg-role-…), so it follows the role at once
  document.addEventListener('pg:classic-photo', e => {
    const d = e.detail || {}; if (!d.photo) return;
    const acts = document.querySelector('.pgcv .pgcv-acts'); if (!acts || acts.querySelector('.pgsp-btn')) return;
    const b = h('button', 'pgcv-btn pgsp-btn', STAR); b.type = 'button'; b.setAttribute('aria-label', 'Use this photo in the story');
    b.addEventListener('click', () => sheet(window.pgViewerClassic && pgViewerClassic.photo()));
    acts.insertBefore(b, acts.querySelector('.pgcv-dl'));
  });

  // ---- Control Panel › Story: everything chosen, to reorder or remove ----
  function pane() {
    const p = h('div', 'pgcp-pane pgsp-pane');
    function thumbs(list, key) {
      if (!list.length) return '<p class="pgsp-empty">Nothing chosen yet.</p>';
      return '<div class="pgsp-thumbs">' + list.map((id, i) => '<span class="pgsp-th" data-key="' + key + '" data-i="' + i + '"><img alt="" loading="lazy" src="' + pgImg(id, 200) + '">' +
        '<button type="button" data-do="left" aria-label="Move earlier"' + (i ? '' : ' disabled') + '>‹</button><button type="button" data-do="del" aria-label="Remove">×</button>' +
        '<button type="button" data-do="right" aria-label="Move later"' + (i < list.length - 1 ? '' : ' disabled') + '>›</button></span>').join('') + '</div>';
    }
    function slot(k, label) {
      const id = picks()[k];
      return '<div class="pgsp-slot" data-key="' + k + '">' + (id ? '<img alt="" src="' + pgImg(id, 300) + '"><button type="button" data-do="del" aria-label="Remove ' + label + '">×</button>' : '<span class="pgsp-ph"><i></i>Choose in a photo</span>') + '<b>' + label + '</b></div>';
    }
    function paint() {
      const P = picks(), evs = (GALLERY.events || []).filter(e => e.photos && e.photos.length);
      p.innerHTML = '<h4>Story photos</h4><p class="pgcp-note">The story Hub layouts show only what you choose here. To add a photo, open it and tap <b>★ Story</b>. Until you choose, that part of the story is left out.</p>' +
        '<h4>Couple portraits</h4><p class="pgcp-note">For the varmala moment, when the two come together.</p><div class="pgsp-slots">' + slot('bride', 'Bride') + slot('groom', 'Groom') + '</div>' +
        '<h4>Cover photos <small>' + P.cover.length + ' / ' + MAX + '</small></h4><p class="pgcp-note">The first thing guests see. “Next moment” moves through them.</p>' + thumbs(P.cover, 'cover') +
        evs.map(e => { const l = P.hl[e.name] || []; return '<h4>' + pgEsc(e.name) + ' highlights <small>' + l.length + ' / ' + MAX + '</small></h4>' + (l.length ? thumbs(l, 'hl:' + e.name) : '<p class="pgsp-empty">Not chosen · the story uses photos from across ' + pgEsc(e.name) + '.</p>'); }).join('');
    }
    p.addEventListener('click', e => {
      const b = e.target.closest('button[data-do]'); if (!b) return;
      const P = picks(), holder = b.closest('[data-key]'), key = holder.dataset.key, i = +holder.dataset.i;
      if (key === 'bride' || key === 'groom') P[key] = '';
      else {
        const list = key === 'cover' ? P.cover : (P.hl[key.slice(3)] || []).slice();
        if (b.dataset.do === 'del') list.splice(i, 1);
        else { const j = b.dataset.do === 'left' ? i - 1 : i + 1; [list[i], list[j]] = [list[j], list[i]]; }
        if (key !== 'cover') { if (list.length) P.hl[key.slice(3)] = list; else delete P.hl[key.slice(3)]; }
      }
      p.classList.add('busy'); save(P).then(paint).catch(() => {}).finally(() => p.classList.remove('busy'));
    });
    paint();
    return p;
  }

  mainButton(); pgAfter('pgRenderHub', mainButton);
  window.PGStoryPicks = { sheet, pane, picks, save, canPick };
})();
