// Browser test for the gallery: real page + mock backend + fake Drive images.
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
console.log('published:', pub.ok, pub.galleryId, pub.photoCount);
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let f = path.join(root, req.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : 'text/javascript'); res.end(d); } });
}).listen(8767, async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 390, height: 844, name: 'mobile' }, { width: 1280, height: 860, name: 'desktop' }]) {
    const ctx = await b.newContext({ viewport: vp }); const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(vp.name + ': ' + e.message));
    await pg.route('**fonts.g**', r => r.abort());
    await pg.route('https://lh3.googleusercontent.com/**', r => { const n = parseInt(r.request().url().match(/IMG(\d+)/)[1], 10) % 8; r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync('/tmp/sample' + n + '.jpg') }); });
    await pg.goto('http://localhost:8767/app/gallery.html?g=' + pub.galleryId);
    await pg.waitForSelector('#pgBoot.hide', { state: 'attached', timeout: 10000 });
    console.log(vp.name, '| title:', await pg.textContent('#pgCoupleTitle'), '| counter:', await pg.textContent('#mkCounterText'), '| set:', await pg.textContent('#pgSetLabel'), '| moment:', await pg.textContent('#mkTitle'));
    await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/s4_root_' + vp.name + '.png' });
    if (vp.name === 'mobile') {
      await pg.click('#mkLikeBtn'); await pg.waitForTimeout(300); console.log('likes after tap:', await pg.textContent('#mkLikeCount'));
      await pg.click('#mkCommentBtn'); await pg.fill('#commentName', 'Meera Bhua'); await pg.fill('#commentInput', 'So beautiful <3'); await pg.click('#commentForm button[type=submit]');
      await pg.waitForTimeout(400); console.log('notes:', await pg.textContent('#commentListContainer'), '| count:', await pg.textContent('#mkCommentCount'));
      await pg.click('#commentBackdrop', { position: { x: 10, y: 10 } });
    }
    await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.waitForTimeout(400);
    console.log(vp.name, '| chips:', await pg.textContent('#pgEventChips'), '| thumbs:', await pg.locator('.pg-gallery-thumb').count());
    await pg.screenshot({ path: '/tmp/s4_gallery_' + vp.name + '.png' });
    await pg.locator('.pg-gallery-thumb').nth(5).click(); await pg.waitForTimeout(400);
    console.log(vp.name, '| opened from gallery → set:', await pg.textContent('#pgSetLabel'), '| counter:', await pg.textContent('#mkCounterText'));
    await pg.click('.tkg-nav-item[data-nav=root]'); await pg.waitForTimeout(300);
    console.log(vp.name, '| back to Root Moment →', await pg.textContent('#pgSetLabel'), await pg.textContent('#mkCounterText'));
    await pg.click('.tkg-nav-item[data-nav=hub]'); await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/s4_hub_' + vp.name + '.png' });
    await ctx.close();
  }
  // admin publishes a gallery from the queue UI
  DRIVE.folders['SECONDFOLDER1234567890'] = { name: 'Riya_Karan', access: 'ANYONE_WITH_LINK' };
  DRIVE.folders['fS'] = { name: 'Sangeet', parent: 'SECONDFOLDER1234567890' }; DRIVE.files['IMGS1'] = { name: 'a.jpg', parent: 'fS', mime: 'image/jpeg' };
  const a = await b.newPage(); await a.route('**fonts.g**', r => r.abort());
  await a.goto('http://localhost:8767/app/admin.html'); await a.fill('#email', 'adcmediaa@gmail.com'); await a.click('#loginBtn'); await a.waitForSelector('#step2:not(.hidden)');
  await a.fill('#code', /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]); await a.click('#loginBtn'); await a.waitForSelector('#v-overview:not(.hidden)');
  await a.click('nav.dock button[data-go=queue]'); await a.waitForSelector('#qDone .qitem');
  const it = a.locator('#qDone .qitem').nth(1);
  await it.locator('summary').click(); await it.locator('input').first().fill('https://drive.google.com/drive/folders/SECONDFOLDER1234567890?usp=sharing');
  await it.locator('input').nth(1).fill('Riya & Karan'); await it.locator('button').click(); await a.waitForTimeout(500);
  console.log('admin publish:', await a.textContent('#toast'));
  const bad = await (await b.newPage()).goto('http://localhost:8767/app/gallery.html?g=wrongid');
  console.log('page errors:', errors);
  await b.close(); srv.close();
});
