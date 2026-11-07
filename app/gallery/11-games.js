// Games for guests (Hub › Create › Games). Each game is one file in /app/games/ listed in /app/games/games.json
// and made in the format from the helpers' brief: PGGames.register({ id, title, description, players, minutes, start(root, ctx) → { stop() } }).
(function pgGames() {
  const REG = {}; window.PGGames = { register(g) { if (g && g.id && typeof g.start === 'function') REG[g.id] = g; } };
  const PACKINFO = /[?&]packinfo\b/.test(location.search);
  let list = null, running = null, sheet = null;
  const css = document.createElement('style');
  css.textContent = '.pgg{position:fixed;inset:0;z-index:100000;background:var(--bg-cream);color:var(--ink);display:flex;flex-direction:column;font-family:var(--font-sans)}' +
    '.pgg-top{display:flex;align-items:center;justify-content:space-between;padding:calc(14px + env(safe-area-inset-top,0px)) 18px 10px}.pgg-top h2{font:500 30px/1 var(--font-serif);margin:0}' +
    '.pgg-x{min-width:44px;height:44px;border-radius:22px;border:1px solid var(--border-hairline);background:transparent;font-size:22px;color:inherit}' +
    '.pgg-list{overflow:auto;padding:6px 16px 30px;display:grid;gap:12px}.pgg-card{display:flex;gap:14px;align-items:center;text-align:left;padding:16px;border-radius:18px;border:1px solid var(--border-hairline);background:var(--bg-box);color:inherit;font:inherit}' +
    '.pgg-card i{font-style:normal;font-size:30px;width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:var(--bg-cream);flex:none}.pgg-card b{display:block;font-size:16px}.pgg-card span{display:block;font-size:13px;color:var(--ink-soft);margin-top:3px}' +
    '.pgg-play{position:fixed;inset:0;z-index:100001;background:var(--bg-cream)}.pgg-root{position:absolute;inset:0;overflow:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
    '.pgg-hostx{position:absolute;z-index:2;top:calc(8px + env(safe-area-inset-top,0px));right:10px;background:var(--bg-cream)}.pgg-root,.pgg-root *{box-sizing:border-box}.pgg-root [style*="grid-template-columns"]{min-width:0}.pgg-root [style*="grid-template-columns"]>*{min-width:0}';
  document.head.appendChild(css);
  const ICON = { 'baraat-run': '🥁', 'baraat-run-simple': '🏃', 'varmala-toss': '💐', 'wedding-memory': '🃏', 'wedding-memory-cards': '🎴', 'joota-chupai': '👞', 'shagun-catch': '💌' };

  function loadList() {
    if (list) return Promise.resolve(list);
    return fetch('/app/games/games.json', { cache: 'no-cache' }).then(r => r.json()).then(j => (list = (j.games || []).filter(g => /^[a-z0-9-]+\.js$/.test(g.file))));
  }
  function loadGame(g) {
    if (REG[g.id]) return Promise.resolve(REG[g.id]);
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/app/games/' + g.file; s.onload = () => REG[g.id] ? res(REG[g.id]) : rej(new Error('This game could not start.')); s.onerror = () => rej(new Error('This game could not load. Check the internet.')); document.head.appendChild(s); });
  }
  function colours() { const cs = getComputedStyle(document.documentElement), v = k => cs.getPropertyValue(k).trim(); return { paper: v('--bg-cream') || '#F6EFEA', ink: v('--ink') || '#1E1916', accent: v('--accent-terracotta') || '#B8431D' }; }
  function context(g, close) {
    const parts = String(GALLERY.title || '').split(/\s*(?:&|\band\b|\+)\s*/i).map(x => x.trim()).filter(Boolean);
    const ids = []; (GALLERY.events || []).forEach(e => (e.photos || []).forEach(p => ids.push(p.id)));
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const guest = typeof pgStore === 'function' ? pgStore('guest') : null;   // the guest's name, if they signed in (never their number)
    const key = k => 'pg_game_' + g.id + '_' + String(k).slice(0, 40);
    return {
      couple: { name1: parts[0] || '', name2: parts[1] || '', title: GALLERY.title || 'The Wedding' },
      guest: guest && guest.name ? { name: guest.name } : null,
      photos: ids.slice(0, 40).map(id => ({ id, url: w => pgImg(id, Math.max(60, Math.min(800, +w || 400))) })),
      colours: colours(), sound: true,
      store: { get: k => { try { return JSON.parse(localStorage.getItem(key(k))); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) {} } },
      score: n => { /* kept for a future leaderboard */ }, exit: close
    };
  }
  function play(g) {
    loadGame(g).then(G => {
      const wrap = document.createElement('div'); wrap.className = 'pgg-play';
      const root = document.createElement('div'); root.className = 'pgg-root'; wrap.appendChild(root); document.body.appendChild(wrap);
      const close = () => { if (!running) return; try { running.h && running.h.stop && running.h.stop(); } catch (e) {} wrap.remove(); running = null; };
      if (g.hostExit) {   // games without their own Exit button get one from the app
        const x = document.createElement('button'); x.type = 'button'; x.className = 'pgg-x pgg-hostx'; x.setAttribute('aria-label', 'Exit game'); x.textContent = '×'; x.onclick = () => close(); wrap.appendChild(x);
      }
      running = { wrap }; try { running.h = G.start(root, context(G, close)); } catch (e) { close(); showToast('This game could not start.'); }
    }).catch(e => showToast(e.message));
  }
  function open() {
    if (sheet) return;
    sheet = document.createElement('div'); sheet.className = 'pgg';
    sheet.innerHTML = '<div class="pgg-top"><h2>Games</h2><button type="button" class="pgg-x" aria-label="Close">×</button></div><div class="pgg-list"></div>';
    sheet.querySelector('.pgg-x').onclick = () => { sheet.remove(); sheet = null; };
    document.body.appendChild(sheet);
    const box = sheet.querySelector('.pgg-list');
    loadList().then(gs => Promise.all(gs.map(g => loadGame(g).then(G => ({ g, G }), () => null)))).then(all => {
      all.filter(Boolean).forEach(({ g, G }) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pgg-card'; b.dataset.game = G.id;
        const i = document.createElement('i'); i.textContent = ICON[G.id] || '🎲';
        const t = document.createElement('div'), n = document.createElement('b'), d = document.createElement('span');
        n.textContent = G.title + (PACKINFO ? (g.by === 'gemini' ? ' · G' : g.by === 'chatgpt' ? ' · C' : '') : '');
        d.textContent = (G.description || '') + ' · ' + (G.players === 2 ? '2 players, pass the phone' : '1 player') + (G.minutes ? ' · ' + G.minutes + ' min' : '');
        t.append(n, d); b.append(i, t); b.onclick = () => play(g); box.appendChild(b);
      });
      if (!box.children.length) box.textContent = 'No games yet.';
    }).catch(() => { box.textContent = 'Games could not load. Check the internet and try again.'; });
  }
  const card = document.getElementById('pgcGames'); if (card) card.addEventListener('click', open);
  window.pgOpenGames = open;
})();
