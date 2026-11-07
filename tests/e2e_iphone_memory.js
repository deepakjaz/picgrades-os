// iPhone test (step 15): flicking a 400-photo filmstrip must not fill the phone's memory; reload comes back to the same photo.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'MEMWEDDING00000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders.sW = { name: 'Wedding', parent: W };
for (let i = 0; i < 400; i++) DRIVE.files['ST' + i] = { name: 'p' + String(i).padStart(3, '0') + '.jpg', parent: 'sW', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Memory Test' });
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => res.end(JSON.stringify(call(JSON.parse(b).action, JSON.parse(b))))); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = process.env.OLD ? '/../../../tmp/old_gallery.html' : '/app/gallery.html';
  fs.readFile(u.indexOf('old_gallery') > -1 ? '/tmp/old_gallery.html' : path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : 'text/javascript'); res.end(d); } });
}).listen(8779, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
  const sizes = {}; await pg.route('https://lh3.googleusercontent.com/**', r => { const w = (r.request().url().match(/=w(\d+)/) || [])[1]; sizes[w] = (sizes[w] || 0) + 1; const n = parseInt(r.request().url().match(/ST(\d+)/)[1], 10); r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(FX, files[n % files.length])) }); });
  await pg.goto('http://localhost:8779/g/' + pub.galleryId + '#gallery'); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
  await pg.locator('.pg-collection').first().click(); await pg.waitForTimeout(900);
  const cdp = await ctx.newCDPSession(pg);
  const drag = async (x, y1, y2, ms) => {
    const steps = Math.max(6, Math.round(ms / 16));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y1 }] });
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y1 + (y2 - y1) * i / steps }] }); await new Promise(r => setTimeout(r, ms / steps)); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const rail = await pg.$eval('.mk-filmstrip-rail', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, top: r.top, bottom: r.bottom }; });
  const mem = () => pg.evaluate(() => {
    const big = [...document.querySelectorAll('#pgvFeed .pgv-item img')], th = [...document.querySelectorAll('.mk-thumb-item img')];
    const live = l => l.filter(i => i.getAttribute('src') && !i.src.startsWith('data:')).length;
    return { active: activeIdx, bigFull: big.filter(i => /=w1280|=w2048/.test(i.src)).length, bigThumb: big.filter(i => /=w200/.test(i.src)).length, thumbsKept: live(th), of: th.length,
      hidden: (document.getElementById('mkImgA').getAttribute('src') || '') + (document.getElementById('mkImgB').getAttribute('src') || ''), layers: [...document.querySelectorAll('img')].filter(i => getComputedStyle(i).willChange !== 'auto').length };
  });
  console.log('start:', JSON.stringify(await mem()));
  for (let k = 0; k < 12; k++) { await drag(rail.x, rail.bottom - 40, rail.top + 40, 260); await pg.waitForTimeout(120); }
  console.log('while flicking:', JSON.stringify(await mem()));
  await pg.waitForTimeout(1600);
  const after = await mem(); console.log('after the strip stops:', JSON.stringify(after));
  console.log('photo sizes asked for:', JSON.stringify(sizes));
  await pg.screenshot({ path: '/tmp/s15_viewer.png' });
  const at = after.active;
  await pg.reload(); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(900);
  console.log('after a reload: view', await pg.evaluate(() => document.querySelector('.pg-view.active').id), '| photo', await pg.evaluate(() => activeIdx), '(was', at + ')', '| opened from the phone copy:', await pg.evaluate(() => window.pgBootFromKept));
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
