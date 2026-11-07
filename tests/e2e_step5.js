// Browser test for face reading (faces.html) and Find me (gallery): real face photos, real face models.
const http = require('http'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { call, mail, DRIVE, DB } = require('./gas_mock');
DB.Settings.push(['guestGate', 'on', 'test: guest checks on']);
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
const W = 'FACEWEDDING00000000001';
DRIVE.folders[W] = { name: 'Neha_Rohan', access: 'ANYONE_WITH_LINK' };
DRIVE.folders.fxR = { name: '00_Root_Moment', parent: W }; DRIVE.folders.fxS = { name: 'Sangeet', parent: W }; DRIVE.folders.fxC = { name: 'Cocktail', parent: W };
const FILE = { FX1: 'sample1.jpg', FX2: 'sample2.jpg', FX3: 'sample3.jpg', FX4: 'sample4.jpg' };
DRIVE.files.FX1 = { name: 'a.jpg', parent: 'fxR', mime: 'image/jpeg' }; DRIVE.files.FX2 = { name: 'b.jpg', parent: 'fxS', mime: 'image/jpeg' };
DRIVE.files.FX3 = { name: 'c.jpg', parent: 'fxS', mime: 'image/jpeg' }; DRIVE.files.FX4 = { name: 'd.jpg', parent: 'fxC', mime: 'image/jpeg' };
global.__fetchBytes = (id) => fs.readFileSync(path.join(FX, FILE[id]));
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const ord = call('queue', { token: admin }).recentDone[0];
const pub = call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: W, title: 'Neha & Rohan', eventDate: '2026-12-01' });
console.log('published', pub.ok, pub.photoCount, pub.galleryId);
const CORS = process.argv.includes('--cors'), NODIRECT = process.argv.includes('--proxy');
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream'); res.end(d); } });
}).listen(8771, async () => {
  const { chromium } = require('playwright');
  const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const photoRoute = (pg) => pg.route('https://lh3.googleusercontent.com/**', r => { const id = r.request().url().match(/\/d\/([A-Z0-9]+)/)[1]; r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(FX, FILE[id])), headers: CORS ? { 'Access-Control-Allow-Origin': '*' } : {} }); });
  const errors = [];
  // ---------- 1. face reading page ----------
  let b = await chromium.launch({ args: GL });
  let ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); let pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push('faces: ' + e.message)); await pg.route('**fonts.g**', r => r.abort()); if (NODIRECT) await pg.route('https://lh3.googleusercontent.com/**', r => r.abort()); else await photoRoute(pg);
  await pg.goto('http://localhost:8771/app/faces.html?g=' + pub.galleryId);
  await pg.evaluate(t => localStorage.setItem('pg_token', t), admin); await pg.reload();
  await pg.waitForSelector('#readCard:not(.hidden)'); await pg.screenshot({ path: '/tmp/s5_faces_start.png' });
  console.log('faces page:', await pg.textContent('#title'), '|', await pg.textContent('#statusPill'), '| due:', await pg.textContent('#tDue'));
  const t0 = Date.now(); await pg.click('#startBtn');
  await pg.waitForTimeout(6000); await pg.screenshot({ path: '/tmp/s5_faces_running.png' }); console.log('running:', await pg.textContent('#progressText'), '|', await pg.textContent('#engine'));
  await pg.waitForFunction(() => document.getElementById('statusPill').textContent === 'Ready', null, { timeout: 600000 });
  console.log('READY in', Math.round((Date.now() - t0) / 1000), 's | faces:', await pg.textContent('#tFaces'), '| read:', await pg.textContent('#tRead'), '| people:', await pg.locator('.person').count(), '| via:', await pg.textContent('#engine'));
  await pg.screenshot({ path: '/tmp/s5_faces_ready.png', fullPage: true });
  const fx = call('faceBoxes', { g: pub.galleryId }).boxes, dim = require('child_process').execSync('python3 -c "from PIL import Image;print(*Image.open(\'' + path.join(FX, 'sample2.jpg') + '\').size)"').toString().trim().split(' ').map(Number);
  console.log('public face boxes have no face codes:', !/[A-Za-z0-9+\/]{40,}/.test(JSON.stringify(fx)), '| getFaces still public:', !!call('getFaces', { g: pub.galleryId }).faces);
  // a "selfie": crop the biggest face of sample2 (pixel box from the stored 0..1000 box)
  const e2 = { w: dim[0], h: dim[1] }, big = fx.FX2.sort((a, c) => c[2] - a[2])[0];
  const px = (v, n) => Math.round(v / 1000 * n), pad = 0.6;
  const cw = px(big[2], e2.w), ch = px(big[3], e2.h), cx = Math.max(0, px(big[0], e2.w) - cw * pad), cy = Math.max(0, px(big[1], e2.h) - ch * pad);
  const crop = `crop=${Math.round(cw * (1 + 2 * pad))}:${Math.round(ch * (1 + 2 * pad))}:${Math.round(cx)}:${Math.round(cy)}`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(FX, 'sample2.jpg'), '-vf', crop + ',scale=480:-2', '/tmp/selfie.jpg']);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', '/tmp/selfie.jpg', '-t', '3', '-r', '10', '-vf', 'scale=480:640,format=yuv420p', '/tmp/selfie.y4m']);
  await pg.setInputFiles('#testFile', '/tmp/selfie.jpg'); await pg.waitForFunction(() => /found|No face/.test(document.getElementById('testMsg').textContent), null, { timeout: 120000 });
  console.log('admin test:', await pg.textContent('#testMsg'), '| thumbs:', await pg.locator('#testThumbs img').count());
  await pg.fill('#sendTo', 'neha.rohan@example.com'); await pg.click('#sendBtn'); await pg.waitForFunction(() => /Sent to/.test(document.getElementById('sendMsg').textContent));
  console.log('send:', await pg.textContent('#sendMsg'), '| email:', mail[mail.length - 1].to, mail[mail.length - 1].subject);
  await pg.screenshot({ path: '/tmp/s5_faces_sent.png', fullPage: true });
  await b.close();
  // ---------- 2. guest: Find me with upload (mobile) and live camera ----------
  b = await chromium.launch({ args: GL.concat(['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=/tmp/selfie.y4m']) });
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ['camera'] }); pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push('gallery: ' + e.message)); await pg.route('**fonts.g**', r => r.abort()); await photoRoute(pg);
  await pg.goto('http://localhost:8771/g/' + pub.galleryId + '#moments'); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
  console.log('monogram:', await pg.textContent('#pgMono'), '| stamp text gone:', !(await pg.content()).includes('結婚'));
  await pg.screenshot({ path: '/tmp/s5_moments_findme.png' });
  await pg.click('.pgm-findme'); await pg.waitForTimeout(300);
  console.log('Find me asks name first:', await pg.isVisible('#idSheet.show')); await pg.fill('#idName', 'Neha Guest'); await pg.fill('#idPhone', '9876543210'); await pg.click('#idGo'); await pg.waitForSelector('#fmSheet.show');
  await pg.screenshot({ path: '/tmp/s5_sheet.png' });
  await pg.setInputFiles('#fmFile', '/tmp/selfie.jpg'); await pg.waitForTimeout(60); console.log('searching card shown:', await pg.isVisible('#fmBusy'), '|', await pg.textContent('#fmBusyStep')); await pg.screenshot({ path: '/tmp/s10_busy.png' });
  await pg.waitForSelector('#fmResult:not(.hidden)', { timeout: 120000 });
  console.log('upload result:', await pg.textContent('#fmStatus'), '|', await pg.textContent('#fmOpen'));
  await pg.fill('#fmSaveName', "Neha's photos"); await pg.click('#fmSaveBtn'); await pg.waitForSelector('#fmSaved:not(.hidden)'); console.log('saved:', await pg.textContent('#fmSaved'));
  await pg.screenshot({ path: '/tmp/s5_result.png' });
  console.log('album button in Find me:', await pg.isVisible('#fmPost'));
  await pg.click('#fmOpen'); await pg.waitForTimeout(600);
  console.log('viewer opened:', await pg.isVisible('#view-root'), await pg.textContent('#pgvCount'));
  await pg.screenshot({ path: '/tmp/s5_yourphotos_viewer.png' });
  await pg.click('#pgvBack'); await pg.waitForTimeout(400);
  console.log('collections:', (await pg.locator('.pg-collection h3').allTextContents()).join(', '));
  await pg.click('.tkg-nav-item[data-nav=hub]'); await pg.waitForTimeout(300); console.log('hub create:', (await pg.locator('.pgc-card:not(.hidden) b').allTextContents()).join(' | '), '| mine:', (await pg.locator('#pgcMine .pgc-pill').allTextContents()).join(' | '));
  await pg.click('#pghReel'); await pg.waitForTimeout(800); console.log('reel unlocked after Find me:', await pg.isVisible('.rl-wrap')); await pg.evaluate(() => PGReel.close()); await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: '/tmp/s5_collections_personal.png' });
  // live camera
  await pg.click('#view-gallery .pg-findme'); await pg.waitForTimeout(300); await pg.click('#fmCamBtn');
  await pg.waitForFunction(() => !document.getElementById('fmShoot').disabled, null, { timeout: 120000 });
  console.log('camera:', await pg.textContent('#fmHint')); await pg.screenshot({ path: '/tmp/s5_camera.png' });
  await pg.click('#fmShoot'); await pg.waitForSelector('#fmResult:not(.hidden)', { timeout: 120000 });
  console.log('camera result:', await pg.textContent('#fmStatus'));
  console.log('page errors:', errors);
  await b.close(); srv.close();
});
