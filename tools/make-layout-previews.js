// Step 100: a short preview clip of every Hub layout (phone + laptop), so choosing a layout plays a light video
// instead of opening the whole app in a frame. Run:  node tools/make-layout-previews.js [photos-folder] [layout-id ...]
// photos-folder: sample wedding photos to show (never a client's). Default: tests/fixtures (sample*.jpg).
// Writes app/themes/preview/<id>-p.mp4, <id>-l.mp4, <id>-p.webp, <id>-l.webp and index.json.
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { call, mail, DRIVE } = require('../tests/gas_mock');
const root = path.join(__dirname, '..'), OUT = path.join(root, 'app', 'themes', 'preview'), TMP = '/tmp/pg-previews';
const args = process.argv.slice(2), PH = args[0] && fs.existsSync(args[0]) ? args.shift() : path.join(root, 'tests', 'fixtures');
const photos = fs.readdirSync(PH).filter(f => /^sample.*\.jpe?g$/i.test(f) || (PH.indexOf('fixtures') < 0 && /\.jpe?g$/i.test(f))).sort();
const layouts = JSON.parse(fs.readFileSync(path.join(root, 'app', 'themes', 'layouts.json'), 'utf8')).layouts.filter(l => !args.length || args.includes(l.id));
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const W = 'PREVIEWWEDDING000100';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['vH', 'Haldi'], ['vS', 'Sangeet'], ['vW', 'Wedding'], ['vR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 8; i++) DRIVE.files['PV' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = id => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(PH, photos[n % photos.length])); };
global.__fetchBytes = bytesOf;
const ff = a => execFileSync('ffmpeg', ['-y', '-loglevel', 'error'].concat(a));
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : u.endsWith('.webp') ? 'image/webp' : u.endsWith('.mp3') ? 'audio/mpeg' : 'text/javascript'); res.end(d); } });
}).listen(8929, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const done = {};
  const DEV = { p: { viewport: { width: 390, height: 844 }, out: '360:-2' }, l: { viewport: { width: 1280, height: 800 }, out: '640:-2' } };
  for (const l of layouts) {
    call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: l.id, theme: l.theme || '' });
    done[l.id] = {};
    for (const k of ['p', 'l']) {
      const ctx = await b.newContext({ viewport: DEV[k].viewport, recordVideo: { dir: TMP, size: DEV[k].viewport } }), pg = await ctx.newPage();
      await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
      await require('../tests/fonts_local').install(pg);
      const t0 = Date.now();
      try {
        await pg.goto('http://localhost:8929/g/' + pub.galleryId); await pg.waitForSelector('#pgBoot.hide', { state: 'attached', timeout: 20000 });
        await pg.addStyleTag({ content: '.pg-role-badge,.pg-toast,#pgToast{display:none!important}' });
        await pg.waitForTimeout(1500); const start = (Date.now() - t0) / 1000;
        await pg.evaluate(() => new Promise(ok => { const H = Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 2.2), t = performance.now(), D = 4200;
          (function f(n) { const x = Math.min(1, (n - t) / D), e = x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; scrollTo(0, H * e); if (x < 1) requestAnimationFrame(f); else setTimeout(ok, 400); })(t); }));
        const vid = await pg.video().path(); await ctx.close();
        const mp4 = path.join(OUT, l.id + '-' + k + '.mp4'), poster = path.join(OUT, l.id + '-' + k + '.webp');
        ff(['-ss', String(start), '-i', vid, '-t', '5', '-vf', 'scale=' + DEV[k].out + ',fps=24', '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'veryfast', '-movflags', '+faststart', '-an', mp4]);
        ff(['-ss', String(start), '-i', vid, '-frames:v', '1', '-vf', 'scale=' + DEV[k].out, '-quality', '70', poster]);
        fs.unlinkSync(vid); done[l.id][k] = 1;
        console.log(l.id, k, Math.round(fs.statSync(mp4).size / 1024) + ' KB');
      } catch (e) { console.error('skip', l.id, k, e.message.split('\n')[0]); try { await ctx.close(); } catch (x) {} }
    }
  }
  const idx = path.join(OUT, 'index.json'), old = fs.existsSync(idx) ? JSON.parse(fs.readFileSync(idx, 'utf8')) : {};
  Object.keys(done).forEach(id => { if (done[id].p && done[id].l) old[id] = 1; });
  fs.writeFileSync(idx, JSON.stringify(old, null, 0) + '\n');
  await b.close(); srv.close(); process.exit(0);
});
