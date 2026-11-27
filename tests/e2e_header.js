// Browser test (step 99d): the app header for every template — Scrolls away / Stays on top / Hides and comes back;
// the logo as initials, the couple's own picture, or none; left · centre · right. Set in the one editor (Pages › Header) and the card editor.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'HEADERWEDDING000099D';
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
}).listen(8928, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8928/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    const G = pub.galleryId, look = b2 => call('coupleLook', Object.assign({ g: G, coupleKey: ck }, b2));
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    // --- the backend
    ok(look({ logo: 'javascript:alert(1)' }).ok === false, 'a logo that is not a picture is refused');
    ok(look({ logo: 'data:image/png;base64,' + 'A'.repeat(46000) }).ok === false, 'a logo bigger than a Sheet cell holds is refused');
    ok(look({ pages: JSON.stringify({ hdrmode: 'sideways', header: 'top' }) }).pages.hdrmode === undefined, 'unknown header choices are not saved');
    let r = look({ logo: png, pages: JSON.stringify({ logo: 'image', hdrmode: 'fixed', header: 'center' }) });
    ok(r.logoUrl === png && r.pages.hdrmode === 'fixed' && r.pages.header === 'center', 'the couple saves their logo, Stays on top, logo in the centre');
    ok(call('getGallery', { g: G }).gallery.logoUrl === png, 'every guest gets the logo');
    look({ pages: JSON.stringify({ logo: 'mono' }) });
    ok(call('getGallery', { g: G }).gallery.logoUrl === '' && call('getGallery', { g: G }).gallery.pages.hdrmode === 'fixed', 'Initials again: the logo picture is kept but not shown; other header choices stay');
    // --- a guest on a phone, each behaviour
    const gctx = await b.newContext({ viewport: { width: 390, height: 844 } }), gp = await gctx.newPage(); gp.on('pageerror', e => errors.push(e.message));
    await gp.route('https://lh3.googleusercontent.com/**', r2 => { const id = (r2.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r2.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(gp);
    const openG = async () => { await gp.goto(URL); await gp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await gp.waitForTimeout(700); await gp.evaluate(() => { document.body.style.minHeight = '4000px'; }); };
    const top = () => gp.evaluate(() => document.querySelector('.mk-header').getBoundingClientRect().top);
    const scrollTo = async y => { await gp.evaluate(y2 => window.scrollTo(0, y2), y); await gp.waitForTimeout(450); };
    look({ pages: JSON.stringify({ hdrmode: 'scroll', header: 'right', logo: 'mono' }) }); await openG(); await scrollTo(600);
    ok(await top() < -100, 'Scrolls away: the header goes up with the page');
    look({ pages: JSON.stringify({ hdrmode: 'fixed', logo: 'image', header: 'center' }) }); await openG(); await scrollTo(600);
    ok(Math.abs(await top()) < 2, 'Stays on top: the header stays at the top when the page scrolls');
    await gp.screenshot({ path: '/tmp/s99d_fixed.png' });
    ok(await gp.evaluate(() => !!document.querySelector('#pgMono img')), 'the couple\'s logo picture shows in the header');
    ok(await gp.evaluate(() => { const r2 = document.querySelector('.mk-stamp-badge').getBoundingClientRect(); return Math.abs(r2.left + r2.width / 2 - 195) < 4; }), 'Centre: the logo sits in the middle');
    ok(await gp.evaluate(() => [...document.querySelectorAll('.pg-modebtn,.pg-menubtn')].every(x => { const r2 = x.getBoundingClientRect(); return r2.width > 0 && r2.left > 195; })), 'light / dark and menu stay on the right, clear of the centred logo');
    look({ pages: JSON.stringify({ hdrmode: 'auto' }) }); await openG(); await scrollTo(300); await scrollTo(900);
    ok(await top() < -30, 'Hides, comes back: scrolling down hides it');
    await scrollTo(700);
    ok(Math.abs(await top()) < 2, '…and scrolling up brings it back');
    look({ pages: JSON.stringify({ logo: 'none', hdrmode: 'scroll', header: 'left' }) }); await openG();
    ok(await gp.evaluate(() => getComputedStyle(document.querySelector('.mk-stamp-badge')).display === 'none' && document.querySelector('.pg-menubtn').getBoundingClientRect().width > 0), 'No logo: the logo is gone, the menu stays');
    // --- the couple in the one editor: Pages › Header
    look({ layout: 'canvas-quiet', pages: JSON.stringify({ logo: 'mono', header: 'right', hdrmode: 'scroll' }), logo: '' });
    const cctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), mp = await cctx.newPage(); mp.on('pageerror', e => errors.push(e.message));
    await mp.route('https://lh3.googleusercontent.com/**', r2 => { const id = (r2.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r2.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(mp);
    await mp.goto(URL + '?couple=' + ck); await mp.waitForSelector('#pgBoot.hide', { state: 'attached' });
    await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple' && window.PGCanvasEditor, null, { timeout: 10000 });
    await mp.evaluate(() => PGCanvasEditor.open('current')); await mp.waitForSelector('.pce .pce-page .pgc-sec'); await mp.evaluate(() => PGCanvasEditor.tab('page')); await mp.waitForTimeout(300);
    const tapSeg = async (k, v) => { await mp.locator('.pce [data-k="' + k + '"] [data-v="' + v + '"]').scrollIntoViewIfNeeded(); await mp.tap('.pce [data-k="' + k + '"] [data-v="' + v + '"]'); await mp.waitForTimeout(150); };
    ok(await mp.locator('.pce [data-k="hdr-hdrmode"] button').count() === 3 && await mp.locator('.pce [data-k="hdr-logo"] button').count() === 3 && await mp.locator('.pce [data-k="hdr-header"] [data-v=center]').count() === 1, 'Pages › Header has: when the page scrolls (3), logo (3), logo place left · centre · right');
    await tapSeg('hdr-hdrmode', 'fixed'); await tapSeg('hdr-logo', 'image');
    ok(await mp.isVisible('.pce [data-do=logoUp]'), 'Our logo: an Upload logo button');
    await mp.setInputFiles('.pce [data-logofile]', path.join(FX, files[0])); await mp.waitForSelector('.pce .pce-logo-pv img');
    ok(await mp.evaluate(() => { const i = document.querySelector('.pce .pce-logo-pv img'); return /^data:image\/(webp|png|jpeg)/.test(i.src) && i.src.length < 45000; }), 'the uploaded picture is made small (under the Sheet\'s size) on the phone');
    ok(await mp.evaluate(() => !!document.querySelector('.pce-hdr .lg img')), 'the preview\'s header outline shows the new logo');
    await tapSeg('hdr-header', 'center');
    ok(await mp.evaluate(() => [...document.querySelectorAll('.pce [data-k^="hdr-"] button,.pce [data-do=logoUp]')].every(x => x.getBoundingClientRect().height >= 44 || !x.offsetParent)), 'header buttons are at least 44 px');
    await mp.screenshot({ path: '/tmp/s99d_editor.png' });
    await mp.tap('.pce-apply'); await mp.waitForFunction(() => !document.querySelector('.pce'), null, { timeout: 10000 }); await mp.waitForTimeout(400);
    const sv = call('getGallery', { g: G }).gallery;
    ok(sv.pages.hdrmode === 'fixed' && sv.pages.logo === 'image' && sv.pages.header === 'center' && /^data:image\//.test(sv.logoUrl), 'Apply saves the header and the logo for the whole wedding');
    ok(await mp.evaluate(() => document.body.classList.contains('pg-hdr-fixed') && document.body.classList.contains('pg-logo-center') && !!document.querySelector('#pgMono img')), 'the couple\'s own page changes at once');
    await mp.screenshot({ path: '/tmp/s99d_after.png' });
    // --- the card editor's header sheet
    await mp.evaluate(() => PGHeader.sheet()); await mp.waitForSelector('.pghd-box');
    await mp.tap('.pghd [data-k=logo] [data-v=none]'); await mp.tap('.pghd [data-k=hdrmode] [data-v=auto]'); await mp.screenshot({ path: '/tmp/s99d_sheet.png' }); await mp.tap('.pghd [data-ok]');
    await mp.waitForFunction(() => !document.querySelector('.pghd'), null, { timeout: 8000 });
    const sv2 = call('getGallery', { g: G }).gallery;
    ok(sv2.pages.logo === 'none' && sv2.pages.hdrmode === 'auto' && sv2.pages.header === 'center', 'the header sheet (card layouts) saves at once and keeps the other choices');
    ok(await mp.evaluate(() => document.body.classList.contains('pg-logo-none') && document.body.classList.contains('pg-hdr-auto')), '…and the page follows');
    // laptop look, logo on the left, stays on top
    look({ pages: JSON.stringify({ logo: 'image', header: 'left', hdrmode: 'fixed' }) });
    const lctx = await b.newContext({ viewport: { width: 1280, height: 860 } }), lp = await lctx.newPage(); lp.on('pageerror', e => errors.push(e.message));
    await lp.route('https://lh3.googleusercontent.com/**', r2 => { const id = (r2.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r2.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('./fonts_local').install(lp);
    await lp.goto(URL); await lp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await lp.waitForTimeout(900); await lp.evaluate(() => window.scrollTo(0, 500)); await lp.waitForTimeout(400);
    ok(await lp.evaluate(() => document.querySelector('.mk-stamp-badge').getBoundingClientRect().left < 120 && Math.abs(document.querySelector('.mk-header').getBoundingClientRect().top) < 2), 'laptop: logo on the left, header stays on top');
    await lp.screenshot({ path: '/tmp/s99d_laptop.png' });
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
