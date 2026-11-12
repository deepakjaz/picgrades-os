// Browser test (step 51): a guest swipes the big photo with a finger (not the filmstrip) — every photo shows, none stays blank.
const REPO = require('path').join(__dirname, '..');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const FX = REPO + '/tests/fixtures', files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'BIGSCREENWED00000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['bS', 'Sangeet'], ['bW', 'Wedding'], ['bR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 30; i++) DRIVE.files['BG' + k + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
const bytesOf = id => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Tara & Vikram', eventDate: '2026-12-20' }).galleryId;
const face = (v, k) => { const b = Buffer.alloc(128); for (let i = 0; i < 128; i++) b[i] = (v + i * (k || 3)) % 100; return [[0.1, 0.1, 0.2, 0.2], b.toString('base64')]; };
const F = {}; Object.keys(DRIVE.files).filter(i => i.startsWith('BG')).forEach(i => F[i] = { w: 1, h: 1, f: [face(Number(i.slice(2)), 7)] });
call('saveFaces', { token: admin, g: gid, pass: 1, done: true, photos: F });
['BG00', 'BG01', 'BG12', 'BG13', 'BG25'].forEach((id, i) => { for (let k = 0; k <= i; k++) call('likePhoto', { g: gid, photoId: id, device: 'devlike' + k + 'xxxx', liked: true }); });
[['BG00', 'Mira', 'You both look stunning! So much love ❤️'], ['BG12', 'Kabir', 'Best sangeet ever, the dance-off was epic'], ['BG13', 'Nani', 'God bless you both, always'], ['BG25', 'Riya', 'That cake moment 😂']].forEach(([id, n, t]) => call('addNote', { g: gid, photoId: id, name: n, text: t, device: 'devnote' + n + 'xxxx' }));
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(REPO, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8789, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
  // photos arrive a little slowly, like on a venue's mobile network
  await p.route('https://lh3.googleusercontent.com/**', async r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; await new Promise(z => setTimeout(z, 150)); r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(p);
  await p.goto('http://localhost:8789/g/' + gid); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(1000);
  console.log('role:', await p.evaluate(() => PGControl.role()));
  await p.evaluate(() => openCollection('Sangeet', 0)); await p.waitForTimeout(1500);
  console.log('what is under the finger:', await p.evaluate(() => [[180, 600], [180, 400], [195, 300]].map(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.className || e.tagName) + '|' + getComputedStyle(e).touchAction : 'none'; }).join(' ; ')), '| feed touch-action:', await p.evaluate(() => getComputedStyle(document.getElementById('pgvFeed')).touchAction + ' overflow ' + getComputedStyle(document.getElementById('pgvFeed')).overflowY));
  const cdp = await c.newCDPSession(p);
  const state = () => p.evaluate(() => { const f = document.getElementById('pgvFeed'), i = Math.round(f.scrollTop / f.clientHeight), im = f.querySelectorAll('.pgv-item img')[i];
    return { at: i + 1, shown: !!(im && im.src && !im.src.startsWith('data:') && im.complete && im.naturalWidth > 0) }; });
  const blanks = [];
  for (let k = 0; k < 10; k++) {   // ten quick finger swipes up on the big photo
    // a real finger: touch down low on the photo, move up quickly, lift
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 640 }] });
    for (let s = 1; s <= 8; s++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 640 - s * 60 }] }); await p.waitForTimeout(12); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(420); const s = await state(); if (!s.shown) blanks.push(s.at);
  }
  console.log('after 10 finger swipes: at photo', (await state()).at, '| blank while swiping:', JSON.stringify(blanks));
  await p.waitForTimeout(1200); console.log('a moment later:', JSON.stringify(await state()));
  await p.screenshot({ path: '/tmp/s51_swipe.png' });
  await c.close(); console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
