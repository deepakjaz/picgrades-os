// Browser test (step 17): extra templates, styles and drawings from /app/packs load into the makers; broken entries are skipped.
const PE = require('./post_helper');
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'PACKWEDDING0000000001';
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
}).listen(8781, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  for (const f of ['reel-styles', 'album-templates', 'stickers']) await pg.route('**/app/packs/' + f + '.json', r => r.fulfill({ contentType: 'application/json', body: fs.readFileSync(path.join(__dirname, 'fixtures', 'packs', f + '.json')) }));
  pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = r.request().url().match(/\/d\/([^=]+)/)[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id), headers: { 'Access-Control-Allow-Origin': '*' } }); });
  await pg.goto('http://localhost:8781/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(500);
  await PE.toEdit(pg, 'album');
  const tpls = await pg.evaluate(() => PGPost.templates.slice());
  console.log('album templates:', tpls.length, '| pack template added:', tpls.includes('mehendi-garden'), '| broken one skipped:', !tpls.includes('bad-slots'));
  await PE.template(pg, 'Mehendi Garden'); await PE.tool(pg, 'colours');
  console.log('its own colours chosen:', await pg.evaluate(() => !!document.querySelector('.ps-dot.on[data-v="mehendi-garden"]')), '| layout:', JSON.stringify(await pg.evaluate(() => { const i = PGPost.info(); delete i.hits; return i; }))); await PE.done(pg);
  await pg.screenshot({ path: '/tmp/s17_album_pack.png' });
  await PE.drawings(pg);
  console.log('drawings:', await pg.evaluate(() => PG_STICKERS.length), '| pack drawing added:', await pg.evaluate(() => PG_STICKERS.some(s => s.k === 'haldi-bowl')), '| unsafe one skipped:', await pg.evaluate(() => !PG_STICKERS.some(s => s.k === 'evil')));
  await pg.evaluate(() => PGPost.close());
  await pg.click('#pghReel'); await pg.waitForSelector('.rl-wrap[data-view=inspo]', { timeout: 30000 });
  const styles = await pg.evaluate(() => PGReel.styles.slice());
  console.log('reel styles:', styles.join(', '), '| broken skipped:', !styles.includes('broken'), '| unknown layout dropped:', await pg.evaluate(() => { PGReel.setStyle('haldi-sunshine'); return true; }));
  console.log('pack style in the feed:', await pg.locator('.re-ins[data-style="haldi-sunshine"]').count());
  await RE.toEditor(pg, 'haldi-sunshine'); console.log('editor style:', await pg.evaluate(() => PGReel.state().style)); await pg.waitForTimeout(800);
  await pg.screenshot({ path: '/tmp/s17_reel_pack.png' });
  await pg.evaluate(() => PGReel.close());
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
