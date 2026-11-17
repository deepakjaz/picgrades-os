// Step 69: scroll or swipe in the photo viewer
//   · up / down (default): photos move up and down, the filmstrip stands on the right
//   · left / right: photos swipe sideways like a traditional gallery, the filmstrip lies along the bottom, above the buttons
//   · the first time someone opens a photo we ask which they like; a button in the top bar changes it any time
//     (after the first choice the button is lit up so they know where it is). The choice is kept on this phone.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgViewerDirection() {
  const KEY = 'pg_viewer_dir', body = document.body, view = document.getElementById('view-root');
  const top = document.querySelector('#pgvTop .pgv-top-r');
  if (!view || !top) return;
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const keep = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = document.createElement('style');
  css.textContent = [
    // left / right: the feed scrolls sideways
    'body.pgv-swipe .pgv-feed{display:flex;overflow-x:scroll;overflow-y:hidden;scroll-snap-type:x mandatory}',
    'body.pgv-swipe .pgv-item{flex:0 0 100%;width:100%;touch-action:pan-x}',
    // the photo sits above the filmstrip and the buttons, so nothing covers it
    'body.pgv-swipe .pgv-item img{top:0;bottom:auto;height:calc(100% - var(--pgd-strip) - var(--pgd-bar) - env(safe-area-inset-bottom,0px));object-fit:contain;object-position:center}',
    'body.pgv-swipe{--pgd-strip:84px;--pgd-bar:78px;--thumb-inactive-w:40px;--thumb-inactive-h:52px;--thumb-near-w:46px;--thumb-near-h:60px;--thumb-active-w:58px;--thumb-active-h:74px}',
    // the filmstrip along the bottom, just above the buttons
    'body.pgv-swipe #view-root .mk-filmstrip-rail{top:auto;left:0;right:0;width:auto;height:var(--pgd-strip);bottom:calc(var(--pgd-bar) + env(safe-area-inset-bottom,0px));flex-direction:row;align-items:center;touch-action:pan-x}',
    'body.pgv-swipe .mk-filmstrip-scroller{flex-direction:row;align-items:center;overflow-x:auto;overflow-y:hidden;padding:0 calc(50% - var(--thumb-active-w) / 2)}',
    'body.pgv-swipe .pgv-top-r{padding-right:0}',
    'body.pgv-swipe .pgv-bar{padding-top:calc(var(--pgd-strip) + 30px);background:linear-gradient(to top,rgba(0,0,0,.72) 40%,transparent)}',
    // the switch in the top bar
    '.pgd-btn svg{width:22px;height:22px}',
    '.pgd-btn.pgd-glow{animation:pgdGlow 1.1s ease-in-out 3;border-color:#FAE900}',
    '@keyframes pgdGlow{0%,100%{box-shadow:0 0 0 0 rgba(250,233,0,.75)}50%{box-shadow:0 0 0 12px rgba(250,233,0,0)}}',
    '.pgd-fly{position:fixed;z-index:100001;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:22px;background:#FAE900;color:#111;display:grid;place-items:center;pointer-events:none;transition:left .7s cubic-bezier(.5,0,.2,1),top .7s cubic-bezier(.5,0,.2,1),transform .7s,opacity .3s .6s}',
    '.pgd-fly svg{width:22px;height:22px}',
    // the first-time question
    '.pgd-ask{position:fixed;inset:0;z-index:100000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .25s}',
    '.pgd-ask.show{opacity:1}',
    '.pgd-card{width:100%;max-width:460px;margin:0 12px calc(12px + env(safe-area-inset-bottom,0px));padding:22px 18px 18px;border-radius:26px;background:#151313;color:#f4eee6;box-shadow:0 30px 60px rgba(0,0,0,.5);transform:translateY(30px);transition:transform .35s cubic-bezier(.2,.9,.3,1)}',
    '.pgd-ask.show .pgd-card{transform:none}',
    '.pgd-card h2{margin:0 0 4px;font:500 24px/1.15 var(--font-serif);text-align:center}',
    '.pgd-card p{margin:0 0 16px;text-align:center;font:400 13.5px/1.45 var(--font-sans);letter-spacing:0;color:rgba(244,238,230,.7)}',
    '.pgd-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.pgd-opt{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 10px 14px;border-radius:20px;border:1.5px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:inherit;font:600 14px/1.25 var(--font-sans);cursor:pointer}',
    '.pgd-opt:hover,.pgd-opt:focus-visible{border-color:#FAE900;outline:none}',
    '.pgd-opt small{display:block;font-weight:500;font-size:12px;color:rgba(244,238,230,.6);margin-top:2px}',
    // a little phone showing the movement
    '.pgd-ph{position:relative;width:64px;height:104px;border-radius:14px;border:2px solid rgba(255,255,255,.4);overflow:hidden;background:#000}',
    '.pgd-ph i{position:absolute;inset:6px;border-radius:7px;background:linear-gradient(140deg,#FAE900,#E09A2B)}',
    '.pgd-ph i+i{background:linear-gradient(140deg,#7EC8E3,#3E6FB0)}',
    '.pgd-ph.v i+i{transform:translateY(105%)}.pgd-ph.h i+i{transform:translateX(105%)}',
    '@media (prefers-reduced-motion:no-preference){.pgd-ph.v i{animation:pgdV 2.4s ease-in-out infinite}.pgd-ph.h i{animation:pgdH 2.4s ease-in-out infinite}}',
    '@keyframes pgdV{0%,30%{translate:0 0}55%,85%{translate:0 -105%}100%{translate:0 0}}',
    '@keyframes pgdH{0%,30%{translate:0 0}55%,85%{translate:-105% 0}100%{translate:0 0}}',
    '.pgd-card .pgd-later{display:block;margin:14px auto 0;padding:8px 14px;border:0;background:none;color:rgba(244,238,230,.6);font:500 13px var(--font-sans);cursor:pointer}'
  ].join('');
  document.head.appendChild(css);

  const IC = {
    v: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="7" rx="1.5"/><rect x="7" y="14" width="10" height="7" rx="1.5"/><path d="M20 9v6M18.5 13.5 20 15l1.5-1.5"/></svg>',
    h: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="7" height="10" rx="1.5"/><rect x="14" y="6" width="7" height="10" rx="1.5"/><path d="M9 20h6M13.5 18.5 15 20l-1.5 1.5"/></svg>'
  };
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pgv-ic pgd-btn'; btn.id = 'pgvDir';
  top.insertBefore(btn, top.firstChild);

  const mode = () => (body.classList.contains('pgv-swipe') ? 'h' : 'v');
  function paint() {
    const h = mode() === 'h';
    btn.innerHTML = h ? IC.h : IC.v;
    btn.setAttribute('aria-label', h ? 'Photos swipe left and right. Change to scroll up and down' : 'Photos scroll up and down. Change to swipe left and right');
    btn.title = h ? 'Swipe left and right' : 'Scroll up and down';
  }
  function set(m, save) {
    const was = mode();
    body.classList.toggle('pgv-swipe', m === 'h');
    if (save) keep(m);
    paint();
    if (was !== m) requestAnimationFrame(() => {
      if (window.pgvRelayout) pgvRelayout();
      if (typeof centerThumbnail === 'function' && typeof activeIdx !== 'undefined' && activeIdx >= 0) centerThumbnail(activeIdx, false);
    });
  }
  function glow() { btn.classList.remove('pgd-glow'); void btn.offsetWidth; btn.classList.add('pgd-glow'); setTimeout(() => btn.classList.remove('pgd-glow'), 3400); }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const m = mode() === 'h' ? 'v' : 'h'; set(m, true);
    if (window.showToast) showToast(m === 'h' ? 'Swipe left and right' : 'Scroll up and down');
  });

  // the first time: ask
  let asked = false;
  function ask() {
    if (asked || read() || !body.classList.contains('pgv-on')) return;
    if (navigator.webdriver && !window.__pgdAsk) return;   // automated test browsers skip it, unless the test is about this question
    if (document.querySelector('.reg-overlay.show, .pgd-ask')) { setTimeout(ask, 1200); return; }
    asked = true;
    const wrap = document.createElement('div'); wrap.className = 'pgd-ask'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'pgdTitle');
    wrap.innerHTML = '<div class="pgd-card"><h2 id="pgdTitle">How do you like to see photos?</h2><p>You can change this any time with the button at the top.</p><div class="pgd-opts">' +
      '<button type="button" class="pgd-opt" data-m="v"><span class="pgd-ph v"><i></i><i></i></span><span>Scroll up and down<small>Like reels</small></span></button>' +
      '<button type="button" class="pgd-opt" data-m="h"><span class="pgd-ph h"><i></i><i></i></span><span>Swipe left and right<small>Like a photo album</small></span></button>' +
      '</div><button type="button" class="pgd-later">Decide later</button></div>';
    document.body.appendChild(wrap); requestAnimationFrame(() => wrap.classList.add('show'));
    const done = (m, from) => {
      if (m) set(m, true);
      wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 260);
      if (!m) return;
      // the choice flies up into the button, which then glows, so they know where to change it later
      const r = btn.getBoundingClientRect();
      if (reduce || !from || !r.width) { glow(); return; }
      const s = from.getBoundingClientRect(), f = document.createElement('div'); f.className = 'pgd-fly'; f.innerHTML = m === 'h' ? IC.h : IC.v;
      f.style.left = (s.left + s.width / 2) + 'px'; f.style.top = (s.top + s.height / 2) + 'px'; document.body.appendChild(f);
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px'; f.style.transform = 'scale(.9)'; f.style.opacity = '0'; }));
      setTimeout(() => { f.remove(); glow(); }, 760);
    };
    wrap.querySelectorAll('.pgd-opt').forEach(b => b.addEventListener('click', () => done(b.dataset.m, b)));
    wrap.querySelector('.pgd-later').addEventListener('click', () => { keep(mode()); done(null); glow(); });
    wrap.addEventListener('click', e => { if (e.target === wrap) { keep(mode()); done(null); glow(); } });
    setTimeout(() => { const f = wrap.querySelector('.pgd-opt'); if (f) f.focus({ preventScroll: true }); }, 50);
  }
  pgAfter('switchView', key => { if (key === 'root') setTimeout(ask, 700); });

  set(read() === 'h' ? 'h' : 'v', false);
  window.PGDir = { mode, set: m => set(m, true), ask };
})();
