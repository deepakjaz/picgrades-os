// Browser test (step 42): the wedding's photographer set in the Control Panel; what guests see; PicGrades credit on / off.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'PHOWEDDING00000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['pS', 'Sangeet'], ['pW', 'Wedding'], ['pR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 5; i++) DRIVE.files['PS' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const f = DRIVE.files[id]; if (f && f.bytes) return Buffer.from(f.bytes); const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const ACTS = [];
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); ACTS.push(p.action); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8792, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const URL = 'http://localhost:8792/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const phone = async tok => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); await img(p); await require('./fonts_local').install(p);
    if (tok) await p.addInitScript(t => { try { localStorage.setItem('pg_token', t); } catch (e) {} }, tok); return [c, p]; };
  // PicGrades sets WFA as the photographer
  let [cs, st] = await phone(admin); await st.goto(URL); await boot(st); await st.waitForFunction(() => PGControl.role() === 'picgrades', null, { timeout: 10000 });
  await st.click('.tkg-nav-item[data-nav=studio]'); await st.waitForSelector('.pgcp-sheet'); await st.click('.pgcp-tabs [data-tab=photographer]'); await st.waitForTimeout(300);
  console.log('Photographer tab: fields', await st.locator('.pgcp-form input, .pgcp-form textarea').count(), '| credit switch (PicGrades):', await st.locator('.pgcp-form input[name=credit]').count());
  const fill = { name: 'WFA', instagram: 'https://www.instagram.com/wfa.with.love?psln=dzZmcWRwNGxxY245', website: 'wfa.example.com', phone: '+91 98765-43210', city: 'Surat, Gujarat', about: 'Wedding films and photographs, made with love.' };
  for (const [k, v] of Object.entries(fill)) await st.fill('.pgcp-form [name=' + k + ']', v);
  await st.screenshot({ path: '/tmp/s42_panel.png' });
  await st.click('.pgcp-form button[type=submit]'); await st.waitForTimeout(900);
  const G = call('getGallery', { g: pub.galleryId }).gallery;
  console.log('saved:', G.studio, JSON.stringify(G.photographer));
  await cs.close();
  // a guest sees WFA
  let [cg, gp] = await phone(); await gp.goto(URL); await boot(gp);
  console.log('guest Hub: photographed by', await gp.textContent('#pghStudio'), '|', await gp.textContent('.pgh-ig'), '| credit line:', await gp.locator('#view-hub .pgp-credit').count(), '| header has no PicGrades:', !(await gp.textContent('.mk-header')).includes('PicGrades'));
  await gp.evaluate(() => { const v = document.getElementById('view-hub'); window.scrollTo(0, document.documentElement.scrollHeight); }); await gp.waitForTimeout(400);
  await gp.screenshot({ path: '/tmp/s42_hub_end.png' });
  await gp.click('.pgh-studio'); await gp.waitForTimeout(600);
  const links = await gp.$$eval('.pgp-act', l => l.map(a => a.querySelector('b').textContent + ' → ' + a.getAttribute('href')));
  console.log('photographer page:', await gp.textContent('#pgStudioName'), '|', links.join(' | '));
  await gp.evaluate(() => window.scrollTo(0, 0)); await gp.screenshot({ path: '/tmp/s42_page.png', fullPage: true });
  await cg.close();
  // PicGrades turns its credit off for this client
  call('setPhotographer', { token: admin, g: pub.galleryId, credit: 'off' });
  [cg, gp] = await phone(); await gp.goto(URL); await boot(gp);
  console.log('credit off: header has no PicGrades:', !(await gp.textContent('.mk-header')).includes('PicGrades'), '| credit lines:', await gp.locator('.pgp-credit').count(), '| tab title:', await gp.title());
  await gp.screenshot({ path: '/tmp/s42_nocredit.png' });
  await cg.close();
  call('setPhotographer', { token: admin, g: pub.galleryId, photographer: '{}', credit: 'on' });
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
