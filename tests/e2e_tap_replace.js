// Browser test (step 24): tap a photo on the paused Reel Edits preview → gold outline + pop-up for that photo → Replace swaps only that photo (also inside a grid).
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
}).listen(8787, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8787/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  await pg.click('#pghReel'); await RE.toEditor(pg, 'dynamic');
  console.log('hint:', await pg.textContent('.re-v-edit .rl-msg'));
  const tapAt = async (t, fx, fy) => {   // seek to t, tap at a fraction of the preview
    await pg.evaluate(t => { const tl = document.querySelector('.re-tl'); tl.scrollTo(t * 48, 0); }, t); await pg.waitForTimeout(350);
    const bx = await pg.locator('.re-v-edit .re-stage canvas').boundingBox(); await pg.mouse.click(bx.x + bx.width * fx, bx.y + bx.height * fy); await pg.waitForTimeout(300);
  };
  let st = await pg.evaluate(() => PGReel.state());
  const single = st.segs.findIndex(g => g.type === 'shot' && g.ids.length === 1), grid = st.segs.findIndex(g => g.type === 'shot' && g.ids.length >= 3);
  console.log('single shot #', single, st.segs[single].layout, '| grid shot #', grid, grid > -1 ? st.segs[grid].layout + ' (' + st.segs[grid].ids.length + ' photos)' : 'none');
  // 1. a single photo
  const s1 = st.segs[single]; await tapAt(s1.start + s1.dur * 0.6, 0.5, 0.5);
  console.log('pop-up:', await pg.textContent('.re-sheet .re-sh-top b'), '|', await pg.textContent('.re-thisone span'), '| gold outline:', await pg.isVisible('.re-sel'));
  await pg.screenshot({ path: '/tmp/s24_single.png' });
  await pg.click('.re-repl'); await pg.waitForSelector('.rl-picker');
  const pickId = await pg.$$eval('.rl-pick', (l, cur) => l.map(t => t.dataset.id).find(id => id !== cur), s1.ids[0]);
  await pg.click('.rl-pick[data-id="' + pickId + '"]'); await pg.click('.rl-picker .re-next'); await pg.waitForSelector('.rl-picker', { state: 'detached' }); await pg.waitForTimeout(600);
  st = await pg.evaluate(() => PGReel.state());
  console.log('single replaced:', st.segs[single].ids[0] === pickId, '| pop-up back for it:', await pg.isVisible('.re-thisone'), '| undo steps:', st.undo);
  await pg.click('.re-sh-done');
  // 2. one photo inside a grid
  if (grid > -1) {
    const g = st.segs[grid];
    // tap near the bottom-right area: should pick a tile other than the first
    await tapAt(g.start + g.dur * 0.7, 0.8, 0.8);
    const title = await pg.textContent('.re-sheet .re-sh-top b'); console.log('grid tap:', title, '| outline:', await pg.isVisible('.re-sel'));
    await pg.screenshot({ path: '/tmp/s24_grid.png' });
    const slot = +((title.match(/photo (\d+) of/) || [0, 1])[1]) - 1, before = g.ids.slice();
    await pg.click('.re-repl'); await pg.waitForSelector('.rl-picker');
    const pid = await pg.$$eval('.rl-pick', (l, cur) => l.map(t => t.dataset.id).find(id => cur.indexOf(id) < 0), before);
    await pg.click('.rl-pick[data-id="' + pid + '"]'); await pg.click('.rl-picker .re-next'); await pg.waitForSelector('.rl-picker', { state: 'detached' }); await pg.waitForTimeout(500);
    const after = (await pg.evaluate(() => PGReel.state())).segs[grid].ids;
    console.log('grid: only photo', slot + 1, 'changed:', after.every((id, k) => k === slot ? id === pid : id === before[k]));
    await pg.click('.re-sh-done');
  }
  // 3. tapping while playing only pauses
  await pg.click('.re-play'); await pg.waitForTimeout(700);
  const bx = await pg.locator('.re-v-edit .re-stage canvas').boundingBox(); await pg.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await pg.waitForTimeout(200);
  console.log('tap while playing → paused, no pop-up:', await pg.isVisible('.re-sheet') === false);
  await pg.evaluate(() => PGReel.close());
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
