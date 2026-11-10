// Big screens (step 46): on a laptop or TV the app gets a top menu in the header (Galleries · Moments · Hub · Notes · Control Panel);
// the round bottom bar comes back only once the page is scrolled past the header. Sheets open as centred windows (CSS),
// the Notes page becomes a wall of cards, and note photos are fetched big enough for it.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgBigScreens() {
  const BIG = window.matchMedia('(min-width: 1024px)');
  const header = document.querySelector('.mk-header'); if (!header) return;
  const ITEMS = [['gallery', 'Galleries'], ['moments', 'Moments'], ['hub', 'Hub'], ['rooms', 'Notes'], ['studio', 'Control Panel']];
  const nav = document.createElement('nav'); nav.className = 'pg-topnav'; nav.setAttribute('aria-label', 'Menu');
  ITEMS.forEach(([k, label]) => {
    const a = document.createElement('button'); a.type = 'button'; a.dataset.go = k; a.textContent = label;
    a.addEventListener('click', () => { const item = document.querySelector('.tkg-nav-item[data-nav="' + k + '"]'); if (item) item.click(); });
    nav.appendChild(a);
  });
  header.insertBefore(nav, header.querySelector('.mk-right-cluster'));
  // the Control Panel link shows for whoever has the gear (the couple, the photographer, PicGrades, a demo)
  function paint() {
    const gear = document.querySelector('.tkg-nav-item[data-nav="studio"]');
    const has = !!gear && getComputedStyle(gear).display !== 'none' && !document.body.classList.contains('pg-nav4');
    nav.querySelector('[data-go="studio"]').hidden = !has;
    const v = document.body.dataset.view || 'hub', on = v === 'event' ? 'gallery' : v === 'root' ? (window.pgViewerBackTo && pgViewerBackTo() === 'event' ? 'gallery' : 'moments') : v;
    nav.querySelectorAll('[data-go]').forEach(b => { b.classList.toggle('on', b.dataset.go === on); if (b.dataset.go === on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.body.classList.toggle('pg-big', BIG.matches);
  }
  pgAfter('switchView', paint); pgAfter('pgRenderHub', paint);
  if (window.PGControl) { const r = PGControl.refresh; PGControl.refresh = function () { const x = r.apply(this, arguments); paint(); return x; }; }
  new MutationObserver(paint).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  BIG.addEventListener ? BIG.addEventListener('change', paint) : BIG.addListener(paint);
  // the bottom bar waits until the header has scrolled away
  const onScroll = () => { const f = window.scrollY > 260; if (f !== document.body.classList.contains('pg-far')) document.body.classList.toggle('pg-far', f); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  paint();
})();
