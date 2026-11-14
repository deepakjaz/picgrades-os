// Browser test (step 63c): the guest welcome.
//   · a guest of a wedding set to "only after Find me" first sees the couple's Welcome photo, the names, "Which side are you from?"
//   · then "Did you attend any of the events?" — No → the Wedding Highlights; Yes → Find me (name + phone first)
//   · Back goes to the side question; the welcome shows once per phone; the side and the answer go with the guest's name
//   · not for the couple, and not on an open wedding
global.__autoOpen = false;
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'GUESTWELCOME000063C00';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 8; i++) DRIVE.files['GW' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun', eventDate: '2026-12-12' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
{ const t = DB.Galleries, hd = t[0], r = t.slice(1).find(x => x[hd.indexOf('galleryId')] === gid); r[hd.indexOf('facesStatus')] = 'Ready'; }
call('storyPicks', { g: gid, coupleKey: ck, picks: { wh: ['GW0', 'GW1'], welcome: 'GW5', hl: { Haldi: ['GW2'] } } });
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8870, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const ctxOf = () => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  async function open(ctx, url) {
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://localhost:8870' + url); await pg.waitForTimeout(1800); return pg;
  }
  const W8 = pg => pg.evaluate(() => { const w = document.getElementById('pgWelcome'); return w ? { txt: w.innerText, src: (w.querySelector('.pgw-photo') || {}).src || '', step: (w.querySelector('.pgw-step:not([hidden])') || {}).dataset ? w.querySelector('.pgw-step:not([hidden])').dataset.step : '' } : null; });

  // 1. a new guest: welcome → side → No → Wedding Highlights
  const c1 = await ctxOf(); let pg = await open(c1, '/g/' + gid);
  let w = await W8(pg);
  check(w && /Welcome to the wedding of/i.test(w.txt) && /Riya & Arjun/.test(w.txt) && /Which side are you from/.test(w.txt), 'a new guest sees the welcome with the names and the side question');
  check(w && /GW5/.test(w.src), 'the photo is the chosen Welcome photo');
  await shot(pg, '1-welcome');
  await pg.click('#pgWelcome [data-side="groom"]'); await pg.waitForTimeout(200);
  w = await W8(pg); check(w.step === '2' && /Did you attend any of the events/.test(w.txt), 'after the side: "Did you attend any of the events?"');
  await shot(pg, '2-attended');
  await pg.click('#pgWelcome .pgw-back'); await pg.waitForTimeout(150);
  check((await W8(pg)).step === '1', 'Back returns to the side question');
  await pg.click('#pgWelcome [data-side="bride"]'); await pg.click('#pgWelcome [data-att="no"]'); await pg.waitForTimeout(700);
  let st = await pg.evaluate(() => ({ w: !!document.getElementById('pgWelcome'), view: document.querySelector('.pg-view.active').id, title: (document.getElementById('pgxTitle') || {}).textContent, saved: localStorage.getItem('pg_welcome_' + GALLERY_ID) }));
  check(!st.w && st.view === 'view-event' && st.title === 'Wedding Highlights', '"No" → the Wedding Highlights ' + JSON.stringify(st));
  check(st.saved === '{"side":"bride","attended":"no"}', 'the answers are kept on the phone');
  await shot(pg, '3-highlights'); await pg.close();
  pg = await open(c1, '/g/' + gid);
  check(!(await W8(pg)), 'the welcome shows once per phone'); await pg.close();

  // 2. another guest: Yes → Find me asks name + phone → the side is saved with the guest
  const c2 = await ctxOf(); pg = await open(c2, '/g/' + gid);
  await pg.click('#pgWelcome [data-side="groom"]'); await pg.click('#pgWelcome [data-att="yes"]'); await pg.waitForTimeout(700);
  const idOpen = await pg.evaluate(() => document.getElementById('idSheet').classList.contains('show'));
  check(idOpen, '"Yes" → Find me, starting with name and phone');
  await shot(pg, '4-name');
  await pg.fill('#idName', 'Meera Shah'); await pg.fill('#idPhone', '9812345678'); await pg.click('#idGo'); await pg.waitForTimeout(900);
  const gt = DB.Guests, gh = gt[0], grow = gt.slice(1).find(r => r[gh.indexOf('name')] === 'Meera Shah');
  check(grow && grow[gh.indexOf('side')] === 'groom' && grow[gh.indexOf('attended')] === 'yes', 'the guest is saved with side "groom" and attended "yes"');
  check(await pg.evaluate(() => document.getElementById('fmSheet').classList.contains('show')), 'then the Find me camera sheet opens');
  await pg.close();

  // 3. not for the couple; not on an open wedding
  const c3 = await ctxOf(); pg = await open(c3, '/c/' + gid + '/' + ck);
  check(!(await W8(pg)), 'the couple never sees the welcome'); await pg.close();
  call('guestPhotos', { g: gid, coupleKey: ck, mode: 'open' });
  const c4 = await ctxOf(); pg = await open(c4, '/g/' + gid);
  check(!(await W8(pg)), 'an open wedding has no welcome'); await pg.close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
