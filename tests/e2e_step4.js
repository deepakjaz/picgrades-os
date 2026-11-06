// Browser test for the gallery: real page + mock backend + fake Drive images (portrait + landscape).
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..');
const W = 'WEDDINGFOLDER1234567890';
DRIVE.folders[W] = { name: 'Aarav_Kavya_2026', access: 'ANYONE_WITH_LINK' };
[['fR', '00_Root_Moment'], ['fH', 'Haldi'], ['fW', 'Wedding']].forEach(([id, n]) => { DRIVE.folders[id] = { name: n, parent: W }; });
let k = 0; [['fR', 3], ['fH', 4], ['fW', 5]].forEach(([p, n]) => { for (let i = 0; i < n; i++) DRIVE.files['IMG' + (k++)] = { name: 'img' + i + '.jpg', parent: p, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const ord = call('queue', { token: admin }).recentDone[0];
const pub = call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: 'https://drive.google.com/drive/folders/' + W, title: 'Aarav & Kavya', eventDate: '2026-11-20' });
console.log('published:', pub.ok, pub.photoCount);
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  let f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : 'text/javascript'); res.end(d); } });
}).listen(8767, async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 390, height: 844, name: 'mobile' }, { width: 1280, height: 860, name: 'desktop' }]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: vp.name === 'mobile' }); const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(vp.name + ': ' + e.message));
    await pg.route('**fonts.g**', r => r.abort());
    // even ids = portrait, odd = landscape
    await pg.route('https://lh3.googleusercontent.com/**', r => { const n = parseInt(r.request().url().match(/IMG(\d+)/)[1], 10); r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync('/tmp/sample' + (n % 2 ? 0 : 1) + '.jpg') }); });
    await pg.goto('http://localhost:8767/g/' + pub.galleryId);
    await pg.waitForSelector('#pgBoot.hide', { state: 'attached', timeout: 10000 });
    await pg.waitForTimeout(500);
    console.log(vp.name, '| landing view moments:', await pg.isVisible('#view-moments'), '| reels:', await pg.locator('.pgm-item').count(), '| img fit:', await pg.$eval('.pgm-img', e => getComputedStyle(e).objectFit));
    await pg.screenshot({ path: '/tmp/s4_moments_' + vp.name + '.png' });
    // double tap first reel → like
    const box = await pg.locator('.pgm-item').first().boundingBox();
    await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await pg.waitForTimeout(400);
    console.log(vp.name, '| after double-tap: liked=', await pg.locator('.pgm-item').first().locator('.pgm-like.liked').count(), 'count=', await pg.locator('.pgm-item').first().locator('.pgm-like-count').textContent());
    if (vp.name === 'mobile') {
      await pg.locator('.pgm-item').first().locator('.pgm-btn').nth(1).click();
      await pg.fill('#commentName', 'Meera Bhua'); await pg.fill('#commentInput', 'So beautiful <3'); await pg.click('#commentForm button[type=submit]'); await pg.waitForTimeout(400);
      console.log('notes:', await pg.textContent('#commentListContainer'), '| reel note count:', await pg.locator('.pgm-item').first().locator('.pgm-note-count').textContent());
      await pg.mouse.click(10, 10);
      // scroll to the next reel
      await pg.$eval('#pgmFeed', f => f.scrollTo(0, f.clientHeight)); await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/s4_moments2_mobile.png' });
    }
    await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.waitForTimeout(400);
    console.log(vp.name, '| collections:', await pg.locator('.pg-collection').count(), (await pg.locator('.pg-collection h3').allTextContents()).join(','));
    await pg.screenshot({ path: '/tmp/s4_collections_' + vp.name + '.png' });
    await pg.locator('.pg-collection').nth(1).click(); await pg.waitForTimeout(500);
    console.log(vp.name, '| viewer:', await pg.isVisible('#view-root'), await pg.textContent('#pgSetLabel'), await pg.textContent('#mkCounterText'), '| fit:', await pg.$eval('#mkImgA', e => getComputedStyle(e).objectFit), '| gallery nav active:', await pg.locator('.tkg-nav-item[data-nav=gallery].active').count());
    await pg.screenshot({ path: '/tmp/s4_viewer_' + vp.name + '.png' });
    await pg.locator('.mk-thumb-item').nth(1).click(); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/s4_viewer2_' + vp.name + '.png' });
    await pg.click('#mkViewProjectBtn'); await pg.waitForTimeout(300); console.log(vp.name, '| back to collections:', await pg.isVisible('#view-gallery'));
    await ctx.close();
  }
  console.log('page errors:', errors);
  await b.close(); srv.close();
});
