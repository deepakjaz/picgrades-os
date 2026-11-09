// Themes (step 31): the whole app's skin — colours (light and dark), fonts, corner roundness, glass, motion.
// The themes live in /app/themes/themes.json (designed by Gemini "G" and ChatGPT "C", checked and merged by tools/merge_designs.py).
// Which theme: ?theme=<id> in the link → the test menu choice → the wedding's own theme (GALLERY.theme, set later in the control panel).
// Test menu: open the gallery with ?themes once; a small "Theme" button then stays until you close it.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgThemes() {
  let THEMES = [];
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  const hexRgb = h => { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join(''); };
  const lum = h => { const f = c => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); const [r, g, b] = hexRgb(h); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function vars(c, t) {
    let faint = mix(c.ink2, c.bg, 0.3); if (contrast(faint, c.bg) < 3) faint = c.ink2;   // captions stay readable
    const g = hexRgb(c.glass), gl = t.glass || {};
    return [
      ['--bg-cream', c.bg], ['--bg-cream-rgb', hexRgb(c.bg).join(', ')], ['--bg-box', c.surface], ['--ink', c.ink], ['--ink-soft', c.ink2], ['--ink-faint', faint],
      ['--border-hairline', c.line], ['--cta-peach', c.accent], ['--cta-peach-ink', c.onAccent], ['--accent-terracotta', c.accent2],
      ['--pg-glass', `rgba(${g.join(',')},${gl.opacity != null ? gl.opacity : 0.6})`], ['--pg-glass-line', `rgba(${hexRgb(c.ink).join(',')},${Math.min(0.25, (gl.border || 0.3) * 0.4)})`]
    ].map(([k, v]) => `${k}:${v};`).join('');
  }
  function fontLink(t) {
    const fams = [t.fonts.display, t.fonts.body].filter((v, i, a) => v && a.indexOf(v) === i);
    const q = fams.map(f => 'family=' + f.replace(/ /g, '+') + ':ital,wght@0,400;0,500;0,600;0,700;1,400;1,500').join('&');
    let l = document.getElementById('pgThemeFonts');
    if (!l) { l = document.createElement('link'); l.id = 'pgThemeFonts'; l.rel = 'stylesheet'; document.head.appendChild(l); }
    l.href = 'https://fonts.googleapis.com/css2?' + q + '&display=swap';
  }
  function apply(t) {
    if (!t) return;
    const r = t.radius || {}, gl = t.glass || {}, mo = t.motion || {};
    const common = `--font-serif:'${t.fonts.display}', Georgia, serif;--font-sans:'${t.fonts.body}', -apple-system, BlinkMacSystemFont, sans-serif;` +
      `--pg-radius:${r.tile || 16}px;--pg-radius-btn:${r.button || 12}px;--pg-radius-sheet:${r.sheet || 24}px;--pg-glass-blur:${Math.max(0, Math.min(24, gl.blur || 16))}px;` +
      `--pg-motion:${mo.duration || 240}ms;--pg-ease:${mo.easing || 'ease'};`;
    let st = document.getElementById('pgThemeVars');
    if (!st) { st = document.createElement('style'); st.id = 'pgThemeVars'; document.head.appendChild(st); }
    st.textContent = `:root{${common}${vars(t.light, t)}} html[data-tkg-theme="dark"]{${vars(t.dark, t)}}`;
    fontLink(t);
    document.documentElement.dataset.pgTheme = t.id;
    const dark = document.documentElement.getAttribute('data-tkg-theme') === 'dark', m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', (dark ? t.dark : t.light).bg);
    store('pg_theme_cache', JSON.stringify(t));   // the next visit starts in this theme straight away
    if (window.pgThemeMenuPaint) pgThemeMenuPaint();
  }
  function choose() {
    const q = new URLSearchParams(location.search).get('theme');
    const id = q || store('pg_theme_pick') || (window.GALLERY && GALLERY.theme) || '';
    return THEMES.find(t => t.id === id) || null;
  }
  // start in the last theme at once (no flash), then load the list
  try { const c = JSON.parse(store('pg_theme_cache') || 'null'); if (c && c.id) apply(c); } catch (e) {}
  const ready = fetch('/app/themes/themes.json').then(r => r.json()).then(d => {
    THEMES = (d.themes || []).filter(t => t && t.id && t.light && t.dark && t.fonts);
    const t = choose(); if (t) apply(t); else { const s = document.getElementById('pgThemeVars'); if (s && !store('pg_theme_pick')) { s.remove(); store('pg_theme_cache', null); delete document.documentElement.dataset.pgTheme; } }
    return THEMES;
  }).catch(() => []);
  window.PGTheme = { ready, list: () => THEMES.slice(), apply: id => { const t = THEMES.find(x => x.id === id); if (t) { store('pg_theme_pick', id); apply(t); } return !!t; },
    reset: () => { store('pg_theme_pick', null); store('pg_theme_cache', null); const s = document.getElementById('pgThemeVars'); if (s) s.remove(); delete document.documentElement.dataset.pgTheme; if (window.pgThemeMenuPaint) pgThemeMenuPaint(); },
    current: () => document.documentElement.dataset.pgTheme || '' };

  // ---- test menu (only with ?themes; stays until closed) ----
  if (new URLSearchParams(location.search).has('themes')) store('pg_theme_test', '1');
  if (store('pg_theme_test') !== '1') return;
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pg-thbtn'; btn.textContent = 'Theme';
  const sheet = document.createElement('div'); sheet.className = 'pg-thsheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Test themes');
  document.body.append(btn, sheet);
  btn.addEventListener('click', () => sheet.classList.toggle('show'));
  window.pgThemeMenuPaint = function () {
    const cur = PGTheme.current();
    btn.textContent = 'Theme · ' + ((THEMES.find(t => t.id === cur) || {}).name || 'Original');
    sheet.innerHTML = '<div class="pg-thtop"><b>Test themes</b><button type="button" data-x="1" aria-label="Close test menu">Hide menu</button></div>' +
      '<button type="button" class="pg-throw' + (cur ? '' : ' on') + '" data-id=""><i style="background:#F6EFEA"></i><i style="background:#B8431D"></i><span>Original<small>current app look</small></span></button>' +
      THEMES.map(t => `<button type="button" class="pg-throw${t.id === cur ? ' on' : ''}" data-id="${t.id}"><i style="background:${t.light.bg}"></i><i style="background:${t.light.accent}"></i><i style="background:${t.dark.bg}"></i>` +
        `<span style="font-family:'${t.fonts.display}',serif">${t.name}<small>${t.fonts.display} + ${t.fonts.body} · by ${t.by === 'G' ? 'Gemini' : 'ChatGPT'}</small></span></button>`).join('');
  };
  sheet.addEventListener('click', e => {
    const x = e.target.closest('[data-x]'); if (x) { store('pg_theme_test', null); btn.remove(); sheet.remove(); return; }
    const r = e.target.closest('.pg-throw'); if (!r) return;
    if (r.dataset.id) PGTheme.apply(r.dataset.id); else PGTheme.reset();
  });
  ready.then(() => pgThemeMenuPaint());
})();
