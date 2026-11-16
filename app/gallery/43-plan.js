// The free trial and the free basic gallery (step 65d) — only for the couple / photographer of a wedding made by signing up.
// The server sends GALLERY.plan only to them: { plan: 'trial' | 'basic', daysLeft, trialEnds, basicEnds, upgrade }.
// Trial: everything on, "Free trial · N days left". Basic (after 30 days): Find me, Reel Edits, Post Edits and guest moments are
// locked by the server; the rest stays free for a year. When the trial has ended a short notice shows ONCE on this phone; after
// that it lives in the ☰ menu and on the Control Panel's first screen. Guests never see any of this.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgPlan() {
  const P = () => (typeof GALLERY !== 'undefined' && GALLERY && GALLERY.plan && GALLERY.plan.plan) ? GALLERY.plan : null;
  const has = () => !!P() && PG_AS !== 'guest';
  const basic = () => has() && P().plan === 'basic';
  const until = () => (P() && P().basicEnds ? pgDate(P().basicEnds) : '');
  const upgrade = () => { const u = P() && P().upgrade; if (u) window.open(u, /^mailto:/.test(u) ? '_self' : '_blank', 'noopener'); };
  const menuText = () => basic() ? 'Upgrade your wedding app' : 'Free trial · ' + P().daysLeft + ' day' + (P().daysLeft === 1 ? '' : 's') + ' left';
  function note(text) {
    const d = document.createElement('div'); d.className = 'pgplan-note';
    d.innerHTML = '<p>' + pgEsc(text) + '</p><button type="button" class="pgplan-up">Upgrade</button>';
    d.querySelector('button').addEventListener('click', upgrade); return d;
  }
  // the Control Panel's first screen
  function line() {
    if (!has()) return null;
    const p = P(), d = document.createElement('div'); d.className = 'pgplan-line ' + p.plan;
    d.innerHTML = p.plan === 'trial'
      ? '<span><b>Free trial</b><small>' + p.daysLeft + ' day' + (p.daysLeft === 1 ? '' : 's') + ' left · everything is on</small></span><button type="button">Upgrade</button>'
      : '<span><b>Free basic gallery</b><small>Until ' + pgEsc(until()) + ' · Find me, Reel Edits, Post Edits and guest moments are off</small></span><button type="button">Upgrade</button>';
    d.querySelector('button').addEventListener('click', upgrade); return d;
  }
  // once on this phone, when the trial has ended
  function notice() {
    if (!basic() || pgStore('trialNote')) return;
    pgStore('trialNote', 1);
    const n = document.createElement('div'); n.className = 'pgplan-notice'; n.setAttribute('role', 'status');
    n.innerHTML = '<p><b>Your free trial has ended.</b> Your photos, layouts and highlights stay free until ' + pgEsc(until()) + '. Find me, Reel Edits, Post Edits and guest moments are now off.</p>' +
      '<div><button type="button" class="pgplan-up">Upgrade</button><button type="button" class="pgplan-ok">OK</button></div>';
    n.querySelector('.pgplan-up').addEventListener('click', () => { upgrade(); n.remove(); });
    n.querySelector('.pgplan-ok').addEventListener('click', () => n.remove());
    document.body.appendChild(n);
  }
  pgAfter('pgRenderHub', () => setTimeout(notice, 600));
  window.PGPlan = { has, basic, until, upgrade, menuText, note, line };
})();
