// Step 89: "Who can see" — the couple (or photographer) makes invite links like "Family" with a people limit and a
// download switch. Anyone who joins with a link sees every wedding photo without Find me, while the link is on.
// Opened from the Control Panel (Guests › Who can see). The server checks every permission; this screen only shows it.
// First draft by ChatGPT from Claude's brief, reviewed and fixed by Claude. Design: Gemini (v2 mockup).
(function () {
  'use strict';

  const SIZES = [10, 25, 50, 100];
  let root = null, links = [], editing = null, size = 10, dlOn = true, confirmId = '', showAll = false, removed = null, toastTimer = 0;

  const esc = t => pgEsc(t);
  const q = s => root && root.querySelector(s);
  // The address guests use (their own domain once it is live), plus the link's code
  const shareUrl = code => {
    const base = String((GALLERY && GALLERY.address) || '').replace(/[?#].*$/, '').replace(/\/$/, '') || (location.origin + '/g/' + encodeURIComponent(GALLERY_ID));
    return base + '?inv=' + encodeURIComponent(code);
  };

  function toast(msg, undo) {
    const el = q('.pgac-toast'); if (!el) return;
    el.innerHTML = esc(msg) + (undo ? ' · <u>Undo</u>' : '');
    el.classList.add('is-show'); el.dataset.undo = undo ? '1' : '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('is-show'); el.dataset.undo = ''; if (undo) removed = null; }, undo ? 5000 : 2500);
  }

  function card(l) {
    const off = l.status !== 'on', asking = confirmId === l.linkId;
    return '<article class="pgac-card' + (off ? ' is-off' : '') + '">' +
      '<button class="pgac-main" data-edit="' + esc(l.linkId) + '"><span class="pgac-copy"><b>' + esc(l.name) + '</b>' +
        '<span class="pgac-meta">' + l.used + ' of ' + l.size + '<i class="pgac-badge' + (l.download === 'on' ? ' is-on' : '') + '">Download ' + (l.download === 'on' ? 'on' : 'off') + '</i>' + (off ? '<i class="pgac-badge">Off</i>' : '') + '</span></span>' +
        '<span class="pgac-edit">Edit ›</span></button>' +
      (asking
        ? '<div class="pgac-confirm"><p>Turn off ' + esc(l.name) + '? ' + (l.used ? l.used + (l.used === 1 ? ' person' : ' people') + ' will lose access.' : 'No one has joined yet.') + '</p>' +
          '<div><button class="pgac-btn" data-cancel>Cancel</button><button class="pgac-btn pgac-danger" data-off="' + esc(l.linkId) + '">Turn off</button></div></div>'
        : '<div class="pgac-actions"><button class="pgac-btn" data-copy="' + esc(l.linkId) + '">Copy link</button>' +
          (off ? '<button class="pgac-btn" data-on="' + esc(l.linkId) + '">Turn on</button>' : '<button class="pgac-btn pgac-warn" data-ask="' + esc(l.linkId) + '">Turn off</button>') + '</div>') +
      '</article>';
  }
  function render() {
    if (!root) return;
    q('.pgac-list').innerHTML = links.length ? links.map(card).join('') : '<p class="pgac-empty">No links yet. Make one for each group, like Family or College friends.</p>';
  }

  function joined() {
    if (!editing) return '';
    const people = editing.people || [], shown = showAll ? people : people.slice(0, 5);
    return '<section class="pgac-joined"><div class="pgac-label">Who joined (' + people.length + ')</div>' +
      (shown.length ? '<div class="pgac-people">' + shown.map(p => '<div class="pgac-person"><span>' + esc(p.name) + '</span><button class="pgac-remove" data-remove="' + esc(p.guestId) + '">Remove</button></div>').join('') +
        (!showAll && people.length > 5 ? '<button class="pgac-seeall" data-seeall>See all ' + people.length + ' ›</button>' : '') + '</div>'
        : '<p class="pgac-empty">No one has joined yet.</p>') + '</section>';
  }
  function openSheet(l) {
    editing = l ? JSON.parse(JSON.stringify(l)) : null; size = l ? l.size : 10; dlOn = l ? l.download === 'on' : true; showAll = false;
    q('.pgac-wrap').innerHTML = '<div class="pgac-shade" data-shut></div>' +
      '<section class="pgac-sheet" role="dialog" aria-modal="true" aria-label="' + (l ? 'Edit link' : 'New link') + '">' +
        '<div class="pgac-body"><div class="pgac-head"><b>' + (l ? 'Edit link' : 'New link') + '</b><button class="pgac-icon" data-shut aria-label="Close">×</button></div>' +
        '<label class="pgac-label">Link name<input class="pgac-name" maxlength="40" value="' + esc(l ? l.name : '') + '" placeholder="Family"></label>' +
        '<div class="pgac-label">People limit</div><div class="pgac-sizes">' + SIZES.map(n => '<button class="pgac-size' + (n === size ? ' is-on' : '') + '" data-size="' + n + '">' + n + '</button>').join('') + '</div>' +
        '<button class="pgac-dl" data-dl aria-pressed="' + dlOn + '"><span>Allow photo downloads</span><i class="pgac-tog' + (dlOn ? ' is-on' : '') + '"><i></i></i></button>' +
        joined() + '</div>' +
        '<div class="pgac-foot"><p class="pgac-err" aria-live="polite"></p><button class="pgac-save">' + (l ? 'Save' : 'Create link') + '</button></div>' +
      '</section>';
    if (!l) setTimeout(() => { const n = q('.pgac-name'); if (n) n.focus(); }, 50);
  }
  const shut = () => { if (root) q('.pgac-wrap').innerHTML = ''; editing = null; };
  const repaintJoined = () => { const j = q('.pgac-joined'); if (j) j.outerHTML = joined(); };

  // The first time after a new Code.gs, the server is slow (it makes the InviteLinks tab), so try once more on its own,
  // then show Try again instead of a dead end.
  function load(again) {
    if (!root) return Promise.resolve();
    if (!links.length) q('.pgac-list').innerHTML = '<p class="pgac-empty">Loading links…</p>';
    return pgApi('inviteList').then(r => { links = r.links || []; render(); })
      .catch(e => {
        if (!root) return;
        if (!again) return load(true);
        q('.pgac-list').innerHTML = '<p class="pgac-empty">Could not load the links. ' + esc(e.message) + '</p><button class="pgac-btn" data-retry>Try again</button>';
      });
  }
  function save() {
    const name = q('.pgac-name').value.trim(), err = q('.pgac-err'), btn = q('.pgac-save');
    if (name.length < 2) { err.textContent = 'Give the link a name.'; return; }
    btn.disabled = true; btn.textContent = 'Saving…'; err.textContent = '';
    const wasEdit = !!editing;
    pgApi('inviteSave', Object.assign(wasEdit ? { linkId: editing.linkId } : {}, { name: name, size: size, download: dlOn ? 'on' : 'off' }))
      .then(() => { shut(); return load(); }).then(() => toast(wasEdit ? 'Saved' : 'Link made. Tap Copy link to share it.'))
      .catch(e => { err.textContent = e.message || 'Could not save. Please try again.'; btn.disabled = false; btn.textContent = wasEdit ? 'Save' : 'Create link'; });
  }
  function setState(id, status) {
    pgApi('inviteState', { linkId: id, status: status }).then(() => { confirmId = ''; return load(); })
      .then(() => toast(status === 'on' ? 'Link turned on' : 'Link turned off')).catch(e => toast(e.message));
  }
  function copy(l) {
    const url = shareUrl(l.code), done = () => toast('Link copied');
    if (navigator.share && /iPhone|iPad|Android/i.test(navigator.userAgent)) { navigator.share({ title: GALLERY.title, url: url }).catch(() => {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(done, () => toast(url)); return; }
    toast(url);
  }
  function remove(guestId) {
    const ed = editing, p = (ed.people || []).find(x => x.guestId === guestId);
    pgApi('inviteRemove', { linkId: ed.linkId, guestId: guestId }).then(() => {
      removed = { linkId: ed.linkId, guestId: guestId, person: p };
      ed.people = ed.people.filter(x => x.guestId !== guestId); ed.used = ed.people.length;
      repaintJoined(); toast('Removed ' + (p ? p.name : 'guest'), true); load();
    }).catch(e => toast(e.message));
  }
  function undo() {
    const r = removed; removed = null; if (!r) return;
    pgApi('inviteUndo', { linkId: r.linkId, guestId: r.guestId }).then(() => {
      if (editing && editing.linkId === r.linkId && r.person) { editing.people.unshift(r.person); editing.used = editing.people.length; repaintJoined(); }
      toast('Brought back ' + (r.person ? r.person.name : 'guest')); load();
    }).catch(e => toast(e.message));
  }

  function onClick(e) {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) { if (e.target.closest('[data-shut]')) shut(); return; }
    const d = t.dataset, find = id => links.find(x => x.linkId === id);
    if ('close' in d) return close();
    if ('retry' in d) return load();
    if ('add' in d) return openSheet(null);
    if (d.edit) return find(d.edit) && openSheet(find(d.edit));
    if (d.ask) { confirmId = d.ask; return render(); }
    if ('cancel' in d) { confirmId = ''; return render(); }
    if (d.off) return setState(d.off, 'off');
    if (d.on) return setState(d.on, 'on');
    if (d.copy) return find(d.copy) && copy(find(d.copy));
    if ('shut' in d) return shut();
    if (d.size) { size = Number(d.size); root.querySelectorAll('.pgac-size').forEach(b => b.classList.toggle('is-on', Number(b.dataset.size) === size)); return; }
    if ('dl' in d) { dlOn = !dlOn; t.setAttribute('aria-pressed', dlOn); t.querySelector('.pgac-tog').classList.toggle('is-on', dlOn); return; }
    if (t.classList.contains('pgac-save')) return save();
    if (d.remove) return remove(d.remove);
    if ('seeall' in d) { showAll = true; return repaintJoined(); }
    if (t.classList.contains('pgac-toast') && d.undo) return undo();
  }
  function onKey(e) { if (e.key === 'Escape') { if (editing !== null || (root && q('.pgac-sheet'))) shut(); else close(); } }

  function close() {
    if (!root) return;
    root.remove(); root = null; editing = null; confirmId = ''; removed = null;
    document.body.classList.remove('pgac-open'); document.removeEventListener('keydown', onKey);
  }
  function open() {
    close();
    root = document.createElement('div'); root.className = 'pgac';
    root.innerHTML = '<header class="pgac-top"><button class="pgac-icon" data-close aria-label="Back">‹</button><b>Who can see</b><button class="pgac-new" data-add>+ New link</button></header>' +
      '<main class="pgac-scroll"><p class="pgac-intro">Make a link for each group. Everyone who joins with it sees all the wedding photos, without Find me.</p><div class="pgac-list"></div></main>' +
      '<div class="pgac-wrap"></div><button class="pgac-toast" aria-live="polite"></button>';
    document.body.appendChild(root); document.body.classList.add('pgac-open');
    root.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
    return load();
  }

  // ---------- Guest side: opened the wedding with ?inv=CODE ----------
  // Ask for the name and number once (joining puts them on the link), or, if this phone already joined, add them to it.
  let asked = false;
  function guestInvite() {
    const code = new URLSearchParams(location.search).get('inv');
    if (asked || !code || !GALLERY || PG_AS !== 'guest' || GALLERY.isStudio || GALLERY.invite || pgIsStaff()) return;
    asked = true;
    if (!pgGuest()) { pgNeedGuest(() => {}, 'You are invited to see all the wedding photos. Tell us who you are.'); return; }
    pgApi('inviteJoin', Object.assign({ inv: code }, pgGuestBody())).then(r => {
      if (r.inviteFull) { showToast('This link is full. Ask the couple for a new link.'); return; }
      showToast('Opening all the photos…'); setTimeout(() => location.reload(), 700);
    }).catch(e => showToast(e.message));
  }
  if (window.pgAfter) pgAfter('pgRenderHub', () => setTimeout(guestInvite, 0));

  window.PGAccess = { open: open, close: close };
})();
