// Browser test (step 25): Post Edits — New post (numbered picks, shape, phone, POST/ALBUM/REEL) → edit (carousel swipe, tools, tap photo → Replace) → share (caption, see on profile, post).
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
}).listen(8788, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8788/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  const FIX = require('path').join(__dirname, 'fixtures');
  await pg.click('#pgcPost'); await pg.waitForSelector('.pe-wrap[data-view=pick]', { timeout: 30000 }); await pg.waitForTimeout(800);
  console.log('new post:', await pg.textContent('.pe-v-pick .pe-title'), '| shape:', await pg.textContent('.pe-pill'), '| chosen:', await pg.textContent('.pe-count'), '| tabs:', (await pg.$$eval('.pe-tab', l => l.map(t => t.textContent + (t.classList.contains('on') ? '*' : '')))).join(' '));
  console.log('numbers on picks:', (await pg.$$eval('.pe-pick.on i', l => l.map(i => i.textContent))).join(','));
  // tap: unselected → chosen; tap again (it is the big one) → removed
  const free = pg.locator('.pe-pick:not(.on)').first(); const fid = await free.getAttribute('data-id');
  await free.click(); console.log('after choosing one more:', await pg.textContent('.pe-count'), '| big preview is it:', await pg.$eval('.pe-big1', (i, id) => i.src.includes(id), fid));
  await pg.locator('.pe-pick[data-id="' + fid + '"]').click(); console.log('tap again removes it:', await pg.textContent('.pe-count'));
  await pg.click('.pe-pill'); console.log('shape button →', await pg.textContent('.pe-pill')); await pg.click('.pe-pill'); await pg.click('.pe-pill'); console.log('… back to', await pg.textContent('.pe-pill'));
  await pg.setInputFiles('.pe-v-pick .pe-pin', [FIX + '/phone_photo.jpg']); await pg.waitForFunction(() => /From your phone/.test(document.querySelector('.pe-v-pick .pe-colsel').selectedOptions[0].textContent), null, { timeout: 20000 });
  console.log('phone photo chosen:', await pg.textContent('.pe-count'));
  await pg.screenshot({ path: '/tmp/s25_pick.png' });
  await pg.click('.pe-v-pick .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=edit]'); await pg.waitForTimeout(900);
  let st = await pg.evaluate(() => Object.assign(PGPost.state(), PGPost.info()));
  console.log('edit:', st.format, '| shape', st.shape, '| page', st.W / st.slides + '×' + st.H, '|', st.slides, 'slides,', st.cells, 'photos | dots:', await pg.locator('.pe-dots i').count(), '|', await pg.textContent('.pe-slideno'));
  await pg.screenshot({ path: '/tmp/s25_edit.png' });
  // swipe to slide 3
  await pg.$eval('.pe-stage', s => { const w = s.querySelector('canvas').getBoundingClientRect().width / s.querySelectorAll('.pe-snap').length; s.scrollTo({ left: w * 2 }); }); await pg.waitForTimeout(500);
  console.log('after swipe:', await pg.textContent('.pe-slideno'));
  await pg.$eval('.pe-stage', s => s.scrollTo({ left: 0 })); await pg.waitForTimeout(400);
  // tools
  await pg.click('.pe-tool[data-tool=filters]'); await pg.click('.pe-filter[data-f=golden]'); await pg.click('.pe-sheet .pe-done');
  await pg.click('.pe-tool[data-tool=slides]'); await pg.locator('.pe-sheet .ps-chip', { hasText: /^2$/ }).click(); await pg.click('.pe-sheet .pe-done');
  st = await pg.evaluate(() => Object.assign(PGPost.state(), PGPost.info())); console.log('golden filter + 2 per slide:', st.filter, '|', st.slides, 'slides');
  await pg.click('.pe-tool[data-tool=shape]'); await pg.locator('.pe-sheet .ps-chip', { hasText: '4:5' }).click(); await pg.click('.pe-sheet .pe-done');
  console.log('shape 4:5 → page height', (await pg.evaluate(() => PGPost.info())).H);
  await pg.click('.pe-tool[data-tool=order]'); const o1 = (await pg.evaluate(() => PGPost.state().photos)).slice(0, 2); await pg.locator('.pe-ord').nth(0).locator('button[aria-label="Move later"]').click();
  const o2 = (await pg.evaluate(() => PGPost.state().photos)).slice(0, 2); console.log('order swapped first two:', o1[0] === o2[1] && o1[1] === o2[0]); await pg.click('.pe-sheet .pe-done');
  await pg.click('.pe-tool[data-tool=template]'); await pg.locator('.pe-sheet .pe-tpl').nth(10).click(); await pg.click('.pe-sheet .pe-done');
  // tap a photo on slide 1 → pop-up → Replace
  const hit = await pg.evaluate(() => { const c = document.querySelector('.pe-stage canvas'), r = c.getBoundingClientRect(), I = PGPost.info(); return { r: { x: r.x, y: r.y, w: r.width, h: r.height }, W: I.W, H: I.H }; });
  const h0 = (await pg.evaluate(() => PGPost.info().hits)).filter(h => h.x < 1080)[0];
  await pg.mouse.click(hit.r.x + (h0.x + h0.w / 2) / hit.W * hit.r.w, hit.r.y + (h0.y + h0.h / 2) / hit.H * hit.r.h); await pg.waitForTimeout(400);
  console.log('tap photo → pop-up:', await pg.isVisible('.pe-pop'), '|', await pg.textContent('.pe-thisone b'));
  await pg.screenshot({ path: '/tmp/s25_pop.png' });
  const old = (await pg.evaluate(() => PGPost.state().sel)).id;
  await pg.click('.pe-repl'); await pg.waitForSelector('.pe-picker');
  const nid = await pg.$$eval('.pe-picker .pe-pick', (l, cur) => l.map(t => t.dataset.id).find(id => cur.indexOf(id) < 0), await pg.evaluate(() => PGPost.state().photos));
  await pg.click('.pe-picker .pe-pick[data-id="' + nid + '"]'); await pg.waitForTimeout(1500);
  st = await pg.evaluate(() => PGPost.state()); console.log('replaced in place:', st.photos.includes(nid) && !st.photos.includes(old), '| pop-up now on it:', st.sel && st.sel.id === nid);
  await pg.click('.pe-pop .pe-done');
  // share
  await pg.click('.pe-v-edit .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=share]'); await pg.waitForTimeout(500);
  console.log('share: slides', await pg.locator('.pe-shth').count(), '| caption:', JSON.stringify(await pg.inputValue('.pe-cap')), '| profile tiles:', await pg.locator('.pe-tile').count(), '| new tile:', await pg.isVisible('.pe-tile.new img'));
  await pg.screenshot({ path: '/tmp/s25_share.png' });
  await pg.click('.ps-go'); await pg.waitForFunction(() => /Posted|Sent/.test(document.querySelector('.ps-go').textContent), null, { timeout: 30000 });
  console.log('post:', await pg.textContent('.ps-go'), '|', await pg.textContent('.pe-msg'));
  // ALBUM tab, then REEL hand-off
  await pg.click('.pe-v-share .pe-ib'); await pg.click('.pe-v-edit .pe-ib'); await pg.click('.pe-tab[data-mode=album]'); await pg.click('.pe-v-pick .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=edit]'); await pg.waitForTimeout(600);
  st = await pg.evaluate(() => Object.assign(PGPost.state(), PGPost.info())); console.log('ALBUM →', st.format, st.slides, 'slides | seams:', await pg.locator('.ps-seams i').count());
  await pg.screenshot({ path: '/tmp/s25_album.png' });
  await pg.click('.pe-v-edit .pe-ib'); await pg.click('.pe-tab[data-mode=reel]'); await pg.waitForSelector('.rl-wrap', { timeout: 30000 });
  console.log('REEL tab opens Reel Edits:', await pg.isVisible('.rl-wrap'), '| post maker closed:', !(await pg.isVisible('.pe-wrap')));
  await pg.evaluate(() => PGReel.close());
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
