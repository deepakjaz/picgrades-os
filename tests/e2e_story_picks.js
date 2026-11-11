// Browser test (step 56): story photos — the couple / photographer picks cover photos, the bride's and groom's portraits and event highlights
// from the photo view (★ Story), sees and reorders them in Control Panel › Story; the story Hub uses only what was chosen; guests cannot pick.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'STORYPICKS0000000056';
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
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8833, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const picksOnServer = () => { const t = DB.Galleries, hd = t[0], row = t.slice(1).find(r => r[hd.indexOf('galleryId')] === pub.galleryId); return JSON.parse(row[hd.indexOf('storyPicks')] || '{}'); };
  // the server refuses a guest and keeps only this wedding's photos
  check(/Only the couple/.test(String((() => { try { return JSON.stringify(call('storyPicks', { g: pub.galleryId, picks: { cover: ['SP000'] } })); } catch (e) { return e.message; } })())), 'a guest cannot choose story photos');
  const r0 = call('storyPicks', { g: pub.galleryId, coupleKey: ck, picks: { cover: ['SP000', 'NOTAPHOTO123', 'SP000'], hl: { Haldi: ['SP001', 'SP105'], Nowhere: ['SP002'] } } });
  check(JSON.stringify(r0.story) === JSON.stringify({ cover: ['SP000'], bride: '', groom: '', hl: { Haldi: ['SP001'] } }), 'the server keeps only real photos of the right event: ' + JSON.stringify(r0.story));
  call('storyPicks', { g: pub.galleryId, coupleKey: ck, picks: {} });
  const page = async (q, w = 390, hh = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: w < 900 }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => { const pid = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(pid) }); });
    await pg.addInitScript(() => { try { localStorage.setItem('pg_storyq_' + location.pathname.split('/').pop(), '1'); } catch (e) {} });
    await pg.goto('http://localhost:8833/g/' + pub.galleryId + q); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(500); return { ctx, pg };
  };
  // a guest never sees the Story button
  { const { ctx, pg } = await page(''); await pg.evaluate(() => openCollection('Haldi', 2)); await pg.waitForTimeout(700);
    check(!(await pg.isVisible('#pgvStory')), 'a guest does not see ★ Story on a photo'); await ctx.close(); }
  const { ctx, pg } = await page('?couple=' + ck);
  // the couple: open a photo → ★ Story → tick Cover, Bride, Highlight
  const pick = async (ev, i, keys) => {
    await pg.evaluate(([ev, i]) => openCollection(ev, i), [ev, i]); await pg.waitForTimeout(600);
    await pg.click('#pgvStory'); await pg.waitForSelector('.pgsp-sheet');
    for (const k of keys) { await pg.click('.pgsp-row[data-k=' + k + ']'); await pg.waitForFunction(k => document.querySelector('.pgsp-row[data-k=' + k + ']') && !document.querySelector('.pgsp-sheet.busy'), k); await pg.waitForTimeout(150); }
    const on = await pg.$$eval('.pgsp-row.on', l => l.map(x => x.dataset.k)); await pg.click('.pgsp-done'); return on;
  };
  const on1 = await pick('Haldi', 2, ['cover', 'hl']);
  check(on1.join() === 'cover,hl', 'the couple ticks Cover and Highlight of Haldi: ' + on1.join());
  await pg.screenshot({ path: '/tmp/s56_viewer.png' });
  const on2 = await pick('Wedding', 1, ['bride']); const on3 = await pick('Wedding', 4, ['groom', 'cover']);
  check(on2.join() === 'bride' && on3.join() === 'cover,groom', 'bride and groom portraits chosen');
  let sp = picksOnServer();
  check(sp.cover.join() === 'SP002,SP304' && sp.bride === 'SP301' && sp.groom === 'SP304' && (sp.hl.Haldi || []).join() === 'SP002', 'saved for the wedding: ' + JSON.stringify(sp));
  // the same photo cannot be both bride and groom
  await pg.evaluate(() => openCollection('Wedding', 1)); await pg.waitForTimeout(500); await pg.click('#pgvStory'); await pg.waitForSelector('.pgsp-sheet');
  await pg.click('.pgsp-row[data-k=groom]'); await pg.waitForFunction(() => !document.querySelector('.pgsp-sheet.busy')); await pg.waitForTimeout(200);
  sp = picksOnServer(); check(sp.groom === 'SP301' && sp.bride === '', 'one photo is either the bride or the groom, not both');
  await pg.click('.pgsp-row[data-k=bride]'); await pg.waitForFunction(() => !document.querySelector('.pgsp-sheet.busy')); await pg.waitForTimeout(200); await pg.click('.pgsp-done');
  await pick('Wedding', 4, ['groom']);
  sp = picksOnServer(); check(sp.bride === 'SP301' && sp.groom === 'SP304', 'bride and groom set again: ' + sp.bride + ' / ' + sp.groom);
  // Control Panel › Story
  await pg.evaluate(() => { if (document.body.dataset.view !== 'hub') switchViewFromNav('hub'); PGControl.open(); }); await pg.waitForSelector('.pgcp-sheet');
  await pg.click('.pgcp-tabs [data-tab=story]'); await pg.waitForSelector('.pgsp-pane');
  const pane = await pg.evaluate(() => ({ slots: [...document.querySelectorAll('.pgsp-slot img')].length, cover: document.querySelectorAll('.pgsp-th[data-key=cover]').length, haldi: document.querySelectorAll('.pgsp-th[data-key="hl:Haldi"]').length, empty: document.querySelectorAll('.pgsp-empty').length }));
  check(pane.slots === 2 && pane.cover === 2 && pane.haldi === 1 && pane.empty >= 3, 'Control Panel › Story shows the choice ' + JSON.stringify(pane));
  await pg.screenshot({ path: '/tmp/s56_panel.png' });
  await pg.click('.pgsp-th[data-key=cover][data-i="0"] [data-do=right]'); await pg.waitForFunction(() => !document.querySelector('.pgsp-pane.busy')); await pg.waitForTimeout(200);
  check(picksOnServer().cover.join() === 'SP304,SP002', 'cover photos reordered');
  await pg.click('.pgsp-th[data-key="hl:Haldi"] [data-do=del]'); await pg.waitForFunction(() => !document.querySelector('.pgsp-pane.busy')); await pg.waitForTimeout(200);
  check(!picksOnServer().hl.Haldi, 'a highlight removed');
  await pg.click('.pgcp-sheet .mk-btn-peach.ios-wide');
  // the story Hub uses the choice: varmala with the chosen portraits, cover first
  await pg.evaluate(() => PGControl.save({ layout: 'story-living' }).then(r => { GALLERY.layout = r.layout; PGLayout.refresh(); }));
  await pg.waitForSelector('#pgStory'); await pg.waitForTimeout(800);
  const st = await pg.evaluate(() => ({ vm: [...document.querySelectorAll('#pgStory .psh-vm-card img')].map(i => i.dataset.pid), hero: document.querySelector('#pgStory .psh-hero-img').dataset.pid }));
  check(st.vm.join() === 'SP301,SP304' && st.hero === 'SP304', 'the story uses the chosen portraits and cover ' + JSON.stringify(st));
  // remove the groom → the varmala part goes away (nothing guessed)
  await pg.evaluate(() => { const P = PGStoryPicks.picks(); P.groom = ''; return PGStoryPicks.save(P); }); await pg.waitForTimeout(800);
  check(await pg.evaluate(() => !!document.getElementById('pgStory') && !document.querySelector('#pgStory .psh-varmala-track')), 'without both portraits the story leaves the varmala out');
  // a guest sees the same story photos
  { const g = await page(''); await g.pg.waitForSelector('#pgStory', { timeout: 15000 }); await g.pg.waitForTimeout(600);
    check(await g.pg.evaluate(() => document.querySelector('#pgStory .psh-hero-img').dataset.pid === 'SP304'), 'a guest sees the chosen cover'); await g.ctx.close(); }
  console.log(bad ? 'FAIL ' + bad + ' checks' : 'all story photo checks passed');
  console.log('page errors:', JSON.stringify(errors)); await b.close(); srv.close(); process.exit(0);
});
