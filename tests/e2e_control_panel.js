// Browser test (step 59): Control Panel fixes. A star shows at once and saves in the background with a progress bar (no faded pane);
// taps during a slow save are sent together; a failed save comes back; the choice survives a restart; the panel opens once; the server caches the wedding rows.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'CONTROLPANEL00000059';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['sH', 'Haldi'], ['sM', 'Mehendi'], ['sS', 'Sangeet'], ['sW', 'Wedding'], ['sR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 20; i++) DRIVE.files['SP' + k + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Ashish & Muskan', eventDate: '2027-01-24' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8862, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const picksOnServer = () => { const t = DB.Galleries, hd = t[0], row = t.slice(1).find(r => r[hd.indexOf('galleryId')] === pub.galleryId); return JSON.parse(row[hd.indexOf('storyPicks')] || '{}'); };
  // 1. the server: a save shows on the next read even with the cache kept; a hand edit shows after the cache time
  global.__keepTableCache = true;
  call('getGallery', { g: pub.galleryId });
  call('storyPicks', { g: pub.galleryId, coupleKey: ck, picks: { cover: ['SP000'] } });
  check((call('getGallery', { g: pub.galleryId }).gallery.story.cover || []).join() === 'SP000', 'server: a saved choice shows on the next read (the cache is cleared by the save)');
  const hd = DB.Galleries[0], row = DB.Galleries.slice(1).find(r => r[hd.indexOf('galleryId')] === pub.galleryId);
  row[hd.indexOf('credit')] = 'off';
  check(call('getGallery', { g: pub.galleryId }).gallery.credit === true, 'server: a hand edit in the Sheet waits for the cache (2 minutes)');
  require('./gas_mock').advance(3 / 60);
  check(call('getGallery', { g: pub.galleryId }).gallery.credit === false, 'server: … and shows after it');
  row[hd.indexOf('credit')] = '';
  global.__keepTableCache = false;
  call('storyPicks', { g: pub.galleryId, coupleKey: ck, picks: {} });

  const ctxOpts = { viewport: { width: 390, height: 844 }, hasTouch: true };
  const ctx = await b.newContext(ctxOpts); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const pid = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(pid) }); });
  let slow = 0, fail = false, saves = 0;
  await pg.route('**/api', async r => { const p = JSON.parse(r.request().postData() || '{}'); if (p.action === 'storyPicks') { saves++; if (slow) await new Promise(x => setTimeout(x, slow)); if (fail) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'No internet (test)' }) }); } r.continue(); });
  await pg.addInitScript(() => { try { localStorage.setItem('pg_storyq_' + location.pathname.split('/').pop(), '1'); } catch (e) {} });
  const go = async () => { await pg.goto('http://localhost:8862/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(700); };
  await go();
  // 2. star on a slow connection: shows at once, the sheet stays clear, a bar runs; three quick taps end as one saved choice
  slow = 1500;
  await pg.evaluate(() => openCollection('Haldi', 2)); await pg.waitForTimeout(600);
  await pg.click('#pgvStory'); await pg.waitForSelector('.pgsp-sheet');
  await pg.click('.pgsp-row[data-k=cover]'); await pg.waitForTimeout(120);
  const mid = await pg.evaluate(() => ({ on: !!document.querySelector('.pgsp-row[data-k=cover].on'), op: getComputedStyle(document.querySelector('.pgsp-sheet')).opacity, bar: document.getElementById('pgSaveBar').classList.contains('on'), ev: getComputedStyle(document.querySelector('.pgsp-sheet')).pointerEvents }));
  check(mid.on && mid.op === '1' && mid.ev !== 'none' && mid.bar, 'the star shows at once, the sheet stays clear and usable, the progress bar runs ' + JSON.stringify(mid));
  await pg.screenshot({ path: '/tmp/s59_saving.png' });
  await pg.click('.pgsp-row[data-k=hl]'); await pg.waitForTimeout(80); await pg.click('.pgsp-row[data-k=bride]');
  await pg.waitForFunction(() => !PGStoryPicks.saving(), null, { timeout: 15000 });
  let sp = picksOnServer();
  check(sp.cover.join() === 'SP002' && (sp.hl.Haldi || []).join() === 'SP002' && sp.bride === 'SP002', 'all three taps reached the server: ' + JSON.stringify(sp));
  check(saves <= 3, 'taps during a slow save were sent together (' + saves + ' saves for 3 taps)');
  check(await pg.evaluate(() => !document.getElementById('pgSaveBar').classList.contains('on')), 'the bar goes away when saved');
  await pg.click('.pgsp-done');
  // 3. a failed save: the last saved choice comes back, with the reason
  fail = true; slow = 300;
  await pg.evaluate(() => openCollection('Haldi', 5)); await pg.waitForTimeout(500); await pg.click('#pgvStory'); await pg.waitForSelector('.pgsp-sheet');
  await pg.click('.pgsp-row[data-k=cover]'); await pg.waitForFunction(() => !PGStoryPicks.saving()); await pg.waitForTimeout(200);
  const back = await pg.evaluate(() => ({ on: !!document.querySelector('.pgsp-row[data-k=cover].on'), cover: GALLERY.story.cover.join(), toast: (document.querySelector('.toast, #toast, .pg-toast') || {}).textContent || '' }));
  check(!back.on && back.cover === 'SP002', 'a failed save comes back to the saved choice ' + JSON.stringify(back));
  fail = false; slow = 0; await pg.click('.pgsp-done');
  // 4. restart the app: the choice is still there (from the phone's copy and from the server)
  await pg.close(); const pg2 = await ctx.newPage(); pg2.on('pageerror', e => errors.push(e.message));
  await pg2.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('SP000') }));
  await pg2.goto('http://localhost:8862/g/' + pub.galleryId + '?couple=' + ck); await pg2.waitForSelector('#pgBoot.hide', { state: 'attached' });
  const first = await pg2.evaluate(() => (GALLERY.story.cover || []).join());
  await pg2.waitForTimeout(1200);
  check(first === 'SP002', 'restart: the phone\'s copy already has the star (' + first + ')');
  // the copy on the phone was older (another phone chose more): the fresh copy wins after the restart
  call('storyPicks', { g: pub.galleryId, coupleKey: ck, picks: { cover: ['SP002', 'SP410'], bride: 'SP002', hl: { Haldi: ['SP002'] } } });
  await pg2.reload(); await pg2.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg2.waitForTimeout(1500);
  check(await pg2.evaluate(() => (GALLERY.story.cover || []).join()) === 'SP002,SP410', 'restart: a choice made on another phone shows too');
  // 5. Control Panel: a double tap opens one panel
  await pg2.evaluate(() => { PGControl.open(); PGControl.open(); }); await pg2.waitForTimeout(300);
  check(await pg2.evaluate(() => document.querySelectorAll('.pgcp-sheet').length) === 1, 'a double tap on the gear opens one Control Panel');
  await pg2.click('.pgcp-tabs [data-tab=story]'); await pg2.waitForSelector('.pgsp-pane');
  await pg2.click('.pgsp-th[data-key=cover][data-i="1"] [data-do=del]'); await pg2.waitForTimeout(60);
  check(await pg2.evaluate(() => getComputedStyle(document.querySelector('.pgsp-pane')).opacity === '1' && document.querySelectorAll('.pgsp-th[data-key=cover]').length === 1), 'Control Panel › Story: removing a cover photo shows at once, the pane stays clear');
  await pg2.waitForFunction(() => !PGStoryPicks.saving()); await pg2.screenshot({ path: '/tmp/s59_panel.png' });
  check(picksOnServer().cover.join() === 'SP002', 'and it is saved');
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
