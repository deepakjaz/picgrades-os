// Phone back (Android back button or gesture, iPhone edge swipe): closes what is on top instead of leaving the app.
// Order: pop-up / sheet → editor step (Reel Edits, Post Edits) → photo viewer → page → Hub. Only on the Hub does back leave.
// Part of the wedding gallery (app/gallery.html). Files load in number order; this one loads last.
(function pgBackNav() {
  const stack = [];   // closers for layers open on top, newest last; a closer returns true when its layer stays open (it went back one step inside)
  const trail = [];   // pages visited before the current one (going to the Hub clears it)
  let cur = ((document.querySelector('.pg-view.active') || {}).id || 'view-hub').replace('view-', '');
  let guard = false, ignore = 0, fromBack = false;
  const atRoot = () => !stack.length && cur === 'hub';
  // one spare history entry while anything is open: the phone's back uses it up, we close one layer, then add it again
  function sync() {
    if (!atRoot() && !guard) { history.pushState({ pg: 1 }, ''); guard = true; }
    else if (atRoot() && guard) { ignore++; guard = false; history.back(); }   // back on the Hub by other means: drop the spare entry
  }
  const later = () => setTimeout(sync, 0);
  window.pgBackPush = function (closer) { stack.push(closer); later(); };
  window.pgBackDrop = function (closer) { const i = stack.lastIndexOf(closer); if (i > -1) stack.splice(i, 1); later(); };
  window.addEventListener('popstate', () => {
    if (ignore) { ignore--; return; }
    guard = false;
    const top = stack.pop();
    if (top) { let stay = false; try { stay = top() === true; } catch (e) {} if (stay) stack.push(top); }
    else if (cur !== 'hub') { fromBack = true; try { switchView(trail.pop() || 'hub'); } finally { fromBack = false; } }
    sync();
  });

  // pages: remember where you came from
  const coreSwitch = window.switchView;
  window.switchView = function (v) {
    if (v !== cur && !fromBack) {
      if (v === 'hub') trail.length = 0;
      else { const i = trail.indexOf(v); if (i > -1) trail.length = i; else trail.push(cur); if (trail.length > 8) trail.shift(); }
    }
    cur = v;
    const r = coreSwitch.apply(this, arguments); later(); return r;
  };

  // layers: sheets (.reg-overlay.show), the photo info panel, and the full-screen tools added to the page
  const open = new Map();
  const click = (el) => { if (el) el.click(); };
  function closerFor(el) {
    if (el === 'info') return () => click(document.getElementById('pgvInfoClose'));
    if (el.classList.contains('reg-overlay')) return () => {
      const b = el.querySelector('.pgv-sheet-close'); if (b) return b.click();
      const bd = el.previousElementSibling; if (bd && bd.classList.contains('overlay-backdrop')) bd.click(); else el.classList.remove('show');
    };
    if (el.classList.contains('rl-wrap')) return () => (window.PGReel && PGReel.back ? PGReel.back() : (window.PGReel && PGReel.close(), false));
    if (el.classList.contains('pe-wrap') || el.classList.contains('ps-wrap')) return () => (window.PGPost && PGPost.back ? PGPost.back() : (window.PGPost && PGPost.close(), false));
    if (el.classList.contains('pgcp-pv')) return () => click(el.querySelector('.pgcp-pv-back'));
    if (el.classList.contains('pgcv')) return () => click(el.querySelector('.pgcv-x'));
    if (el.classList.contains('pged')) return () => click(el.querySelector('.pged-x'));
    if (el.classList.contains('pgs-story')) return () => click(el.querySelector('.pgs-x'));
    if (el.classList.contains('pgg-play')) return () => click(el.querySelector('.pgg-hostx'));
    if (el.classList.contains('pgg')) return () => click(el.querySelector('.pgg-x'));
    if (el.classList.contains('pgmenu-wrap')) return () => click(el.querySelector('.pgmenu-x'));
    return () => el.remove();
  }
  const LAYERS = '.rl-wrap,.pe-wrap,.ps-wrap,.pgs-story,.pgg-play,.pgg,.pgcp-pv,.pgcv,.pged,.pgmenu-wrap';
  function scan() {
    const now = Array.from(document.querySelectorAll('.reg-overlay.show'));
    if (document.body.classList.contains('pgv-info')) now.push('info');
    Array.from(document.body.children).forEach(c => { if (c.matches && c.matches(LAYERS)) now.push(c); });
    now.forEach(el => { if (!open.has(el)) { const fn = closerFor(el); open.set(el, fn); pgBackPush(fn); } });
    Array.from(open.keys()).forEach(el => { if (now.indexOf(el) < 0) { pgBackDrop(open.get(el)); open.delete(el); } });
  }
  const mo = new MutationObserver(scan);
  mo.observe(document.body, { childList: true, attributes: true, attributeFilter: ['class'] });
  document.querySelectorAll('.reg-overlay').forEach(el => mo.observe(el, { attributes: true, attributeFilter: ['class'] }));
  scan(); later();
})();
