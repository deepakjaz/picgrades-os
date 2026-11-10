// Browser test (step 45): Find me asks name + mobile first and works once per number; guests download only their own photos,
// ask for others with their email; the couple approves in the Control Panel; the emailed link unlocks the photo.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'RULESWEDDING000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['rS', 'Sangeet'], ['rW', 'Wedding']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['RL' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Tara & Vikram', eventDate: '2026-12-20' });
const gid = pub.galleryId, ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const face = (v, k) => { const b = Buffer.alloc(128); for (let i = 0; i < 128; i++) b[i] = (v + i * (k || 3)) % 100; return [[0.1, 0.1, 0.2, 0.2], b.toString('base64')]; };
const FACES = {}; Object.keys(DRIVE.files).filter(id => id.startsWith('RL')).forEach(id => { FACES[id] = { w: 100, h: 100, f: [face(30 + Number(id.slice(2)), 11)] }; });
Object.assign(FACES, { RL00: { w: 100, h: 100, f: [face(500)] }, RL02: { w: 100, h: 100, f: [face(500), face(10, 1)] }, RL13: { w: 100, h: 100, f: [face(500)] }, RL11: { w: 100, h: 100, f: [face(10, 1)] } });
call('saveFaces', { token: admin, g: gid, pass: 1, done: true, photos: FACES });
console.log('face search ready:', call('getGallery', { g: gid }).gallery.faceSearch);
const ME = face(500)[1];
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8796, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const URL = 'http://localhost:8796/g/' + gid;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const ctx = async (w, hgt) => { const c = await b.newContext({ viewport: { width: w || 390, height: hgt || 844 }, hasTouch: !w, acceptDownloads: true }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); await img(p); await require('./fonts_local').install(p);
    // the face models are not needed here: the "selfie" gives the face code of photo RL00's person
    await p.addInitScript(code => { window.PGFaces = { load: () => Promise.resolve(), locate: () => Promise.resolve([]), detect: () => Promise.resolve([{ box: { x: 0, y: 0, width: 10, height: 10 }, descriptor: [] }]), pack: () => code }; }, ME);
    return [c, p]; };
  const hubFind = '#view-hub .pgl-findme, #view-hub [data-findme]:not(.hidden)';
  // ---------- 1. a new guest (incognito): Find me asks who they are ----------
  let [c1, g1] = await ctx(); await g1.goto(URL); await boot(g1);
  console.log('open-mode gallery, role:', await g1.evaluate(() => PGControl.role()), '| Find me card:', await g1.isVisible(hubFind));
  await g1.locator(hubFind).first().click(); await g1.waitForTimeout(400);
  console.log('Find me asks name + mobile first:', await g1.isVisible('#idSheet.show'), '| face sheet not open yet:', !(await g1.isVisible('#fmSheet.show')));
  await g1.screenshot({ path: '/tmp/s45_ask_name.png' });
  await g1.fill('#idName', 'Neha Sharma'); await g1.fill('#idPhone', '9876543210'); await g1.click('#idGo'); await g1.waitForSelector('#fmSheet.show');
  await g1.setInputFiles('#fmFile', path.join(FX, 'sample1.jpg')); await g1.waitForSelector('#fmResult:not(.hidden)', { timeout: 30000 });
  console.log('Find me result:', await g1.textContent('#fmStatus'));
  await g1.screenshot({ path: '/tmp/s45_found.png' });
  await g1.click('#fmClose'); await g1.waitForTimeout(400);
  await g1.click('.tkg-nav-item[data-nav=hub]'); await g1.waitForTimeout(500);
  await g1.locator(hubFind).first().scrollIntoViewIfNeeded(); await g1.evaluate(() => window.scrollBy(0, 160)); await g1.waitForTimeout(300);
  const card = await g1.locator(hubFind).first().textContent().catch(() => '');
  console.log('Hub card after Find me:', card.replace(/\s+/g, ' ').trim());
  await g1.screenshot({ path: '/tmp/s45_hub_yourphotos.png' });
  await g1.locator(hubFind).first().click(); await g1.waitForTimeout(700);
  console.log('tap opens their photos (no second search):', await g1.isVisible('#view-event'), await g1.textContent('#pgxTitle'), '| face sheet:', await g1.isVisible('#fmSheet.show'));
  // ---------- 2. downloads ----------
  const tryDl = async (p, id) => { const dl = p.waitForEvent('download', { timeout: 6000 }).then(() => true).catch(() => false); await p.evaluate(id => pgDownload(pgPhotoById()[id]), id); return dl; };
  console.log('downloads her own photo RL00:', await tryDl(g1, 'RL00'));
  console.log('other photo RL04 → no download:', !(await tryDl(g1, 'RL04')), '| ask sheet:', await g1.isVisible('.pgr-sheet'));
  console.log('sheet says:', (await g1.textContent('.pgr-why')).trim());
  await g1.screenshot({ path: '/tmp/s45_ask_download.png' });
  await g1.fill('.pgr-email', 'neha@example.com'); await g1.click('.pgr-send'); await g1.waitForTimeout(500);
  console.log('after sending:', (await g1.textContent('.pgr-how')).trim());
  await g1.screenshot({ path: '/tmp/s45_ask_sent.png' });
  await g1.click('.pgr-close'); await g1.waitForTimeout(200);
  // ---------- 3. the same number in another incognito window ----------
  let [c2, g2] = await ctx(); await g2.goto(URL); await boot(g2);
  await g2.locator(hubFind).first().click(); await g2.waitForTimeout(300);
  await g2.fill('#idName', 'Neha'); await g2.fill('#idPhone', '+91 98765 43210'); await g2.click('#idGo'); await g2.waitForTimeout(1200);
  console.log('same number again: face sheet opened:', await g2.isVisible('#fmSheet.show'), '| her photos opened:', await g2.isVisible('#view-event'), await g2.textContent('#pgxTitle').catch(() => ''));
  await c2.close();
  // ---------- 4. the couple approves in the Control Panel ----------
  let [c3, cp] = await ctx(); await cp.goto(URL + '?couple=' + ck); await boot(cp); await cp.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 });
  console.log('couple: Find me card still says', ((await cp.locator(hubFind).first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim(), '| couple downloads anything:', await tryDl(cp, 'RL04'));
  await cp.click('.tkg-nav-item[data-nav=studio]'); await cp.waitForSelector('.pgcp-sheet'); await cp.click('.pgcp-tabs [data-tab=requests]'); await cp.waitForSelector('.pgr-row', { timeout: 8000 });
  console.log('couple sees requests:', (await cp.locator('.pgr-row .pgr-who').allTextContents()).join(' | '));
  await cp.waitForTimeout(400); await cp.screenshot({ path: '/tmp/s45_requests.png' });
  const before = mail.length;
  await cp.click('.pgr-yes'); await cp.waitForSelector('.pgr-row.done', { timeout: 8000 }); await cp.waitForTimeout(300);
  console.log('after approve:', (await cp.locator('.pgr-row em').allTextContents()).join(' | '));
  await cp.screenshot({ path: '/tmp/s45_requests_done.png' });
  const em = mail.slice(before).find(m => m.to === 'neha@example.com'); const link = em && (/href="([^"]+\?dl=[^"]+)"/.exec(em.htmlBody) || [])[1];
  console.log('email to the guest:', em && em.subject, '| link:', !!link);
  await c3.close();
  // ---------- 5. the guest opens the emailed link ----------
  await g1.goto(link.replace(/^https?:\/\/[^/]+/, 'http://localhost:8796')); await boot(g1); await g1.waitForTimeout(900);
  console.log('link opens the approved photos:', await g1.isVisible('#view-event'), await g1.textContent('#pgxTitle'), '| address cleaned:', !/dl=/.test(g1.url()));
  await g1.screenshot({ path: '/tmp/s45_approved.png' });
  console.log('now RL04 downloads:', await tryDl(g1, 'RL04'), '| RL05 still asks:', !(await tryDl(g1, 'RL05')));
  await c1.close();
  // ---------- 6. laptop look ----------
  let [c4, lp] = await ctx(1366, 860); await lp.goto(URL); await boot(lp);
  await lp.evaluate(() => { localStorage.setItem('pg_guest_' + GALLERY_ID, JSON.stringify({ guestId: 'x', guestKey: 'y', name: 'Ravi' })); });
  await lp.evaluate(() => pgDownload(pgPhotoById().RL05)); await lp.waitForTimeout(500); await lp.screenshot({ path: '/tmp/s45_laptop_ask.png' });
  await c4.close();
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
