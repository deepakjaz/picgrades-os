// Browser test (step 48): photo protection for guests — no right-click / drag, screen-size photos, watermark set by the couple; the couple is not limited.
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
}).listen(8794, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
  const open = async (w, hh, q) => { const c = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: w < 900 }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(p); await p.goto('http://localhost:8794/g/' + gid + (q || '')); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(1200); return [c, p]; };
  const probe = p => p.evaluate(() => { const im = document.querySelector('.pgcv-img') || document.querySelector('#view-root .pgv-item[data-i="' + activeIdx + '"] img:not(.pgv-iblur img)') || [...document.querySelectorAll('#view-root .pgv-item[data-i="' + activeIdx + '"] img')].pop();
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); im.dispatchEvent(ev);
    const dr = new DragEvent('dragstart', { bubbles: true, cancelable: true }); im.dispatchEvent(dr);
    const wm = document.querySelector('.pgwm');
    return { guard: document.body.classList.contains('pg-guard'), rightClickBlocked: ev.defaultPrevented, dragBlocked: dr.defaultPrevented, width: +((im.currentSrc || im.src).match(/=w(\d+)/) || [])[1], callout: getComputedStyle(im).webkitTouchCallout, watermark: !!(wm && getComputedStyle(wm).display !== 'none' && wm.style.backgroundImage) }; });
  // guest on a laptop, watermark off
  let [c, p] = await open(1366, 860);
  await p.evaluate(() => openCollection('Sangeet', 1)); await p.waitForTimeout(1200);
  console.log('guest, watermark off:', JSON.stringify(await probe(p)));
  await c.close();
  // the couple: nothing blocked, full size; turns the watermark on in Functions
  [c, p] = await open(1366, 860, '?couple=' + ck); await p.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 });
  await p.evaluate(() => openCollection('Sangeet', 1)); await p.waitForTimeout(1200);
  console.log('couple:', JSON.stringify(await probe(p)));
  await p.evaluate(() => switchViewFromNav('hub')); await p.waitForTimeout(300);
  await p.click('.pg-topnav [data-go=studio]'); await p.waitForSelector('.pgcp-sheet'); await p.click('.pgcp-tabs [data-tab=functions]'); await p.waitForSelector('.pgwm-pane');
  console.log('Functions › Photo protection:', (await p.locator('.pgwm-pane .pgf-row b').allTextContents()).join(' · '), '| words box hidden while off:', await p.locator('.pgwm-lab').isHidden());
  await p.locator('.pgwm-pane .pgf-sw').check(); await p.waitForTimeout(300); await p.fill('.pgwm-text', 'Tara & Vikram · WFA'); await p.waitForTimeout(1600);
  await p.locator('.pgwm-pane').scrollIntoViewIfNeeded(); await p.screenshot({ path: '/tmp/s48_panel.png' });
  const saved = call('getGallery', { g: gid }).gallery.pages; console.log('saved:', saved.watermark, '|', saved.wmtext);
  await c.close();
  // guest again (phone): watermark shows, photo capped, own photo stays clean and full
  [c, p] = await open(390, 844);
  await p.evaluate(() => openCollection('Sangeet', 1)); await p.waitForTimeout(1400);
  console.log('guest phone, watermark on:', JSON.stringify(await probe(p)));
  await p.screenshot({ path: '/tmp/s48_guest_phone.png' });
  await c.close();
  [c, p] = await open(1366, 860);
  await p.evaluate(() => { localStorage.setItem('pg_mine_' + GALLERY_ID, JSON.stringify({ sure: [GALLERY.events[0].photos[2].id], maybe: [] })); });
  await p.evaluate(() => openCollection('Sangeet', 1)); await p.waitForTimeout(1300);
  console.log('guest laptop, not hers:', JSON.stringify(await probe(p)));
  await p.screenshot({ path: '/tmp/s48_guest_laptop.png' });
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1300);
  console.log('guest laptop, her own photo:', JSON.stringify(await probe(p)));
  // classic view
  await p.evaluate(() => { switchViewFromNav('hub'); GALLERY.pages.viewer = 'classic'; openCollection('Sangeet', 1); }); await p.waitForTimeout(1300);
  console.log('classic view, not hers:', JSON.stringify(await probe(p)));
  await p.screenshot({ path: '/tmp/s48_classic.png' });
  await c.close();
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
