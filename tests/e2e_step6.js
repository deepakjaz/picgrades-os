// Browser test for the Hub: hero slideshow, stats, events with changing photos, most loved, recent notes, notes wall, Root Moment mix.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..');
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const orders = call('queue', { token: admin }).recentDone;
function wedding(W, folders, withRoot) {
  DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; let k = 0;
  if (withRoot) { DRIVE.folders[W + 'R'] = { name: '00_Root_Moment', parent: W }; for (let i = 0; i < 3; i++) DRIVE.files[W + 'RIMG' + i] = { name: 'r' + i + '.jpg', parent: W + 'R', mime: 'image/jpeg' }; }
  folders.forEach(([n, c]) => { const id = W + n; DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < c; i++) DRIVE.files[W + 'IMG' + (k++)] = { name: 'p' + String(i).padStart(3, '0') + '.jpg', parent: id, mime: 'image/jpeg' }; });
}
wedding('HUBWEDDINGA00000000001', [['Haldi', 6], ['Sangeet', 8], ['Wedding', 10], ['Reception', 6], ['Cocktail', 4]], false);
wedding('HUBWEDDINGB00000000001', [['Wedding', 5]], true);
const A = call('setGallery', { token: admin, orderId: orders[0].orderId, folderUrl: 'HUBWEDDINGA00000000001', title: 'Isha & Dev', eventDate: '2026-12-10' });
const B = call('setGallery', { token: admin, orderId: orders[1].orderId, folderUrl: 'HUBWEDDINGB00000000001', title: 'Tara & Vir', eventDate: '2026-12-12' });
const gA = call('getGallery', { g: A.galleryId }).gallery;
const ids = gA.events.flatMap(e => e.photos.map(p => p.id));
call('likePhoto', { g: A.galleryId, photoId: ids[3], device: 'devhub00001' }); call('likePhoto', { g: A.galleryId, photoId: ids[3], device: 'devhub00002' }); call('likePhoto', { g: A.galleryId, photoId: ids[12], device: 'devhub00001' });
call('addNote', { g: A.galleryId, photoId: ids[12], device: 'devhub00001', name: 'Nani', text: 'God bless you both' });
call('addNote', { g: A.galleryId, photoId: ids[20], device: 'devhub00002', name: 'Rahul (college)', text: 'Best sangeet ever!' });
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : 'text/javascript'); res.end(d); } });
}).listen(8772, async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch(); const errors = [];
  const samples = ['/tmp/sample0.jpg', '/tmp/sample1.jpg'].filter(f => fs.existsSync(f));
  const FXD = path.join(__dirname, 'fixtures'); const fx = fs.readdirSync(FXD).filter(f => f.endsWith('.jpg')).map(f => path.join(FXD, f));
  for (const vp of [{ width: 390, height: 844, name: 'mobile' }, { width: 1280, height: 860, name: 'desktop' }]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: vp.name === 'mobile' }); const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(vp.name + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.route('https://lh3.googleusercontent.com/**', r => { const n = parseInt((r.request().url().match(/IMG(\d+)/) || [0, 0])[1], 10); r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(fx[n % fx.length]) }); });
    await pg.goto('http://localhost:8772/g/' + A.galleryId + '#hub'); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
    console.log(vp.name, '| hub active:', await pg.isVisible('#view-hub'), '| stats:', (await pg.textContent('#pghStats')).replace(/\s+/g, ' '), '| events:', await pg.locator('#pghEvents .pgh-tile').count(), '| loved:', await pg.locator('#pghLoved .pgh-tile').count(), '| notes:', await pg.locator('#pghNotes .pgh-note').count(), '| coming soon text:', (await pg.content()).toLowerCase().includes('coming soon'));
    await pg.screenshot({ path: '/tmp/s6_hub_' + vp.name + '.png' });
    await pg.screenshot({ path: '/tmp/s6_hub_full_' + vp.name + '.png', fullPage: true });
    const hero1 = await pg.getAttribute('#pghHeroA', 'src'); const covers1 = await pg.$$eval('#pghEvents .pg-rot.is-on', l => l.map(i => i.src).join('|'));
    await pg.waitForTimeout(9500);
    const heroNow = await pg.$eval('.pgh-hero-img.is-on', i => i.src); const covers2 = await pg.$$eval('#pghEvents .pg-rot.is-on', l => l.map(i => i.src).join('|'));
    console.log(vp.name, '| hero changed:', heroNow !== hero1, '| event tiles changed:', covers1 !== covers2, '| hero label:', await pg.textContent('#pghNow'));
    if (vp.name === 'mobile') {
      await pg.click('#pghNotes .pgh-note >> nth=0'); await pg.waitForTimeout(500);
      console.log('note opens photo:', await pg.isVisible('#view-root'), await pg.textContent('#pgvCount'));
      await pg.click('#pgvBack'); await pg.waitForTimeout(300);
      await pg.click('.tkg-nav-item[data-nav=rooms]'); await pg.waitForTimeout(300);
      console.log('notes wall:', await pg.locator('#pgWall .pgh-note').count(), (await pg.locator('#pgWall b').allTextContents()).join(', '));
      await pg.screenshot({ path: '/tmp/s6_wall_mobile.png' });
      // collections covers also shuffle between visits
      await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.waitForTimeout(300);
      await pg.screenshot({ path: '/tmp/s6_collections_mobile.png' });
      // Root Moment: no 00_Root_Moment folder → mix from every event, different on each visit
      const r1 = await pg.$$eval('.pgm-item', l => l.map(x => x.dataset.pid).join()); await pg.reload(); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
      const r2 = await pg.$$eval('.pgm-item', l => l.map(x => x.dataset.pid).join());
      console.log('root mix: count', r1.split(',').length, '| changes on reload:', r1 !== r2);
      // with photographer's 00_Root_Moment → same order every time
      await pg.goto('http://localhost:8772/g/' + B.galleryId); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
      const o1 = await pg.$$eval('.pgm-item', l => l.map(x => x.dataset.pid).join()); await pg.reload(); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
      const o2 = await pg.$$eval('.pgm-item', l => l.map(x => x.dataset.pid).join());
      console.log('photographer root kept:', o1 === o2, o1);
    }
    await ctx.close();
  }
  { // iPhone: install card + Add to Home Screen steps; Root Moment reels have zoom + download
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push('iphone: ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    const FXD = path.join(__dirname, 'fixtures'); const fx = fs.readdirSync(FXD).filter(f => f.endsWith('.jpg')).map(f => path.join(FXD, f));
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(fx[0]) }));
    await pg.goto('http://localhost:8772/g/' + A.galleryId); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(500);
    console.log('iphone | lands on hub:', await pg.isVisible('#view-hub'), '| install card:', await pg.isVisible('#pghInstall'), '| manifest:', await pg.getAttribute('link[rel=manifest]', 'href'), '| app title:', await pg.getAttribute('#pgAppTitle', 'content'));
    await pg.click('#pghInstallBtn'); await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/s7_ios_install.png' });
    console.log('iphone | steps sheet:', await pg.isVisible('#iosSheet.show'));
    await pg.click('#iosClose'); await pg.click('.tkg-nav-item[data-nav=moments]'); await pg.waitForTimeout(500);
    console.log('iphone | reel buttons:', await pg.locator('.pgm-item').first().locator('.pgm-btn').count(), '| full screen button hidden (iPhone cannot):', !(await pg.isVisible('#pgvFull')));
    await pg.screenshot({ path: '/tmp/s7_reel_iphone.png' });
    await pg.locator('.pgm-item').first().locator('.pgm-btn').first().click(); await pg.click('.pg-collection-none', { timeout: 1 }).catch(() => {});
    await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.locator('.pg-collection').first().click(); await pg.waitForTimeout(600);
    console.log('iphone | viewer fullscreen btn visible:', await pg.isVisible('#pgvFull'));
    await pg.screenshot({ path: '/tmp/s7_viewer_iphone.png' });
    await ctx.close();
  }
  console.log('page errors:', errors); await b.close(); srv.close();
});
