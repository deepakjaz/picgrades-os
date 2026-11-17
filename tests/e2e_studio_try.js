// Browser test (step 70): on the photographer page, visitors try Reel Edits and Post Edits on the demo wedding (Settings demoGallery).
//   · a 'Try the editors yourself' block with two buttons, and 'Try it yourself' in the feature story
//   · the editors open on the demo wedding's photos (even a Draft wedding PicGrades chose); a Demo ribbon shows
//   · nothing is saved, downloaded or shared: the editors say it's a demo, and the server is never asked to save
//   · the demo wedding's own guests are not limited by this
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'STUDIOWEDDING00000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['pS', 'Sangeet'], ['pW', 'Wedding'], ['pR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 5; i++) DRIVE.files['PS' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const D = 'DEMOTRYWEDDING000070';
DRIVE.folders[D] = { name: D, access: 'ANYONE_WITH_LINK' };
[['dH', 'Haldi'], ['dW', 'Wedding']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: D }; for (let i = 0; i < 12; i++) DRIVE.files['DT' + k + String(i).padStart(2, '0')] = { name: 'd' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
call('signUp', { email: 'meera@example.com', name: 'Meera', kind: 'couple' });
const mtok = call('verifyCode', { email: 'meera@example.com', code: codeOf('meera@example.com') }).token;
const demoW = call('createWedding', { token: mtok, folderUrl: D, title: 'Meera & Kabir', eventDate: '2026-11-20' });   // a separate wedding, still a Draft
DB.Settings.push(['demoGallery', demoW.galleryId, 'try the editors']);
const bytesOf = (id) => { const f = DRIVE.files[id]; if (f && f.bytes) return Buffer.from(f.bytes); const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
// a 40 s test song at exactly 128 beats per minute (first beat at 0.30 s), made with plain JS + ffmpeg
(function makeSong() {
  const sr = 44100, bpm = 128, off = 0.30, dur = 40, x = new Float32Array(sr * dur);
  for (let k = 0; k < Math.floor((dur - off) * bpm / 60); k++) { const i0 = Math.floor((off + k * 60 / bpm) * sr), n = Math.floor(0.08 * sr);
    for (let j = 0; j < n && i0 + j < x.length; j++) { const t = j / sr; x[i0 + j] += Math.sin(2 * Math.PI * (60 + 80 * Math.exp(-t * 30)) * t) * Math.exp(-t / 0.02) * (k % 4 ? 0.6 : 1); } }
  const b = Buffer.alloc(44 + x.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 0.8 * 32767))), 44 + i * 2);
  fs.writeFileSync('/tmp/beat128.wav', b);
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', '/tmp/beat128.wav', '-b:a', '128k', '/tmp/my_song.mp3']);
})();
const ACTS = [];
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); const r = call(p.action, p); ACTS.push({ a: p.action, g: p.g, n: r && r.images ? Object.keys(r.images).length : null, ok: r && r.ok }); res.end(JSON.stringify(r)); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|p|c|ph|pg)\/[a-z0-9-]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8870, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS, shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  let downloads = 0; pg.on('download', () => downloads++);
  const seen = []; let seenFrom = 0; await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; seen.push(id); r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const company = DB.Galleries.slice(1).find(r => r.includes(pub.galleryId))[DB.Galleries[0].indexOf('companyName')];
  DB.Studios = [['slug', 'companyName', 'name', 'tagline', 'about', 'city', 'phone', 'email', 'instagram', 'website', 'galleries', 'status', 'createdAt'],
    ['alpha', company, 'Studio Alpha', 'Candid wedding stories', 'We photograph weddings.', 'Mumbai', '9876543210', '', 'studioalpha', '', '', 'Live', '']];
  const st = call('getStudio', { slug: 'alpha' }).gallery;
  check(st.tryDemo && st.tryDemo.galleryId === demoW.galleryId && st.tryDemo.title === 'Meera & Kabir', 'the photographer page carries the demo wedding (from Settings, even as a Draft)');
  check(st.tryDemo.events.length === 2 && st.tryDemo.events.every(e => e.photos.length <= 8), 'a few photos per event, never the whole wedding (' + st.tryDemo.events.map(e => e.photos.length) + ')');
  // a stranger asking the server for a demo-wedding photo outside the demo set gets nothing
  const outside = call('photoData', { g: demoW.galleryId, device: 'device-xyz-123', ids: ['DT011'] });
  const inside = call('photoData', { g: demoW.galleryId, device: 'device-xyz-123', ids: [st.tryDemo.events[0].photos[0].id] });
  check(Object.keys(outside.images || {}).length === 0 && Object.keys(inside.images || {}).length === 1, 'only the demo photos are given out, not the rest of the wedding');
  await pg.goto('http://localhost:8870/p/alpha'); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1500);
  await pg.locator('#pgsTry').scrollIntoViewIfNeeded();
  check(await pg.isVisible('#pgsTry') && /nothing is saved or downloaded/.test(await pg.textContent('#pgsTry')), 'hub: "Try the editors yourself", says it is a demo');
  await shot(pg, 'try-1-hub');
  // Reel Edits
  seenFrom = seen.length;
  await pg.click('#pgsTry button[data-try=reel]'); await pg.waitForSelector('.rl-wrap', { timeout: 20000 }); await pg.waitForTimeout(2500);
  check(await pg.locator('.rl-wrap .pgs-tag:visible').count() > 0 && await pg.textContent('.rl-wrap .pgs-tag') === 'DEMO', 'Reel Edits opens, with a DEMO tag in its header');
  const inReel = seen.slice(seenFrom).filter(id => !/^PS/.test(id));   // (PS = the photographer page's own photos, still loading behind the editor)
  const demoIds = st.tryDemo.events.flatMap(e => e.photos.map(x => x.id));
  check(inReel.length > 0 && inReel.every(id => demoIds.includes(id)), 'the reel shows the demo wedding\'s photos (' + inReel.length + ')');
  check(ACTS.filter(x => x.a === 'photoData').every(x => x.g === demoW.galleryId), 'any photo the editor asks the server for comes from the demo wedding');
  await shot(pg, 'try-2-reel');
  await pg.evaluate(() => PGReel.close()); await pg.waitForTimeout(1200);
  check(!(await pg.locator('.rl-wrap').count()), 'the editor closes');
  // Post Edits: make a post and try to download / share
  await pg.click('#pgsTry button[data-try=post]'); await pg.waitForSelector('.pe-wrap[data-view=pick]', { timeout: 20000 });
  await pg.click('.pe-v-pick .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=edit]', { timeout: 30000 });
  await pg.waitForFunction(() => PGPost.info(), null, { timeout: 20000 }); await pg.waitForTimeout(800);
  check(await pg.locator('.pe-wrap .pgs-tag:visible').count() > 0, 'Post Edits shows the DEMO tag too');
  await shot(pg, 'try-3-post');
  await pg.click('.pe-v-edit .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=share]'); await pg.waitForTimeout(400);
  const before = ACTS.length;
  const btns = await pg.$$('.pe-v-share button');
  for (const bt of btns) { const t = (await bt.textContent()) || ''; if (/download|save|share|instagram|post/i.test(t) && await bt.isVisible()) { await bt.click().catch(() => {}); await pg.waitForTimeout(500); } }
  const said = await pg.evaluate(() => document.body.innerText);
  check(/This is a demo\. With your own wedding app you can save, download and share everything\./.test(said), 'Download / share: "This is a demo…" message');
  check(downloads === 0, 'nothing is downloaded');
  check(!ACTS.slice(before).some(x => /save|post|upload/i.test(x.a)), 'the server is never asked to save anything');
  await shot(pg, 'try-4-post-share');
  await pg.evaluate(() => PGPost.close()); await pg.waitForTimeout(1000);
  // the feature story has "Try it yourself" on the reel and album screens
  await pg.evaluate(() => pgOpenStory('reel')); await pg.waitForTimeout(1200);
  check(await pg.locator('.pgs-sec[data-k=reel] .pgs-trybtn').count() === 1 && await pg.locator('.pgs-sec[data-k=album] .pgs-trybtn').count() === 1 && await pg.locator('.pgs-trybtn').count() === 2, 'the feature story: "Try it yourself" on the reel and album screens');
  await pg.click('.pgs-sec[data-k=reel] .pgs-trybtn'); await pg.waitForSelector('.rl-wrap', { timeout: 20000 });
  check(!(await pg.locator('.pgs-story').count()), 'it closes the story and opens Reel Edits');
  await pg.evaluate(() => PGReel.close());
  await ctx.close();
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
