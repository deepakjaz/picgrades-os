// Browser test (step 61b): the photo viewer. Swipe the big photo left / right for next / previous; a play button runs a slideshow
// of the collection (any touch stops it); the details (ⓘ) panel is only for the photographer and PicGrades.
//
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'VIEWERPLAY0000000061B';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 8; i++) DRIVE.files['LK' + String(i).padStart(2, '0')] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8865, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const B = 'http://localhost:8865';
  const open = async (url, store) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('LK01') }));
    if (store) await pg.addInitScript(s => { Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); }, store);
    await pg.goto(B + url); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1000);
    await pg.evaluate(() => openCollection(GALLERY.events[0].name, 0)); await pg.waitForTimeout(800);
    return { ctx, pg };
  };
  const swipe = (pg, dx, dy) => pg.evaluate(([dx, dy]) => {
    const f = document.getElementById('pgvFeed'), x = 200, y = 400;
    const t = (cx, cy) => new Touch({ identifier: 1, target: f, clientX: cx, clientY: cy });
    f.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x, y)], changedTouches: [t(x, y)], bubbles: true }));
    f.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx, y + dy)], bubbles: true }));
  }, [dx, dy]);
  const at = pg => pg.evaluate(() => activeIdx);
  let { ctx, pg } = await open('/g/' + gid);
  check(await at(pg) === 0, 'the viewer opens on the first photo');
  await swipe(pg, -140, 10); await pg.waitForTimeout(700);
  check(await at(pg) === 1, 'swipe left: the next photo');
  await swipe(pg, -140, 5); await pg.waitForTimeout(700);
  await swipe(pg, 150, -8); await pg.waitForTimeout(700);
  check(await at(pg) === 1, 'swipe right: the previous photo');
  await swipe(pg, -30, 4); await pg.waitForTimeout(500);
  check(await at(pg) === 1, 'a small touch does not move');
  check(await pg.evaluate(() => getComputedStyle(document.getElementById('pgvInfo')).display === 'none'), 'guest: no ⓘ details button');
  check(await pg.evaluate(() => !!document.getElementById('pgvPlay') && getComputedStyle(document.getElementById('pgvPlay')).display !== 'none'), 'a play button in the viewer');
  await pg.click('#pgvPlay'); await pg.waitForTimeout(300);
  check(await pg.evaluate(() => PGPlay.playing() && document.body.classList.contains('pgv-playing')), 'play: the slideshow runs');
  await pg.screenshot({ path: '/tmp/s61b_play.png' });
  await pg.waitForTimeout(3700);
  check(await at(pg) === 2, 'after 3.5 seconds: the next photo by itself');
  await pg.evaluate(() => document.getElementById('pgvFeed').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await pg.waitForTimeout(200);
  check(await pg.evaluate(() => !PGPlay.playing()), 'a touch on the photo stops the slideshow');
  await pg.click('#pgvPlay'); await pg.waitForTimeout(200);
  await pg.click('#pgvBack'); await pg.waitForTimeout(400);
  check(await pg.evaluate(() => !PGPlay.playing()), 'leaving the viewer stops it');
  await ctx.close();
  // the couple: no details either; PicGrades: the details are there
  ({ ctx, pg } = await open('/c/' + gid + '/' + ck));
  check(await pg.evaluate(() => getComputedStyle(document.getElementById('pgvInfo')).display === 'none'), 'couple: no ⓘ details button');
  await ctx.close();
  ({ ctx, pg } = await open('/pg/' + gid, { pg_token: admin })); await pg.waitForFunction(() => PGControl.role() === 'picgrades', null, { timeout: 8000 }).catch(() => {});
  check(await pg.evaluate(() => getComputedStyle(document.getElementById('pgvInfo')).display !== 'none'), 'PicGrades: the ⓘ details button is there');
  await ctx.close();
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
