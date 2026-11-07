// Phone test: drag the filmstrip with a finger, then swipe the big photo. They must agree and never pull each other back.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'STRIPWEDDING000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders.sW = { name: 'Wedding', parent: W };
for (let i = 0; i < 30; i++) DRIVE.files['ST' + i] = { name: 'p' + String(i).padStart(2, '0') + '.jpg', parent: 'sW', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Strip Test' });
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => res.end(JSON.stringify(call(JSON.parse(b).action, JSON.parse(b))))); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = process.env.OLD ? '/../../../tmp/old_gallery.html' : '/app/gallery.html';
  fs.readFile(u.indexOf('old_gallery') > -1 ? '/tmp/old_gallery.html' : path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8774, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
  await pg.route('https://lh3.googleusercontent.com/**', r => { const n = parseInt(r.request().url().match(/ST(\d+)/)[1], 10); r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(FX, files[n % files.length])) }); });
  await pg.goto('http://localhost:8774/g/' + pub.galleryId + '#gallery'); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
  await pg.locator('.pg-collection').first().click(); await pg.waitForTimeout(700);
  const cdp = await ctx.newCDPSession(pg);
  const drag = async (x, y1, y2, ms) => {
    const steps = Math.max(6, Math.round(ms / 16));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y1 }] });
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y1 + (y2 - y1) * i / steps }] }); await new Promise(r => setTimeout(r, ms / steps)); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const state = () => pg.evaluate(() => { const f = document.getElementById('pgvFeed'); return { active: activeIdx, feed: Math.round(f.scrollTop / f.clientHeight), strip: Math.round(document.getElementById('mkFilmstripScroller').scrollTop), count: document.getElementById('pgvCount').textContent }; });
  const rail = await pg.$eval('.mk-filmstrip-rail', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, top: r.top, bottom: r.bottom }; });
  // trace the filmstrip position during and after one finger drag: it must never move backwards (pull back)
  { await pg.evaluate(() => { window.__tr = []; const sc = document.getElementById('mkFilmstripScroller'); const t0 = performance.now(); (function f() { window.__tr.push(Math.round(sc.scrollTop)); if (performance.now() - t0 < 2500) requestAnimationFrame(f); })(); });
    await drag(rail.x, rail.bottom - 60, rail.top + 60, 500); await pg.waitForTimeout(2200);
    const tr = await pg.evaluate(() => window.__tr); let back = 0, peak = 0; tr.forEach(v => { if (v > peak) peak = v; if (peak - v > back) back = peak - v; });
    console.log('strip trace: max', peak, '| end', tr[tr.length - 1], '| biggest pull-back', back, 'px'); }
  // phone momentum: after the finger lifts, the filmstrip keeps gliding for a moment (like iPhone). Nothing may push it back.
  for (const dir of [1, -1]) {
    const r = await pg.evaluate((dir) => new Promise(res => {
      const sc = document.getElementById('mkFilmstripScroller'), tr = []; let v = 38 * dir, start = performance.now(), lastSet = sc.scrollTop, fights = 0;
      sc.dispatchEvent(new Event('touchstart'));
      (function f() {
        if (Math.abs(sc.scrollTop - lastSet) > 3) fights++;          // someone else moved the strip
        sc.scrollTop = sc.scrollTop + v; lastSet = sc.scrollTop; v *= 0.975; tr.push(Math.round(sc.scrollTop));
        if (performance.now() - start < 1600) requestAnimationFrame(f); else setTimeout(() => { tr.push(Math.round(sc.scrollTop)); res({ fights, end: tr[tr.length - 1], glideEnd: tr[tr.length - 2], active: activeIdx, feed: Math.round(document.getElementById('pgvFeed').scrollTop / document.getElementById('pgvFeed').clientHeight) }); }, 1500);
      })();
    }), dir);
    console.log('momentum', dir > 0 ? 'down the strip' : 'up the strip', '| strip pushed by the app during glide:', r.fights, 'times | moved after glide:', r.end - r.glideEnd, 'px | photo agrees:', r.active === r.feed, r.active);
  }
  for (const [label, y1, y2, ms] of [['strip drag up (fast)', rail.bottom - 60, rail.top + 60, 250], ['strip drag up (slow)', rail.bottom - 80, rail.top + 120, 900], ['strip drag down', rail.top + 80, rail.bottom - 80, 400]]) {
    await drag(rail.x, y1, y2, ms);
    const samples = []; for (let i = 0; i < 12; i++) { await pg.waitForTimeout(200); samples.push(await state()); }
    const last = samples[samples.length - 1], actives = samples.map(s => s.active);
    const changesAfterLift = actives.slice(3).filter((a, i, arr) => i && a !== arr[i - 1]).length;
    console.log(label, '| actives:', actives.join(','), '| final', JSON.stringify(last), '| feed agrees:', last.feed === last.active, '| stable after lift:', changesAfterLift === 0);
  }
  // swipe the big photo, then the strip should follow
  for (const [label, y1, y2] of [['photo swipe up', 650, 250], ['photo swipe up', 650, 250], ['photo swipe down', 250, 650]]) {
    const before = (await state()).active; await drag(150, y1, y2, 200); await pg.waitForTimeout(1300);
    const s1 = await state(); console.log(label, '| from', before, 'to', s1.active, '| feed agrees:', s1.feed === s1.active, s1.count);
  }
  console.log('page errors:', errors); await b.close(); srv.close();
});
