// Step 83: Reel Edits gets the wedding's face boxes (same faceBoxes route as Post Edits),
// so a photo with a face near the top is framed with that face in view.
const http = require('http'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const { call, mail, DRIVE } = require('./gas_mock');
const RE = require('./reel_helper');
const root = path.join(__dirname, '..');
// A tall photo: a red band at the very top (the "face"), grey below — any frame that crops from the middle loses the red.
const TALL = path.join(require('os').tmpdir(), 'pg-step83-tall.jpg');
execSync('python3 -c "from PIL import Image,ImageDraw;i=Image.new(\'RGB\',(600,2400),(128,128,128));ImageDraw.Draw(i).rectangle([0,0,600,200],fill=(230,20,20));i.save(\'' + TALL + '\',quality=92)"');
const tallBytes = fs.readFileSync(TALL);
const W = 'T4FACESWEDDING0000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
DRIVE.folders.t4w = { name: 'Wedding', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['T4F' + i] = { name: 'p' + i + '.jpg', parent: 't4w', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
global.__fetchBytes = () => tallBytes;
// the face box (thousandths, like the real route): the red band at the top of every photo
const BOX = [300, 10, 400, 70];
let faceCalls = 0;
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let b = ''; req.on('data', d => b += d); req.on('end', () => {
      const p = JSON.parse(b);
      if (p.action === 'faceBoxes') { faceCalls++; const boxes = {}; for (let i = 0; i < 6; i++) boxes['T4F' + i] = [BOX]; res.end(JSON.stringify({ ok: true, boxes })); return; }
      const r = call(p.action, p);
      if (p.action === 'getGallery' && r.gallery) r.gallery.faceSearch = true;   // face search is "ready" for this wedding
      res.end(JSON.stringify(r));
    }); return;
  }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/i.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8918, async () => {
  const { chromium } = require('playwright'), browser = await chromium.launch(), errors = []; let fails = 0;
  const ok = (v, m) => { console.log((v ? 'ok   ' : 'FAIL ') + m); if (!v) fails++; };
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: tallBytes }));
    await page.goto('http://localhost:8918/g/' + pub.galleryId + '?couple=' + ck); await page.waitForSelector('#pgBoot.hide', { state: 'attached' }); await page.waitForTimeout(500);
    await page.click('#pghReel'); await RE.toEditor(page, 'dynamic');
    await page.waitForFunction(() => !!window.pgFaceBoxes, null, { timeout: 10000 });
    ok(faceCalls === 1, 'Reel Edits asks the faceBoxes route once');
    ok(await page.evaluate(() => Math.abs(window.pgFaceBoxes.T4F0[0][1] - 0.01) < 1e-9), 'face boxes are turned from thousandths into 0–1');
    // how much of the frame is red (the face) across the reel, with the faces the app passed in, then with none
    const red = () => page.evaluate(() => {
      const c = document.querySelector('.re-v-edit .re-stage canvas'), x = c.getContext('2d'), d = PGReel.state().dur; let n = 0;
      for (let k = 1; k <= 8; k++) { PGReel.frame(d * k / 9); const px = x.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < px.length; i += 64) if (px[i] > 180 && px[i + 1] < 90 && px[i + 2] < 90) n++; }
      return n;
    });
    const withFaces = await red();
    await page.evaluate(() => PGReel.setFaces({}));
    const without = await red();
    console.log('     red samples with faces:', withFaces, ' without:', without);
    ok(withFaces > 0, 'the face near the top of the photo is in the frame');
    ok(withFaces > without, 'with face boxes more of the face is kept in view than without');
    await page.evaluate(() => PGReel.close());
    await page.click('#pghReel'); await RE.toEditor(page, 'dynamic'); await page.waitForTimeout(300);
    ok(faceCalls === 1, 'a second reel reuses the face boxes already loaded');
    ok(errors.length === 0, 'page errors: ' + JSON.stringify(errors));
  } catch (e) { console.error(e); fails++; }
  await browser.close(); server.close(); process.exit(fails ? 1 : 0);
});
