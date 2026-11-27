// Browser test (step 105): "While scrolling" — every scroll effect follows the scroll (one engine), the colour circle that grows and
// shrinks while its part stays still, light mode / reduced motion keep it still, and the editor sets it.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'SCROLLFXWEDDING00105';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['tH', 'Haldi'], ['tS', 'Sangeet'], ['tW', 'Wedding'], ['tR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['TP' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;


const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8933, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8933/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept());
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('3') }));
    await require('./fonts_local').install(pg);
    await pg.goto(URL + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForFunction(() => window.PGCanvas && PGCanvas.SCFX, null, { timeout: 10000 });
    // a test page: one part per effect, in tall parts, inside a box that scrolls
    const fxs = await pg.evaluate(() => PGCanvas.SCFX);
    const res = await pg.evaluate(async fx => {
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:99999;background:#fff'; document.body.appendChild(host);
      const box = document.createElement('div'); box.style.width = '390px'; host.appendChild(box);
      const sec = (id, els, stay) => ({ id, h: { p: 700, l: 600 }, stay: stay || 0, els });
      const el = (id, f, extra) => ({ id, t: 'shape', p: { x: 95, y: 250, w: 200, h: 200 }, s: { bg: '#d9a0a0', shape: 'circle' }, sc: Object.assign({ fx: f, rg: 'pass', str: 50 }, extra || {}) });
      const sections = fx.map((f, i) => sec('s' + i, [el('e' + i, f, f === 'move' ? { dir: 'left' } : f === 'reveal' ? { sh: 'circle' } : f === 'colour' ? { c2: '#1d4ed8' } : {})]));
      sections.push(sec('circ', [{ id: 'circle', t: 'shape', p: { x: 20, y: 120, w: 350, h: 350 }, s: { bg: '#e9c46a', shape: 'circle' }, sc: { fx: 'grow-shrink', rg: 'stay', str: 80 } }], 1400));
      sections.push(sec('end', []));
      PGCanvas.render(box, { name: 't', sections }, PGLayout.storyData(), () => {}, { scroller: host });
      const read = id => { const b = box.querySelector('[data-el="' + id + '"] > .pgc-body') || box.querySelector('[data-el="' + id + '"]').firstElementChild; const c = getComputedStyle(b); return [b.style.scale, b.style.opacity, b.style.translate, b.style.rotate, b.style.filter, b.style.clipPath, b.style.backgroundColor].join('|'); };
      const at = async (id, k) => { const n = box.querySelector('[data-el="' + id + '"]'); host.scrollTop = Math.max(0, n.offsetTop + n.closest('.pgc-sec').offsetTop - host.clientHeight * k); await new Promise(r => setTimeout(r, 120)); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return read(id); };
      const out = {};
      for (let i = 0; i < fx.length; i++) { const a = await at('e' + i, 0.9), z = await at('e' + i, 0.1); out[fx[i]] = [a, z]; }
      // the circle in the part that stays: small → full → small while the page scrolls through it
      const cs = box.querySelector('[data-sec="circ"]'), sc = []; for (const f of [0, 0.5, 1]) { host.scrollTop = cs.offsetTop + (cs.offsetHeight - host.clientHeight) * f; await new Promise(r => setTimeout(r, 120)); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); sc.push(+box.querySelector('[data-el="circle"]').firstElementChild.style.scale); }
      out.circle = sc; host.remove(); return out;
    }, fxs);
    const changed = fxs.filter(f => res[f][0] !== res[f][1]);
    ok(changed.length === fxs.length, 'every scroll effect follows the scroll (' + changed.length + '/' + fxs.length + ')' + (changed.length < fxs.length ? ' ' + JSON.stringify(fxs.filter(f => changed.indexOf(f) < 0).map(f => [f, res[f]])) : ''));
    ok(res.circle[0] < 0.6 && res.circle[1] > 0.95 && res.circle[2] < 0.6, 'the colour circle grows to full size and shrinks again while its part stays still ' + JSON.stringify(res.circle));
    // light mode keeps the page still
    const lite = await pg.evaluate(async () => { document.documentElement.classList.add('pg-lite'); const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;overflow:auto'; document.body.appendChild(host); const box = document.createElement('div'); box.style.width = '390px'; host.appendChild(box);
      PGCanvas.render(box, { name: 't', sections: [{ id: 'a', h: { p: 1600 }, els: [{ id: 'x', t: 'shape', p: { x: 10, y: 900, w: 100, h: 100 }, s: { bg: '#000' }, sc: { fx: 'fade-in', rg: 'pass', str: 50 } }] }] }, PGLayout.storyData(), () => {}, { scroller: host });
      host.scrollTop = 500; await new Promise(r => setTimeout(r, 200)); const o = box.querySelector('[data-el="x"]').firstElementChild.style.opacity; host.remove(); document.documentElement.classList.remove('pg-lite'); return o; });
    ok(lite === '', 'light mode: scroll effects stay still (the part simply shows)');
    // the editor: Motion › While scrolling
    await pg.evaluate(() => PGCanvasEditor.open('canvas-quiet')); await pg.waitForSelector('.pce .pce-page .pgc-sec'); await pg.waitForTimeout(500);
    const pid = await pg.evaluate(() => { const e = PGCanvasEditor.state().doc.sections[0].els.find(x => x.t === 'photo'); PGCanvasEditor.select(e.id); return e.id; });
    await pg.waitForSelector('.pce [data-sub=motion]', { state: 'attached' }); await pg.evaluate(() => document.querySelector('.pce [data-sub=motion]').click()); await pg.waitForSelector('.pce [data-scfx="grow-shrink"]', { state: 'attached' });
    await pg.evaluate(() => { const d = document.querySelector('.pce-drawer-toggle'); const pce = document.querySelector('.pce'); if (d && pce && !pce.classList.contains('drawer-open')) d.click(); }); await pg.waitForTimeout(300);
    ok(await pg.evaluate(() => document.querySelectorAll('.pce [data-scfx]').length) === 12, 'Motion has a "While scrolling" group: None + 11 effects');
    await pg.evaluate(() => document.querySelector('.pce [data-scfx="reveal"]').click()); await pg.waitForSelector('.pce [data-k=scsh]', { state: 'attached' });
    await pg.evaluate(() => document.querySelector('.pce [data-k=scsh] [data-v=arch]').click()); await pg.evaluate(() => document.querySelector('.pce [data-k=scrg] [data-v=in]').click()); await pg.waitForTimeout(300);
    await pg.evaluate(() => { const t = document.querySelector('.pce [data-scfx="reveal"]'); if (t) t.scrollIntoView({ block: 'center' }); });
    ok(await pg.evaluate(id => { const e = PGCanvasEditor.state().doc.sections[0].els.find(x => x.id === id); return e.sc.fx === 'reveal' && e.sc.sh === 'arch' && e.sc.rg === 'in'; }, pid), 'choosing Reveal, Arch, Coming in sets the part\'s scroll effect');
    ok(await pg.evaluate(id => !!document.querySelector('.pce-page .pgc-el[data-el="' + id + '"][data-sc="reveal"]'), pid), 'the page in the editor plays it');
    ok(await pg.evaluate(() => [...document.querySelectorAll('.pce [data-scfx], .pce [data-k=scrg] button')].every(b => b.getBoundingClientRect().height >= 44 || !b.offsetParent)), 'its buttons are at least 44 px');
    await pg.screenshot({ path: '/tmp/s105_editor.png' });
    await pg.evaluate(() => document.querySelector('.pce-save').click()); await pg.waitForFunction(() => PGCanvasEditor.state().src.id, null, { timeout: 8000 }); await pg.waitForTimeout(400);
    const sid = await pg.evaluate(() => PGCanvasEditor.state().src.id), saved = call('canvasGet', { g: pub.galleryId, coupleKey: ck, id: sid });
    ok(saved.doc.sections[0].els.find(x => x.id === pid).sc.fx === 'reveal', 'the server keeps the scroll effect');
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
