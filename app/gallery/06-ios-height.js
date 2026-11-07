// iPhone home-screen app height fix.
// Part of the wedding gallery (app/gallery.html). Files load in number order; features hook into the core with pgAfter / pgBefore.
(function pgIosAppHeight() {
  const de = document.documentElement;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const app = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  function dark() { de.classList.toggle('pg-dark', document.body.classList.contains('pgv-on') || document.body.classList.contains('pgm-on')); }
  new MutationObserver(dark).observe(document.body, { attributes: true, attributeFilter: ['class'] }); dark();
  if (!(ios && app)) return;
  de.classList.add('ios-app');
  function size() {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const full = portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width);
    de.style.setProperty('--pg-full-h', Math.max(full, window.innerHeight) + 'px');
  }
  size(); window.addEventListener('resize', size); window.addEventListener('orientationchange', () => setTimeout(size, 300));
})();
