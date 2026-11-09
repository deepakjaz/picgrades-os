// Browser test (step 31): themes — 10 themes from /app/themes/themes.json switch the whole app (light and dark), the test menu, back to the original look.
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
}).listen(8796, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const FONTS = await require('./fonts_local').install(pg);
  await pg.goto('http://localhost:8796/g/' + pub.galleryId + '?themes&couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  const v = (n) => pg.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), n);
  const orig = await v('--bg-cream');
  await pg.waitForFunction(() => window.PGTheme && PGTheme.list().length, null, { timeout: 15000 });
  console.log('local fonts for screenshots:', FONTS, '| test button:', await pg.textContent('.pg-thbtn'));
  await pg.click('.pg-thbtn'); console.log('menu rows:', await pg.locator('.pg-throw').count(), '(Original + themes)');
  await pg.screenshot({ path: '/tmp/s31_menu.png' }); await pg.click('.pg-thbtn');
  const list = await pg.evaluate(() => PGTheme.list().map(t => ({ id: t.id, name: t.name, by: t.by, bg: t.light.bg, dbg: t.dark.bg, fonts: t.fonts })));
  const lum = h => { h = h.replace('#', ''); const f = c => (c /= 255) <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); return .2126 * f(parseInt(h.slice(0, 2), 16)) + .7152 * f(parseInt(h.slice(2, 4), 16)) + .0722 * f(parseInt(h.slice(4, 6), 16)); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return ((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(1); };
  for (const t of list) {
    await pg.evaluate(id => { PGTheme.apply(id); document.documentElement.setAttribute('data-tkg-theme', 'light'); }, t.id); await pg.waitForTimeout(150);
    const L = { bg: await v('--bg-cream'), ink: await v('--ink'), box: await v('--bg-box'), font: await v('--font-serif') };
    await pg.evaluate(() => document.documentElement.setAttribute('data-tkg-theme', 'dark')); await pg.waitForTimeout(100);
    const D = { bg: await v('--bg-cream'), ink: await v('--ink') };
    console.log(t.id.padEnd(20), t.by, '| light bg', L.bg, L.bg.toLowerCase() === t.bg.toLowerCase() ? 'ok' : 'WRONG', 'text', cr(L.ink, L.bg) + ':1', '| dark bg', D.bg, D.bg.toLowerCase() === t.dbg.toLowerCase() ? 'ok' : 'WRONG', 'text', cr(D.ink, D.bg) + ':1', '|', L.font.split(',')[0]);
    await pg.evaluate(() => document.documentElement.setAttribute('data-tkg-theme', 'light'));
    await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(250);
    await pg.evaluate(() => { const h = document.querySelector('#pghStats'); window.scrollTo(0, h ? h.getBoundingClientRect().top + window.scrollY - 140 : 600); });
    await pg.waitForTimeout(250); await pg.screenshot({ path: '/tmp/s31_' + t.id + '.png' });
    await pg.evaluate(() => document.documentElement.setAttribute('data-tkg-theme', 'dark')); await pg.waitForTimeout(200);
    await pg.screenshot({ path: '/tmp/s31_' + t.id + '_dark.png' });
    await pg.evaluate(() => { document.documentElement.setAttribute('data-tkg-theme', 'light'); window.scrollTo(0, 0); });
  }
  await pg.evaluate(() => PGTheme.reset()); await pg.waitForTimeout(150);
  console.log('Original look back:', (await v('--bg-cream')) === orig, '| no theme attribute:', await pg.evaluate(() => !document.documentElement.dataset.pgTheme));
  await pg.evaluate(() => PGTheme.apply('udaipur-sandstone')); await pg.reload(); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
  console.log('after reload the chosen theme stays:', await pg.evaluate(() => document.documentElement.dataset.pgTheme));
  await pg.evaluate(() => PGTheme.reset());
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
