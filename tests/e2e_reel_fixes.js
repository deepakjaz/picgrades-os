// Step 98: three fixes Deepak found on his phone.
//   1. Make a Reel from your own photos opens the photo picker on those photos with nothing chosen — you pick up to 80.
//   2. The template list plays a short preview of the song (about 100 KB), not the whole song (about 1 MB), so sound starts fast.
//   3. Make a Reel / Make a Post sit in the page under the title, not in a floating bar that runs into the nav bar.
const http = require('http'), fs = require('fs'), path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'REELFIXES00000000098';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['rH', 'Haldi'], ['rW', 'Wedding']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 20; i++) DRIVE.files['RF' + k + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const bytesOf = id => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const music = [];   // every song file the page asks for
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  if (/\.mp3$/.test(u)) music.push(u);
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : u.endsWith('.mp3') ? 'audio/mpeg' : 'text/javascript'); res.end(d); } });
}).listen(8920, async () => {
  const { chromium } = require('playwright'), b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), errors = []; let fails = 0;
  const ok = (v, m) => { console.log((v ? 'ok   ' : 'FAIL ') + m); if (!v) fails++; };
  try {
    // every song has a short preview, and it really is short
    const tracks = JSON.parse(fs.readFileSync(path.join(root, 'app/music/tracks.json'), 'utf8')).tracks;
    ok(tracks.length > 0 && tracks.every(t => t.preview && fs.statSync(path.join(root, t.preview)).size < 160000), 'every song has a preview under 160 KB (the whole songs are about 1 MB)');

    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept());
    await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await pg.goto('http://localhost:8920/g/' + pub.galleryId); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
    // a guest Find me found: 30 of their photos (more than a reel would want pre-picked)
    await pg.evaluate(() => { const ids = GALLERY.events.flatMap(e => e.photos).slice(0, 30).map(p => p.id); pgStore('mine', { sure: ids, maybe: [] }); pgStore('found', 1); });
    await pg.reload(); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(600);

    // 3. the buttons sit in the page, under the title
    await pg.evaluate(() => pgOpenEvent('Your photos')); await pg.waitForSelector('.pgcr-bar'); await pg.waitForTimeout(300);
    const bar = await pg.evaluate(() => {
      const b = document.querySelector('.pgcr-bar'), head = document.querySelector('.pgx-head'), r = b.getBoundingClientRect();
      return { inline: b.classList.contains('pgcr-inline'), afterHead: head && head.nextElementSibling === b, pos: getComputedStyle(b).position,
        tall: [...b.querySelectorAll('button')].every(x => x.getBoundingClientRect().height >= 44), inScreen: r.left >= 0 && r.right <= innerWidth, top: Math.round(r.top) };
    });
    ok(bar.inline && bar.afterHead && bar.pos === 'static', 'Make a Reel / Make a Post sit in the page under the title, not floating ' + JSON.stringify(bar));
    ok(bar.tall && bar.inScreen, 'both buttons are at least 44 px tall and fit the screen');
    await pg.screenshot({ path: '/tmp/s98_buttons_phone.png' });
    await pg.evaluate(() => scrollTo(0, 900)); await pg.waitForTimeout(200);
    ok(await pg.evaluate(() => document.querySelector('.pgcr-bar').getBoundingClientRect().bottom < 0), 'they scroll away with the page, so nothing sits over the photos or the nav bar');
    await pg.evaluate(() => scrollTo(0, 0));

    // 2. sound on the template list: the short preview, quickly
    await pg.click('.pgcr-bar [data-k=reel]');
    await pg.waitForSelector('.rl-wrap[data-view=inspo] .re-mute', { timeout: 30000 }); await pg.waitForTimeout(400);
    music.length = 0;
    const t0 = Date.now();
    await pg.click('.re-mute');
    await pg.waitForFunction(() => PGReel.state().soundPlaying, null, { timeout: 8000 });
    const ms = Date.now() - t0;
    ok(music.length >= 1 && music.every(u => u.indexOf('/app/music/preview/') === 0), 'the template list asks only for the short preview ' + JSON.stringify(music));
    console.log('     sound started after ' + ms + ' ms');

    // 1. Use template → the photo picker opens on "Your photos" with nothing chosen
    music.length = 0;
    await pg.locator('.re-ins .re-use').first().click();
    await pg.waitForSelector('.rl-picker'); await pg.waitForTimeout(300);
    const pick = await pg.evaluate(() => { const s = document.querySelector('.rl-picker .re-colsel'); return { col: s.options[s.selectedIndex].text, chosen: document.querySelectorAll('.rl-picker .rl-pick.on, .rl-picker .rl-pick i:not(:empty)').length, next: document.querySelector('.rl-picker .re-next').disabled, tiles: document.querySelectorAll('.rl-picker .rl-pick').length }; });
    ok(pick.col === 'Your photos' && pick.tiles === 30, 'the picker opens on the guest\'s own photos ' + JSON.stringify(pick));
    ok(pick.chosen === 0 && pick.next, 'nothing is chosen for them — they pick the photos (up to 80) themselves');
    await pg.waitForTimeout(500);
    ok(music.some(u => u.indexOf('/app/music/preview/') !== 0), 'the whole song starts downloading while they choose photos ' + JSON.stringify(music));
    await pg.screenshot({ path: '/tmp/s98_picker_phone.png' });

    await pg.evaluate(() => PGReel.close());
    console.log('page errors: ' + JSON.stringify(errors));
    ok(!errors.length, 'no page errors');
  } catch (e) { console.error(e); fails++; }
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
