// Browser test (step 65a): Control Panel › Guests › Found with Find me.
//   · the couple sees every guest Find me found: face cut from a wedding photo (not the selfie), name, side, attended, photo count, mobile
//   · tapping a guest opens the photos they are in; the number opens the phone app
//   · not for the photographer; a guest asking the server is refused
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
// real-looking face codes: 128 numbers, distances set exactly
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
const unit = () => { const v = Array.from({ length: 128 }, rnd); const n = Math.hypot(...v); return v.map(x => x / n); };
const orth = (v, ...others) => { let w = v.slice(); others.forEach(o => { const d = w.reduce((s, x, i) => s + x * o[i], 0); w = w.map((x, i) => x - d * o[i]); }); const n = Math.hypot(...w); return w.map(x => x / n); };
const add = (a, ...parts) => a.map((x, i) => parts.reduce((s, [v, k]) => s + v[i] * k, x));
const pack = v => Buffer.from(Int8Array.from(v.map(x => Math.max(-127, Math.min(127, Math.round(x * 250))))).buffer).toString('base64');
const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const base = unit().map(x => x * 0.9), u1 = unit(), u2 = orth(unit(), u1), u3 = orth(unit(), u1, u2), u4 = orth(unit(), u1, u2, u3);
const PRIYA = base, GROOM = add(base, [u1, 0.9]), BROTHER = add(GROOM, [u2, 0.45]);   // the brother's selfie is 0.45 from the groom
const twinA = add(base, [u3, 1.2]), twinB = add(twinA, [u4, 0.6]), mixed = add(twinA, [u4, 0.287], [u2, 0.249]);    // 0.38 from A, 0.40 from B
const NIKHIL = add(base, [u4, 1.5]);
const face = v => [[0.1, 0.1, 0.2, 0.2], pack(v)];
const near = (v, d, dir) => add(v, [dir || u3, d]);
const W = 'FOUNDLISTE2E000065A00';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
const OTHER = add(base, [u1, -1.4]);
const box = (x, y) => [x, y, 120, 140];
const photos = { P1: [[box(100, 100), pack(OTHER)], [box(600, 200), pack(near(PRIYA, 0.25))]], P2: [[box(300, 300), pack(near(PRIYA, 0.3, u2))]], P3: [[box(50, 60), pack(near(PRIYA, 0.28, u4))]], X1: [[box(400, 400), pack(OTHER)]] };
Object.keys(photos).forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: W + 'w', mime: 'image/jpeg' });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const sf = {}; Object.keys(photos).forEach(id => sf[id] = { w: 1600, h: 1000, f: photos[id] });
call('saveFaces', { token: admin, g: gid, pass: 1, photos: sf, done: true });
const j = call('guestJoin', { g: gid, name: 'Priya Mehta', phone: '9123456780', device: 'devfounde2e', side: 'bride', attended: 'yes' });
const r0 = call('findFaces', { g: gid, device: 'devfounde2e', guestId: j.guestId, guestKey: j.guestKey, d: pack(near(PRIYA, 0.05, u1)) });
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8873, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  check(r0.sure && r0.sure.length === 3, 'set-up: Priya found in 3 photos');
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const ctxOf = () => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  async function open(url, store) {
    const ctx = await ctxOf(); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    if (store) await pg.addInitScript(s => Object.keys(s).forEach(k => localStorage.setItem(k, s[k])), store);
    await pg.goto('http://localhost:8873' + url); await pg.waitForTimeout(1800); return pg;
  }
  // 1. the couple
  let pg = await open('/c/' + gid + '/' + ck);
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(400);
  const groups = await pg.$$eval('.pgcp-group', g => g.map(x => x.textContent));
  check(groups.includes('Guests') && await pg.locator('.pgcp-item[data-tab="found"]').count() === 1, 'couple: a "Guests" group with "Found with Find me" ' + JSON.stringify(groups));
  await pg.click('.pgcp-item[data-tab="found"]'); await pg.waitForSelector('.pgfd-row');
  const row = await pg.evaluate(() => { const r = document.querySelector('.pgfd-row'); const f = r.querySelector('.pgfd-face'); return { txt: r.innerText, bg: f.style.backgroundImage, pos: f.style.backgroundPosition, count: document.querySelector('.pgfd-count').textContent }; });
  check(/Priya Mehta/.test(row.txt) && /Bride’s side/.test(row.txt) && /Attended/.test(row.txt) && /3 photos/.test(row.txt) && /9123456780/.test(row.txt), 'the guest: name, side, attended, 3 photos, mobile');
  check(/P[123]/.test(row.bg) && row.pos, 'her face is cut from a wedding photo: ' + row.bg.slice(0, 60));
  check(/1 found/.test(row.count), 'count line: ' + row.count);
  await shot(pg, '1-found');
  check(await pg.getAttribute('.pgfd-call', 'href') === 'tel:9123456780', 'the mobile number opens the phone app');
  await pg.click('.pgfd-row .pgfd-t'); await pg.waitForTimeout(700);
  const ev = await pg.evaluate(() => ({ view: document.querySelector('.pg-view.active').id, title: document.getElementById('pgxTitle').textContent, n: document.querySelectorAll('#view-event .pgx-cell').length, panel: !!document.querySelector('.pgcp-sheet') }));
  check(ev.view === 'view-event' && /Priya Mehta/.test(ev.title) && ev.n === 3 && !ev.panel, 'tapping her opens the 3 photos she is in ' + JSON.stringify(ev));
  await shot(pg, '2-her-photos'); await pg.close();

  // 2. the photographer (the studio's own account): no row, and the server refuses
  const company = DB.Galleries.slice(1).find(x => x.includes(gid))[DB.Galleries[0].indexOf('companyName')];
  const owner = DB.Users.slice(1).find(u => u[2] === company && u[3] === 'client');
  const ptok = login(owner[0]);
  pg = await open('/ph/' + gid, { pg_token: ptok });
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(400);
  check(await pg.evaluate(() => PGControl.role()) === 'photographer' && await pg.locator('.pgcp-item[data-tab="found"]').count() === 0, 'photographer: no "Found with Find me" in the panel');
  check(!call('foundList', { g: gid, token: ptok }).ok, 'photographer asking the server directly is refused');
  await pg.close();
  // PicGrades (support) sees it
  pg = await open('/pg/' + gid, { pg_token: admin });
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(400);
  check(await pg.locator('.pgcp-item[data-tab="found"]').count() === 1, 'PicGrades: sees the list (support)');
  await pg.close();

  // 3. a guest: no panel at all, and the server refuses
  pg = await open('/g/' + gid);
  check(await pg.evaluate(() => pgApi('foundList').then(() => 'got it', e => e.message)) === 'Only the couple can see this list.', 'a guest asking the server directly is refused');
  await pg.close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
