// Browser test (step 114) in Safari's engine (WebKit): the story templates' openings on an iPhone.
//   · iPhone 17 Pro with Safari's bar showing (402 × 760): the opening keeps the full design (no shrinking) and the
//     page never pans sideways — the Nocturne letterbox bars cover the whole width (a photo showed beside them)
//   · iPhone SE (375 × 553): the opening shrinks to fit, but nothing spills outside it
//   · the opening glides: right after a flick it is still on its way, a moment later it has arrived
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'IPHONESTORIESWEDDING00114';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['IPHONESTORIESHALDI00000114', 'Haldi'], ['IPHONESTORIESWEDDING0000114', 'Wedding']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['IS' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const G = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Vithushan & Harveer', eventDate: '2026-12-14' }).galleryId;
const ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;

const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : u.endsWith('.webp') ? 'image/webp' : 'text/javascript'); res.end(d); } });
}).listen(8939, '127.0.0.1', async () => {
  const { webkit } = require('playwright'); let b; const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  try { b = await webkit.launch(); } catch (e) { console.log('FAIL WebKit is not installed here: ' + e.message.split('\n')[0]); console.log('page errors: []'); srv.close(); process.exit(1); }
  const open = async (w, h, layout) => {
    call('coupleLook', { g: G, coupleKey: ck, layout });
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }), pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://127.0.0.1:8939/g/' + G); await pg.waitForSelector('.pss [data-stage]', { timeout: 15000 }); await pg.waitForTimeout(700);
    return pg;
  };
  // scroll so the opening is at "p" of its way, then let the glide arrive
  const go = async (pg, p, settle = 1600) => { await pg.evaluate(p => { const st = document.querySelector('.pss [data-stage]'), len = st.offsetHeight - st.firstElementChild.offsetHeight; const z = +(document.querySelector('.pss').style.zoom || 1); window.scrollTo(0, st.getBoundingClientRect().top + window.scrollY + len * p * z); }, p); await pg.waitForTimeout(settle); };
  const sideways = pg => pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  try {
    // ---- iPhone 17 Pro, Safari's bar showing ----
    for (const id of ['tpl-c1', 'tpl-c2', 'tpl-c3', 'tpl-c4', 'tpl-c5']) {
      const pg = await open(402, 760, id);
      const scaled = await pg.evaluate(() => [...document.querySelectorAll('.pss .pss-fit')].some(f => f.style.transform));
      ok(!scaled, id + ' (402 × 760): the opening keeps the full design — not shrunk');
      const full = await pg.evaluate(() => { const r = document.querySelector('.pss').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), innerWidth]; });
      ok(full[0] <= 0 && full[1] >= full[2], id + ': the design fills the screen edge to edge (' + full + ')');
      let side = 0; for (const p of [0.3, 0.6, 0.95]) { await go(pg, p, 900); side = Math.max(side, await sideways(pg)); }
      ok(side <= 1, id + ': the page never pans sideways while the opening plays (' + side + ' px)');
      if (id === 'tpl-c5') {
        const lb = await pg.evaluate(() => { const t = document.getElementById('c5lt').getBoundingClientRect(), r = document.querySelector('.pss').getBoundingClientRect(); return { t: [t.left, t.right, t.height], r: [r.left, r.right] }; });
        ok(lb.t[2] > 20 && lb.t[0] <= lb.r[0] + 1 && lb.t[1] >= lb.r[1] - 1, 'Nocturne: the letterbox bar covers the whole width (' + JSON.stringify(lb) + ')');
        await pg.screenshot({ path: '/tmp/iph_c5.png' });
        // the glide: right after a flick back up it is still on its way, then arrives
        await pg.evaluate(() => { const st = document.querySelector('.pss [data-stage]'); window.scrollTo(0, st.getBoundingClientRect().top + window.scrollY + 40); });
        await pg.waitForTimeout(60); const mid = await pg.evaluate(() => +getComputedStyle(document.getElementById('c5n')).opacity);
        await pg.waitForTimeout(1600); const end = await pg.evaluate(() => +getComputedStyle(document.getElementById('c5n')).opacity);
        ok(mid < 0.9 && end > 0.9, 'the opening glides back instead of jumping (names ' + mid.toFixed(2) + ' → ' + end.toFixed(2) + ')');
      }
      await pg.context().close();
    }
    // ---- iPhone SE with Safari's bars: the opening shrinks, nothing spills out ----
    const se = await open(375, 553, 'tpl-c5'); await go(se, 0.95);
    const s = await se.evaluate(() => { const f = document.querySelector('.pss .pss-fit'); if (!f || !f.style.transform) return { scaled: false }; const fr = f.getBoundingClientRect(), x = fr.left - 3, y = fr.top + 60; const e = x > 0 ? document.elementFromPoint(x, y) : null; return { scaled: true, spill: !!(e && e.closest('.pss-fit')), side: document.documentElement.scrollWidth - innerWidth }; });
    ok(s.scaled && !s.spill && s.side <= 1, 'iPhone SE: the opening shrinks to fit and nothing spills outside it ' + JSON.stringify(s));
    await se.screenshot({ path: '/tmp/iph_se.png' });
    await se.context().close();
  } catch (e) { console.log('FAIL error:', e.message); fails++; }
  console.log('page errors:', errors);
  await b.close(); srv.close(); process.exit(fails || errors.length ? 1 : 0);
});
