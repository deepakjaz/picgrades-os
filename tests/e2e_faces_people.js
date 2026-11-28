// Browser test (step 73): people on the face-reading page.
//   · the reader joins the same person split by side poses (a second pass), but never two people who are in one photo together
//   · by hand: "Same person as…" joins two circles, a name is saved, a person is hidden, a wrong face is taken out, undo
//   · Find me: a guest whose selfie matches the joined person gets the side-pose photos too
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
const unit = () => { const v = Array.from({ length: 128 }, rnd); const n = Math.hypot(...v); return v.map(x => x / n); };
const add = (a, ...parts) => a.map((x, i) => parts.reduce((s, [v, k]) => s + v[i] * k, x));
const pack = v => Buffer.from(Int8Array.from(v.map(x => Math.max(-127, Math.min(127, Math.round(x * 250))))).buffer).toString('base64');
const BRIDE = unit().map(x => x * 0.4), GROOM = add(unit().map(x => x * 0.4), [unit(), 0.1]), BRO = add(GROOM, [unit(), 0.5]);
const bSide = unit(), gSide = unit();
const box = (x) => [x, 200, 160, 180];
const photos = {}, W = 'FACESPEOPLE00000073A0';
let n = 0; const ph = (...faces) => { const id = 'FP' + String(++n).padStart(2, '0'); photos[id] = faces.map((v, k) => [box(100 + k * 300), pack(add(v, [unit(), 0.1]))]); return id; };
const brideFront = [], brideSide = [], groomFront = [], groomSide = [], bro = [];
for (let i = 0; i < 6; i++) brideFront.push(ph(BRIDE));
for (let i = 0; i < 4; i++) brideSide.push(ph(add(BRIDE, [bSide, 0.5])));     // a side pose the reader can join on its own
for (let i = 0; i < 5; i++) groomFront.push(ph(GROOM));
for (let i = 0; i < 3; i++) groomSide.push(ph(add(GROOM, [gSide, 0.72])));    // too different: needs joining by hand
for (let i = 0; i < 3; i++) bro.push(ph(BRO, GROOM));                         // the brother, always next to the groom
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
Object.keys(photos).forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: W + 'w', mime: 'image/jpeg' });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan' }).galleryId;
const sf = {}; Object.keys(photos).forEach(id => sf[id] = { w: 1600, h: 1000, f: photos[id] });
call('saveFaces', { token: admin, g: gid, pass: 1, photos: sf, done: true });
global.__fetchBytes = id => fs.readFileSync(path.join(FX, files[(parseInt(String(id).replace(/\D/g, ''), 10) || 0) % files.length]));
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  const u = req.url.split('?')[0], f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : 'text/javascript'); res.end(d); } });
}).listen(0, async () => {
  const B = 'http://localhost:' + srv.address().port;
  const { chromium } = require('playwright');
  const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, nm) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, nm + '.png'), fullPage: false }); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(t => localStorage.setItem('pg_token', t), admin);
  const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
  await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(FX, files[0])) }));
  await pg.goto(B + '/app/faces.html?g=' + gid); await pg.waitForSelector('#peopleCard:not(.hidden)'); await pg.waitForTimeout(400);
  const circles = () => pg.evaluate(() => [...document.querySelectorAll('#people .person')].map(d => d.textContent));
  const groups = () => pg.evaluate(() => PEOPLE_FOR_TEST());
  await pg.evaluate(() => { window.PEOPLE_FOR_TEST = () => PGFaces.people(PGFaces.flatten(window.__F), window.__F.people, 2).map(p => p.photos.slice().sort().join(',')); });
  const refresh = () => pg.evaluate(async g => { const r = await fetch('/api', { method: 'POST', body: JSON.stringify({ action: 'facesStatus', token: localStorage.getItem('pg_token'), g }) }).then(r => r.json()); window.__F = r.faces; return r.faces.people || []; }, gid);
  await refresh();
  const sets = await groups(), has = list => sets.includes(list.slice().sort().join(','));
  check(has(brideFront.concat(brideSide)), 'the reader joins the bride\'s side-pose photos to her front photos on its own (10 photos, one circle)');
  check(has(groomFront.concat(bro)) && has(groomSide) && has(bro), 'the groom\'s very different side pose stays a separate circle; the brother stays apart from the groom (they are in one photo)');
  let c = await circles();
  check(c.length === 4 && /10 photos/.test(c[0]), '4 circles on the page: ' + c.join(' | '));
  await shot(pg, 'people-1');

  // join by hand: groom (8 photos incl. with brother) + groom side (3)
  const idx = async re => (await circles()).findIndex(t => re.test(t));
  await pg.locator('#people .person').nth(await idx(/^8 photos/)).click();
  check(await pg.isVisible('.pp') && await pg.locator('.pp-face').count() === 8, 'tap a circle: the person opens with their faces');
  await shot(pg, 'people-2-open');
  await pg.click('#ppJoin');
  check(await pg.isVisible('#joinBar'), '"Same person as…": the page asks to tap the other circle');
  await pg.locator('#people .person').nth(await idx(/^3 photos/)).click(); await pg.waitForTimeout(400);
  c = await circles();
  check(c.length === 3 && c.some(t => /^11 photos/.test(t)) && /Joined/.test(await pg.textContent('#peopleMsg')), 'joined: the groom is one circle of 11 photos (' + c.join(' | ') + ')');
  let saved = await refresh();
  check(saved.length === 1 && saved[0].faces.length === 11 && !saved[0].name, 'saved on the server: one person, 11 faces');

  // name
  await pg.locator('#people .person').nth(await idx(/^11 photos/)).click();
  await pg.fill('#ppName', 'Rohan'); await pg.click('#ppSave'); await pg.waitForTimeout(300);
  c = await circles();
  check(/^Rohan11 photos/.test(c[0]), 'the name shows under the circle, named people first: ' + c[0]);
  await shot(pg, 'people-3-named');
  // step 110: mark him as the groom — his photos fill the couple's spots in templates
  await pg.locator('#people .person').nth(0).click(); await pg.waitForSelector('#ppRole [data-role=groom]');
  check(await pg.evaluate(() => [...document.querySelectorAll('#ppRole [data-role]')].map(b => b.textContent).join() === 'Bride,Groom,Someone else'), 'a person card asks: This is Bride / Groom / Someone else');
  await pg.click('#ppRole [data-role=groom]'); await pg.waitForTimeout(400);
  check(call('getGallery', { g: gid }).gallery.couplePhotos.groom.length === 11, 'Groom: his 11 photos are kept for the couple\'s spots (ids only)');
  // hide the brother
  await pg.locator('#people .person').nth(await idx(/^3 photos/)).click(); await pg.click('#ppHide'); await pg.waitForTimeout(300);
  check((await circles()).length === 2 && /Hidden \(1\)/.test(await pg.textContent('#hiddenSum')), 'hide: the person moves to "Hidden (1)"');
  // take out a wrong face
  await pg.locator('#people .person').nth(0).click(); await pg.locator('.pp-face button').last().click(); await pg.waitForTimeout(300);
  await pg.click('#ppClose');
  check(/^Rohan10 photos/.test((await circles())[0]), 'tap × on a face: it is taken out (10 photos)');
  saved = await refresh();
  const rohan = saved.find(p => p.name === 'Rohan');
  check(rohan && rohan.out.length === 1 && saved.find(p => p.hide), 'the server keeps the name, the hidden person and the taken-out face');

  // Find me: a guest's front selfie now also gets the side-pose photos
  const j = call('guestJoin', { g: gid, name: 'Rohan K', phone: '9123456700', device: 'devpeople73', side: 'groom', attended: 'yes' });
  const r = call('findFaces', { g: gid, device: 'devpeople73', guestId: j.guestId, guestKey: j.guestKey, d: pack(add(GROOM, [unit(), 0.05])) });
  const outKey = rohan.out[0].split(':')[0];
  check(r.sure && groomSide.filter(id => id !== outKey).every(id => r.sure.includes(id)) && !r.sure.includes(outKey), 'Find me: the groom\'s selfie gets his side-pose photos too, not the face taken out (' + (r.sure || []).length + ' photos)');
  const j2 = call('guestJoin', { g: gid, name: 'Bro', phone: '9123456701', device: 'devpeople73b', side: 'groom', attended: 'yes' });
  const r2 = call('findFaces', { g: gid, device: 'devpeople73b', guestId: j2.guestId, guestKey: j2.guestKey, d: pack(add(BRO, [unit(), 0.05])) });
  check(!(r2.sure || []).some(id => groomSide.includes(id)), 'the brother\'s selfie does not get the groom\'s photos');
  check(!call('savePeople', { g: gid, people: [] }).ok && !call('savePeople', { token: admin, g: gid, people: [{ id: 'pzz1', name: 'x', faces: ['NOTINWEDDING:0'] }] }).ok, 'savePeople: login needed, only faces of this wedding');

  // undo
  await pg.locator('#people .person').nth(0).click(); await pg.click('#ppSplit'); await pg.waitForTimeout(300);
  check((await circles()).length === 3, 'undo my changes: back to how the reader grouped it');

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
