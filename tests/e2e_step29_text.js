// Browser test (step 29): template text you can change and drag (Post Edits names, date, headline, event labels; Reel Edits title card), with undo.
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
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8794, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('about:blank'); await pg.goto('http://localhost:8794/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  pg.on('dialog', d => d.accept());
  // ---- Post Edits: tap a template word, change it, drag it, undo ----
  await PE.toEdit(pg, 'album'); await PE.template(pg, 'Magazine'); await pg.waitForTimeout(400);
  let I = await pg.evaluate(() => PGPost.info()); console.log('texts on the post:', [...new Set(I.texts.map(t => t.key))].join(', '));
  const tapText = async (key) => { const I = await pg.evaluate(() => PGPost.info()), h = I.texts.find(t => t.key === key), r = await pg.locator('.pe-stage canvas').boundingBox(); const x = r.x + (h.x + h.w / 2) / I.W * r.width, y = r.y + (h.y + h.h / 2) / I.H * r.height; await pg.mouse.click(x, y); await pg.waitForTimeout(300); return { x, y }; };
  let p = await tapText('issue'); console.log('tap headline → pop-up:', await pg.textContent('.pe-thisone b'), '| words:', await pg.inputValue('.pe-pop .ps-in'));
  await pg.fill('.pe-pop .ps-in', 'OUR LOVE STORY'); await pg.waitForTimeout(300);
  await pg.mouse.move(p.x, p.y); await pg.mouse.down(); for (let k = 1; k <= 6; k++) await pg.mouse.move(p.x + k * 6, p.y + k * 8); await pg.mouse.up(); await pg.waitForTimeout(500);
  let st = await pg.evaluate(() => PGPost.state()); console.log('changed + moved:', JSON.stringify(st.tx.issue));
  await pg.screenshot({ path: '/tmp/s29_posttext.png' });
  await pg.click('.pe-pop .pe-done'); await pg.waitForTimeout(500);
  p = await tapText('date'); await pg.fill('.pe-pop .ps-in', '14 December 2026'); await pg.waitForTimeout(500); await pg.click('.pe-pop .pe-done'); await pg.waitForTimeout(500);
  st = await pg.evaluate(() => PGPost.state()); console.log('date now:', st.date);
  await pg.click('.pe-ur[aria-label=Undo]'); st = await pg.evaluate(() => PGPost.state()); console.log('undo → date:', st.date);
  await pg.click('.pe-ur[aria-label=Undo]'); st = await pg.evaluate(() => PGPost.state()); console.log('undo → headline:', JSON.stringify(st.tx.issue || {}));
  await PE.template(pg, 'Editorial Cover'); await pg.waitForTimeout(400); I = await pg.evaluate(() => PGPost.info());
  const lab = I.texts.find(t => t.key.startsWith('label:')); console.log('event label under a photo:', !!lab);
  if (lab) { await tapText(lab.key); const before = await pg.inputValue('.pe-pop .ps-in'); await pg.fill('.pe-pop .ps-in', 'Dance night'); await pg.waitForTimeout(300); console.log('label', before, '→', JSON.stringify((await pg.evaluate(() => PGPost.state())).tx[lab.key])); await pg.click('.pe-pop .pe-done'); }
  await pg.evaluate(() => PGPost.close());
  // ---- Reel Edits: title card words ----
  await pg.click('#pghReel'); await RE.toEditor(pg, 'south'); await pg.evaluate(() => { const tl = document.querySelector('.re-tl'); tl.scrollTo(0.9 * 48, 0); }); await pg.waitForTimeout(500);
  let rs = await pg.evaluate(() => PGReel.state()); console.log('title card texts:', [...new Set(rs.textHits.map(h => h.key))].join(', '));
  const rtap = async (key) => { const rs = await pg.evaluate(() => PGReel.state()), h = rs.textHits.find(x => x.key === key), r = await pg.locator('.re-v-edit .re-stage canvas').boundingBox(); return { x: r.x + (h.x0 + h.x1) / 2 / 1080 * r.width, y: r.y + (h.y0 + h.y1) / 2 / 1920 * r.height }; };
  let q = await rtap('title.names'); await pg.mouse.click(q.x, q.y); await pg.waitForTimeout(300);
  console.log('tap names → sheet:', await pg.textContent('.re-sheet .re-sh-top b'), '| words:', await pg.inputValue('.re-sheet .rl-in'));
  await pg.fill('.re-sheet .rl-in', 'Anika ❤ Rohan'); await pg.waitForTimeout(200); await pg.click('.re-sh-done'); await pg.waitForTimeout(300);
  q = await rtap('title.names'); await pg.mouse.move(q.x, q.y); await pg.mouse.down(); for (let k = 1; k <= 6; k++) await pg.mouse.move(q.x, q.y - k * 15); await pg.mouse.up(); await pg.waitForTimeout(400);
  rs = await pg.evaluate(() => PGReel.state()); console.log('names:', rs.names, '| moved:', JSON.stringify(rs.tx['title.names']), '| sheet opened by the drag:', await pg.locator('.re-sheet').count() > 0);
  await pg.screenshot({ path: '/tmp/s29_reeltext.png' });
  await pg.click('[aria-label=Undo]'); rs = await pg.evaluate(() => PGReel.state()); console.log('undo → moved back:', JSON.stringify(rs.tx['title.names'] || {}));
  await pg.evaluate(() => PGReel.close());
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
