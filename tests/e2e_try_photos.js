// Browser test (step 103): "Try your photos" for every template — canvas, Living Story, Editorial. The real template; only the
// couple's choices are kept (photos, hidden parts, words) — no copy of the design — and guests see them with the template's scroll.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'TRYPHOTOSWEDDING0103';
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
}).listen(8932, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8932/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    const G = pub.galleryId, gal = () => call('getGallery', { g: G }).gallery;
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), mp = await ctx.newPage(); mp.on('pageerror', e => errors.push(e.message)); mp.on('dialog', d => d.accept());
    await mp.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(mp);
    const boot = async () => { await mp.goto(URL + '?couple=' + ck); await mp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple' && window.PGTemplateEditor && window.PGTune, null, { timeout: 10000 }); await mp.waitForTimeout(400); };
    const pickIn = async n => { await mp.waitForSelector('.pgte-pick [data-id]'); const id = await mp.evaluate(k => document.querySelectorAll('.pgte-pick [data-id]')[k].dataset.id, n); await mp.tap('.pgte-pick [data-id] >> nth=' + n); await mp.waitForTimeout(500); return id; };
    await boot();
    // ---- a canvas template ----
    await mp.evaluate(() => PGControl.designLayout('canvas-quiet')); await mp.waitForSelector('.pgte .pgte-scroll .pgc-sec', { timeout: 8000 });
    ok(await mp.evaluate(() => !document.querySelector('.pce') && /Try your photos/.test(document.querySelector('.pgte-title').textContent)), 'a canvas template opens "Try your photos" (not the Advanced editor)');
    const slot = await mp.evaluate(() => { const x = document.querySelector('.pgte-scroll .pgc-t-photo'); return x.dataset.el; });
    await mp.evaluate(s => document.querySelector('.pgte-scroll .pgc-el[data-el="' + s + '"]').scrollIntoView({ block: 'center' }), slot);
    await mp.tap('.pgte-scroll .pgc-el[data-el="' + slot + '"]'); const chosen = await pickIn(4);
    ok(await mp.evaluate(([s, id]) => PGTemplateEditor.state().tune.photos[s] === id && document.querySelector('.pgte-scroll .pgc-el[data-el="' + s + '"] img').dataset.photo === id, [slot, chosen]), 'tapping a photo on the template and choosing one puts it there');
    await mp.screenshot({ path: '/tmp/s103_canvas.png' });
    await mp.evaluate(() => PGTemplateEditor.tab('parts')); await mp.waitForSelector('.pgte-pane [data-layer]');
    const hideKey = await mp.evaluate(() => [...document.querySelectorAll('.pgte-pane [data-layer]')].map(b => b.dataset.layer).find(k => /moment|post/.test(k)) || document.querySelectorAll('.pgte-pane [data-layer]')[3].dataset.layer);
    await mp.evaluate(k => document.querySelector('.pgte-pane [data-layer="' + k + '"]').click(), hideKey); await mp.waitForTimeout(300);
    ok(await mp.evaluate(k => { const e = document.querySelector('.pgte-scroll .pgc-el[data-el="' + k + '"]'); return !e || e.offsetParent === null || getComputedStyle(e).display === 'none'; }, hideKey), 'Parts: hiding a part takes it off the template');
    await mp.evaluate(() => PGTemplateEditor.tab('words')); await mp.fill('.pgte-pane [data-text=names]', 'Mira & Dev'); await mp.dispatchEvent('.pgte-pane [data-text=names]', 'change'); await mp.waitForTimeout(300);
    await mp.evaluate(() => PGTemplateEditor.tab('more'));
    ok(!(await mp.$('.pgte-adv')), 'step 112: the Advanced editor is not offered until PicGrades turns it on for the wedding');
    call('setAdvanced', { token: admin, g: G, on: true }); await mp.evaluate(() => { GALLERY.advanced = true; PGTemplateEditor.tab('photos'); PGTemplateEditor.tab('more'); });
    ok(await mp.isVisible('.pgte-adv'), 'once it is on, More offers the Advanced editor for a canvas template');
    await mp.tap('.pgte-apply'); await mp.waitForFunction(() => !document.querySelector('.pgte'), null, { timeout: 10000 }); await mp.waitForTimeout(600);
    let g = gal();
    ok(g.layout === 'custom' && g.custom.base === 'canvas-quiet' && g.custom.story.kind === 'canvas' && !g.custom.story.doc && g.custom.story.photos[slot] === chosen, 'Apply keeps only the choices (photo, hidden part, names) — no copy of the design');
    ok(call('canvasList', { g: G, coupleKey: ck }).layouts.filter(x => x.scope === 'wedding').length === 0, 'no layout copy is made');
    // a guest sees them, with the template's own scroll
    const gp = await ctx.newPage(); gp.on('pageerror', e => errors.push(e.message)); await gp.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await gp.goto(URL); await gp.waitForSelector('#pgStory .pgc', { timeout: 10000 }); await gp.waitForTimeout(700);
    ok(await gp.evaluate(([s, id, k]) => { const im = document.querySelector('#pgStory .pgc-el[data-el="' + s + '"] img'); const hid = document.querySelector('#pgStory .pgc-el[data-el="' + k + '"]'); return im && im.dataset.photo === id && (!hid || getComputedStyle(hid).display === 'none' || hid.offsetParent === null) && /Mira & Dev/.test(document.querySelector('#pgStory').textContent); }, [slot, chosen, hideKey]), 'guests see the chosen photo, the part hidden and the new names');
    await gp.close();
    // a template with a section that stays while scrolling keeps it after "Try your photos" (no copy, so nothing is lost)
    call('coupleLook', { g: G, coupleKey: ck, layout: 'custom', custom: JSON.stringify({ base: 'bs-oh-baby-scroll', story: { kind: 'canvas', names: 'Mira & Dev' }, blocks: [] }) });
    const gp3 = await ctx.newPage(); gp3.on('pageerror', e => errors.push(e.message)); await gp3.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('2') }));
    await gp3.goto(URL); await gp3.waitForSelector('#pgStory .pgc', { timeout: 10000 }); await gp3.waitForTimeout(600);
    ok(await gp3.evaluate(() => document.querySelectorAll('#pgStory .pgc-sec.stay').length) === 1, 'a template\'s "stays while scrolling" section is still there with the couple\'s choices');
    await gp3.close();
    call('coupleLook', { g: G, coupleKey: ck, layout: 'custom', custom: JSON.stringify(g.custom) });
    // opening it again shows the choices
    await mp.evaluate(() => PGControl.designLayout('custom')); await mp.waitForSelector('.pgte .pgte-scroll .pgc-sec');
    ok(await mp.evaluate(([s, id]) => PGTemplateEditor.state().id === 'canvas-quiet' && PGTemplateEditor.state().tune.photos[s] === id, [slot, chosen]), 'Edit opens the same template with the couple\'s choices');
    await mp.evaluate(() => PGTemplateEditor.close(true));
    // ---- Living Story ----
    await mp.evaluate(() => PGControl.designLayout('story-living')); await mp.waitForSelector('.pgte .pgte-scroll .psh-hero-track, .pgte .pgte-scroll section', { timeout: 8000 }); await mp.waitForTimeout(800);
    ok(await mp.evaluate(() => !document.querySelector('.pce') && PGTemplateEditor.state().id === 'story-living'), 'Living Story opens "Try your photos" (no canvas copy)');
    await mp.evaluate(() => PGTemplateEditor.tab('more'));
    ok(!(await mp.$('.pgte-adv')), 'a story template has no Advanced editor');
    await mp.evaluate(() => PGTemplateEditor.tab('photos')); await mp.waitForSelector('.pgte-slot[data-slot="cover-0"]');
    await mp.tap('.pgte-slot[data-slot="cover-0"]'); const lc = await pickIn(6);
    ok(await mp.evaluate(id => [...document.querySelectorAll('.pgte-scroll img')].some(i => i.dataset.pid === id), lc), 'Living Story: the new cover photo shows on the real template');
    await mp.evaluate(() => PGTemplateEditor.tab('parts')); await mp.waitForSelector('.pgte-pane [data-layer]');
    const lk = await mp.evaluate(() => document.querySelector('.pgte-pane [data-layer]').dataset.layer);
    await mp.evaluate(k => document.querySelector('.pgte-pane [data-layer="' + k + '"]').click(), lk); await mp.waitForTimeout(400);
    await mp.screenshot({ path: '/tmp/s103_living.png' });
    await mp.tap('.pgte-apply'); await mp.waitForFunction(() => !document.querySelector('.pgte'), null, { timeout: 10000 }); await mp.waitForTimeout(800);
    g = gal(); ok(g.custom.base === 'story-living' && g.custom.story.photos['cover-0'] === lc && g.custom.story.hide.indexOf(lk) > -1, 'Living Story keeps the cover choice and the hidden part');
    const gp2 = await ctx.newPage(); gp2.on('pageerror', e => errors.push(e.message)); await gp2.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await gp2.goto(URL); await gp2.waitForSelector('#pgStory section', { timeout: 10000 }); await gp2.waitForTimeout(900);
    ok(await gp2.evaluate(([id, k]) => [...document.querySelectorAll('#pgStory img')].some(i => i.dataset.pid === id) && [...document.querySelectorAll('#pgStory .' + k)].every(x => getComputedStyle(x).display === 'none'), [lc, lk]), 'guests see Living Story with the new cover and the part hidden');
    await gp2.screenshot({ path: '/tmp/s103_living_guest.png' }); await gp2.close();
    // ---- Editorial opens too ----
    await mp.evaluate(() => PGControl.designLayout('story-editorial')); await mp.waitForSelector('.pgte .pgte-scroll section, .pgte .pgte-scroll .pse-hero', { timeout: 8000 });
    ok(await mp.evaluate(() => PGTemplateEditor.state().id === 'story-editorial' && document.querySelectorAll('.pgte-slots .pgte-slot, .pgte-pane .pgte-slot').length >= 0), 'Editorial Album opens "Try your photos"');
    await mp.evaluate(() => PGTemplateEditor.tab('photos')); await mp.waitForTimeout(300);
    ok(await mp.evaluate(() => document.querySelectorAll('.pgte-slot').length >= 3), 'Editorial lists its photos');
    await mp.evaluate(() => PGTemplateEditor.close(true));
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
