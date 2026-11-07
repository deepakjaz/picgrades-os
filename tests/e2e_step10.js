// Browser test for step 10: Create row, name + phone, Find me gate, save a collection, upload a moment, couple approval, guest sees thank-you, guest video in Root Moment.
const http = require('http'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { call, mail, DRIVE, DB } = require('./gas_mock');
DB.Settings.push(['guestGate', 'on', 'test: guest checks on']);
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'TENWEDDING00000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders.tW = { name: 'Wedding', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['TN' + i] = { name: 'p' + i + '.jpg', parent: 'tW', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Diya & Kabir', eventDate: '2026-12-01' });
const coupleKey = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=360x640:rate=24', '-t', '2', '-pix_fmt', 'yuv420p', '/tmp/guest_clip.mp4']);
const bytesOf = (id) => { const f = DRIVE.files[id]; if (f && f.bytes) return Buffer.from(f.bytes); const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  if (req.url.indexOf('/api/stream') === 0) { const id = new URL('http://x' + req.url).searchParams.get('id'); res.setHeader('Content-Type', 'video/mp4'); res.end(bytesOf(id)); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8775, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const phone = async (opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, hasTouch: true }, opts || {})); const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.route('https://lh3.googleusercontent.com/**', r => { const id = r.request().url().match(/\/d\/([^=]+)/)[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await pg.route('https://drive.google.com/**', r => { const id = new URL(r.request().url()).searchParams.get('id'); r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    return { ctx, pg }; };
  // ---- guest ----
  let { ctx, pg } = await phone();
  await pg.goto('http://localhost:8775/g/' + pub.galleryId); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(500);
  console.log('create row:', (await pg.locator('.pgc-card:not(.hidden) b').allTextContents()).join(' | '));
  await pg.locator('.pgh-create-sec').scrollIntoViewIfNeeded(); await pg.screenshot({ path: '/tmp/s10_create.png' });
  await pg.click('#pgcUpload'); await pg.waitForTimeout(300);
  console.log('name sheet first:', await pg.isVisible('#idSheet.show'), '|', await pg.textContent('#idSub'));
  await pg.screenshot({ path: '/tmp/s10_name.png' });
  await pg.fill('#idName', 'Meera Bhua'); await pg.fill('#idPhone', '98765 43210'); await pg.click('#idGo');
  await pg.waitForSelector('#upSheet.show'); console.log('then upload sheet:', true);
  fs.copyFileSync(path.join(FX, files[0]), '/tmp/guest_photo.jpg');
  await pg.setInputFiles('#upFiles', ['/tmp/guest_photo.jpg', '/tmp/guest_clip.mp4']); await pg.fill('#upCaption', 'Baraat dance!');
  await pg.click('#upGo'); await pg.waitForSelector('#upDone:not(.hidden)', { timeout: 20000 });
  console.log('uploaded:', await pg.textContent('#upDoneTxt'));
  await pg.screenshot({ path: '/tmp/s10_thanks.png' });
  await pg.click('#upClose'); await pg.waitForTimeout(300);
  console.log('my moments:', (await pg.locator('#pgcMine .pgc-pill').allTextContents()).join(' | '));
  // reel without Find me (face search off here) → allowed after name
  await pg.click('#pghReel'); await pg.waitForTimeout(600); console.log('reel opens for named guest (face search off):', await pg.isVisible('.rl-wrap')); await pg.evaluate(() => PGReel.close());
  // ---- couple ----
  const c = await phone();
  await c.pg.goto('http://localhost:8775/g/' + pub.galleryId + '?couple=' + coupleKey); await c.pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await c.pg.waitForTimeout(600);
  console.log('couple: key removed from address:', !c.pg.url().includes('couple='), '| review card:', await c.pg.isVisible('#pgcReview'), await c.pg.textContent('#pgcReviewTxt'));
  await c.pg.click('#pgcReview'); await c.pg.waitForTimeout(500); await c.pg.screenshot({ path: '/tmp/s10_couple.png' });
  await c.pg.fill('#cpThanks', 'Thank you Meera Bhua, we love it! — Diya & Kabir'); await c.pg.click('#cpThanksSave');
  await c.pg.locator('.cp-item .yes').first().click(); await c.pg.waitForTimeout(500); await c.pg.locator('.cp-item .yes').first().click(); await c.pg.waitForTimeout(700);
  console.log('couple approved both; waiting now:', await c.pg.textContent('#pgcReviewTxt'));
  await c.ctx.close();
  // ---- guest comes back ----
  await pg.reload(); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  console.log('guest notice:', await pg.isVisible('#pgNotice'), '|', await pg.textContent('#pgNoticeT'), '|', await pg.textContent('#pgNoticeP'));
  await pg.screenshot({ path: '/tmp/s10_notice.png' });
  console.log('status now:', (await pg.locator('#pgcMine em').allTextContents()).join(','));
  await pg.click('#pgNoticeX'); await pg.click('.tkg-nav-item[data-nav=moments]'); await pg.waitForTimeout(500);
  const n = await pg.locator('.pgm-guest').count(); await pg.locator('.pgm-guest').last().scrollIntoViewIfNeeded(); await pg.waitForTimeout(900);
  console.log('guest moments in Root Moment:', n, '| video playing:', await pg.evaluate(() => { const v = document.querySelector('.pgm-guest video'); return v ? !v.paused : 'no video'; }), '| by:', await pg.locator('.pgm-guest .pgm-by').first().textContent());
  await pg.screenshot({ path: '/tmp/s10_guest_reel.png' });
  await ctx.close();
  // ---- saved collection link (another phone) ----
  const g2 = await phone();
  const set = call('saveSet', { g: pub.galleryId, name: "Meera's photos", ids: ['TN1', 'TN3', 'TN4'] });
  await g2.pg.goto('http://localhost:8775/g/' + pub.galleryId + '?set=' + set.code); await g2.pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await g2.pg.waitForTimeout(900);
  console.log('saved link opens collection:', await g2.pg.isVisible('#view-root'), await g2.pg.textContent('#pgvCount'), '| kept on phone:', await g2.pg.evaluate(() => (JSON.parse(localStorage.getItem('pg_sets_' + GALLERY_ID) || '[]')[0] || {}).name));
  await g2.ctx.close();
  console.log('page errors:', errors); await b.close(); srv.close();
});
