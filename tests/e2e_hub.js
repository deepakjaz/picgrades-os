// Browser test (step 68): the PicGrades hub page (the front door at /).
//   · promotes the wedding app and photo editing; the couple / photographer doorway opens sign-up with that choice made
//   · prices and terms come from the Settings sheet (publicOffers), so the page always matches the app
//   · fits a phone with no sideways scroll; no page errors
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, DB } = require('./gas_mock');
const root = path.join(__dirname, '..');
DB.Settings.push(['editPriceAI', '2.5', 'offer season']); DB.Settings.push(['supportEmail', 'hello@picgrades.com', 'test']);
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.png') ? 'image/png' : 'text/javascript'); res.end(d); } });
}).listen(8879, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const SHOTS = process.env.PG_SHOTS;
  async function open(url, w, h) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1, isMobile: w < 500, hasTouch: w < 500 });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(url + ': ' + e.message));
    if (!process.env.PG_FONTS) await pg.route('**fonts.g**', r => r.abort());
    await pg.goto('http://localhost:8879' + url); await pg.waitForTimeout(3200); return pg;
  }
  let pg = await open('/', 390, 844);
  check(/home of their own/.test(await pg.textContent('h1')) && await pg.isVisible('.phone'), 'hero: the headline and the Find me phone');
  check(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phone: no sideways scroll');
  check(await pg.textContent('[data-price="ai"]') === '₹2.50' && await pg.textContent('[data-price="human"]') === '₹8' && await pg.textContent('[data-price="cull"]') === '₹0.80' && await pg.textContent('[data-price="retouch"]') === 'from ₹120', 'prices come from Settings (AI ₹2.50 in the offer season, Human ₹8, Culling ₹0.80, Retouching from ₹120)');
  check(await pg.textContent('[data-when="human"]') === '4 days' && await pg.textContent('[data-when="ai"]') === '24 hours', 'delivery: Human touch 4 days, AI 24 hours');
  check(await pg.getAttribute('#contact', 'href') === 'mailto:hello@picgrades.com', 'contact email comes from Settings');
  const doors = await pg.$$eval('.door a', l => l.map(a => a.getAttribute('href')));
  check(doors[0] === '/app/?signup&kind=couple' && doors[1] === '/app/?signup&kind=photographer', 'doorway: couple and photographer');
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'hub-phone.png'), fullPage: true });
  await pg.click('.door a:nth-child(2)'); await pg.waitForTimeout(1200);
  check(await pg.isVisible('#signupForm') && await pg.isChecked('#signupForm input[value="photographer"]') && await pg.isVisible('#suStudioBox'), '"I am a photographer" opens sign-up with photographer chosen');
  await pg.context().close();
  pg = await open('/', 1440, 900);
  check(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) && await pg.isVisible('.top nav a[href="#editing"]'), 'computer: full menu, no sideways scroll');
  if (SHOTS) { await pg.screenshot({ path: path.join(SHOTS, 'hub-desktop-top.png') }); await pg.screenshot({ path: path.join(SHOTS, 'hub-desktop.png'), fullPage: true }); }
  await pg.context().close();
  console.log('page errors:', JSON.stringify(errors)); check(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
});
