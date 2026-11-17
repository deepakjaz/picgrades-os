// Step 71: the couple's names always fit. Script fonts run wider than serif ones, so each name title shrinks
// (never below 55% of its size) until it sits in at most two lines without spilling sideways. Nothing is ever cut.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgFitNames() {
  const SEL = '.pgl-names,.pgh-title,.pgw-names,.psh-couple-names,.pse-hero-caption h1';
  function fitOne(el) {
    if (!el.isConnected || !el.offsetParent) return;
    el.style.fontSize = '';
    const cs = getComputedStyle(el), base = parseFloat(cs.fontSize); if (!base) return;
    const lines = () => { const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.15; return Math.round(el.scrollHeight / lh); };
    const wide = () => el.scrollWidth > el.clientWidth + 1;
    let size = base, n = 0;
    while ((wide() || lines() > 2) && size > base * 0.55 && n++ < 20) { size *= 0.93; el.style.fontSize = size.toFixed(1) + 'px'; }
  }
  let t = 0;
  function fitAll() { clearTimeout(t); t = setTimeout(() => document.querySelectorAll(SEL).forEach(fitOne), 60); }
  new MutationObserver(muts => { if (muts.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))))) fitAll(); })
    .observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', fitAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  if (document.fonts) document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', fitAll);
  window.pgFitNames = fitAll;
  fitAll();
})();
