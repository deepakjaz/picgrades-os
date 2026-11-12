// Browser test (step 22): Reel Edits — styles feed → Use template → numbered photo picker → editor (timeline, text, drawings, filters, clip tools, undo) → export.
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
}).listen(8785, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8785/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  const navShot = async (f) => { const bx = await pg.locator('.tkg-global-nav').boundingBox(); await pg.screenshot({ path: f, clip: { x: 0, y: bx.y - 30, width: 390, height: bx.height + 40 } }); };
  await navShot('/tmp/s22_nav_a.png'); await pg.click('#pgMono'); await pg.waitForTimeout(500); await navShot('/tmp/s22_nav_b.png'); await pg.click('#pgMono'); await pg.waitForTimeout(300);
  console.log('Hub nav shows the couple initials:', await pg.textContent('#pgNavMono'), '| header:', await pg.textContent('#pgMono'));
  await pg.click('#pghReel'); await pg.waitForSelector('.rl-wrap[data-view=inspo]', { timeout: 30000 }); await pg.waitForTimeout(1500);
  console.log('styles feed:', await pg.locator('.re-ins').count(), 'styles | first:', await pg.textContent('.re-ins b'));
  await pg.screenshot({ path: '/tmp/s22_feed.png' });
  await pg.$eval('.re-feed', f => f.scrollTo(0, f.clientHeight * 2)); await pg.waitForTimeout(1200);
  const third = await pg.$eval('.re-ins:nth-child(3)', e => e.dataset.style);
  await pg.locator('.re-ins:nth-child(3) .re-use').click(); await pg.waitForSelector('.rl-picker'); await pg.waitForTimeout(500);
  console.log('picker numbers:', (await pg.$$eval('.rl-pick.on i', l => l.map(i => i.textContent))).join(','), '| collections:', await pg.$$eval('.re-colsel option', l => l.length));
  for (let k = 0, n = Math.min(8, await pg.locator('.rl-pick').count()); k < n; k++) await pg.locator('.rl-pick').nth(k).click();   // step 28: the Hub reel starts with nothing chosen
  await pg.locator('.rl-pick').nth(1).click(); await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/s22_picker.png' });
  await pg.locator('.rl-pick').nth(1).click();
  await pg.click('.rl-picker .re-next'); await pg.waitForSelector('.rl-wrap[data-view=edit]'); await pg.waitForTimeout(900);
  let st = await pg.evaluate(() => PGReel.state()); console.log('editor:', JSON.stringify(st));
  await pg.screenshot({ path: '/tmp/s22_editor.png' });
  // text
  await pg.click('.re-tool[data-tool=text]'); await pg.fill('.re-ta', 'Anika weds Rohan'); await pg.locator('.re-sheet .rl-chip', { hasText: 'Box' }).click(); await pg.waitForTimeout(300);
  await pg.screenshot({ path: '/tmp/s22_text.png' }); await pg.click('.re-sh-done'); await pg.waitForTimeout(300);
  // drawing
  await pg.click('.re-tool[data-tool=sticker]'); await pg.waitForSelector('.re-stk'); await pg.locator('.re-stk').nth(19).click(); await pg.waitForSelector('.re-sheet .re-range'); await pg.click('.re-sh-done');
  // filter
  await pg.click('.re-tool[data-tool=filters]'); await pg.locator('.re-filter', { hasText: 'Golden' }).click(); await pg.click('.re-sh-done');
  // clip: longer, move right, undo
  const before = (await pg.evaluate(() => PGReel.state())).dur;
  await pg.locator('.re-clip:not(.re-card)').first().click(); await pg.locator('.re-sheet .re-tool', { hasText: 'Longer' }).click(); await pg.waitForTimeout(200);
  const longer = (await pg.evaluate(() => PGReel.state())).dur; await pg.click('.re-sh-done');
  await pg.click('[aria-label=Undo]'); await pg.waitForTimeout(200); const undone = (await pg.evaluate(() => PGReel.state())).dur;
  console.log('clip longer:', before.toFixed(2), '→', longer.toFixed(2), '| undo →', undone.toFixed(2));
  st = await pg.evaluate(() => PGReel.state()); console.log('after edits:', JSON.stringify({ texts: st.texts, stks: st.stks, filter: st.filter, undo: st.undo }));
  // scrub the timeline
  await pg.$eval('.re-tl', t => t.scrollTo(48 * 3.2, 0)); await pg.waitForTimeout(400); console.log('time after scrub:', await pg.textContent('.re-time b'));
  await pg.screenshot({ path: '/tmp/s22_edit2.png' });
  // play a moment, then export a 15 s reel
  await pg.click('.re-play'); await pg.waitForTimeout(1200); await pg.click('.re-play'); console.log('played to:', await pg.textContent('.re-time b'));
  await pg.click('.re-tool[data-tool=length]'); await pg.locator('.re-sheet .rl-chip', { hasText: '15 s' }).click(); await pg.click('.re-sh-done');
  await pg.click('.re-v-edit .re-next'); await pg.waitForSelector('.re-v-export video', { timeout: 90000 }); await pg.waitForTimeout(500);
  console.log('export:', await pg.textContent('.re-v-export .rl-msg'));
  await pg.screenshot({ path: '/tmp/s22_export.png' });
  await pg.locator('.rl-sub', { hasText: 'Back to editing' }).click(); console.log('back to editing:', await pg.evaluate(() => PGReel.state().view));
  await pg.evaluate(() => PGReel.close());
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
