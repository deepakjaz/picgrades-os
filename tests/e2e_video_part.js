// Browser test (step 97b): the Video part — YouTube, Shorts or Google Drive, in their own players (no relay).
// Editor: Add → Video asks for the link; Shorts stand up; Drive explains its play button. Guests: a looping video starts on screen, a player on a tap, light mode waits for a tap.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'VIDEOPARTWEDDING0097';
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
}).listen(8923, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8923/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  const frames = [];   // YouTube / Drive players and posters are faked: the test never reaches those sites
  await pg.route(/youtube-nocookie\.com|drive\.google\.com\/file/, r => { frames.push(r.request().url()); r.fulfill({ contentType: 'text/html', body: '<body style="background:#111"></body>' }); });
  await pg.route(/i\.ytimg\.com|drive\.google\.com\/thumbnail/, r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('TP00') }));
  try {
    await pg.goto(URL + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForFunction(() => window.PGControl && PGControl.role() === 'couple', null, { timeout: 10000 });
    const S = () => pg.evaluate(() => PGCanvasEditor.state());
    await pg.evaluate(() => PGCanvasEditor.open('canvas-quiet')); await pg.waitForSelector('.pce .pce-page .pgc-sec');
    await pg.click('[data-tab=add]'); await pg.click('.pce-pane [data-add=video]'); await pg.waitForTimeout(200);
    let st = await S(), vid = st.doc.sections.flatMap(s => s.els).find(e => e.id === st.sel);
    ok(vid && vid.t === 'video' && st.sub === 'connect' && await pg.isVisible('.pce-pane [data-vlink]'), 'Add → Video puts a video on the page and asks for its link');
    ok(await pg.evaluate(id => /paste a YouTube or Drive link/.test(document.querySelector('.pce-page .pgc-el[data-el="' + id + '"]').textContent), vid.id), 'without a link the page shows where it goes');
    const setLink = async u => { await pg.fill('.pce-pane [data-vlink]', u); await pg.press('.pce-pane [data-vlink]', 'Tab'); await pg.waitForTimeout(200); };
    const vNow = async () => (await S()).doc.sections.flatMap(s => s.els).find(e => e.id === vid.id);
    await setLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10');
    ok(JSON.stringify((await vNow()).src) === '{"k":"yt","id":"dQw4w9WgXcQ"}', 'a YouTube link is read');
    ok(await pg.evaluate(id => /i\.ytimg\.com\/vi\/dQw4w9WgXcQ/.test(document.querySelector('.pce-page .pgc-el[data-el="' + id + '"] img').src) && !document.querySelector('.pce-page iframe'), vid.id), 'the editor shows its poster (no player inside the editor)');
    await setLink('https://youtube.com/shorts/abcDEF12345?si=share');
    let v = await vNow(); ok(v.src.sh === 1 && v.l.h > v.l.w, 'a Short is read and its box stands up ' + JSON.stringify({ src: v.src, l: v.l }));
    await setLink('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing');
    ok((await vNow()).src.k === 'drive' && /Anyone with the link/.test(await pg.textContent('.pce-pane')), 'a Drive link is read, with how to share it');
    await setLink('https://example.com/not-a-video'); ok((await vNow()).src.k === 'drive', 'another link is refused (the video stays)');
    await setLink('https://youtu.be/dQw4w9WgXcQ');
    await pg.click('.pce-pane [data-k=v] [data-v=player]'); await pg.waitForTimeout(150); ok((await vNow()).v === 'player', 'Tap to play can be chosen');
    await pg.click('.pce-pane [data-k=v] [data-v=loop]');
    // save: the backend keeps it
    await pg.click('.pce-save'); /* step 101: no name / collection question — saved as the wedding's copy */ await pg.waitForFunction(() => PGCanvasEditor.state().src.id, null, { timeout: 8000 });
    const sv = call('canvasGet', { g: pub.galleryId, coupleKey: ck, id: (await S()).src.id }).doc.sections.flatMap(s => s.els).find(e => e.id === vid.id);
    ok(sv && JSON.stringify(sv.src) === '{"k":"yt","id":"dQw4w9WgXcQ"}' && sv.v === 'loop', 'saved with its video');
    ok(call('canvasSave', { g: pub.galleryId, coupleKey: ck, item: { kind: 'layout', name: 'bad', doc: { sections: [{ id: 's', h: { p: 600 }, els: [{ id: 'x', t: 'video', p: { x: 0, y: 0, w: 100, h: 60 }, src: { k: 'yt', id: '"><script>' } }, { id: 'y', t: 'photo', p: { x: 0, y: 0, w: 100, h: 60 }, src: { k: 'yt', id: 'dQw4w9WgXcQ' } }] }] } } }).doc.sections[0].els.every(e => !e.src || e.src.k !== 'yt'), 'the backend refuses a bad video id, and a video source on a photo');
    await pg.evaluate(() => PGCanvasEditor.close(true));
    // guests: draw a page with a looping video, a player, and a Short, as the Hub does
    const guest = async lite => pg.evaluate(lite => {
      document.documentElement.classList.toggle('pg-lite', lite);
      const box = document.createElement('div'); box.id = 'vbox'; box.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:99999;background:#fff'; document.body.appendChild(box);
      const doc = { v: 1, sections: [{ id: 'a', h: { p: 900 }, els: [
        { id: 'loop', t: 'video', p: { x: 20, y: 20, w: 350, h: 300 }, src: { k: 'yt', id: 'dQw4w9WgXcQ' }, v: 'loop' },
        { id: 'player', t: 'video', p: { x: 20, y: 340, w: 350, h: 197 }, src: { k: 'yt', id: 'dQw4w9WgXcQ' }, v: 'player' },
        { id: 'drive', t: 'video', p: { x: 20, y: 560, w: 350, h: 197 }, src: { k: 'drive', id: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345' }, v: 'loop' }] }] };
      window.__vi = PGCanvas.render(box, doc, { events: [], pool: [] }, () => {}, { mode: 'p', width: () => 390, scroller: box });
    }, lite);
    await guest(false); await pg.waitForTimeout(700);
    const g1 = await pg.evaluate(() => { const f = q => document.querySelector('#vbox [data-el="' + q + '"] iframe'); const l = f('loop'); return { loop: l && l.src, cover: l && Math.max(parseFloat(l.style.height) || 0, parseFloat(l.style.width) || 0) > 100, player: !!f('player'), drive: !!f('drive') }; });
    ok(/youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?.*autoplay=1&mute=1&loop=1&controls=0/.test(g1.loop || ''), 'guests: the looping video starts by itself, muted, in YouTube\'s own player');
    ok(g1.cover && !g1.player && !g1.drive, 'it fills its box; the player and the Drive video wait for a tap ' + JSON.stringify(g1));
    await pg.evaluate(() => document.querySelector('#vbox [data-el="player"] .pgc-vplay').click()); await pg.waitForTimeout(200);
    ok(await pg.evaluate(() => /controls=1/.test((document.querySelector('#vbox [data-el="player"] iframe') || {}).src || '')), 'a tap plays the player, with controls (and sound)');
    await pg.evaluate(() => document.querySelector('#vbox [data-el="drive"] .pgc-vid').click()); await pg.waitForTimeout(200);
    ok(await pg.evaluate(() => /drive\.google\.com\/file\/d\/1AbCdEfGhIjKlMnOpQrStUvWxYz012345\/preview/.test((document.querySelector('#vbox [data-el="drive"] iframe') || {}).src || '')), 'a tap opens the Drive video in Drive\'s own player');
    await pg.screenshot({ path: '/tmp/s97b_guest.png' });
    await pg.evaluate(() => { __vi.destroy(); document.getElementById('vbox').remove(); });
    await guest(true); await pg.waitForTimeout(700);
    ok(await pg.evaluate(() => !document.querySelector('#vbox iframe')), 'light mode: nothing starts by itself');
    await pg.evaluate(() => { __vi.destroy(); document.getElementById('vbox').remove(); document.documentElement.classList.remove('pg-lite'); });
    ok(frames.every(u => /youtube-nocookie\.com|drive\.google\.com\/file/.test(u)) && !frames.some(u => /\/api\//.test(u)), 'videos only ever go to YouTube or Drive (no PicGrades relay)');
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
