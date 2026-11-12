// Browser test (step 39): demo weddings — everyone gets the Control Panel; changes stay on their phone.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'DMOWEDDING00000000001';
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
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8794, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const URL = 'http://localhost:8794/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const phone = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); await img(p); await require('./fonts_local').install(p); return [c, p]; };
  // not a demo: a guest has no gear
  let [c1, g1] = await phone(); await g1.goto(URL); await boot(g1);
  console.log('normal wedding, guest:', await g1.evaluate(() => PGControl.role()), '| gear hidden:', await g1.evaluate(() => getComputedStyle(document.querySelector('.tkg-nav-item[data-nav=studio]')).display === 'none'));
  await c1.close();
  call('setDemo', { token: admin, g: pub.galleryId, on: 'yes' });
  // demo: photographer A tries things
  let [ca, pa] = await phone(); await pa.goto(URL); await boot(pa);
  console.log('demo wedding, visitor A:', await pa.evaluate(() => PGControl.role()), '| gear shown:', await pa.evaluate(() => getComputedStyle(document.querySelector('.tkg-nav-item[data-nav=studio]')).display !== 'none'));
  await pa.click('.tkg-nav-item[data-nav=studio]'); await pa.waitForSelector('.pgcp-sheet .pgcp-tcard'); await pa.waitForTimeout(400);
  console.log('panel badge:', await pa.textContent('.pgcp-badge'), '|', (await pa.textContent('.pgcp-who')).slice(0, 90));
  await pa.screenshot({ path: '/tmp/s39_demo_panel.png' });
  await pa.click('.pgcp-tcard[data-theme="jaipur-rose"]'); await pa.waitForSelector('.pgcp-pv-wait[hidden]', { state: 'attached', timeout: 20000 });
  console.log('apply button:', await pa.textContent('.pgcp-pv-apply')); await pa.click('.pgcp-pv-apply'); await pa.waitForTimeout(800);
  await pa.locator('.pgcp-style[data-pagekey=events][data-style=shapes]').scrollIntoViewIfNeeded(); await pa.click('.pgcp-style[data-pagekey=events][data-style=shapes]'); await pa.waitForSelector('.pgcp-pv-wait[hidden]', { state: 'attached', timeout: 20000 }); await pa.click('.pgcp-pv-apply'); await pa.waitForTimeout(800);
  await pa.click('.pgcp-tabs [data-tab=functions]'); await pa.waitForTimeout(300); await pa.click('.pgcp-sheet input.pgf-sw[data-k=reel]'); await pa.waitForTimeout(500);
  console.log('A sees: theme', await pa.evaluate(() => PGTheme.current()), '| events', await pa.evaluate(() => PGEvents.style()), '| reel', await pa.evaluate(() => GALLERY.features.reel));
  const G = call('getGallery', { g: pub.galleryId }).gallery;
  console.log('the wedding itself unchanged:', JSON.stringify({ theme: G.theme, pages: G.pages, reel: G.features.reel }));
  await pa.reload(); await boot(pa);
  console.log('A reopens: still theirs:', await pa.evaluate(() => PGTheme.current()), await pa.evaluate(() => PGEvents.style()), await pa.evaluate(() => GALLERY.features.reel));
  // photographer B on another phone sees the demo as it was
  let [cb, pb] = await phone(); await pb.goto(URL); await boot(pb);
  console.log('visitor B: role', await pb.evaluate(() => PGControl.role()), '| theme', JSON.stringify(await pb.evaluate(() => PGTheme.current())), '| events', await pb.evaluate(() => PGEvents.style()), '| reel', await pb.evaluate(() => GALLERY.features.reel));
  await cb.close();
  // A starts again
  await pa.click('.tkg-nav-item[data-nav=studio]'); await pa.waitForSelector('.pgcp-reset'); await pa.click('.pgcp-reset'); await pa.waitForTimeout(1500); await boot(pa);
  console.log('A "start again":', JSON.stringify(await pa.evaluate(() => PGTheme.current())), await pa.evaluate(() => PGEvents.style()), await pa.evaluate(() => GALLERY.features.reel));
  await ca.close();
  // the couple on a demo wedding still saves for real
  let [cc, pc] = await phone(); await pc.goto(URL + '?couple=' + ck); await boot(pc); await pc.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 });
  console.log('couple on a demo wedding: role', await pc.evaluate(() => PGControl.role()));
  await cc.close();
  call('setDemo', { token: admin, g: pub.galleryId, on: '' });
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
