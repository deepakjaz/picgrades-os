// Browser test (step 35): the event page as a photo grid (like Pixieset) and Moments as an Instagram-style grid; 2–5 in a row, pinch, back.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'GRIDWEDDING0000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['pS', 'Sangeet'], ['pW', 'Wedding'], ['pR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 5; i++) DRIVE.files['PS' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const f = DRIVE.files[id]; if (f && f.bytes) return Buffer.from(f.bytes); const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const ACTS = [];
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); ACTS.push(p.action); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8797, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const URL = 'http://localhost:8797/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await img(pg);
  await require('./fonts_local').install(pg);
  await pg.goto(URL); await boot(pg);
  // Events → one event's grid
  await pg.evaluate(() => switchViewFromNav('gallery')); await pg.waitForTimeout(400);
  await pg.click('.pg-collection >> nth=0'); await pg.waitForTimeout(700);
  const st = () => pg.evaluate(() => ({ view: document.querySelector('.pg-view.active').id, cols: new Set([...document.querySelectorAll('#view-event .pgx-cell')].map(c => Math.round(c.getBoundingClientRect().left))).size, cells: document.querySelectorAll('#view-event .pgx-cell').length, nav: (document.querySelector('.tkg-nav-item.active') || {}).dataset?.nav }));
  console.log('event card opens the grid page:', JSON.stringify(await st()), '| title', await pg.textContent('#pgxTitle'), '|', await pg.textContent('#pgxSub'));
  await pg.screenshot({ path: '/tmp/s35_event_2.png' });
  await pg.click('#view-event .pgx-cols button[data-n="4"]'); await pg.waitForTimeout(400);
  console.log('4 in a row:', (await st()).cols, '| remembered:', await pg.evaluate(() => localStorage.getItem('pg_cols')));
  await pg.screenshot({ path: '/tmp/s35_event_4.png' });
  await pg.click('#view-event .pgx-cols button[data-n="5"]'); await pg.waitForTimeout(300); console.log('5 in a row:', (await st()).cols);
  await pg.click('#view-event .pgx-cols button[data-n="2"]'); await pg.waitForTimeout(300);
  await pg.click('#view-event .pgx-cell[data-i="2"]'); await pg.waitForTimeout(900);
  console.log('tap photo 3 → viewer:', await pg.evaluate(() => document.querySelector('.pg-view.active').id), '| at photo', await pg.evaluate(() => activeIdx + 1), 'of', await pg.evaluate(() => MOMENTS.length));
  await pg.click('#pgvBack'); await pg.waitForTimeout(500);
  console.log('viewer back arrow → the grid again:', await pg.evaluate(() => document.querySelector('.pg-view.active').id));
  await pg.click('#view-event .pgx-cell >> nth=1'); await pg.waitForTimeout(700); await pg.goBack(); await pg.waitForTimeout(600);
  console.log('phone back from viewer → grid:', await pg.evaluate(() => document.querySelector('.pg-view.active').id));
  await pg.goBack(); await pg.waitForTimeout(600);
  console.log('phone back from grid → events:', await pg.evaluate(() => document.querySelector('.pg-view.active').id));
  // pinch with two fingers: closer = more in a row
  const cdp = await ctx.newCDPSession(pg);
  await pg.click('.pg-collection >> nth=0'); await pg.waitForTimeout(500);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  await touch('touchStart', [[120, 330], [270, 330]]); await touch('touchMove', [[150, 330], [240, 330]]); await touch('touchMove', [[170, 330], [220, 330]]); await touch('touchEnd', []);
  await pg.waitForTimeout(400); console.log('pinch in → more in a row:', (await st()).cols);
  await touch('touchStart', [[180, 330], [210, 330]]); await touch('touchMove', [[120, 330], [270, 330]]); await touch('touchEnd', []);
  await pg.waitForTimeout(400); console.log('pinch out → fewer:', (await st()).cols, '| page not zoomed:', await pg.evaluate(() => !window.visualViewport || (visualViewport.scale === 1 && visualViewport.offsetTop === 0)));
  // Loved photos from the Hub opens as a grid
  await pg.evaluate(() => { const a = pgAllPhotos().map(x => x.p.id); GALLERY.likes = { [a[0]]: 3, [a[4]]: 2 }; switchViewFromNav('hub'); pgStatTap('hearts'); }); await pg.waitForTimeout(500);
  console.log('Loved photos:', JSON.stringify(await st()), await pg.textContent('#pgxTitle'));
  await pg.click('#view-event .pgx-cell >> nth=1'); await pg.waitForTimeout(700);
  console.log('… opens in the viewer:', await pg.evaluate(() => document.querySelector('.pg-view.active').id + ' ' + CURRENT_SET + ' ' + (activeIdx + 1) + '/' + MOMENTS.length));
  // Moments: the feed by default (as before) → grid button → tap a photo = the feed at that photo
  await pg.evaluate(() => switchViewFromNav('moments')); await pg.waitForTimeout(700);
  const ms = () => pg.evaluate(() => ({ grid: document.body.classList.contains('pgm-grid'), cells: document.querySelectorAll('.pgx-mgrid .pgx-cell').length, feed: document.querySelectorAll('#pgmFeed .pgm-item').length, top: Math.round(document.getElementById('pgmFeed').scrollTop) }));
  console.log('Moments opens as the feed (default):', JSON.stringify(await ms()));
  await pg.screenshot({ path: '/tmp/s36_moments_feed_default.png' });
  await pg.click('.pgx-togrid'); await pg.waitForTimeout(500);
  console.log('grid button → grid:', JSON.stringify(await ms()));
  await pg.screenshot({ path: '/tmp/s35_moments_grid.png' });
  await pg.click('.pgx-mgrid .pgx-cell >> nth=3'); await pg.waitForTimeout(700);
  const at = await pg.evaluate(() => { const f = document.getElementById('pgmFeed'); return Array.from(f.children).findIndex(x => Math.abs(x.offsetTop - f.scrollTop) < 5); });
  console.log('tap moment 4 → feed:', JSON.stringify(await ms()), '| showing item', at + 1);
  await pg.click('.pgx-togrid'); await pg.waitForTimeout(400); await pg.goBack(); await pg.waitForTimeout(500);
  console.log('phone back from the grid → feed:', !(await ms()).grid, '| still on Moments:', await pg.evaluate(() => document.querySelector('.pg-view.active').id));
  await pg.click('.pgx-togrid'); await pg.waitForTimeout(300); await pg.evaluate(() => switchViewFromNav('hub')); await pg.evaluate(() => switchViewFromNav('moments')); await pg.waitForTimeout(400);
  console.log('opening Moments again starts with the feed:', !(await ms()).grid);
  // event page styles: collage (default), mosaic, grid — chosen by the wedding
  // a mix of tall and wide photos, as in a real wedding (the test photos are all wide)
  const PORT = ['sample_portrait.jpg', 'sample_portrait2.jpg'].map(f => require('fs').readFileSync(require('path').join(__dirname, 'fixtures', f)));
  await pg.unroute('https://lh3.googleusercontent.com/**');
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; const k = [...id].reduce((a, c) => a + c.charCodeAt(0), 0); r.fulfill({ contentType: 'image/jpeg', body: k % 3 === 0 ? bytesOf(id) : PORT[k % 2] }); });
  await pg.evaluate(() => { const ev = GALLERY.events[0]; const all = pgAllPhotos().map(x => x.p); ev.photos = all.slice(0, 12); });
  for (const st of ['collage', 'mosaic', 'grid']) {
    await pg.evaluate(s => { GALLERY.pages = { event: s }; pgOpenEvent(GALLERY.events[0].name); }, st); await pg.waitForTimeout(900);
    const info = await pg.evaluate(() => { const g = document.querySelector('#view-event .pgx-grid'); const cells = [...g.querySelectorAll('.pgx-cell')].map(c => Math.round(c.getBoundingClientRect().height)); return { cls: g.className, cols: g.querySelectorAll('.pgx-col').length, heights: cells.join(',') }; });
    console.log('event page', st, JSON.stringify(info));
    await pg.screenshot({ path: '/tmp/s36_event_' + st + '.png' });
  }
  await pg.evaluate(() => { delete GALLERY.pages; });
  await ctx.close();
  // big screens: more in a row
  for (const [w, hgt, nm] of [[820, 1180, 'tablet'], [1440, 900, 'desktop']]) {
    const c2 = await b.newContext({ viewport: { width: w, height: hgt } }); const p2 = await c2.newPage(); p2.on('pageerror', e => errors.push(nm + ': ' + e.message)); await img(p2); await require('./fonts_local').install(p2);
    await p2.goto(URL); await boot(p2); await p2.evaluate(() => { switchViewFromNav('gallery'); }); await p2.waitForTimeout(300); await p2.click('.pg-collection >> nth=0'); await p2.waitForTimeout(800); await p2.evaluate(() => { GALLERY.pages = { event: 'mosaic' }; PGGrids.refresh(); }); await p2.waitForTimeout(600);
    console.log(nm, 'event grid: in a row', await p2.evaluate(() => new Set([...document.querySelectorAll('#view-event .pgx-cell')].map(c => Math.round(c.getBoundingClientRect().left))).size));
    await p2.screenshot({ path: '/tmp/s35_event_' + nm + '.png' });
    await p2.evaluate(() => switchViewFromNav('moments')); await p2.waitForTimeout(500); await p2.click('.pgx-togrid'); await p2.waitForTimeout(700); await p2.screenshot({ path: '/tmp/s35_moments_' + nm + '.png' });
    await c2.close();
  }
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
