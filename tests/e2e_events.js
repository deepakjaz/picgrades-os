// Browser test (step 37): the Events page styles — cards (original), shapes (by event name), carousel, mosaic — on phone and laptop.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'EVTSWEDDING0000000001';
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
}).listen(8796, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const PORT = ['sample_portrait.jpg', 'sample_portrait2.jpg'].map(f => fs.readFileSync(path.join(__dirname, 'fixtures', f)));
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; const k = [...id].reduce((a, c) => a + c.charCodeAt(0), 0); r.fulfill({ contentType: 'image/jpeg', body: k % 3 === 0 ? bytesOf(id) : PORT[k % 2] }); });
  const URL = 'http://localhost:8796/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  // a full Indian wedding's events (the test wedding has 3), reusing its photos
  const NAMES = ['Haldi', 'Mehendi', 'Sangeet Night', 'Cocktail Party', 'Baraat', 'Wedding', 'Reception', 'Engagement', 'Family Portraits'];
  const setup = p => p.evaluate(names => { const all = pgAllPhotos().map(x => x.p); GALLERY.events = names.map((n, i) => ({ name: n, photos: all.slice(i % 4, i % 4 + 6) })); renderGalleries(); switchViewFromNav('gallery'); window.scrollTo(0, 0); }, NAMES);
  const sizes = [['phone', 390, 844], ['desktop', 1440, 900]];
  for (const [nm, w, hgt] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: hgt }, hasTouch: nm === 'phone' }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(nm + ': ' + e.message)); await img(pg);
    await require('./fonts_local').install(pg);
    await pg.goto(URL); await boot(pg); await setup(pg);
    console.log(nm, 'default style:', await pg.evaluate(() => PGEvents.style()), '| original cards:', await pg.locator('#pgGalleryMasonry .pg-collection').count());
    for (const st of ['cards', 'shapes', 'carousel', 'mosaic']) {
      await pg.evaluate(s => { GALLERY.pages = { events: s }; renderGalleries(); window.scrollTo(0, 0); }, st); await pg.waitForTimeout(1200);
      const info = await pg.evaluate(() => ({ cls: document.getElementById('pgGalleryMasonry').className, shapes: [...document.querySelectorAll('.pge-shape')].map(b => b.querySelector('.pge-name').textContent + '=' + b.dataset.shape).join(', '), n: document.querySelectorAll('#pgGalleryMasonry button').length }));
      console.log(nm, st, JSON.stringify(info));
      await pg.screenshot({ path: '/tmp/s37_' + nm + '_' + st + '.png' });
      if (st === 'shapes' && nm === 'phone') { await pg.evaluate(() => window.scrollTo(0, 900)); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/s37_phone_shapes2.png' }); }
    }
    // tap an event (shapes style) → its page
    await pg.evaluate(() => { GALLERY.pages = { events: 'shapes' }; renderGalleries(); });
    await pg.locator('.pge-shape', { hasText: 'Cocktail' }).click(); await pg.waitForTimeout(600);
    console.log(nm, 'tap Cocktail →', await pg.evaluate(() => document.querySelector('.pg-view.active').id), await pg.textContent('#pgxTitle'));
    await ctx.close();
  }
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
