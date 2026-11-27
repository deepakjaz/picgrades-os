// Browser test (step 98b): change a photo right on the Hub — tap it (couple), Change photo / Move & zoom / Reset;
// it saves as the wedding's own copy of the layout and every guest sees it. A guest's tap does nothing new.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'HUBPHOTOWEDDING00098';
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
}).listen(8927, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8927/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: 'canvas-quiet' });   // a ready canvas layout
    const open = async (p, q) => { await p.goto(URL + q); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForSelector('#pgStory .pgc .pgc-t-photo', { timeout: 10000 }); await p.waitForTimeout(500); };
    // a guest taps a photo: nothing new happens
    const gctx = await b.newContext({ viewport: { width: 390, height: 844 } }), gp = await gctx.newPage(); gp.on('pageerror', e => errors.push(e.message));
    await gp.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await open(gp, ''); await gp.click('#pgStory .pgc .pgc-t-photo'); await gp.waitForTimeout(300);
    ok(!(await gp.locator('.pghp').count()), 'a guest tapping a photo gets no change sheet');
    // the couple, on a phone
    const cctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), mp = await cctx.newPage(); mp.on('pageerror', e => errors.push(e.message));
    await mp.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await open(mp, '?couple=' + ck);
    await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple' && PGHubPhoto.editable(), null, { timeout: 10000 });
    const elId = await mp.evaluate(() => document.querySelector('#pgStory .pgc .pgc-t-photo').dataset.el);
    await mp.evaluate(id => document.querySelector('#pgStory .pgc-el[data-el="' + id + '"]').scrollIntoView({ block: 'center' }), elId);
    await mp.tap('#pgStory .pgc-el[data-el="' + elId + '"]'); await mp.waitForSelector('.pghp.in');
    ok(await mp.isVisible('.pghp [data-a=change]') && await mp.isVisible('.pghp [data-a=frame]') && await mp.isVisible('.pghp [data-a=reset]'), 'the couple taps a photo on the Hub: Change photo · Move & zoom · Reset');
    await mp.waitForTimeout(500); await mp.screenshot({ path: '/tmp/s98b_sheet.png' });
    ok(await mp.evaluate(() => [...document.querySelectorAll('.pghp button')].every(x => x.getBoundingClientRect().height >= 44)), 'its buttons are at least 44 px');
    // change it
    await mp.tap('.pghp [data-a=change]'); await mp.waitForSelector('.pghp-pick [data-id]');
    const want = await mp.getAttribute('.pghp-pick [data-id] >> nth=5', 'data-id');
    await mp.waitForTimeout(1200); await mp.screenshot({ path: '/tmp/s98b_pick.png' });
    await mp.tap('.pghp-pick [data-id] >> nth=5');
    // step 103 (changed from step 98b/101): a ready template keeps only the couple's choice — no copy of the design
    await mp.waitForFunction(() => GALLERY.layout === 'custom', null, { timeout: 10000 }); await mp.waitForTimeout(600);
    const lay1 = await mp.evaluate(() => GALLERY.layout), base0 = await mp.evaluate(() => GALLERY.custom.base);
    ok(await mp.evaluate((a) => { const i = document.querySelector('#pgStory .pgc-el[data-el="' + a[0] + '"] img'); return !!i && i.dataset.photo === a[1]; }, [elId, want]), 'the new photo shows on the Hub at once');
    let srv1 = call('getGallery', { g: pub.galleryId, coupleKey: ck }).gallery;
    ok(srv1.layout === 'custom' && srv1.custom.base === base0 && srv1.custom.story.photos[elId] === want && !srv1.custom.story.doc && call('canvasList', { g: pub.galleryId, coupleKey: ck }).layouts.filter(x => x.scope === 'wedding').length === 0, 'saved as the couple\'s choice for this template (no copy of the design), applied for every guest');
    // move & zoom
    await mp.tap('#pgStory .pgc-el[data-el="' + elId + '"]'); await mp.waitForSelector('.pghp.in'); await mp.tap('.pghp [data-a=frame]');
    await mp.waitForSelector('.pgfr .pgfr-zoom input');
    await mp.evaluate(() => { const r = document.querySelector('.pgfr .pgfr-zoom input'); r.value = '1.8'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); });
    await mp.tap('.pgfr-done'); await mp.waitForTimeout(1500);
    srv1 = call('getGallery', { g: pub.galleryId, coupleKey: ck }).gallery;
    const fe = (srv1.custom.story.frame || {})[elId]; ok(srv1.layout === 'custom' && fe && +fe.z === 1.8 && srv1.custom.story.photos[elId] === want, 'Move & zoom saves the framing as a choice too (the photo choice stays) ' + JSON.stringify(fe));
    ok(await mp.evaluate(id => document.querySelector('#pgStory .pgc-el[data-el="' + id + '"] img').style.scale === '1.8', elId), '…and the Hub shows it zoomed');
    // reset
    await mp.tap('#pgStory .pgc-el[data-el="' + elId + '"]'); await mp.waitForSelector('.pghp.in'); await mp.tap('.pghp [data-a=reset]'); await mp.waitForTimeout(1500);
    const re = call('getGallery', { g: pub.galleryId, coupleKey: ck }).gallery.custom.story;
    ok(!(re.frame || {})[elId] && re.photos[elId] === want, 'Reset clears the framing (the photo choice stays)');
    // the guest page now shows the couple's photo
    await gp.reload(); await gp.waitForSelector('#pgStory .pgc .pgc-t-photo', { timeout: 10000 }); await gp.waitForTimeout(400);   // a guest who already had the page open before
    ok(await gp.evaluate((a) => { const i = document.querySelector('#pgStory .pgc-el[data-el="' + a[0] + '"] img'); return !!i && i.dataset.photo === a[1]; }, [elId, want]), 'guests see the new photo');
    // laptop
    const lctx = await b.newContext({ viewport: { width: 1280, height: 860 } }), lp = await lctx.newPage(); lp.on('pageerror', e => errors.push(e.message));
    await lp.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await open(lp, '?couple=' + ck); await lp.waitForFunction(() => window.PGHubPhoto && PGHubPhoto.editable(), null, { timeout: 10000 });
    await lp.click('#pgStory .pgc-el[data-el="' + elId + '"]'); await lp.waitForSelector('.pghp.in'); await lp.waitForTimeout(300);
    ok(await lp.evaluate(() => { const r = document.querySelector('.pghp').getBoundingClientRect(); return r.width <= 440 && r.left > 300; }), 'laptop: the sheet sits in the middle');
    await lp.screenshot({ path: '/tmp/s98b_laptop.png' });
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
