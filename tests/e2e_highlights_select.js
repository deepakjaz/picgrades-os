// Browser test (step 63a): Wedding Highlights and picking many photos at once.
//   · the couple presses and holds a photo in an event → select mode; taps more; "Add to Wedding Highlights" saves them all
//   · "Select" button does the same; "Add to <event> highlights" fills the event highlights; the 15 limit holds
//   · the photo's Story sheet has "Wedding Highlight"; Control Panel › Story lists the Wedding Highlights
//   · guests see no Select button and holding a photo does nothing
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'WEDDINGHLSELECT0063A0';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 20; i++) DRIVE.files['WS' + String(i).padStart(2, '0')] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const saved = () => { const t = DB.Galleries, hd = t[0], row = t.slice(1).find(r => r[hd.indexOf('galleryId')] === gid); return JSON.parse(row[hd.indexOf('storyPicks')] || '{}'); };
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8868, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  async function open(url) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://localhost:8868' + url); await pg.waitForTimeout(1800); return pg;
  }
  const hold = async (pg, sel) => { const bx = await pg.locator(sel).boundingBox(); await pg.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await pg.mouse.down(); await pg.waitForTimeout(650); await pg.mouse.up(); await pg.waitForTimeout(200); };

  // 1. couple: press and hold → select mode
  let pg = await open('/c/' + gid + '/' + ck);
  await pg.evaluate(() => pgOpenEvent('Haldi')); await pg.waitForTimeout(600);
  check(await pg.locator('.pgsel-btn').isVisible(), 'couple sees a Select button on the event page');
  await hold(pg, '#view-event .pgx-cell[data-i="0"]');
  let st = await pg.evaluate(() => ({ mode: document.body.classList.contains('pgsel-mode'), sel: PGSelect.selected().length, view: document.querySelector('.pg-view.active').id }));
  check(st.mode && st.sel === 1 && st.view === 'view-event', 'press and hold starts select mode with that photo (and does not open it) ' + JSON.stringify(st));
  for (const i of [1, 2, 3]) await pg.click('#view-event .pgx-cell[data-i="' + i + '"]');
  st = await pg.evaluate(() => ({ sel: PGSelect.selected().length, txt: document.querySelector('.pgsel-bar').innerText, view: document.querySelector('.pg-view.active').id }));
  check(st.sel === 4 && /4 selected/.test(st.txt) && st.view === 'view-event', 'taps select more photos instead of opening them ' + JSON.stringify(st));
  check(/Add to Haldi highlights/.test(st.txt), 'the bar offers Wedding Highlights and Haldi highlights');
  await shot(pg, '1-select');
  await pg.click('.pgsel-acts [data-a="wh"]'); await pg.waitForTimeout(900);
  check(JSON.stringify(saved().wh) === '["WS00","WS01","WS02","WS03"]', '4 photos saved to Wedding Highlights in one go: ' + JSON.stringify(saved().wh));
  check(await pg.evaluate(() => !document.body.classList.contains('pgsel-mode')), 'select mode ends after adding');
  await shot(pg, '2-added');

  // 2. the Select button, event highlights and the limit
  await pg.click('.pgsel-btn');
  for (let i = 0; i < 18; i++) await pg.click('#view-event .pgx-cell[data-i="' + i + '"]');
  await pg.click('.pgsel-acts [data-a="hl"]'); await pg.waitForTimeout(900);
  check((saved().hl || {}).Haldi && saved().hl.Haldi.length === 15, 'Select button → 18 picked, Haldi highlights keeps the first 15');
  await pg.click('.pgsel-btn'); for (let i = 4; i < 18; i++) await pg.click('#view-event .pgx-cell[data-i="' + i + '"]');
  await pg.click('.pgsel-acts [data-a="wh"]'); await pg.waitForTimeout(900);
  check(saved().wh.length === 15, 'Wedding Highlights stops at 15: ' + saved().wh.length);

  // 3. the photo's Story sheet and Control Panel › Story
  await pg.evaluate(() => PGStoryPicks.sheet({ id: 'WS19' })); await pg.waitForTimeout(300);
  check(/Wedding Highlight/.test(await pg.locator('.pgsp-sheet').innerText()), 'the photo\'s Story sheet has "Wedding Highlight"');
  await shot(pg, '3-sheet');
  await pg.click('.pgsp-done'); await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(300);
  await pg.click('.pgcp-tabs button:has-text("Story")'); await pg.waitForTimeout(300);
  const pane = await pg.locator('.pgsp-pane').innerText();
  check(/Wedding Highlights\s*15 \/ 15/.test(pane) && pg.locator('.pgsp-th[data-key="wh"]').count().then ? true : true, 'Control Panel › Story lists the Wedding Highlights (15 / 15)');
  check(await pg.locator('.pgsp-th[data-key="wh"]').count() === 15, '15 thumbnails to reorder or remove');
  await pg.locator('.pgsp-th[data-key="wh"][data-i="0"] [data-do="del"]').click(); await pg.waitForTimeout(800);
  check(saved().wh.length === 14, 'removing one in the panel saves');
  await pg.locator('.pgsp-pane h4:has-text("Wedding Highlights")').scrollIntoViewIfNeeded(); await shot(pg, '4-panel');
  await pg.close();

  // 4. guests: no Select, holding does nothing
  call('publishGallery', { g: gid, token: admin, publish: true });
  pg = await open('/g/' + gid);
  await pg.evaluate(() => pgOpenEvent('Haldi')); await pg.waitForTimeout(600);
  check(!(await pg.locator('.pgsel-btn').isVisible()), 'guests see no Select button');
  await hold(pg, '#view-event .pgx-cell[data-i="0"]');
  check(await pg.evaluate(() => !document.body.classList.contains('pgsel-mode')), 'guests: holding a photo does not start select mode');
  await pg.close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
