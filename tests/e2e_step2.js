// Serves app/ with config pointed at a local mock of the Apps Script backend, then drives it in Chromium.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail } = require('./gas_mock');
const root = path.join(__dirname, '..');
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let f = path.join(root, req.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : 'text/javascript'); res.end(d); } });
}).listen(8765, async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; pg.on('pageerror', e => errors.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });   // fonts are blocked in the test
  await pg.route('**fonts.g**', r => r.abort());
  await pg.goto('http://localhost:8765/app/');
  await pg.fill('#email', 'alpha@example.com'); await pg.click('#loginBtn');
  await pg.waitForSelector('#step2:not(.hidden)');
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  await pg.fill('#code', code); await pg.click('#loginBtn');
  await pg.waitForSelector('#v-dash:not(.hidden)');
  console.log('dash name:', await pg.textContent('#dashName'), '| balance:', await pg.textContent('#bal'), '| due:', await pg.textContent('#due'));
  console.log('orders shown:', await pg.$$eval('#orders .order', x => x.length));
  await pg.screenshot({ path: '/tmp/s2_dash.png', fullPage: false });
  await pg.click('nav.dock button[data-go=order]');
  await pg.fill('#cat', 'E2E Wedding'); await pg.fill('#n', '200'); await pg.click('#speeds button:nth-child(3)'); await pg.fill('#link', 'https://drive.google.com/e2e');
  await pg.dispatchEvent('#n', 'input');
  console.log('summary:', (await pg.textContent('#sum')).replace(/\s+/g, ' '));
  await pg.screenshot({ path: '/tmp/s2_order.png' });
  await pg.click('#placeBtn');
  await pg.waitForSelector('#toast:not(.hidden)', { timeout: 10000 });
  console.log('toast:', await pg.textContent('#toast'));
  console.log('first order now:', await pg.textContent('#orders .order p'));
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.screenshot({ path: '/tmp/s2_mobile.png' });
  await pg.reload(); await pg.waitForSelector('#v-dash:not(.hidden)'); console.log('session kept after reload: yes');
  console.log('page errors:', errors);
  await b.close(); srv.close();
});
