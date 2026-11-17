// Browser test (step 69): scroll or swipe in the photo viewer.
//   · the first time, a question: scroll up and down, or swipe left and right; the choice flies into the top-bar button, which glows
//   · left / right: photos move sideways, the filmstrip lies along the bottom above the buttons (no overlap), the photo sits above it
//   · the button switches back any time, on the same photo; the choice is kept on the phone
//
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'VIEWERDIR00000000069';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 8; i++) DRIVE.files['DR' + String(i).padStart(2, '0')] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Sana & Kabir' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8869, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const B = 'http://localhost:8869';
  const open = async (url, store) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('DR01') }));
    await pg.addInitScript(() => { window.__pgdAsk = true; });
    if (store) await pg.addInitScript(s => { Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); }, store);
    await pg.goto(B + url); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1000);
    await pg.evaluate(() => openCollection(GALLERY.events[0].name, 0)); await pg.waitForTimeout(800);
    return { ctx, pg };
  };
  const swipe = (pg, dx, dy) => pg.evaluate(([dx, dy]) => {
    const f = document.getElementById('pgvFeed'), x = 200, y = 400;
    const t = (cx, cy) => new Touch({ identifier: 1, target: f, clientX: cx, clientY: cy });
    f.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x, y)], changedTouches: [t(x, y)], bubbles: true }));
    f.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx, y + dy)], bubbles: true }));
  }, [dx, dy]);
  const at = pg => pg.evaluate(() => activeIdx);
  const SHOTS = process.env.PG_SHOTS, shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const box = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; }, sel);
  let { ctx, pg } = await open('/g/' + gid);
  await pg.waitForSelector('.pgd-ask.show', { timeout: 4000 }).catch(() => {});
  check(await pg.isVisible('.pgd-ask') && /How do you like to see photos/.test(await pg.textContent('.pgd-ask')), 'first time: the question shows');
  check(await pg.locator('.pgd-opt').count() === 2 && /Scroll up and down/.test(await pg.textContent('.pgd-opt[data-m="v"]')) && /Swipe left and right/.test(await pg.textContent('.pgd-opt[data-m="h"]')), 'two choices: scroll up and down, swipe left and right');
  await shot(pg, 'dir-1-question');
  await pg.click('.pgd-opt[data-m="h"]'); await pg.waitForTimeout(400);
  check(await pg.evaluate(() => document.body.classList.contains('pgv-swipe')) && await pg.evaluate(() => localStorage.getItem('pg_viewer_dir')) === 'h', 'swipe chosen and kept on the phone');
  check(await pg.locator('.pgd-fly').count() === 1, 'the choice flies up to the button');
  await pg.waitForTimeout(700);
  check(await pg.evaluate(() => document.getElementById('pgvDir').classList.contains('pgd-glow')), 'the button glows so they know where to change it');
  check(!(await pg.isVisible('.pgd-ask')), 'the question is gone');
  await pg.waitForTimeout(2600);
  // layout: filmstrip along the bottom, above the buttons, no overlap; the photo above the filmstrip
  const rail = await box(pg, '#view-root .mk-filmstrip-rail'), bar = await pg.evaluate(() => Math.min(...[...document.querySelectorAll('#pgvBar .pgv-ic')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().top)));
  check(rail.w > 380 && rail.h < 100 && rail.b <= bar + 1, 'filmstrip lies along the bottom, just above the buttons (no overlap)');
  const img = await pg.evaluate(() => { const i = document.querySelectorAll('.pgv-item img')[activeIdx].getBoundingClientRect(); return { b: i.bottom }; });
  check(img.b <= rail.t + 1, 'the photo sits above the filmstrip');
  const topBtns = await pg.evaluate(() => [...document.querySelectorAll('#pgvTop .pgv-ic')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return [r.left, r.right]; }));
  check(topBtns.every(([l, r]) => l >= 0 && r <= 390), 'top buttons stay on screen');
  await shot(pg, 'dir-2-swipe');
  // swipe sideways (real scroll), then the filmstrip follows
  await pg.evaluate(() => { const f = document.getElementById('pgvFeed'); f.scrollTo({ left: f.clientWidth * 2, behavior: 'auto' }); });
  await pg.waitForTimeout(1200);
  check(await at(pg) === 2, 'scrolling the photos sideways moves to photo 3');
  const thumb = await pg.evaluate(() => { const t = document.querySelectorAll('.mk-thumb-item')[activeIdx].getBoundingClientRect(); return t.left + t.width / 2; });
  check(Math.abs(thumb - 195) < 40, 'the filmstrip centres the current photo (' + Math.round(thumb) + ')');
  await swipe(pg, 0, -140); await pg.waitForTimeout(800);
  check(await at(pg) === 3, 'in swipe mode an upward flick also goes to the next photo');
  await pg.click('.mk-thumb-item:nth-child(6)'); await pg.waitForTimeout(1200);
  const left = await pg.evaluate(() => { const f = document.getElementById('pgvFeed'); return Math.round(f.scrollLeft / f.clientWidth); });
  check(await at(pg) === 5 && left === 5, 'tap a filmstrip photo: the photos slide to it');
  // switch back with the button, stay on the same photo
  await pg.click('#pgvDir'); await pg.waitForTimeout(900);
  const back = await pg.evaluate(() => { const f = document.getElementById('pgvFeed'); return { swipe: document.body.classList.contains('pgv-swipe'), i: activeIdx, pos: Math.round(f.scrollTop / f.clientHeight), saved: localStorage.getItem('pg_viewer_dir') }; });
  check(!back.swipe && back.i === 5 && back.pos === 5 && back.saved === 'v', 'the button switches to up/down, on the same photo');
  const rail2 = await box(pg, '#view-root .mk-filmstrip-rail');
  check(rail2.w < 100 && rail2.r > 370, 'up/down: the filmstrip is back on the right');
  await shot(pg, 'dir-3-scroll');
  await ctx.close();
  // next visit: no question, the choice is remembered
  ({ ctx, pg } = await open('/g/' + gid, { pg_viewer_dir: 'h' }));
  await pg.waitForTimeout(1200);
  check(!(await pg.isVisible('.pgd-ask')) && await pg.evaluate(() => document.body.classList.contains('pgv-swipe')), 'next time: no question, opens in swipe mode');
  await ctx.close();
  // a computer, wide screen
  const ctx2 = await b.newContext({ viewport: { width: 1366, height: 820 } }); const pg2 = await ctx2.newPage(); pg2.on('pageerror', e => errors.push(e.message));
  await pg2.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('DR01') }));
  await pg2.addInitScript(() => { localStorage.setItem('pg_viewer_dir', 'h'); });
  await pg2.goto(B + '/g/' + gid); await pg2.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg2.waitForTimeout(900);
  await pg2.evaluate(() => openCollection(GALLERY.events[0].name, 0)); await pg2.waitForTimeout(900);
  await pg2.keyboard.press('ArrowRight'); await pg2.waitForTimeout(900);
  check(await pg2.evaluate(() => activeIdx) === 1 && await pg2.evaluate(() => { const f = document.getElementById('pgvFeed'); return Math.round(f.scrollLeft / f.clientWidth); }) === 1, 'computer: the right arrow key slides to the next photo');
  await shot(pg2, 'dir-4-computer');
  await ctx2.close();
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
