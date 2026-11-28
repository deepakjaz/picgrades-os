// Browser test (step 113, Deepak's fix pass, 28 Nov):
//   · one "Yours" list (no separate "Your layouts"); the six old templates are not shown; "Minimal and older" starts closed
//   · the Advanced editor is off for everyone, PicGrades too, until turned on; then Try your photos has a switch to it and back
//   · a phone preview draws the template at the frame's own width (no zoom — the design filled only part of the frame)
//   · the Make something drawer of Cloud Pages: three tiles the same size, photos inside them
//   · the "being prepared" page: the sign-in sheet opens on top; the guest link offers the photographer and PicGrades links
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'FIXPASSWEDDINGHUB00113';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['fH', 'Haldi'], ['fS', 'Sangeet'], ['fW', 'Wedding']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['FP' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const G = pub.galleryId, ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
// a second wedding that stays a Draft (the "being prepared" page)
global.__autoPublish = false;
const W2 = 'FIXPASSDRAFTWEDDING0113'; DRIVE.folders[W2] = { name: W2, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W2 + 'h'] = { name: 'Haldi', parent: W2 };
for (let i = 0; i < 4; i++) DRIVE.files['FD' + i] = { name: 'd' + i + '.jpg', parent: W2 + 'h', mime: 'image/jpeg' };
const q = call('queue', { token: admin }).recentDone, draft = call('setGallery', { token: admin, orderId: (q[1] || q[0]).orderId, folderUrl: W2, title: 'Riya & Arjun' }).galleryId;
global.__autoPublish = true;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const OLD = ['bs-oh-baby-scroll', 'bs-oh-baby-story', 'bs-oh-baby-minimal', 'bento-concierge', 'archive-monograph', 'modern-pavilion'];

const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : u.endsWith('.webp') ? 'image/webp' : 'text/javascript'); res.end(d); } });
}).listen(8938, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const BASE = 'http://localhost:8938';
  const page = async (store) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }), pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await pg.route('**fonts.g**', r => r.abort());
    if (store) await pg.addInitScript(s => { Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); }, store);
    return pg;
  };
  const toLayouts = async pg => { await pg.click('.tkg-nav-item[data-nav=studio]'); await pg.waitForSelector('.pgcp-sheet'); await pg.waitForTimeout(300); await pg.evaluate(() => PGControl.go('layout')); await pg.waitForSelector('.pgcp-layout[data-layout="canvas-quiet"]'); await pg.waitForTimeout(500); };
  try {
    // ---- 1. PicGrades (Advanced editor still off for this wedding) ----
    const st = await page({ pg_token: admin });
    await st.goto(BASE + '/pg/' + G); await st.waitForSelector('#pgBoot.hide', { state: 'attached' });
    await st.waitForFunction(() => window.PGControl && PGControl.role() === 'picgrades', null, { timeout: 10000 });
    ok(await st.evaluate(() => PGControl.advanced() === false), 'PicGrades too: the Advanced editor is off until it is turned on');
    await toLayouts(st);
    const lists = await st.evaluate(() => [...document.querySelectorAll('.pgcp-layouts .pgcp-lgroup h5')].map(x => x.textContent));
    ok(!lists.includes('Your layouts') && lists.filter(x => x === 'Yours').length <= 1, 'one "Yours" list, no separate "Your layouts" (' + lists.join(' / ') + ')');
    ok(await st.evaluate(old => old.every(id => !document.querySelector('.pgcp-layout[data-layout="' + id + '"]')), OLD), 'the six old templates are shown to no one (PicGrades included)');
    const fold = await st.evaluate(() => { const d = [...document.querySelectorAll('details.pgcp-lfold')].find(x => /Minimal and older/.test(x.textContent)); return d ? { open: d.open, h: d.querySelector('summary').getBoundingClientRect().height } : null; });
    ok(fold && !fold.open && fold.h >= 44, '"Minimal and older" starts closed (tap to open)');
    // the design kit does not offer parts of the old templates either
    ok(await st.evaluate(old => PGTune.kits().every(k => old.indexOf(k.id) < 0), OLD), 'the old templates are not in the design kit');
    // Try your photos on a canvas template: no switch while the Advanced editor is off
    await st.evaluate(() => { document.querySelector('.pgcp-sheet') && document.querySelector('.pgcp-sheet').remove(); document.documentElement.classList.remove('pgcp-open'); document.querySelectorAll('.overlay-backdrop.show').forEach(x => x.remove()); PGTemplateEditor.open('canvas-quiet'); });
    await st.waitForSelector('.pgte'); await st.waitForTimeout(600);
    ok(await st.evaluate(() => !document.querySelector('.pgte-mode') && !/Open the Advanced editor/.test(document.querySelector('.pgte').textContent)), 'Advanced off: Try your photos has no switch to it');
    await st.evaluate(() => PGTemplateEditor.close(true));
    // turn it on (PicGrades' switch for this wedding)
    call('setAdvanced', { token: admin, g: G, on: true }); await st.evaluate(() => { GALLERY.advanced = true; PGTemplateEditor.open('canvas-quiet'); }); await st.waitForSelector('.pgte-mode'); await st.waitForTimeout(400);
    const sw = await st.evaluate(() => { const mb = document.querySelector('.pgte-modebtn'), r = mb.getBoundingClientRect(), p = mb.closest('.pgte-title').getBoundingClientRect(); return { t: mb.textContent, fits: r.right <= p.right + 1 && r.left >= p.left - 1, hit: r.height + 22 >= 44 }; });
    ok(/Try your photos/.test(sw.t) && sw.fits && sw.hit, 'Advanced on: a "Try your photos ▾" switch under the name (like PicGrades ↔ Guest), fits the top bar');
    await st.tap('.pgte-modebtn'); await st.waitForTimeout(200);
    const mm = await st.evaluate(() => { const m = document.querySelector('.pgte-modemenu'), a = m.querySelector('.pgte-adv'), r = a.getBoundingClientRect(); return { open: !m.hidden && document.elementFromPoint(r.left + 20, r.top + r.height / 2) === a, items: [...m.querySelectorAll('button')].map(b => [b.textContent, b.getBoundingClientRect().height, b.classList.contains('on')]) }; });
    ok(mm.open && mm.items.length === 2 && mm.items[0][2] && /Advanced/.test(mm.items[1][0]) && mm.items.every(i => i[1] >= 44), '… it opens: Try your photos ✓ / Advanced editor');
    await st.screenshot({ path: '/tmp/s113_switch.png' });
    await st.tap('.pgte-mode .pgte-adv'); await st.waitForSelector('.pce'); await st.waitForFunction(() => PGCanvasEditor.state() && PGCanvasEditor.state().doc, null, { timeout: 10000 });
    ok(await st.evaluate(() => !document.querySelector('.pgte') && !!document.querySelector('.pce')), 'Advanced opens the Advanced editor');
    await st.tap('.pce-more-btn'); await st.waitForTimeout(200);
    ok(await st.evaluate(() => { const r = document.querySelector('.pce-editor-row'); return r && !r.hidden && /Try your photos/.test(r.textContent); }), 'the Advanced editor switches back to Try your photos (⋯ menu)');
    ok(await st.evaluate(() => { const t = getComputedStyle(document.querySelector('.pce-top')), hs = [...document.querySelectorAll('.pce-hdr')].map(h => +getComputedStyle(h).zIndex || 0); return t.position !== 'static' && +t.zIndex > Math.max(0, ...hs); }), 'the ⋯ menu sits above the drawn app header (its logo and buttons showed through it)');
    await st.screenshot({ path: '/tmp/s113_back.png' });
    await st.tap('.pce-edmode [data-ed="try"]'); await st.waitForSelector('.pgte'); await st.waitForTimeout(300);
    ok(await st.evaluate(() => !document.querySelector('.pce') && /Quiet Portrait/.test(document.querySelector('.pgte-title b').textContent)), '… and is back in Try your photos on the same template');
    await st.evaluate(() => PGTemplateEditor.close(true));
    // a story template: no switch even when the Advanced editor is on
    await st.evaluate(() => PGTemplateEditor.open('tpl-c2')); await st.waitForSelector('.pgte'); await st.waitForTimeout(500);
    ok(await st.evaluate(() => !document.querySelector('.pgte-mode')), 'a story template keeps only Try your photos');
    await st.evaluate(() => PGTemplateEditor.close(true));
    // a layout made in the Advanced editor shows in Yours (with ✕) once the Advanced editor is on
    const made = call('canvasSave', { token: admin, g: G, item: { kind: 'layout', name: 'Test layout', scope: 'me', doc: { name: 'Test layout', sections: [] } } });
    await st.evaluate(() => document.querySelectorAll('.overlay-backdrop.show').forEach(x => x.remove())); await toLayouts(st); await st.waitForSelector('.pgcp-yours .pgcp-cvmine', { timeout: 8000 });
    ok(await st.evaluate(() => { const y = document.querySelector('.pgcp-yours'); return /Test layout/.test(y.textContent) && !!y.querySelector('.pgcp-cvdel') && document.querySelectorAll('.pgcp-yours').length === 1; }), 'a layout made in the Advanced editor is in Yours, with a remove button');
    await st.screenshot({ path: '/tmp/s113_yours.png' });
    st.once('dialog', d => d.accept()); await st.tap('.pgcp-yours .pgcp-cvdel'); await st.waitForTimeout(600);
    ok(await st.evaluate(() => !/Test layout/.test(document.querySelector('.pgcp-layouts').textContent)) && !call('canvasList', { token: admin, g: G }).layouts.some(l => l.id === made.id), '✕ removes it for good');
    await st.close();

    // ---- 2. the couple: preview fills the phone frame; the Make something drawer ----
    const cp = await page();
    await cp.goto(BASE + '/g/' + G + '?couple=' + ck); await cp.waitForSelector('#pgBoot.hide', { state: 'attached' });
    await cp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple', null, { timeout: 10000 });
    await toLayouts(cp);
    ok(await cp.evaluate(() => !/Minimal and older/.test(document.querySelector('.pgcp-layouts').textContent)), 'the couple does not see "Minimal and older"');
    for (const id of ['tpl-c1', 'canvas-quiet']) {
      await cp.locator('.pgcp-layout[data-layout="' + id + '"]').scrollIntoViewIfNeeded(); await cp.tap('.pgcp-layout[data-layout="' + id + '"]');
      await cp.waitForSelector('.pgcp-pv-livein .pss, .pgcp-pv-livein .pgc', { timeout: 8000 }); await cp.waitForTimeout(1200);
      const m = await cp.evaluate(() => { const ph = document.querySelector('.pgcp-pv-phone').getBoundingClientRect(), inn = document.querySelector('.pgcp-pv-livein'), pss = inn.querySelector('.pss, .pgc');
        const r = pss.getBoundingClientRect(); return { zoom: inn.style.zoom, fill: r.width / ph.width, left: r.left - ph.left }; });
      ok(!m.zoom && m.fill > 0.97 && Math.abs(m.left) < 6, id + ': the template fills the phone frame (' + Math.round(m.fill * 100) + '% wide, no zoom)');
      if (id === 'tpl-c1') await cp.screenshot({ path: '/tmp/s113_frame.png' });
      await cp.tap('.pgcp-pv-back'); await cp.waitForTimeout(400);
    }
    await cp.locator('.pgcp-layout[data-layout="tpl-c3"]').scrollIntoViewIfNeeded(); await cp.tap('.pgcp-layout[data-layout="tpl-c3"]');
    await cp.waitForSelector('#c3dr', { state: 'attached', timeout: 8000 }); await cp.waitForTimeout(800);
    await cp.evaluate(() => document.getElementById('c3dr').classList.add('open')); await cp.waitForTimeout(900);
    const tiles = await cp.evaluate(() => [...document.querySelectorAll('#c3dr .lp')].map(t => { const r = t.getBoundingClientRect(); const out = [...t.querySelectorAll('img')].some(i => { const q = i.getBoundingClientRect(); return q.width > r.width + 2 || q.height > r.height + 2 || q.top < r.top - 2; }); return [Math.round(r.width), Math.round(r.height), out]; }));
    ok(tiles.length === 3 && tiles.every(t => t[0] === tiles[0][0] && t[1] === tiles[0][1] && !t[2]), 'Cloud Pages · Make something: three tiles the same size, photos inside them (' + JSON.stringify(tiles) + ')');
    ok(await cp.evaluate(() => { const t = [...document.querySelectorAll('#c3dr div')].find(x => x.textContent === 'Make something'); const c = getComputedStyle(t).color, bg = getComputedStyle(document.getElementById('c3dr')).backgroundColor; return c !== bg; }), '… and its heading is readable (the template\'s ink colour)');
    await cp.screenshot({ path: '/tmp/s113_drawer.png' });
    await cp.close();

    // ---- 3. the "being prepared" page ----
    const gp = await page();
    await gp.goto(BASE + '/g/' + draft); await gp.waitForSelector('#pgDraft', { timeout: 10000 });
    const links = await gp.evaluate(() => [...document.querySelectorAll('.pg-draft-staff a')].map(a => [a.textContent, new URL(a.href).pathname.split('/')[1], a.getBoundingClientRect().height]));
    ok(links.length === 2 && links[0][1] === 'ph' && links[1][1] === 'pg' && links.every(l => l[2] >= 44), 'guest link, not ready yet: the photographer and PicGrades links are offered');
    await gp.close();
    const pp = await page();
    await pp.goto(BASE + '/ph/' + draft); await pp.waitForSelector('#pgDraftIn', { timeout: 10000 });
    await pp.tap('#pgDraftIn'); await pp.waitForSelector('#pgSignIn.show', { timeout: 5000 }); await pp.waitForTimeout(450);
    const top = await pp.evaluate(() => { const i = document.getElementById('pgSiEmail'), r = i.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === i || i.contains(e) || e.closest('#pgSignIn') !== null); });
    ok(top, 'photographer link: Sign in opens ON TOP of the "being prepared" page (it opened behind it)');
    await pp.fill('#pgSiEmail', 'adcmediaa@gmail.com'); await pp.tap('#pgSiGo'); await pp.waitForFunction(() => !document.getElementById('pgSiCodeRow').classList.contains('hidden'), null, { timeout: 5000 });
    ok(true, '… and the email code can be asked for');
    await pp.screenshot({ path: '/tmp/s113_signin.png' });
    await pp.close();

    // ---- 4. a steady screen height (the address bar moving is not a resize) ----
    const hp = await page();
    await hp.goto(BASE + '/g/' + G); await hp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await hp.waitForTimeout(600);
    const vh = await hp.evaluate(async () => { const a = pgVH(), k = pgScreenKey(); return { a, k }; });
    await hp.setViewportSize({ width: 390, height: 780 }); await hp.waitForTimeout(200);
    const vh2 = await hp.evaluate(() => ({ a: pgVH(), k: pgScreenKey() }));
    await hp.setViewportSize({ width: 390, height: 500 }); await hp.waitForTimeout(200);
    const vh3 = await hp.evaluate(() => pgVH());
    ok(vh.a === 844 && vh2.a === 844 && vh2.k === vh.k && vh3 === 500, 'the screen height stays put while the address bar moves (64 px), and follows a real change (' + [vh.a, vh2.a, vh3].join(' → ') + ')');
    ok(await hp.evaluate(() => typeof window.pgCalm === 'undefined' || window.pgCalm === false), 'a phone that keeps up keeps full motion');
    await hp.close();
  } catch (e) { console.log('FAIL error:', e.message); fails++; }
  console.log('page errors:', errors);
  await b.close(); srv.close(); process.exit(fails || errors.length ? 1 : 0);
});
