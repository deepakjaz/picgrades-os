// Browser test (step 72): reels in a phone, and the demo wedding that changes on every visit.
//   · the Hub's Reel Edits card shows a small phone playing the wedding's photos like a reel
//   · the photographer page's feature cards: a reel phone for the reel maker and Root Moment, an icon for the rest, no screenshots
//   · a demo wedding: each visit a new theme and layout from a list shuffled on this phone, no repeat until all were shown;
//     the same during one visit; a choice made in the Control Panel wins
//   · a demo wedding's Hub uses its highlights (up to 40 per event); the try-it photos prefer the highlights
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'STUDIOWEDDING00000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['pS', 'Sangeet'], ['pW', 'Wedding'], ['pR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 5; i++) DRIVE.files['PS' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const D = 'DEMOTRYWEDDING000070';
DRIVE.folders[D] = { name: D, access: 'ANYONE_WITH_LINK' };
[['dH', 'Haldi'], ['dW', 'Wedding']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: D }; for (let i = 0; i < 12; i++) DRIVE.files['DT' + k + String(i).padStart(2, '0')] = { name: 'd' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
call('signUp', { email: 'meera@example.com', name: 'Meera', kind: 'couple' });
const mtok = call('verifyCode', { email: 'meera@example.com', code: codeOf('meera@example.com') }).token;
const demoW = call('createWedding', { token: mtok, folderUrl: D, title: 'Meera & Kabir', eventDate: '2026-11-20' });   // a separate wedding, still a Draft
DB.Settings.push(['demoGallery', demoW.galleryId, 'try the editors']);
const bytesOf = (id) => { const f = DRIVE.files[id]; if (f && f.bytes) return Buffer.from(f.bytes); const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
// a 40 s test song at exactly 128 beats per minute (first beat at 0.30 s), made with plain JS + ffmpeg
(function makeSong() {
  const sr = 44100, bpm = 128, off = 0.30, dur = 40, x = new Float32Array(sr * dur);
  for (let k = 0; k < Math.floor((dur - off) * bpm / 60); k++) { const i0 = Math.floor((off + k * 60 / bpm) * sr), n = Math.floor(0.08 * sr);
    for (let j = 0; j < n && i0 + j < x.length; j++) { const t = j / sr; x[i0 + j] += Math.sin(2 * Math.PI * (60 + 80 * Math.exp(-t * 30)) * t) * Math.exp(-t / 0.02) * (k % 4 ? 0.6 : 1); } }
  const b = Buffer.alloc(44 + x.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 0.8 * 32767))), 44 + i * 2);
  fs.writeFileSync('/tmp/beat128.wav', b);
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', '/tmp/beat128.wav', '-b:a', '128k', '/tmp/my_song.mp3']);
})();

