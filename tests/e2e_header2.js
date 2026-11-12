// Browser test (step 49): no photo counts for anyone in the app (only in the Control Panel); the header is logo + light/dark + ☰ menu, no name; logo and light/dark move on their own.
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
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(REPO, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8793, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
  const open = async (w, hh, q) => { const c = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: w < 900 }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(p); await p.goto('http://localhost:8793/g/' + gid + (q || '')); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(1200); return [c, p]; };
  const counts = p => p.evaluate(() => { const t = document.body.innerText; return (t.match(/\b\d+\s+(photos?|images?)\b|\b\d+\s*\/\s*\d+\b|All \d+/gi) || []).slice(0, 6); });
  const where = p => p.evaluate(() => { const x = s => { const e = document.querySelector(s); if (!e || !e.offsetParent && getComputedStyle(e).position !== 'fixed') { const r = e && e.getBoundingClientRect(); return r && r.width ? Math.round(r.left) : -1; } return Math.round(e.getBoundingClientRect().left); };
    return { name: !!document.querySelector('.mk-brand-title') && document.querySelector('.mk-brand-box').offsetParent !== null, logo: x('#stampThemeBtn'), mode: x('#pgModeBtn'), menu: x('#pgMenuBtn'), W: innerWidth }; });
  let [c, p] = await open(390, 844);
  let w = await where(p);
  console.log('phone header:', JSON.stringify(w), '| name hidden:', !w.name, '| light/dark right of logo:', w.mode > w.logo, '| menu at the right end:', w.menu > w.mode);
  await p.screenshot({ path: '/tmp/s49_hub.png' });
  for (const v of ['hub', 'gallery']) { await p.evaluate(v => switchViewFromNav(v), v); await p.waitForTimeout(600); console.log('counts on', v + ':', JSON.stringify(await counts(p))); }
  await p.screenshot({ path: '/tmp/s49_galleries.png' });
  await p.evaluate(() => pgOpenEvent('Sangeet')); await p.waitForTimeout(700); console.log('counts on event page:', JSON.stringify(await counts(p)));
  await p.evaluate(() => openCollection('Sangeet', 1)); await p.waitForTimeout(900); console.log('counts in the photo view:', JSON.stringify(await counts(p)), '| "2 / 8" hidden:', !(await p.isVisible('#pgvCount')));
  await p.evaluate(() => { switchViewFromNav('hub'); GALLERY.pages.viewer = 'classic'; openCollection('Sangeet', 1); }); await p.waitForTimeout(900); console.log('classic view counts:', JSON.stringify(await counts(p)));
  await p.evaluate(() => { pgViewerClassic.close(); GALLERY.pages.viewer = 'live'; switchViewFromNav('hub'); }); await p.waitForTimeout(400);
  // the menu
  await p.click('#pgMenuBtn'); await p.waitForTimeout(500);
  console.log('menu:', (await p.locator('.pgmenu .pgmenu-h, .pgmenu .pgmenu-i span').allTextContents()).join(' | '));
  await p.screenshot({ path: '/tmp/s49_menu.png' });
  await p.click('.pgmenu-i:has-text("Notes")'); await p.waitForTimeout(700); console.log('menu → Notes:', await p.evaluate(() => document.body.dataset.view), '| menu closed:', !(await p.isVisible('.pgmenu')));
  await p.click('#pgMenuBtn'); await p.waitForTimeout(400); await p.evaluate(() => history.back()); await p.waitForTimeout(600); console.log('back button closes the menu:', !(await p.isVisible('.pgmenu')));
  await p.click('#pgMenuBtn'); await p.waitForTimeout(400); await p.click('.pgmenu-i:has-text("Dark mode")'); await p.waitForTimeout(400); console.log('menu → dark mode:', await p.evaluate(() => document.documentElement.getAttribute('data-tkg-theme')));
  await c.close();
  // the couple: counts in the Control Panel only; moves the logo left and keeps light/dark right, then both left
  [c, p] = await open(390, 844, '?couple=' + ck); await p.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 });
  console.log('couple sees no counts on the Hub either:', JSON.stringify(await counts(p)));
  await p.click('.tkg-nav-item[data-nav=studio]'); await p.waitForSelector('.pgcp-sheet'); await p.click('.pgcp-tabs [data-tab=functions]'); await p.waitForSelector('.pgcp-stats');
  console.log('Control Panel numbers:', (await p.locator('.pgcp-stat').allTextContents()).join(' · ')); await p.click('.pgcp-statlist summary'); await p.waitForTimeout(200);
  await p.screenshot({ path: '/tmp/s49_panel.png' });
  await p.evaluate(() => { document.querySelector('.pgcp-tabs [data-tab=look]').click(); }); await p.waitForTimeout(300);
  await p.click('.pgcp-design'); await p.waitForSelector('.pged');
  await p.click('.pged-logo [data-logo=left]'); await p.waitForTimeout(200);
  console.log('editor: logo left, light/dark still right:', await p.evaluate(() => [document.querySelector('.pged-logo .on').dataset.logo, document.querySelector('.pged-mode .on').dataset.mode].join('/')));
  await p.screenshot({ path: '/tmp/s49_editor.png' });
  await p.click('.pged-pub'); await p.waitForTimeout(1500);
  w = await where(p); console.log('published: logo left', w.logo < 100, '| light/dark right', w.mode > 250, '| saved:', JSON.stringify(call('getGallery', { g: gid }).gallery.pages));
  await p.screenshot({ path: '/tmp/s49_logo_left.png' });
  await c.close();
  [c, p] = await open(390, 844); w = await where(p); console.log('guests get the same header:', w.logo < 100 && w.mode > 250);
  await c.close();
  // laptop
  [c, p] = await open(1366, 860); w = await where(p); console.log('laptop header:', JSON.stringify(w)); await p.screenshot({ path: '/tmp/s49_laptop.png' }); await c.close();
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
