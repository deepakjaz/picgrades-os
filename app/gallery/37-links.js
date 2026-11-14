// Step 61: one link per person, and the page always says whose view it is.
//   /g/<id> guest · /c/<id>/<key> couple · /ph/<id> photographer · /pg/<id> PicGrades (both ask for the PicGrades login)
// · a badge at the top names the view (GUEST, COUPLE, PHOTOGRAPHER, PICGRADES, DEMO): shown once when the person arrives,
//   then it fades; after that the ☰ menu says "Viewing as …" with the switch links (step 61c)
// · staff or the couple opening the guest link see exactly what guests see, with a bar to switch to their own view
// · a staff link without a login asks for the email code here; a login without access to this wedding says so
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgLinks() {
  const $ = id => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const NAME = { guest: 'Guest', couple: 'Couple', photographer: 'Photographer', picgrades: 'PicGrades', demo: 'Demo' };
  let shown = '', mine = null, now = { role: 'guest', note: '' };
  const SEEN = () => 'pg_seen_' + PG_AS + '_' + GALLERY_ID;
  let fadeT = 0, shownNow = '';
  function once(role) {   // the badge and bar appear on arrival (once per visit and view), then fade
    let seen = ''; try { seen = sessionStorage.getItem(SEEN()) || ''; } catch (e) {}
    if (seen && seen !== role) seen = '';   // the view changed (e.g. the staff role arrived): say it once more
    if (seen && seen === shownNow) return false;   // shown on this page a moment ago: let its 6 seconds run (a repaint hid it at once)
    if (seen) { document.body.classList.add('pg-badge-gone'); return false; }
    shownNow = role;
    try { sessionStorage.setItem(SEEN(), role); } catch (e) {}
    document.body.classList.remove('pg-badge-gone'); clearTimeout(fadeT); fadeT = setTimeout(() => document.body.classList.add('pg-badge-gone'), 6000);
    return true;
  }   // mine: the staff role this phone's login has here (for the switch bar on the guest link)

  function badge(role) {
    let b = $('pgRoleBadge'); if (!b) { b = h('div', 'pg-role-badge'); b.id = 'pgRoleBadge'; b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); }
    b.textContent = NAME[role] || 'Guest'; b.dataset.role = role;
  }
  function bar(html, act) {
    let b = $('pgLinkBar');
    now.note = html ? html.replace(/<[^>]+>/g, '') : '';
    if (!html) { if (b) b.remove(); document.body.classList.remove('pg-has-linkbar'); return; }
    if (!b) { b = h('div', 'pg-link-bar'); b.id = 'pgLinkBar'; document.body.appendChild(b); }
    b.innerHTML = html; document.body.classList.add('pg-has-linkbar');
    const a = b.querySelector('[data-act]'); if (a && act) a.addEventListener('click', e => { e.preventDefault(); act(); });
  }
  function paint() {
    if (typeof GALLERY === 'undefined' || !GALLERY || GALLERY.isStudio) return;
    const role = window.PGControl ? PGControl.role() : 'guest';
    now.role = role; badge(role); once(role);
    if (PG_AS === 'guest') {
      const ck = pgStore('couple'), tok = pgSavedToken();
      if (mine) bar('You are seeing what guests see · <a href="' + pgLinkFor(mine) + '">Switch to ' + NAME[mine] + ' view</a>');
      else if (ck) bar('You are seeing what guests see · <a href="' + pgLinkFor('couple') + '">Switch to Couple view</a>');
      else bar('');
      if (tok && mine === null) { mine = ''; pgApi('myRole', { token: tok }).then(r => { mine = r && r.role || ''; paint(); }).catch(() => {}); }
      return;
    }
    if (PG_AS === 'couple' && role !== 'couple') { if (GALLERY.coupleChecked && !pgStore('couple')) bar('This couple link is not valid. Ask your photographer for the right link · you are seeing the guest view.'); return; }
    if (PG_STAFF_LINK) {
      if (!pgSavedToken()) { bar('<b>' + NAME[PG_AS] + ' link:</b> please sign in to see this wedding as ' + NAME[PG_AS] + ' · <a href="#" data-act="1">Sign in</a>', signIn); if (shown !== 'login') { shown = 'login'; signIn(); } return; }
      if (window.PGControl && PGControl.checked && PGControl.checked() && role === 'guest') { bar('This login has no access to this wedding · you are seeing the guest view. <a href="#" data-act="1">Sign in with another email</a>', signIn); return; }
      bar('');
    }
    draftNote(role);
  }
  // step 62b: the couple and staff on a Draft: say once that guests can't see it yet (then it is in the ☰ menu)
  const PRIV = r => r === 'couple' || r === 'photographer' || r === 'picgrades';
  function draftNote(role) {
    if (!PRIV(role) || GALLERY.status !== 'Draft' || ($('pgLinkBar') && now.note)) return;
    bar('<b>Draft</b> · guests can’t see this yet · <a href="#" data-act="1">Publish</a>', () => window.PGControl && PGControl.open());
  }
  document.addEventListener('pg:status', () => { if (GALLERY.status !== 'Draft' && /^Draft/.test(now.note)) bar(''); });
  // the email code, as on the PicGrades page
  function signIn() {
    let s = $('pgSignIn');
    if (!s) {
      s = h('div', 'reg-overlay fm-sheet pg-signin'); s.id = 'pgSignIn'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-labelledby', 'pgSignInT');
      s.innerHTML = '<button type="button" class="pgv-sheet-close" data-x aria-label="Close">×</button><h3 class="fm-title" id="pgSignInT">Sign in</h3>' +
        '<p class="fm-sub">This is the ' + NAME[PG_AS] + ' link of this wedding. Sign in with your PicGrades email: we send a 6-digit code.</p>' +
        '<label class="ios-field"><span>Email</span><input id="pgSiEmail" type="email" autocomplete="email" placeholder="you@studio.com"></label>' +
        '<label class="ios-field hidden" id="pgSiCodeRow"><span>6-digit code</span><input id="pgSiCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456"></label>' +
        '<button type="button" class="mk-btn-peach ios-wide" id="pgSiGo">Send me a code</button><p class="fm-status" id="pgSiMsg" role="status"></p>';
      document.body.appendChild(s);
      const close = () => { s.classList.remove('show'); };
      s.querySelector('[data-x]').addEventListener('click', close);
      $('pgSiGo').addEventListener('click', () => {
        const email = $('pgSiEmail').value.trim(), code = $('pgSiCode').value.trim(), btn = $('pgSiGo'), step2 = !$('pgSiCodeRow').classList.contains('hidden');
        btn.disabled = true; $('pgSiMsg').textContent = step2 ? 'Checking…' : 'Sending…';
        (step2 ? pgApi('verifyCode', { email, code }) : pgApi('requestCode', { email })).then(r => {
          if (!step2) { $('pgSiCodeRow').classList.remove('hidden'); btn.textContent = 'Sign in'; $('pgSiMsg').textContent = r.message || 'Check your email for the code.'; $('pgSiCode').focus(); return; }
          try { localStorage.setItem('pg_token', r.token); } catch (e) {}
          $('pgSiMsg').textContent = 'Signed in ✓'; setTimeout(() => location.reload(), 300);
        }).catch(e => { $('pgSiMsg').textContent = e.message; }).finally(() => { btn.disabled = false; });
      });
    }
    s.classList.add('show');
  }
  pgAfter('pgRenderHub', () => setTimeout(paint, 0));
  document.addEventListener('pg:role', paint);
  // for the ☰ menu: who this view is, and where to switch
  function menu() {
    const out = { role: (NAME[now.role] || 'Guest') + (PRIV(now.role) && GALLERY.status === 'Draft' ? ' · Draft (guests can’t see it yet)' : ''), links: [] };
    if (PG_AS === 'guest') {
      if (mine) out.links.push([NAME[mine] + ' view', pgLinkFor(mine)]);
      else if (pgStore('couple')) out.links.push(['Couple view', pgLinkFor('couple')]);
    } else {
      out.links.push(['Guest view', pgLinkFor('guest')]);
      if (PG_STAFF_LINK && (!pgSavedToken() || now.role === 'guest')) out.links.push(['Sign in', '#signin']);
    }
    return out;
  }
  window.PGLinks = { paint, signIn, menu };
})();
