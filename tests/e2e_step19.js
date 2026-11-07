// Browser test (step 19): the Gemini + ChatGPT packs in the app — styles grouped by event, new reel layouts, page decorations, drawings tabs, and all 7 games at iPhone size.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'GAMEWEDDING0000000001';
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
}).listen(8782, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.goto('http://localhost:8782/g/' + pub.galleryId + '?couple=' + ck + '&packinfo'); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(500);
  // album maker
  await pg.click('#pgcPost'); await pg.waitForSelector('.ps-wrap'); await pg.waitForFunction(() => PGPost.info(), null, { timeout: 20000 });
  console.log('album templates:', await pg.evaluate(() => PGPost.templates.length));
  const groups = await pg.$$eval('.ps-row:nth-of-type(1) .ps-chip', l => l.map(b => b.textContent));
  await pg.locator('.ps-chip', { hasText: /^Haldi$/ }).click(); await pg.waitForTimeout(200);
  console.log('Haldi templates:', (await pg.$$eval('.ps-chip', l => l.map(b => b.textContent).filter(t => / · [GC]$/.test(t)))).join(' | '));
  await pg.locator('.ps-chip', { hasText: /^Wedding$/ }).click(); await pg.waitForTimeout(200);
  await pg.locator('.ps-chip', { hasText: 'Royal · Palace Arch' }).click(); await pg.waitForTimeout(600);
  await pg.screenshot({ path: '/tmp/s19_album_arch.png' });
  await pg.locator('.ps-chip', { hasText: /^All$/ }).first().click(); await pg.locator('.ps-chip', { hasText: 'Classic Heirloom' }).click(); await pg.waitForTimeout(600);
  await pg.screenshot({ path: '/tmp/s19_album_chatgpt.png' });
  await pg.locator('.ps-sub', { hasText: 'Add flowers' }).click(); await pg.waitForSelector('.ps-sgrid');
  console.log('drawings:', await pg.evaluate(() => PG_STICKERS.length), '| tabs:', (await pg.$$eval('.ps-sheet .ps-chip, .ps-stabs .ps-chip', l => l.map(b => b.textContent))).join(', '));
  await pg.locator('.ps-chip', { hasText: /^Ceremony$/ }).last().click(); await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/s19_stickers.png' });
  await pg.evaluate(() => PGPost.close());
  // reel maker: Marwari style uses Gemini's arch layout and circle reveal
  await pg.click('#pghReel'); await pg.waitForFunction(() => /preview/i.test((document.querySelector('.rl-msg') || {}).textContent || ''), null, { timeout: 20000 });
  console.log('reel styles:', await pg.evaluate(() => PGReel.styles.length), '| music tracks:', await pg.$$eval('.rl-chip', l => l.length));
  await pg.locator('.rl-chip', { hasText: /^Wedding$/ }).click(); await pg.waitForTimeout(200);
  await pg.locator('.rl-chip', { hasText: 'Marwari · Royal Rajwada' }).click(); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: '/tmp/s19_reel.png' });
  await pg.locator('.rl-chip', { hasText: '15 s' }).click(); await pg.click('.rl-go'); await pg.waitForSelector('.rl-stage video', { timeout: 90000 });
  console.log('reel made with the new layouts:', await pg.textContent('.rl-msg'));
  await pg.evaluate(() => PGReel.close());
  // games
  await pg.click('#pgcGames'); await pg.waitForSelector('.pgg-card', { timeout: 20000 }); await pg.waitForTimeout(500);
  const games = await pg.$$eval('.pgg-card', l => l.map(b => b.dataset.game));
  console.log('games:', games.join(', ')); await pg.screenshot({ path: '/tmp/s19_games.png' });
  for (const id of games) {
    await pg.click('.pgg-card[data-game="' + id + '"]'); await pg.waitForSelector('.pgg-play'); await pg.waitForTimeout(700);
    for (let i = 0; i < 4; i++) { await pg.touchscreen.tap(195, 520 + i * 40); await pg.waitForTimeout(250); }
    await pg.waitForTimeout(600);
    const fit = await pg.$eval('.pgg-root', r => { let worst = 0; r.querySelectorAll('*').forEach(e => { const b = e.getBoundingClientRect(); if (b.width) worst = Math.max(worst, b.right - innerWidth); }); return Math.round(worst); });
    await pg.screenshot({ path: '/tmp/s19_game_' + id + '.png' });
    await pg.evaluate(() => { const r = document.querySelector('.pgg-play'); const x = [...r.querySelectorAll('button')].find(b => /exit|close|back|×/i.test(b.textContent + (b.getAttribute('aria-label') || ''))); if (x) x.click(); });
    await pg.waitForTimeout(300);
    const closed = !(await pg.$('.pgg-play'));
    console.log(' ', id, '| sticks out on the right by:', fit, 'px | its Exit button closes it:', closed);
    if (!closed) await pg.evaluate(() => { document.querySelector('.pgg-play').remove(); });
  }
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
