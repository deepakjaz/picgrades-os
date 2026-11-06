// Browser test for the reel maker: open from a collection, preview, make a 15 s video, download it. Also the server photo path.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'REELWEDDING0000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders.rW = { name: 'Wedding', parent: W };
for (let i = 0; i < 8; i++) DRIVE.files['RL' + i] = { name: 'p' + i + '.jpg', parent: 'rW', mime: 'image/jpeg' };
global.__fetchBytes = (id) => fs.readFileSync(path.join(FX, files[parseInt(id.replace(/\D/g, ''), 10) % files.length]));
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Meera & Arjun', eventDate: '2026-12-20' });
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : f.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream'); res.end(d); } });
}).listen(8773, async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const errors = [];
  for (const mode of ['direct', 'server']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(mode + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.route('https://lh3.googleusercontent.com/**', r => {
      const url = r.request().url(), id = url.match(/\/d\/([A-Z0-9]+)/)[1];
      if (mode === 'server' && /=w1080/.test(url)) return r.abort();   // phone cannot read Drive photos directly → server path
      r.fulfill({ contentType: 'image/jpeg', body: global.__fetchBytes(id), headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await pg.goto('http://localhost:8773/g/' + pub.galleryId); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
    if (mode === 'direct') {
      await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.locator('.pg-collection').first().click(); await pg.waitForTimeout(500);
      await pg.click('#pgvReel');
    } else await pg.click('#pghReel');
    await pg.waitForFunction(() => /preview/.test((document.querySelector('.rl-msg') || {}).textContent || ''), null, { timeout: 30000 });
    console.log(mode, '| reel opened:', await pg.locator('.rl-th').count(), 'photos |', await pg.textContent('.rl-wrap .rl-lbl:nth-of-type(1)'), '| music:', (await pg.locator('.rl-chip').allTextContents()).slice(0, 3).join(' / '), '|', await pg.textContent('.rl-wrap .rl-panel div > .rl-lbl[style]'));
    await pg.screenshot({ path: '/tmp/s8_reel_' + mode + '.png' });
    if (mode === 'server') { await ctx.close(); continue; }
    // every style: frames from the title, the photos and a transition
    for (const st of await pg.evaluate(() => PGReel.styles)) {
      await pg.locator('.rl-chip', { hasText: { south: 'South', soft: 'Soft', dynamic: 'Dynamic', travel: 'Travel', festival: 'Festival', party: 'Party' }[st] }).first().click();
      await pg.waitForTimeout(150);
      const shots = [];
      for (const t of [2.2, 4.1, 5.3, 6.6, 8.2, 10.4]) { await pg.evaluate(t => PGReel.frame(t), t); shots.push(await pg.$eval('.rl-stage canvas', c => c.toDataURL('image/jpeg', 0.6))); }
      fs.writeFileSync('/tmp/s9_' + st + '.json', JSON.stringify(shots));
      console.log('style', st, '|', await pg.textContent('.rl-wrap .rl-panel div > .rl-lbl[style]'), '| music:', await pg.textContent('.rl-chip.on >> nth=1'));
    }
    await pg.locator('.rl-chip', { hasText: 'Party' }).first().click();
    console.log('nav hidden while reel open:', !(await pg.isVisible('.tkg-global-nav')));
    await pg.click('.rl-play'); await pg.waitForTimeout(3200); await pg.screenshot({ path: '/tmp/s8_preview_title.png' });
    await pg.waitForTimeout(2500); await pg.screenshot({ path: '/tmp/s8_preview_photo.png' });
    await pg.locator('.rl-chip', { hasText: '15 s' }).click();
    await pg.locator('.rl-th').nth(2).click(); console.log('after removing one:', await pg.textContent('.rl-wrap .rl-panel div > .rl-lbl[style]'));
    const t0 = Date.now(); await pg.click('.rl-go');
    await pg.waitForTimeout(7000); await pg.screenshot({ path: '/tmp/s8_making.png' }); console.log('status on preview:', await pg.isVisible('.rl-status.on'), await pg.textContent('.rl-status span'));
    await pg.waitForSelector('.rl-stage video', { timeout: 60000 });
    console.log('made in', Math.round((Date.now() - t0) / 1000), 's |', await pg.textContent('.rl-msg'));
    const info = await pg.evaluate(() => new Promise(res => { const v = document.querySelector('.rl-stage video'); const go = () => res([v.videoWidth, v.videoHeight, Math.round(v.duration * 10) / 10]); if (v.readyState >= 1 && isFinite(v.duration)) go(); else { v.onloadedmetadata = go; setTimeout(go, 4000); } }));
    console.log('video:', JSON.stringify(info));
    const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 8000 }).catch(() => null), pg.locator('.rl-sub', { hasText: 'Download' }).click()]);
    if (dl) { const p = '/tmp/' + dl.suggestedFilename(); await dl.saveAs(p); console.log('download:', dl.suggestedFilename(), fs.statSync(p).size, 'bytes'); }
    await pg.screenshot({ path: '/tmp/s8_done.png' });
    await ctx.close();
  }
  console.log('page errors:', errors); await b.close(); srv.close();
});
