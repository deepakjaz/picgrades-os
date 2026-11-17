// Photographer page (/p/<name>): the same app, showing the photographer's work and what couples get.
// Visitors can look, but the wedding tools (hearts, notes, Find me, reels, albums, uploads, downloads) are only explained here —
// they work inside a couple's own wedding app.
(function pgStudio() {
  if (!PG_STUDIO_SLUG) return;
  document.body.classList.add('pg-studio');
  const css = document.createElement('style');
  css.textContent = [
    // nothing a visitor can't use
    '.pg-studio .pgh-create-sec,.pg-studio #pghStats,.pg-studio #pghLovedSec,.pg-studio [data-findme],.pg-studio #pgmAdd,.pg-studio .pgm-actions,.pg-studio #pgvLike,.pg-studio #pgvNote,.pg-studio .pgcv-like,.pg-studio .pgcv-note,.pg-studio #pgvSave,.pg-studio #pgvReel,.pg-studio #pgvLikeCount,.pg-studio #pgvNoteCount{display:none!important}',
    // hub cards
    '.pgs-about{margin:18px 16px 4px;padding:20px;border-radius:22px;background:var(--bg-box);border:1px solid var(--border-hairline)}.pgs-about p{margin:6px 0 0;color:var(--ink-soft);font-size:14px;line-height:1.55}',
    '.pgs-about b{font:500 24px/1.1 var(--font-serif)}.pgs-about small{display:block;margin-top:10px;font:11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}',
    '.pgs-feats{display:flex;gap:12px;overflow-x:auto;padding:4px 16px 10px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}.pgs-feats::-webkit-scrollbar{display:none}',
    '.pgs-feat{flex:0 0 46%;scroll-snap-align:start;border:none;padding:0;background:none;text-align:left;color:inherit;font-family:var(--font-sans)}',
    '.pgs-feat .ph{position:relative;aspect-ratio:9/16;border-radius:20px;overflow:hidden;background:#111;box-shadow:0 10px 26px rgba(0,0,0,.18)}.pgs-feat img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}',
    '.pgs-feat .ph:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(0,0,0,.55))}.pgs-feat em{position:absolute;left:10px;bottom:10px;z-index:1;color:#fff;font:600 10px var(--font-mono);letter-spacing:.08em;text-transform:uppercase}',
    '.pgs-feat b{display:block;margin-top:8px;font-size:14px}.pgs-feat span{display:block;font-size:12px;color:var(--ink-soft);margin-top:2px}',
    '.pgs-cta{display:flex;gap:10px;margin:8px 16px 0}.pgs-cta a{flex:1;text-align:center;padding:14px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;border:1px solid var(--ink);color:var(--ink)}.pgs-cta a.main{background:var(--ink);color:var(--bg-cream)}',
    // the feature story (opens from a card): scroll down through each feature
    '.pgs-story{position:fixed;inset:0;z-index:100000;background:#0e0c0b;color:#f4eee6;overflow-y:auto;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch}',
    '.pgs-x{position:fixed;z-index:3;top:calc(12px + env(safe-area-inset-top,0px));right:14px;width:44px;height:44px;border-radius:22px;border:1px solid rgba(255,255,255,.25);background:rgba(14,12,11,.6);color:#fff;font-size:22px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}',
    '.pgs-dots{position:fixed;z-index:3;right:10px;top:50%;transform:translateY(-50%);display:grid;gap:7px}.pgs-dots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.3);transition:height .3s,background .3s}.pgs-dots i.on{height:18px;background:#FAC646}',
    '.pgs-sec{position:relative;min-height:100%;height:100dvh;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:70px 26px 40px;box-sizing:border-box;overflow:hidden}',
    '.pgs-sec .eb{font:600 11px var(--font-mono);letter-spacing:.16em;text-transform:uppercase;color:#FAC646}.pgs-sec h3{margin:10px 0 8px;font:500 34px/1.05 var(--font-serif);text-align:center}',
    '.pgs-sec p{margin:0;max-width:330px;text-align:center;color:rgba(244,238,230,.75);font-size:14px;line-height:1.55}',
    '.pgs-phone{position:relative;margin-top:24px;width:min(58vw,240px);aspect-ratio:9/19.5;border-radius:34px;padding:7px;background:linear-gradient(145deg,#3a332d,#14110f);box-shadow:0 30px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08) inset}',
    '.pgs-phone .scr{position:relative;width:100%;height:100%;border-radius:28px;overflow:hidden;background:#000}.pgs-phone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;opacity:0;transition:opacity .9s ease}.pgs-phone img.on{opacity:1}',
    '.pgs-badge{position:absolute;z-index:2;padding:9px 13px;border-radius:14px;background:rgba(250,246,240,.96);color:#1E1916;font-size:12px;font-weight:700;box-shadow:0 12px 30px rgba(0,0,0,.35);white-space:nowrap;opacity:0;transform:translateY(16px) scale(.9);transition:all .6s cubic-bezier(.2,1.4,.4,1)}',
    '.pgs-badge.l{left:-46px}.pgs-badge.r{right:-46px}.pgs-badge span{display:block;font-weight:500;color:#6b6058;font-size:11px;margin-top:1px}',
    // reveal on scroll
    '.pgs-sec .rv{opacity:0;transform:translateY(28px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.8,.2,1)}.pgs-sec.in .rv{opacity:1;transform:none}',
    '.pgs-sec.in .rv.d1{transition-delay:.12s}.pgs-sec.in .rv.d2{transition-delay:.25s}.pgs-sec .pgs-phone.rv{transform:translateY(60px) rotate(-4deg) scale(.92)}.pgs-sec.in .pgs-phone.rv{transform:rotate(0) scale(1)}',
    '.pgs-sec.in .pgs-badge{opacity:1;transform:none}.pgs-sec.in .pgs-badge.b1{transition-delay:.7s}.pgs-sec.in .pgs-badge.b2{transition-delay:1.1s}',
    '.pgs-glow{position:absolute;width:420px;height:420px;border-radius:50%;filter:blur(70px);opacity:.28;z-index:-1;animation:pgsFloat 9s ease-in-out infinite}',
    '@keyframes pgsFloat{0%,100%{transform:translate(-30px,-20px)}50%{transform:translate(30px,30px)}}',
    '.pgs-end a{margin-top:22px;display:inline-block;padding:15px 28px;border-radius:999px;background:#FAC646;color:#1E1916;font-weight:800;text-decoration:none}',
    '@media (prefers-reduced-motion:reduce){.pgs-sec .rv,.pgs-badge{transition:none!important}.pgs-glow{animation:none}}',
    // step 72: feature art — a reel in a phone, or the feature's icon on its colour
    '.pgs-art{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}',
    '.pgs-art-ic,.pgs-phone .scr.pgs-art-ic{display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 80% at 50% 30%,var(--glow) 0%,#141414 75%)!important;color:#fff}',
    '.pgs-art-ic svg{width:42%;max-width:120px;height:auto;opacity:.95;filter:drop-shadow(0 6px 18px rgba(0,0,0,.35))}',
    '.pgs-feat .pgs-art-reel{padding:8%;background:#141414}.pgs-feat .pgs-art-reel .pgrm{height:100%}',
    '.pgs-phone .scr.pgs-art-reel{background:#141414}.pgs-phone .scr.pgs-art-reel .pgrm{height:100%;border-radius:inherit;padding:0;box-shadow:none}',
    // step 70: try the editors (a demo: nothing saved, shared or downloaded)
    '.pgs-try{margin:6px 16px 4px;padding:18px;border-radius:22px;background:#111;color:#f4eee6}',
    '.pgs-try b{display:block;font:500 22px/1.15 var(--font-serif)}.pgs-try p{margin:6px 0 14px;font:400 13.5px/1.5 var(--font-sans);letter-spacing:0;color:rgba(244,238,230,.75)}',
    '.pgs-try-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.pgs-try-row button,.pgs-sec .pgs-trybtn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:12px 16px;border-radius:999px;border:0;background:#FAE900;color:#111;font:800 15px/1.2 var(--font-sans);cursor:pointer}',
    '.pgs-try-row button+button{background:#fff}',
    '.pgs-try-row svg,.pgs-trybtn svg{width:20px;height:20px}',
    '.pgs-sec .pgs-trybtn{margin-top:22px}',
    // a small "Demo" tag in the editor's own header (never over its buttons)
    '.pgs-tag{display:inline-block;margin-left:2px;padding:3px 8px;border-radius:999px;background:#FAE900;color:#111;font:800 10.5px/1.2 var(--font-sans);letter-spacing:.04em;vertical-align:middle}'
  ].join('');
  document.head.appendChild(css);

  // Every feature a couple gets, with the real screens (app/demo/*.jpg, made by tools/capture_demos.js)
  const FEATURES = [
    { k: 'app', eb: 'Your wedding app', t: 'The whole wedding, in one app', p: 'Every couple gets their own app for their wedding: open it from a link or add it to the home screen. Hub, galleries, Root Moment, notes and the studio.', shots: ['hub', 'collections'], glow: '#C9A24B',
      badges: [['Opens like an app', 'from the home screen'], ['Shared with one link', 'family and guests']] },
    { k: 'viewer', eb: 'Galleries', t: 'Every event, every photo', p: 'Haldi, Mehendi, Sangeet, Wedding, Reception: each event is its own collection. Photos open full screen and scroll like a film strip, with zoom.', shots: ['collections', 'viewer'], glow: '#B8431D',
      badges: [['Full screen', 'swipe like a film strip'], ['Pinch to zoom', 'every detail']] },
    { k: 'moments', eb: 'Root Moment', t: 'The wedding as a reel feed', p: 'The best moments play one after another like reels: photos, guests’ videos and albums. Hearts and notes from family, like Instagram.', shots: ['moments'], glow: '#7A3EB1',
      badges: [['Double-tap to love', 'hearts and notes'], ['Guest videos too', 'after the couple approves']] },
    { k: 'findme', eb: 'Find me', t: 'A selfie finds your photos', p: 'Guests take a selfie and see every photo they are in, out of thousands, in seconds. They can save them as their own collection and share the link.', shots: ['findme'], glow: '#2E8B57',
      badges: [['One selfie', 'all your photos'], ['Private', 'only a face code is checked']] },
    { k: 'reel', try: 'reel', eb: 'Reel maker', t: 'Reels with music, made on the phone', p: 'Pick photos and a style: South, Haldi, Sangeet, Royal, Cinema and more. Cuts land on the beat of the music, even your own song.', shots: ['reel'], glow: '#D4A017',
      badges: [['Cuts on the beat', 'of any song'], ['38 styles', 'for every ceremony']] },
    { k: 'album', try: 'post', eb: 'Album maker', t: 'Instagram albums in a minute', p: 'Album strips, carousels and single posts with 48 templates, wedding drawings and rose petal showers. Move, zoom or replace any photo.', shots: ['album'], glow: '#C2185B',
      badges: [['48 templates', 'per ceremony'], ['Faces kept in frame', 'automatically']] },
    { k: 'upload', eb: 'Guest moments', t: 'Guests add their moments', p: 'Guests share their own photos and videos into Root Moment. The couple approves each one and sends a thank-you note.', shots: ['upload', 'moments'], glow: '#1565C0',
      badges: [['Couple approves', 'every moment'], ['Thank-you note', 'from the bride and groom']] }
  ];
  const IMG = n => '/app/demo/' + n + '.jpg';
  // step 72: no screenshots on the feature cards. Wedding photos appear only as a reel in a phone (reel maker, Root Moment);
  // every other feature is shown with its own icon.
  const REEL_LIKE = { reel: 'Reel Edits', moments: 'Root Moment' };
  const FEAT_IC = {
    app: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    viewer: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    findme: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><circle cx="12" cy="10" r="3"/><path d="M7 17c1.2-2 3-3 5-3s3.8 1 5 3"/>',
    album: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/><path d="m3 16 4-4 5 5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'
  };
  function demoIds() {
    const d = GALLERY.tryDemo; if (d && d.events) return pgShuffle([].concat(...d.events.map(e => e.photos.map(x => x.id)))).slice(0, 8);
    return pgShuffle([].concat(...(GALLERY.events || []).map(e => (e.photos || []).map(x => x.id)))).slice(0, 8);
  }
  function featArt(box, f) {   // fills a phone-shaped box: a reel for reel-like features, an icon for the rest
    if (REEL_LIKE[f.k] && window.pgReelMock) { const ids = demoIds(); if (ids.length) { box.classList.add('pgs-art-reel'); pgReelMock(box, ids, { label: (GALLERY.tryDemo && GALLERY.tryDemo.title) || '', sub: REEL_LIKE[f.k] }); return; } }
    box.classList.add('pgs-art-ic'); box.style.setProperty('--glow', f.glow || '#FAC646');
    box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (FEAT_IC[f.k] || FEAT_IC.app) + '</svg>';
  }

  function story(startKey) {
    const info = GALLERY.studioInfo || {};
    const wrap = document.createElement('div'); wrap.className = 'pgs-story';
    const x = document.createElement('button'); x.type = 'button'; x.className = 'pgs-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    const dots = document.createElement('div'); dots.className = 'pgs-dots';
    wrap.append(x, dots);
    const secs = [];
    FEATURES.forEach((f, i) => {
      const s = document.createElement('section'); s.className = 'pgs-sec'; s.dataset.k = f.k;
      const g = document.createElement('div'); g.className = 'pgs-glow'; g.style.background = f.glow; s.appendChild(g);
      const eb = document.createElement('div'); eb.className = 'eb rv'; eb.textContent = (i + 1) + ' / ' + FEATURES.length + ' · ' + f.eb;
      const h = document.createElement('h3'); h.className = 'rv d1'; h.textContent = f.t;
      const p = document.createElement('p'); p.className = 'rv d2'; p.textContent = f.p;
      const ph = document.createElement('div'); ph.className = 'pgs-phone rv'; const scr = document.createElement('div'); scr.className = 'scr'; ph.appendChild(scr);
      featArt(scr, f);   // step 72
      f.badges.forEach((b, j) => { const d = document.createElement('div'); d.className = 'pgs-badge b' + (j + 1) + ' ' + (j ? 'r' : 'l'); d.style.top = (j ? 62 : 18) + '%'; d.textContent = b[0]; const sp = document.createElement('span'); sp.textContent = b[1]; d.appendChild(sp); ph.appendChild(d); });
      s.append(eb, h, p, ph);
      if (f.try && GALLERY.tryDemo) { const t = document.createElement('button'); t.type = 'button'; t.className = 'pgs-trybtn rv d2'; t.innerHTML = TRY_IC[f.try] + '<span>Try it yourself</span>'; t.onclick = () => { close(); pgsTry(f.try); }; s.appendChild(t); }
      wrap.appendChild(s); secs.push(s);
      dots.appendChild(document.createElement('i'));
    });
    // last screen: how to get it
    const end = document.createElement('section'); end.className = 'pgs-sec pgs-end';
    end.innerHTML = '<div class="pgs-glow" style="background:#FAC646"></div><div class="eb rv">Your wedding</div><h3 class="rv d1"></h3><p class="rv d2"></p>';
    end.querySelector('h3').textContent = 'All of this comes with your wedding';
    end.querySelector('p').textContent = 'Book ' + (info.name || 'us') + ' and your wedding app is ready the day your photos are delivered.';
    const a = document.createElement('a'); a.className = 'rv d2'; a.textContent = 'Ask about your date'; a.href = contactHref(info); a.target = '_blank'; a.rel = 'noopener'; end.appendChild(a);
    wrap.appendChild(end); secs.push(end); dots.appendChild(document.createElement('i'));
    document.body.appendChild(wrap);
    // reveal each screen as it scrolls in; the phone switches between its screens while it is visible
    const timers = [];
    const io = new IntersectionObserver(es => es.forEach(e => {
      const k = secs.indexOf(e.target); if (!e.isIntersecting) return;
      e.target.classList.add('in'); dots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === k));
    }), { root: wrap, threshold: 0.55 });
    secs.forEach(s => io.observe(s));
    secs.forEach(s => { const ims = s.querySelectorAll('.scr > img'); if (ims.length < 2) return; let n = 0; timers.push(setInterval(() => { if (!s.classList.contains('in')) return; ims[n].classList.remove('on'); n = (n + 1) % ims.length; ims[n].classList.add('on'); }, 2600)); });
    const close = () => { timers.forEach(clearInterval); io.disconnect(); wrap.remove(); };
    x.onclick = close;
    const first = secs.find(s => s.dataset.k === startKey); if (first) requestAnimationFrame(() => wrap.scrollTo({ top: first.offsetTop, behavior: 'auto' }));
  }
  // ---- step 70: try Reel Edits / Post Edits on the demo wedding (GALLERY.tryDemo), nothing saved, shared or downloaded ----
  const TRY_IC = {
    reel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>',
    post: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9.5" cy="9.5" r="1.8"/><path d="m20 15-4.5-4.5L6 20"/></svg>'
  };
  const DEMO_MSG = 'This is a demo. With your own wedding app you can save, download and share everything.';
  const loaded = {};
  function load(src, name) {
    if (window[name]) return Promise.resolve();
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = () => { loaded[src] = null; rej(new Error('Could not open it. Check the internet.')); }; document.head.appendChild(sc); });
    return loaded[src];
  }
  function ribbon() {
    // every header of the open editor gets a "Demo" tag (they appear as the editor moves between its screens)
    const tagAll = () => document.querySelectorAll('.rl-wrap .re-logo span:not(.pgs-tag), .pe-wrap .pe-logo span:not(.pgs-tag)').forEach(sp => {
      if (sp.nextElementSibling && sp.nextElementSibling.classList.contains('pgs-tag')) return;
      const t = document.createElement('span'); t.className = 'pgs-tag'; t.textContent = 'DEMO'; sp.after(t);
    });
    tagAll();
    const t = setInterval(() => { if (!document.querySelector('.rl-wrap, .pe-wrap, .ps-wrap')) { clearInterval(t); return; } tagAll(); }, 600);
  }
  function pgsTry(kind, chosen) {
    const d = GALLERY.tryDemo; if (!d) { showToast('The demo is not ready yet.'); return; }
    const api = (a, b) => pgApi(a, Object.assign({}, b || {}, { g: d.galleryId }));   // photos come from the demo wedding
    const pools = d.events.map(e => e.photos.slice()), pick = [];
    while (pick.length < (kind === 'reel' ? 12 : 6) && pools.some(x => x.length)) pools.forEach(x => { if (x.length && pick.length < (kind === 'reel' ? 12 : 6)) pick.push(x.shift()); });
    const labels = {}; d.events.forEach(e => e.photos.forEach(x => { labels[x.id] = e.name; }));
    const base = { demo: true, demoMsg: DEMO_MSG, title: d.title, date: pgDate(d.date), api, collections: d.events };
    const go = kind === 'reel'
      ? load('/app/reel.js', 'PGReel').then(() => PGReel.open(Object.assign({}, base, { photos: chosen || pick, choose: !chosen, studio: (GALLERY.studioInfo || {}).name || '' })))
      : load('/app/post.js', 'PGPost').then(() => PGPost.open(Object.assign({}, base, { photos: pick, labels, recent: [], openReel: ph => pgsTry('reel', ph),
          post: () => Promise.reject(new Error(DEMO_MSG)) })));
    go.then(ribbon).catch(e => showToast(e.message));
  }
  window.pgsTry = pgsTry;
  function contactHref(info) {
    const ph = String(info.phone || '').replace(/[^\d]/g, '');
    if (ph) return 'https://wa.me/' + (ph.length === 10 ? '91' + ph : ph) + '?text=' + encodeURIComponent('Hi ' + (info.name || '') + ', I saw your page and would like to ask about our wedding date.');
    if (info.email) return 'mailto:' + info.email + '?subject=' + encodeURIComponent('Our wedding');
    return info.website || '#';
  }

  // Hub: about the photographer, their weddings, and what couples get
  pgAfter('pgRenderHub', () => {
    if (!GALLERY.isStudio) return;
    const info = GALLERY.studioInfo || {};
    document.getElementById('pgHubTitle').textContent = info.name || GALLERY.title;
    document.getElementById('pgHubEyebrow').textContent = (info.tagline || 'Wedding photographer') + (info.city ? ' · ' + info.city : '');
    document.getElementById('pgGalleryEyebrow').textContent = (info.name || '') + ' · ' + (GALLERY.events || []).length + ' weddings';
    const evH = document.querySelector('#pghEvents') && document.querySelector('#pghEvents').closest('.pgh-sec'); if (evH) evH.querySelector('h3').textContent = 'Weddings';
    const nH = document.getElementById('pghNotesSec'); if (nH) nH.querySelector('h3').textContent = 'Kind words';
    if (!document.getElementById('pgsAbout')) {
      const create = document.querySelector('.pgh-create-sec');
      const about = document.createElement('div'); about.className = 'pgs-about'; about.id = 'pgsAbout';
      const b = document.createElement('b'); b.textContent = info.name || ''; const p = document.createElement('p'); p.textContent = info.about || '';
      const sm = document.createElement('small'); sm.textContent = [info.city, info.instagram ? '@' + String(info.instagram).replace(/^@/, '') : ''].filter(Boolean).join(' · ');
      about.append(b, p, sm);
      const cta = document.createElement('div'); cta.className = 'pgs-cta';
      const c1 = document.createElement('a'); c1.className = 'main'; c1.textContent = 'Ask about your date'; c1.href = contactHref(info); c1.target = '_blank'; c1.rel = 'noopener';
      const c2 = document.createElement('a'); c2.textContent = 'See what couples get'; c2.href = '#'; c2.onclick = e => { e.preventDefault(); story('app'); };
      cta.append(c1, c2);
      const sec = document.createElement('div'); sec.className = 'pgh-sec'; sec.id = 'pgsFeatSec';
      sec.innerHTML = '<div class="pgh-head"><h3>What every couple gets</h3></div><div class="pgs-feats"></div>';
      const row = sec.querySelector('.pgs-feats');
      FEATURES.forEach(f => {
        const card = document.createElement('button'); card.type = 'button'; card.className = 'pgs-feat'; card.dataset.feat = f.k;
        card.innerHTML = '<div class="ph"><div class="pgs-art"></div><em></em></div><b></b><span></span>';
        featArt(card.querySelector('.pgs-art'), f); card.querySelector('em').textContent = f.eb;   // step 72 card.querySelector('b').textContent = f.t; card.querySelector('span').textContent = 'See how it works →';
        card.onclick = () => story(f.k); row.appendChild(card);
      });
      if (GALLERY.tryDemo) {   // step 70
        const box = document.createElement('div'); box.className = 'pgs-try'; box.id = 'pgsTry';
        box.innerHTML = '<b>Try the editors yourself</b><p>Make a reel or an Instagram post from a real wedding. This is a demo: nothing is saved or downloaded. With your own wedding app, everything is yours to keep and share.</p><div class="pgs-try-row"></div>';
        [['reel', 'Reel Edits'], ['post', 'Post Edits']].forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.try = k; b.innerHTML = TRY_IC[k] + '<span>' + t + '</span>'; b.onclick = () => pgsTry(k); box.querySelector('.pgs-try-row').appendChild(b); });
        sec.appendChild(box);
      }
      create.parentNode.insertBefore(about, create); create.parentNode.insertBefore(cta, create); create.parentNode.insertBefore(sec, create);
    }
  });
  // Studio tab: contact details
  pgAfter('switchView', (k) => {
    if (k !== 'studio' || !GALLERY || !GALLERY.isStudio) return;
    const info = GALLERY.studioInfo || {};
    document.getElementById('pgStudioName').textContent = info.name || '';
    document.getElementById('pgStudioSub').textContent = [info.tagline, info.city].filter(Boolean).join(' · ');
    document.getElementById('pgStudioProject').textContent = [info.phone, info.email, info.website].filter(Boolean).join(' · ') || 'Contact through the button on the Hub';
    document.getElementById('pgStudioStats').textContent = (GALLERY.events || []).length + ' weddings on this page';
  });
  window.pgOpenStory = story;
})();
