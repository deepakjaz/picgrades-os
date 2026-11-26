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
  await pg.evaluate(() => document.querySelector('.pgcp-canvas').click());   // layouts screen (clean-up #8): these staff-only buttons are hidden for couples; the test still uses them await pg.waitForSelector('.pce .pce-page .pgc-sec');
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
  await pg.click('.pce [data-tab=page]'); await pg.click('.pce-mode [data-mode=p]');   // F2b: the Phone/Laptop switch lives in the Page tab await pg.waitForTimeout(300);
  ok((await S()).mode === 'p' && await pg.evaluate(() => document.querySelector('.pce-page').offsetWidth === 390), 'Phone shows the 390-wide phone page');
  // add a Find me button
  const before = new Set((await S()).doc.sections.flatMap(s => s.els).map(e => e.id));
  await pg.click('[data-tab=add]'); await pg.click('[data-add=action][data-v=findme]'); await pg.waitForTimeout(200);
  const st = await S(), fm = st.doc.sections.flatMap(s => s.els).find(e => e.t === 'action' && e.act === 'findme' && !before.has(e.id));
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
  const heads = await pg.evaluate(() => [...document.querySelectorAll('.pgcp-lgroup h5')].map(h => h.textContent));
  ok(heads[0] === 'Our layouts' && heads.indexOf('Stories') > 0, 'saved layouts come first in Hub layout: ' + heads.slice(0, 3).join(' / '));
  await pg.click('.pgcp-layout[data-layout="' + lay.id + '"]'); await pg.waitForFunction(() => window.PGCanvasEditor && PGCanvasEditor.state() && PGCanvasEditor.state().doc);
  ok(await pg.evaluate(() => PGCanvasEditor.state().doc.name === 'Our evening' && PGCanvasEditor.state().src.mine), 'tap it: it opens in the editor with everything kept');
  await pg.evaluate(() => PGCanvasEditor.close(true)); await pg.waitForTimeout(300);
  // a ready layout applies unchanged (the phase 1 bug)
  await pg.evaluate(() => PGCanvasEditor.open('canvas-quiet')); await pg.waitForSelector('.pce .pgc-sec');
  await pg.click('.pce-apply'); await pg.waitForSelector('.pce', { state: 'detached' }); await pg.waitForTimeout(600);
  ok(call('getGallery', { g: pub.galleryId }).gallery.layout === 'canvas-quiet', 'a ready free layout (Quiet Portrait) applies');
  // step 77d: a Minimal (card) layout opens in the free editor with every card where it was, phone and laptop
  call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: 'magazine-cover' });
  await pg.goto(URL + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1200); await pg.screenshot({ path: '/tmp/ce_grid_original.png' });
  await pg.evaluate(() => PGCanvasEditor.open('magazine-cover')); await pg.waitForSelector('.pce .pgc-cardhost .pgl-b'); await pg.waitForTimeout(600);
  const conv = await pg.evaluate(() => { const d = PGCanvasEditor.state().doc, els = d.sections[0].els; return { n: els.length, cards: els.every(e => e.t === 'card'), both: els.filter(e => !e.p.hide && e.l && !e.l.hide).length, drawn: document.querySelectorAll('.pce .pgc-cardhost .pgl-b').length }; });
  ok(conv.n >= 3 && conv.cards && conv.both >= 3 && conv.drawn >= 3, 'Magazine Cover opens in the free editor: its cards, placed for phone and laptop ' + JSON.stringify(conv));
  await pg.screenshot({ path: '/tmp/ce_grid_laptop.png' });
  // move one card, apply: it is saved as the couple's own free layout and guests see the cards
  const c0 = await pg.evaluate(() => PGCanvasEditor.state().doc.sections[0].els[0].id);
  await pg.evaluate(id => PGCanvasEditor.select(id), c0); await pg.waitForSelector('.pce-sel');
  await pg.evaluate(() => { const i = document.querySelector('.pce-pane [data-sp="y"]'); i.value = String(+i.value + 30); i.dispatchEvent(new Event('change')); });
  await pg.click('.pce-apply'); await pg.waitForSelector('.pce-sgo'); await pg.fill('.pce-sname', 'Our magazine'); await pg.click('.pce-sgo');
  await pg.waitForSelector('.pce', { state: 'detached' }); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => /^cv-/.test(GALLERY.layout) && document.querySelectorAll('#pgStory .pgc-cardhost .pgl-b').length >= 3), 'Apply: the changed Magazine Cover is the couple\'s own layout; the Hub shows its cards');
  const gp = await ctx.newPage(); gp.on('pageerror', e => errors.push(e.message)); await gp.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('4') }));
  await gp.goto(URL); await gp.waitForSelector('#pgStory .pgc', { timeout: 10000 }); await gp.waitForTimeout(800);
  ok(await gp.evaluate(() => document.querySelectorAll('#pgStory .pgc-cardhost .pgl-b').length >= 3), 'a guest sees the cards too');
  await gp.screenshot({ path: '/tmp/ce_grid_guest_laptop.png' }); await gp.close();
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
  // ---- phase 3: zoom-out, Play, motion, stay, header, typing on the page, drag between sections
  await mp.tap('.pce-zoom-toggle'); await mp.tap('.pce-zoom-menu [data-z="-"]'); await mp.tap('.pce-zoom-toggle'); await mp.tap('.pce-zoom-menu [data-z="-"]'); await mp.waitForTimeout(200);
  ok(await mp.evaluate(() => PGCanvasEditor.state().zoom < 1 && document.querySelector('.pce-page').getBoundingClientRect().width < 380), 'zoom out: the page draws smaller');
  await mp.tap('.pce-zoom-toggle'); await mp.tap('.pce-zoom-menu [data-z="1"]'); await mp.waitForTimeout(150);
  // motion on the selected element
  await mp.tap('[data-tab=style]').catch(() => {}); await mp.waitForTimeout(150);
  const hasM = await mp.evaluate(() => !!document.querySelector('.pce [data-f="m"]'));
  if (hasM) { await mp.selectOption('.pce [data-f="m"]', 'rise'); await mp.waitForTimeout(200); }
  ok(hasM && await mp.evaluate(id => PGCanvasEditor.state().doc.sections[0].els.find(e => e.id === id).m === 'rise', el0), 'motion: pick "rise" for a part');
  await mp.tap('.pce-play'); await mp.waitForTimeout(1600);
  ok(await mp.evaluate(() => PGCanvasEditor.state().play && document.querySelectorAll('.pce-page .pgc-e.in').length > 0), 'Play: the motion plays in the editor');
  await mp.screenshot({ path: '/tmp/ce_play.png' });
  await mp.tap('.pce-play'); await mp.waitForTimeout(300);
  ok(await mp.evaluate(() => !PGCanvasEditor.state().play), 'Stop: back to editing');
  // section stay + header
  await mp.tap('[data-tab=page]'); await mp.waitForTimeout(200);
  const stay = await mp.evaluate(() => { const r = document.querySelector('.pce [data-sec="stay"]'); if (!r) return null; r.value = '400'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); return true; });
  await mp.waitForTimeout(300);
  ok(stay && await mp.evaluate(() => PGCanvasEditor.state().doc.sections.some(s => +s.stay === 400) && !!document.querySelector('.pce-page .pgc-staynote')), 'a section can stay on screen while scrolling');
  const hdrB = await mp.$('[data-k="hdr-header"] [data-v="right"]') || await mp.$('[data-k="hdr-header"] button:last-child');
  if (hdrB) { await hdrB.tap(); await mp.waitForTimeout(200); }
  ok(!!hdrB && await mp.evaluate(() => PGCanvasEditor.state().pages.header === 'right'), 'header: logo moved right from the editor');
  await mp.screenshot({ path: '/tmp/ce_page_hdr.png' });
  // typing on the page: tap a names/text part twice
  const tid = await mp.evaluate(() => { const s = PGCanvasEditor.state(); for (const sec of s.doc.sections) for (const e of sec.els) if (['names', 'text'].includes(e.t) && !(e.p && e.p.hide)) return e.id; return null; });
  if (tid) { await mp.evaluate(id => document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').scrollIntoView({ block: 'center' }), tid); await mp.waitForTimeout(200);
    await mp.tap('.pce-page .pgc-el[data-el="' + tid + '"]'); await mp.waitForTimeout(250); await mp.tap('.pce-page .pgc-el[data-el="' + tid + '"]'); await mp.waitForTimeout(300); }
  const typing = await mp.evaluate(() => !!document.querySelector('.pce-page .pce-typing'));
  ok(!!tid && typing, 'second tap on words: type straight on the page');
  if (typing) { await mp.keyboard.press('End'); await mp.keyboard.type(' x'); await mp.screenshot({ path: '/tmp/ce_typing.png' });
    await mp.evaluate(() => document.querySelector('.pce-page .pce-typing').blur()); await mp.waitForTimeout(300);
    ok(await mp.evaluate(id => { for (const sec of PGCanvasEditor.state().doc.sections) for (const e of sec.els) if (e.id === id) return /x$/.test(e.text || ''); return false; }, tid), 'typed words are kept'); }
  // drag between sections (mouse on a laptop-size page)
  const lp = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage(); lp.on('pageerror', e => errors.push(e.message));
  await lp.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('3') })); await require('./fonts_local').install(lp);
  await lp.goto(URL + '?couple=' + ck); await lp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await lp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple');
  await lp.evaluate(() => PGCanvasEditor.open('canvas-quiet')); await lp.waitForSelector('.pce .pgc-sec'); await lp.waitForTimeout(600);
  const mv = await lp.evaluate(() => { const s = PGCanvasEditor.state(); if (s.doc.sections.length < 2) return null; const e = s.doc.sections[0].els.find(x => !(x.p && x.p.hide) && x.t !== 'photo') || s.doc.sections[0].els[0]; const n = document.querySelector('.pce-page .pgc-el[data-el="' + e.id + '"]'); n.scrollIntoView({ block: 'center' }); return e.id; });
  await lp.waitForTimeout(300);
  let moved = false;
  if (mv) {
    const r0 = await lp.evaluate(id => { const r = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + Math.min(20, r.height / 2) }; }, mv);
    const s1 = await lp.evaluate(() => document.querySelectorAll('.pce-page .pgc-sec')[1].getBoundingClientRect().top);
    await lp.mouse.click(r0.x, r0.y); await lp.waitForTimeout(200);   // clean-up #2: the first click only selects — then drag
    await lp.mouse.move(r0.x, r0.y); await lp.mouse.down(); await lp.mouse.move(r0.x, r0.y + 20, { steps: 3 });
    const target = Math.min(s1 + 120, 820); await lp.mouse.move(r0.x, target, { steps: 12 }); await lp.waitForTimeout(150); await lp.mouse.up(); await lp.waitForTimeout(400);
    moved = await lp.evaluate(id => PGCanvasEditor.state().doc.sections[1].els.some(e => e.id === id), mv);
  }
  ok(moved, 'drag a part into the next section');
  await lp.screenshot({ path: '/tmp/ce_between.png' });
  // step 79: frame a photo inside its holder — tap it twice, drag, zoom
  const ph = await lp.evaluate(() => { const s = PGCanvasEditor.state(); for (const sec of s.doc.sections) for (const e of sec.els) if (e.t === 'photo') { document.querySelector('.pce-page .pgc-el[data-el="' + e.id + '"]').scrollIntoView({ block: 'center' }); return e.id; } return null; });
  await lp.waitForTimeout(300);
  const pc = await lp.evaluate(id => { const r = document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, ph);
  await lp.mouse.click(pc.x, pc.y); await lp.waitForTimeout(250); await lp.mouse.click(pc.x, pc.y); await lp.waitForTimeout(300);
  ok(await lp.evaluate(id => PGCanvasEditor.state().frame === id && !!document.querySelector('.pce-sel.pce-framing'), ph), 'second tap on a photo: framing (like Photo Edits)');
  const sp0 = await lp.evaluate(id => { for (const sec of PGCanvasEditor.state().doc.sections) for (const e of sec.els) if (e.id === id) return JSON.stringify(e.p) + JSON.stringify(e.l || {}); }, ph);
  await lp.mouse.move(pc.x, pc.y); await lp.mouse.down(); await lp.mouse.move(pc.x + 50, pc.y + 40, { steps: 8 }); await lp.mouse.up(); await lp.waitForTimeout(300);
  await lp.$eval('.pce [data-s="zm"]', r => { r.value = '1.8'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }); await lp.waitForTimeout(300);
  const fs1 = await lp.evaluate(id => { for (const sec of PGCanvasEditor.state().doc.sections) for (const e of sec.els) if (e.id === id) return { s: Object.assign({}, e.s, e.sl || {}), sp: JSON.stringify(e.p) + JSON.stringify(e.l || {}) }; }, ph);
  ok(fs1.s.fx < 50 && +fs1.s.zm === 1.8 && fs1.sp === sp0, 'dragging moves the photo inside its frame (the frame stays put) and zoom goes closer ' + JSON.stringify({ fx: fs1.s.fx, fy: fs1.s.fy, zm: fs1.s.zm }));
  ok(await lp.evaluate(id => document.querySelector('.pce-page .pgc-el[data-el="' + id + '"] img').style.scale === '1.8', ph), '…the page shows it zoomed');
  await lp.screenshot({ path: '/tmp/ce_frame.png' });
  // Step 84: both Gemini story documents open in the free editor at laptop width.
  for (const [id, shot] of [['canvas-living', '/tmp/ce_step84_living_laptop.png'], ['canvas-editorial', '/tmp/ce_step84_editorial_laptop.png']]) {
    await lp.evaluate(() => PGCanvasEditor.close(true)); await lp.waitForFunction(() => !PGCanvasEditor.state());   // the editor ignores open() while another layout is open
    await lp.evaluate(id => PGCanvasEditor.open(id), id); await lp.waitForSelector('.pce .pgc-sec'); await lp.waitForTimeout(500);
    const state = await lp.evaluate(() => ({ name: PGCanvasEditor.state().doc.name, sections: PGCanvasEditor.state().doc.sections.length, pageWidth: document.querySelector('.pce-page').getBoundingClientRect().width }));
    ok(state.name === (id === 'canvas-living' ? 'Living Story (editor)' : 'Editorial Album (editor)') && state.sections > 0 && state.pageWidth > 390, 'step 84 laptop: ' + id + ' opens in the free editor ' + JSON.stringify(state));
    await lp.screenshot({ path: shot, fullPage: true }); await lp.evaluate(() => PGCanvasEditor.close(true)); await lp.waitForTimeout(150);
  }
  await lp.close();
  // Step 84: phone width also opens both story documents without a page error.
  for (const [id, shot] of [['canvas-living', '/tmp/ce_step84_living_phone.png'], ['canvas-editorial', '/tmp/ce_step84_editorial_phone.png']]) {
    await mp.evaluate(() => PGCanvasEditor.close(true)); await mp.waitForFunction(() => !PGCanvasEditor.state());   // the editor ignores open() while another layout is open
    await mp.evaluate(id => PGCanvasEditor.open(id), id); await mp.waitForSelector('.pce .pgc-sec'); await mp.waitForTimeout(450);
    const state = await mp.evaluate(() => ({ name: PGCanvasEditor.state().doc.name, sections: PGCanvasEditor.state().doc.sections.length, viewport: document.documentElement.clientWidth, pageWidth: document.querySelector('.pce-page').getBoundingClientRect().width }));
    ok(state.name === (id === 'canvas-living' ? 'Living Story (editor)' : 'Editorial Album (editor)') && state.sections > 0 && state.viewport <= 430 && state.pageWidth <= 390, 'step 84 phone: ' + id + ' opens in the free editor ' + JSON.stringify(state));
    await mp.screenshot({ path: shot, fullPage: true }); await mp.evaluate(() => PGCanvasEditor.close(true)); await mp.waitForTimeout(150);
  }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
