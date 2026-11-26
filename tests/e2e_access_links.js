// Browser test (step 89): "Who can see" — the couple makes and edits an invite link, Turn off asks first,
// the screen fits phones and laptop in light and dark, and a guest who opens the link sees every photo.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'ACCESSLINKSWEDDING89';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
DRIVE.folders[W + 'e'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 8; i++) DRIVE.files['ALP' + i] = { name: 'p' + i + '.jpg', parent: W + 'e', mime: 'image/jpeg' };
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
call('guestPhotos', { g: pub.galleryId, coupleKey: ck, mode: 'findme' });
call('publishGallery', { g: pub.galleryId, token: admin, publish: true });
call('storyPicks', { g: pub.galleryId, coupleKey: ck, picks: { wh: ['ALP0', 'ALP1'] } });   // guests before Find me see the Wedding Highlights
global.__fetchBytes = id => fs.readFileSync(path.join(FX, files[(parseInt(String(id).replace(/\D/g, ''), 10) || 0) % files.length]));

const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = ''; req.on('data', d => body += d);
    req.on('end', () => { const p = JSON.parse(body); res.end(JSON.stringify(call(p.action, p))); });
    return;
  }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0];
  if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => {
    if (e) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript');
    res.end(d);
  });
}).listen(8911, async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const errors = [];
  let fails = 0;
  const ok = (v, m) => { console.log((v ? 'ok   ' : 'FAIL ') + m); if (!v) fails++; };
  const boot = pg => pg.waitForSelector('#pgBoot.hide', { state: 'attached', timeout: 20000 });
  const COUPLE = 'http://localhost:8911/c/' + pub.galleryId + '/' + ck;

  // 1. the couple: Control Panel › Who can see › make, edit, turn off
  let pg = await browser.newPage({ viewport: { width: 390, height: 844 } });
  pg.on('pageerror', e => errors.push(e.message));
  await pg.goto(COUPLE); await boot(pg); await pg.waitForFunction(() => PGControl.role() === 'couple', null, { timeout: 10000 });
  await pg.evaluate(() => PGControl.open()); await pg.waitForSelector('.pgcp-item[data-tab="access"]');
  ok(true, 'Control Panel shows "Who can see" for the couple');
  await pg.click('.pgcp-item[data-tab="access"]'); await pg.waitForSelector('.pgac .pgac-empty');
  await pg.click('[data-add]'); await pg.fill('.pgac-name', 'Family'); await pg.click('[data-size="10"]'); await pg.click('.pgac-save');
  await pg.waitForSelector('.pgac-card');
  ok(/0 of 10/.test(await pg.textContent('.pgac-card')), 'make Family (limit 10) → card shows 0 of 10');
  await pg.click('[data-edit]'); await pg.click('[data-size="25"]'); await pg.click('[data-dl]'); await pg.click('.pgac-save');
  await pg.waitForFunction(() => /0 of 25/.test(document.querySelector('.pgac-card').textContent));
  ok(/Download off/.test(await pg.textContent('.pgac-card')), 'edit → 0 of 25, Download off');
  await pg.click('[data-ask]'); ok(await pg.isVisible('.pgac-confirm') && !(await pg.$('.pgac-card [data-ask]')), 'Turn off asks first, and its own Turn off button hides');
  await pg.click('[data-cancel]'); ok(!(await pg.$('.pgac-confirm')) && !(await pg.$('.pgac-card.is-off')), 'Cancel keeps the link on');
  await pg.click('[data-ask]'); await pg.click('[data-off]'); await pg.waitForSelector('.pgac-card.is-off');
  ok(!!(await pg.$('[data-on]')), 'Turn off → the card is off and offers Turn on');
  await pg.click('[data-on]'); await pg.waitForSelector('.pgac-card:not(.is-off)');
  await pg.click('[data-edit]'); await pg.click('[data-dl]'); await pg.click('.pgac-save'); await pg.waitForFunction(() => /Download on/.test(document.querySelector('.pgac-card').textContent));
  const code = call('inviteList', { g: pub.galleryId, coupleKey: ck }).links[0].code;
  await pg.click('[data-close]'); ok(!(await pg.$('.pgac')), 'back closes Who can see');
  await pg.close();

  // 2. sizes and themes: fits, 44 px taps, nothing cut, Save always visible
  for (const [w, h] of [[375, 667], [390, 844], [430, 932], [1200, 800]]) for (const dark of [false, true]) {
    pg = await browser.newPage({ viewport: { width: w, height: h } });
    pg.on('pageerror', e => errors.push(e.message));
    await pg.goto(COUPLE); await boot(pg);
    if (dark) await pg.evaluate(() => document.documentElement.setAttribute('data-tkg-theme', 'dark'));
    await pg.evaluate(() => PGAccess.open()); await pg.waitForSelector('.pgac-card');
    await pg.click('[data-edit]'); await pg.waitForSelector('.pgac-sheet');
    const m = await pg.evaluate(() => {
      const r = document.querySelector('.pgac'), small = [...r.querySelectorAll('button')].filter(b => getComputedStyle(b).opacity !== '0').filter(b => { const x = b.getBoundingClientRect(); return x.width && (x.width < 44 || x.height < 44); }).map(b => b.className + ':' + b.textContent.trim());
      const cut = [...r.querySelectorAll('b,span,p,button')].filter(el => { const x = el.getBoundingClientRect(); return x.width && (x.right > innerWidth + 1 || x.left < -1); }).length;
      const tiny = [...r.querySelectorAll('b,span,p,button,i,label,div')].filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 11).length;
      const save = document.querySelector('.pgac-save').getBoundingClientRect();
      const card = getComputedStyle(document.querySelector('.pgac-card')).backgroundColor, ink = getComputedStyle(document.querySelector('.pgac-card b')).color;
      return { small, cut, tiny, saveIn: save.bottom <= innerHeight && save.top >= 0, wide: document.documentElement.scrollWidth <= innerWidth, card, ink };
    });
    const tag = w + 'px ' + (dark ? 'dark' : 'light');
    ok(m.small.length === 0, tag + ': every button is 44 px or more ' + (m.small.length ? JSON.stringify(m.small) : ''));
    ok(m.cut === 0 && m.wide && m.tiny === 0, tag + ': nothing cut off or wider than the screen, text 11 px or more');
    ok(m.saveIn, tag + ': Save stays visible in the edit sheet');
    ok(m.card !== m.ink, tag + ': card text is readable (' + m.card + ' / ' + m.ink + ')');
    await pg.close();
  }

  // 2b. the server is slow / fails twice → Try again shows and works
  pg = await browser.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errors.push(e.message));
  await pg.goto(COUPLE); await boot(pg);
  let fail = 2;
  await pg.route('**/api', r => { const b = r.request().postData() || ''; if (fail > 0 && /inviteList/.test(b)) { fail--; return r.abort(); } return r.continue(); });
  await pg.evaluate(() => PGAccess.open()); await pg.waitForSelector('[data-retry]', { timeout: 10000 });
  ok(fail === 0, 'it tries once more on its own before showing Try again');
  await pg.click('[data-retry]'); await pg.waitForSelector('.pgac-card');
  ok(true, 'Try again loads the links');
  await pg.close();

  // 3. a guest opens the invite link → asked for name once → every photo
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
  await pg.goto('http://localhost:8911/g/' + pub.galleryId + '?inv=' + code); await boot(pg);
  const before = await pg.evaluate(() => (GALLERY.events || []).reduce((n, e) => n + e.photos.length, 0));
  await pg.waitForSelector('#idSheet.show', { timeout: 8000 });
  ok(true, 'the guest is asked for their name and number');
  await pg.fill('#idName', 'Meera Joshi'); await pg.fill('#idPhone', '9876543210'); await pg.click('#idGo');
  await pg.waitForTimeout(1500); await pg.waitForFunction(() => typeof GALLERY !== 'undefined' && GALLERY && GALLERY.invite, null, { timeout: 15000 });
  const after = await pg.evaluate(() => ({ n: (GALLERY.events || []).reduce((n, e) => n + e.photos.length, 0), dl: GALLERY.invite.download }));
  ok(before < 8 && after.n === 8, 'after joining: all 8 photos (was ' + before + ')');
  ok(after.dl === 'on', 'downloads on for this link');
  ok(call('inviteList', { g: pub.galleryId, coupleKey: ck }).links[0].used === 1, 'the couple sees 1 of 25');
  await ctx.close();

  console.log('page errors: ' + JSON.stringify(errors));
  ok(errors.length === 0, 'no page errors');
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
});
