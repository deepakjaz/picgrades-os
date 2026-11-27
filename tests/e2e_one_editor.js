// Browser test (step 97): the ONE editor — every layout opens in it (story layouts through their editor version); the approved top bar,
// the six tools, a part's Design / Motion / Connect, the motion library with direction, elements, Media photos, colour sets, Simple grid, Collections, saving.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'ONEEDITORWEDDING0097';
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
}).listen(8922, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8922/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    await pg.goto(URL + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForFunction(() => window.PGControl && PGControl.role() === 'couple', null, { timeout: 10000 });
    const S = () => pg.evaluate(() => PGCanvasEditor.state());
    // a story layout opens in the one editor, through its editor version
    ok(await pg.evaluate(() => { const l = PGLayout.find('story-living'); return !!(l && l.story && l.editor === 'canvas-living'); }), 'Living Story is linked to its editor version');
    await pg.evaluate(() => PGCanvasEditor.open('story-living')); await pg.waitForSelector('.pce .pce-page .pgc-sec');
    ok((await S()).doc.name === 'Living Story (editor)' && (await S()).src.builtin === 'canvas-living', 'the story layout opens in the one editor');
    await pg.evaluate(() => { PGCanvasEditor.close(true); PGControl.designLayout('tpl-g3'); }); await pg.waitForSelector('.pgte', { timeout: 8000 });   // step 101 (changed): its own template editor
    ok(await pg.evaluate(() => !document.querySelector('.pce') && PGTemplateEditor.state().id === 'tpl-g3'), 'a story template (Alabaster Gallery) opens in its own template editor from the Control Panel (no canvas copy)');
    await pg.evaluate(() => { PGTemplateEditor.close(true); window.pgEditorBack = null; });
    await pg.evaluate(() => { PGCanvasEditor.close(true); window.pgEditorBack = null; PGCanvasEditor.open('story-living'); }); await pg.waitForSelector('.pce .pce-page .pgc-sec');
    ok(await pg.evaluate(() => [...document.querySelectorAll('.pce-tabs [data-tab]')].map(b => b.dataset.tab).join() === 'add,layers,page,collections,theme,media' && document.querySelectorAll('.pce-tabs [data-tab] svg').length === 6), 'six tools with line icons: Add, Layers, Pages, Collections, Theme, Media');
    // tap a photo: its Design opens
    const tapEl = async (p, id) => { const r = await p.evaluate(id => { const n = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]'); n.scrollIntoView({ block: 'center' }); const b = n.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, id); await p.mouse.click(r.x, r.y); await p.waitForTimeout(250); };
    const nm = (await S()).doc.sections[0].els.find(e => e.t === 'names');
    await tapEl(pg, nm.id);
    ok((await S()).sel === nm.id && (await S()).tab === 'style' && (await S()).sub === 'design', 'tapping a part on the page opens its Design');
    await pg.click('[data-tab=add]'); await pg.click('.pce-pane [data-add=photo]'); await pg.waitForTimeout(200);
    const st0 = await S(), ph = st0.doc.sections.flatMap(s => s.els).find(e => e.id === st0.sel);
    ok(ph && ph.t === 'photo', 'Add → Photo puts a photo on the page, selected');
    await pg.evaluate(() => PGCanvasEditor.select(null)); await tapEl(pg, ph.id);
    ok((await S()).sel === ph.id && (await S()).tab === 'style' && (await S()).sub === 'design' && await pg.isVisible('.pce-subtabs [data-sub=motion]'), 'tapping a part opens its Design, with Motion and Connect next to it');
    ok(await pg.isVisible('.pce-pane [data-pick=el]') && await pg.isVisible('.pce-pane [data-do=frame]'), 'a photo can be changed and moved inside its frame from Design');
    // motion library: Spin, then Bounce from the left, stronger
    await pg.click('[data-sub=motion]'); await pg.click('[data-mt=spin]'); await pg.waitForTimeout(150);
    const elOf = async id => (await S()).doc.sections.flatMap(s => s.els).find(e => e.id === id);
    ok((await elOf(ph.id)).m === 'spin', 'the Spin tile sets the motion');
    await pg.click('[data-mt=bounce]'); await pg.click('.pce-pane [data-k=mdir] [data-v=left]'); await pg.waitForTimeout(150);
    await pg.evaluate(() => { const r = document.querySelector('.pce-pane [data-mo=str]'); r.value = '80'; r.dispatchEvent(new Event('change', { bubbles: true })); });
    let e1 = await elOf(ph.id); ok(e1.m === 'bounce' && e1.mo && e1.mo.dir === 'left' && e1.mo.str === 80, 'Bounce, from the left, strength 80 ' + JSON.stringify(e1.mo));
    ok(await pg.evaluate(id => { const n = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]'); return n.classList.contains('pgc-m-bounce') && n.style.getPropertyValue('--mx') === '-1' && n.style.getPropertyValue('--str') === '1.60'; }, ph.id), 'the page draws it with its direction and strength');
    await pg.click('[data-mt=slide]'); await pg.click('.pce-pane [data-k=mdir] [data-v=top]'); await pg.waitForTimeout(100);
    ok((await elOf(ph.id)).m === 'drop', 'Slide from above is the existing "drop" motion (no duplicates)');
    await pg.click('[data-mt=spin]');
    // Media: tap a wedding photo to put it in the selected photo
    await pg.click('[data-tab=media]'); await pg.waitForSelector('.pce-mrow [data-photo]');
    const pid = await pg.getAttribute('.pce-mrow [data-photo] >> nth=2', 'data-photo'); await pg.click('.pce-mrow [data-photo] >> nth=2'); await pg.waitForTimeout(150);
    ok((await elOf(ph.id)).src.id === pid, 'Media: a tapped photo goes into the selected photo');
    // Add: the elements library
    await pg.click('.pce-pane [data-do=deselect]').catch(() => {}); await pg.evaluate(() => PGCanvasEditor.select(null)); await pg.click('[data-tab=add]');
    await pg.waitForSelector('.pce-els [data-art]'); await pg.click('.pce-chips [data-occ=babyshower]'); await pg.waitForTimeout(100);
    ok(await pg.locator('.pce-els [data-art]').count() === 26, 'Add shows the 26 baby shower elements (the Baby shower chip)');
    await pg.click('.pce-chips [data-occ=decor]'); await pg.waitForTimeout(100); ok(await pg.locator('.pce-els [data-art]').count() === 16, '…and the 16 decorations of the rebuilt story templates (the Decor chip)');
    await pg.click('.pce-chips [data-occ=all]'); await pg.waitForTimeout(100);
    await pg.fill('.pce-elq', 'teddy'); await pg.waitForTimeout(150); ok(await pg.locator('.pce-els [data-art]').count() === 1, 'search finds the teddy');
    await pg.click('.pce-els [data-art=bs-teddy-brown]'); await pg.waitForTimeout(200);
    const art = (await S()).doc.sections.flatMap(s => s.els).find(e => e.t === 'art');
    ok(art && art.src.id === 'bs-teddy-brown' && art.src.o === 'babyshower' && (await S()).sel === art.id, 'tapping it adds the element to the page, selected');
    ok(await pg.evaluate(id => { const i = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"] img'); return !!i && /\/app\/elements\/babyshower\/bs-teddy-brown\.webp$/.test(i.src); }, art.id), 'the element draws its picture');
    await pg.click('[data-sub=motion]'); await pg.click('[data-mt=swing]'); await pg.waitForTimeout(100);
    // Theme: a colour set
    await pg.click('[data-tab=theme]'); await pg.click('[data-pal="2"]'); await pg.waitForTimeout(100);
    ok((await S()).doc.colors.acc === '#6f8f72', 'Theme: a colour set changes the layout colours');
    // Simple mode: grid on the page, columns per section
    await pg.click('.pce-more-btn'); await pg.click('.pce-snap [data-snap=simple]'); await pg.waitForTimeout(200);
    ok((await S()).snap === 'simple' && await pg.locator('.pce-page .pce-sgrid').count() > 0, 'Simple shows the grid on the page');
    await pg.click('[data-tab=page]'); await pg.evaluate(() => { const i = document.querySelector('.pce-pane [data-grid=c]'); i.value = '3'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await pg.waitForTimeout(150);
    ok((await S()).doc.sections.some(s => s.grid && s.grid.c === 3), 'Pages: the section gets 3 columns');
    await pg.screenshot({ path: '/tmp/s97_laptop_simple.png' });
    await pg.click('.pce-more-btn'); await pg.click('.pce-snap [data-snap=free]');
    // Collections: ready layouts open here
    await pg.click('[data-tab=collections]'); await pg.waitForSelector('.pce-cols [data-open]');
    ok(await pg.locator('.pce-cols [data-open="story-living"]').count() === 1 && await pg.locator('.pce-cols [data-open="magazine-cover"]').count() === 1, 'Collections lists ready layouts (story and card layouts too)');
    // Save keeps the new parts (the backend cleaner lets them through)
    await pg.click('.pce-save'); /* step 101: no name / collection question — saved as the wedding's copy */ await pg.waitForFunction(() => PGCanvasEditor.state().src.id, null, { timeout: 8000 });
    const saved = call('canvasGet', { g: pub.galleryId, coupleKey: ck, id: (await S()).src.id });
    const sEls = (saved.doc || { sections: [] }).sections.flatMap(s => s.els);
    ok(sEls.some(e => e.t === 'art' && e.src.id === 'bs-teddy-brown' && e.m === 'swing') && sEls.some(e => e.id === ph.id && e.m === 'spin') && saved.doc.sections.some(s => s.grid && s.grid.c === 3), 'saved: the element, the new motions and the grid all kept ' + (saved.error || ''));
    await pg.evaluate(() => PGCanvasEditor.close(true)); await ctx.close();

    // ---- phone: the top bar fits one row; the drawer; screenshots ----
    for (const [w, hgt] of [[375, 667], [390, 844]]) {
      const c2 = await b.newContext({ viewport: { width: w, height: hgt }, hasTouch: true, isMobile: true }), mp = await c2.newPage();
      mp.on('pageerror', e => errors.push(e.message));
      await mp.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
      await require('./fonts_local').install(mp);
      await mp.goto(URL + '?couple=' + ck); await mp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple', null, { timeout: 10000 });
      // step 101: opening the template now opens the wedding's saved copy (made above); this part checks the phone toolbar, so it opens the untouched template
      await mp.evaluate(() => PGCanvasEditor.open({ doc: PGLayout.find('canvas-living').canvas })); await mp.waitForSelector('.pce .pce-page .pgc-sec'); await mp.waitForTimeout(400);
      const top = await mp.evaluate(() => { const t = document.querySelector('.pce-top'), bs = [...t.querySelectorAll(':scope > button, :scope > .pce-more > button')].filter(x => x.offsetParent); return { h: t.getBoundingClientRect().height, one: new Set(bs.map(x => Math.round(x.getBoundingClientRect().top))).size === 1, inside: bs.every(x => x.getBoundingClientRect().right <= innerWidth + 0.5), tall: bs.every(x => x.getBoundingClientRect().height >= 44), n: bs.length }; });
      ok(top.one && top.inside && top.tall, w + ' px: ‹ undo redo ⋯ ▶ Apply fit one row, 44 px each ' + JSON.stringify(top));
      if (w === 390) await mp.screenshot({ path: '/tmp/s97_phone_closed.png' });
      const ph2 = (await mp.evaluate(() => PGCanvasEditor.state().doc.sections[0].els.find(e => e.t === 'names'))).id;
      await mp.evaluate(id => document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').scrollIntoView({ block: 'center' }), ph2);
      await mp.tap('.pce-page .pgc-el[data-el="' + ph2 + '"]'); await mp.waitForTimeout(400);
      const d = await mp.evaluate(id => { const p = document.querySelector('.pce-panel').getBoundingClientRect(), n = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').getBoundingClientRect(); return { open: document.querySelector('.pce').classList.contains('pce-drawer-open'), share: p.height / innerHeight, above: n.top < p.top }; }, ph2);
      ok(d.open && d.share <= 0.41 && d.above, w + ' px: tapping a part opens the drawer (≤ 40 % of the screen) and the part stays above it ' + JSON.stringify(d));
      if (w === 390) { await mp.screenshot({ path: '/tmp/s97_phone_design.png' }); await mp.tap('[data-sub=motion]'); await mp.waitForTimeout(200); await mp.screenshot({ path: '/tmp/s97_phone_motion.png' });
        await mp.evaluate(() => { PGCanvasEditor.select(null); PGCanvasEditor.tab('add'); }); await mp.waitForSelector('.pce-els [data-art]'); await mp.waitForTimeout(300); await mp.screenshot({ path: '/tmp/s97_phone_add.png' });
        await mp.tap('.pce-more-btn'); await mp.waitForTimeout(150); await mp.screenshot({ path: '/tmp/s97_phone_menu.png' }); }
      await c2.close();
    }
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
