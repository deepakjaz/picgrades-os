// Browser test (step 32): the Hub drawn from the 10 layouts — every block shows real wedding data and opens the same function as before; original Hub when none.
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
}).listen(8797, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const FONTS = await require('./fonts_local').install(pg);
  await pg.goto('http://localhost:8797/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  await pg.waitForFunction(() => window.PGLayout && PGLayout.list().length, null, { timeout: 15000 });
  // give the test wedding hearts, notes and face search so every block shows
  await pg.evaluate(() => { const a = pgAllPhotos().map(x => x.p.id); GALLERY.faceSearch = true; GALLERY.likes = { [a[3]]: 9, [a[7]]: 6, [a[1]]: 4, [a[11]]: 2 }; GALLERY.notes = { [a[3]]: 2 };
    GALLERY.recentNotes = [{ name: 'Mira Kapoor', text: 'The morning light in the courtyard was unforgettable. Wishing you endless joy.', at: '', photoId: a[3] }, { name: 'Rohit', text: 'What a celebration!', at: '', photoId: a[7] }]; GALLERY.city = 'Udaipur'; pgRenderHub(); });
  const list = await pg.evaluate(() => PGLayout.list().map(l => ({ id: l.id, name: l.name, n: l.blocks.length, theme: l.theme })));
  console.log('layouts:', list.length, '| no test menu any more:', !(await pg.locator('.pg-laybtn').count()));
  for (const l of list) {
    await pg.evaluate(id => { PGLayout.apply(id); document.documentElement.setAttribute('data-tkg-theme', 'light'); switchViewFromNav('hub'); window.scrollTo(0, 0); }, l.id);
    await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(700);
    const r = await pg.evaluate(() => ({ blocks: [...document.querySelectorAll('#pgLay .pgl-b')].map(b => b.dataset.block), origHidden: getComputedStyle(document.querySelector('.pgh-wrap')).display === 'none', theme: document.documentElement.dataset.pgTheme,
      overflow: [...document.querySelectorAll('#pgLay .pgl-b')].filter(b => b.scrollWidth > b.clientWidth + 2 && !b.matches('.pgl-events,.pgl-loved,.pgl-notes')).map(b => b.dataset.block) }));
    console.log(l.id.padEnd(22), '| shown', r.blocks.length + '/' + l.n, '(' + r.blocks.join(' ') + ') | theme', r.theme, '| original hidden', r.origHidden, r.overflow.length ? '| CUT OFF: ' + r.overflow : '');
    await pg.addStyleTag({ content: '.reg-overlay:not(.show){visibility:hidden!important}' });   // full-page shots would show the hidden sheets parked below the screen
    await pg.screenshot({ path: '/tmp/s32_' + l.id + '.png', fullPage: true });
    await pg.evaluate(() => document.documentElement.setAttribute('data-tkg-theme', 'dark')); await pg.waitForTimeout(300);
    await pg.screenshot({ path: '/tmp/s32_' + l.id + '_dark.png' });
    await pg.evaluate(() => document.documentElement.setAttribute('data-tkg-theme', 'light'));
  }
  // functions still work from the blocks
  await pg.evaluate(() => { PGLayout.apply('bento-concierge'); switchViewFromNav('hub'); });
  const tap = async (sel) => { await pg.locator(sel).first().scrollIntoViewIfNeeded(); await pg.locator(sel).first().click(); await pg.waitForTimeout(600); };
  console.log('no number box in the starting layouts (step 33):', await pg.evaluate(() => PGLayout.list().every(l => !l.blocks.some(b => b.block === 'stats'))));
  await tap('#pgLay .pgl-evt'); console.log('event → viewer:', await pg.evaluate(() => document.querySelector('.pg-view.active').id + ' / ' + CURRENT_SET));
  await pg.evaluate(() => switchViewFromNav('hub'));
  await tap('#pgLay .pgl-reel'); await pg.waitForSelector('.rl-wrap', { timeout: 30000 }); console.log('Reel tile → Reel Edits opens:', true); await pg.evaluate(() => PGReel.close());
  await tap('#pgLay .pgl-post'); await pg.waitForSelector('.pe-wrap', { timeout: 30000 }); console.log('Post tile → Post Edits opens:', true); await pg.evaluate(() => PGPost.close());
  await tap('#pgLay .pgl-upload'); console.log('Add a moment → sheet:', await pg.evaluate(() => !!document.querySelector('#upSheet.show, .reg-overlay.show')));
  await pg.evaluate(() => { document.querySelectorAll('.reg-overlay.show').forEach(s => s.classList.remove('show')); document.querySelectorAll('.overlay-backdrop').forEach(b => b.classList.remove('show')); switchViewFromNav('hub'); });
  await tap('#pgLay .pgl-studio'); console.log('Studio → page:', await pg.evaluate(() => document.querySelector('.pg-view.active').id));
  await pg.evaluate(() => { PGLayout.reset(); PGTheme.reset(); switchViewFromNav('hub'); });
  console.log('Original Hub back:', await pg.evaluate(() => !document.getElementById('pgLay') && getComputedStyle(document.querySelector('.pgh-wrap')).display !== 'none'));
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
