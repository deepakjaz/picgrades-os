// Captures real app screens of Reel Edits for the how-to video. Photos = soft "light" placeholders (no real wedding photos yet).
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/claude/picgrades-os', OUT = '/home/claude/video/shots', PH = '/home/claude/video/ph';
process.chdir(path.join(ROOT, 'tests'));
const { call, mail, DRIVE } = require(path.join(ROOT, 'tests/gas_mock'));
const W = 'HOWTOVIDEOWEDDING0001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
const phs = fs.readdirSync(PH).sort();
[['vH', 'Haldi'], ['vS', 'Sangeet'], ['vW', 'Wedding']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['VX' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
const bytesOf = id => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(PH, phs[n % phs.length])); };
global.__fetchBytes = bytesOf;
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const g = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: g.galleryId }).gallery.coupleKey;
const T = {};   // tap targets: name -> {x,y,w,h} in css px of the 390x844 screen
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(ROOT, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : u.endsWith('.mp3') ? 'audio/mpeg' : 'text/javascript'); res.end(d); } });
}).listen(8890, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await require('/home/claude/audit/fonts_route.js')(ctx);
  await ctx.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf((r.request().url().match(/\/d\/([^=?]+)/) || [])[1]) }));
  await ctx.addInitScript(() => { try { localStorage.setItem('pg_viewer_dir', 'v'); } catch (e) {} });
  const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('PAGEERR', e.message));
  const shot = (n) => pg.screenshot({ path: path.join(OUT, n + '.png') });
  const burst = async (n, frames, gap) => { for (let i = 0; i < frames; i++) { await pg.screenshot({ path: path.join(OUT, n + '-' + String(i).padStart(3, '0') + '.png') }); await pg.waitForTimeout(gap); } };
  const box = async (name, sel) => { const r = await pg.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => { const r = x.getBoundingClientRect(); return r.width && r.height && r.top >= 0 && r.bottom <= innerHeight + 2; }); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel); T[name] = r; if (!r) console.log('NO TARGET', name, sel); return r; };
  await pg.goto('http://localhost:8890/c/' + g.galleryId + '/' + ck + '?layout=bento-concierge&theme=' + (process.env.THEME || '')); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(2500);
  // 1. the Hub with the Reel Edits card
  await pg.evaluate(() => { const c = document.querySelector('.pgl-reelcard') || document.getElementById('pghReel'); c.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(1200);
  await box('hub_reel', '.pgl-reelcard, .pgl-reel, #pghReel'); await burst('s1-hub', 16, 110);
  // Find me's "Your photos" (what a guest gets after the selfie): the reel opens with them chosen
  await pg.evaluate(() => { const ph = GALLERY.events.flatMap(e => e.photos).slice(0, 10); GALLERY.personal = [{ name: 'Your photos', photos: ph }]; pgOpenReel(ph); });
  await pg.waitForSelector('.rl-wrap[data-view=inspo]', { timeout: 30000 }); await pg.waitForTimeout(1500);
  await box('feed_use', '.re-ins .re-use'); await burst('s2-feed', 30, 90);
  await pg.$eval('.re-feed', f => f.scrollTo({ top: f.clientHeight, behavior: 'smooth' })); await burst('s2b-swipe', 14, 60); await pg.waitForTimeout(800);
  await box('feed_use2', '.re-ins .re-use'); await burst('s2c-feed', 26, 90);
  await pg.evaluate(() => { const u = [...document.querySelectorAll('.re-ins .re-use')].find(x => { const r = x.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }); u.click(); });
  await pg.waitForSelector('.rl-picker'); await pg.waitForTimeout(1200);
  await box('pick_phone', '.rl-picker .re-phone'); await shot('s3-picker');
  // add a photo and a clip from the phone
  const inp = await pg.$('.rl-picker input[type=file]');
  if (inp) { await inp.setInputFiles([path.join(PH, phs[7]), '/home/claude/video/clip.webm']); await pg.waitForTimeout(2500); }
  else console.log('NO FILE INPUT');
  await pg.evaluate(() => { const g = document.querySelector('.rl-pgrid'); if (g) g.scrollTop = 0; });
  await box('pick_next', '.rl-picker .re-next'); await shot('s3b-picker');
  await pg.click('.rl-picker .re-next'); await pg.waitForSelector('.rl-wrap[data-view=edit]', { timeout: 30000 }); await pg.waitForTimeout(1500);
  await box('ed_play', '.re-play'); await shot('s4-editor');
  await pg.click('.re-play'); await burst('s4b-play', 36, 80); await pg.click('.re-play'); await pg.waitForTimeout(300);
  await box('t_text', '.re-tool[data-tool=text]'); await box('t_draw', '.re-tool[data-tool=sticker]'); await box('t_filter', '.re-tool[data-tool=filters]'); await box('t_music', '.re-tool[data-tool=audio]'); await box('ed_next', '.re-v-edit .re-next');
  await shot('s5-tools');
  await pg.click('.re-tool[data-tool=text]'); await pg.waitForTimeout(500); await pg.fill('.re-ta', 'Anika weds Rohan'); await pg.waitForTimeout(500); await shot('s5b-text'); await pg.click('.re-sh-done'); await pg.waitForTimeout(500);
  await pg.click('.re-tool[data-tool=sticker]'); await pg.waitForSelector('.re-stk'); await pg.waitForTimeout(600); await box('stk', '.re-stk:nth-child(6)'); await shot('s6-draw');
  await pg.locator('.re-stk').nth(5).click(); await pg.waitForTimeout(700); await shot('s6b-draw'); await pg.click('.re-sh-done'); await pg.waitForTimeout(500);
  await pg.click('.re-tool[data-tool=filters]'); await pg.waitForTimeout(600); await box('golden', '.re-filter:nth-child(3)'); await shot('s7-filter');
  await pg.locator('.re-filter', { hasText: 'Golden' }).click(); await pg.waitForTimeout(700); await shot('s7b-filter'); await pg.click('.re-sh-done'); await pg.waitForTimeout(500);
  await pg.click('.re-tool[data-tool=audio]'); await pg.waitForTimeout(800); await shot('s8-music'); await pg.click('.re-sh-done').catch(() => {}); await pg.waitForTimeout(500);
  await pg.click('.re-tool[data-tool=length]'); await pg.locator('.re-sheet .rl-chip', { hasText: '15 s' }).click(); await pg.click('.re-sh-done'); await pg.waitForTimeout(400);
  await pg.click('.re-v-edit .re-next'); await burst('s9-making', 20, 250);
  await pg.waitForSelector('.re-v-export video', { timeout: 120000 }); await pg.waitForTimeout(800);
  await pg.evaluate(() => new Promise(r => { const v = document.querySelector('.re-v-export video'); v.currentTime = 7; v.onseeked = () => r(); setTimeout(r, 3000); })); await pg.waitForTimeout(500); await shot('s9b-ready');
  await box('share', '.re-v-export .re-share, .re-v-export button'); 
  fs.writeFileSync(path.join(OUT, 'targets.json'), JSON.stringify(T, null, 1));
  console.log(JSON.stringify(T));
  await b.close(); srv.close(); process.exit(0);
});
