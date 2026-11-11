// Browser test (step 40): every Hub layout on phone, tablet, laptop and TV — no overlaps, nothing outside the page; screenshots.
const RE = require('./reel_helper');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'BIGSWEDDING0000000001';
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
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8793, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = [];
  const PORT = ['sample_portrait.jpg', 'sample_portrait2.jpg'].map(f => fs.readFileSync(path.join(__dirname, 'fixtures', f)));
  const img = p => p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; const k = [...id].reduce((a, c) => a + c.charCodeAt(0), 0); r.fulfill({ contentType: 'image/jpeg', body: k % 3 === 0 ? bytesOf(id) : PORT[k % 2] }); });
  const URL = 'http://localhost:8793/g/' + pub.galleryId;
  const boot = async p => { await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(900); };
  const NAMES = ['Haldi', 'Mehendi', 'Sangeet', 'Cocktail', 'Wedding', 'Reception'];
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const SIZES = [['phone', 390, 844], ['tablet', 820, 1180], ['laptop', 1440, 900], ['tv', 1920, 1080]];
  let bad = 0;
  for (const [nm, w, hgt] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: hgt } }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(nm + ': ' + e.message)); await img(pg);
    await require('./fonts_local').install(pg);
    await pg.goto(URL); await boot(pg);
    await pg.evaluate(names => { const all = pgAllPhotos().map(x => x.p); GALLERY.events = names.map((n, i) => ({ name: n, photos: all.slice(i % 4, i % 4 + 6) })); GALLERY.faceSearch = true;
      GALLERY.likes = {}; all.slice(0, 5).forEach((p, i) => GALLERY.likes[p.id] = 5 - i); GALLERY.recentNotes = [{ name: 'Nani', text: 'God bless you both, always.', photoId: all[0].id }, { name: 'Riya', text: 'Best sangeet ever!', photoId: all[1].id }]; }, NAMES);
    const list = (await pg.evaluate(() => PGLayout.list().filter(l => !l.story).map(l => [l.id, l.theme]))).filter(([id]) => !only || only.includes(id));
    for (const [id, th] of list) {
      await pg.evaluate(([id, th]) => { PGTheme.apply(th); PGLayout.apply(id); switchViewFromNav('hub'); window.scrollTo(0, 0); }, [id, th]); await pg.waitForTimeout(900);
      const r = await pg.evaluate(() => {
        const box = document.getElementById('pgLay'), br = box.getBoundingClientRect(), els = [...box.children].map(e => e.getBoundingClientRect());
        let over = 0; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i], c = els[j]; if (a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2) over++; }
        const out = els.filter(e => e.right > br.right + 2 || e.left < br.left - 2).length;
        const used = els.reduce((t, e) => t + e.width * e.height, 0), area = (br.width - 2 * parseFloat(getComputedStyle(box).paddingLeft)) * (Math.max(...els.map(e => e.bottom)) - Math.min(...els.map(e => e.top)));
        return { screen: box.dataset.screen, blocks: els.length, width: Math.round(br.width), over, out, filled: Math.round(100 * used / area) };
      });
      if (r.over || r.out) bad++;
      console.log(nm.padEnd(6), id.padEnd(22), JSON.stringify(r));
      if (process.env.DBG) console.log('DBG', await pg.evaluate(() => { const c = document.querySelector('#pgLay .pgl-ev-carousel'); if (!c) return null; const r = x => x ? Math.round(x.getBoundingClientRect().width) + 'x' + Math.round(x.getBoundingClientRect().height) : '-'; return { block: r(c.closest('.pgl-b')), car: r(c), evt: r(c.querySelector('.pgl-evt')), evc: r(c.querySelector('.pgl-evc')), disp: getComputedStyle(c.closest('.pgl-b')).display }; }));
      // a full-page picture also catches the parked sheets and the bottom bar; hide them for the picture only
      await pg.addStyleTag({ content: '.reg-overlay:not(.show),.tkg-global-nav,.pg-totop{visibility:hidden!important}' });
      await pg.screenshot({ path: '/tmp/s40_' + nm + '_' + id + '.png', fullPage: nm !== 'phone' });
    }
    await ctx.close();
  }
  console.log('layouts with overlapping or overflowing blocks:', bad);
  console.log('page errors:', errors); await b.close(); srv.close(); process.exit(0);
});
