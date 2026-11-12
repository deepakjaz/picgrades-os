// Browser test (step 28): the Hub's four numbers open what they count; reels start with nothing chosen (no random photos); the viewer has no reel button.
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
}).listen(8791, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8791/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  const box = (k) => pg.locator('#pghStats [data-stat=' + k + ']');
  console.log('boxes:', (await pg.locator('#pghStats button').allTextContents()).join(' | '));
  // step 49: the Photos and Events numbers are gone from the app (they live in the Control Panel)
  console.log('no Photos / Events boxes:', await box('events').count() === 0 && await box('photos').count() === 0);
  await box('hearts').click(); await pg.waitForTimeout(400); console.log('Hearts with none yet → toast:', await pg.evaluate(() => (document.querySelector('.toast, #toast, .pg-toast') || {}).textContent || ''));
  // give some hearts, then tap Hearts
  const ids = await pg.evaluate(() => { const a = pgAllPhotos().map(x => x.p.id); GALLERY.likes = { [a[5]]: 2, [a[9]]: 7, [a[1]]: 4 }; pgRenderHub(); return [a[9], a[1], a[5]]; });
  await box('hearts').click(); await pg.waitForTimeout(700);
  const loved = await pg.evaluate(() => ({ page: document.querySelector('.pg-view.active').id, set: CURRENT_SET, order: MOMENTS.map(m => m.id) }));
  console.log('Hearts → page:', loved.page, '| set:', loved.set, '| most hearts first:', JSON.stringify(loved.order) === JSON.stringify(ids), '| not added to the collections:', await pg.evaluate(() => !(GALLERY.personal || []).some(x => x.loved)));
  console.log('viewer reel button gone:', await pg.locator('#pgvReel').count() === 0);
  await pg.screenshot({ path: '/tmp/s28_loved.png' });
  await pg.evaluate(() => switchViewFromNav('hub')); await pg.waitForTimeout(400);
  await pg.evaluate(() => { GALLERY.recentNotes = [{ name: 'Mira', text: 'So beautiful!', at: new Date().toISOString(), photoId: pgAllPhotos()[0].p.id }]; GALLERY.notes = { [pgAllPhotos()[0].p.id]: 1 }; pgRenderHub(); window.scrollTo(0, 0); document.querySelectorAll('.pg-view').forEach(v => v.scrollTop = 0); });
  const y0 = await pg.$eval('#pghNotesSec', e => Math.round(e.getBoundingClientRect().top));
  await box('notes').click(); await pg.waitForTimeout(900);
  const y1 = await pg.$eval('#pghNotesSec', e => Math.round(e.getBoundingClientRect().top));
  console.log('Notes → scrolled down to Recent notes:', y0, '→', y1, '| still on Hub:', await pg.evaluate(() => document.querySelector('.pg-view.active').id));
  await pg.evaluate(() => { GALLERY.recentNotes = []; pgRenderHub(); });
  await box('notes').click(); await pg.waitForTimeout(500); console.log('Notes with none on the Hub → page:', await pg.evaluate(() => document.querySelector('.pg-view.active').id));
  await pg.evaluate(() => switchViewFromNav('hub')); await pg.waitForTimeout(400);
  await pg.evaluate(() => window.scrollTo(0, 0));
  await pg.screenshot({ path: '/tmp/s28_hub.png' });
  // reel from the Hub: styles show, nothing chosen until you pick
  await pg.click('#pghReel'); await pg.waitForSelector('.rl-wrap[data-view=inspo]', { timeout: 30000 }); await pg.waitForTimeout(800);
  await pg.locator('.re-ins:nth-child(1) .re-use').click(); await pg.waitForSelector('.rl-picker'); await pg.waitForTimeout(300);
  console.log('reel picker:', await pg.textContent('.rl-pcount'), '| chosen:', await pg.locator('.rl-pick.on').count(), '| Next off:', await pg.$eval('.rl-picker .re-next', b => b.disabled));
  await pg.screenshot({ path: '/tmp/s28_pick.png' });
  for (let k = 0; k < 5; k++) await pg.locator('.rl-pick').nth(k).click();
  console.log('after picking 5:', await pg.textContent('.rl-pcount'), '| numbers:', (await pg.$$eval('.rl-pick.on i', l => l.map(i => i.textContent))).join(','));
  await pg.click('.rl-picker .re-next'); await pg.waitForSelector('.rl-wrap[data-view=edit]', { timeout: 30000 }); await pg.waitForTimeout(500);
  const st = await pg.evaluate(() => PGReel.state()); const used = [...new Set(st.segs.flatMap(s => s.ids))];
  console.log('reel uses only the 5 picked:', used.length, 'photos');
  await pg.evaluate(() => PGReel.close());
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
