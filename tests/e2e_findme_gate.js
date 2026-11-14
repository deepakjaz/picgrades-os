// Browser test (step 63b): no photos without Find me.
//   · a guest of a new wedding sees "Wedding Highlights" first; event cards stay, with a public cover; the phone holds no other photos
//   · tapping an event → the privacy message → "Find me" (asks name + phone first) or "See the Wedding Highlights"
//   · a guest Find me found: each event opens with its highlights + "Ask the couple for every <event> photo"; the couple approves; the
//     whole event opens for that guest
//   · Control Panel › Functions: Guest photos "Only after Find me" / "Open to everyone"; open → guests see every photo
global.__autoOpen = false;
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'FINDMEGATEE2E00063B00';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W }; DRIVE.folders[W + 's'] = { name: 'Sangeet', parent: W };
for (let i = 0; i < 10; i++) { DRIVE.files['GE' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' }; DRIVE.files['GT' + i] = { name: 's' + i + '.jpg', parent: W + 's', mime: 'image/jpeg' }; }
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
{ const t = DB.Galleries, hd = t[0], r = t.slice(1).find(x => x[hd.indexOf('galleryId')] === gid); r[hd.indexOf('facesStatus')] = 'Ready'; }
call('storyPicks', { g: gid, coupleKey: ck, picks: { wh: ['GE0', 'GT0'], hl: { Haldi: ['GE1', 'GE2'], Sangeet: ['GT1'] } } });
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8869, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const ctxOf = () => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  async function open(ctx, url, store) {
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    if (store) await pg.addInitScript(s => { Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); }, store);
    await pg.goto('http://localhost:8869' + url); await pg.waitForTimeout(1800); return pg;
  }
  const photosOnPhone = pg => pg.evaluate(() => { const o = new Set(); (GALLERY.events || []).forEach(e => e.photos.forEach(p => o.add(p.id))); (GALLERY.root || []).concat(GALLERY.pool || []).forEach(p => o.add(p.id)); return [...o].sort(); });

  // 1. a guest who has not done Find me
  const gctx = await ctxOf(); let pg = await open(gctx, '/g/' + gid + '#gallery');
  let names = await pg.evaluate(() => [...document.querySelectorAll('#pgGalleryMasonry h3, #pgGalleryMasonry .pge-name, #pgGalleryMasonry b')].map(x => x.textContent));
  check(names[0] === 'Wedding Highlights' && names.includes('Haldi') && names.includes('Sangeet'), 'guest gallery: Wedding Highlights first, then the events ' + JSON.stringify(names));
  check(JSON.stringify(await photosOnPhone(pg)) === '["GE0","GT0"]', 'the phone holds only the Wedding Highlights: ' + JSON.stringify(await photosOnPhone(pg)));
  await shot(pg, '1-guest-gallery');
  await pg.evaluate(() => pgOpenEvent('Haldi')); await pg.waitForTimeout(400);
  let sh = await pg.evaluate(() => { const s = document.querySelector('.pggt-sheet'); return { show: s.classList.contains('show'), txt: s.innerText, view: document.querySelector('.pg-view.active').id }; });
  check(sh.show && /Find yourself/.test(sh.txt) && /our photographer has captured you/.test(sh.txt) && sh.view !== 'view-event', 'tapping Haldi → privacy message, Haldi stays closed');
  await shot(pg, '2-privacy');
  await pg.click('.pggt-sheet [data-a="hl"]'); await pg.waitForTimeout(500);
  check(await pg.evaluate(() => document.querySelector('.pg-view.active').id === 'view-event' && document.getElementById('pgxTitle').textContent === 'Wedding Highlights'), '"See the Wedding Highlights" opens them');
  await pg.evaluate(() => pgOpenEvent('Sangeet')); await pg.waitForTimeout(300);
  await pg.click('.pggt-sheet [data-a="find"]'); await pg.waitForTimeout(500);
  check(await pg.evaluate(() => [...document.querySelectorAll('.show,[open]')].some(x => /name|phone|mobile/i.test(x.innerText || ''))), '"Find me" asks for name and phone first');
  await pg.close();

  // 2. a guest Find me found (GE5, GE6, GE7)
  const join = call('guestJoin', { g: gid, name: 'Ravi Kumar', phone: '9876543210', device: 'devgatee2e1' });
  const fmHd = DB.FindMe[0];
  DB.FindMe.push(fmHd.map(k => ({ at: '2026-11-15', galleryId: gid, phone: "'9876543210", guestId: join.guestId, name: 'Ravi Kumar', sure: 'GE5,GE6,GE7', maybe: '', status: 'ok' })[k] || ''));
  const fctx = await ctxOf(); const gstore = {}; gstore['pg_guest_' + gid] = JSON.stringify({ guestId: join.guestId, guestKey: join.guestKey, name: 'Ravi Kumar' });
  pg = await open(fctx, '/g/' + gid + '#gallery', gstore);
  const on = await photosOnPhone(pg);
  check(['GE1', 'GE2', 'GE5', 'GE6', 'GE7', 'GT1'].every(x => on.includes(x)) && !on.includes('GE8'), 'found guest: event highlights + own photos, nothing else ' + JSON.stringify(on));
  await pg.evaluate(() => pgOpenEvent('Haldi')); await pg.waitForTimeout(500);
  let ev = await pg.evaluate(() => ({ view: document.querySelector('.pg-view.active').id, n: document.querySelectorAll('#view-event .pgx-cell').length, more: (document.querySelector('.pggt-more') || {}).innerText || '' }));
  check(ev.view === 'view-event' && ev.n === 2 && /Ask the couple for every Haldi photo/.test(ev.more), 'found guest: Haldi opens with its 2 highlights and "Ask the couple…" ' + JSON.stringify(ev));
  await pg.click('.pggt-more .pggt-alt'); await pg.fill('.pggt-form input', 'ravi@mail.com');
  await pg.locator('.pggt-more').scrollIntoViewIfNeeded(); await shot(pg, '3-ask-more');
  await pg.click('.pggt-form button'); await pg.waitForTimeout(700);
  check(/You asked the couple/.test(await pg.locator('.pggt-more').innerText()), 'request sent; the page says so');
  await pg.close();

  // 3. the couple approves in Control Panel › Requests
  const cctx = await ctxOf(); pg = await open(cctx, '/c/' + gid + '/' + ck);
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(300);
  await pg.click('.pgcp-tabs [data-tab="requests"]'); await pg.waitForTimeout(800);
  const reqTxt = await pg.locator('.pgcp-sheet').innerText();
  check(/More photos · Haldi/.test(reqTxt) && /wants every photo of this event/.test(reqTxt), 'the couple sees "More photos · wants every Haldi photo"');
  await shot(pg, '4-requests');
  await pg.locator('.pgr-row:has-text("More photos · Haldi") button:has-text("Approve")').click(); await pg.waitForTimeout(900);
  check(/All Haldi photos/.test(mail[mail.length - 1].subject), 'approved: the guest is emailed');

  // 4. the guest now sees all of Haldi
  const pg2 = await open(fctx, '/g/' + gid + '#gallery', gstore); await pg2.waitForTimeout(800);
  await pg2.evaluate(() => pgOpenEvent('Haldi')); await pg2.waitForTimeout(500);
  ev = await pg2.evaluate(() => ({ n: document.querySelectorAll('#view-event .pgx-cell').length, more: !!document.querySelector('.pggt-more') }));
  check(ev.n === 10 && !ev.more, 'after approval: all 10 Haldi photos, no request box ' + JSON.stringify(ev));
  await pg2.close();

  // 5. Control Panel › Functions: the choice
  await pg.click('.pgcp-tabs [data-tab="functions"]'); await pg.waitForTimeout(300);
  check(await pg.locator('.pggt-seg [data-m="findme"][aria-checked="true"]').count() === 1, 'Functions shows "Only after Find me" chosen');
  await pg.locator('.pggt-choice').scrollIntoViewIfNeeded(); await shot(pg, '5-choice');
  await pg.click('.pggt-seg [data-m="open"]'); await pg.waitForTimeout(800);
  check(call('getGallery', { g: gid }).gallery.guestPhotos === 'open', 'the couple chose "Open to everyone"');
  await pg.close();
  const octx = await ctxOf(); pg = await open(octx, '/g/' + gid + '#gallery');
  check((await photosOnPhone(pg)).length === 20 && await pg.evaluate(() => !GALLERY.gated), 'open: a new guest sees every photo');
  await pg.evaluate(() => pgOpenEvent('Haldi')); await pg.waitForTimeout(400);
  check(await pg.evaluate(() => !document.querySelector('.pggt-sheet.show') && document.querySelectorAll('#view-event .pgx-cell').length === 10), 'open: Haldi opens straight away');
  await pg.close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
