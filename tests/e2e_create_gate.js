// Browser test (step 58): Reel / Post Edits open up only after Find me; a pinned bar on the guest's own photos; a demo tries them without saving;
// Cocktail has its own look; every event gets a chapter; the 17 new music tracks are listed and present.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'CREATEGATE0000000058';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['sH', 'Haldi'], ['sM', 'Mehendi'], ['sS', 'Sangeet'], ['sW', 'Wedding'], ['sC', 'Cocktail'], ['sR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 20; i++) DRIVE.files['SX' + k + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Ashish & Muskan', eventDate: '2027-01-24' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8861, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const open = async (q, w, hh) => {
    const ctx = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: w < 900 }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept());
    await pg.route('https://lh3.googleusercontent.com/**', r => { const pid = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(pid) }); });
    await require('./fonts_local').install(pg);
    await pg.goto('http://localhost:8861/g/' + pub.galleryId + q); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(900); return { ctx, pg };
  };
  const cards = pg => pg.evaluate(() => [...document.querySelectorAll('#pgLay > section')].map(s => s.dataset.block));
  // 1. a guest before Find me: no Reel / Post Edits on any layout
  for (const lay of ['x-royal-journey', 'x-palace-window', 'x-horizon']) {
    const { ctx, pg } = await open('?layout=' + lay, 390, 844); const c = await cards(pg);
    check(c.length > 3 && c.indexOf('reel') < 0 && c.indexOf('post') < 0, lay + ': a guest before Find me sees no Reel / Post (' + c.join(',') + ')');
    if (lay === 'x-palace-window') {
      const ids = await pg.evaluate(() => [...document.querySelectorAll('#pgLay .x-chapter')].map(c => [...c.classList].find(k => /^x-id-/.test(k)) + ':' + c.querySelector('.x-cbtn').textContent.replace(/\s*→\s*$/, '')));
      check(ids.length === 6, 'six events, six chapters (the layout drew five): ' + ids.join(' | '));
      const ck2 = ids.find(x => /Cocktail|cocktail/.test(x)) || '';
      check(/x-id-cocktail:Raise a glass/.test(ck2) && !ids.some(x => /cocktail.*Sangeet/.test(x)), 'Cocktail has its own look and words, not the Sangeet’s (' + ck2 + ')');
      check(await pg.evaluate(() => !!document.querySelector('.x-id-cocktail .x-ball') && !!document.querySelector('.x-id-cocktail .x-bell') && !!document.querySelector('.x-id-sangeet .x-eq') && !document.querySelector('.x-id-sangeet .x-ball')), 'Cocktail: disco ball and bell; Sangeet keeps its stage lights');
    }
    await ctx.close();
  }
  // 2. Find me found the guest (kept on the phone): Reel / Post appear, and their photos get the pinned bar
  {
    const { ctx, pg } = await open('?layout=x-royal-journey', 390, 844);
    await pg.evaluate(() => { const ids = GALLERY.events[0].photos.slice(0, 6).map(p => p.id); pgStore('mine', { sure: ids, maybe: [] }); pgStore('found', 1); });
    await pg.reload(); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForFunction(() => !!document.querySelector('#pgLay > section[data-block=reel]'), null, { timeout: 5000 }).catch(() => {});
    const c = await cards(pg);
    check(c.indexOf('reel') > -1 && c.indexOf('post') > -1, 'after Find me: Reel and Post Edits show (' + c.join(',') + ')');
    check(await pg.evaluate(() => document.body.classList.contains('pg-can-create') && PGCreate.can()), 'the gallery knows this guest may create');
    await pg.evaluate(() => pgOpenEvent('Your photos')); await pg.waitForTimeout(800);
    const bar = await pg.evaluate(() => { const b = document.querySelector('.pgcr-bar'); return b ? { text: b.textContent, view: document.body.dataset.view, vis: getComputedStyle(b).display !== 'none' } : null; });
    check(!!bar && bar.vis && /Make a Reel/.test(bar.text) && /Make a Post/.test(bar.text) && bar.view === 'event', '“Your photos” opens with the pinned Reel / Post bar (' + JSON.stringify(bar) + ')');
    await pg.screenshot({ path: '/tmp/s58_pinned_bar.png' });
    await pg.evaluate(() => switchView('hub')); await pg.waitForTimeout(300);
    check(await pg.evaluate(() => !document.querySelector('.pgcr-bar')), 'leaving the photos takes the bar away');
    await pg.evaluate(() => pgOpenEvent(GALLERY.events[1].name)); await pg.waitForTimeout(500);
    check(await pg.evaluate(() => !document.querySelector('.pgcr-bar')), 'a normal event has no pinned bar');
    await ctx.close();
  }
  // 3. the couple always has them; a demo wedding has them, and saving is off
  {
    const { ctx, pg } = await open('?couple=' + ck + '&layout=x-royal-journey', 390, 844);
    await pg.waitForFunction(() => !!document.querySelector('#pgLay > section[data-block=reel]'), null, { timeout: 5000 }).catch(() => {}); const c = await cards(pg);
    check(c.indexOf('reel') > -1 && c.indexOf('post') > -1, 'the couple sees Reel and Post Edits before any Find me (' + c.join(',') + ' / ' + await pg.evaluate(() => PGControl.role() + ' ' + PGCreate.can()) + ')');
    await ctx.close();
  }
  {
    const { ctx, pg } = await open('?layout=x-royal-journey', 390, 844);
    await pg.evaluate(() => { GALLERY.demo = true; PGLayout.refresh(); PGCreate.paint(); }); await pg.waitForTimeout(400);
    const c = await cards(pg);
    check(c.indexOf('reel') > -1 && c.indexOf('post') > -1, 'a demo wedding: Reel and Post Edits to try (' + c.join(',') + ')');
    const opt = await pg.evaluate(async () => { pgOpenReel(GALLERY.events[0].photos.slice(0, 4)); await pgReelLoad; await new Promise(r => setTimeout(r, 300)); PGReel.close && PGReel.close();
      const o = PGReel.open; let seen = null; PGReel.open = x => { seen = x; return Promise.resolve(); }; pgOpenReel(GALLERY.events[0].photos.slice(0, 4)); await new Promise(r => setTimeout(r, 50)); PGReel.open = o; return seen && seen.demo; });
    check(opt === true, 'the reel maker opens in demo mode (saving and sharing off)');
    await ctx.close();
  }
  // 4. the music: 20 tracks, every file there, beats known
  const T = JSON.parse(fs.readFileSync(path.join(root, 'app/music/tracks.json'))).tracks;
  check(T.length === 20 && T.every(t => fs.existsSync(path.join(root, t.file)) && t.bpm > 50 && t.bpm < 170 && t.licence) && T.filter(t => /Pixabay/.test(t.credit || '')).length === 17, 'music: ' + T.length + ' tracks, every file present with tempo, credit and licence');
  const reelSrc = fs.readFileSync(path.join(root, 'app/reel.js'), 'utf8'), postSrc = fs.readFileSync(path.join(root, 'app/post.js'), 'utf8');
  check((reelSrc.match(/S\.opt\.demo/g) || []).length >= 2 && (postSrc.match(/demo/g) || []).length >= 2, 'demo guards on reel and post share / download');
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
