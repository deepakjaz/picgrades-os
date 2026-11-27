// Browser test (step 106): Try your photos — change any words on the page (tap them), drag parts up or down by their handle;
// guests see the new words and order. Canvas templates and Living Story.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'TRYWORDSWEDDING00106';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['tH', 'Haldi'], ['tS', 'Sangeet'], ['tW', 'Wedding'], ['tR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['TP' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;


const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8935, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8935/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    const G = pub.galleryId, gal = () => call('getGallery', { g: G }).gallery;
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), mp = await ctx.newPage(); mp.on('pageerror', e => errors.push(e.message)); mp.on('dialog', d => d.accept());
    const route = async p => { await p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); }); };
    await route(mp); await require('./fonts_local').install(mp);
    await mp.goto(URL + '?couple=' + ck); await mp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple' && window.PGTemplateEditor, null, { timeout: 10000 });
    // ---- canvas: words ----
    await mp.evaluate(() => PGControl.designLayout('canvas-night')); await mp.waitForSelector('.pgte .pgte-scroll .pgc-sec', { timeout: 8000 });
    const word = await mp.evaluate(() => { const w = document.querySelector('.pgte-scroll .pgc-t-text, .pgte-scroll .pgc-t-action'); w.scrollIntoView({ block: 'center' }); return w.dataset.el; });
    await mp.evaluate(k => document.querySelector('.pgte-scroll .pgc-el[data-el="' + k + '"]').click(), word); await mp.waitForSelector('.pgte-pane [data-tx="' + word + '"]');
    ok(await mp.evaluate(k => PGTemplateEditor.state().tab === 'words' && document.activeElement === document.querySelector('.pgte-pane [data-tx="' + k + '"]'), word), 'tapping words on the page opens Words at that box');
    ok(await mp.evaluate(() => document.querySelectorAll('.pgte-pane [data-tx]').length) >= 3, 'Words lists the words on the page, not only names and date');
    await mp.fill('.pgte-pane [data-tx="' + word + '"]', 'Our forever begins'); await mp.dispatchEvent('.pgte-pane [data-tx="' + word + '"]', 'change'); await mp.waitForTimeout(400);
    ok(await mp.evaluate(k => /Our forever begins/.test(document.querySelector('.pgte-scroll .pgc-el[data-el="' + k + '"]').textContent), word), 'the new words show on the template');
    // ---- canvas: drag a part down ----
    await mp.evaluate(() => { PGTemplateEditor.tab('parts'); const e = document.querySelector('.pgte'); if (e && !e.classList.contains('pgte-drawer-open')) document.querySelector('.pgte-drawer-toggle').click(); }); await mp.waitForSelector('.pgte-orow .pgte-grip'); await mp.waitForTimeout(400);
    const before = await mp.evaluate(() => [...document.querySelectorAll('.pgte-orow')].map(r => r.dataset.okey));
    await mp.evaluate(() => document.querySelectorAll('.pgte-orow')[1].scrollIntoView({ block: 'center' })); await mp.waitForTimeout(300);
    const g0 = await mp.locator('.pgte-orow >> nth=0').locator('.pgte-grip').boundingBox(), r2 = await mp.locator('.pgte-orow >> nth=2').boundingBox();
    await mp.mouse.move(g0.x + g0.width / 2, g0.y + g0.height / 2); await mp.mouse.down(); await mp.mouse.move(g0.x + 20, r2.y + r2.height * 0.8, { steps: 8 }); await mp.mouse.up(); await mp.waitForTimeout(500);
    const after = await mp.evaluate(() => [...document.querySelectorAll('.pgte-orow')].map(r => r.dataset.okey));
    ok(after[0] === before[1] && after.indexOf(before[0]) >= 2, 'dragging a part\'s handle moves it down (' + before.slice(0, 3) + ' → ' + after.slice(0, 3) + ')');
    ok(await mp.evaluate(k => { const secs = [...document.querySelectorAll('.pgte-scroll .pgc-sec')].map(s => s.dataset.sec); return secs[0] === k; }, before[1]), 'the template shows the new order');
    ok(await mp.evaluate(() => [...document.querySelectorAll('.pgte-grip')].every(g => g.getBoundingClientRect().height >= 44)), 'the drag handles are at least 44 px');
    await mp.screenshot({ path: '/tmp/s106_parts.png' });
    await mp.tap('.pgte-apply'); await mp.waitForFunction(() => !document.querySelector('.pgte'), null, { timeout: 10000 }); await mp.waitForTimeout(500);
    let g = gal(); ok(g.custom.story.texts[word] === 'Our forever begins' && g.custom.story.sections[0].k === before[1], 'Apply keeps the words and the order (no copy of the design)');
    const gp = await ctx.newPage(); gp.on('pageerror', e => errors.push(e.message)); await route(gp);
    await gp.goto(URL); await gp.waitForSelector('#pgStory .pgc', { timeout: 10000 }); await gp.waitForTimeout(600);
    ok(await gp.evaluate(([k, first]) => /Our forever begins/.test(document.querySelector('#pgStory').textContent) && document.querySelector('#pgStory .pgc-sec').dataset.sec === first, [word, before[1]]), 'guests see the new words and the new order');
    await gp.close();
    // ---- Living Story: words and order ----
    await mp.evaluate(() => PGControl.designLayout('story-living')); await mp.waitForSelector('.pgte .pgte-scroll section', { timeout: 8000 }); await mp.waitForTimeout(700);
    await mp.evaluate(() => PGTemplateEditor.tab('words')); await mp.waitForSelector('.pgte-pane [data-tx]');
    const lk = await mp.evaluate(() => document.querySelector('.pgte-pane [data-tx]').dataset.tx);
    await mp.fill('.pgte-pane [data-tx="' + lk + '"]', 'Two families, one story'); await mp.dispatchEvent('.pgte-pane [data-tx="' + lk + '"]', 'change'); await mp.waitForTimeout(500);
    ok(await mp.evaluate(() => /Two families, one story/.test(document.querySelector('.pgte-scroll').textContent)), 'Living Story: changed words show on the real template');
    await mp.evaluate(() => { PGTemplateEditor.tab('parts'); const e = document.querySelector('.pgte'); if (e && !e.classList.contains('pgte-drawer-open')) document.querySelector('.pgte-drawer-toggle').click(); }); await mp.waitForSelector('.pgte-orow .pgte-grip'); await mp.waitForTimeout(400);
    const lb = await mp.evaluate(() => [...document.querySelectorAll('.pgte-orow')].map(r => r.dataset.okey));
    await mp.evaluate(() => document.querySelectorAll('.pgte-orow')[1].scrollIntoView({ block: 'center' })); await mp.waitForTimeout(300);
    const lg = await mp.locator('.pgte-orow >> nth=1').locator('.pgte-grip').boundingBox(), l0 = await mp.locator('.pgte-orow >> nth=0').boundingBox();
    await mp.mouse.move(lg.x + lg.width / 2, lg.y + lg.height / 2); await mp.mouse.down(); await mp.mouse.move(lg.x + 20, l0.y + 4, { steps: 8 }); await mp.mouse.up(); await mp.waitForTimeout(500);
    const la = await mp.evaluate(() => [...document.querySelectorAll('.pgte-orow')].map(r => r.dataset.okey));
    ok(la[0] === lb[1], 'Living Story: its own parts can be dragged up (' + lb.slice(0, 2) + ' → ' + la.slice(0, 2) + ')');
    await mp.evaluate(() => PGTemplateEditor.tab('more'));
    ok(!(await mp.$('.pgte-adv')), 'Living Story still has no Advanced editor');
    await mp.tap('.pgte-apply'); await mp.waitForFunction(() => !document.querySelector('.pgte'), null, { timeout: 10000 }); await mp.waitForTimeout(500);
    g = gal(); ok(g.custom.base === 'story-living' && g.custom.story.texts[lk] === 'Two families, one story' && g.custom.story.sections[0].k === lb[1], 'Living Story keeps its words and order');
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
