// Browser test (step 50): a guest upload waiting for review is private; the couple and the guest see a preview made by the server.
const REPO = require('path').join(__dirname, '..');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const FX = REPO + '/tests/fixtures', files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'BIGSCREENWED00000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['bS', 'Sangeet'], ['bW', 'Wedding'], ['bR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 8; i++) DRIVE.files['BG' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
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
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(REPO, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8790, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
  const j = call('guestJoin', { g: gid, name: 'Riya Mehta', phone: '9811122233', device: 'devsecui001' });
  const up = call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'image/jpeg', base64: Buffer.from('x').toString('base64'), caption: 'Dance floor!' });
  const up2 = call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'image/jpeg', base64: Buffer.from('y').toString('base64'), caption: 'Not for the album' });
  call('couplePost', { g: gid, coupleKey: ck, postId: up2.postId, decision: 'hide' });   // step 52: hidden → bin at once
  const thumb = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(FX, files[0])).toString('base64');
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  // the mock Drive's preview is 4 bytes; give the page a real picture so the screenshot shows something
  await p.route('**/api', async r => { const body = JSON.parse(r.request().postData()); const out = call(body.action, body); if (out.waiting) out.waiting.concat(out.decided || []).forEach(x => { if (x.thumb) x.thumb = thumb; }); r.fulfill({ contentType: 'application/json', body: JSON.stringify(out) }); });
  await require('./fonts_local').install(p);
  await p.goto('http://localhost:8790/g/' + gid + '?couple=' + ck); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(1200);
  await p.evaluate(() => document.getElementById('pgcReview').click()); await p.waitForSelector('#cpList img', { timeout: 8000 }); await p.waitForTimeout(500);
  const src = await p.getAttribute('#cpList img', 'src');
  console.log('couple review shows the server preview (not a public link):', src.startsWith('data:image/'), '| Drive file:', DRIVE.files[Object.keys(DRIVE.files).filter(k => /^file/.test(k)).pop()].sharing);
  console.log('keep-7-days switch:', await p.isVisible('#cpKeep'), '| hidden list:', (await p.locator('.cp-hidden b').allTextContents()).join(','), '| Show again button:', await p.isVisible('.cp-hidden .yes'));
  await p.screenshot({ path: '/tmp/s50_review.png' });
  await p.click('.cp-hidden .yes'); await p.waitForTimeout(1200);
  console.log('Show again → hidden list now:', await p.locator('.cp-hidden').count(), '| file back from the bin:', !DRIVE.files[Object.keys(DRIVE.files).filter(k => /^file/.test(k)).pop()].trashed);
  await c.close();
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
