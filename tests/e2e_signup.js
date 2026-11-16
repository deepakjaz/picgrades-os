// Browser test (step 65b): sign up yourself and make a wedding gallery.
//   · /app/?signup → couple → name, email → code → straight to "Create your wedding gallery"
//   · wedding name, date, Drive folder, functions → a Draft with its collections; the dashboard lists it (no editing balance)
//   · her couple link opens the Draft; the ☰ menu offers "Create your own wedding gallery"; the admin queue shows it
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'SIGNUPE2EWEDDING0065B';
DRIVE.folders[W] = { name: 'Riya_Arjun', access: 'ANYONE_WITH_LINK' };
['Haldi', 'Sangeet', 'Wedding'].forEach((ev, k) => { DRIVE.folders[W + k] = { name: ev, parent: W }; for (let i = 0; i < 4; i++) DRIVE.files['SE' + k + i] = { name: ev + i + '.jpg', parent: W + k, mime: 'image/jpeg' }; });
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html'; if (u.endsWith('/')) u += 'index.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8874, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());

  // 1. sign up (the wedding app's ☰ menu opens /app/?signup)
  await pg.goto('http://localhost:8874/app/?signup'); await pg.waitForTimeout(600);
  check(await pg.locator('#signupForm').isVisible() && await pg.getAttribute('#tabSignup', 'aria-selected') === 'true', '/app/?signup opens "Create your wedding gallery"');
  await pg.fill('#suName', 'Riya Shah'); await pg.fill('#suEmail', 'riya@example.com'); await pg.fill('#suPhone', '9876543210');
  await shot(pg, '1-signup');
  await pg.click('#suBtn'); await pg.waitForTimeout(600);
  check(await pg.locator('#step2').isVisible() && await pg.inputValue('#email') === 'riya@example.com', 'after sign up: the code box, with her email filled in');
  await pg.fill('#code', codeOf('riya@example.com')); await pg.click('#loginBtn'); await pg.waitForTimeout(1200);
  check(await pg.locator('#v-wedding').isVisible(), 'a new account goes straight to "Create your wedding gallery"');
  check(await pg.locator('#wFuncs input:checked').count() === 9, 'all 9 functions ticked by default');

  // 2. create the wedding
  await pg.fill('#wTitle', 'Riya & Arjun'); await pg.fill('#wDate', '2026-12-12'); await pg.fill('#wFolder', 'https://drive.google.com/drive/folders/' + W);
  await pg.uncheck('#wFuncs input[data-k="reel"]');
  await shot(pg, '2-create');
  await pg.click('#wBtn'); await pg.waitForSelector('#wDone:not(.hidden)', { timeout: 15000 });
  const done = await pg.locator('#wDone').innerText();
  check(/ready as a Draft/i.test(done) && /12 photos in 3 collections/.test(done) && /Haldi — 4 photos/.test(done) && /Read the faces now/.test(done) && /within 24 hours/.test(done), 'result: Draft, 12 photos in 3 collections, "Read faces now" (or we do it within 24 hours)');
  await shot(pg, '3-done');
  const couple = await pg.getAttribute('#wDone a:has-text("Open my wedding app")', 'href');
  check(await pg.getAttribute('#wDone a:has-text("Read faces now")', 'href') === '/app/faces.html?g=' + DB.Galleries.slice(1).find(g => g[DB.Galleries[0].indexOf('title')] === 'Riya & Arjun')[DB.Galleries[0].indexOf('galleryId')], '"Read faces now" opens the face page for this wedding');
  check(/\/c\/[a-z0-9]+\/[A-Za-z0-9_-]+$/.test(couple), '"Open my wedding app" is her couple link');
  const row = DB.Galleries.slice(1).find(g => g[DB.Galleries[0].indexOf('title')] === 'Riya & Arjun');
  check(JSON.parse(row[DB.Galleries[0].indexOf('features')]).reel === 'off', 'Reel Edits saved as off');

  // 3. the dashboard
  await pg.click('#wDone button.ghost'); await pg.waitForTimeout(800);
  const dash = await pg.evaluate(() => ({ wed: document.getElementById('weddings').innerText, bal: !document.getElementById('dashBody').classList.contains('hidden'), order: [...document.querySelectorAll('[data-go="order"]')].some(b => !b.classList.contains('hidden')), eyebrow: document.getElementById('dashEyebrow').textContent }));
  check(/Riya & Arjun/.test(dash.wed) && /DRAFT/.test(dash.wed) && /12 photos/.test(dash.wed) && /30 days left/.test(dash.wed), 'dashboard lists the wedding: Draft, 12 photos, 30 days left');
  check(!dash.bal && !dash.order, 'no editing balance and no "Place new order" for a self-made account');
  await shot(pg, '4-dash');

  // 4. her wedding app opens (as the couple, on the Draft)
  const pg2 = await ctx.newPage(); pg2.on('pageerror', e => errors.push(e.message)); await pg2.route('**fonts.g**', r => r.abort());
  await pg2.goto(couple.replace(/^https?:\/\/[^/]+/, 'http://localhost:8874')); await pg2.waitForTimeout(1800);
  check(await pg2.evaluate(() => GALLERY && GALLERY.status === 'Draft' && PGControl.role() === 'couple' && GALLERY.events.length === 3), 'her couple link opens the Draft wedding as the couple');
  await pg2.click('#pgMenuBtn'); await pg2.waitForTimeout(400);
  check(/Create your own wedding gallery/.test(await pg2.locator('.pgmenu').innerText()), 'the ☰ menu has "Create your own wedding gallery"');
  await pg2.close();

  // 5. PicGrades sees it in the admin queue
  call('requestCode', { email: 'adcmediaa@gmail.com' });
  const admin = call('verifyCode', { email: 'adcmediaa@gmail.com', code: codeOf('adcmediaa@gmail.com') }).token;
  const q = call('queue', { token: admin });
  const w = (q.weddings || []).find(x => x.title === 'Riya & Arjun');
  check(w && w.companyName === 'Riya Shah' && w.features.findme === 'on' && w.facesDue, 'admin queue lists the new wedding with a faces-due time');

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
