// Step 61: one link per person, and the page always says whose view it is.
//   /g/<id> guest · /c/<id>/<key> couple · /ph/<id> photographer · /pg/<id> PicGrades (both ask for the PicGrades login)
// · a badge at the top names the view (GUEST, COUPLE, PHOTOGRAPHER, PICGRADES, DEMO)
// · staff or the couple opening the guest link see exactly what guests see, with a bar to switch to their own view
// · a staff link without a login asks for the email code here; a login without access to this wedding says so
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgLinks() {
  const $ = id => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const NAME = { guest: 'Guest', couple: 'Couple', photographer: 'Photographer', picgrades: 'PicGrades', demo: 'Demo' };
  let shown = '', mine = null;   // mine: the staff role this phone's login has here (for the switch bar on the guest link)

  function badge(role) {
    let b = $('pgRoleBadge'); if (!b) { b = h('div', 'pg-role-badge'); b.id = 'pgRoleBadge'; b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); }
    b.textContent = NAME[role] || 'Guest'; b.dataset.role = role;
  }
  function bar(html, act) {
    let b = $('pgLinkBar');
    if (!html) { if (b) b.remove(); document.body.classList.remove('pg-has-linkbar'); return; }
    if (!b) { b = h('div', 'pg-link-bar'); b.id = 'pgLinkBar'; document.body.appendChild(b); }
    b.innerHTML = html; document.body.classList.add('pg-has-linkbar');
    const a = b.querySelector('[data-act]'); if (a && act) a.addEventListener('click', e => { e.preventDefault(); act(); });
  }
  function paint() {
    if (typeof GALLERY === 'undefined' || !GALLERY || GALLERY.isStudio) return;
    const role = window.PGControl ? PGControl.role() : 'guest';
    badge(role);
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
  }
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
  window.PGLinks = { paint, signIn };
})();
