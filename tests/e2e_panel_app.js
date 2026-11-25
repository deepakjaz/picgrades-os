// Browser test (step 64): the Control Panel as a full-screen app page.
//   · phone: full screen; home = wedding name, Draft/Live, then a list (Look · Photos · App · Studio); a row opens its section with ‹ Back
//   · every section fits the screen: nothing is wider than the phone (the page cannot drift sideways)
//   · Functions shows the counts cleanly (the Plan note no longer writes over them)
//   · computer: the same phone-sized panel in the middle; Escape goes back, then closes
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'CONTROLPANEL00000059';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['sH', 'Haldi'], ['sM', 'Mehendi'], ['sS', 'Sangeet'], ['sW', 'Wedding'], ['sR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 20; i++) DRIVE.files['SP' + k + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Ashish & Muskan', eventDate: '2027-01-24' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8872, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
  await pg.addInitScript(t => localStorage.setItem('pg_token', t), admin);
  await pg.goto('http://localhost:8872/pg/' + pub.galleryId); await pg.waitForTimeout(2500);
  const wide = () => pg.evaluate(() => ({ doc: document.documentElement.scrollWidth, inner: document.querySelector('.pgcp-scroll') ? document.querySelector('.pgcp-scroll').scrollWidth : 0, W: innerWidth }));

  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(500);
  let st = await pg.evaluate(() => { const s = document.querySelector('.pgcp-sheet'), r = s.getBoundingClientRect(); return { w: r.width, h: r.height, home: s.classList.contains('at-home'), rows: [...s.querySelectorAll('.pgcp-item')].map(b => b.dataset.tab), groups: [...s.querySelectorAll('.pgcp-group')].map(x => x.textContent), live: !!s.querySelector('.pgpub'), locked: document.documentElement.classList.contains('pgcp-open') }; });
  check(st.w === 390 && st.h === 844, 'phone: the panel fills the whole screen ' + st.w + '×' + st.h);
  check(st.home && st.live && JSON.stringify(st.groups) === '["Look","Photos","Guests","App","Studio"]', 'home: Draft/Live box and the groups Look · Photos · Guests · App · Studio');
  check(['theme', 'layout', 'pages', 'story', 'guests', 'found', 'functions', 'requests', 'photographer'].every(k => st.rows.includes(k)), 'every section is in the list: ' + st.rows.join(' '));
  check(st.locked, 'the page behind does not scroll while the panel is open');
  await shot(pg, '1-home');
  for (const k of st.rows) {
    await pg.click('.pgcp-item[data-tab="' + k + '"]'); await pg.waitForTimeout(500);
    if (k === 'access') {   // step 89: "Who can see" opens its own full screen above the panel, and ‹ Back returns to the panel
      const ac = await pg.evaluate(() => { const r = document.querySelector('.pgac'), b = r && r.getBoundingClientRect(); return { open: !!r, w: b && b.width, back: !!(r && r.querySelector('[data-close]')), doc: document.documentElement.scrollWidth }; });
      check(ac.open && ac.w === 390 && ac.back && ac.doc === 390, 'access: Who can see opens full screen with ‹ Back, nothing wider than the phone ' + JSON.stringify(ac));
      await pg.click('.pgac [data-close]'); await pg.waitForTimeout(300);
      check(!(await pg.$('.pgac')) && !!(await pg.$('.pgcp-sheet.at-home')), 'access: ‹ Back returns to the Control Panel');
      continue;
    }
    const t = await pg.evaluate(() => ({ title: document.querySelector('.pgcp-bar-title').textContent, back: getComputedStyle(document.querySelector('.pgcp-nav-back')).visibility, tab: document.querySelector('.pgcp-body').dataset.tab }));
    const w = await wide();
    check(t.tab === k && t.back === 'visible' && t.title && w.doc === 390 && w.inner <= 390, k + ': opens full screen with ‹ Back, title "' + t.title + '", nothing wider than the phone ' + JSON.stringify(w));
    if (k === 'functions') {
      const fx = await pg.evaluate(() => ({ stats: document.querySelector('.pgcp-stats').innerText, note: document.querySelector('.pgcp-pane > .pgcp-note').textContent }));
      check(/^5\s+Collections/.test(fx.stats) && /Plan/.test(fx.note), 'Functions: the counts are clean and the Plan note is in its own line');
      await shot(pg, '2-functions');
    }
    if (k === 'theme') await shot(pg, '3-theme');
    await pg.click('.pgcp-nav-back'); await pg.waitForTimeout(350);
    check(await pg.evaluate(k => document.querySelector('.pgcp-sheet').classList.contains('at-home') && document.activeElement && document.activeElement.dataset.tab === k, k), k + ': Back returns to the list (focus on its row)');
  }
  await pg.click('.pgcp-x'); await pg.waitForTimeout(400);
  check(await pg.evaluate(() => !document.querySelector('.pgcp-sheet') && !document.documentElement.classList.contains('pgcp-open')), '✕ closes the panel and the page scrolls again');
  for (const v of ['hub', 'gallery', 'moments', 'notes']) { await pg.evaluate(v => switchView(v), v); await pg.waitForTimeout(500); const w = await wide(); check(w.doc === 390, v + ': the page is exactly the phone\'s width'); }
  check(await pg.evaluate(() => getComputedStyle(document.body).overflowX === 'clip' && getComputedStyle(document.documentElement).overflowX === 'clip'), 'the page is locked sideways (overflow-x: clip on html and body)');

  // computer
  await pg.setViewportSize({ width: 1280, height: 860 }); await pg.waitForTimeout(300);
  await pg.evaluate(() => PGControl.open('story')); await pg.waitForTimeout(500);
  st = await pg.evaluate(() => { const r = document.querySelector('.pgcp-sheet').getBoundingClientRect(); return { w: r.width, cx: Math.round(r.left + r.width / 2), tab: document.querySelector('.pgcp-body').dataset.tab }; });
  check(st.w === 440 && Math.abs(st.cx - 640) <= 1 && st.tab === 'story', 'computer: a phone-sized panel in the middle, opened straight on a section ' + JSON.stringify(st));
  await shot(pg, '4-computer');
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  check(await pg.evaluate(() => document.querySelector('.pgcp-sheet').classList.contains('at-home')), 'Escape goes back to the list');
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  check(await pg.evaluate(() => !document.querySelector('.pgcp-sheet')), 'Escape again closes the panel');

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
