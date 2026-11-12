// Browser test (step 25, step 53 = Post is ONE picture: 1 photo or a grid of up to 5, four Instagram sizes, borders or merged): Post Edits — New post (numbered picks, shape, phone, POST/ALBUM/REEL) → edit (carousel swipe, tools, tap photo → Replace) → share (caption, see on profile, post).
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const DB_ROWS = () => { const t = DB.GuestPosts || [[]], h = t[0]; return t.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
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
}).listen(8788, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await pg.goto('http://localhost:8788/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  const FIX = require('path').join(__dirname, 'fixtures');
  let bad = 0; const check = (ok, m) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + m); };
  await pg.click('#pgcPost'); await pg.waitForSelector('.pe-wrap[data-view=pick]', { timeout: 30000 }); await pg.waitForTimeout(800);
  console.log('new post:', await pg.textContent('.pe-v-pick .pe-title'), '| shape:', await pg.textContent('.pe-pill'), '| chosen:', await pg.textContent('.pe-count'), '| tabs:', (await pg.$$eval('.pe-tab', l => l.map(t => t.textContent + (t.classList.contains('on') ? '*' : '')))).join(' '));
  // step 53: Post opens with ONE photo (not 7)
  check((await pg.locator('.pe-pick.on').count()) === 1 && (await pg.textContent('.pe-count')) === 'One photo', 'Post opens with one photo chosen');
  // the size button goes through all four Instagram sizes, the wide 1.91:1 included
  const sizes = []; for (let k = 0; k < 4; k++) { sizes.push(await pg.textContent('.pe-pill')); await pg.click('.pe-pill'); }
  check(sizes.join(' ') === '3:4 4:5 1:1 1.91:1' && (await pg.textContent('.pe-pill')) === '3:4', 'sizes: ' + sizes.join(' '));
  // choose up to 5 (a grid in one picture); a 6th is refused
  const pickMore = async () => { if (!(await pg.locator('.pe-pick:not(.on)').count())) { const ov = await pg.$$eval('.pe-v-pick .pe-colsel option', l => l.map(o => o.value)); const cur = await pg.inputValue('.pe-v-pick .pe-colsel'); await pg.selectOption('.pe-v-pick .pe-colsel', ov[(ov.indexOf(cur) + 1) % ov.length]); } await pg.locator('.pe-pick:not(.on)').first().click(); };
  for (let k = 0; k < 4; k++) await pickMore();
  const curId = await pg.locator('.pe-pick.cur').first().getAttribute('data-id'); await pg.locator('.pe-pick[data-id="' + curId + '"]').click();
  check((await pg.textContent('.pe-count')) === 'Grid of 4', 'tap the big one again removes it: ' + await pg.textContent('.pe-count'));
  await pg.locator('.pe-pick[data-id="' + curId + '"]').click(); await pickMore();
  check((await pg.evaluate(() => PGPost.state().photos.length)) === 5 && /up to 5/.test(await pg.textContent('.pe-msg')), 'a post takes up to 5 photos, a 6th is refused: ' + await pg.textContent('.pe-count'));
  await pg.screenshot({ path: '/tmp/s53_post_pick.png' });
  await pg.click('.pe-v-pick .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=edit]'); await pg.waitForTimeout(900);
  let st = await pg.evaluate(() => Object.assign(PGPost.state(), PGPost.info()));
  check(st.format === 'post' && st.slides === 1 && st.cells === 5 && st.W === 1080 && st.H === 1440, 'one picture 1080×' + st.H + ' with ' + st.cells + ' photos (' + st.format + ', ' + st.slides + ' slide) | dots: ' + await pg.locator('.pe-dots i').count());
  check(!(await pg.locator('.pe-tool[data-tool=slides]').count()) && await pg.locator('.pe-tool[data-tool=grid]').count() === 1, 'tools: ' + (await pg.locator('.pe-tool span').allTextContents()).join(', '));
  // photos never overlap and stay inside the picture
  const inside = hs => hs.every(h => h.x >= 0 && h.y >= 0 && h.x + h.w <= 1080.5 && h.y + h.h <= st.H + 0.5) && hs.every((a, i) => hs.every((c, j) => i === j || !(a.x < c.x + c.w - 1 && c.x < a.x + a.w - 1 && a.y < c.y + c.h - 1 && c.y < a.y + a.h - 1)));
  check(inside(st.hits), 'the 5 photos fit the picture without overlapping');
  await pg.screenshot({ path: '/tmp/s53_post_grid.png' });
  // Grid: three arrangements; Borders off → photos meet edge to edge
  await pg.click('.pe-tool[data-tool=grid]'); const nGrids = await pg.locator('.pe-gopt').count(); await pg.locator('.pe-gopt').nth(1).click();
  const withB = await pg.evaluate(() => PGPost.info().hits);
  await pg.locator('.pe-sheet .ps-chip', { hasText: 'Merged' }).click(); await pg.click('.pe-sheet .pe-done');
  const noB = await pg.evaluate(() => PGPost.info().hits), area = hs => hs.reduce((t, h) => t + h.w * h.h, 0);
  check(nGrids === 3 && (await pg.evaluate(() => PGPost.state().grid)) === 1, 'Grid offers ' + nGrids + ' arrangements for 5 photos');
  check(Math.abs(area(noB) - 1080 * st.H) < 2000 && area(withB) < area(noB) - 20000, 'Merged: photos cover the whole picture (' + Math.round(area(noB)) + ' of ' + 1080 * st.H + '); with borders: a frame shows');
  await pg.screenshot({ path: '/tmp/s53_post_merged.png' });
  // every Instagram size changes the WHOLE picture
  for (const [lab, H, v] of [['4:5', 1350, '45'], ['1:1', 1080, '11'], ['1.91:1', 566, '191'], ['3:4', 1440, '34']]) {
    await pg.click('.pe-tool[data-tool=shape]'); await pg.click('.pe-sheet .ps-chip[data-v="' + v + '"]'); await pg.click('.pe-sheet .pe-done'); await pg.waitForTimeout(200);
    const I = await pg.evaluate(() => PGPost.info()), cv = await pg.$eval('.pe-stage canvas', c => c.width / c.height);
    check(I.H === H && Math.abs(cv - 1080 / H) < 0.02 && inside.call(null, I.hits.map(h => h)) && Math.abs(area(I.hits) - 1080 * H) < 2000, 'size ' + lab + ' → picture 1080×' + I.H + ' (canvas ' + cv.toFixed(2) + '), photos fill it');
    if (lab === '1.91:1') await pg.screenshot({ path: '/tmp/s53_post_wide.png' });
  }
  // Post templates only (album templates stay in Album)
  await pg.click('.pe-tool[data-tool=template]'); await pg.waitForSelector('.pe-sheet .pe-tpl'); const tpls = await pg.locator('.pe-sheet .pe-tpl span').allTextContents();
  check(tpls.join() === 'Clean,Names below,Names on photo,Gallery frame,Night', 'post templates: ' + tpls.join(', '));
  await pg.locator('.pe-sheet .pe-tpl', { hasText: 'Names below' }).click(); await pg.click('.pe-sheet .pe-done'); await pg.waitForTimeout(300);
  const tx = await pg.evaluate(() => PGPost.info().texts.map(t => t.key));
  check(tx.indexOf('names') > -1, 'Names below writes the names: ' + tx.join(','));
  await pg.screenshot({ path: '/tmp/s53_post_names.png' });
  await pg.click('.pe-tool[data-tool=filters]'); await pg.click('.pe-filter[data-f=golden]'); await pg.click('.pe-sheet .pe-done');
  await pg.click('.pe-tool[data-tool=order]'); const o1 = (await pg.evaluate(() => PGPost.state().photos)).slice(0, 2); await pg.locator('.pe-ord').nth(0).locator('button[aria-label="Move later"]').click();
  const o2 = (await pg.evaluate(() => PGPost.state().photos)).slice(0, 2); check(o1[0] === o2[1] && o1[1] === o2[0], 'order swapped first two'); await pg.click('.pe-sheet .pe-done');
  // tap a photo → pop-up → Replace
  const hit = await pg.evaluate(() => { const c = document.querySelector('.pe-stage canvas'), r = c.getBoundingClientRect(), I = PGPost.info(); return { r: { x: r.x, y: r.y, w: r.width, h: r.height }, W: I.W, H: I.H }; });
  const h0 = (await pg.evaluate(() => PGPost.info().hits))[0];
  await pg.mouse.click(hit.r.x + (h0.x + h0.w / 2) / hit.W * hit.r.w, hit.r.y + (h0.y + h0.h / 2) / hit.H * hit.r.h); await pg.waitForTimeout(400);
  console.log('tap photo → pop-up:', await pg.isVisible('.pe-pop'), '|', await pg.textContent('.pe-thisone b'));
  const old = (await pg.evaluate(() => PGPost.state().sel)).id;
  await pg.click('.pe-repl'); await pg.waitForSelector('.pe-picker');
  const freeIn = async () => pg.$$eval('.pe-picker .pe-pick', (l, cur) => l.map(t => t.dataset.id).find(id => cur.indexOf(id) < 0), await pg.evaluate(() => PGPost.state().photos));
  if (!(await freeIn())) { const ov = await pg.$$eval('.pe-picker .pe-colsel option', l => l.map(o => o.value)); await pg.selectOption('.pe-picker .pe-colsel', ov[ov.length - 1]); }
  const nid = await pg.$$eval('.pe-picker .pe-pick', (l, cur) => l.map(t => t.dataset.id).find(id => cur.indexOf(id) < 0), await pg.evaluate(() => PGPost.state().photos));
  await pg.click('.pe-picker .pe-pick[data-id="' + nid + '"]'); await pg.waitForTimeout(1500);
  st = await pg.evaluate(() => PGPost.state()); check(st.photos.includes(nid) && !st.photos.includes(old) && st.sel && st.sel.id === nid, 'replaced in place');
  await pg.click('.pe-pop .pe-done');
  // share: one image; saved as a post
  await pg.click('.pe-v-edit .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=share]'); await pg.waitForTimeout(500);
  check((await pg.locator('.pe-shth').count()) === 1, 'share: one image | caption: ' + JSON.stringify(await pg.inputValue('.pe-cap')));
  await pg.screenshot({ path: '/tmp/s25_share.png' });
  await pg.click('.ps-go'); await pg.waitForFunction(() => /Posted|Sent/.test(document.querySelector('.ps-go').textContent), null, { timeout: 30000 });
  const saved = DB_ROWS().filter(r => r.galleryId === pub.galleryId).slice(-1)[0] || {};
  check(saved.type === 'post' && String(saved.fileId).split(',').length === 1 && /^pst_/.test(saved.postId), 'saved as a post (one picture): ' + saved.type + ' ' + saved.postId);
  console.log('post:', await pg.textContent('.ps-go'), '|', await pg.textContent('.pe-msg'));
  // ALBUM tab, then REEL hand-off
  await pg.click('.pe-v-share .pe-ib'); await pg.click('.pe-v-edit .pe-ib'); await pg.click('.pe-tab[data-mode=album]'); await pg.click('.pe-v-pick .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=edit]'); await pg.waitForTimeout(600);
  st = await pg.evaluate(() => Object.assign(PGPost.state(), PGPost.info())); console.log('ALBUM →', st.format, st.slides, 'slides | seams:', await pg.locator('.ps-seams i').count());
  check(st.format === 'strip' && st.slides > 1, 'Album is unchanged: the swipe album (' + st.slides + ' slides)');
  await pg.screenshot({ path: '/tmp/s25_album.png' });
  await pg.click('.pe-v-edit .pe-ib'); await pg.click('.pe-tab[data-mode=reel]'); await pg.waitForSelector('.rl-wrap', { timeout: 30000 });
  console.log('REEL tab opens Reel Edits:', await pg.isVisible('.rl-wrap'), '| post maker closed:', !(await pg.isVisible('.pe-wrap')));
  await pg.evaluate(() => PGReel.close());
  console.log(bad ? 'FAIL ' + bad + ' post checks' : 'all post checks passed');
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
