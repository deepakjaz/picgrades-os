// Browser test (step 61): one link per person. /g/ guest · /c/<id>/<key> couple · /ph/ photographer · /pg/ PicGrades.
// The link decides the view (not what the phone remembers); a badge names it; staff or the couple on the guest link see the
// guest view with a bar to switch; staff links ask for the email code; old ?couple= links become /c/ links; the client email has both links.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'LINKSTEST000000000061';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 8; i++) DRIVE.files['LK' + String(i).padStart(2, '0')] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8864, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const B = 'http://localhost:8864';
  const open = async (url, store) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('LK01') }));
    if (store) await pg.addInitScript(s => { Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); }, store);
    await pg.goto(B + url); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1200);
    return { ctx, pg };
  };
  const view = pg => pg.evaluate(() => ({ role: PGControl.role(), badge: (document.getElementById('pgRoleBadge') || {}).textContent || '', bar: (document.getElementById('pgLinkBar') || {}).textContent || '', barLink: ((document.querySelector('#pgLinkBar a') || {}).href || ''), url: location.pathname }));
  // 1. guest
  let o = await open('/g/' + gid), v = await view(o.pg);
  check(v.role === 'guest' && v.badge === 'Guest' && !v.bar, '/g/ = Guest view, badge "Guest", no bar');
  await o.pg.screenshot({ path: '/tmp/s61_guest.png' }); await o.ctx.close();
  // 2. couple
  o = await open('/c/' + gid + '/' + ck); v = await view(o.pg);
  check(v.role === 'couple' && v.badge === 'Couple', '/c/<id>/<key> = Couple view, badge "Couple"');
  await o.pg.reload(); await o.pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await o.pg.waitForTimeout(1200);
  check((await view(o.pg)).role === 'couple', 'the couple link stays the couple after a reload');
  await o.pg.screenshot({ path: '/tmp/s61_couple.png' });
  // 3. the couple's phone opening the guest link: guest view + switch bar
  await o.pg.goto(B + '/g/' + gid); await o.pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await o.pg.waitForTimeout(1200);
  v = await view(o.pg);
  check(v.role === 'guest' && v.badge === 'Guest' && /You are seeing what guests see/.test(v.bar) && v.barLink.endsWith('/c/' + gid + '/' + ck), 'the couple on the guest link: guest view, bar "Switch to Couple view"');
  await o.ctx.close();
  // 4. a wrong couple key
  o = await open('/c/' + gid + '/wrongkey123'); v = await view(o.pg);
  check(v.role === 'guest' && /not valid/.test(v.bar), 'a wrong couple key: guest view and "This couple link is not valid"');
  await o.ctx.close();
  // 5. an old couple link keeps working and becomes /c/
  o = await open('/g/' + gid + '?couple=' + ck); v = await view(o.pg);
  check(v.role === 'couple' && v.url === '/c/' + gid + '/' + ck, 'old /g/…?couple= link: couple view, address becomes /c/<id>/<key>');
  await o.ctx.close();
  // 6. a PicGrades login on the guest link: guest rules (camera only), bar to switch
  o = await open('/g/' + gid, { pg_token: admin }); await o.pg.waitForTimeout(800); v = await view(o.pg);
  check(v.role === 'guest' && v.badge === 'Guest' && /Switch to PicGrades view/.test(v.bar) && v.barLink.endsWith('/pg/' + gid), 'PicGrades login on the guest link: guest view, bar "Switch to PicGrades view"');
  await o.pg.screenshot({ path: '/tmp/s61_staff_on_guest.png' });
  check(await o.pg.evaluate(() => pgToken() === '' && !pgIsStaff()), '… and the login is not sent from the guest link');
  await o.ctx.close();
  // 7. /pg/ with the login
  o = await open('/pg/' + gid, { pg_token: admin }); v = await view(o.pg);
  check(v.role === 'picgrades' && v.badge === 'PicGrades' && !v.bar, '/pg/ with the login: PicGrades view, badge "PicGrades"');
  await o.pg.screenshot({ path: '/tmp/s61_pg.png' }); await o.ctx.close();
  // 8. /ph/ without a login: asks for the email code, then opens as staff
  o = await open('/ph/' + gid); v = await view(o.pg);
  check(v.role === 'guest' && /please sign in/.test(v.bar) && await o.pg.isVisible('#pgSignIn.show'), '/ph/ without a login: "please sign in" and the sign-in sheet');
  await o.pg.screenshot({ path: '/tmp/s61_signin.png' });
  await o.pg.fill('#pgSiEmail', 'adcmediaa@gmail.com'); await o.pg.click('#pgSiGo'); await o.pg.waitForSelector('#pgSiCodeRow:not(.hidden)');
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  await o.pg.fill('#pgSiCode', code); await Promise.all([o.pg.waitForNavigation(), o.pg.click('#pgSiGo')]);
  await o.pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await o.pg.waitForFunction(() => PGControl.role() !== 'guest', null, { timeout: 10000 }).catch(() => {});
  v = await view(o.pg);
  check(v.role === 'picgrades' && v.badge === 'PicGrades', 'after the email code: signed in, staff view (' + v.role + ')');
  await o.ctx.close();
  // 9. a login with no access to this wedding
  o = await open('/ph/' + gid, { pg_token: 'not-a-real-login' }); await o.pg.waitForTimeout(800); v = await view(o.pg);
  check(v.role === 'guest' && /no access to this wedding/.test(v.bar), 'a login without access: guest view and "This login has no access to this wedding"');
  await o.ctx.close();
  // 10. the client email has the couple's own link and the guest link
  const before = mail.length; call('sendGallery', { token: admin, g: gid, to: 'riya@example.com' });
  const em = JSON.stringify(mail.slice(before));
  check(em.indexOf('/c/' + gid + '/' + ck) > -1 && em.indexOf('/g/' + gid) > -1, 'Send to client: the email has the private couple link and the guest link');
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
