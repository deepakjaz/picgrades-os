// Browser test (step 110): photos keep faces in the frame — a photo nobody framed is centred on the biggest face when it loads
// (also when a card changes its photo); a photo framed by hand keeps its framing.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'FACEFOCUSWEDDING0110';
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
}).listen(8936, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8936/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('3') }));
    await pg.goto(URL + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForFunction(() => window.PGFaceFocus && window.PGCanvas);
    const ids = await pg.evaluate(() => { const out = []; (PGLayout.storyData().events || []).forEach(e => (e.photos || []).forEach(p => out.push(p.id || p))); return [...new Set(out)].slice(0, 3); });
    ok(ids.length >= 2, 'the wedding has photos to test with');
    const res = await pg.evaluate(async ids => {
      window.pgFaceBoxes = { [ids[0]]: [[0.70, 0.10, 0.20, 0.20], [0.1, 0.6, 0.05, 0.05]], [ids[1]]: [[0.10, 0.70, 0.20, 0.20]] };
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:99999;background:#fff'; document.body.appendChild(host);
      const box = document.createElement('div'); box.style.width = '390px'; host.appendChild(box);
      const ph = (id, x, s) => ({ id: 'p' + x, t: 'photo', p: { x: 0, y: x * 260, w: 390, h: 240 }, src: { k: 'id', id }, s: s || {} });
      PGCanvas.render(box, { name: 't', sections: [{ id: 'a', h: { p: 800 }, els: [ph(ids[0], 0), ph(ids[1], 1), ph(ids[0], 2, { fx: 20, fy: 20 })] }] }, PGLayout.storyData(), () => {}, { scroller: host });
      await new Promise(r => setTimeout(r, 1500));
      const pos = k => box.querySelector('[data-el="p' + k + '"] img').style.objectPosition;
      const out = [pos(0), pos(1), pos(2)];
      // a card changes its photo: the new one is centred too
      const im = box.querySelector('[data-el="p0"] img'); im.src = im.src.replace(ids[0], ids[1]); im.dataset.photo = ids[1]; await new Promise(r => setTimeout(r, 900)); out.push(im.style.objectPosition);
      host.remove(); return out;
    }, ids);
    ok(res[0] === '80% 16%', 'a photo nobody framed is centred on the biggest face (' + res[0] + ')');
    ok(res[1] === '20% 76%', 'another photo follows its own face (' + res[1] + ')');
    ok(res[2] === '20% 20%', 'a photo framed by hand keeps its framing (' + res[2] + ')');
    const cp = await pg.evaluate(ids => { const keep = [GALLERY.story, GALLERY.couplePhotos]; GALLERY.story = Object.assign({}, GALLERY.story, { cover: [], bride: '', groom: '' }); GALLERY.couplePhotos = { bride: [ids[0]], groom: [ids[1]], both: [] };
      const D = PGLayout.storyData(); GALLERY.story = keep[0]; GALLERY.couplePhotos = keep[1]; return { b: D.couple && D.couple.bride, g: D.couple && D.couple.groom, c: D.cover }; }, ids);
    ok(cp.b === ids[0] && cp.g === ids[1] && cp.c[0] === ids[0], 'no couple picks: the tagged bride / groom photos fill the couple\'s spots and the cover');
    ok(res[3] === '20% 76%', 'when a card changes its photo, the new one is centred on its face too (' + res[3] + ')');
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
