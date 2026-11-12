// Browser test (step 60): strict Find me for guests. Camera only (no "Choose a photo"); a live check (turn the head to one side,
// the other, then look straight) before "Take selfie"; a flat photo held up to the camera never passes; a close match shows no photos
// and asks for an email; the couple sees it as "Find me · close match" in Requests. The couple can still choose a photo.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
const unit = () => { const v = Array.from({ length: 128 }, rnd); const n = Math.hypot(...v); return v.map(x => x / n); };
const add = (a, v, k) => a.map((x, i) => x + v[i] * k);
const pack = v => Buffer.from(Int8Array.from(v.map(x => Math.max(-127, Math.min(127, Math.round(x * 250))))).buffer).toString('base64');
const NIKHIL = unit().map(x => x * 0.9), d1 = unit(), d2 = unit();
const W = 'STRICTBROWSER0000060X';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 12; i++) DRIVE.files['SF' + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const sf = {}; for (let i = 0; i < 12; i++) sf['SF' + String(i).padStart(2, '0')] = { w: 100, h: 100, f: [[[0.1, 0.1, 0.2, 0.2], pack(add(unit(), d2, 0.1))]] };
sf.SF03.f = [[[0.1, 0.1, 0.2, 0.2], pack(add(NIKHIL, d1, 0.25))]]; sf.SF07.f = [[[0.1, 0.1, 0.2, 0.2], pack(add(NIKHIL, d2, 0.28))]];   // Nikhil is in 2 photos
call('saveFaces', { token: admin, g: gid, pass: 1, photos: sf, done: true });
const nik = call('guestJoin', { g: gid, name: 'Nikhil Shah', phone: '9123456780', device: 'devbrowser01' });
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8863, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  // a fake camera and a scripted face: window.__yaw is where the head points; the selfie's face code is Nikhil's
  const open = async (q, guest) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => { const pid = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(pid) }); });
    await pg.addInitScript(([gid, guest, me]) => {
      if (guest) localStorage.setItem('pg_guest_' + gid, JSON.stringify(guest));
      localStorage.setItem('pg_storyq_' + gid, '1');
      navigator.mediaDevices.getUserMedia = async () => { const c = document.createElement('canvas'); c.width = 640; c.height = 480; const x = c.getContext('2d'); setInterval(() => { x.fillStyle = '#' + Math.floor(Math.random() * 999); x.fillRect(0, 0, 640, 480); }, 100); return c.captureStream(10); };
      window.__yaw = 0; window.__poses = 0;
      const desc = Float32Array.from(me);
      const box = { x: 220, y: 120, width: 220, height: 240 };
      window.PGFaces = { load: () => Promise.resolve('cpu'), locate: () => Promise.resolve([{ box }]), pose: () => { window.__poses++; return Promise.resolve({ box, score: 0.99, yaw: window.__yaw }); },
        detect: () => Promise.resolve([{ box, score: 0.99, descriptor: desc }]),
        pack: d => { const b8 = new Int8Array(128); for (let i = 0; i < 128; i++) b8[i] = Math.max(-127, Math.min(127, Math.round(d[i] * 250))); return btoa(String.fromCharCode(...new Uint8Array(b8.buffer))); } };
    }, [gid, guest, add(NIKHIL, d1, 0.04)]);
    await pg.goto('http://localhost:8863/g/' + gid + q); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(600);
    return { ctx, pg };
  };
  const g = { guestId: nik.guestId, guestKey: nik.guestKey, name: nik.name };
  const { ctx, pg } = await open('', g);
  await pg.evaluate(() => document.querySelector('[data-findme]').click()); await pg.waitForSelector('#fmSheet.show');
  check(await pg.evaluate(() => document.getElementById('fmFile').closest('label').classList.contains('hidden') && !document.getElementById('fmCamBtn').hidden), 'guest: only "Use camera", no "Choose a photo"');
  await pg.click('#fmCamBtn'); await pg.waitForSelector('#fmGuide:not(.hidden)');
  const gd = await pg.evaluate(() => { const g = document.getElementById('fmGuide'); return { t: g.textContent, h: parseFloat(getComputedStyle(g.querySelector('h4')).fontSize), face: !!g.querySelector('.fm-guide-face'), cam: !document.getElementById('fmCam').classList.contains('hidden') }; });
  check(/Please follow the instructions/.test(gd.t) && /RIGHT/.test(gd.t) && /LEFT/.test(gd.t) && /CENTRE/.test(gd.t) && gd.face && gd.h >= 20 && !gd.cam, 'guest: big instructions with a moving face first (right, left, centre), camera not on yet');
  await pg.screenshot({ path: '/tmp/s60c_guide.png' });
  await pg.click('#fmGuideOk'); await pg.waitForSelector('#fmCam:not(.hidden)'); await pg.waitForTimeout(700);
  const st = () => pg.evaluate(() => ({ live: document.getElementById('fmSheet').dataset.live, hint: document.getElementById('fmHint').textContent, size: parseFloat(getComputedStyle(document.getElementById('fmHint')).fontSize), shootShown: !document.getElementById('fmShoot').classList.contains('hidden'), done: [...document.querySelectorAll('#fmSteps .done')].map(x => x.dataset.s).join(), beeps: window.__beeps || 0 }));
  let s = await st();
  check(s.live === 'turn' && /RIGHT/.test(s.hint) && s.size >= 17 && !s.shootShown && s.done === '', 'camera: big words "Turn your head to the RIGHT", no button to press (' + s.hint + ', ' + s.size + 'px)');
  await pg.screenshot({ path: '/tmp/s60c_right.png' });
  for (const y of [0.02, -0.04, 0.05, -0.03, 0.04]) { await pg.evaluate(y => { window.__yaw = y; }, y); await pg.waitForTimeout(230); }
  s = await st(); check(s.done === '' && s.beeps === 0, 'a photo held up (no real turn) gets no tick and no beep');
  await pg.evaluate(() => { window.__yaw = -0.2; }); await pg.waitForTimeout(450);
  s = await st(); check(s.done === 'right' && /LEFT/.test(s.hint) && s.beeps === 1, 'turned right: beep, Right ✓, now "turn to the LEFT"');
  await pg.screenshot({ path: '/tmp/s60c_left.png' });
  await pg.evaluate(() => { window.__yaw = 0.19; }); await pg.waitForTimeout(450);
  s = await st(); check(s.done === 'right,left' && /CENTRE/.test(s.hint) && s.beeps === 2, 'turned left: beep, Left ✓, now "look at the CENTRE"');
  await pg.evaluate(() => { window.__yaw = 0.01; }); await pg.waitForFunction(() => /Well done/.test(document.getElementById('fmHint').textContent), null, { timeout: 4000 }).catch(() => {});
  s = await st(); await pg.screenshot({ path: '/tmp/s60c_done.png' }); check(/Well done/.test(s.hint) && s.beeps >= 4, 'looking at the centre: double beep, "Well done", the selfie is taken by itself');
  await pg.waitForSelector('#fmAsk:not(.hidden)', { timeout: 8000 });
  const ask = await pg.evaluate(() => ({ text: document.getElementById('fmAsk').textContent, thumbs: document.querySelectorAll('#fmThumbs img').length, res: !document.getElementById('fmResult').classList.contains('hidden'), personal: (GALLERY.personal || []).length }));
  check(/close match/.test(ask.text) && /fewer than 3/.test(ask.text) && !ask.res && ask.thumbs === 0 && ask.personal === 0, 'only 2 photos: "You are a close match", no photos shown');
  await pg.fill('#fmAskEmail', 'nikhil@example.com'); await pg.click('#fmAskSend'); await pg.waitForSelector('#fmAskDone:not(.hidden)');
  await pg.screenshot({ path: '/tmp/s60_close.png' });
  check(/Request sent/.test(await pg.textContent('#fmAskDone')), 'the email is sent to the couple for approval');
  await ctx.close();
  // a guest who is not in the photos: nothing to save or make, only "Try another selfie" (step 60b)
  {
    const r2 = call('guestJoin', { g: gid, name: 'Stranger', phone: '9111111111', device: 'devbrowser02' });
    const s2 = await open('', { guestId: r2.guestId, guestKey: r2.guestKey, name: 'Stranger' });
    await s2.pg.evaluate(() => { const d = new Float32Array(128); for (let i = 0; i < 128; i++) d[i] = ((i * 37) % 23 - 11) / 120; window.PGFaces.detect = () => Promise.resolve([{ box: { x: 220, y: 120, width: 220, height: 240 }, descriptor: d }]); });
    await s2.pg.evaluate(() => document.querySelector('[data-findme]').click()); await s2.pg.waitForSelector('#fmSheet.show');
    await s2.pg.click('#fmCamBtn'); await s2.pg.click('#fmGuideOk'); await s2.pg.waitForSelector('#fmCam:not(.hidden)'); await s2.pg.waitForTimeout(500);
    for (const y of [-0.2, 0.2, 0]) { await s2.pg.evaluate(y => { window.__yaw = y; }, y); await s2.pg.waitForTimeout(450); }
    await s2.pg.waitForSelector('#fmResult:not(.hidden)', { timeout: 8000 });
    const v = await s2.pg.evaluate(() => { const vis = id => !document.getElementById(id).classList.contains('hidden'); return { open: vis('fmOpen'), save: vis('fmSave'), reel: vis('fmReel'), post: vis('fmPost'), again: document.getElementById('fmAgain').textContent, st: document.getElementById('fmStatus').textContent, hubReel: !!document.querySelector('#pgLay > section[data-block=reel]'), can: PGCreate.can() }; });
    check(!v.open && !v.save && !v.reel && !v.post && v.again === 'Try another selfie' && /could not find you/.test(v.st), 'nobody found: no Save / Make a reel / album, only "Try another selfie" ' + JSON.stringify(v));
    check(!v.can && !v.hubReel, 'nobody found: Reel and Post Edits stay hidden on the Hub');
    check(await s2.pg.evaluate(() => !document.getElementById('fmAsk') || document.getElementById('fmAsk').classList.contains('hidden')), 'first miss: no request yet, only "Try another selfie"');
    await s2.pg.screenshot({ path: '/tmp/s60b_none.png' });
    // second miss (step 60d): the guest may ask the couple or the photographer
    await s2.pg.click('#fmAgain'); await s2.pg.click('#fmCamBtn'); await s2.pg.click('#fmGuideOk'); await s2.pg.waitForSelector('#fmCam:not(.hidden)'); await s2.pg.waitForTimeout(500);
    for (const y of [-0.2, 0.2, 0]) { await s2.pg.evaluate(y => { window.__yaw = y; }, y); await s2.pg.waitForTimeout(450); }
    await s2.pg.waitForSelector('#fmAsk:not(.hidden)', { timeout: 8000 });
    const hb = await s2.pg.textContent('#fmAsk');
    check(/Ask the couple or the photographer/.test(hb) && /after 2 tries/.test(hb), 'second miss: "Ask the couple or the photographer" with an email box');
    await s2.pg.fill('#fmAskEmail', 'stranger@example.com'); await s2.pg.click('#fmAskSend'); await s2.pg.waitForSelector('#fmAskDone:not(.hidden)');
    check(/couple or the photographer will email you/.test(await s2.pg.textContent('#fmAskDone')), 'request sent: "the couple or the photographer will email you"');
    await s2.pg.screenshot({ path: '/tmp/s60d_ask.png' });
    await s2.ctx.close();
  }
  // the couple: "Choose a photo" stays, no live check; the close-match request is in Requests
  const c = await open('?couple=' + ck, null);
  await c.pg.evaluate(() => document.querySelector('[data-findme]').click()); await c.pg.waitForSelector('#fmSheet.show');
  check(await c.pg.evaluate(() => !document.getElementById('fmFile').closest('label').classList.contains('hidden')), 'the couple can still choose a photo');
  await c.pg.click('#fmCamBtn'); await c.pg.waitForSelector('#fmCam:not(.hidden)'); await c.pg.waitForTimeout(700);
  check(await c.pg.evaluate(() => !document.getElementById('fmShoot').disabled && !document.getElementById('fmSheet').dataset.live && !document.getElementById('fmGuide')), 'the couple: no instructions, no live check, "Take selfie" as before');
  await c.pg.click('#fmClose');
  await c.pg.evaluate(() => PGControl.open()); await c.pg.click('.pgcp-tabs [data-tab=requests]'); await c.pg.waitForSelector('.pgr-row');
  const help = await c.pg.evaluate(() => { const r = [...document.querySelectorAll('.pgr-row')].find(x => /not found/.test(x.textContent)); return r ? { t: r.textContent, mail: (r.querySelector('.pgr-mail') || {}).href || '', yes: !!r.querySelector('.pgr-yes') } : null; });
  check(help && /Stranger/.test(help.t) && /asks for their photos/.test(help.t) && /^mailto:stranger%40example\.com|^mailto:stranger@example\.com/.test(help.mail) && !help.yes, 'Requests: "Find me · not found" with "Email them" and "Done" (no Approve)');
  const row = await c.pg.evaluate(() => [...document.querySelectorAll('.pgr-row')].find(x => /close match/.test(x.textContent)).textContent);
  check(/Find me · close match/.test(row) && /Nikhil/.test(row) && /2 photos found of them/.test(row), 'Requests shows "Find me · close match" for Nikhil (' + row.replace(/\s+/g, ' ').slice(0, 90) + ')');
  await c.pg.screenshot({ path: '/tmp/s60_requests.png' });
  await c.pg.locator('.pgr-row', { hasText: 'close match' }).locator('.pgr-yes').click(); await c.pg.waitForTimeout(600);
  check(call('myFind', { g: gid, guestId: nik.guestId, guestKey: nik.guestKey }).found.sure.length === 2, 'approved: Nikhil\'s number now has his 2 photos');
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
