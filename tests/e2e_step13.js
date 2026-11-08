// Browser test (step 13): Hub first in the nav, far photos let go, album editing (tap/drag/zoom/replace, drawings, petals, layouts differ), your own music in reels.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'EDITWEDDING0000000001';
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
}).listen(8777, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = r.request().url().match(/\/d\/([^=]+)/)[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id), headers: { 'Access-Control-Allow-Origin': '*' } }); });
  await pg.goto('http://localhost:8777/g/' + pub.galleryId + '?couple=' + ck);
  const navAtStart = await pg.evaluate(() => [...document.querySelectorAll('.tkg-nav-item.active')].map(a => a.dataset.nav).join());
  await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(600);
  console.log('nav while loading:', navAtStart, '| after load:', await pg.evaluate(() => [...document.querySelectorAll('.tkg-nav-item.active')].map(a => a.dataset.nav).join()), '| hub visible:', await pg.isVisible('#view-hub'), '| nav height:', await pg.$eval('.tkg-global-nav', e => e.getBoundingClientRect().height));
  await pg.screenshot({ path: '/tmp/s13_hub.png' });
  // Root Moment: far photos are let go
  await pg.click('.tkg-nav-item[data-nav=moments]'); await pg.waitForTimeout(400);
  await pg.$eval('#pgmFeed', f => f.scrollTo(0, f.clientHeight * 9)); await pg.waitForTimeout(900);
  console.log('reels photos in memory:', await pg.$$eval('#pgmFeed .pgm-item img', l => l.filter(i => i.src && !i.src.startsWith('data:')).length), 'of', await pg.locator('#pgmFeed .pgm-item').count());
  await pg.click('.tkg-nav-item[data-nav=hub]'); await pg.waitForTimeout(300);
  // album editor
  await pg.click('#pgcPost'); await pg.waitForSelector('.ps-wrap'); await pg.waitForFunction(() => PGPost.info(), null, { timeout: 20000 }); await pg.waitForTimeout(300);
  const sigs = {};
  for (const t of await pg.evaluate(() => PGPost.templates)) { await pg.evaluate(t => PGPost.set('tid', t), t); sigs[t] = JSON.stringify(await pg.evaluate(() => PGPost.info())); }
  console.log('templates with their own layout:', new Set(Object.values(sigs)).size, 'of', Object.keys(sigs).length);
  await pg.evaluate(() => PGPost.set('tid', 'album')); await pg.waitForTimeout(300);
  const box = await pg.$eval('.ps-prev canvas', c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const hit = await pg.evaluate(() => { const s = PGPost.state(); const h = (s.lastHit || [])[0]; return h; });
  const cw = await pg.$eval('.ps-prev canvas', c => c.width);
  const px = hit ? box.x + (hit.x + hit.w / 2) / cw * box.w : box.x + box.w * 0.08, py = hit ? box.y + (hit.y + hit.h / 2) / cw * box.w : box.y + box.h * 0.45;
  await pg.mouse.click(px, py); await pg.waitForTimeout(300);
  console.log('tap a photo selects it:', JSON.stringify(await pg.evaluate(() => PGPost.state().sel)), '| edit bar:', await pg.isVisible('.ps-edit'));
  await pg.mouse.move(px, py); await pg.mouse.down(); await pg.mouse.move(px + 30, py + 20, { steps: 6 }); await pg.mouse.up();
  await pg.$eval('.ps-edit .ps-range', r => { r.value = 1.8; r.dispatchEvent(new Event('input')); }); await pg.waitForTimeout(200);
  await pg.screenshot({ path: '/tmp/s13_edit.png' });
  console.log('drag + zoom saved for that photo:', JSON.stringify(await pg.evaluate(() => { const s = PGPost.state(); return s.sel && s.adj[s.sel.id]; })));
  const before = await pg.evaluate(() => PGPost.state().sel.id);
  await pg.locator('.ps-chip', { hasText: 'Replace photo' }).click(); await pg.waitForSelector('.ps-picker'); await pg.evaluate(() => { const used = PGPost.state().photos; [...document.querySelectorAll('.ps-pick')].find(b => !used.includes(b.dataset.id)).click(); }); await pg.waitForTimeout(1500);
  console.log('replaced:', before, '→', await pg.evaluate(() => (PGPost.state().sel || {}).id), '| old still in list:', await pg.evaluate(b => PGPost.state().photos.includes(b), before));
  const done = pg.locator('.ps-chip', { hasText: 'Done' }); if (await done.count()) await done.first().click();
  await pg.locator('.ps-sub', { hasText: 'Add flowers' }).click(); await pg.waitForSelector('.ps-sgrid');
  console.log('drawings to choose:', await pg.evaluate(() => PG_STICKERS.length), '| shown in first tab:', await pg.locator('.ps-stk').count());
  await pg.screenshot({ path: '/tmp/s13_stickers.png' });
  await pg.locator('.ps-stk').nth(19).click(); await pg.waitForTimeout(300);
  console.log('drawing added + selected:', JSON.stringify(await pg.evaluate(() => [PGPost.state().stickers.length, PGPost.state().sel])));
  await pg.$eval('.ps-edit .ps-range', r => { r.value = 260; r.dispatchEvent(new Event('input')); });
  if (await done.count()) await done.first().click();
  await pg.locator('.ps-tog', { hasText: 'Rose petal' }).locator('input').check(); await pg.waitForTimeout(300);
  await pg.screenshot({ path: '/tmp/s13_page.png' });
  const dls = []; pg.on('download', d => dls.push(d)); await pg.locator('.ps-sub', { hasText: 'Download' }).click(); await pg.waitForTimeout(4000);
  if (dls[0]) await dls[0].saveAs('/tmp/s13_slide1.jpg'); console.log('slides saved:', dls.length);
  await pg.evaluate(() => PGPost.close());
  // reels: your own music
  await pg.click('#pghReel'); await RE.toEditor(pg);
  await pg.click('.re-tool[data-tool=audio]'); await pg.setInputFiles('.rl-wrap input[type=file]', '/tmp/my_song.mp3');
  await pg.waitForFunction(() => /beats per minute|could not/i.test(document.querySelector('.re-v-edit .rl-msg').textContent), null, { timeout: 20000 });
  console.log('own music:', await pg.textContent('.re-v-edit .rl-msg'), '| track:', await pg.evaluate(() => JSON.stringify(PGReel.state ? PGReel.state().track : null)));
  await pg.screenshot({ path: '/tmp/s13_reel.png' });
  await pg.click('.re-sh-done'); await RE.setLength(pg, '15 s'); await RE.exportReel(pg);
  console.log('reel made with own music:', (await RE.videoInfo(pg))[2] + ' s');
  await pg.evaluate(() => PGReel.close()); console.log('after closing, own music kept anywhere:', await pg.evaluate(() => PGReel.state()), '| calls to server after album:', JSON.stringify([...new Set(ACTS.slice(ACTS.lastIndexOf('getGallery')))]));
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
