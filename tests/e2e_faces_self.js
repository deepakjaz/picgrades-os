// Browser test (step 65c): the couple who made their own wedding reads the faces on their own phone (real face model).
//   · the dashboard and the Draft checklist offer "Read faces now"; the simple page shows only the reading card (no PicGrades parts)
//   · reading finishes → "Find me is ready ✓" with "Open my wedding app" (their couple link); the dashboard then says Find me ready
//   · PicGrades staff opening the same page get the full page
const http = require('http'); const fs = require('fs'); const path = require('path');
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
const W = 'SELFFACESWEDDING0065C';
DRIVE.folders[W] = { name: 'Meera_Kabir', access: 'ANYONE_WITH_LINK' };
DRIVE.folders[W + 's'] = { name: 'Sangeet', parent: W }; DRIVE.folders[W + 'c'] = { name: 'Cocktail', parent: W };
const FILE = { FY1: 'sample1.jpg', FY2: 'sample2.jpg', FY3: 'sample3.jpg', FY4: 'sample4.jpg' };
DRIVE.files.FY1 = { name: 'a.jpg', parent: W + 's', mime: 'image/jpeg' }; DRIVE.files.FY2 = { name: 'b.jpg', parent: W + 's', mime: 'image/jpeg' };
DRIVE.files.FY3 = { name: 'c.jpg', parent: W + 'c', mime: 'image/jpeg' }; DRIVE.files.FY4 = { name: 'd.jpg', parent: W + 'c', mime: 'image/jpeg' };
global.__fetchBytes = (id) => fs.readFileSync(path.join(FX, FILE[id]));
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
call('signUp', { email: 'meera@example.com', name: 'Meera Rao', kind: 'couple' });
const tok = call('verifyCode', { email: 'meera@example.com', code: codeOf('meera@example.com') }).token;
const wed = call('createWedding', { token: tok, folderUrl: W, title: 'Meera & Kabir', functions: { findme: 'on' } });
call('requestCode', { email: 'adcmediaa@gmail.com' });
const admin = call('verifyCode', { email: 'adcmediaa@gmail.com', code: codeOf('adcmediaa@gmail.com') }).token;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html'; if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8875, async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
  const photos = pg => pg.route('https://lh3.googleusercontent.com/**', r => { const m = r.request().url().match(/\/d\/([A-Z0-9]+)/); r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(FX, FILE[m && m[1]] || 'sample1.jpg')), headers: { 'Access-Control-Allow-Origin': '*' } }); });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(t => localStorage.setItem('pg_token', t), tok);
  const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort()); await photos(pg);

  // 1. the Draft checklist in her wedding app
  await pg.goto('http://localhost:8875' + wed.coupleLink.replace(/^https?:\/\/[^/]+/, '')); await pg.waitForTimeout(1800);
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(400);
  const go = await pg.getAttribute('.pgpub-go', 'href').catch(() => null);
  check(go && go === '/app/faces.html?g=' + wed.galleryId, 'Draft checklist: "Faces not read yet" has "Read faces now" → ' + go);

  // 2. the dashboard
  await pg.goto('http://localhost:8875/app/'); await pg.waitForTimeout(1200);
  check(await pg.locator('#weddings a:has-text("Read faces now")').count() === 1 && /faces not read yet/.test(await pg.locator('#weddings').innerText()), 'dashboard: "Find me: faces not read yet" and "Read faces now"');
  await pg.click('#weddings a:has-text("Read faces now")'); await pg.waitForSelector('#readCard:not(.hidden)');

  // 3. the simple page
  const s = await pg.evaluate(() => ({ simple: document.body.classList.contains('simple'), h2: document.querySelector('#readCard h2').textContent, text: document.querySelector('#readCard p.muted').textContent,
    staffHidden: ['peopleCard', 'sendCard'].every(id => getComputedStyle(document.getElementById(id)).display === 'none'), due: getComputedStyle(document.getElementById('tDueTile')).display }));
  check(s.simple && /Read the faces for Find me/.test(s.h2) && /about \d+ minutes for 4 photos/.test(s.text) && /Nothing leaves your Google Drive/.test(s.text), 'simple page: plain words, time estimate for 4 photos');
  check(s.staffHidden && s.due === 'none', 'the PicGrades parts (check result, send to client, links, demo, due time) are hidden');
  await shot(pg, '1-simple');
  await pg.click('#startBtn');
  await pg.waitForFunction(() => document.getElementById('statusPill').textContent === 'Ready', null, { timeout: 600000 });
  await pg.waitForTimeout(500);
  const d = await pg.evaluate(() => ({ done: !document.getElementById('doneCard').classList.contains('hidden'), open: document.getElementById('doneOpen').getAttribute('href') }));
  check(d.done && /\/c\/[a-z0-9]+\/[A-Za-z0-9_-]+$/.test(d.open), 'reading finishes → "Find me is ready ✓" with "Open my wedding app" (her couple link)');
  await shot(pg, '2-done');
  check(call('facesStatus', { token: admin, g: wed.galleryId }).gallery.status === 'Ready', 'the server marks Find me Ready');
  await pg.goto('http://localhost:8875/app/'); await pg.waitForTimeout(1200);
  const card = await pg.locator('#weddings').innerText();
  check(/Find me ready ✓/.test(card) && await pg.locator('#weddings a:has-text("Read faces now")').count() === 0, 'dashboard now says "Find me ready ✓"');
  await pg.close();

  // 4. PicGrades staff get the full page
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx2.addInitScript(t => localStorage.setItem('pg_token', t), admin);
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push(e.message)); await p2.route('**fonts.g**', r => r.abort()); await photos(p2);
  await p2.goto('http://localhost:8875/app/faces.html?g=' + wed.galleryId); await p2.waitForSelector('#readCard:not(.hidden)'); await p2.waitForTimeout(500);
  check(await p2.evaluate(() => !document.body.classList.contains('simple') && getComputedStyle(document.getElementById('sendCard')).display !== 'none'), 'PicGrades staff: the full page (send to client, links…)');
  await ctx2.close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
