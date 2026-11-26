// Step 80 browser check: couple names a photo-time group in the Control Panel; Events shows the saved name.
const http = require('http'), fs = require('fs'), path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
const photos = fs.readdirSync(FX).filter(f => /\.jpg$/i.test(f));
const W = 'STEP80BROWSERWEDDING001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
function add(id, time) { const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(time); DRIVE.files[id] = { name: id + '.jpg', parent: W, mime: 'image/jpeg', time: m ? m[1] + ':' + m[2] + ':' + m[3] + ' ' + m[4] + ':' + m[5] + ':00' : '' }; }
for (let i = 0; i < 6; i++) add('B80A' + i, '2026-11-20 09:' + String(i * 10).padStart(2, '0'));
for (let i = 0; i < 6; i++) add('B80B' + i, '2026-11-20 17:' + String(i * 10).padStart(2, '0'));
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const admin = login('adcmediaa@gmail.com');
const order = call('queue', { token: admin }).recentDone[0];
const made = call('setGallery', { token: admin, orderId: order.orderId, folderUrl: W, title: 'Anika & Rohan' });
const galleryId = made.galleryId, coupleKey = call('facesStatus', { token: admin, g: galleryId }).gallery.coupleKey;
const bytesOf = id => fs.readFileSync(path.join(FX, photos[(parseInt(String(id).replace(/\D/g, ''), 10) || 0) % photos.length]));
global.__fetchBytes = bytesOf;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = ''; req.on('data', d => body += d); req.on('end', () => {
      const p = JSON.parse(body); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(call(p.action, p)));
    }); return;
  }
  if (req.url === '/app/config.js') { res.setHeader('Content-Type', 'text/javascript'); res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0];
  if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/i.test(u)) u = '/app/gallery.html';
  const file = path.join(root, u.replace(/^\/+/, ''));
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    const ext = path.extname(file);
    res.setHeader('Content-Type', ({ '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json' })[ext] || 'application/octet-stream');
    res.end(data);
  });
});
server.listen(8915, async () => {
  const { chromium } = require('playwright'), browser = await chromium.launch();
  const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://lh3.googleusercontent.com/**', r => {
      const id = (r.request().url().match(/\/d\/([^=?]+)/) || [,''])[1];
      r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) });
    });
    await page.goto('http://localhost:8915/g/' + galleryId + '?couple=' + coupleKey);
    await page.waitForSelector('#pgBoot.hide', { state: 'attached' });
    await page.waitForFunction(() => window.PGControl && PGControl.role() === 'couple', null, { timeout: 10000 });
    ok(await page.evaluate(() => (GALLERY.timeGroups || []).length === 2), 'manifest sends two time groups to the couple page');

    await page.evaluate(() => PGControl.open('timeGroups'));
    await page.waitForSelector('.pg-t1-pane .pg-t1-card');
    ok(await page.locator('.pg-t1-card').count() === 2, 'Events from photo time opens inside the Control Panel with two group cards');
    ok(await page.locator('.pg-t1-card img').count() === 8, 'each group shows four small photo thumbnails');
    const firstInput = page.locator('.pg-t1-card').first().locator('input[data-time-name]');
    await page.locator('.pg-t1-card').first().locator('[data-name="Sangeet"]').click();
    ok(await firstInput.inputValue() === 'Sangeet', 'quick-name chips fill the group input');
    await firstInput.fill('Mehndi');
    await page.locator('.pg-t1-save').click();
    await page.waitForFunction(() => GALLERY.events.some(e => e.name === 'Mehndi' && e.timeGroupKey), null, { timeout: 10000 });
    ok(await page.evaluate(() => GALLERY.events.some(e => e.name === 'Mehndi' && e.timeGroupKey)), 'saving a name updates the gallery event list');

    await page.evaluate(() => { const back = document.querySelector('.pgcp-nav-back'); if (back) back.click(); });
    await page.waitForSelector('.pgcp-home');
    await page.evaluate(() => { switchView('gallery'); if (window.renderGalleries) renderGalleries(); });
    await page.waitForTimeout(350);
    ok(await page.locator('#pgGalleryMasonry .pg-collection h3').allTextContents().then(a => a.includes('Mehndi')), 'the Events page displays the newly named event');

    const laptop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    laptop.on('pageerror', e => errors.push(e.message));
    await laptop.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('B80A0') }));
    await laptop.goto('http://localhost:8915/g/' + galleryId + '?couple=' + coupleKey);
    await laptop.waitForSelector('#pgBoot.hide', { state: 'attached' });
    await laptop.waitForFunction(() => window.PGControl && PGControl.role() === 'couple');
    await laptop.evaluate(() => PGControl.open('timeGroups'));
    await laptop.waitForSelector('.pg-t1-card');
    ok(await laptop.evaluate(() => getComputedStyle(document.querySelector('.pg-t1-grid')).gridTemplateColumns.split(' ').length === 2), 'laptop uses a two-column group layout from 700 px');
    await laptop.close();
    console.log('page errors: ' + JSON.stringify(errors));
    if (errors.length) fails++;
  } catch (e) {
    fails++; console.error('FAIL browser check threw:', e && e.stack || e);
    console.log('page errors: ' + JSON.stringify(errors));
  } finally {
    await browser.close(); server.close(() => process.exit(fails ? 1 : 0));
  }
});
