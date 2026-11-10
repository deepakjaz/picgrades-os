// Back to top (step 38): after scrolling down a long page, a small round button above the bottom bar takes you back to the top.
// Works on every scrolling page (Hub, Events, an event's photos, Notes…) and in the Moments grid. Hidden in the photo views and the Moments feed.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgToTop() {
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pg-totop'; btn.setAttribute('aria-label', 'Back to the top'); btn.title = 'Back to the top';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(btn);
  const grid = () => document.body.classList.contains('pgm-grid') && document.body.classList.contains('pgm-on') ? document.querySelector('.pgx-mgrid') : null;
  function where() {
    const v = (document.querySelector('.pg-view.active') || {}).id || '';
    if (document.body.classList.contains('pgcv-on') || v === 'view-root') return null;   // photo views
    if (v === 'view-moments') return grid();                                              // only the Moments grid scrolls like a page
    return window;
  }
  function paint() {
    const w = where(), y = !w ? 0 : w === window ? window.scrollY : w.scrollTop;
    btn.classList.toggle('show', !!w && y > window.innerHeight * 1.2);
  }
  btn.addEventListener('click', () => { const w = where(); if (w) w.scrollTo({ top: 0, behavior: 'smooth' }); btn.classList.remove('show'); });
  window.addEventListener('scroll', paint, { passive: true });
  document.addEventListener('scroll', e => { if (e.target && e.target.classList && e.target.classList.contains('pgx-mgrid')) paint(); }, { passive: true, capture: true });
  pgAfter('switchView', () => setTimeout(paint, 50));
  new MutationObserver(paint).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.PGToTop = { paint };
})();
