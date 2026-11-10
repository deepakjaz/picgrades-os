// Browser test (step 38): pinned 2–5 buttons, back to top, and the classic (Pixieset-style) photo view.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'VIEWWEDDING0000000001';
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
}).listen(8795, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const PORT = ['sample_portrait.jpg', 'sample_portrait2.jpg'].map(f => fs.readFileSync(path.join(__dirname, 'fixtures', f)));
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; const k = [...id].reduce((a, c) => a + c.charCodeAt(0), 0); r.fulfill({ contentType: 'image/jpeg', body: k % 3 === 0 ? bytesOf(id) : PORT[k % 2] }); });
  const URL = 'http://localhost:8795/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await img(pg);
  await require('./fonts_local').install(pg);
  await pg.goto(URL); await boot(pg);
  // a long event (40 photos) to scroll
  await pg.evaluate(() => { const all = pgAllPhotos().map(x => x.p); const many = []; for (let i = 0; i < 40; i++) many.push(all[i % all.length]); GALLERY.events[0].photos = many.map((p, i) => Object.assign({}, p, { id: p.id + (i >= all.length ? '' : '') })); GALLERY.events[0].photos = many; pgOpenEvent(GALLERY.events[0].name); });
  await pg.waitForTimeout(800);
  const colsTop = () => pg.evaluate(() => Math.round(document.querySelector('#view-event .pgx-cols').getBoundingClientRect().top));
  const totop = () => pg.evaluate(() => document.querySelector('.pg-totop').classList.contains('show'));
  console.log('event page: buttons at', await colsTop(), '| back-to-top shown:', await totop());
  await pg.mouse.move(195, 500); await pg.mouse.wheel(0, 2500); await pg.waitForTimeout(700);
  console.log('scrolled', await pg.evaluate(() => scrollY), '| buttons pinned at', await colsTop(), '| back-to-top shown:', await totop());
  await pg.screenshot({ path: '/tmp/s38_pinned.png' });
  await pg.click('#view-event .pgx-cols button[data-n="3"]'); await pg.waitForTimeout(300);
  console.log('changed to 3 while scrolled:', await pg.evaluate(() => PGGrids.cols()));
  await pg.click('.pg-totop'); await pg.waitForTimeout(900);
  console.log('back to top →', await pg.evaluate(() => scrollY), '| button hidden:', !(await totop()));
  await pg.click('#view-event .pgx-cols button[data-n="2"]');
  // Moments grid: pinned + back to top
  await pg.evaluate(() => switchViewFromNav('moments')); await pg.waitForTimeout(500); await pg.click('.pgx-togrid'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { const g = document.querySelector('.pgx-mgrid'); g.scrollTop = 600; }); await pg.waitForTimeout(500); console.log('moments grid scrollTop', await pg.evaluate(() => document.querySelector('.pgx-mgrid').scrollTop));
  console.log('Moments grid scrolled: buttons at', await pg.evaluate(() => Math.round(document.querySelector('.pgx-mbar .pgx-cols').getBoundingClientRect().top)), '| back-to-top:', await totop());
  await pg.screenshot({ path: '/tmp/s38_moments_pinned.png' });
  if (await totop()) { await pg.click('.pg-totop'); await pg.waitForTimeout(900); console.log('… back to top:', await pg.evaluate(() => document.querySelector('.pgx-mgrid').scrollTop)); }
  await pg.click('.pgx-mgrid .pgx-cell >> nth=0'); await pg.waitForTimeout(400);
  console.log('Moments feed: no back-to-top:', !(await totop()));
  // photo view: live is the default
  await pg.evaluate(() => pgOpenEvent(GALLERY.events[0].name)); await pg.waitForTimeout(500);
  await pg.click('#view-event .pgx-cell[data-i="1"]'); await pg.waitForTimeout(700);
  console.log('default photo view:', await pg.evaluate(() => document.querySelector('.pg-view.active').id), '| classic open:', !!(await pg.locator('.pgcv').count()));
  await pg.click('#pgvBack'); await pg.waitForTimeout(500);
  // classic
  await pg.evaluate(() => { GALLERY.pages = { viewer: 'classic' }; });
  await pg.click('#view-event .pgx-cell[data-i="1"]'); await pg.waitForTimeout(900);
  const cv = () => pg.evaluate(() => ({ open: !!document.querySelector('.pgcv'), count: (document.querySelector('.pgcv-count') || {}).textContent, view: document.querySelector('.pg-view.active').id, img: (document.querySelector('.pgcv-img') || {}).naturalWidth }));
  console.log('classic photo view:', JSON.stringify(await cv()));
  await pg.screenshot({ path: '/tmp/s38_classic_phone.png' });
  await pg.click('.pgcv-next'); await pg.waitForTimeout(500); console.log('next →', (await cv()).count);
  const sw = async dx => { const s = await pg.$('.pgcv-stage'); const bb = await s.boundingBox(); await pg.touchscreen.tap; const cdp = await ctx.newCDPSession(pg); const y = bb.y + bb.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200 + dx, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(400); };
  await sw(-120); console.log('swipe left →', (await cv()).count); await sw(120); console.log('swipe right →', (await cv()).count);
  const id = await pg.evaluate(() => pgViewerClassic.current() && GALLERY.events[0].photos[pgViewerClassic.current().i].id);
  await pg.click('.pgcv-like'); await pg.waitForTimeout(700);
  console.log('heart:', await pg.evaluate(id => !!(GALLERY.mine || {})[id], id), '| shown liked:', await pg.evaluate(() => document.querySelector('.pgcv-like').classList.contains('liked')), await pg.textContent('.pgcv-like span'));
  await pg.click('.pgcv-note'); await pg.waitForTimeout(400); console.log('notes sheet:', await pg.$eval('#commentSheet', e => e.classList.contains('show')));
  await pg.goBack(); await pg.waitForTimeout(500); console.log('back closes notes, classic still open:', JSON.stringify(await cv()));
  await pg.goBack(); await pg.waitForTimeout(500); console.log('back closes the photo view → grid:', JSON.stringify(await cv()));
  // functions switched off hide their buttons
  await pg.evaluate(() => { GALLERY.features = Object.assign({}, GALLERY.features, { download: 'off' }); PGFeatures.paint(); });
  await pg.click('#view-event .pgx-cell[data-i="0"]'); await pg.waitForTimeout(500);
  console.log('download off → hidden:', !(await pg.isVisible('.pgcv-dl')), '| heart still there:', await pg.isVisible('.pgcv-like'));
  await pg.click('.pgcv-x'); await ctx.close();
  // laptop: arrows + keyboard
  const c2 = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p2 = await c2.newPage(); p2.on('pageerror', e => errors.push('laptop: ' + e.message)); await img(p2); await require('./fonts_local').install(p2);
  await p2.goto(URL); await boot(p2); await p2.evaluate(() => { GALLERY.pages = { viewer: 'classic' }; pgOpenEvent(GALLERY.events[0].name); }); await p2.waitForTimeout(500);
  await p2.click('#view-event .pgx-cell[data-i="0"]'); await p2.waitForTimeout(800);
  await p2.keyboard.press('ArrowRight'); await p2.waitForTimeout(500);
  console.log('laptop: arrow key →', await p2.textContent('.pgcv-count'));
  await p2.screenshot({ path: '/tmp/s38_classic_laptop.png' });
  await p2.evaluate(() => document.documentElement.setAttribute('data-tkg-theme', 'dark')); await p2.waitForTimeout(300); await p2.screenshot({ path: '/tmp/s38_classic_laptop_dark.png' });
  await p2.keyboard.press('Escape'); await p2.waitForTimeout(300); console.log('Esc closes:', !(await p2.locator('.pgcv').count()));
  await c2.close();
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
