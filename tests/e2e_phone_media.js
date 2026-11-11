// Browser test (step 23): photos and videos from the phone in Reel Edits — picked in the picker, played in sync, made into a reel, let go on close; nothing sent to the server.
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
}).listen(8786, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8786/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  const FIX = require('path').join(__dirname, 'fixtures');
  const pageVideos = await pg.locator('video').count();
  const calls = []; pg.on('request', r => { if (r.method() === 'POST') calls.push(r.postData() || ''); });
  await pg.click('#pghReel'); await pg.waitForSelector('.rl-wrap[data-view=inspo]', { timeout: 30000 });
  await pg.locator('.re-ins .re-use').first().click(); await pg.waitForSelector('.rl-picker');
  console.log('phone button:', await pg.textContent('.re-phone'), '| note:', await pg.textContent('.re-pnote'));
  const before = calls.length;
  await pg.setInputFiles('.rl-picker .re-pin', [FIX + '/phone_clip.webm', FIX + '/phone_photo.jpg']);
  await pg.waitForFunction(() => /From your phone/.test(document.querySelector('.rl-picker .re-colsel').selectedOptions[0].textContent) && document.querySelectorAll('.rl-picker .rl-pick').length === 2, null, { timeout: 30000 });   // step 53: no count in the menu
  console.log('phone collection:', await pg.$eval('.rl-picker .re-colsel', s => s.selectedOptions[0].textContent), '| tiles:', await pg.locator('.rl-pick').count(), '| video badge:', await pg.textContent('.rl-pick u'), '| chosen:', await pg.textContent('.rl-pcount'));
  await pg.screenshot({ path: '/tmp/s23_picker.png' });
  await pg.click('.rl-picker .re-next'); await pg.waitForSelector('.rl-wrap[data-view=edit]', { timeout: 30000 }); await pg.waitForTimeout(800);
  const segs = await pg.evaluate(() => PGReel.state());
  console.log('editor:', segs.shots, 'shots | video clips on the timeline:', await pg.locator('.re-clip .re-vmark').count());
  // jump to the video clip and check the frame moves with time
  const vclip = pg.locator('.re-clip:has(.re-vmark)').first(); await vclip.click(); await pg.waitForSelector('.re-sheet');
  console.log('video clip sheet:', await pg.textContent('.re-sheet .rl-lbl'));
  await pg.locator('.re-sheet .re-tool', { hasText: 'Start later' }).click(); await pg.waitForTimeout(300);
  console.log('after Start later:', await pg.textContent('.re-sheet .rl-lbl'));
  await pg.click('.re-sh-done');
  const vt = await pg.evaluate(() => { const v = document.querySelector('.rl-wrap video'); return v ? Math.round(v.currentTime * 10) / 10 : null; });
  console.log('paused on the video clip, video time:', vt);
  await pg.screenshot({ path: '/tmp/s23_editor.png' });
  await pg.click('.re-play'); await pg.waitForTimeout(1500);
  console.log('video plays with the reel:', await pg.evaluate(() => { const v = document.querySelector('.rl-wrap video'); return !v.paused || v.currentTime > 0; }));
  await pg.click('.re-play'); await pg.waitForTimeout(200);
  console.log('video paused with the reel:', await pg.evaluate(() => document.querySelector('.rl-wrap video').paused));
  await RE.setLength(pg, '15 s');
  console.log('export:', await RE.exportReel(pg), '| video:', JSON.stringify(await RE.videoInfo(pg)));
  await pg.screenshot({ path: '/tmp/s23_export.png' });
  const sent = calls.slice(before).filter(d => /phone|ph:/.test(d));
  console.log('phone files sent to the server:', sent.length);
  await pg.evaluate(() => PGReel.close());
  console.log('after close: Reel Edits videos left:', (await pg.locator('video').count()) - pageVideos, '(gallery page has', pageVideos + ')');
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
