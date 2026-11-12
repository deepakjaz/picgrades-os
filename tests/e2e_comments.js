// Browser test (step 47): notes on the photo view — below the photo, typing on the photo, or only the button; both photo views; the Control Panel choice.
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
[['BG00', 'Mira', 'You both look stunning! So much love ❤️'], ['BG00', 'Arjun', 'Bhai what a night, the baraat was unreal 🔥'], ['BG00', 'Nani', 'Jeete raho, khush raho beta'], ['BG12', 'Kabir', 'Best sangeet ever, the dance-off was epic'], ['BG13', 'Nani', 'God bless you both, always'], ['BG25', 'Riya', 'That cake moment 😂']].forEach(([id, n, t]) => call('addNote', { g: gid, photoId: id, name: n, text: t, device: 'devnote' + n + 'xxxx' }));
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(REPO, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8795, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
  const open = async (w, hh, q) => { const c = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: w < 900 }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(p); await p.goto('http://localhost:8795/g/' + gid + (q || '')); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(1200); return [c, p]; };
  let [c, p] = await open(390, 844);
  console.log('default style:', await p.evaluate(() => PGComments.style()));
  await p.evaluate(() => openCollection('Sangeet', 0)); await p.waitForSelector('.pgcm-live.in', { timeout: 8000 });
  console.log('full-screen view, below: notes shown', await p.locator('.pgcm-live .pgcm-n').count(), '| newest first:', (await p.locator('.pgcm-live .pgcm-n b').first().textContent()));
  await p.screenshot({ path: '/tmp/s47_live_below.png' });
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(900);
  console.log('next photo (no notes): panel gone', !(await p.isVisible('.pgcm')));
  // typing
  await p.evaluate(() => { switchViewFromNav('hub'); GALLERY.pages = Object.assign({}, GALLERY.pages, { comments: 'typing' }); openCollection('Sangeet', 0); });
  await p.waitForSelector('.pgcm-live.pgcm-typing', { timeout: 8000 }); await p.waitForTimeout(400);
  console.log('typing: first "is writing…":', await p.evaluate(() => document.querySelector('.pgcm-bubble').classList.contains('writing')));
  await p.waitForTimeout(700); const t1 = (await p.textContent('.pgcm-text')).length; await p.screenshot({ path: '/tmp/s47_live_typing_mid.png' });
  await p.waitForTimeout(900); const t2 = (await p.textContent('.pgcm-text')).length;
  console.log('letters appear one by one:', t1 > 0 && t2 > t1, t1, '→', t2);
  await p.waitForTimeout(3500); const who1 = await p.textContent('.pgcm-who');
  await p.waitForTimeout(4500); const who2 = await p.textContent('.pgcm-who');
  console.log('then the next note:', who1, '→', who2, who1 !== who2);
  // classic view
  await p.evaluate(() => { switchViewFromNav('hub'); GALLERY.pages.viewer = 'classic'; GALLERY.pages.comments = 'below'; openCollection('Sangeet', 0); });
  await p.waitForSelector('.pgcv .pgcm-classic.in', { timeout: 8000 });
  const r = await p.evaluate(() => { const a = document.querySelector('.pgcv-img').getBoundingClientRect(), b = document.querySelector('.pgcm-classic').getBoundingClientRect(); return [Math.round(a.bottom), Math.round(b.top)]; });
  console.log('classic view, below: notes under the photo (no overlap):', r[0] <= r[1] + 2, JSON.stringify(r));
  await p.screenshot({ path: '/tmp/s47_classic_below.png' });
  await p.click('.pgcv-next'); await p.waitForTimeout(700); console.log('classic next photo: panel gone', !(await p.isVisible('.pgcm')));
  await p.click('.pgcv-prev'); await p.waitForSelector('.pgcm-classic.in', { timeout: 8000 });
  await p.click('.pgcm-all'); await p.waitForTimeout(500); console.log('"Add a note" opens the notes sheet:', await p.isVisible('#commentSheet.show'));
  await p.evaluate(() => { document.querySelectorAll('.reg-overlay.show,.overlay-backdrop.show').forEach(e => e.classList.remove('show')); pgViewerClassic.close(); GALLERY.pages = Object.assign({}, GALLERY.pages, { viewer: 'live', comments: 'off' }); openCollection('Sangeet', 0); });
  await p.waitForTimeout(1200); console.log('off: nothing on the photo', !(await p.isVisible('.pgcm')));
  await c.close();
  // the couple picks "Typing" in the Control Panel
  [c, p] = await open(390, 844, '?couple=' + ck); await p.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 });
  await p.click('.tkg-nav-item[data-nav=studio]'); await p.waitForSelector('.pgcp-style[data-pagekey=comments]');
  console.log('panel choices:', (await p.locator('.pgcp-style[data-pagekey=comments] b').allTextContents()).join(' · '));
  await p.locator('.pgcp-style[data-pagekey=comments][data-style=typing]').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/s47_panel.png' });
  await p.click('.pgcp-style[data-pagekey=comments][data-style=typing]'); await p.waitForSelector('.pgcp-pv-wait[hidden]', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/s47_panel_preview.png' });
  await p.click('.pgcp-pv-apply'); await p.waitForTimeout(900);
  console.log('saved for the wedding:', call('getGallery', { g: gid }).gallery.pages.comments);
  await c.close();
  // laptop
  [c, p] = await open(1366, 860); await p.evaluate(() => openCollection('Sangeet', 0)); await p.waitForSelector('.pgcm-live.pgcm-typing', { timeout: 8000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/s47_laptop_typing.png' });
  await c.close();
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
