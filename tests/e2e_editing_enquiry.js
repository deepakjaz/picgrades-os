// Browser test (steps 65e + 66): editing requests.
//   · the dashboard card "Edit your photos" (human touch first; ₹8 / ₹7 / ₹3; first 150 free); "Get these edited" opens the form
//   · three choices — Human touch (our signature, 4 days) first, AI + Human (48 h, tone), AI (24 h, style profile)
//   · the free sample needs the permission box; a live estimate; the earliest date follows the choice
//   · the admin page lists it (NEW) with the choice, the free photos, the total and the permission
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
  await pg.waitForFunction(() => /free/.test(document.getElementById('freeHint').textContent));
  const card = await pg.locator('.editcard').innerText();
  check(/Edit your photos/.test(card) && /human touch/.test(card) && /₹8/.test(card) && /₹7/.test(card) && /₹3/.test(card) && /first 150 photos are free/.test(card), 'dashboard: "Edit your photos" — human touch first, ₹8 / ₹7 / ₹3, first 150 free');
  await shot(pg, '1-dash');
  await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await pg.waitForTimeout(300);
  check(await pg.evaluate(() => { const b = document.querySelector('.editcard .btn'), r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === b || b.contains(el); }), 'the bottom bar never covers "Ask for editing"');
  await pg.click('#weddings button:has-text("Get these edited")'); await pg.waitForTimeout(400);
  check(await pg.locator('#v-editing').isVisible() && await pg.inputValue('#edWed') === wed.galleryId, '"Get these edited" opens the form with Nina & Raj chosen');
  await pg.waitForSelector('#edOffers .offer');
  const offers = await pg.$$eval('#edOffers .offer', l => l.map(x => x.innerText.replace(/\s+/g, ' ')));
  check(offers.length === 3 && /^Human touch · our signature/.test(offers[0]) && /AI \+ Human/.test(offers[1]) && /^AI /.test(offers[2]) && await pg.isChecked('#edOffers input[value="human"]'), 'three choices, Human touch first and chosen');
  check(await pg.getAttribute('#edBy', 'min') === new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10) && !(await pg.isVisible('#edFreeBox')), 'Human touch: 4 days, no free sample');
  await pg.fill('#edCount', '650'); await pg.fill('#edFolder', 'https://drive.google.com/drive/folders/' + W);
  check(/650 photos × ₹8 = ₹5,200/.test(await pg.textContent('#edEstimate')), 'estimate: 650 × ₹8 = ₹5,200');
  await pg.click('#edOffers input[value="ai"]');
  check(await pg.isVisible('#edProfileBox') && await pg.getAttribute('#edBy', 'min') === new Date(Date.now() + 86400000).toISOString().slice(0, 10), 'AI: style profile appears, 24 hours');
  await pg.click('#edOffers input[value="aihuman"]');
  check(await pg.isVisible('#edFreeBox') && /650 photos − 150 free × ₹7 = ₹3,500/.test(await pg.textContent('#edEstimate')) && /tone/.test(await pg.textContent('#edNotesLabel')), 'AI + Human: tone field, 150 free → ₹3,500');
  await pg.click('#edBtn'); await pg.waitForTimeout(300);
  check(/tone and look/.test(await pg.textContent('#edErr')), 'AI + Human needs the tone');
  await pg.fill('#edNotes', 'Warm, natural skin tones'); await pg.click('#edBtn'); await pg.waitForTimeout(500);
  check(/permission/.test(await pg.textContent('#edErr')), 'the free sample needs the permission box');
  await pg.check('#edConsent');
  await shot(pg, '2-form');
  await pg.click('#edBtn'); await pg.waitForSelector('#edDone:not(.hidden)');
  const dn = await pg.locator('#edDone').innerText();
  check(/confirm within a day/.test(dn) && /AI \+ Human · 650 photos \(150 free\) · ₹3,500/.test(dn) && /48 hours/.test(dn), 'sent: AI + Human, 650 photos (150 free), ₹3,500, 48 hours');
  check(mail.some(m => m.to === 'team@picgrades.com' && /Editing request: AI \+ Human, 650 photos from Nina Kapoor/.test(m.subject)), 'PicGrades is emailed');
  await shot(pg, '3-sent'); await pg.context().close();

  pg = await open('/app/admin.html', admin, 1280); await pg.waitForTimeout(1500);
  await pg.click('nav.dock button[data-go="queue"]'); await pg.waitForSelector('#qEnq .qitem');
  const q = await pg.locator('#qEnq').innerText();
  check(/Nina Kapoor · AI \+ Human · 650 photos · 150 free · ₹3,500/.test(q) && /NEW/.test(q) && /Tone: “Warm, natural skin tones”/.test(q) && /wedding: Nina & Raj/.test(q) && /May use these edits/.test(q), 'admin: choice, free photos, total, tone, permission, NEW');
  check(/^mailto:nina%40example.com\?subject=/.test(await pg.getAttribute('#qEnq a:has-text("Reply by email")', 'href')), '"Reply by email" writes to her with a ready text');
  await shot(pg, '4-admin');
  await pg.click('#qEnq button:has-text("Mark replied")'); await pg.waitForTimeout(1200);
  check(/REPLIED/.test(await pg.locator('#qEnq').innerText()), 'Mark replied → REPLIED');
  await pg.context().close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
