// Browser test (step 77, phase 1): free-canvas layouts — the same layout drawn with its phone spots and its laptop spots,
// from the wedding's own names, events and photos; event cards and buttons work; nothing sticks out sideways.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'CANVASWEDDING0000001';
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
}).listen(8801, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8801/g/' + pub.galleryId;
  for (const [vw, vh, tag] of [[390, 844, 'phone'], [1440, 900, 'laptop'], [360, 740, 'small']]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh } }); const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(pg);
    for (const id of ['canvas-quiet', 'canvas-night']) {
      await pg.goto(URL + '?layout=' + id); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForSelector('#pgStory .pgc', { timeout: 10000 });
      const H = await pg.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += 300) { await pg.evaluate(y => scrollTo(0, y), y); await pg.waitForTimeout(120); }
      await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(900);
      const info = await pg.evaluate(() => { const r = document.querySelector('.pgc'); return { mode: r.dataset.mode, names: r.textContent.includes('Anika'), evs: r.querySelectorAll('[data-ev]').length, wide: document.documentElement.scrollWidth <= innerWidth + 1, imgs: r.querySelectorAll('img').length, hidden: [...r.querySelectorAll('.pgc-m-fade,.pgc-m-rise')].filter(x => !x.classList.contains('in')).length }; });
      ok(info.mode === (vw >= 700 ? 'l' : 'p'), tag + ' ' + id + ': ' + (vw >= 700 ? 'laptop' : 'phone') + ' spots');
      ok(info.names && info.evs === 4 && info.imgs >= 3 && info.wide && !info.hidden, tag + ' ' + id + ': names, 4 events, photos, nothing sideways, every part shown after scrolling ' + JSON.stringify(info));
      if (process.env.SHOTS) for (let y = 0, n = 0; y < H && n < 8; y += vh - 60, n++) { await pg.evaluate(y => scrollTo(0, y), y); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/cv_' + tag + '_' + id + '_' + n + '.png' }); }
    }
    if (tag === 'phone') {   // step 77c: the layout's own Find me button replaces the floating one
      await pg.goto(URL + '?layout=canvas-quiet'); await pg.waitForSelector('#pgStory .pgc'); await pg.waitForTimeout(400);
      const fmx = await pg.evaluate(() => ({ own: !!document.querySelector('.pgc [data-act="findme"]'), floating: !!document.querySelector('.pgs-findme'), can: PGLayout.storyData().can }));
      ok(!fmx.floating && fmx.own === fmx.can.findme, 'the layout\'s own Find me button follows the app\'s rules (shown only when Find me is on for this guest), never a second floating one ' + JSON.stringify(fmx));
    }
    if (tag === 'phone') {   // event cards and buttons do what they say
      await pg.goto(URL + '?layout=canvas-quiet'); await pg.waitForSelector('#pgStory .pgc');
      await pg.evaluate(() => document.querySelector('.pgc [data-ev="1"]').click()); await pg.waitForTimeout(700);
      ok(await pg.evaluate(() => document.body.dataset.view !== 'hub' || !!document.querySelector('.pg-collection, #view-collection.active, .collection-view')), 'an event card opens that event');
    }
    await ctx.close();
  }
  { // a layout from a collection (the Canvas tab), applied to the wedding, reaches guests with the wedding
    const LJ = JSON.parse(fs.readFileSync(path.join(root, 'app/themes/layouts.json'))), doc = LJ.layouts.find(l => l.id === 'canvas-night').canvas;
    const coll = call('canvasSave', { token: admin, item: { kind: 'collection', name: 'Night', scope: 'all' } });
    const lay = call('canvasSave', { token: admin, item: { kind: 'layout', name: 'Night Gallery (saved)', collection: coll.id, scope: 'all', doc } });
    ok(call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: lay.id }).layout === lay.id, 'the couple applies a layout from a collection');
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('3') }));
    await pg.goto(URL); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForSelector('#pgStory .pgc', { timeout: 10000 });
    ok(await pg.evaluate(id => PGLayout.current() === id && document.querySelectorAll('#pgStory .pgc-sec').length === 4, lay.id), 'a guest sees it');
    await ctx.close(); call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: '' });
  }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
