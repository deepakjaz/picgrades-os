// Browser test (step 111): the films card — the couple adds YouTube / Shorts / Drive links (Try your photos › More › Your videos),
// adds the card from the design kit (Extras); guests see the videos one after another, round and round. No videos → no card for guests.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'FILMSWEDDING00000111';
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
}).listen(8937, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let fails = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  const URL = 'http://localhost:8937/g/' + pub.galleryId;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept('Our evening'));
  await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
  await require('./fonts_local').install(pg);
  try {
    const G = pub.galleryId, gal = () => call('getGallery', { g: G }).gallery;
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), mp = await ctx.newPage(); mp.on('pageerror', e => errors.push(e.message)); mp.on('dialog', d => d.accept());
    const route = async p => { await p.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
      await p.route(/youtube-nocookie\.com|i\.ytimg\.com|drive\.google\.com/, r => r.fulfill({ contentType: 'text/html', body: '<html><body style="background:#111"></body></html>' })); };
    await route(mp); await require('./fonts_local').install(mp);
    await mp.goto(URL + '?couple=' + ck); await mp.waitForSelector('#pgBoot.hide', { state: 'attached' }); await mp.waitForFunction(() => window.PGControl && PGControl.role() === 'couple' && window.PGTemplateEditor && window.PGFilms, null, { timeout: 10000 });
    await mp.evaluate(() => PGControl.designLayout('canvas-quiet')); await mp.waitForSelector('.pgte .pgte-scroll .pgc-sec', { timeout: 8000 });
    await mp.evaluate(() => { PGTemplateEditor.tab('more'); const e = document.querySelector('.pgte'); if (!e.classList.contains('pgte-drawer-open')) document.querySelector('.pgte-drawer-toggle').click(); });
    await mp.waitForSelector('[data-film-add]');
    for (const link of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/shorts/aBcDeFgHiJk', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view']) {
      const n0 = await mp.evaluate(() => (GALLERY.films || []).length);
      await mp.fill('[data-film-add]', link); await mp.dispatchEvent('[data-film-add]', 'change'); await mp.waitForFunction(n => (GALLERY.films || []).length === n, n0 + 1, { timeout: 8000 }); await mp.waitForTimeout(300); await mp.waitForSelector('[data-film-add]');
    }
    let F = gal().films; ok(F.length === 3 && F[0].k === 'yt' && F[1].sh === 1 && F[2].k === 'drive', 'Your videos: a YouTube video, a Short and a Drive video are saved for the wedding');
    await mp.fill('[data-film-add]', 'https://example.com/clip.mp4'); await mp.dispatchEvent('[data-film-add]', 'change'); await mp.waitForTimeout(400);
    ok(gal().films.length === 3, 'a link that is not YouTube / Drive is refused');
    await mp.fill('[data-film-add]', 'https://youtu.be/dQw4w9WgXcQ'); await mp.dispatchEvent('[data-film-add]', 'change'); await mp.waitForTimeout(500);
    ok(gal().films.length === 3, 'the same video is not added twice');
    // add the films card from the design kit (Extras comes first)
    await mp.evaluate(() => PGTemplateEditor.tab('parts')); await mp.waitForSelector('.pgte-addkit'); await mp.evaluate(() => document.querySelector('.pgte-addkit').click());
    await mp.waitForSelector('.pgte-kitsheet [data-kit]');
    ok(await mp.evaluate(() => document.querySelector('.pgte-kitsheet [data-kit]').dataset.kit === 'kit-extras'), 'the design kits start with Extras (the films card)');
    await mp.waitForSelector('.pgte-kitsheet .pgte-kitpart'); await mp.evaluate(() => document.querySelector('.pgte-kitsheet .pgte-kitpart').click()); await mp.evaluate(() => document.querySelector('.pgte-kitadd').click()); await mp.waitForTimeout(600);
    ok(await mp.evaluate(() => !!document.querySelector('.pgte-scroll [data-films] .pgf')), 'the films card is on the template');
    await mp.tap('.pgte-apply'); await mp.waitForFunction(() => !document.querySelector('.pgte'), null, { timeout: 10000 }); await mp.waitForTimeout(400);
    ok(gal().custom.story.add[0].from === 'kit-extras', 'Apply keeps the films card as a choice');
    // a guest: plays quietly when it comes into view, then the next one by itself, round and round
    const gp = await ctx.newPage(); gp.on('pageerror', e => errors.push(e.message)); await route(gp);
    await gp.goto(URL); await gp.waitForSelector('#pgStory [data-films] .pgf', { timeout: 10000 });
    await gp.evaluate(() => document.querySelector('#pgStory [data-films]').scrollIntoView({ block: 'center' })); await gp.waitForSelector('#pgStory .pgf iframe', { timeout: 6000 });
    const src0 = await gp.evaluate(() => document.querySelector('#pgStory .pgf iframe').src);
    ok(/dQw4w9WgXcQ/.test(src0) && /mute=1/.test(src0) && /autoplay=1/.test(src0), 'it starts the first video quietly when it comes into view');
    ok(await gp.evaluate(() => [...document.querySelectorAll('#pgStory .pgf-bar button')].every(b => b.getBoundingClientRect().height >= 44) && !/\d+\s*\/\s*\d+/.test(document.querySelector('#pgStory .pgf').textContent)), 'its buttons are at least 44 px and it shows no counts');
    const ended = () => gp.evaluate(() => { const fr = document.querySelector('#pgStory .pgf iframe'); window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ event: 'onStateChange', info: 0 }), source: fr.contentWindow })); });
    await ended(); await gp.waitForTimeout(300);
    ok(/aBcDeFgHiJk/.test(await gp.evaluate(() => document.querySelector('#pgStory .pgf iframe').src)), 'when a video ends, the next one starts by itself');
    await gp.click('#pgStory .pgf-next'); await gp.waitForTimeout(300); await gp.click('#pgStory .pgf-next'); await gp.waitForTimeout(300);
    ok(/dQw4w9WgXcQ/.test(await gp.evaluate(() => document.querySelector('#pgStory .pgf iframe').src)), 'after the last one it goes round to the first');
    await gp.screenshot({ path: '/tmp/s111_films.png' }); await gp.close();
    // no videos: guests get no card, the couple sees where they will play
    call('coupleLook', { g: G, coupleKey: ck, films: '[]' });
    const card = { name: 't', sections: [{ id: 's', h: { p: 400 }, els: [{ id: 'tv', t: 'films', p: { x: 10, y: 10, w: 360, h: 300 } }] }] };
    const drawn = pg => pg.evaluate(doc => { const b = document.createElement('div'); b.style.width = '390px'; document.body.appendChild(b); PGCanvas.render(b, doc, { films: [], events: [] }, () => {}, {}); const r = { card: !!b.querySelector('[data-films]'), note: !!b.querySelector('.pgf-empty') }; b.remove(); return r; }, card);
    const gp2 = await ctx.newPage(); gp2.on('pageerror', e => errors.push(e.message)); await route(gp2); await gp2.goto(URL); await gp2.waitForFunction(() => window.PGCanvas && window.PGControl, null, { timeout: 10000 });
    const asGuest = await drawn(gp2), asCouple = await drawn(mp);
    ok(!asGuest.card && asCouple.card && asCouple.note, 'no videos: guests see no empty card; the couple sees where the films will play'); await gp2.close();
    const gp3 = await ctx.newPage(); gp3.on('pageerror', e => errors.push(e.message)); await route(gp3);
    await gp3.goto(URL); await gp3.waitForSelector('#pgStory .pgc', { timeout: 10000 }); await gp3.waitForTimeout(500);
    ok(!(await gp3.$('#pgStory [data-films]')), 'no videos: the guest\'s Hub shows without the films card'); await gp3.close();
  } catch (e) { console.error(e); fails++; }
  console.log('page errors: ' + JSON.stringify(errors));
  ok(!errors.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
