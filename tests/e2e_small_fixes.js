// Browser test (step 62a): small fixes from the 14 Nov audit.
//   · the order page gives two links: the guest link and the couple's private /c/<id>/<key> link
//   · the pinned "Make a Reel / Make a Post" bar follows the Reel and Post switches
//   · the first design's ↑ counter pill and "next moment" label never show
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'SMALLFIXES0000000062A';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['SX' + String(i).padStart(2, '0')] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const order = call('queue', { token: admin }).recentDone[0];
const gid = call('setGallery', { token: admin, orderId: order.orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const company = DB.Galleries.slice(1).find(x => x.includes(gid))[DB.Galleries[0].indexOf('companyName')];
const owner = DB.Users.slice(1).find(u => u[2] === company && u[3] === 'client');
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html'; if (u.endsWith('/')) u += 'index.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8866, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  // 1. the order page: two links
  if (owner) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://localhost:8866/app/'); await pg.fill('#email', owner[0]); await pg.click('#loginBtn'); await pg.waitForSelector('#step2:not(.hidden)');
    await pg.fill('#code', /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]); await pg.click('#loginBtn'); await pg.waitForSelector('#v-dash:not(.hidden)');
    const box = pg.locator('details', { hasText: 'Wedding gallery is live' }).first(); await box.locator('summary').click();
    await box.locator('button', { hasText: 'Copy guest link' }).click(); await pg.waitForTimeout(300);
    const g1 = await pg.evaluate(() => navigator.clipboard.readText());
    await box.locator('button', { hasText: 'Copy couple link' }).click(); await pg.waitForTimeout(600);
    const c1 = await pg.evaluate(() => navigator.clipboard.readText());
    check(g1.endsWith('/g/' + gid), 'order page: "Copy guest link" gives /g/' + gid);
    check(c1.endsWith('/c/' + gid + '/' + ck), 'order page: "Copy couple link (private)" gives the couple\'s /c/<id>/<key> link');
    await box.screenshot({ path: '/tmp/s62a_order.png' });
    await ctx.close();
  } else check(false, 'no photographer user for the order page test');
  // 2. the pinned bar follows the switches; the old pill and label never show
  const gj = call('guestJoin', { g: gid, name: 'Bar Guest', phone: '9000022222', device: 'devsmall001' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('SX01') }));
  await pg.addInitScript(([gid, g]) => { localStorage.setItem('pg_guest_' + gid, JSON.stringify(g)); localStorage.setItem('pg_mine_' + gid, JSON.stringify({ sure: ['SX00', 'SX01', 'SX02'], maybe: [] })); localStorage.setItem('pg_found_' + gid, '1'); }, [gid, { guestId: gj.guestId, guestKey: gj.guestKey, name: 'Bar Guest' }]);
  await pg.goto('http://localhost:8866/g/' + gid); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(800);
  await pg.evaluate(() => pgOpenEvent('Your photos')); await pg.waitForTimeout(500);
  const vis = () => pg.evaluate(() => { const v = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && (!e.closest('.pgcr-bar') || getComputedStyle(e.closest('.pgcr-bar')).display !== 'none'); }; return { bar: v('.pgcr-bar'), reel: v('.pgcr-bar [data-k=reel]'), post: v('.pgcr-bar [data-k=post]') }; });
  let v = await vis(); check(v.bar && v.reel && v.post, 'Your photos: the bar shows Make a Reel and Make a Post ' + JSON.stringify(v));
  await pg.evaluate(() => { GALLERY.features.reel = 'off'; PGFeatures.paint(); }); v = await vis();
  check(v.bar && !v.reel && v.post, 'Reel switched off: only Make a Post ' + JSON.stringify(v));
  await pg.evaluate(() => { GALLERY.features.post = 'off'; PGFeatures.paint(); }); v = await vis();
  check(!v.bar, 'Reel and Post both off: no bar ' + JSON.stringify(v));
  check(await pg.evaluate(() => ['.mk-counter-pill', '.mk-next-moment-cue'].every(s => [...document.querySelectorAll(s)].every(e => getComputedStyle(e).display === 'none'))), 'the old ↑ counter pill and "next moment" label never show');
  await ctx.close();
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
