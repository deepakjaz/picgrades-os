// Browser test: a wedding with Find me on and NO Wedding Highlights picked still opens for a guest
// (before the fix, the Hub cover had no photo to show and the app stayed on "Opening the gallery…").
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'NOHIGHLIGHTSWEDDING1';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
DRIVE.folders[W + 'e'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['NHP' + i] = { name: 'p' + i + '.jpg', parent: W + 'e', mime: 'image/jpeg' };
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
call('guestPhotos', { g: pub.galleryId, coupleKey: ck, mode: 'findme' });
call('publishGallery', { g: pub.galleryId, token: admin, publish: true });
global.__fetchBytes = id => fs.readFileSync(path.join(FX, files[(parseInt(String(id).replace(/\D/g, ''), 10) || 0) % files.length]));

const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = ''; req.on('data', d => body += d);
    req.on('end', () => { const p = JSON.parse(body); res.end(JSON.stringify(call(p.action, p))); });
    return;
  }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0];
  if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => {
    if (e) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript');
    res.end(d);
  });
}).listen(8913, async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const errors = [];
  let fails = 0;
  const ok = (v, m) => { console.log((v ? 'ok   ' : 'FAIL ') + m); if (!v) fails++; };
  for (const w of [390, 1200]) {
    const pg = await browser.newPage({ viewport: { width: w, height: 844 } });
    pg.on('pageerror', e => errors.push(e.message));
    await pg.goto('http://localhost:8913/g/' + pub.galleryId);
    const opened = await pg.waitForSelector('#pgBoot.hide', { state: 'attached', timeout: 20000 }).then(() => true, () => false);
    ok(opened, w + 'px: the guest app opens (not stuck on "Opening the gallery…")');
    ok(await pg.evaluate(() => !!document.querySelector('#view-hub, .tkg-nav')), w + 'px: the Hub and the menu are there');
    await pg.close();
  }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(errors.length === 0, 'no page errors');
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
});
