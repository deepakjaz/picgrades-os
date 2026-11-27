// Browser test (step 76): the Template Studio's Story (c1–c5) and Minimal (g1–g3) templates inside the app —
// each draws from the wedding's own names, events and photos, scrolls without errors, and keeps the app's header and bar.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'TPLWEDDING0000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['tH', 'Haldi'], ['tS', 'Sangeet'], ['tW', 'Wedding'], ['tR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['TP' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const ONLY = process.argv[2];
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8796, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  const URL = 'http://localhost:8796/g/' + pub.galleryId;
  const boot = async () => { await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(700); };
  const KINDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'g1', 'g2', 'g3'].filter(k => !ONLY || ONLY === k);
  for (const k of KINDS) {
    call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: 'tpl-' + k });
    await pg.goto(URL + '?couple=' + ck); await boot();
    await pg.waitForSelector('.pss-' + k, { timeout: 10000 });
    const info = await pg.evaluate(() => { const r = document.querySelector('.pss'); return { names: r.textContent.includes('Anika'), demo: /Oshin|Vedant|Nani|MAASI/.test(r.textContent), evs: ['Haldi', 'Sangeet', 'Wedding', 'Reception'].filter(n => r.textContent.includes(n)).length, imgs: r.querySelectorAll('img[data-slot]').length, blank: [...r.querySelectorAll('img[data-slot]')].filter(i => i.src.startsWith('data:')).length, nav: !!document.querySelector('.tkg-nav, #pgNav, nav') }; });
    ok(info.names && !info.demo && info.evs === 4 && info.imgs > 3 && info.blank === 0, k + ': names, 4 events, ' + info.imgs + ' photos (blank ' + info.blank + '), no demo words');
    await pg.screenshot({ path: '/tmp/tpl_' + k + '_0.png' });
    if (process.env.DBG) console.log(await pg.evaluate(() => { const r = document.querySelector('.pss'), st = r.querySelector('[data-stage]'); const q = x => { const b = x.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height), getComputedStyle(x).display, getComputedStyle(x).opacity, getComputedStyle(x).visibility].join(','); };
      return { box: q(r.parentElement), root: q(r), stage: st && q(st), sticky: st && q(st.firstElementChild), first: q(r.firstElementChild), scrollY, view: document.body.dataset.view, cls: r.parentElement.className, chain: (() => { let n = r, o = []; while (n && n !== document.body) { o.push(n.id || n.className.slice(0, 30)); n = n.parentElement; } return o.join(' < '); })() }; }));
    for (const y of [300, 700, 1300, 2200]) { await pg.evaluate(y => window.scrollTo(0, y), y); await pg.waitForTimeout(450); }
    await pg.screenshot({ path: '/tmp/tpl_' + k + '_1.png' });
    await pg.evaluate(() => window.scrollTo(0, 99999)); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/tpl_' + k + '_2.png' });
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(200);
  }
  // ---- Control Panel › Hub layout: groups, tap = design straight away ----
  call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: '' });
  await pg.goto(URL + '?couple=' + ck); await boot(); await pg.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 });
  const openLook = async () => { await pg.click('.tkg-nav-item[data-nav=studio]'); await pg.waitForSelector('.pgcp-sheet'); await pg.evaluate(() => PGControl.go('look')); await pg.waitForSelector('.pgcp-lgroup'); await pg.waitForTimeout(300); };
  await openLook();
  const groups = await pg.$$eval('.pgcp-lgroup h5', x => x.map(e => e.textContent));
  // clean-up #8 (Deepak, 25 Nov): Yours first, then Stories and Free canvas; Minimal and the old card layouts are hidden from couples
  ok(JSON.stringify(groups) === '["Yours","Stories","Free canvas"]', 'the couple sees Yours / Stories / Free canvas: ' + groups.join(' / '));
  const inGroup = await pg.evaluate(() => [...document.querySelectorAll('.pgcp-lgroup')].map(g => [...g.querySelectorAll('.pgcp-layout b')].map(b => b.textContent).join(',')));
  ok(inGroup[0] === 'Original Hub' && /^Living Story,Editorial Album,/.test(inGroup[1]) && /Cinema Chapters/.test(inGroup[1]) && /Horizon/.test(inGroup[2]), 'Yours = the Hub in use; Stories and Free canvas list the templates: ' + inGroup.join(' | '));
  ok(!/Magazine Cover|Royal Journey|Widget Home/.test(inGroup.join()), 'Minimal and the old card layouts are hidden from the couple');
  await pg.evaluate(() => document.querySelector('.pgcp-lgroup').scrollIntoView()); await pg.screenshot({ path: '/tmp/tpl_panel.png' });
  // step 97: the Control Panel now opens Darbar Invitation in the ONE editor (through its editor version)
  await pg.evaluate(() => PGControl.designLayout('tpl-c1')); await pg.waitForSelector('.pce .pce-page .pgc-sec', { timeout: 8000 });
  ok(await pg.evaluate(() => PGCanvasEditor.state().src.builtin === 'darbar-invitation'), 'Darbar Invitation opens in the one editor (its editor version)');
  await pg.evaluate(() => { PGCanvasEditor.close(true); window.pgEditorBack = null; });   // opened from the Control Panel: forget its way back
  // the template editor still serves story layouts without an editor version yet — its own checks, opened directly
  await pg.evaluate(() => PGTemplateEditor.open('tpl-c1'));
  await pg.waitForSelector('.pgte .pss-c1', { timeout: 8000 });
  ok(!(await pg.$('.pgcp-pv')) && !(await pg.$('.pgcp-sheet')), 'tapping a template opens its editor straight away (no preview page)');
  await pg.waitForTimeout(600); await pg.screenshot({ path: '/tmp/tpl_ed_photos.png' });
  const slots = await pg.$$eval('.pgte-slot', x => x.length);
  ok(slots >= 5, 'Photos lists every photo of the page: ' + slots);
  // change a photo by tapping it in the preview
  const want = await pg.evaluate(() => GALLERY.events[1].photos[2].id);
  await pg.evaluate(() => { const s = document.querySelector('.pgte-scroll'); s.scrollTop = 1500; }); await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('.pgte-scroll .fold [data-slot]').click());
  await pg.waitForSelector('.pgte-pick'); await pg.screenshot({ path: '/tmp/tpl_ed_pick.png' });
  await pg.click('.pgte-pick [data-id="' + want + '"]'); await pg.waitForTimeout(400);
  const slotK = await pg.evaluate(() => Object.keys(PGTemplateEditor.state().tune.photos || {})[0]);
  ok(slotK && (await pg.evaluate(k => PGTemplateEditor.state().tune.photos[k], slotK)) === want, 'tap a photo → choose another: ' + slotK);
  ok(await pg.evaluate((w) => [...document.querySelectorAll('.pgte-scroll img[data-slot]')].some(i => i.src.includes(w)), want), '…the preview shows it at once');
  // step 79: frame that photo — drag it inside its holder, zoom in
  await pg.evaluate(() => PGTemplateEditor.tab && PGTemplateEditor.tab('photos')); await pg.waitForTimeout(200);
  await pg.click('.pgte-frame[data-frame="' + slotK + '"]'); await pg.waitForSelector('.pgfr .pgfr-hold img');
  await pg.waitForFunction(() => document.querySelector('.pgfr-hold img').naturalWidth > 0);
  await pg.$eval('.pgfr input[type=range]', r => { r.value = '1.6'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  const hb = await pg.locator('.pgfr-hold').boundingBox();
  await pg.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await pg.mouse.down(); await pg.mouse.move(hb.x + hb.width / 2 + 60, hb.y + hb.height / 2 + 40, { steps: 8 }); await pg.mouse.up();
  await pg.screenshot({ path: '/tmp/tpl_frame_sheet.png' });
  await pg.click('.pgfr-done'); await pg.waitForTimeout(500);
  const fr = await pg.evaluate(k => (PGTemplateEditor.state().tune.frame || {})[k], slotK);
  ok(fr && fr.z === 1.6 && fr.fx < 50, 'Frame: the photo moved inside its holder and zoomed ' + JSON.stringify(fr));
  ok(await pg.evaluate(k => { const i = document.querySelector('.pgte-scroll img[data-slot="' + k + '"]'); return i && i.style.scale === '1.6' && /%/.test(i.style.objectPosition); }, slotK), '…the preview shows it framed');
  // colours, parts, words, motion
  await pg.click('[data-tab=colours]'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { const i = document.querySelector('[data-col=bg]'); i.value = '#203040'; i.dispatchEvent(new Event('change')); }); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => getComputedStyle(document.querySelector('.pgte .pss')).getPropertyValue('--bg').trim() === '#203040'), 'a colour changes the page');
  await pg.screenshot({ path: '/tmp/tpl_ed_colours.png' });
  await pg.click('[data-tab=parts]'); await pg.waitForTimeout(200);
  await pg.click('[data-layer="wax-seal"]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => getComputedStyle(document.querySelector('.pgte [data-l="Wax seal"]')).display === 'none'), 'a part can be hidden');
  await pg.screenshot({ path: '/tmp/tpl_ed_parts.png' });
  await pg.click('[data-tab=words]'); await pg.fill('[data-text=names]', 'Ani & Ro'); await pg.press('[data-text=names]', 'Tab'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => document.querySelector('.pgte .pss').textContent.includes('Ani')), 'the names can be reworded');
  await pg.click('.pgte-undo'); await pg.waitForTimeout(300); ok(!(await pg.evaluate(() => PGTemplateEditor.state().tune.names)), 'undo works');
  await pg.click('.pgte-redo'); await pg.waitForTimeout(300);
  // save (not applied), close, open again: the version is still there
  await pg.click('.pgte-save'); await pg.waitForTimeout(600);
  ok(call('getGallery', { g: pub.galleryId, coupleKey: ck }).gallery.versions['tpl-c1'].story.names === 'Ani & Ro', 'Save keeps the version on the server');
  ok(call('getGallery', { g: pub.galleryId, coupleKey: ck }).gallery.layout === '', '…without changing the Hub for guests');
  await pg.click('.pgte-x'); await pg.waitForTimeout(400);
  await pg.evaluate(() => PGTemplateEditor.open('tpl-c1')); await pg.waitForSelector('.pgte .pss-c1');
  const back = await pg.evaluate(() => PGTemplateEditor.state().tune);
  ok(back.names === 'Ani & Ro' && (back.hide || []).includes('wax-seal') && back.colors.light.bg === '#203040' && back.photos[slotK] === want && back.frame && back.frame[slotK] && back.frame[slotK].z === 1.6, 'opening it again brings back everything that was kept, hidden or changed');
  // apply
  await pg.click('.pgte-apply'); await pg.waitForSelector('.pgte', { state: 'detached' }); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => !!document.querySelector('#pgStory .pss-c1') && document.querySelector('#pgStory .pss').textContent.includes('Ani & Ro')), 'Apply: the Hub is the couple\'s version now');
  ok(await pg.evaluate(() => GALLERY.layout === 'custom' && GALLERY.custom.base === 'tpl-c1'), '…saved as the wedding\'s Hub');
  await pg.screenshot({ path: '/tmp/tpl_applied.png' });
  await openLook();
  ok(await pg.evaluate(() => !document.querySelector('.pgcp-layout[data-layout="custom"]')), 'a designed template is not shown as "Our own Hub"');
  // a card layout opens the free editor (step 77d), every card in its place
  await pg.evaluate(() => PGControl.designLayout('magazine-cover'));   // clean-up #8: Minimal layouts are hidden from couples; open it the way Edit does await pg.waitForSelector('.pce .pgc-cardhost .pgl-b'); await pg.waitForTimeout(300);
  ok((await pg.textContent('.pce-title b')) === 'Magazine Cover' && (await pg.evaluate(() => PGCanvasEditor.state().doc.sections[0].els.every(e => e.t === 'card'))), 'a card layout opens the free editor, its cards placed as they were');
  await pg.evaluate(() => PGCanvasEditor.close(true)); await pg.waitForTimeout(300);
  // a guest sees the applied template with the chosen photo, and no versions
  const gp = await ctx.newPage(); gp.on('pageerror', e => errors.push(e.message)); await gp.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('1') }));
  await gp.goto(URL); await gp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await gp.waitForSelector('#pgStory .pss-c1', { timeout: 10000 });
  ok(await gp.evaluate(w => !GALLERY.versions && [...document.querySelectorAll('#pgStory img[data-slot]')].some(i => i.src.includes(w)) && !document.querySelector('[data-l="Wax seal"]:not(.pss-hide)'), want), 'a guest sees the couple\'s version (their photo, the seal hidden) and never the saved versions');
  await gp.close();
  // narrow phone: no sideways scrolling
  const np = await (await b.newContext({ viewport: { width: 360, height: 740 } })).newPage(); np.on('pageerror', e => errors.push(e.message));
  await np.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('2') })); await require('./fonts_local').install(np);
  await np.goto(URL); await np.waitForSelector('#pgStory .pss-c1', { timeout: 10000 }); await np.waitForTimeout(600);
  ok(await np.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'a 360 px phone: nothing sticks out sideways');
  await np.screenshot({ path: '/tmp/tpl_360.png' });
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
