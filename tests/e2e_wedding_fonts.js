// Browser test (step 71): wedding fonts.
//   · no typewriter font anywhere; small labels use the theme's body font
//   · the couple's names use the theme's script font (Great Vibes / Pinyon Script / Parisienne) and always fit: at most two lines, never cut
//   · function cards never carry a wedding photo; Find me is never a card, only the small pinned button
// ask for others with their email; the couple approves in the Control Panel; the emailed link unlocks the photo.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'RULESWEDDING000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['rS', 'Sangeet'], ['rW', 'Wedding']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['RL' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Vithushan & Harveer', eventDate: '2026-12-20' });
const gid = pub.galleryId, ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const face = (v, k) => { const b = Buffer.alloc(128); for (let i = 0; i < 128; i++) b[i] = (v + i * (k || 3)) % 100; return [[0.1, 0.1, 0.2, 0.2], b.toString('base64')]; };
const FACES = {}; Object.keys(DRIVE.files).filter(id => id.startsWith('RL')).forEach(id => { FACES[id] = { w: 100, h: 100, f: [face(30 + Number(id.slice(2)), 11)] }; });
Object.assign(FACES, { RL00: { w: 100, h: 100, f: [face(500)] }, RL02: { w: 100, h: 100, f: [face(500), face(10, 1)] }, RL13: { w: 100, h: 100, f: [face(500)] }, RL11: { w: 100, h: 100, f: [face(10, 1)] } });
call('saveFaces', { token: admin, g: gid, pass: 1, done: true, photos: FACES });
console.log('face search ready:', call('getGallery', { g: gid }).gallery.faceSearch);
const T = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'themes', 'themes.json'))).themes;
const LJ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'themes', 'layouts.json'))), L = (LJ.layouts || LJ).map(x => x.id);
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8871, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  check(T.every(t => t.fonts.script && /Great Vibes|Pinyon Script|Parisienne/.test(t.fonts.script)) && new Set(T.map(t => t.fonts.script)).size === 3, 'every theme has a wedding script font; all three pairings are used');
  check(T.every(t => !/mono/i.test(t.fonts.display + t.fonts.body)), 'no theme uses a typewriter font');
  const open = async q => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf((r.request().url().match(/\/d\/([^=?]+)/) || [])[1]) }));
    await pg.goto('http://localhost:8871/g/' + gid + '?' + q); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1600);
    return { ctx, pg };
  };
  const look = () => {
    const mono = [...document.querySelectorAll('body *')].filter(e => e.offsetParent && [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()) && /mono|consol|courier/i.test(getComputedStyle(e).fontFamily)).map(e => e.textContent.trim().slice(0, 30));
    const names = [...document.querySelectorAll('.pgl-names,.pgh-title,.psh-couple-names')].filter(e => e.offsetParent).map(e => { const cs = getComputedStyle(e), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.15; return { font: cs.fontFamily, wide: e.scrollWidth > e.clientWidth + 1, lines: Math.round(e.scrollHeight / lh) }; });
    const acts = [...document.querySelectorAll('.pgl-findme,.pgl-reel,.pgl-post,.pgl-upload,.pgl-install,.pgl-review')].filter(e => e.offsetParent);
    return { mono, names, photoCards: acts.filter(e => e.querySelector('img,.pg-cover')).length, fm: { cards: [...document.querySelectorAll('.pgl-findme')].filter(e => e.offsetParent).length, pins: [...document.querySelectorAll('#view-hub .pgs-findme, #pgStory .pgs-findme')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').length } };
  };
  let fmSeen = 0, fmCard = [], monoAll = [], nameBad = [], photoCards = 0;
  for (const [i, l] of L.entries()) {
    const t = T[i % T.length], { ctx, pg } = await open('layout=' + l + '&theme=' + t.id);
    const r = await pg.evaluate(look);
    monoAll = monoAll.concat(r.mono.map(x => l + ': ' + x));
    r.names.forEach(n => { if (n.wide || n.lines > 2 || n.font.indexOf(t.fonts.script) < 0) nameBad.push(l + '/' + t.id + ' ' + JSON.stringify(n)); });
    photoCards += r.photoCards;
    if (r.fm.cards) fmCard.push(l); if (r.fm.pins === 1) fmSeen++;
    await ctx.close();
  }
  check(monoAll.length === 0, 'no typewriter text in any of the ' + L.length + ' layouts' + (monoAll.length ? ' (' + monoAll.slice(0, 4).join(' | ') + ')' : ''));
  check(nameBad.length === 0, 'the couple\'s names use the theme\'s script font and fit in two lines, never cut' + (nameBad.length ? ' (' + nameBad.slice(0, 3).join(' | ') + ')' : ''));
  check(photoCards === 0, 'function cards never carry a wedding photo');
  check(fmCard.length === 0, 'Find me is never a card in the grid' + (fmCard.length ? ' (' + fmCard.join(', ') + ')' : ''));
  check(fmSeen === L.length, 'Find me is the small pinned button in every layout (' + fmSeen + ' of ' + L.length + ')');
  if (process.env.PG_SHOTS && process.env.PG_FONTS_ROUTE) {   // screenshots with the real fonts (served locally)
    for (const [l, t] of [['bento-concierge', 'udaipur-sandstone'], ['ios-widget-home', 'jaipur-rose'], ['magazine-cover', 'ivory-glass'], ['story-living', 'pearl-atelier'], ['cinema-panorama', 'midnight-velvet']]) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await require(process.env.PG_FONTS_ROUTE)(ctx); const pg = await ctx.newPage();
      await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf((r.request().url().match(/\/d\/([^=?]+)/) || [])[1]) }));
      await pg.goto('http://localhost:8871/g/' + gid + '?layout=' + l + '&theme=' + t); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(3000);
      await pg.screenshot({ path: path.join(process.env.PG_SHOTS, 'font-' + l + '.png') }); await ctx.close();
    }
  }
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
