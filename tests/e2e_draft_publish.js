// Browser test (step 62b): Draft and Publish.
//   · a new wedding is a Draft: the guest link shows "Your photos are being prepared", no photos
//   · the couple link and the staff links open the Draft; a note says guests can't see it yet
//   · the Control Panel has a Draft / Live strip with a checklist and Publish; Unpublish needs a second tap
//   · after Publish the guest link opens; after Unpublish a guest's kept copy is replaced by the "being prepared" page
//   · a staff link without a sign-in on a Draft offers Sign in; the order page says Draft and has Publish
const http = require('http'); const fs = require('fs'); const path = require('path');
global.__autoPublish = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'DRAFTPUBLISHE2E00062B';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['DP' + String(i).padStart(2, '0')] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const order = call('queue', { token: admin }).recentDone[0];
const made = call('setGallery', { token: admin, orderId: order.orderId, folderUrl: W, title: 'Riya & Arjun' }), gid = made.galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const company = DB.Galleries.slice(1).find(x => x.includes(gid))[DB.Galleries[0].indexOf('companyName')];
const owner = DB.Users.slice(1).find(u => u[2] === company && u[3] === 'client');
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html'; if (u.endsWith('/')) u += 'index.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8867, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS;
  const shot = async (pg, name) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const newCtx = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); return ctx; };
  async function open(ctx, url, store) {
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message));
    await pg.route('**fonts.g**', r => r.abort());
    if (store) await pg.addInitScript(s => { Object.keys(s).forEach(k => { if (!localStorage.getItem('pg_seeded_' + k)) { localStorage.setItem(k, s[k]); localStorage.setItem('pg_seeded_' + k, '1'); } }); }, store);
    await pg.goto('http://localhost:8867' + url); await pg.waitForTimeout(1500);
    return pg;
  }
  const state = pg => pg.evaluate(() => ({
    draft: !!document.getElementById('pgDraft'), text: (document.getElementById('pgDraft') || {}).innerText || '',
    boot: !!document.querySelector('#pgBoot:not(.hide)'), status: typeof GALLERY !== 'undefined' && GALLERY ? GALLERY.status : null,
    photos: document.querySelectorAll('img[src*="googleusercontent"],img[src*="drive.google"]').length,
    bar: (document.getElementById('pgLinkBar') || {}).innerText || ''
  }));

  // 1. the guest link on a Draft
  const gctx = await newCtx(); let pg = await open(gctx, '/g/' + gid), s = await state(pg);
  check(s.draft && /being prepared/.test(s.text) && /Riya & Arjun/i.test(s.text), 'guest link on a Draft: "Your photos are being prepared" with the couple names');
  check(!s.boot && s.status === null, 'guest link on a Draft: no gallery is loaded ' + JSON.stringify({ boot: s.boot, status: s.status }));
  check(!/Sign in/.test(s.text), 'guest link: no sign-in offer');
  await shot(pg, '1-guest-draft'); await pg.close();

  // 2. the couple link opens the Draft, with the note and the Publish strip
  const cctx = await newCtx(); pg = await open(cctx, '/c/' + gid + '/' + ck); s = await state(pg);
  check(!s.draft && s.status === 'Draft', 'couple link opens the Draft ' + JSON.stringify({ draft: s.draft, status: s.status }));
  check(/Draft/.test(s.bar) && /guests can’t see this yet/.test(s.bar) && await pg.evaluate(() => !document.body.classList.contains('pg-badge-gone')), 'couple sees "Draft · guests can’t see this yet": ' + s.bar);
  await shot(pg, '2-couple-draft-note');
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(400);
  let p = await pg.evaluate(() => { const w = document.querySelector('.pgcp-sheet .pgpub'); return w && { cls: w.className, txt: w.innerText, btn: (w.querySelector('.pgpub-btn') || {}).textContent, items: w.querySelectorAll('.pgpub-list li').length }; });
  check(p && /draft/.test(p.cls) && p.btn === 'Publish' && p.items >= 3, 'Control Panel: Draft strip, checklist and Publish ' + JSON.stringify(p));
  check(p && /6 photos are in/.test(p.txt) && /1 event found/.test(p.txt), 'checklist counts photos and events');
  await shot(pg, '3-panel-draft');
  await pg.click('.pgpub-btn'); await pg.waitForTimeout(800);
  p = await pg.evaluate(() => { const w = document.querySelector('.pgcp-sheet .pgpub'); return { cls: w.className, btn: w.querySelector('.pgpub-btn').textContent, status: GALLERY.status, bar: (document.getElementById('pgLinkBar') || {}).innerText || '' }; });
  check(/live/.test(p.cls) && p.btn === 'Unpublish' && p.status === 'Published', 'the couple taps Publish → Live ' + JSON.stringify(p));
  check(!/Draft/.test(p.bar), 'the Draft note goes away');
  await shot(pg, '4-panel-live'); await pg.close();

  // 3. guests can open it now (and the phone keeps a copy)
  pg = await open(gctx, '/g/' + gid); s = await state(pg);
  check(!s.draft && s.status === 'Published', 'after Publish the guest link opens the wedding ' + JSON.stringify({ draft: s.draft, status: s.status }));
  await shot(pg, '5-guest-live'); await pg.close();

  // 4. PicGrades unpublishes (two taps)
  const sctx = await newCtx(); pg = await open(sctx, '/pg/' + gid, { pg_token: admin }); await pg.waitForTimeout(600);
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(400);
  await pg.click('.pgpub-btn'); await pg.waitForTimeout(300);
  check(await pg.evaluate(() => GALLERY.status) === 'Published', 'one tap on Unpublish only asks to confirm');
  await pg.click('.pgpub-btn'); await pg.waitForTimeout(800);
  check(await pg.evaluate(() => GALLERY.status) === 'Draft', 'second tap → back to Draft');
  await pg.close();

  // 5. the guest who had a kept copy now sees the "being prepared" page
  pg = await open(gctx, '/g/' + gid); await pg.waitForTimeout(500); s = await state(pg);
  check(s.draft, 'a guest with a kept copy: replaced by the "being prepared" page');
  check(await pg.evaluate(() => !localStorage.getItem('pg_gal_' + GALLERY_ID)), 'the kept copy is removed from the phone');
  await pg.close();

  // 6. a staff link without a sign-in on a Draft: Sign in
  const nctx = await newCtx(); pg = await open(nctx, '/ph/' + gid); s = await state(pg);
  check(s.draft && /Sign in/.test(s.text), 'photographer link without sign-in: "being prepared" with Sign in');
  await pg.click('#pgDraftIn'); await pg.waitForTimeout(400);
  check(await pg.evaluate(() => !!document.querySelector('#pgSignIn.show')), 'Sign in opens the email-code sheet');
  await shot(pg, '6-staff-signin'); await pg.close();

  // 7. the order page says Draft and can publish
  if (owner) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const op = await ctx.newPage(); op.on('pageerror', e => errors.push(e.message));
    await op.route('**fonts.g**', r => r.abort());
    await op.goto('http://localhost:8867/app/'); await op.fill('#email', owner[0]); await op.click('#loginBtn'); await op.waitForSelector('#step2:not(.hidden)');
    await op.fill('#code', /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]); await op.click('#loginBtn'); await op.waitForSelector('#v-dash:not(.hidden)');
    const box = op.locator('details', { hasText: 'Draft (guests can’t open it yet)' }).first();
    check(await box.count() === 1, 'order page: "Wedding gallery · Draft"');
    await box.locator('summary').click(); await box.locator('button', { hasText: 'Publish to guests' }).click(); await op.waitForTimeout(900);
    check(await op.locator('details', { hasText: 'Wedding gallery is live' }).count() === 1, 'order page: Publish → "Wedding gallery is live"');
    await ctx.close();
  } else check(false, 'no studio owner found for the order page check');

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
