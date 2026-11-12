// Experience cards (step 57): the "living Hub" — cards that feel like entering the couple's wedding world.
// They live in the normal Hub grid, so the Hub editor drags, resizes and restyles them like every other card,
// and EVERYTHING on them can be changed: each word, each photo, the event, the colours (fields() → the editor's panel).
//   x-world    World cover — the wedding's world before any photo grid: a scene that moves from day to night as you scroll
//   x-journey  Wedding journey — the timeline Haldi → … → Reception (vertical on a phone, across the screen on a laptop)
//   x-chapter  Event chapter — one event's own identity (haldi splash, henna drawing itself, stage lights, palace arch,
//              city lights at night), the event icon first and NO photos; tapping enters the event
// One scroll loop drives every card: --e (0 → 1 as the card comes in) and --p (0 → 1 across its whole pass).
// In the editor, or when the phone asks for less motion, every card shows its finished still frame.
// The palette (Colours in the Hub editor) sets --x-bg / --x-ink / --x-acc / --x-acc2 for the Hub.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgExperience() {
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => pgEsc(String(s == null ? '' : s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  // ---------- one scroll loop for every experience card ----------
  const live = new Set(); let raf = 0;
  function tick() {
    raf = 0; const vh = innerHeight || 800;
    live.forEach(el => {
      if (!el.isConnected) { live.delete(el); return; }
      const r = el.getBoundingClientRect();
      const e = clamp((vh - r.top) / (vh * 0.62), 0, 1), p = clamp((vh - r.top) / (vh + r.height), 0, 1), f = clamp((vh * 0.82 - r.top) / Math.max(1, r.height * 0.85), 0, 1);
      el.style.setProperty('--e', e.toFixed(3)); el.style.setProperty('--p', p.toFixed(3)); el.style.setProperty('--f', f.toFixed(3));
      if (e > 0.02) el.classList.add('x-in');
    });
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick);
  function track(el, editing) {
    if (editing || still()) { el.style.setProperty('--e', 1); el.style.setProperty('--p', 0.5); el.style.setProperty('--f', 1); el.classList.add('x-in', 'x-still'); return; }
    live.add(el); kick(); setTimeout(kick, 60);
  }

  // ---------- event identities: which look an event gets (from its name, or chosen) ----------
  const IDS = {
    haldi: { name: 'Haldi · sunlight', time: 'Morning', line: 'A morning painted in turmeric and laughter', btn: 'Step into the Haldi' },
    mehendi: { name: 'Mehendi · henna', time: 'Afternoon', line: 'Stories drawn in henna, one swirl at a time', btn: 'Enter the Mehendi' },
    sangeet: { name: 'Sangeet · stage lights', time: 'Evening', line: 'The night the whole family danced', btn: 'Join the Sangeet' },
    cocktail: { name: 'Cocktail · disco lights', time: 'Night', line: 'Glasses up, lights down, a night to remember', btn: 'Raise a glass' },
    wedding: { name: 'Wedding · royal', time: 'The vows', line: 'Two families, one sacred fire', btn: 'Enter the Wedding' },
    reception: { name: 'Reception · night lights', time: 'Night', line: 'An evening of lights and celebration', btn: 'Enter the Reception' },
    bloom: { name: 'Celebration · florals', time: 'Celebration', line: 'Every moment of the celebration', btn: 'Open this event' }
  };
  function idOf(name) {
    const n = String(name || '').toLowerCase();
    if (/haldi|pithi|turmeric|ubtan/.test(n)) return 'haldi';
    if (/mehe?ndi|henna|mehandi/.test(n)) return 'mehendi';
    if (/cocktail|mocktail|toast|bar night|disco|dj night/.test(n)) return 'cocktail';
    if (/sangeet|sangit|garba|dandiya|music/.test(n)) return 'sangeet';
    if (/recep|party|after/.test(n)) return 'reception';
    if (/wedd|shaadi|vivah|phera|varmala|lagan|nikah|anand/.test(n)) return 'wedding';
    return 'bloom';
  }
  // the event icons (drawn, not emoji) — the hero of every chapter and timeline stop
  const ICON = {
    haldi: '<g class="x-marigold">' + [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => '<ellipse cx="50" cy="27" rx="9" ry="17" transform="rotate(' + a + ' 50 50)" class="x-pet1"/>').join('') +
      [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map(a => '<ellipse cx="50" cy="34" rx="7" ry="12" transform="rotate(' + a + ' 50 50)" class="x-pet2"/>').join('') + '<circle cx="50" cy="50" r="10" class="x-core"/></g>',
    mehendi: '<path class="x-draw" d="M50 88C30 78 22 60 30 44c6-12 22-14 28-4 5 9-2 19-11 17-7-1-8-10-2-12"/><path class="x-draw" d="M50 88c20-10 28-28 20-44-6-12-22-14-28-4"/>' +
      '<circle class="x-draw" cx="50" cy="24" r="8"/><path class="x-draw" d="M50 16V6M42 24H32M58 24h10M44 18l-6-6M56 18l6-6"/><circle cx="50" cy="24" r="2.5" class="x-dot"/>',
    sangeet: '<ellipse cx="50" cy="38" rx="30" ry="9" class="x-line"/><path class="x-line" d="M20 38v26c0 5 13 9 30 9s30-4 30-9V38"/><path class="x-line" d="M28 46l8 22M44 47v25M58 47l-4 25M72 46l-8 22"/>' +
      '<path class="x-line x-stick" d="M22 18l18 16M78 18L60 34"/><circle cx="22" cy="18" r="3" class="x-dot"/><circle cx="78" cy="18" r="3" class="x-dot"/>',
    cocktail: '<g class="x-clink"><path class="x-line x-gl1" d="M22 22h22l-11 20zM33 42v26M25 68h16"/><path class="x-line x-gl2" d="M56 22h22l-11 20zM67 42v26M59 68h16"/></g>' +
      '<path class="x-line x-bell" d="M50 8c-5 0-8 4-8 9v6l-3 4h22l-3-4v-6c0-5-3-9-8-9zM47 30a3 3 0 0 0 6 0"/><circle cx="18" cy="14" r="2" class="x-dot x-tw"/><circle cx="84" cy="12" r="2" class="x-dot x-tw"/><circle cx="50" cy="84" r="2" class="x-dot x-tw"/>',
    wedding: '<path class="x-line" d="M18 84h64M24 84V48l26-24 26 24v36"/><path class="x-line" d="M36 84V60a14 14 0 0 1 28 0v24"/>' +
      '<path class="x-flame" d="M50 80c-7-4-8-12-3-18 1 5 4 6 4 6 0-7 3-12 8-15-2 6 2 9 2 14 0 8-5 12-11 13z"/><circle cx="50" cy="20" r="3" class="x-dot"/>',
    reception: '<path class="x-line" d="M58 14a24 24 0 1 0 22 32 20 20 0 1 1-22-32z"/><circle cx="24" cy="24" r="2" class="x-dot x-tw"/><circle cx="34" cy="12" r="1.6" class="x-dot x-tw"/>' +
      '<circle cx="16" cy="44" r="1.4" class="x-dot x-tw"/><path class="x-line" d="M26 70l6-12 6 12M24 74h16M32 58v-6"/>',
    bloom: '<g class="x-marigold">' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => '<path d="M50 50C42 36 44 22 50 14c6 8 8 22 0 36z" transform="rotate(' + a + ' 50 50)" class="x-pet1"/>').join('') + '<circle cx="50" cy="50" r="8" class="x-core"/></g>'
  };
  const iconSvg = (k, cls) => '<svg class="x-icon ' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true">' + (ICON[k] || ICON.bloom) + '</svg>';

  // ---------- the cards ----------
  const T = {};
  const val = (b, k, def) => { const s = b.set || {}; return s[k] != null && s[k] !== '' ? s[k] : def; };
  const photoOf = (D, b, key) => { const id = val(b, key, ''); if (id) return id; const P = (GALLERY.story || {}).cover || []; if (P.length) return P[0]; const a = D.all[0]; return a ? a.p.id : ''; };
  const bg = (id, w) => id ? "url('" + String(pgImg(id, w)).replace(/'/g, '%27') + "')" : 'none';

  // 1. World cover
  T['x-world'] = {
    name: 'World cover', variants: ['cinema', 'arch', 'horizon'], size: { phone: [4, 6], tall: [8, 6], wide: [12, 6] },
    vnames: { cinema: 'Cinema (full scene)', arch: 'Palace window', horizon: 'Horizon (photo + sky)' },
    fields: () => [
      { key: 'photo', type: 'photo', label: 'Scene photo (the venue, the couple…)' },
      { key: 'eyebrow', type: 'text', label: 'Small line on top', ph: 'Date · place' },
      { key: 'title', type: 'text', label: 'Title', ph: 'The couple’s names' },
      { key: 'line', type: 'text', label: 'Welcome line', ph: 'Welcome to our wedding world', long: true },
      { key: 'sky', type: 'choice', label: 'Sky', options: [['scroll', 'Day → night as guests scroll'], ['dawn', 'Dawn'], ['day', 'Day'], ['dusk', 'Golden hour'], ['night', 'Night']] },
      { key: 'btn', type: 'text', label: 'Button', ph: 'Begin the journey' }
    ],
    render(el, b, D, ctx) {
      const pid = photoOf(D, b, 'photo'), v = b.variant || 'cinema', sky = val(b, 'sky', 'scroll');
      el.classList.add('x-world', 'x-w-' + v, 'x-sky-' + sky);
      const eye = val(b, 'eyebrow', [D.date, D.place].filter(Boolean).join(' · ')), title = val(b, 'title', D.names);
      const letters = Array.from(String(title)).map((c, i) => '<span style="--i:' + i + '">' + (c === ' ' ? '&nbsp;' : esc(c)) + '</span>').join('');
      el.innerHTML = '<div class="x-scene"><div class="x-photo" style="background-image:' + bg(pid, 1600) + '"></div><div class="x-skytint"></div><div class="x-sun"></div><div class="x-stars"></div></div>' +
        (v === 'arch' ? '<svg class="x-archframe" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0h100v140H0z M14 140V62C14 34 30 14 50 8c20 6 36 26 36 54v78z" fill-rule="evenodd"/><path class="x-archline" d="M14 140V62C14 34 30 14 50 8c20 6 36 26 36 54v78"/></svg>' : '') +
        '<div class="x-wtext"><div class="x-eye">' + esc(eye) + '</div><h2 class="x-title">' + letters + '</h2><p class="x-wline">' + esc(val(b, 'line', 'Welcome to our wedding world')) + '</p>' +
        '<button type="button" class="x-btn">' + esc(val(b, 'btn', 'Begin the journey')) + ' <span aria-hidden="true">↓</span></button></div>';
      el.querySelector('.x-btn').addEventListener('click', e => { e.stopPropagation(); if (ctx.editing) return;
        const next = el.nextElementSibling; if (next) next.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'start' }); });
      track(el, ctx.editing);
    }
  };

  // 2. Wedding journey (the timeline)
  T['x-journey'] = {
    name: 'Wedding journey', variants: ['path', 'beads'], size: { phone: [4, 8], tall: [8, 6], wide: [12, 4] },
    vnames: { path: 'Winding path', beads: 'String of beads' },
    fields: (b, D) => [
      { key: 'eyebrow', type: 'text', label: 'Small line on top', ph: 'Our wedding journey' },
      { key: 'title', type: 'text', label: 'Title', ph: 'From the first haldi to the last dance' }
    ].concat((D.events || []).slice(0, 8).map((ev, i) => ({ key: 'line' + i, type: 'text', label: ev.name + ' — its line', ph: IDS[idOf(ev.name)].line })))
     .concat([{ key: 'dir', type: 'choice', label: 'Direction', options: [['auto', 'Down on phones, across on laptops'], ['down', 'Always down'], ['across', 'Always across']] }]),
    render(el, b, D, ctx) {
      const evs = (D.events || []).slice(0, 8); if (!evs.length) return false;
      const dir = val(b, 'dir', 'auto'), across = dir === 'across' || (dir === 'auto' && ctx.cols >= 8);
      el.classList.add('x-journey', across ? 'x-across' : 'x-down', 'x-j-' + (b.variant || 'path'));
      el.style.setProperty('--n', evs.length);
      el.innerHTML = '<div class="x-jhead"><div class="x-eye">' + esc(val(b, 'eyebrow', 'Our wedding journey')) + '</div><h3 class="x-jtitle">' + esc(val(b, 'title', 'From the first haldi to the last dance')) + '</h3></div>' +
        '<div class="x-track"><div class="x-rail"><i></i></div>' + evs.map((ev, i) => { const k = idOf(ev.name);
          return '<button type="button" class="x-stop x-id-' + k + '" style="--k:' + i + ';--t:' + (evs.length > 1 ? i / (evs.length - 1) : 0).toFixed(3) + '"><span class="x-bead">' + iconSvg(k) + '</span>' +
            '<span class="x-stxt"><small>' + esc(IDS[k].time) + '</small><b>' + esc(ev.name) + '</b><em>' + esc(val(b, 'line' + i, IDS[k].line)) + '</em></span></button>'; }).join('') + '</div>';
      el.querySelectorAll('.x-stop').forEach((s, i) => s.addEventListener('click', e => { e.stopPropagation(); if (!ctx.editing) ctx.act('event', evs[i].name); }));
      track(el, ctx.editing);
    }
  };

  // 3. Event chapter (icon first, no photos)
  T['x-chapter'] = {
    name: 'Event chapter', variants: ['stage', 'side'], size: { phone: [4, 4], tall: [4, 4], wide: [6, 4] },
    vnames: { stage: 'Icon in the middle', side: 'Icon beside the words' },
    fields: (b, D) => [
      { key: 'event', type: 'event', label: 'Which event' },
      { key: 'look', type: 'choice', label: 'Look', options: [['auto', 'Matches the event']].concat(Object.keys(IDS).map(k => [k, IDS[k].name])) },
      { key: 'eyebrow', type: 'text', label: 'Small line on top', ph: 'Morning / Evening…' },
      { key: 'title', type: 'text', label: 'Title', ph: 'The event’s name' },
      { key: 'line', type: 'text', label: 'Line', long: true, ph: 'A line about this event' },
      { key: 'btn', type: 'text', label: 'Button', ph: 'Enter the event' }
    ],
    render(el, b, D, ctx) {
      const evs = D.events || [], idx = +val(b, 'idx', 0), ev = evs.find(e => e.name === val(b, 'event', '')) || evs[idx];
      if (!ev) return false;
      const look = val(b, 'look', 'auto'), k = look === 'auto' ? idOf(ev.name) : look, I = IDS[k] || IDS.bloom;
      el.classList.add('x-chapter', 'x-id-' + k, 'x-c-' + (b.variant || 'stage'));
      const small = ctx.cols * ctx.rows <= 2;
      el.innerHTML = '<div class="x-cbg" aria-hidden="true">' + (k === 'haldi' ? '<svg class="x-splash" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><path d="M100 22c22 0 30 22 50 24 22 2 34 22 28 44-5 18 10 30 2 48-9 20-30 18-44 30-14 12-30 22-48 12-16-9-28-2-44-14-16-12-8-32-18-48-10-17 0-36 18-42 16-6 22-28 40-34 6-2 11-20 16-20z"/><circle cx="160" cy="168" r="7"/><circle cx="30" cy="40" r="5"/><circle cx="176" cy="40" r="4"/><path d="M72 176c0 10 6 16 6 22M128 182c0 6 4 10 4 14"/></svg>'
          : k === 'mehendi' ? '<svg class="x-henna" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g>' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => '<path class="x-draw" transform="rotate(' + a + ' 100 100)" d="M100 100c0-20 8-34 0-52-8 18 0 32 0 52M100 48c-6-8-4-18 0-24 4 6 6 16 0 24"/>').join('') + '<circle class="x-draw" cx="100" cy="100" r="16"/><circle class="x-draw" cx="100" cy="100" r="70"/></g></svg>'
          : k === 'sangeet' ? '<div class="x-beam x-b1"></div><div class="x-beam x-b2"></div><div class="x-eq">' + Array.from({ length: 14 }, (_, i) => '<i style="--d:' + ((i * 37) % 10) / 10 + 's"></i>').join('') + '</div>'
          : k === 'cocktail' ? '<div class="x-disco"><i class="x-ball"></i></div><div class="x-spots">' + Array.from({ length: 12 }, (_, i) => '<i style="--x:' + ((i * 53) % 100) + '%;--y:' + ((i * 29) % 90) + '%;--h:' + (i * 47) % 360 + ';--d:' + (i % 4) * 0.5 + 's"></i>').join('') + '</div>'
          : k === 'wedding' ? '<svg class="x-palace" viewBox="0 0 200 120" preserveAspectRatio="xMidYMax slice"><path class="x-draw" d="M10 120V70h16V56l10-10 10 10v14h16V48c0-14 18-26 38-32 20 6 38 18 38 32v22h16V56l10-10 10 10v14h16v50"/><path class="x-draw" d="M84 120V86a16 16 0 0 1 32 0v34M36 120v-24a8 8 0 0 1 16 0v24M148 120v-24a8 8 0 0 1 16 0v24"/></svg><div class="x-petals">' + Array.from({ length: 10 }, (_, i) => '<i style="--x:' + (i * 10 + 4) + '%;--d:' + (i % 5) * 0.9 + 's"></i>').join('') + '</div>'
          : k === 'reception' ? '<div class="x-bokeh">' + Array.from({ length: 16 }, (_, i) => '<i style="--x:' + ((i * 61) % 100) + '%;--y:' + ((i * 37) % 70) + '%;--s:' + (8 + (i * 7) % 26) + 'px;--d:' + (i % 6) * 0.7 + 's"></i>').join('') + '</div><svg class="x-city" viewBox="0 0 200 60" preserveAspectRatio="xMidYMax slice"><path d="M0 60V40h10V28h8v12h6V18h12v22h8V30h10v30h6V22l8-8 8 8v38h8V34h14v26h6V26h10v34h8V12h4V4h2v8h4v48h10V36h12v24h8V30h10v30z"/></svg>'
          : '<div class="x-glow"></div>') + '</div>' +
        '<div class="x-cmain">' + iconSvg(k, 'x-hero') + '<div class="x-ctext">' + (small ? '' : '<div class="x-eye">' + esc(val(b, 'eyebrow', I.time)) + '</div>') +
        '<h3 class="x-ctitle">' + esc(val(b, 'title', ev.name)) + '</h3>' + (small ? '' : '<p class="x-cline">' + esc(val(b, 'line', I.line)) + '</p><span class="x-cbtn">' + esc(val(b, 'btn', I.btn)) + ' <span aria-hidden="true">→</span></span>') + '</div></div>';
      el.setAttribute('role', 'button'); el.tabIndex = 0;
      const go = () => { if (!ctx.editing) ctx.act('event', ev.name); };
      el.addEventListener('click', go); el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      track(el, ctx.editing);
    }
  };

  // ---------- palettes: the Hub's colours ----------
  const PALETTES = {
    royal: { name: 'Royal maroon', bg: '#2a0f14', ink: '#f7e9d7', acc: '#d4a24c', acc2: '#8e1f2f' },
    haldi: { name: 'Haldi sunshine', bg: '#fff6dc', ink: '#4a2b00', acc: '#e8a400', acc2: '#d9622b' },
    mehendi: { name: 'Mehendi green', bg: '#f3f0e2', ink: '#24321f', acc: '#5d7b3a', acc2: '#b5562e' },
    ivory: { name: 'Ivory & blush', bg: '#fbf6ef', ink: '#3b2a24', acc: '#c98d7a', acc2: '#8a6a4f' },
    night: { name: 'Night gold', bg: '#0f1424', ink: '#f1e8d6', acc: '#e3c07a', acc2: '#6c7bd4' },
    resort: { name: 'Lake resort', bg: '#eef5f4', ink: '#17343a', acc: '#2f8f8b', acc2: '#e0a96d' }
  };
  function palette(p) {
    const st = document.body.style, keys = ['bg', 'ink', 'acc', 'acc2'];
    const P = p && (p.id === 'custom' ? p : Object.assign({}, PALETTES[p.id] || {}, p));
    if (!P || !P.bg) { keys.forEach(k => st.removeProperty('--x-' + k)); document.body.classList.remove('pgx-pal'); return; }
    keys.forEach(k => { if (/^#[0-9a-f]{6}$/i.test(P[k] || '')) st.setProperty('--x-' + k, P[k]); });
    document.body.classList.add('pgx-pal');
  }

  window.PGX = {
    types: T, PALETTES, palette, idOf,
    has: k => !!T[k],
    render(el, b, D, ctx) { const t = T[b.block]; if (!t) return false; try { if (t.render(el, b, D, ctx) === false) return false;
      el.querySelectorAll('.x-draw').forEach(x => x.setAttribute('pathLength', '100')); el.querySelectorAll('.x-archline').forEach(x => x.setAttribute('pathLength', '1')); return true; } catch (e) { console.warn('experience card', b.block, e); return false; } },
    fields: (b, D) => { const t = T[b.block]; return t ? t.fields(b, D) : []; }
  };
})();
