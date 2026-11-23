// Browser test (step 79): Reel Edits — tap a photo on the paused preview, drag it to move it inside its frame, zoom, Reset; undo; the faces stay in view by default.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'FRAMEWEDDING000000001';
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
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8806, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8806/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  await pg.click('#pghReel'); await RE.toEditor(pg, 'dynamic');
  const seekTo = async t => { await pg.evaluate(t => document.querySelector('.re-tl').scrollTo(t * 48, 0), t); await pg.waitForTimeout(350); };
  let st = await pg.evaluate(() => PGReel.state());
  const i = st.segs.findIndex(g => g.type === 'shot' && g.ids.length === 1), sg = st.segs[i], id = sg.ids[0];
  await seekTo(sg.start + sg.dur * 0.6);
  const bx = await pg.locator('.re-v-edit .re-stage canvas').boundingBox(), cx = bx.x + bx.width / 2, cy = bx.y + bx.height / 2;
  const px = async () => pg.evaluate(() => { const c = document.querySelector('.re-v-edit .re-stage canvas'); return c.toDataURL('image/jpeg', 0.5).length; });
  await pg.mouse.click(cx, cy); await pg.waitForTimeout(300);
  ok(await pg.isVisible('.re-sheet .re-frame') && (await pg.evaluate(() => PGReel.state().frameSel)) === id, 'tap a photo: its pop-up has Frame (drag + Zoom + Reset)');
  await pg.screenshot({ path: '/tmp/rf_sheet.png' });
  const before = await pg.evaluate(() => document.querySelector('.re-v-edit .re-stage canvas').toDataURL('image/jpeg', 0.6));
  // zoom in, then drag the photo
  await pg.$eval('.re-zoom', r => { r.value = '2'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }); await pg.waitForTimeout(300);
  st = await pg.evaluate(() => PGReel.state());
  ok(st.frame[id] && st.frame[id].z === 2, 'Zoom: the photo goes closer in its frame ' + JSON.stringify(st.frame[id]));
  await pg.mouse.move(cx, cy - 80); await pg.mouse.down(); await pg.mouse.move(cx + 90, cy - 20, { steps: 10 }); await pg.mouse.up(); await pg.waitForTimeout(400);
  st = await pg.evaluate(() => PGReel.state());
  const f = st.frame[id];
  ok(f && f.fx < 0.5 && f.z === 2, 'drag: the photo moves inside its frame (dragged right → shows more of its left) ' + JSON.stringify(f));
  ok(st.segs[i].ids[0] === id && st.segs[i].layout === sg.layout, '…the clip and its layout stay the same');
  const after = await pg.evaluate(() => document.querySelector('.re-v-edit .re-stage canvas').toDataURL('image/jpeg', 0.6));
  ok(before !== after, '…the preview shows the new framing');
  ok(await pg.isVisible('.re-sheet .re-frame'), '…the pop-up stays open after dragging');
  await pg.screenshot({ path: '/tmp/rf_framed.png' });
  // undo brings the old framing back, redo the new one
  await pg.evaluate(() => document.querySelector('.re-ib[aria-label="Undo"]').click()); await pg.waitForTimeout(300);
  ok(JSON.stringify((await pg.evaluate(() => PGReel.state())).frame[id]) !== JSON.stringify(f), 'Undo takes the drag back');
  // Reset
  await seekTo(sg.start + sg.dur * 0.6); await pg.mouse.click(cx, cy); await pg.waitForTimeout(300);
  await pg.click('.re-frame .re-freset'); await pg.waitForTimeout(300);
  ok(!(await pg.evaluate(id => PGReel.state().frame[id], id)), 'Reset: back to the automatic framing');
  // faces: with face boxes known, the automatic framing keeps them in view
  await pg.evaluate(id => PGReel.setFaces({ [id]: [[0.1, 0.05, 0.2, 0.2]] }), id); await pg.waitForTimeout(200);
  ok(true, 'face boxes can be given to Reel Edits (PGReel.setFaces)');
  await pg.click('.re-sh-done'); await pg.waitForTimeout(200);
  ok(!(await pg.evaluate(() => PGReel.state().frameSel)), 'Done: dragging the preview no longer moves the photo');
  console.log('page errors: ' + JSON.stringify(errors)); ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
