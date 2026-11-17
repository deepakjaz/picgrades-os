// Browser test (step 67): the wedding's own address and own domain, and the photographer-only editing extras.
//   · the wedding card shows its address (couple's names first) and can change it
//   · Own domain: locked until paid; after "Mark paid" the couple asks for their domain and sees the records to add
//   · admin page: Own domains card → Mark live; the address then opens the wedding (/app/w.html?host=…)
//   · photographers see Culling, Culling + Colour Correction and Retouching with live prices; couples don't
const http = require('http'); const fs = require('fs'); const path = require('path');
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
DB.Settings.push(['adminNotifyEmail', 'team@picgrades.com', 'test']);
const W = 'DOMAINSE2EWEDDING0067'; DRIVE.folders[W] = { name: 'T', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 3; i++) DRIVE.files['DE' + i] = { name: i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
global.__fetchBytes = () => fs.readFileSync(path.join(FX, 'sample1.jpg'));
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
const login = (email, kind, studio) => { call('signUp', { email, name: email.split('@')[0].replace(/^./, c => c.toUpperCase()), kind, studio }); return call('verifyCode', { email, code: codeOf(email) }).token; };
const tok = login('nina@example.com', 'couple');
const wed = call('createWedding', { token: tok, folderUrl: W, title: 'Nina & Raj' });
const ptok = login('ravi@example.com', 'photographer', 'Ravi Studio');
call('createWedding', { token: ptok, folderUrl: W, title: 'Meera and Kabir' });
call('requestCode', { email: 'adcmediaa@gmail.com' });
const admin = call('verifyCode', { email: 'adcmediaa@gmail.com', code: codeOf('adcmediaa@gmail.com') }).token;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html'; if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8878, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
  async function open(url, t, w) {
    const ctx = await b.newContext({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: !w, hasTouch: !w });
    if (t) await ctx.addInitScript(t => localStorage.setItem('pg_token', t), t);
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://localhost:8878' + url); await pg.waitForTimeout(1300); return pg;
  }
  // ---- couple: address on the card, change it, own domain locked ----
  let pg = await open('/app/', tok);
  await pg.waitForSelector('#weddings .waddr');
  check(/nina-raj\.picgrades\.in · your address, coming soon/.test(await pg.locator('#weddings .waddr').innerText()), 'wedding card: nina-raj.picgrades.in (couple’s names first), coming soon');
  await pg.click('#weddings .waddr button:has-text("Change")');
  await pg.fill('#weddings .waddr input', 'Nina Raj 2026'); await pg.waitForTimeout(100);
  check(await pg.inputValue('#weddings .waddr input') === 'nina-raj-2026', 'typing is cleaned to small letters and dashes');
  await pg.click('#weddings .waddr button:has-text("Save")'); await pg.waitForTimeout(500);
  check(/nina-raj-2026\.picgrades\.in/.test(await pg.locator('#weddings .waddr').innerText()), 'address changed to nina-raj-2026.picgrades.in');
  await shot(pg, '1-card');
  await pg.click('#weddings button:has-text("Own domain")'); await pg.waitForTimeout(300);
  check(await pg.isVisible('#dmLocked') && /comes with the paid plan/.test(await pg.textContent('#dmLocked')) && !(await pg.isVisible('#dmForm')), 'on the free trial, Own domain says it comes with the paid plan');
  await shot(pg, '2-locked'); await pg.context().close();

  // ---- PicGrades marks it paid ----
  pg = await open('/app/admin.html', admin, 1280); await pg.waitForTimeout(1500);
  await pg.click('nav.dock button[data-go="queue"]'); await pg.waitForSelector('#qWed .qitem');
  await pg.click('#qWed .qitem:has-text("Nina & Raj") button:has-text("Mark paid")'); await pg.waitForTimeout(1200);
  check(/Paid ✓/.test(await pg.locator('#qWed .qitem:has-text("Nina & Raj")').innerText()), 'admin: Mark paid → Paid ✓');
  await pg.context().close();

  // ---- couple asks for their own domain ----
  pg = await open('/app/', tok);
  await pg.waitForSelector('#weddings .waddr');
  await pg.click('#weddings button:has-text("Own domain")'); await pg.waitForTimeout(300);
  check(await pg.isVisible('#dmForm') && /Free to connect/.test(await pg.textContent('#dmPrice')) && !(await pg.isVisible('#dmStudioBox')), 'paid: the form shows; couples don’t see "all my weddings"');
  await pg.click('#dmForm input[value="buy"]');
  check(/domain costs \+ ₹100 a year/.test(await pg.textContent('#dmPrice')) && /renewal price/.test(await pg.textContent('#dmPrice')), 'Buy one for me: domain price + ₹100 a year, renewal price told first');
  await pg.click('#dmForm input[value="own"]');
  await pg.fill('#dmHost', 'NinaAndRaj.com'); await shot(pg, '3-domain-form');
  await pg.click('#dmBtn'); await pg.waitForSelector('#dmDone:not(.hidden)');
  const dn = await pg.locator('#dmDone').innerText();
  check(/ninaandraj\.com/.test(dn) && /76\.76\.21\.21/.test(dn) && /cname\.vercel-dns\.com/.test(dn), 'sent: shows the A and www records to add');
  await shot(pg, '4-domain-sent'); await pg.context().close();

  // ---- admin marks it live; the address opens the wedding ----
  pg = await open('/app/admin.html', admin, 1280); await pg.waitForTimeout(1500);
  await pg.click('nav.dock button[data-go="queue"]'); await pg.waitForSelector('#qDom .qitem');
  check(/ninaandraj\.com · they have it · one wedding/.test(await pg.locator('#qDom').innerText()) && /NEW/.test(await pg.locator('#qDom').innerText()), 'admin: Own domains lists ninaandraj.com, NEW');
  await shot(pg, '5-admin-domains');
  await pg.click('#qDom button:has-text("Mark live")'); await pg.waitForTimeout(1200);
  check(/LIVE/.test(await pg.locator('#qDom').innerText()), 'Mark live → LIVE');
  await pg.context().close();
  pg = await open('/app/w.html?host=www.ninaandraj.com');
  await pg.waitForURL(/\/g\//, { timeout: 8000 }).catch(() => {});
  check(pg.url().indexOf('/g/' + wed.galleryId) > -1, 'www.ninaandraj.com opens the wedding');
  await pg.context().close();
  pg = await open('/app/w.html?host=nobody.picgrades.in'); await pg.waitForTimeout(500);
  check(/not set up/.test(await pg.textContent('#wMsg')), 'an unknown address says it is not set up');
  await pg.context().close();

  // ---- photographer: editing extras ----
  pg = await open('/app/', ptok);
  await pg.waitForSelector('#weddings .waddr');
  await pg.click('#weddings button:has-text("Get these edited")'); await pg.waitForSelector('#edOffers .offer');
  const offers = await pg.$$eval('#edOffers .offer', l => l.map(x => x.innerText.replace(/\s+/g, ' ')));
  check(offers.length === 7 && /For photographers/.test(await pg.textContent('#edOffers')) && /^Culling .*₹0\.80 a photo/.test(offers[4]) && /^Culling \+ Colour Correction/.test(offers[5]) && /^Retouching .*from ₹120/.test(offers[6]), 'photographer: Culling ₹0.80, Culling + Colour Correction, Retouching from ₹120');
  await pg.click('#edOffers input[value="retouch"]'); await pg.fill('#edCount', '10');
  for (const k of ['acne', 'spots', 'teeth']) await pg.check('#edFixes input[value="' + k + '"]');
  check(/10 photos × ₹120 = ₹1,200/.test(await pg.textContent('#edEstimate')), 'retouching 3 fixes: 10 × ₹120 = ₹1,200');
  await pg.check('#edFixes input[value="body"]');
  check(/10 photos × ₹200 \(₹120 \+ 2 × ₹40\) = ₹2,000/.test(await pg.textContent('#edEstimate')), 'add body shaping (heavy = 2): ₹200 an image → ₹2,000');
  await shot(pg, '6-retouch');
  await pg.fill('#edFolder', 'https://drive.google.com/drive/folders/' + W);
  await pg.click('#edBtn'); await pg.waitForSelector('#edDone:not(.hidden)');
  check(/₹2,000/.test(await pg.locator('#edDone').innerText()), 'retouching request sent, ₹2,000');
  await pg.click('#edDone button'); await pg.waitForTimeout(300);
  await pg.click('#weddings button:has-text("Get these edited")'); await pg.waitForSelector('#edOffers .offer');
  await pg.click('#edOffers input[value="cullcc"]');
  check(await pg.isVisible('#edKeepBox') && await pg.isVisible('#edEditKindBox') && /catalog/.test(await pg.textContent('#edCountLabel')), 'combo: asks the catalog size, how many to keep, and the editing');
  await pg.fill('#edCount', '1000'); await pg.fill('#edKeep', '400'); await pg.selectOption('#edEditKind', 'aihuman');
  check(/1000 × ₹0\.70 culling \+ 400 kept × ₹7 \(AI \+ Human\) = ₹3,500/.test(await pg.textContent('#edEstimate')), 'combo estimate: 1000 × ₹0.70 + 400 × ₹7 = ₹3,500');
  await shot(pg, '7-combo'); await pg.context().close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
