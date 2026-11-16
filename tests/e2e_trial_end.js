// Browser test (step 65d): the free trial and the free basic gallery.
//   · trial: the Control Panel says "Free trial · 30 days left", the ☰ menu "Free trial · 30 days left"
//   · after 30 days: a notice ONCE ("Your free trial has ended…"), "Free basic gallery · until …" with Upgrade, Functions shows the
//     paid ones locked with a note, ☰ "Upgrade your wedding app"; guests get no Find me; the portal card says it too
const http = require('http'); const fs = require('fs'); const path = require('path');
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
DB.Settings.push(['supportEmail', 'hello@picgrades.com', 'test']);
const W = 'TRIALENDE2EWEDDING65D'; DRIVE.folders[W] = { name: 'T', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files['TF' + i] = { name: i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
global.__fetchBytes = () => fs.readFileSync(path.join(FX, 'sample1.jpg'));
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
call('signUp', { email: 'tara@example.com', name: 'Tara', kind: 'couple' });
const tok = call('verifyCode', { email: 'tara@example.com', code: codeOf('tara@example.com') }).token;
const wed = call('createWedding', { token: tok, folderUrl: W, title: 'Tara & Dev' }), gid = wed.galleryId;
const hd = DB.Galleries[0], row = () => DB.Galleries.slice(1).find(g => g[hd.indexOf('galleryId')] === gid);
row()[hd.indexOf('facesStatus')] = 'Ready';
call('storyPicks', { g: gid, token: tok, picks: { wh: ['TF0', 'TF1'] } });
call('publishGallery', { g: gid, token: tok, publish: true });
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html'; if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8876, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS; const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const couple = wed.coupleLink.replace(/^https?:\/\/[^/]+/, '');
  async function open(url, store) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    if (store) await ctx.addInitScript(s => Object.keys(s).forEach(k => localStorage.setItem(k, s[k])), store);
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message)); await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://localhost:8876' + url); await pg.waitForTimeout(1900); return pg;
  }
  const menu = async pg => { await pg.click('#pgMenuBtn'); await pg.waitForTimeout(300); const t = await pg.locator('.pgmenu').innerText(); await pg.click('.pgmenu-x'); await pg.waitForTimeout(350); return t; };

  // 1. during the trial
  let pg = await open(couple);
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(300);
  check(/Free trial/.test(await pg.locator('.pgplan-line').innerText()) && /30 days left/.test(await pg.locator('.pgplan-line').innerText()), 'trial: Control Panel says "Free trial · 30 days left"');
  await pg.click('.pgcp-x'); await pg.waitForTimeout(300);
  check(/Free trial · 30 days left/.test(await menu(pg)), 'trial: the ☰ menu shows the days left');
  check(!(await pg.locator('.pgplan-notice').count()), 'no notice during the trial');
  await pg.context().close();

  // 2. the trial has ended
  row()[hd.indexOf('trialEnds')] = new Date(Date.now() - 3600000).toISOString().slice(0, 19).replace('T', ' ');
  pg = await open(couple);
  const nt = await pg.locator('.pgplan-notice').innerText().catch(() => '');
  check(/Your free trial has ended/.test(nt) && /stay free until/.test(nt), 'after the trial: a notice "Your free trial has ended…"');
  await shot(pg, '1-notice');
  await pg.click('.pgplan-ok'); await pg.reload(); await pg.waitForTimeout(2200);
  check(!(await pg.locator('.pgplan-notice').count()), 'the notice shows only once on this phone');
  check(/Upgrade your wedding app/.test(await menu(pg)), 'the ☰ menu offers "Upgrade your wedding app"');
  await pg.evaluate(() => PGControl.open()); await pg.waitForTimeout(300);
  check(/Free basic gallery/.test(await pg.locator('.pgplan-line').innerText()) && /are off/.test(await pg.locator('.pgplan-line').innerText()), 'Control Panel: "Free basic gallery · until … · Find me … are off"');
  await shot(pg, '2-panel');
  await pg.evaluate(() => PGControl.go('functions')); await pg.waitForTimeout(400);
  const fx = await pg.evaluate(() => ({ note: (document.querySelector('.pgcp-pane .pgplan-note') || {}).textContent || '', locked: [...document.querySelectorAll('.pgf-row.locked, .pgf-row input:disabled')].length }));
  check(/free trial has ended/.test(fx.note) && fx.locked >= 4, 'Functions: a note, and the 4 paid functions locked ' + JSON.stringify(fx));
  await shot(pg, '3-functions');
  await pg.evaluate(() => PGControl.go('guests')); await pg.waitForTimeout(300);
  check(/guests see only the Wedding Highlights/.test(await pg.locator('.pgcp-pane').innerText()), 'Guest photos: explains that guests see only the highlights now');
  check(await pg.getAttribute('.pgplan-note .pgplan-up', 'class') !== null, 'Upgrade buttons are there');
  await pg.context().close();

  // 3. a guest: no Find me, no plan
  const gstore = {}; gstore['pg_welcome_' + gid] = '{"side":"bride","attended":"no"}';
  pg = await open('/g/' + gid, gstore);
  const gs = await pg.evaluate(() => ({ plan: !!(GALLERY.plan), find: [...document.querySelectorAll('[data-findme]')].some(e => e.offsetParent !== null) }));
  check(!gs.plan && !gs.find, 'guests: no plan details and no Find me button ' + JSON.stringify(gs));
  check(!/Upgrade|Free trial/.test(await menu(pg)), 'guests: nothing about plans in the ☰ menu');
  await pg.context().close();

  // 4. the portal card
  pg = await open('/app/', { pg_token: tok }); await pg.waitForTimeout(600);
  const card = await pg.locator('#weddings').innerText();
  check(/Free basic gallery until/.test(card) && /Upgrade/.test(card) && !/Read faces now/.test(card), 'portal: "Free basic gallery until …" with Upgrade');
  check(/^mailto:hello@picgrades.com/.test(await pg.getAttribute('#weddings a:has-text("Upgrade")', 'href')), 'Upgrade writes to PicGrades (Settings › supportEmail)');
  await pg.context().close();

  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
