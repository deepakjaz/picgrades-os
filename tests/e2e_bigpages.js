// Browser test (step 46): big screens — the top menu in the header, the bottom bar after scrolling, sheets as centred windows, the Notes wall.
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
}).listen(8797, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const open = async (w, hh) => { const c = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: w < 900 }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(p); await p.goto('http://localhost:8797/g/' + gid); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(1200); return [c, p]; };
  // laptop
  let [c, p] = await open(1366, 860);
  const vis = s => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.1 && cs.display !== 'none'; }, s);
  console.log('laptop: top menu', await vis('.pg-topnav'), '| items', (await p.locator('.pg-topnav button:not([hidden])').allTextContents()).join(' · '), '| on:', await p.textContent('.pg-topnav button.on'));
  console.log('bottom bar hidden at the top:', !(await vis('.tkg-global-nav')));
  await p.click('.pg-topnav [data-go=rooms]'); await p.waitForTimeout(600);
  console.log('Notes from the top menu:', await p.evaluate(() => document.body.dataset.view), '| on:', await p.textContent('.pg-topnav button.on'), '| wall columns:', await p.evaluate(() => getComputedStyle(document.getElementById('pgWall')).columnCount), '| cards:', await p.locator('#pgWall .pgh-note').count());
  await p.screenshot({ path: '/tmp/s46_laptop_notes.png' });
  await p.click('.pg-topnav [data-go=gallery]'); await p.waitForTimeout(500); console.log('Galleries:', await p.textContent('.pg-topnav button.on'));
  await p.click('.pg-topnav [data-go=hub]'); await p.waitForTimeout(600);
  await p.mouse.move(600, 500); await p.mouse.wheel(0, 900); await p.waitForTimeout(600);
  console.log('after scrolling, bottom bar shows:', await vis('.tkg-global-nav'));
  await p.screenshot({ path: '/tmp/s46_laptop_hub_scrolled.png' });
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('pgcFind').click()); await p.waitForTimeout(400);
  if (await p.isVisible('#idSheet.show')) { const r = await p.evaluate(() => { const x = document.getElementById('idSheet').getBoundingClientRect(); return [Math.round(x.top), Math.round(x.bottom), innerHeight]; });
    console.log('the sheet is a centred window:', r[0] > 40 && r[1] < r[2] - 40, JSON.stringify(r)); await p.screenshot({ path: '/tmp/s46_laptop_sheet.png' }); }
  await c.close();
  // a couple on a laptop: Control Panel in the menu
  const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
  [c, p] = await open(1366, 860); await p.goto('http://localhost:8797/g/' + gid + '?couple=' + ck); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 }); await p.waitForTimeout(500);
  console.log('couple menu:', (await p.locator('.pg-topnav button:not([hidden])').allTextContents()).join(' · '));
  await p.click('.pg-topnav [data-go=studio]'); await p.waitForTimeout(500); console.log('Control Panel opens from the menu:', await p.isVisible('.pgcp-sheet'));
  await p.screenshot({ path: '/tmp/s46_laptop_panel.png' });
  await c.close();
  // phone: no top menu, bottom bar as before
  [c, p] = await open(390, 844);
  console.log('phone: top menu shown', await p.isVisible('.pg-topnav'), '| bottom bar', await p.isVisible('.tkg-global-nav'));
  await c.close();
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
