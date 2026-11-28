// Browser test (step 102): choosing a Hub layout draws the template live with PicGrades' demo wedding photos — no app in a frame, no video.
// 'Try with our photos' opens it in the editor with the wedding's own photos; the laptop button plays the laptop clip.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'LAYOUTLIVEWEDDING0102';
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
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : u.endsWith('.mp4') ? 'video/mp4' : u.endsWith('.webp') ? 'image/webp' : 'text/javascript'); res.end(d); } });
}).listen(8930, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8930/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    const G = pub.galleryId, frames = [];
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), mp = await ctx.newPage(); mp.on('pageerror', e => errors.push(e.message));
    await mp.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(mp);
    mp.on('request', r => { if (/[?&]pgpreview=1/.test(r.url())) frames.push(r.url()); });
    await mp.goto(URL + '?couple=' + ck); await mp.waitForSelector('#pgBoot.hide', { state: 'attached' });
    await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple', null, { timeout: 10000 });
    await mp.click('.tkg-nav-item[data-nav=studio]'); await mp.waitForSelector('.pgcp-sheet'); await mp.waitForTimeout(400);
    await mp.evaluate(() => PGControl.go('layout')); await mp.waitForSelector('.pgcp-layout[data-layout="canvas-quiet"]');
    await mp.locator('.pgcp-layout[data-layout="canvas-quiet"]').scrollIntoViewIfNeeded(); await mp.tap('.pgcp-layout[data-layout="canvas-quiet"]');
    await mp.waitForSelector('.pgcp-pv.clip .pgcp-pv-live .pgc', { timeout: 8000 });
    await mp.waitForFunction(() => [...document.querySelectorAll('.pgcp-pv-live img')].some(i => i.complete && i.naturalWidth > 0), null, { timeout: 10000 });
    ok(!frames.length, 'choosing a layout does not open the whole app in a frame');
    ok(await mp.evaluate(() => !document.querySelector('.pgcp-pv video') && !!document.querySelector('.pgcp-pv-live .pgc-sec')), 'the template itself is drawn (no video)');
    // step 110 (changed from step 102, Deepak's decision): a wedding that has photos sees the template with its own photos
    ok(await mp.evaluate(() => { const im = [...document.querySelectorAll('.pgcp-pv-live img')].filter(i => i.src && i.dataset.photo); return im.length > 0 && im.every(i => !/demo-wedding/.test(i.src)); }), 'a wedding with photos: the preview uses its own photos');
    ok(await mp.evaluate(() => /Your photos|your photos/.test(document.querySelector('.pgcp-pv-note').textContent)), 'the note says it is shown with your photos');
    ok(await mp.evaluate(() => document.querySelector('.pgcp-pv-edit').textContent === 'Try your photos' && !document.querySelector('.pgcp-pv-edit').hidden), '"Try your photos" is offered next to Use this');
    ok(await mp.evaluate(() => [...document.querySelectorAll('.pgcp-pv-acts button,.pgcp-pv-top button')].filter(x => x.offsetParent).every(x => x.getBoundingClientRect().height >= 44)), 'the buttons are at least 44 px');
    const sc0 = await mp.evaluate(() => { const v = document.querySelector('.pgcp-pv-live'); v.scrollTop = 600; return v.scrollTop; }); await mp.waitForTimeout(900);
    ok(sc0 > 0, 'the preview scrolls like the real page');
    await mp.evaluate(() => { document.querySelector('.pgcp-pv-live').scrollTop = 0; }); await mp.waitForTimeout(1200); await mp.screenshot({ path: '/tmp/s102_live_phone.png' });
    // a wedding with no photos yet sees the demo wedding
    await mp.evaluate(() => { window.__ev = GALLERY.events; GALLERY.events = []; }); await mp.tap('.pgcp-pv-back'); await mp.waitForTimeout(400);
    await mp.locator('.pgcp-layout[data-layout="canvas-quiet"]').scrollIntoViewIfNeeded(); await mp.tap('.pgcp-layout[data-layout="canvas-quiet"]'); await mp.waitForSelector('.pgcp-pv-live .pgc'); await mp.waitForTimeout(800);
    ok(await mp.evaluate(() => { const im = [...document.querySelectorAll('.pgcp-pv-live img')].filter(i => i.src); return im.length > 0 && im.every(i => /\/app\/demo-wedding\//.test(i.src)) && /Anika/.test(document.querySelector('.pgcp-pv-live').textContent); }), 'no photos yet: PicGrades\' demo wedding photos and names');
    await mp.evaluate(() => { GALLERY.events = window.__ev; });
    await mp.tap('.pgcp-pv-size'); await mp.waitForSelector('.pgcp-pv-live .pgc-sec'); await mp.waitForTimeout(1500);
    ok(await mp.evaluate(() => document.querySelector('.pgcp-pv-livein').style.width === '1200px' && document.querySelector('.pgcp-pv-livein').getBoundingClientRect().width <= document.querySelector('.pgcp-pv-phone').getBoundingClientRect().width + 2), 'Laptop draws the laptop design, fitted into the preview');
    await mp.screenshot({ path: '/tmp/s102_live_laptop.png' });
    // a story template previews too (through its one-editor version)
    await mp.tap('.pgcp-pv-edit'); await mp.waitForSelector('.pgte .pgte-scroll .pgc-t-photo img', { timeout: 10000 }); await mp.waitForTimeout(600);
    const own = await mp.evaluate(() => [...document.querySelectorAll('.pgte .pgte-scroll .pgc-t-photo img')].map(i => i.dataset.photo).filter(Boolean));
    const ids = new Set(Object.keys(DRIVE.files));
    ok(own.length > 0 && own.every(id => ids.has(id)), 'Try your photos: the real template opens with the wedding\'s own photos (step 103)');
    ok(!frames.length, 'still no app-in-a-frame');
    await mp.screenshot({ path: '/tmp/s102_try.png' });
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
