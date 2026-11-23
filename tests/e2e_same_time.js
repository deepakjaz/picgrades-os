// T2 (step 81): the small “At this time on the wedding day” pop.
// Uses the same gas_mock, made-up wedding photos and local-font setup as the other gallery browser tests.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'SAMETIMEWEDDING89020';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['tH', 'Ceremony'], ['tR', 'Reception']].forEach(([id, name], k) => {
  DRIVE.folders[id] = { name, parent: W };
  for (let i = 0; i < 8; i++) DRIVE.files['ST' + k + i] = { name: 'photo' + i + '.jpg', parent: id, mime: 'image/jpeg' };
});
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-11-24' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = id => {
  const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0;
  return fs.readFileSync(path.join(FX, files[n % files.length]));
};
global.__fetchBytes = bytesOf;

const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let b = ''; req.on('data', d => b += d);
    req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); });
    return;
  }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0];
  if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => {
    if (e) { res.statusCode = 404; res.end(); }
    else {
      res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript');
      res.end(d);
    }
  });
}).listen(8902, async () => {
  const { chromium } = require('playwright'), browser = await chromium.launch();
  const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => {
      const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1];
      r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) });
    });
    await require('./fonts_local').install(pg);
    await pg.goto('http://localhost:8902/g/' + pub.galleryId);
    await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
    await pg.waitForFunction(() => window.PGSameTime && typeof GALLERY !== 'undefined' && GALLERY && Array.isArray(GALLERY.events));
    await pg.evaluate(() => {
      const photos = GALLERY.events.flatMap(e => e.photos || []);
      if (photos.length < 3) throw new Error('The test wedding needs at least three made-up photos');
      photos[0].t = '2026-11-24 10:30';
      photos[1].t = '2026-11-24 10:45';
      photos[2].t = '2026-11-24 16:00';
      window.PG_NOW = '2026-11-24T10:45:00';
      PGSameTime.resetVisit();
      PGSameTime.check();
    });
    await pg.waitForSelector('.pgst-pop');
    ok(await pg.locator('.pgst-pop').count() === 1, 'pop appears when photos are within ±20 minutes');
    ok(await pg.locator('.pgst-time').count() === 2, 'each matching photo shows its capture-time pill');
    const closeBox = await pg.locator('.pgst-x').boundingBox();
    ok(!!closeBox && closeBox.width >= 44 && closeBox.height >= 44, 'close button is at least 44 × 44 px');
    await pg.click('.pgst-x');
    ok(await pg.locator('.pgst-pop').count() === 0, 'close dismisses the pop');

    await pg.evaluate(() => {
      window.PG_NOW = '2026-11-24T22:15:00';
      PGSameTime.resetVisit();
      PGSameTime.check();
    });
    ok(await pg.locator('.pgst-pop').count() === 0, 'no pop appears when no photo matches');

    await pg.evaluate(() => {
      window.PG_NOW = '2026-11-24T10:45:00';
      GALLERY.features.sameTime = 'off';
      PGSameTime.resetVisit();
      PGSameTime.check();
    });
    ok(await pg.locator('.pgst-pop').count() === 0, 'no pop appears when the feature switch is off');

    await pg.evaluate(() => {
      GALLERY.features.sameTime = 'on';
      GALLERY.gated = true;
      GALLERY.found = false;
      PGSameTime.resetVisit();
      PGSameTime.check();
    });
    ok(await pg.locator('.pgst-pop').count() === 0, 'a gated guest who has not found themselves sees no pop');

    let autoHide = false;
    await pg.evaluate(() => {
      GALLERY.gated = false;
      window.__pgCapturedTimer = null;
      const realSetTimeout = window.setTimeout;
      window.setTimeout = function (fn, ms) {
        if (ms === 10000) { window.__pgCapturedTimer = fn; return 987654; }
        return realSetTimeout.apply(this, arguments);
      };
      PGSameTime.resetVisit();
      PGSameTime.check();
    });
    ok(await pg.locator('.pgst-pop').count() === 1, 'pop appears before its auto-hide timer');
    autoHide = await pg.evaluate(() => {
      if (typeof window.__pgCapturedTimer !== 'function') return false;
      window.__pgCapturedTimer();
      return !document.querySelector('.pgst-pop');
    });
    ok(autoHide, 'pop hides itself after the 10-second timer fires');
    console.log('page errors: ' + JSON.stringify(errors));
    ok(!errors.length, 'no page errors');
    await ctx.close();
  } finally {
    await browser.close();
    srv.close();
  }
  process.exit(fails ? 1 : 0);
});
