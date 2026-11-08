// Browser test (step 27): reel template previews with sound (muted first, glowing button, one at a time), Post Edits undo/redo, downloads as real JPEG (iPhone share / Android download).
const PE = require('./post_helper');
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
}).listen(8790, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8790/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  // ---- 1. reel template previews: sound ----
  await pg.click('#pghReel'); await pg.waitForSelector('.rl-wrap[data-view=inspo]', { timeout: 30000 }); await pg.waitForTimeout(1200);
  console.log('first look: muted:', !(await pg.evaluate(() => PGReel.state().sound)), '| button:', await pg.textContent('.re-mute'), '| glowing:', await pg.$eval('.re-mute', b => b.classList.contains('glow')), '| sound playing:', await pg.evaluate(() => PGReel.state().soundPlaying));
  await pg.screenshot({ path: '/tmp/s27_muted.png' });
  await pg.click('.re-mute'); await pg.waitForFunction(() => PGReel.state().soundPlaying, null, { timeout: 15000 });
  console.log('after tap: sound on:', await pg.evaluate(() => PGReel.state().sound), '| playing:', await pg.evaluate(() => PGReel.state().soundPlaying), '| glow gone:', !(await pg.$eval('.re-mute', b => b.classList.contains('glow'))));
  await pg.screenshot({ path: '/tmp/s27_sound.png' });
  const first = await pg.evaluate(() => PGReel.state().style);
  await pg.$eval('.re-feed', f => f.scrollTo(0, f.clientHeight)); await pg.waitForTimeout(1500);
  const st2 = await pg.evaluate(() => PGReel.state());
  console.log('scrolled to next style:', first, '→', st2.style, '| still sound on:', st2.sound, '| playing (only this one):', st2.soundPlaying, '| button moved to it:', await pg.$eval('.re-ins:nth-child(2) .re-mute', b => !!b).catch(() => false));
  await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await pg.waitForTimeout(200);
  console.log('switch app → sound stopped:', !(await pg.evaluate(() => PGReel.state().soundPlaying)));
  await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await pg.waitForFunction(() => PGReel.state().soundPlaying, null, { timeout: 15000 });
  console.log('back → sound again:', await pg.evaluate(() => PGReel.state().soundPlaying));
  await pg.locator('.re-ins:nth-child(2) .re-use').click(); await pg.waitForSelector('.rl-picker'); await pg.waitForTimeout(300);
  console.log('Use template → feed sound stopped:', !(await pg.evaluate(() => PGReel.state().soundPlaying)));
  await pg.evaluate(() => PGReel.close());
  // ---- 2. Post Edits undo / redo ----
  await PE.toEdit(pg);
  console.log('undo at start disabled:', await pg.$eval('.pe-ur[aria-label=Undo]', b => b.disabled));
  const t0 = (await pg.evaluate(() => PGPost.state())).tid;
  await PE.template(pg, 'Film'); await pg.waitForTimeout(500);
  await PE.tool(pg, 'filters'); await pg.click('.pe-filter[data-f=bw]'); await PE.done(pg); await pg.waitForTimeout(500);
  await PE.tool(pg, 'text'); await pg.fill('.pe-sheet .ps-in', 'Anika & Rohan forever'); await pg.waitForTimeout(600); await PE.done(pg);
  let s = await pg.evaluate(() => PGPost.state()); console.log('after 3 changes:', s.tid, s.filter, JSON.stringify(s.names), '| undo steps:', s.undo);
  await pg.click('.pe-ur[aria-label=Undo]'); s = await pg.evaluate(() => PGPost.state()); console.log('undo 1 → names:', JSON.stringify(s.names), '| filter still', s.filter);
  await pg.click('.pe-ur[aria-label=Undo]'); s = await pg.evaluate(() => PGPost.state()); console.log('undo 2 → filter:', s.filter);
  await pg.click('.pe-ur[aria-label=Undo]'); s = await pg.evaluate(() => PGPost.state()); console.log('undo 3 → template back to', s.tid, '(was', t0 + ') | undo disabled now:', await pg.$eval('.pe-ur[aria-label=Undo]', b => b.disabled));
  await pg.click('.pe-ur[aria-label=Redo]'); await pg.click('.pe-ur[aria-label=Redo]'); s = await pg.evaluate(() => PGPost.state()); console.log('redo ×2 →', s.tid, s.filter, '| redo left:', s.redo);
  await pg.screenshot({ path: '/tmp/s27_undo.png' });
  // drag a photo = one step
  const before = s.undo; const p = await PE.tapPhoto(pg, 0); await pg.mouse.move(p.x, p.y); await pg.mouse.down(); for (let k = 1; k <= 8; k++) await pg.mouse.move(p.x + k * 5, p.y + k * 3); await pg.mouse.up(); await pg.waitForTimeout(600);
  await PE.done(pg); await pg.waitForTimeout(500); s = await pg.evaluate(() => PGPost.state()); console.log('a whole drag counts as', s.undo - before, 'step');
  await pg.evaluate(() => PGPost.close());
  // ---- 3. downloads: real JPEG; Android = normal download ----
  console.log('WebP → JPEG:', await pg.evaluate(async () => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; c.getContext('2d').fillRect(0, 0, 40, 30); const b = await new Promise(r => c.toBlob(r, 'image/webp')); const j = await pgAsJpeg(b); return b.type + ' → ' + j.type; }));
  console.log('iPhone check on this Android phone:', await pg.evaluate(() => PG_IOS));
  await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.waitForTimeout(800);
  const dl = pg.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await pg.evaluate(() => pgDownload(MOMENTS[0])); const d = await dl;
  console.log('Android download:', d ? d.suggestedFilename() : 'none');
  if (d) { const f = '/tmp/s27_dl.jpg'; await d.saveAs(f); const head = require('fs').readFileSync(f).slice(0, 3).toString('hex'); console.log('file starts with', head, head === 'ffd8ff' ? '(JPEG)' : '(not JPEG)'); }
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
