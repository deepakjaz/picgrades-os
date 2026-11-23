// Browser test (step 77, phase 2): the free-canvas editor — open, select, drag, resize, snap, add, style, laptop placement,
// undo, save into a new collection, apply; open it again from the collection; a ready layout applies unchanged.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'CANVASEDITWEDDING001';
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
}).listen(8802, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8802/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  await pg.goto(URL + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForFunction(() => window.PGControl && PGControl.role() === 'couple', null, { timeout: 10000 });
  const openLook = async () => { await pg.evaluate(() => PGControl.go('look')); await pg.waitForSelector('.pgcp-sheet'); await pg.waitForSelector('.pgcp-lgroup'); await pg.waitForTimeout(500); };
  await openLook();
  await pg.click('.pgcp-canvas'); await pg.waitForSelector('.pce .pce-page .pgc-sec');
  ok(await pg.evaluate(() => PGCanvasEditor.state().mode === 'l' && PGCanvasEditor.state().doc.sections.length === 2), 'a new free layout opens in the editor (laptop screen → laptop placement)');
  // select the names, drag them
  const S = () => pg.evaluate(() => PGCanvasEditor.state());
  const names = (await S()).doc.sections[0].els.find(e => e.t === 'names');
  const box = async id => pg.evaluate(id => { const r = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, id);
  let bb = await box(names.id);
  await pg.mouse.click(bb.x + bb.w / 2, bb.y + bb.h / 2); await pg.waitForSelector('.pce-sel');
  ok((await S()).sel === names.id && (await S()).tab === 'style', 'tap an element: it is selected, the Style panel opens');
  await pg.screenshot({ path: '/tmp/ce_laptop_sel.png' });
  bb = await box(names.id);
  await pg.mouse.move(bb.x + bb.w / 2, bb.y + bb.h / 2); await pg.mouse.down(); await pg.mouse.move(bb.x + bb.w / 2 - 60, bb.y + bb.h / 2 + 80, { steps: 8 });
  await pg.screenshot({ path: '/tmp/ce_laptop_drag.png' }); await pg.mouse.up(); await pg.waitForTimeout(200);
  let n2 = (await S()).doc.sections[0].els.find(e => e.id === names.id);
  ok(n2.l.y > names.l.y + 50 && n2.l.x < names.l.x - 30 && n2.p.y === names.p.y, 'drag moves it on laptop only: ' + JSON.stringify([names.l, n2.l]));
  // resize with the corner handle
  const hb = await pg.evaluate(() => { const r = document.querySelector('.pce-h-se').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await pg.mouse.move(hb.x, hb.y); await pg.mouse.down(); await pg.mouse.move(hb.x + 70, hb.y + 30, { steps: 6 }); await pg.mouse.up(); await pg.waitForTimeout(200);
  const n3 = (await S()).doc.sections[0].els.find(e => e.id === names.id);
  ok(n3.l.w > n2.l.w + 40 && n3.l.h > n2.l.h + 15, 'the corner handle resizes');
  // undo, redo
  await pg.click('.pce-undo'); ok((await S()).doc.sections[0].els.find(e => e.id === names.id).l.w === n2.l.w, 'undo'); await pg.click('.pce-redo');
  // style: size slider + colour
  await pg.evaluate(() => { const i = document.querySelector('.pce-pane [data-s="size"]'); i.dispatchEvent(new Event('pointerdown')); i.value = 90; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); });
  const n4 = (await S()).doc.sections[0].els.find(e => e.id === names.id);
  ok((n4.sl && n4.sl.size === 90) || (n4.s && n4.s.size === 90), 'the size slider changes the text size');
  // phone mode: phone placement kept
  await pg.click('.pce-mode [data-mode=p]'); await pg.waitForTimeout(300);
  ok((await S()).mode === 'p' && await pg.evaluate(() => document.querySelector('.pce-page').offsetWidth === 390), 'Phone shows the 390-wide phone page');
  // add a Find me button
  await pg.click('[data-tab=add]'); await pg.click('[data-add=action][data-v=findme]'); await pg.waitForTimeout(200);
  const st = await S(), fm = st.doc.sections.flatMap(s => s.els).find(e => e.t === 'action' && e.act === 'findme');
  ok(fm && st.sel === fm.id && await pg.$('.pce-page .pgc-el[data-el="' + fm.id + '"] .pgc-act'), 'Add puts a Find me button in and selects it');
  // hide on phone via Layers
  await pg.click('[data-tab=layers]'); await pg.click('[data-eye="' + fm.id + '"]'); await pg.waitForTimeout(200);
  const fm2 = (await S()).doc.sections.flatMap(s => s.els).find(e => e.id === fm.id);
  ok(fm2.p.hide === true && !fm2.l, 'Layers hides it on phone only');
  await pg.click('[data-eye="' + fm.id + '"]');
  await pg.click('[data-tab=page]'); await pg.waitForTimeout(150); await pg.screenshot({ path: '/tmp/ce_phone_page.png' });
  // save into a new collection
  await pg.click('.pce-save'); await pg.waitForSelector('.pce-scol');
  await pg.selectOption('.pce-scol', '+new'); await pg.fill('.pce-snewcol', 'Our layouts'); await pg.fill('.pce-sname', 'Our evening');
  await pg.screenshot({ path: '/tmp/ce_save.png' });
  await pg.click('.pce-sgo'); await pg.waitForSelector('.pce-savebox', { state: 'detached' }); await pg.waitForTimeout(300);
  const L = call('canvasList', { g: pub.galleryId, coupleKey: ck });
  const lay = L.layouts.find(l => l.name === 'Our evening'), col = L.collections.find(c => c.name === 'Our layouts');
  ok(lay && col && lay.collection === col.id && lay.scope === 'wedding', 'Save: the layout is kept in the new collection');
  // apply
  await pg.click('.pce-apply'); await pg.waitForSelector('.pce', { state: 'detached' }); await pg.waitForTimeout(800);
  ok(await pg.evaluate(id => GALLERY.layout === id && !!document.querySelector('#pgStory .pgc'), lay.id), 'Apply: the Hub is this layout now');
  await pg.screenshot({ path: '/tmp/ce_applied.png' });
  // open it again from its collection
  await openLook(); await pg.waitForSelector('.pgcp-layout[data-layout="' + lay.id + '"]');
  ok(await pg.evaluate(() => [...document.querySelectorAll('.pgcp-lgroup h5')].some(h => h.textContent === 'Our layouts')), 'the collection shows in Hub layout');
  await pg.click('.pgcp-layout[data-layout="' + lay.id + '"]'); await pg.waitForFunction(() => window.PGCanvasEditor && PGCanvasEditor.state() && PGCanvasEditor.state().doc);
  ok(await pg.evaluate(() => PGCanvasEditor.state().doc.name === 'Our evening' && PGCanvasEditor.state().src.mine), 'tap it: it opens in the editor with everything kept');
  await pg.evaluate(() => PGCanvasEditor.close(true)); await pg.waitForTimeout(300);
  // a ready layout applies unchanged (the phase 1 bug)
  await pg.evaluate(() => PGCanvasEditor.open('canvas-quiet')); await pg.waitForSelector('.pce .pgc-sec');
  await pg.click('.pce-apply'); await pg.waitForSelector('.pce', { state: 'detached' }); await pg.waitForTimeout(600);
  ok(call('getGallery', { g: pub.galleryId }).gallery.layout === 'canvas-quiet', 'a ready free layout (Quiet Portrait) applies');
  // phone-size editor
  const mp = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage(); mp.on('pageerror', e => errors.push(e.message));
  await mp.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('2') })); await require('./fonts_local').install(mp);
  await mp.goto(URL + '?couple=' + ck); await mp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple');
  await mp.evaluate(() => PGCanvasEditor.open('canvas-night')); await mp.waitForSelector('.pce .pgc-sec'); await mp.waitForTimeout(500);
  const el0 = await mp.evaluate(() => PGCanvasEditor.state().doc.sections[0].els[0].id);
  const pb = await mp.evaluate(id => { const r = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, el0);
  await mp.tap('.pce-page .pgc-el[data-el="' + el0 + '"]'); await mp.waitForTimeout(300);
  ok(await mp.evaluate(() => PGCanvasEditor.state().mode === 'p' && !!PGCanvasEditor.state().sel), 'phone: tap selects (phone placement)');
  await mp.screenshot({ path: '/tmp/ce_phone_sel.png' });
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
