// Themes (step 31): the whole app's skin — colours (light and dark), fonts, corner roundness, glass, motion.
// The themes live in /app/themes/themes.json (designed by Gemini "G" and ChatGPT "C", checked and merged by tools/merge_designs.py).
// Which theme: the wedding's own theme (GALLERY.theme, chosen in the Control Panel, step 34). ?theme=<id> in the link previews one on this phone only.
// Part of the wedding gallery (app/gallery.html). Files load in number order.
(function pgThemes() {
  let THEMES = [];
  // ?pgpreview: the Control Panel's preview window (17-control.js) — it never touches what this phone keeps
  const PREVIEW = new URLSearchParams(location.search).has('pgpreview');
  const store = (k, v) => { if (PREVIEW && v !== undefined) return null; try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
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
  const galleryKnown = () => typeof GALLERY !== 'undefined' && !!GALLERY;
  function choose() {
    const q = new URLSearchParams(location.search).get('theme');
    if (q === 'original') return null;   // preview of the original look
    const id = q || (galleryKnown() ? GALLERY.theme || '' : '');
    return THEMES.find(t => t.id === id) || null;
  }
  function clear() { store('pg_theme_cache', null); const s = document.getElementById('pgThemeVars'); if (s) s.remove(); delete document.documentElement.dataset.pgTheme; }
  // the wedding's theme (or the original look); before the gallery has loaded, the cached theme stays to avoid a flash
  function sync() { if (!THEMES.length) return; const t = choose(); if (t) { if (document.documentElement.dataset.pgTheme !== t.id) apply(t); } else if (galleryKnown() || PREVIEW) clear(); }
  ['pg_theme_pick', 'pg_theme_test'].forEach(k => store(k, null));   // old test-menu choices no longer override the wedding
  // start in the last theme at once (no flash), then load the list
  if (!PREVIEW) try { const c = JSON.parse(store('pg_theme_cache') || 'null'); if (c && c.id) apply(c); } catch (e) {}
  const ready = fetch('/app/themes/themes.json').then(r => r.json()).then(d => {
    THEMES = (d.themes || []).filter(t => t && t.id && t.light && t.dark && t.fonts);
    sync(); return THEMES;
  }).catch(() => []);
  pgAfter('pgRenderHub', sync);
  // apply(id) shows a theme on this phone straight away (the Control Panel saves it for the wedding); '' = the original look
  window.PGTheme = { ready, list: () => THEMES.slice(), sync, current: () => document.documentElement.dataset.pgTheme || '',
    apply: id => { const t = THEMES.find(x => x.id === id); if (t) apply(t); else if (!id) clear(); return !!t || !id; },
    reset: () => clear() };
})();
