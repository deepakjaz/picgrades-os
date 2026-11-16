// Browser test (step 65e): human editing enquiry.
//   · the dashboard has "Need human editing?" (by hand, no AI, 4 days); a wedding card's "Get these edited" opens the form with it chosen
//   · the date can't be sooner than 4 days; sending saves it, emails PicGrades, shows "we will reply within a day"
//   · the admin page lists it (NEW) with Open photos / Reply by email / Mark replied
const http = require('http'); const fs = require('fs'); const path = require('path');
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
DB.Settings.push(['adminNotifyEmail', 'team@picgrades.com', 'test']);
const W = 'EDITINGE2EWEDDING065E'; DRIVE.folders[W] = { name: 'T', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 3; i++) DRIVE.files['EE' + i] = { name: i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
global.__fetchBytes = () => fs.readFileSync(path.join(FX, 'sample1.jpg'));
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
call('signUp', { email: 'nina@example.com', name: 'Nina Kapoor', kind: 'couple' });
const tok = call('verifyCode', { email: 'nina@example.com', code: codeOf('nina@example.com') }).token;
const wed = call('createWedding', { token: tok, folderUrl: W, title: 'Nina & Raj' });
call('requestCode', { email: 'adcmediaa@gmail.com' });
const admin = call('verifyCode', { email: 'adcmediaa@gmail.com', code: codeOf('adcmediaa@gmail.com') }).token;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html'; if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8877, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
  async function open(url, t, w) {
    const ctx = await b.newContext({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: !w, hasTouch: !w });
    await ctx.addInitScript(t => localStorage.setItem('pg_token', t), t);
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://localhost:8877' + url); await pg.waitForTimeout(1300); return pg;
  }
  let pg = await open('/app/', tok);
  const card = await pg.locator('.editcard').innerText();
  check(/Need human editing\?/.test(card) && /no AI fast editing/.test(card) && /4 days/.test(card), 'dashboard: "Need human editing?" — by hand, no AI, 4 days');
  await shot(pg, '1-dash');
  await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await pg.waitForTimeout(300);
  check(await pg.evaluate(() => { const b = document.querySelector('.editcard .btn'), r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === b || b.contains(el); }), 'the bottom bar never covers "Ask for editing"');
  await pg.click('#weddings button:has-text("Get these edited")'); await pg.waitForTimeout(400);
  check(await pg.locator('#v-editing').isVisible() && await pg.inputValue('#edWed') === wed.galleryId, '"Get these edited" opens the form with Nina & Raj chosen');
  const min = await pg.getAttribute('#edBy', 'min');
  check(min === new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10), 'the date can\'t be sooner than 4 days (' + min + ')');
  await pg.fill('#edCount', '650'); await pg.fill('#edFolder', 'https://drive.google.com/drive/folders/' + W); await pg.fill('#edNotes', 'Warm, natural skin tones');
  await shot(pg, '2-form');
  await pg.click('#edBtn'); await pg.waitForSelector('#edDone:not(.hidden)');
  check(/reply within a day/.test(await pg.locator('#edDone').innerText()) && /650 photos/.test(await pg.locator('#edDone').innerText()), 'sent: "we will reply within a day" for 650 photos');
  check(mail.some(m => m.to === 'team@picgrades.com' && /Editing enquiry: 650 photos from Nina Kapoor/.test(m.subject)), 'PicGrades is emailed');
  await shot(pg, '3-sent'); await pg.context().close();

  pg = await open('/app/admin.html', admin, 1280); await pg.waitForTimeout(1500);
  await pg.click('nav.dock button[data-go="queue"]'); await pg.waitForSelector('#qEnq .qitem');
  const q = await pg.locator('#qEnq').innerText();
  check(/Nina Kapoor · 650 photos/.test(q) && /NEW/.test(q) && /Warm, natural skin tones/.test(q) && /wedding: Nina & Raj/.test(q), 'admin: the enquiry with photos, wedding and notes, marked NEW');
  check(/^mailto:nina%40example.com\?subject=/.test(await pg.getAttribute('#qEnq a:has-text("Reply by email")', 'href')), '"Reply by email" writes to her with a ready text');
  await shot(pg, '4-admin');
  await pg.click('#qEnq button:has-text("Mark replied")'); await pg.waitForTimeout(1200);
  check(/REPLIED/.test(await pg.locator('#qEnq').innerText()), 'Mark replied → REPLIED');
  await pg.context().close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
