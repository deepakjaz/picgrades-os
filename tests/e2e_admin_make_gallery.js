// Step 99 browser check: on the admin page, "Make a gallery for a client" makes a client's wedding from a Drive link
// (no order needed, no code from the client); the client then sees it in their own account.
const http = require('http'); const fs = require('fs'); const path = require('path');
global.__autoOpen = false;
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
const W = 'ADMINMAKEGALLERY0099'; DRIVE.folders[W] = { name: 'T', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files['AM' + i] = { name: i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
global.__fetchBytes = () => fs.readFileSync(path.join(FX, 'sample1.jpg'));
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
call('requestCode', { email: 'adcmediaa@gmail.com' });
const admin = call('verifyCode', { email: 'adcmediaa@gmail.com', code: codeOf('adcmediaa@gmail.com') }).token;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8921, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  async function open(url, t, w) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    if (t) await ctx.addInitScript(t => localStorage.setItem('pg_token', t), t);
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://localhost:8921' + url); await pg.waitForTimeout(1300); return pg;
  }
  try {
    for (const w of [1280, 390]) {
      const pg = await open('/app/admin.html', admin, w);
      await pg.waitForSelector('#mk', { state: 'visible' });
      check(await pg.evaluate(() => [...document.querySelectorAll('#mk input, #mk select, #mk button')].filter(x => x.offsetParent).every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().right <= innerWidth + 1)), w + ' px: the form fits the screen and every field is at least 44 px tall');
      if (w === 390) { await pg.screenshot({ path: '/tmp/s99_admin_phone.png' }); await pg.context().close(); continue; }
      // a new client, without a name → asks for it
      await pg.fill('#mkEmail', 'priya99@example.com'); await pg.fill('#mkTitle', 'Priya & Dev'); await pg.fill('#mkFolder', 'https://drive.google.com/drive/folders/' + W);
      await pg.click('#mkGo'); await pg.waitForFunction(() => /name/.test(document.getElementById('mkMsg').textContent));
      check(true, 'a new email without a name asks for the client\'s name');
      await pg.fill('#mkName', 'Priya Mehta'); await pg.fill('#mkDate', '2026-12-28');
      await pg.click('#mkGo'); await pg.waitForSelector('#mkDone:not(.hidden)', { timeout: 15000 });
      const done = await pg.evaluate(() => document.getElementById('mkDone').textContent);
      check(/Priya & Dev/.test(done) && /4 photos/.test(done) && /new account/.test(done) && /\/c\//.test(done), 'the gallery is made and the couple link shows (' + done.slice(0, 120) + '…)');
      check(mail.some(m => m.to === 'priya99@example.com' && /ready/.test(m.subject)), 'the client was emailed');
      await pg.screenshot({ path: '/tmp/s99_admin_laptop.png' });
      await pg.context().close();
    }
    // the client signs in themselves later and finds it
    call('requestCode', { email: 'priya99@example.com' });
    const tok = call('verifyCode', { email: 'priya99@example.com', code: codeOf('priya99@example.com') }).token;
    check(call('myWeddings', { token: tok }).weddings.some(w => w.title === 'Priya & Dev'), 'the client finds the wedding in their own account');
  } catch (e) { bad++; console.error(e); }
  console.log('page errors: ' + JSON.stringify(errors));
  if (errors.length) bad++;
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
});