const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|p|c|ph|pg)\/[a-z0-9-]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8872, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS, FR = process.env.PG_FONTS_ROUTE;
  const T = JSON.parse(fs.readFileSync(path.join(root, 'app/themes/themes.json'))).themes.map(t => t.id);
  const LJ = JSON.parse(fs.readFileSync(path.join(root, 'app/themes/layouts.json'))), L = (LJ.layouts || LJ).map(x => x.id);
  const ctxOf = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); if (FR) await require(FR)(ctx); else await ctx.route('**fonts.g**', r => r.abort());
    await ctx.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf((r.request().url().match(/\/d\/([^=?]+)/) || [])[1]) })); return ctx; };
  const go = async (ctx, url) => { const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); await pg.goto('http://localhost:8872' + url); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1800); return pg; };

  // ---- 1. the Hub's Reel Edits card: a phone playing the wedding like a reel ----
  const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
  let ctx = await ctxOf(), pg = await go(ctx, '/c/' + pub.galleryId + '/' + ck + '?layout=ios-widget-home');   // step 95: bento-concierge became a free-canvas layout (no Hub cards)
  await pg.evaluate(() => { const c = document.querySelector('.pgl-reelcard'); if (c) c.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(300);
  const rc = await pg.evaluate(() => { const c = document.querySelector('.pgl-reel.pgl-reelcard'); if (!c) return null; const m = c.querySelector('.pgrm'), on = () => [...c.querySelectorAll('.pgrm img')].findIndex(i => i.classList.contains('on'));
    const r = m.getBoundingClientRect(), cr = c.getBoundingClientRect(); return { n: c.querySelectorAll('.pgrm img').length, ratio: r.width / r.height, inside: r.left >= cr.left - 1 && r.right <= cr.right + 1 && r.top >= cr.top - 1 && r.bottom <= cr.bottom + 1, first: on() }; });
  check(rc && rc.n >= 2 && Math.abs(rc.ratio - 9 / 16) < 0.04 && rc.inside, 'Hub: the Reel Edits card shows a 9:16 phone with the wedding\'s photos, inside the card');
  await pg.waitForTimeout(3900);
  const second = await pg.evaluate(() => [...document.querySelectorAll('.pgl-reelcard .pgrm img')].findIndex(i => i.classList.contains('on')));
  check(rc && second === rc.first, 'the phone stays on one photo (clean-up #9: Hub function cards stay still — no flashing)');
  check(await pg.evaluate(() => [...document.querySelectorAll('.pgl-b')].filter(e => !e.classList.contains('pgl-reelcard') && /pgl-(findme|post|upload|install|review)\b/.test(e.className)).every(e => !e.querySelector('img,.pg-cover'))), 'other function cards stay without photos');
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'reel-1-hub.png') });
  await ctx.close();

  // ---- 2. photographer page: no screenshots; reel phones for the reel maker and Root Moment, icons for the rest ----
  const company = DB.Galleries.slice(1).find(r => r.includes(pub.galleryId))[DB.Galleries[0].indexOf('companyName')];
  DB.Studios = [['slug', 'companyName', 'name', 'tagline', 'about', 'city', 'phone', 'email', 'instagram', 'website', 'galleries', 'status', 'createdAt'],
    ['alpha', company, 'Studio Alpha', 'Candid wedding stories', 'We photograph weddings.', 'Mumbai', '9876543210', '', 'studioalpha', '', '', 'Live', '']];
  ctx = await ctxOf(); pg = await go(ctx, '/p/alpha'); await pg.waitForTimeout(800);
  const cards = await pg.evaluate(() => [...document.querySelectorAll('.pgs-feat')].map(c => ({ k: c.dataset.feat, reel: !!c.querySelector('.pgrm'), ic: !!c.querySelector('.pgs-art-ic svg'), shot: !!c.querySelector('img[src*="/app/demo/"]') })));
  check(cards.length === 7 && cards.every(c => !c.shot), 'feature cards: no more screenshots');
  check(cards.filter(c => c.reel).map(c => c.k).sort().join() === 'moments,reel', 'the reel maker and Root Moment show a reel phone with the demo wedding\'s photos');
  check(cards.filter(c => c.ic).length === 5, 'the other five features show their icon');
  if (SHOTS) { await pg.locator('#pgsFeatSec').scrollIntoViewIfNeeded(); await pg.waitForTimeout(600); await pg.screenshot({ path: path.join(SHOTS, 'reel-2-studio.png') }); }
  await pg.evaluate(() => pgOpenStory('reel')); await pg.waitForTimeout(1500);
  check(await pg.locator('.pgs-sec[data-k=reel] .scr .pgrm').count() === 1 && await pg.locator('.pgs-sec[data-k=findme] .scr.pgs-art-ic').count() === 1, 'the feature story: a reel phone for the reel maker, an icon for Find me');
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'reel-3-story.png') });
  await ctx.close();

  // ---- 3. demo wedding: a new theme and layout on every visit ----
  call('setDemo', { token: admin, g: pub.galleryId, on: 'yes' });
  const HL = { Sangeet: ['PS00', 'PS01', 'PS02'], Wedding: ['PS10', 'PS11', 'PS12'], Reception: ['PS20', 'PS21', 'PS22'] };
  call('storyPicks', { g: pub.galleryId, coupleKey: ck, picks: { hl: HL } });
  ctx = await ctxOf(); const seenT = [], seenL = [];
  for (let v = 0; v < T.length; v++) {
    const p = await go(ctx, '/g/' + pub.galleryId);
    const r = await p.evaluate(() => ({ t: document.documentElement.dataset.pgTheme || '', l: (document.getElementById('pgLay') || {}).dataset ? document.getElementById('pgLay').dataset.layout : (document.getElementById('pgStory') ? 'story:' + PGLayout.current() : '') }));   // step 76: one story kind is not every story kind
    seenT.push(r.t); seenL.push(r.l);
    if (v === 0) {   // within one visit it stays the same
      await p.reload(); await p.waitForSelector('#pgBoot.hide', { state: 'attached' }); await p.waitForTimeout(1500);
      check(await p.evaluate(() => document.documentElement.dataset.pgTheme) === r.t, 'reloading during the same visit keeps the same theme');
      // the Hub uses the highlights only
      const ids = await p.evaluate(() => { const vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
        return [...document.querySelectorAll('#view-hub img, #pgStory img')].filter(vis).map(i => (i.src.match(/\/d\/([^=?]+)/) || [])[1])
          .concat([...document.querySelectorAll('#view-hub *, #pgStory *')].filter(vis).map(e => (getComputedStyle(e).backgroundImage.match(/\/d\/([^=?)"']+)/) || [])[1])).filter(Boolean); });
      const all = Object.values(HL).flat();
      check(ids.length > 0 && ids.every(id => all.includes(id)), 'a demo wedding\'s Hub shows only its highlights (' + ids.length + ' photos)');
    }
    await p.close();
  }
  { // every layout of a demo wedding shows only highlights
    const all = Object.values(HL).flat(), off = [];
    for (const l of L) {
      const p = await go(ctx, '/g/' + pub.galleryId + '?layout=' + l);
      const ids = await p.evaluate(() => { const vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
        return [...document.querySelectorAll('#view-hub img, #pgStory img')].filter(vis).map(i => (i.src.match(/\/d\/([^=?]+)/) || [])[1])
          .concat([...document.querySelectorAll('#view-hub *, #pgStory *')].filter(vis).map(e => (getComputedStyle(e).backgroundImage.match(/\/d\/([^=?)"']+)/) || [])[1])).filter(Boolean); });
      const extra = ids.filter(id => !all.includes(id)); if (extra.length) off.push(l + ': ' + extra.join(','));
      await p.close();
    }
    check(off.length === 0, 'in all ' + L.length + ' layouts the demo Hub shows only highlights' + (off.length ? ' (' + off.slice(0, 4).join(' | ') + ')' : ''));
  }
  check(new Set(seenT).size === T.length, 'every visit a different theme: all ' + T.length + ' shown before any repeats (' + new Set(seenT).size + ')');
  const shown = (LJ.layouts || LJ).filter(x => x.group !== 'progress' && x.group !== 'canvas').length;   // step 76: layouts being reworked are not shown to visitors
  check(new Set(seenL).size >= Math.min(12, shown), 'the layout changes too (' + new Set(seenL).size + ' different in ' + T.length + ' visits, ' + shown + ' layouts to show)');
  // a choice made in the Control Panel wins
  const p2 = await ctx.newPage(); await p2.goto('http://localhost:8872/g/' + pub.galleryId); await p2.evaluate(g => localStorage.setItem('pg_demo_' + g, JSON.stringify({ theme: 'sandalwood' })), pub.galleryId); await p2.close();
  const p3 = await go(ctx, '/g/' + pub.galleryId);
  check(await p3.evaluate(() => document.documentElement.dataset.pgTheme) === 'sandalwood', 'a theme picked in the demo Control Panel stays (no rotation)');
  if (SHOTS) await p3.screenshot({ path: path.join(SHOTS, 'reel-4-demo.png') });
  await ctx.close();
  // a normal (not demo) wedding never rotates
  call('setDemo', { token: admin, g: pub.galleryId, on: '' });
  ctx = await ctxOf(); const n1 = await go(ctx, '/g/' + pub.galleryId), t1 = await n1.evaluate(() => document.documentElement.dataset.pgTheme || ''); await n1.close();
  const n2 = await go(ctx, '/g/' + pub.galleryId), t2 = await n2.evaluate(() => document.documentElement.dataset.pgTheme || '');
  check(t1 === t2, 'a normal wedding keeps its own theme');
  await ctx.close();

  // ---- 4. the try-it photos prefer the event highlights ----
  call('storyPicks', { g: demoW.galleryId, coupleKey: call('facesStatus', { token: admin, g: demoW.galleryId }).gallery.coupleKey, picks: { hl: { Haldi: ['DT000', 'DT001', 'DT002', 'DT003', 'DT004'] } } });
  Object.keys(global.__CACHE).forEach(k => { if (/^studio:/.test(k)) delete global.__CACHE[k]; });   // the photographer page is cached for 5 minutes
  const td = call('getStudio', { slug: 'alpha' }).gallery.tryDemo, haldi = td.events.find(e => e.name === 'Haldi');
  check(haldi && haldi.photos.every(x => ['DT000', 'DT001', 'DT002', 'DT003', 'DT004'].includes(x.id)), 'the try-it photos come from the event\'s highlights');
  const big = { Haldi: Array.from({ length: 12 }, (_, i) => 'DT0' + String(i).padStart(2, '0')) };
  call('storyPicks', { g: demoW.galleryId, coupleKey: call('facesStatus', { token: admin, g: demoW.galleryId }).gallery.coupleKey, picks: { hl: Object.assign({}, big, { Wedding: Array.from({ length: 12 }, (_, i) => 'DT1' + String(i).padStart(2, '0')) }) } });
  const row = DB.Galleries.slice(1).find(r => r.includes(demoW.galleryId)), saved = JSON.parse(row[DB.Galleries[0].indexOf('storyPicks')]);
  check(saved.hl.Haldi.length === 12, 'more than 15 highlights per event can be kept (for the demo wedding)');

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
