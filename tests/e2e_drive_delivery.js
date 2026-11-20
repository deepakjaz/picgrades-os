// Browser test: a 'drive' delivery gallery (folder shared "anyone with the link") — every photo the page shows comes straight from
// Google (lh3.googleusercontent.com), none from the relay or /photo-unavailable; a Moments guest post keeps its relay link; no page errors.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'DRIVEDELIVERYE2E00001';
DRIVE.folders[W] = { name: 'Oshin Vedant teaser', access: 'ANYONE_WITH_LINK' };
const all = [];
for (let i = 0; i < 104; i++) { const id = 'DDE2EPHOTO' + String(i).padStart(10, '0'); all.push(id); DRIVE.files[id] = { name: String(i).padStart(3, '0') + '.jpg', parent: W, mime: 'image/jpeg', access: 'ANYONE_WITH_LINK' }; }
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Oshin & Vedant' }).galleryId;
{ const t = DB.Galleries, hd = t[0], r = t.slice(1).find(x => x[hd.indexOf('galleryId')] === gid); r[hd.indexOf('delivery')] = 'drive'; }
if (!DB.GuestPosts) DB.GuestPosts = [['at', 'galleryId', 'postId', 'guestId', 'name', 'phone', 'caption', 'fileId', 'mime', 'type', 'status', 'reviewedAt']];
{ const gh = DB.GuestPosts[0]; DB.GuestPosts.push(gh.map(h => ({ at: '2026-11-21 04:00', galleryId: gid, postId: 'pst_e2edrive1', name: 'Guest', fileId: 'DDE2EGUESTPOST000001', mime: 'image/jpeg', type: 'photo', status: 'approved' })[h] || '')); }
const img = id => fs.readFileSync(path.join(FX, files[(parseInt(String(id).replace(/\D/g, ''), 10) || 0) % files.length]));
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8871, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(g => localStorage.setItem('pg_welcome_' + g, '{"side":"bride","attended":"yes"}'), gid);
  const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
  const seen = { drive: new Set(), relay: 0, unavailable: 0 };
  await pg.route('**fonts.g**', r => r.abort());
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (/\/d\/([^=]+)/.exec(r.request().url()) || [])[1]; seen.drive.add(id); r.fulfill({ status: 200, contentType: 'image/jpeg', body: img(id) }); });
  await pg.route('https://drive.google.com/**', r => r.fulfill({ status: 200, contentType: 'image/jpeg', body: img('0') }));
  await pg.route('**/photo-unavailable', r => { seen.unavailable++; r.fulfill({ status: 404, body: '' }); });
  await pg.route('https://lh3.googleusercontent.com/d/DDE2EGUESTPOST*', r => r.abort());
  await pg.goto('http://localhost:8871/g/' + gid); await pg.waitForTimeout(2500);
  const state = await pg.evaluate(() => ({ delivery: GALLERY.delivery, recs: Object.keys(GALLERY.relayPhotos || {}).map(k => [k, GALLERY.relayPhotos[k]]) }));
  check(state.delivery === 'drive', 'page knows the gallery is delivered from Drive');
  const photoRecs = state.recs.filter(([k]) => k.indexOf('DDE2EPHOTO') === 0);
  check(photoRecs.length === 104 && photoRecs.every(([, r]) => r && r.direct === true), 'all 104 photos are direct-from-Drive records (' + photoRecs.length + ')');
  const guest = state.recs.find(([k]) => k === 'DDE2EGUESTPOST000001');
  check(!!guest && /token=/.test(guest[1].preview || ''), 'the Moments guest post keeps its relay link');
  // every photo URL the page can build for the 104 photos, at thumbnail and full size
  const urls = await pg.evaluate(ids => ids.map(id => [pgImg(id, 200), pgImg(id, 2048)]), all);
  // (full size is capped for guests by the download protection in 27-protect.js — still straight from Google)
  check(urls.every(([t, f], i) => t === 'https://lh3.googleusercontent.com/d/' + all[i] + '=w200' && new RegExp('^https://lh3\\.googleusercontent\\.com/d/' + all[i] + '=w\\d+$').test(f)), 'all 104 photos: thumbnail and full-size links go straight to Google (e.g. ' + urls[0][1] + ')');
  // the browser actually loads every one of them
  const loaded = await pg.evaluate(ids => Promise.all(ids.map(id => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = pgImg(id, 400); }))), all);
  check(loaded.filter(Boolean).length === 104, 'the browser loads all 104 photos (' + loaded.filter(Boolean).length + '/104)');
  check(seen.unavailable === 0, 'no photo fell back to /photo-unavailable');
  // the gallery itself shows photos on screen
  const onScreen = await pg.evaluate(() => [...document.images].filter(i => /lh3\.googleusercontent\.com\/d\/DDE2EPHOTO/.test(i.src) && i.complete && i.naturalWidth > 0).length);
  check(onScreen > 0, 'the gallery preview shows Drive photos on screen (' + onScreen + ')');
  console.log('page errors:', JSON.stringify(errors));
  await b.close(); srv.close(); process.exit(bad || errors.length ? 1 : 0);
});
