// Browser test: Post / Album maker — every template, formats, post to Root Moment as the couple, album in Root Moment + "Posts & Albums", download.
const PE = require('./post_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'POSTWEDDING0000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['pS', 'Sangeet'], ['pW', 'Wedding'], ['pR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 5; i++) DRIVE.files['PS' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const f = DRIVE.files[id]; if (f && f.bytes) return Buffer.from(f.bytes); const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8776, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = r.request().url().match(/\/d\/([^=]+)/)[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id), headers: { 'Access-Control-Allow-Origin': '*' } }); });
  await pg.goto('http://localhost:8776/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(700);
  console.log('create row:', (await pg.locator('.pgc-card:not(.hidden) b').allTextContents()).join(' | '));
  await PE.toEdit(pg, 'album');   // step 53: Post is one picture now; the album maker keeps every template and format
  console.log('opened:', JSON.stringify(await pg.evaluate(() => { const i = PGPost.info(); delete i.hits; return i; })), '| tools:', (await pg.locator('.pe-tool span').allTextContents()).join(', '));
  await pg.screenshot({ path: '/tmp/s12_maker.png' });
  // every template: export the whole page small for the contact sheet
  const shots = {};
  for (const t of await pg.evaluate(() => PGPost.templates)) {
    await pg.evaluate(t => PGPost.set('tid', t), t); await pg.waitForTimeout(80);
    shots[t] = await pg.$eval('.ps-prev canvas', c => { const k = 220 / c.height, o = document.createElement('canvas'); o.width = Math.round(c.width * k); o.height = 220; o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', 0.8); });
  }
  fs.writeFileSync('/tmp/s12_templates.json', JSON.stringify(shots));
  await pg.evaluate(() => PGPost.set('tid', 'album'));
  for (const f of ['carousel', 'single', 'strip']) { await pg.evaluate(f => PGPost.set('format', f), f); console.log('format', f, JSON.stringify(await pg.evaluate(() => { const i = PGPost.info(); delete i.hits; return i; }))); }
  await pg.evaluate(() => PGPost.set('format', 'carousel'));
  // add photos from another collection: back to New post, choose one more, Next
  await pg.click('.pe-v-edit .pe-ib'); const opts = await pg.$$eval('.pe-v-pick .pe-colsel option', l => l.map(o => o.value)); await pg.selectOption('.pe-v-pick .pe-colsel', opts[Math.min(2, opts.length - 1)]);
  await pg.locator('.pe-v-pick .pe-pick:not(.on)').first().click(); await pg.click('.pe-v-pick .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=edit]'); await pg.waitForTimeout(1500);
  console.log('after adding:', JSON.stringify(await pg.evaluate(() => { const i = PGPost.info(); delete i.hits; return i; })));
  // download
  await PE.toShare(pg);
  const dls = []; pg.on('download', d => dls.push(d.suggestedFilename()));
  await pg.locator('.ps-sub', { hasText: 'Download' }).click(); await pg.waitForTimeout(4000);
  console.log('downloads:', dls.length, dls.slice(0, 3).join(', '));
  // post as the couple
  await pg.click('.ps-go'); await pg.waitForFunction(() => /Posted|Sent/.test(document.querySelector('.pe-msg').textContent), null, { timeout: 20000 });
  console.log('post:', await pg.textContent('.pe-msg'));
  await pg.evaluate(() => PGPost.close()); await pg.waitForTimeout(800);
  await pg.click('.tkg-nav-item[data-nav=moments]'); await pg.waitForTimeout(600); 
  const albumItem = pg.locator('.pgm-guest').filter({ has: pg.locator('.pgm-album') });
  console.log('album in Root Moment:', await albumItem.count(), '| slides:', await albumItem.first().locator('.pgm-album img').count());
  await albumItem.first().scrollIntoViewIfNeeded(); await pg.waitForTimeout(500);
  await albumItem.first().locator('.pgm-album').evaluate(a => a.scrollTo(a.clientWidth, 0)); await pg.waitForTimeout(500);
  console.log('swipe dots:', await albumItem.first().locator('.pgm-dots i.on').count(), '| meta:', await albumItem.first().locator('.pgm-meta').textContent());
  await pg.screenshot({ path: '/tmp/s12_album_reel.png' });
  await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.waitForTimeout(400);
  console.log('collections:', (await pg.locator('.pg-collection h3').allTextContents()).join(', '));
  console.log('page errors:', errors); await b.close(); srv.close();
});
