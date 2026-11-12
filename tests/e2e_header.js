// Browser test (step 43): the simple header — couple's name and logo, not pinned, clear light / dark button — across themes.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'HDRWEDDING00000000001';
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
}).listen(8791, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const PORT = ['sample_portrait.jpg', 'sample_portrait2.jpg'].map(f => fs.readFileSync(path.join(__dirname, 'fixtures', f)));
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; const k = [...id].reduce((a, c) => a + c.charCodeAt(0), 0); r.fulfill({ contentType: 'image/jpeg', body: k % 3 === 0 ? bytesOf(id) : PORT[k % 2] }); });
  const URL = 'http://localhost:8791/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const LOOKS = [['', ''], ['ivory-glass', 'magazine-cover'], ['midnight-velvet', 'cinema-panorama'], ['jaipur-rose', 'mosaic-salon'], ['sandalwood', 'editorial-columns'], ['gallery-museum', 'portrait-atlas']];
  for (const [nm, w, hgt] of [['phone', 390, 844], ['laptop', 1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: hgt }, hasTouch: nm === 'phone' }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(nm + ': ' + e.message)); await img(pg); await require('./fonts_local').install(pg);
    await pg.goto(URL); await boot(pg);
    console.log(nm, 'header text:', JSON.stringify(await pg.textContent('.mk-header')), '| pinned:', await pg.evaluate(() => getComputedStyle(document.querySelector('.mk-header')).position), '| mode button:', await pg.getAttribute('#pgModeBtn', 'aria-label'));
    for (const [th, lay] of LOOKS) for (const dark of [false, true]) {
      await pg.evaluate(([th, lay, dark]) => { PGTheme.apply(th); PGLayout.apply(lay); document.documentElement.setAttribute('data-tkg-theme', dark ? 'dark' : 'light'); pgPaintModeBtn(); switchViewFromNav('hub'); window.scrollTo(0, 0); }, [th, lay, dark]); await pg.waitForTimeout(700);
      await pg.screenshot({ path: '/tmp/s43_' + nm + '_' + (th || 'original') + (dark ? '_dark' : '') + '.png', clip: { x: 0, y: 0, width: w, height: nm === 'phone' ? 260 : 300 } });
    }
    // scrolled: the header has gone up with the page
    await pg.evaluate(() => { PGTheme.apply(''); PGLayout.apply(''); window.scrollTo(0, 400); }); await pg.waitForTimeout(500);
    console.log(nm, 'after scrolling, header top:', await pg.evaluate(() => Math.round(document.querySelector('.mk-header').getBoundingClientRect().top)));
    await pg.click('#pgModeBtn'); await pg.waitForTimeout(300);
    console.log(nm, 'mode button → ', await pg.evaluate(() => document.documentElement.getAttribute('data-tkg-theme')), '| label now:', await pg.getAttribute('#pgModeBtn', 'aria-label'));
    await pg.evaluate(() => { window.scrollTo(0, 0); switchViewFromNav('gallery'); }); await pg.waitForTimeout(300); await pg.click('#stampThemeBtn'); await pg.waitForTimeout(400);
    console.log(nm, 'logo → ', await pg.evaluate(() => document.querySelector('.pg-view.active').id));
    await ctx.close();
  }
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
