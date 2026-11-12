// Browser test (step 34): the Control Panel (gear) for the couple / photographer / PicGrades; guests' 4-button bar and its half circle;
// nothing hides behind the bar; the couple's iPhone home-screen app keeps couple mode.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'CTRLWEDDING0000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['pS', 'Sangeet'], ['pW', 'Wedding'], ['pR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 5; i++) DRIVE.files['PS' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const f = DRIVE.files[id]; if (f && f.bytes) return Buffer.from(f.bytes); const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const ACTS = [];
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); ACTS.push(p.action); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8799, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const URL = 'http://localhost:8799/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const gearShown = p => p.evaluate(() => getComputedStyle(document.querySelector('.tkg-nav-item[data-nav=studio]')).display !== 'none');
  const navBox = p => p.evaluate(() => { const r = document.querySelector('.tkg-global-nav').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; });
  // ---- the couple ----
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await img(pg);
  await require('./fonts_local').install(pg);
  await pg.goto(URL + '?couple=' + ck); await boot(pg); await pg.waitForFunction(() => PGControl.role() !== 'guest', null, { timeout: 10000 });
  console.log('couple: role', await pg.evaluate(() => PGControl.role()), '| gear shown:', await gearShown(pg), '| bar', JSON.stringify(await navBox(pg)));
  await pg.screenshot({ path: '/tmp/s34_couple_bar.png', clip: { x: 0, y: 744, width: 390, height: 100 } });
  await pg.click('.tkg-nav-item[data-nav=studio]'); await pg.waitForSelector('.pgcp-sheet .pgcp-tcard'); await pg.waitForTimeout(500);
  console.log('panel: badge', await pg.textContent('.pgcp-badge'), '| theme cards', await pg.locator('.pgcp-tcard').count(), '| layouts', await pg.locator('.pgcp-layout').count(), '| studio screen not opened:', await pg.evaluate(() => !document.getElementById('view-studio').classList.contains('active')));
  await pg.screenshot({ path: '/tmp/s34_panel_look.png' });
  // tap a theme → preview window; nothing changes for guests yet
  const pvReady = async () => { await pg.waitForSelector('.pgcp-pv'); await pg.waitForSelector('.pgcp-pv-wait[hidden]', { state: 'attached', timeout: 20000 }); await pg.waitForTimeout(900); };
  await pg.click('.pgcp-tcard[data-theme="jaipur-rose"]'); await pvReady();
  const inFrame = fn => pg.frameLocator('.pgcp-pv iframe').locator('html').evaluate(fn);
  console.log('preview open:', await pg.textContent('.pgcp-pv-name'), '| preview shows', await inFrame(() => document.documentElement.dataset.pgTheme), '| as a guest:', await inFrame(() => PGControl.role()),
    '| wedding unchanged:', call('getGallery', { g: pub.galleryId }).gallery.theme === '', '| this page unchanged:', await pg.evaluate(() => !PGTheme.current()));
  await pg.screenshot({ path: '/tmp/s34b_pv_hub.png' });
  for (const v of ['gallery', 'photo', 'rooms']) { await pg.click('.pgcp-pv-pages [data-page=' + v + ']'); await pg.waitForTimeout(900); await pg.screenshot({ path: '/tmp/s34b_pv_' + v + '.png' }); }
  console.log('preview page switch (photo → root view):', await (async () => { await pg.click('.pgcp-pv-pages [data-page=photo]'); await pg.waitForTimeout(700); return inFrame(() => document.querySelector('.pg-view.active').id); })());
  await pg.click('.pgcp-pv-dark'); await pg.waitForTimeout(500);
  console.log('dark in preview:', await inFrame(() => document.documentElement.getAttribute('data-tkg-theme')), '| this page still', await pg.evaluate(() => document.documentElement.getAttribute('data-tkg-theme') || 'light'));
  await pg.click('.pgcp-pv-pages [data-page=hub]'); await pg.waitForTimeout(700); await pg.screenshot({ path: '/tmp/s34b_pv_dark.png' });
  console.log('cache untouched by the preview:', await pg.evaluate(() => !localStorage.getItem('pg_theme_cache')));
  await pg.click('.pgcp-pv-back'); await pg.waitForTimeout(300);
  console.log('Back = no change:', !(await pg.locator('.pgcp-pv').count()), call('getGallery', { g: pub.galleryId }).gallery.theme === '');
  await pg.click('.pgcp-tcard[data-theme="jaipur-rose"]'); await pvReady();
  await pg.click('.pgcp-pv-apply'); await pg.waitForTimeout(900);
  console.log('Apply: saved', call('getGallery', { g: pub.galleryId }).gallery.theme, '| shown now:', await pg.evaluate(() => PGTheme.current()), '| preview closed:', !(await pg.locator('.pgcp-pv').count()), '| card says In use:', await pg.textContent('.pgcp-tcard.on small'));
  // a layout: preview with its own theme, or keep mine
  await pg.locator('.pgcp-layout[data-layout="bento-concierge"]').scrollIntoViewIfNeeded(); await pg.click('.pgcp-layout[data-layout="bento-concierge"]'); await pvReady();
  console.log('layout preview:', await pg.textContent('.pgcp-pv-name'), '| keep-my-theme offered:', await pg.isVisible('.pgcp-pv-keep'), '| preview layout', await inFrame(() => PGLayout.current()));
  await pg.screenshot({ path: '/tmp/s34b_pv_layout.png' });
  await pg.click('.pgcp-pv-size'); await pg.waitForTimeout(900);
  console.log('preview on a laptop:', await pg.evaluate(() => { const f = document.querySelector('.pgcp-pv iframe'); return f.style.width + ' × ' + f.style.height; }), '| layout drawn for', await inFrame(() => document.getElementById('pgLay') && document.getElementById('pgLay').dataset.screen));
  await pg.screenshot({ path: '/tmp/s40_pv_laptop.png' }); await pg.click('.pgcp-pv-size'); await pg.waitForTimeout(600);
  await pg.click('.pgcp-pv-keep input'); await pvReady();
  console.log('keep my theme → preview theme', await inFrame(() => document.documentElement.dataset.pgTheme), '|', await pg.textContent('.pgcp-pv-name'));
  await pg.click('.pgcp-pv-apply'); await pg.waitForTimeout(900);
  let G = call('getGallery', { g: pub.galleryId }).gallery;
  console.log('layout saved:', G.layout, '+ kept theme:', G.theme, '| Hub shows it:', await pg.evaluate(() => PGLayout.current()));
  await pg.screenshot({ path: '/tmp/s34_panel_look2.png' });
  // event page style (step 36): preview on the Event page, then Apply
  await pg.locator('.pgcp-style[data-pagekey=event][data-style=mosaic]').scrollIntoViewIfNeeded(); await pg.click('.pgcp-style[data-pagekey=event][data-style=mosaic]'); await pvReady();
  console.log('event style preview:', await pg.textContent('.pgcp-pv-name'), '| preview shows', await inFrame(() => (document.querySelector('#view-event.active .pgx-grid') || {}).className), '| wedding unchanged:', JSON.stringify(call('getGallery', { g: pub.galleryId }).gallery.pages));
  await pg.screenshot({ path: '/tmp/s36_pv_mosaic.png' });
  await pg.click('.pgcp-pv-apply'); await pg.waitForTimeout(900);
  console.log('Apply → saved', JSON.stringify(call('getGallery', { g: pub.galleryId }).gallery.pages), '| this phone', await pg.evaluate(() => PGGrids.eventStyle()));
  // Events page style (step 37)
  await pg.locator('.pgcp-style[data-pagekey=events][data-style=shapes]').scrollIntoViewIfNeeded(); await pg.click('.pgcp-style[data-pagekey=events][data-style=shapes]'); await pvReady();
  console.log('events style preview:', await pg.textContent('.pgcp-pv-name'), '| preview page', await inFrame(() => document.querySelector('.pg-view.active').id + ' ' + document.getElementById('pgGalleryMasonry').className));
  await pg.screenshot({ path: '/tmp/s37_pv_shapes.png' });
  await pg.click('.pgcp-pv-apply'); await pg.waitForTimeout(900);
  console.log('Apply → saved', JSON.stringify(call('getGallery', { g: pub.galleryId }).gallery.pages), '| this phone', await pg.evaluate(() => PGEvents.style()));
  // photo view style (step 38)
  await pg.locator('.pgcp-style[data-pagekey=viewer][data-style=classic]').scrollIntoViewIfNeeded(); await pg.click('.pgcp-style[data-pagekey=viewer][data-style=classic]'); await pvReady();
  console.log('photo view preview:', await pg.textContent('.pgcp-pv-name'), '| classic view in the preview:', await inFrame(() => !!document.querySelector('.pgcv')));
  await pg.screenshot({ path: '/tmp/s38_pv_classic.png' });
  await pg.click('.pgcp-pv-apply'); await pg.waitForTimeout(900);
  console.log('Apply → saved', JSON.stringify(call('getGallery', { g: pub.galleryId }).gallery.pages), '| this phone', await pg.evaluate(() => pgViewerClassic.style()));
  await pg.click('.pgcp-tabs [data-tab=functions]'); await pg.waitForTimeout(300);
  console.log('functions tab: switches', await pg.locator('.pgcp-sheet .pgf-sw').count(), '| no Plan switches for the couple:', !(await pg.locator('.pgcp-plan').count()));
  await pg.screenshot({ path: '/tmp/s34_panel_functions.png' });
  await pg.click('.pgcp-sheet .ios-wide'); await pg.waitForTimeout(400);
  console.log('old Hub "Functions" button gone:', !(await pg.locator('#pgfOpen').count()), '| no test menus:', !(await pg.locator('.pg-thbtn').count()));
  // ---- a guest on another phone ----
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const gp = await ctx2.newPage(); gp.on('pageerror', e => errors.push('guest: ' + e.message)); await img(gp);
  await require('./fonts_local').install(gp);
  await gp.goto(URL); await boot(gp);
  console.log('guest: role', await gp.evaluate(() => PGControl.role()), '| gear hidden:', !(await gearShown(gp)), '| sees the wedding’s theme', await gp.evaluate(() => PGTheme.current()), 'and layout', await gp.evaluate(() => PGLayout.current()));
  const items = () => gp.$$eval('.tkg-nav-item', l => l.filter(x => getComputedStyle(x).display !== 'none').map(x => { const r = x.getBoundingClientRect(); return x.dataset.nav + '@' + Math.round(r.left + r.width / 2) + ',' + Math.round(r.top + r.height / 2); }).join(' '));
  console.log('guest bar (4 buttons):', JSON.stringify(await navBox(gp)), await items());
  await gp.screenshot({ path: '/tmp/s34_guest_bar.png', clip: { x: 0, y: 744, width: 390, height: 100 } });
  await gp.screenshot({ path: '/tmp/s34_guest_hub.png' });
  // the test wedding is small, so the Hub gets a tall test block to have something to scroll (a real wedding is much longer)
  await gp.evaluate(() => { const d = document.createElement('div'); d.id = 'tall'; d.style.cssText = 'height:1600px;display:block!important'; document.querySelector('.pg-view.active').appendChild(d); return document.querySelector('.pg-view.active').id; }).then(v => console.log('tall block in', v));
  await gp.mouse.move(195, 400); await gp.mouse.wheel(0, 250); await gp.waitForTimeout(300); await gp.mouse.wheel(0, 250); await gp.waitForTimeout(700);
  console.log('scrollY', await gp.evaluate(() => [scrollY, document.documentElement.scrollHeight, innerHeight, document.querySelector('.tkg-global-nav').className]));
  console.log('scrolling: half circle', JSON.stringify(await navBox(gp)), await items());
  await gp.screenshot({ path: '/tmp/s34_guest_half.png' });
  await gp.screenshot({ path: '/tmp/s34_guest_half_zoom.png', clip: { x: 105, y: 720, width: 180, height: 124 } });
  await gp.evaluate(() => document.getElementById('tall').remove());
  await gp.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await gp.waitForTimeout(200); await gp.mouse.wheel(0, 50); await gp.waitForTimeout(700);
  const end = await gp.evaluate(() => {
    const nav = document.querySelector('.tkg-global-nav'), hub = document.getElementById('view-hub');
    const kids = [...hub.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.height > 0 && r.width > 0 && s.visibility !== 'hidden' && s.display !== 'none' && e.children.length === 0; });
    const last = Math.max(...kids.map(e => e.getBoundingClientRect().bottom));
    return { curled: nav.classList.contains('scrolled'), lastContent: Math.round(last), barTop: Math.round(nav.getBoundingClientRect().top) };
  });
  console.log('at the bottom of the Hub: full bar back:', !end.curled, '| last content ends', end.lastContent, 'above the bar top', end.barTop, '→', end.lastContent <= end.barTop ? 'nothing behind the bar' : 'HIDDEN');
  await gp.screenshot({ path: '/tmp/s34_guest_end.png' });
  await gp.mouse.wheel(0, -300); await gp.waitForTimeout(200); await gp.mouse.wheel(0, 200); await gp.waitForTimeout(500);
  await gp.evaluate(() => switchViewFromNav('gallery')); await gp.waitForTimeout(500);
  console.log('switching screen brings the full bar back:', !(await gp.evaluate(() => document.querySelector('.tkg-global-nav').classList.contains('scrolled'))));
  await gp.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await gp.waitForTimeout(300); await gp.mouse.wheel(0, 40); await gp.waitForTimeout(600);
  await gp.screenshot({ path: '/tmp/s34_guest_gallery_end.png' });
  await gp.evaluate(() => switchViewFromNav('rooms')); await gp.waitForTimeout(400);
  await gp.screenshot({ path: '/tmp/s34_guest_rooms.png' });
  // gear tapped by a guest (keyboard / old link) does nothing
  await gp.evaluate(() => document.querySelector('.tkg-nav-item[data-nav=studio]').click()); await gp.waitForTimeout(300);
  console.log('guest cannot open the panel:', !(await gp.locator('.pgcp-sheet').count()));
  await ctx2.close();
  // ---- PicGrades (staff login) ----
  const ctx3 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const st = await ctx3.newPage(); st.on('pageerror', e => errors.push('staff: ' + e.message)); await img(st);
  await st.addInitScript(t => { try { localStorage.setItem('pg_token', t); } catch (e) {} }, admin);
  await st.goto(URL.replace('/g/', '/pg/')); await boot(st); await st.waitForFunction(() => PGControl.role() !== 'guest', null, { timeout: 10000 });
  console.log('staff: role', await st.evaluate(() => PGControl.role()), '| gear shown:', await gearShown(st));
  await st.click('.tkg-nav-item[data-nav=studio]'); await st.waitForSelector('.pgcp-sheet'); await st.click('.pgcp-tabs [data-tab=functions]'); await st.waitForTimeout(300);
  console.log('PicGrades sees Plan switches:', await st.locator('.pgcp-plan').count());
  await st.click('input[data-plan=post]'); await st.waitForTimeout(700);
  console.log('PicGrades locked Post Edits:', call('getGallery', { g: pub.galleryId }).gallery.features.post, '| row shows locked:', await st.locator('.pgf-row.locked').count());
  await st.screenshot({ path: '/tmp/s34_panel_picgrades.png' });
  await st.click('input[data-plan=post]'); await st.waitForTimeout(700);
  console.log('… unlocked again:', call('getGallery', { g: pub.galleryId }).gallery.features.post);
  await st.click('.pgcp-tabs [data-tab=look]'); await st.waitForTimeout(300); await st.click('.pgcp-tcard[data-theme="midnight-velvet"]');
  await st.waitForSelector('.pgcp-pv-wait[hidden]', { state: 'attached', timeout: 20000 }); await st.click('.pgcp-pv-apply'); await st.waitForTimeout(900);
  console.log('PicGrades changed the theme (last change wins):', call('getGallery', { g: pub.galleryId }).gallery.theme);
  await ctx3.close();
  // the couple's phone sees the newest look after reopening
  await pg.reload(); await boot(pg);
  console.log('couple reopens: theme', await pg.evaluate(() => PGTheme.current()), '(was saved by PicGrades on another phone)');
  // ---- iPhone: the couple's home-screen app keeps couple mode ----
  const ctx4 = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const ip = await ctx4.newPage(); ip.on('pageerror', e => errors.push('iphone: ' + e.message)); await img(ip);
  await ip.goto(URL + '?couple=' + ck); await boot(ip);
  // step 61: an old couple link becomes the couple's own link /c/<id>/<key> on every phone (so Add to Home Screen keeps it)
  console.log('old couple link becomes /c/<id>/<key>:', ip.url().indexOf('/c/' + pub.galleryId + '/' + ck) > -1, '| app file has it:', /&c=/.test(await ip.getAttribute('link[rel=manifest]', 'href')), '| role:', await ip.evaluate(() => PGControl.role()));
  await ctx4.close();
  const ctx5 = await b.newContext({ viewport: { width: 390, height: 844 } }); const an = await ctx5.newPage(); await img(an);
  await an.goto(URL + '?couple=' + ck); await boot(an);
  console.log('no ?couple= left in the address:', !/couple=/.test(an.url()), an.url().indexOf('/c/') > -1);
  await ctx5.close();
  call('coupleLook', { g: pub.galleryId, coupleKey: ck, theme: '', layout: '' });
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
