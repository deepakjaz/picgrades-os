// Browser test (step 44): the Hub editor — select, resize, drag, undo, swap, hide, add, screens, logo side, preview, publish.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'EDITWEDDING0000000001';
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
}).listen(8790, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  const URL = 'http://localhost:8790/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await img(pg);
  await require('./fonts_local').install(pg);
  await pg.goto(URL + '?couple=' + ck); await boot(pg); await pg.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 });
  call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: 'magazine-cover' }); await pg.reload(); await boot(pg); await pg.waitForFunction(() => PGControl.role() === 'couple' && PGLayout.current() === 'magazine-cover', null, { timeout: 10000 });
  // no overlaps, no holes at the top, all inside the grid — for every screen of the draft
  const check = () => pg.evaluate(() => { const d = PGHubEditor.draft(), C = { phone: 4, tall: 8, wide: 12 }, out = {};
    for (const s in C) { const P = d.blocks.filter(b => b.pos[s] && (b.hide || []).indexOf(s) < 0).map(b => b.pos[s]); let ov = 0, outside = 0;
      P.forEach((a, i) => { if (a[0] + a[2] > C[s]) outside++; P.forEach((c, j) => { if (j > i && a[0] < c[0] + c[2] && c[0] < a[0] + a[2] && a[1] < c[1] + c[3] && c[1] < a[1] + a[3]) ov++; }); });
      out[s] = { cards: P.length, overlaps: ov, outside }; } return JSON.stringify(out); });
  await pg.click('.tkg-nav-item[data-nav=studio]'); await pg.waitForSelector('.pgcp-design'); await pg.click('.pgcp-design'); await pg.waitForSelector('.pged .pged-card'); await pg.waitForTimeout(900);
  console.log('editor open: cards', await pg.locator('.pged-card').count(), '| screen', await pg.textContent('.pged-screens .on'), '| from', await pg.evaluate(() => PGHubEditor.draft().base), '|', await check());
  await pg.screenshot({ path: '/tmp/s44_editor.png' });
  // every card of the starting layout must survive opening the editor (step 49 regression: the Events card had been commented out)
  const lost = await pg.evaluate(() => { const lay = PGLayout.find(PGHubEditor.draft().base); const have = PGHubEditor.draft().blocks.map(b => b.block); return lay ? lay.blocks.map(b => b.block).filter(k => have.indexOf(k) < 0) : []; });
  console.log(lost.length ? 'FAIL cards lost when the editor opened: ' + lost.join(',') : 'all layout cards kept in the editor (incl. Events)');
  // select the 2nd card and make it Large
  await pg.locator('.pged-card').nth(1).click(); await pg.waitForTimeout(300);
  const name = await pg.textContent('.pged-tools .pged-trow b');
  await pg.click('.pged-sizes button:has-text("Large")'); await pg.waitForTimeout(400);
  const SEL = () => pg.evaluate(() => PGHubEditor.state().sel);
  let si = await SEL();
  console.log('selected', name, '→ Large:', await pg.evaluate(i => JSON.stringify(PGHubEditor.draft().blocks[i].pos.phone), si), '|', await check());
  await pg.screenshot({ path: '/tmp/s44_tools.png' });
  // drag the selected card down by its handle
  const posOf = i => pg.evaluate(i => PGHubEditor.draft().blocks[i].pos.phone.join(','), i);
  si = await SEL(); const before = await posOf(si);
  const hb = await pg.locator('.pged-sel .pged-move').boundingBox();
  await pg.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await pg.mouse.down();
  for (let k = 1; k <= 8; k++) { await pg.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + k * 30); await pg.waitForTimeout(30); }
  await pg.mouse.up(); await pg.waitForTimeout(500);
  console.log('dragged down:', before, '→', await posOf(si), '|', await check());
  await pg.screenshot({ path: '/tmp/s44_dragged.png' });
  // resize by the corner
  await pg.locator('.pged-card[data-i="' + si + '"]').click(); await pg.waitForTimeout(300);
  const rb = await pg.locator('.pged-sel .pged-size').boundingBox(); const b4 = await posOf(si);
  await pg.mouse.move(rb.x + 20, rb.y + 20); await pg.mouse.down(); for (let k = 1; k <= 6; k++) { await pg.mouse.move(rb.x + 20 - k * 25, rb.y + 20 + k * 12); await pg.waitForTimeout(30); } await pg.mouse.up(); await pg.waitForTimeout(500);
  console.log('resized by the corner:', b4, '→', await posOf(si), '|', await check());
  await pg.click('.pged-undo'); await pg.waitForTimeout(300); console.log('undo →', await posOf(si));
  // swap and style
  const pick = i => pg.locator('.pged-card[data-i="' + i + '"]').click().then(() => pg.waitForTimeout(300));
  await pick(si); await pg.selectOption('.pged-swap', 'loved'); await pg.waitForTimeout(400);
  await pick(si); await pg.selectOption('.pged-var', 'mosaic'); await pg.waitForTimeout(400);
  console.log('swapped to', await pg.evaluate(i => { const b = PGHubEditor.draft().blocks[i]; return b.block + ' / ' + b.variant; }, si));
  // hide on phone, then add it back
  await pick(si); await pg.click('.pged-hide'); await pg.waitForTimeout(400);
  console.log('hidden on phone: cards', await pg.locator('.pged-card').count(), '|', await check());
  await pg.click('.pged-add'); await pg.waitForSelector('.pged-addsheet'); await pg.click('.pged-addsheet [data-show]'); await pg.waitForTimeout(500);
  console.log('added back: cards', await pg.locator('.pged-card').count(), '|', await check());
  await pg.click('.pged-add'); await pg.waitForSelector('.pged-addsheet'); await pg.click('.pged-addsheet [data-new="review"]'); await pg.waitForTimeout(500);
  console.log('new card added:', await pg.evaluate(() => PGHubEditor.draft().blocks.slice(-1)[0].block), '|', await check());
  // laptop arrangement is its own
  await pg.click('.pged-screens [data-scr=wide]'); await pg.waitForTimeout(700);
  console.log('laptop: cards', await pg.locator('.pged-card').count(), '| grid columns', await pg.evaluate(() => getComputedStyle(document.querySelector('.pged-grid')).gridTemplateColumns.split(' ').length));
  await pg.screenshot({ path: '/tmp/s44_laptop.png' });
  await pick(0); await pg.click('.pged-sizes button:has-text("Full")'); await pg.waitForTimeout(400);
  console.log('laptop cover → Full:', await pg.evaluate(() => PGHubEditor.draft().blocks[0].pos.wide.join(',')), '| phone unchanged:', await pg.evaluate(() => PGHubEditor.draft().blocks[0].pos.phone.join(',')), '|', await check());
  await pg.click('.pged-screens [data-scr=phone]'); await pg.click('.pged-logo [data-logo=left]'); await pg.waitForTimeout(300);
  // preview on this phone only
  await pg.click('.pged-prev'); await pg.waitForTimeout(900);
  console.log('preview: banner', await pg.isVisible('.pged-banner'), '| Hub shows', await pg.evaluate(() => PGLayout.current()), '| logo left', await pg.evaluate(() => document.body.classList.contains('pg-logo-left')), '| wedding unchanged:', call('getGallery', { g: pub.galleryId }).gallery.layout);
  await pg.screenshot({ path: '/tmp/s44_preview.png' });
  await pg.click('.pged-bp'); await pg.waitForTimeout(1000);
  const G = call('getGallery', { g: pub.galleryId }).gallery;
  console.log('published:', G.layout, '| cards', G.custom.blocks.length, '| logo', G.pages.header, '| banner gone', !(await pg.isVisible('.pged-banner')));
  // a guest sees it
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const gp = await c2.newPage(); gp.on('pageerror', e => errors.push('guest: ' + e.message)); await img(gp); await require('./fonts_local').install(gp);
  await gp.goto(URL); await boot(gp);
  const order = s => s.evaluate(() => [...document.querySelectorAll('#pgLay > .pgl-b')].map(e => e.dataset.block + '@' + e.style.gridColumn.split(' ')[0] + ',' + e.style.gridRow.split(' ')[0]).join(' '));
  const og = await order(gp), oc = (await order(pg)).split(' ').filter(x => !x.startsWith('review@')).join(' ');   // the thank-you card is the couple's only
  console.log('guest Hub:', await gp.evaluate(() => PGLayout.current()), '| logo left', await gp.evaluate(() => document.body.classList.contains('pg-logo-left')), '| same cards in the same places as the couple:', og === oc, og === oc ? '' : '\n   guest : ' + og + '\n   couple: ' + oc);
  console.log('guest Hub has no holes:', await gp.evaluate(() => { const box = document.getElementById('pgLay'), els = [...box.children].map(e => e.getBoundingClientRect()), br = box.getBoundingClientRect();
    const used = els.reduce((t, e) => t + e.width * e.height, 0), area = (br.width - 32) * (Math.max(...els.map(e => e.bottom)) - Math.min(...els.map(e => e.top))); return Math.round(100 * used / area) + '% filled'; }));
  await gp.screenshot({ path: '/tmp/s44_guest.png' });
  const c3 = await b.newContext({ viewport: { width: 1440, height: 900 } }); const lp = await c3.newPage(); await img(lp); await require('./fonts_local').install(lp); await lp.goto(URL); await boot(lp);
  console.log('guest laptop: first card spans', await lp.evaluate(() => document.querySelector('#pgLay > .pgl-b').style.gridColumn));
  await lp.screenshot({ path: '/tmp/s44_guest_laptop.png' });
  await c2.close(); await c3.close();
  // the panel offers it as a layout and can go back to a ready layout
  await pg.click('.tkg-nav-item[data-nav=studio]'); await pg.waitForSelector('.pgcp-layout[data-layout=custom]');
  console.log('panel: "Our own Hub" card in use:', await pg.evaluate(() => document.querySelector('.pgcp-layout[data-layout=custom]').classList.contains('on')));
  call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: '', pages: JSON.stringify({ header: 'right' }) });
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
