// Browser test (step 74): the "How a reel is made" video on the photographer page.
//   · plays silently on a loop like a GIF, only while it is on screen
//   · "Watch with sound" plays it once from the start with sound; when it ends it goes back to the silent loop
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'HOWTOSTUDIOWEDDING074';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['HW0' + i] = { name: i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan' });
const company = DB.Galleries.slice(1).find(r => r.includes(pub.galleryId))[DB.Galleries[0].indexOf('companyName')];
DB.Studios = [['slug', 'companyName', 'name', 'tagline', 'about', 'city', 'phone', 'email', 'instagram', 'website', 'galleries', 'status', 'createdAt'],
  ['alpha', company, 'Studio Alpha', 'Candid wedding stories', 'We photograph weddings.', 'Mumbai', '9876543210', '', 'studioalpha', '', '', 'Live', '']];
global.__fetchBytes = id => fs.readFileSync(path.join(FX, files[(parseInt(String(id).replace(/\D/g, ''), 10) || 0) % files.length]));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|p|c|ph|pg)\/[a-z0-9-]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', TYPES[path.extname(u)] || 'text/javascript'); res.end(d); } });
}).listen(0, async () => {
  const B = 'http://localhost:' + srv.address().port;
  const { chromium } = require('playwright'); const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS;
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await ctx.route('**fonts.g**', r => r.abort());
  await ctx.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(FX, files[0])) }));
  const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
  await pg.goto(B + '/p/alpha'); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1500);
  const st = () => pg.evaluate(() => { const v = document.querySelector('#pgsHowto video'); return { muted: v.muted, loop: v.loop, paused: v.paused, t: v.currentTime, btn: document.querySelector('#pgsHowto button').textContent, src: v.querySelector('source').getAttribute('src'), poster: v.poster, can: v.canPlayType('video/mp4; codecs="avc1.42E01E"') }; });
  let s = await st();
  check(s.src === '/app/demo/reel-howto.mp4' && /reel-howto\.jpg$/.test(s.poster) && fs.existsSync(path.join(root, 'app/demo/reel-howto.mp4')), 'the photographer page has the how-to video, with a poster');
  check(s.muted && s.loop && s.paused, 'off screen: silent, on a loop, not playing yet');
  await pg.locator('#pgsHowto').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1200);
  s = await st();
  const plays = !!s.can;   // this test browser may not have the H.264 decoder: then only the switches are checked
  check(!plays || (!s.paused && s.t > 0), 'on screen: it plays by itself, silently (like a GIF)' + (plays ? '' : ' — skipped, no H.264 here'));
  check(/Watch with sound/.test(s.btn), 'button: "Watch with sound"');
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'howto-1.png') });
  await pg.click('#pgsHowto button'); await pg.waitForTimeout(300);
  s = await st();
  check(!s.muted && !s.loop && s.t < 1 && /Mute/.test(s.btn), 'Watch with sound: from the start, with sound, once (no loop)');
  await pg.evaluate(() => document.querySelector('#pgsHowto video').dispatchEvent(new Event('ended'))); await pg.waitForTimeout(200);
  s = await st();
  check(s.muted && s.loop && /Watch with sound/.test(s.btn), 'when it ends: back to the silent loop');
  await pg.click('#pgsHowto button'); await pg.waitForTimeout(200); await pg.click('#pgsHowto button'); await pg.waitForTimeout(200);
  s = await st(); check(s.muted && s.loop, 'Mute: back to the silent loop at once');
  await pg.evaluate(() => window.scrollTo(0, 0)); await pg.locator('#pgsFeatSec .pgh-head').scrollIntoViewIfNeeded().catch(() => {}); await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(800);
  const off = await pg.evaluate(() => { const r = document.getElementById('pgsHowto').getBoundingClientRect(); return r.top > innerHeight || r.bottom < 0; });
  if (off) { s = await st(); check(s.paused, 'scrolled away: it pauses'); }
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
