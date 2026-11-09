// Browser test (step 33): feature switches — the couple switches functions off in 'Functions'; they vanish everywhere (Hub, layouts, viewer, Root Moment) and refuse to run; guests on other phones get the same.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'EDITSWEDDING000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['pS', 'Sangeet'], ['pW', 'Wedding'], ['pR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 5; i++) DRIVE.files['PS' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const f = DRIVE.files[id]; if (f && f.bytes) return Buffer.from(f.bytes); const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
// a 40 s test song at exactly 128 beats per minute (first beat at 0.30 s), made with plain JS + ffmpeg
(function makeSong() {
  const sr = 44100, bpm = 128, off = 0.30, dur = 40, x = new Float32Array(sr * dur);
  for (let k = 0; k < Math.floor((dur - off) * bpm / 60); k++) { const i0 = Math.floor((off + k * 60 / bpm) * sr), n = Math.floor(0.08 * sr);
    for (let j = 0; j < n && i0 + j < x.length; j++) { const t = j / sr; x[i0 + j] += Math.sin(2 * Math.PI * (60 + 80 * Math.exp(-t * 30)) * t) * Math.exp(-t / 0.02) * (k % 4 ? 0.6 : 1); } }
  const b = Buffer.alloc(44 + x.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 0.8 * 32767))), 44 + i * 2);
  fs.writeFileSync('/tmp/beat128.wav', b);
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', '/tmp/beat128.wav', '-b:a', '128k', '/tmp/my_song.mp3']);
})();
const ACTS = [];
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); ACTS.push(p.action); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8798, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8798/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  const shown = sel => pg.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
  const openFunctions = async () => { await pg.waitForFunction(() => PGControl.role() !== 'guest', null, { timeout: 10000 }); await pg.click('.tkg-nav-item[data-nav=studio]'); await pg.waitForSelector('.pgcp-sheet'); await pg.click('.pgcp-tabs [data-tab=functions]'); };
  console.log('Control Panel gear (couple):', await shown('.tkg-nav-item[data-nav=studio]'));
  await openFunctions();
  console.log('switches:', (await pg.locator('.pgf-row b').allTextContents()).join(', '), '| all on:', await pg.$$eval('.pgf-sw', l => l.every(x => x.checked)));
  await pg.screenshot({ path: '/tmp/s33_sheet.png' });
  const flip = async k => { await pg.click('.pgf-sw[data-k=' + k + ']'); await pg.waitForTimeout(400); };
  for (const k of ['reel', 'hearts', 'download', 'upload']) await flip(k);
  await pg.waitForTimeout(500);
  const saved = call('getGallery', { g: pub.galleryId }).gallery.features;
  console.log('saved in the backend:', JSON.stringify(saved));
  await pg.screenshot({ path: '/tmp/s33_sheet_off.png' });
  await pg.click('.pgcp-sheet .ios-wide');
  console.log('Hub: Reel tile hidden:', !(await shown('#pghReel')), '| Add a moment hidden:', !(await shown('#pgcUpload')), '| Post still there:', await shown('#pgcPost'));
  console.log('Reel opener refuses:', await pg.evaluate(() => { pgOpenReel([{ id: 'x' }]); return !document.querySelector('.rl-wrap'); }));
  // viewer: heart + download hidden, double-tap heart does nothing
  await pg.evaluate(() => openCollection(GALLERY.events[0].name, 0)); await pg.waitForTimeout(800);
  console.log('viewer: heart hidden:', !(await shown('#pgvLike')), '| download hidden:', !(await shown('#pgvSave')), '| share still there:', await shown('#pgvShare'));
  const before = await pg.evaluate(() => GALLERY.likes[MOMENTS[0].id] || 0); await pg.evaluate(() => pgToggleLike(MOMENTS[0])); await pg.waitForTimeout(300);
  console.log('heart refuses:', (await pg.evaluate(() => GALLERY.likes[MOMENTS[0].id] || 0)) === before);
  await pg.screenshot({ path: '/tmp/s33_viewer.png' });
  await pg.evaluate(() => switchViewFromNav('hub'));
  // layouts follow the switches
  await pg.evaluate(() => PGLayout.apply('bento-concierge')); await pg.waitForTimeout(500);
  console.log('layout: blocks', await pg.$$eval('#pgLay .pgl-b', l => l.map(b => b.dataset.block).join(' ')), '| no number box:', !(await pg.locator('#pgLay .pgl-stats').count()), '| gear:', await shown('.tkg-nav-item[data-nav=studio]'));
  await pg.screenshot({ path: '/tmp/s33_layout.png', fullPage: true });
  await pg.evaluate(() => { PGLayout.reset(); PGTheme.reset(); });
  // a guest on another phone (no couple link)
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const g2 = await ctx2.newPage();
  await g2.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await g2.goto('http://localhost:8798/g/' + pub.galleryId); await g2.waitForSelector('#pgBoot.hide', { state: 'attached' }); await g2.waitForTimeout(600);
  console.log('guest: Reel hidden:', await g2.evaluate(() => getComputedStyle(document.getElementById('pghReel')).display === 'none'), '| no gear for guests:', !(await g2.evaluate(() => getComputedStyle(document.querySelector('.tkg-nav-item[data-nav=studio]')).display !== 'none')));
  await ctx2.close();
  // switch back on
  await openFunctions(); for (const k of ['reel', 'hearts', 'download', 'upload']) await flip(k); await pg.click('.pgcp-sheet .ios-wide');
  console.log('all back on:', Object.values(call('getGallery', { g: pub.galleryId }).gallery.features).every(v => v === 'on'), '| Reel tile back:', await shown('#pghReel'));
  // photographer's page (faces.html): the same switches
  const ctx3 = await b.newContext({ viewport: { width: 900, height: 1100 } }); const ph = await ctx3.newPage(); const perr = []; ph.on('pageerror', e => perr.push(e.message));
  await ph.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await ph.addInitScript(t => { try { localStorage.setItem('pg_token', t); } catch (e) {} }, admin);
  await ph.goto('http://localhost:8798/app/faces.html?g=' + pub.galleryId); await ph.waitForSelector('#featList .feat-row', { timeout: 20000 });
  console.log('photographer page: switches', await ph.locator('#featList .feat-row').count());
  await ph.click('#featList input[data-k=share]'); await ph.waitForFunction(() => /is off/.test(document.getElementById('featMsg').textContent), null, { timeout: 10000 });
  console.log('photographer switched Share off:', call('getGallery', { g: pub.galleryId }).gallery.features.share);
  await ph.locator('#featList').scrollIntoViewIfNeeded(); await ph.screenshot({ path: '/tmp/s33_photographer.png', clip: await ph.locator('#sendCard').boundingBox() });
  await ph.click('#featList input[data-k=share]'); await ph.waitForFunction(() => /is on/.test(document.getElementById('featMsg').textContent), null, { timeout: 10000 });
  console.log('… and back on:', call('getGallery', { g: pub.galleryId }).gallery.features.share, '| page errors:', perr);
  await ctx3.close();
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
