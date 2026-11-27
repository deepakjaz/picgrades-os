// Browser test (step 101): a fresh start — one version of each template. A wedding has ONE copy of a template (photo change,
// Save, Apply all update it), Back to original, Use our version / Use the original; story templates open "Try your photos" only.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'FRESHSTARTWEDDING101';
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
}).listen(8931, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8931/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    const G = pub.galleryId, mine = () => call('canvasList', { g: G, coupleKey: ck }).layouts.filter(x => x.scope === 'wedding' && x.base === 'canvas-quiet');
    call('coupleLook', { g: G, coupleKey: ck, layout: 'canvas-quiet' });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), mp = await ctx.newPage(); mp.on('pageerror', e => errors.push(e.message)); mp.on('dialog', d => d.accept());
    await mp.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(mp);
    const boot = async () => { await mp.goto(URL + '?couple=' + ck); await mp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple' && window.PGHubPhoto && PGHubPhoto.editable(), null, { timeout: 10000 }); await mp.waitForTimeout(400); };
    await boot();
    // step 103 (changed): a Hub photo change keeps only the choice (e2e_hub_photo.js); the Advanced editor makes the wedding's one copy
    const advSave = async () => { await mp.evaluate(() => { PGCanvasEditor.close(true); GALLERY.layout = 'canvas-quiet'; PGCanvasEditor.open('canvas-quiet'); }); await mp.waitForSelector('.pce .pce-page .pgc-sec');
      await mp.waitForTimeout(600); await mp.evaluate(() => { const d = PGCanvasEditor.state().doc; const e = d.sections[0].els.find(x => x.t === 'photo'); PGCanvasEditor.select(e.id); });
      await mp.evaluate(() => { const i = document.querySelector('.pce-pane [data-sp="y"]'); if (i) { i.value = String(+i.value + 10); i.dispatchEvent(new Event('change')); } });
      await mp.evaluate(() => document.querySelector('.pce-save').click()); await mp.waitForFunction(() => PGCanvasEditor.state().src.id, null, { timeout: 8000 }); await mp.waitForTimeout(500); };
    await advSave(); const first = await mp.evaluate(() => PGCanvasEditor.state().src.id);
    ok(mine().length === 1 && mine()[0].id === first, 'the Advanced editor\'s first save makes the wedding\'s copy, linked to its template');
    await advSave();
    ok(mine().length === 1 && await mp.evaluate(() => PGCanvasEditor.state().src.id) === first, 'saving again updates the same copy (no new version)');
    await mp.evaluate(() => PGCanvasEditor.close(true));
    // opening the template in the editor opens their copy
    await mp.evaluate(() => { GALLERY.layout = 'canvas-quiet'; PGCanvasEditor.open('canvas-quiet'); }); await mp.waitForSelector('.pce .pce-page .pgc-sec');
    await mp.waitForFunction(() => PGCanvasEditor.state().src.id, null, { timeout: 8000 });
    let st = await mp.evaluate(() => PGCanvasEditor.state().src);
    ok(st.id === first && st.base === 'canvas-quiet', 'Edit on the template opens the wedding\'s copy, not the original');
    // change something, Save: no question, same copy
    await mp.evaluate(() => { const s = PGCanvasEditor.state(); const e = s.doc.sections[0].els.find(x => x.t === 'text' || x.t === 'title'); PGCanvasEditor.select(e.id); });
    await mp.evaluate(() => { const st2 = PGCanvasEditor.state(); });
    await mp.evaluate(() => document.querySelector('.pce-save').click()); await mp.waitForTimeout(800);
    ok(!(await mp.$('.pce-savebox')) && mine().length === 1, 'Save asks nothing and keeps one copy');
    // Back to original
    await mp.evaluate(() => document.querySelector('.pce-more, [data-menu-open], .pce-menu-btn') && 0);
    await mp.evaluate(() => document.querySelector('[data-menu=original]').click()); await mp.waitForTimeout(400);
    ok(await mp.evaluate(() => JSON.stringify(PGCanvasEditor.state().doc) === JSON.stringify(PGLayout.find('canvas-quiet').canvas)), 'Back to original puts the template back as it was made');
    // step 101b: tapping a photo in the design shows the wedding's photos as thumbnails (no dropdown); the photo stays in sight
    const pe = await mp.evaluate(() => PGCanvasEditor.state().doc.sections[0].els.find(e => e.t === 'photo').id);
    await mp.evaluate(id => document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').scrollIntoView({ block: 'center' }), pe); await mp.waitForTimeout(300);
    await mp.tap('.pce-page .pgc-el[data-el="' + pe + '"]'); await mp.waitForSelector('.pce .pce-thumbs button', { timeout: 6000 }); await mp.waitForTimeout(500);
    ok(await mp.evaluate(() => !document.querySelector('.pce-pane select[data-f=src]') && document.querySelector('.pce-pane .pce-thumbs') === document.querySelector('.pce-pane').querySelector('.pce-thumbs')), 'tapping a photo opens its Design with thumbnails first (the follow-the-story list moved to Connect)');
    const thumbOk = await mp.evaluate(() => [...document.querySelectorAll('.pce-thumbs button')].slice(0, 4).every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && b.querySelector('img'); }));
    ok(thumbOk, 'thumbnails are real pictures, at least 44 px');
    const pick = await mp.evaluate(() => document.querySelectorAll('.pce-thumbs button')[2].dataset.photo);
    await mp.tap('.pce-thumbs button >> nth=2'); await mp.waitForTimeout(500);
    ok(await mp.evaluate(([id, p]) => { const e = PGCanvasEditor.state().doc.sections[0].els.find(x => x.id === id); return e.src.k === 'id' && e.src.id === p; }, [pe, pick]), 'tapping a thumbnail puts that photo in the spot');
    ok(await mp.evaluate(id => { const el = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').getBoundingClientRect(), dr = document.querySelector('.pce-panel, .pce-drawer, .pce-side'); const top = dr ? dr.getBoundingClientRect().top : innerHeight; return el.bottom > 60 && el.top < top - 40; }, pe), 'the photo being changed stays visible above the panel');
    await mp.screenshot({ path: '/tmp/s101b_thumbs.png' });
    await mp.evaluate(() => PGCanvasEditor.close(true));
    // a new copy only when asked
    const c2 = call('canvasSave', { g: G, coupleKey: ck, item: { kind: 'layout', name: 'Second', scope: 'wedding', base: 'canvas-quiet', copy: 1, doc: { name: 'x', sections: [] } } });
    ok(mine().length === 2 && c2.id !== first, 'Save as a copy makes a second one only when asked');
    // the preview: Use our version / Use the original
    call('coupleLook', { g: G, coupleKey: ck, layout: 'canvas-quiet' }); await boot();
    await mp.click('.tkg-nav-item[data-nav=studio]'); await mp.waitForSelector('.pgcp-sheet'); await mp.evaluate(() => PGControl.go('layout'));
    await mp.waitForSelector('.pgcp-layout[data-layout="canvas-night"]'); await mp.waitForTimeout(1500);
    await mp.evaluate(() => PGControl.go('layout')); await mp.waitForTimeout(1200);
    ok(await mp.evaluate(() => !document.querySelector('.pgcp-layout[data-layout="canvas-living"]') && !document.querySelector('.pgcp-layout[data-layout="canvas-cloud-pages"]') && !!document.querySelector('.pgcp-layout[data-layout="story-living"]')), 'the canvas copies of story templates are no longer in the list (one version each)');
    call('coupleLook', { g: G, coupleKey: ck, layout: 'canvas-night' }); await boot();
    await mp.click('.tkg-nav-item[data-nav=studio]'); await mp.waitForSelector('.pgcp-sheet'); await mp.evaluate(() => PGControl.go('layout')); await mp.waitForTimeout(1500);
    await mp.locator('.pgcp-layout[data-layout="canvas-quiet"]').scrollIntoViewIfNeeded(); await mp.tap('.pgcp-layout[data-layout="canvas-quiet"]'); await mp.waitForSelector('.pgcp-pv');
    ok(await mp.isVisible('.pgcp-pv-own') && (await mp.textContent('.pgcp-pv-apply')) === 'Use the original', 'the template\'s preview offers Use our version and Use the original');
    await mp.waitForTimeout(800); await mp.screenshot({ path: '/tmp/s101_choice.png' });
    await mp.tap('.pgcp-pv-own'); await mp.waitForFunction(() => /^cv-/.test(GALLERY.layout), null, { timeout: 10000 });
    ok(call('getGallery', { g: G }).gallery.layout === c2.id || call('getGallery', { g: G }).gallery.layout === first, 'Use our version applies their copy');
    // step 104: Start fresh — this wedding's saved designs go, the templates are as they were made
    await mp.evaluate(() => PGControl.go('layout')); await mp.waitForSelector('.pgcp-fresh', { timeout: 8000 });
    await mp.locator('.pgcp-fresh').scrollIntoViewIfNeeded(); await mp.screenshot({ path: '/tmp/s104_fresh.png' });
    await mp.tap('.pgcp-fresh'); await mp.waitForFunction(() => GALLERY.layout === '' && !Object.keys(GALLERY.versions || {}).length, null, { timeout: 10000 }); await mp.waitForTimeout(500);
    const after = call('getGallery', { g: G }).gallery;
    ok(after.layout === '' && !Object.keys(after.versions || {}).length && mine().length === 0, 'Start fresh removes the template choices and this wedding\'s copies');
    ok(!(await mp.$('.pgcp-fresh')), 'nothing left to remove: the button goes');
    // step 103: story templates open "Try your photos" (no Advanced editor)
    const ed = await mp.evaluate(() => { const r = {}; const o1 = PGCanvasEditor.open, o2 = window.PGTemplateEditor && PGTemplateEditor.open, o3 = PGHubEditor.open; let who = '';
      PGCanvasEditor.open = () => { who = 'canvas'; }; if (o2) PGTemplateEditor.open = () => { who = 'template'; }; PGHubEditor.open = () => { who = 'hub'; };
      ['story-living', 'tpl-c3', 'tpl-g1'].forEach(id => { who = ''; PGControl.designLayout(id); r[id] = who; });
      PGCanvasEditor.open = o1; if (o2) PGTemplateEditor.open = o2; PGHubEditor.open = o3; return r; });
    ok(Object.values(ed).every(x => x === 'template'), 'step 103: story templates open "Try your photos" only — the real template (' + JSON.stringify(ed) + ')');
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
