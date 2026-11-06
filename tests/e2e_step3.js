// Browser test: client edit/hold, admin overview, payment, queue complete. Uses the local Apps Script mock.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail } = require('./gas_mock');
const root = path.join(__dirname, '..');
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let f = path.join(root, req.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : 'text/javascript'); res.end(d); } });
}).listen(8766, async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch(); const errors = [];
  async function page() { const pg = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); pg.on('pageerror', e => errors.push(e.message)); await pg.route('**fonts.g**', r => r.abort()); return pg; }
  async function login(pg, url, email) {
    await pg.goto(url); await pg.fill('#email', email); await pg.click('#loginBtn'); await pg.waitForSelector('#step2:not(.hidden)');
    await pg.fill('#code', /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]); await pg.click('#loginBtn');
  }
  try {
    // client: place, then edit, then hold
    const c = await page(); await login(c, 'http://localhost:8766/app/', 'mithil@sandboxstudios.in'); await c.waitForSelector('#v-dash:not(.hidden)');
    await c.click('nav.dock button[data-go=order]'); await c.fill('#cat', 'UI Edit Test'); await c.fill('#n', '50'); await c.click('#speeds button:nth-child(4)'); await c.fill('#link', 'https://x.y'); await c.click('#placeBtn');
    await c.waitForSelector('#toast:not(.hidden)'); console.log('placed:', await c.textContent('#toast'));
    const first = c.locator('#orders .order').first();
    console.log('actions:', (await first.locator('.act').textContent()).replace(/\s+/g, ' '));
    await first.locator('button', { hasText: 'Edit' }).click();
    await c.waitForSelector('#v-order:not(.hidden)'); console.log('edit title:', await c.textContent('#orderTitle'), '| cat:', await c.inputValue('#cat'));
    await c.fill('#n', '80'); await c.dispatchEvent('#n', 'input'); await c.click('#speeds button:nth-child(1)');
    await c.click('#placeBtn'); await c.waitForSelector('#v-dash:not(.hidden)'); await c.waitForTimeout(200); console.log('edited:', await c.textContent('#toast'));
    await c.locator('#orders .order').first().locator('button', { hasText: 'Put on hold' }).click();
    await c.locator('#orders .order').first().locator('input').fill('Sending 20 more photos');
    await c.locator('#orders .order').first().locator('button', { hasText: 'Confirm hold' }).click();
    await c.waitForTimeout(300); console.log('hold:', await c.textContent('#toast'), '|', (await c.locator('#orders .order').first().textContent()).replace(/\s+/g, ' ').slice(0, 160));
    await c.screenshot({ path: '/tmp/s3_client.png' });
    // admin
    const a = await page(); await login(a, 'http://localhost:8766/app/admin.html', 'adcmediaa@gmail.com'); await a.waitForSelector('#v-overview:not(.hidden)');
    await a.waitForSelector('#studios tr'); console.log('studios rows:', await a.locator('#studios tr').count(), '| totals:', (await a.textContent('#totals')).replace(/\s+/g, ' '));
    await a.screenshot({ path: '/tmp/s3_overview.png', fullPage: true });
    await a.fill('#filter', 'sandbox'); await a.locator('#studios tr button').first().click();
    await a.waitForSelector('#v-studio:not(.hidden)'); await a.waitForFunction(() => document.querySelector('#sName').textContent.length > 0);
    await a.fill('#pAmt', '20000'); await a.fill('#pRate', '5'); await a.dispatchEvent('#pAmt', 'input');
    console.log('preview:', await a.textContent('#payPreview'));
    await a.click('#payForm button[type=submit]'); await a.waitForSelector('#toast:not(.hidden)'); console.log('payment:', await a.textContent('#toast'));
    await a.waitForTimeout(300); await a.screenshot({ path: '/tmp/s3_studio.png', fullPage: true });
    await a.click('nav.dock button[data-go=queue]'); await a.waitForSelector('#qOpen .qitem');
    const item = a.locator('#qOpen .qitem', { hasText: 'UI Edit Test' });
    await item.locator('button', { hasText: 'Resume' }).click(); await a.waitForTimeout(300);
    const item2 = a.locator('#qOpen .qitem', { hasText: 'UI Edit Test' });
    await item2.locator('button', { hasText: 'Start editing' }).click(); await a.waitForTimeout(300);
    const item3 = a.locator('#qOpen .qitem', { hasText: 'UI Edit Test' });
    await item3.locator('input[placeholder^="Paste LR"]').fill('https://drive.google.com/file/d/lr123');
    await item3.locator('button', { hasText: 'Complete' }).click(); await a.waitForTimeout(300);
    console.log('complete:', await a.textContent('#toast'));
    await a.screenshot({ path: '/tmp/s3_queue.png' });
    console.log('last email:', mail[mail.length - 1].subject, '→', mail[mail.length - 1].to);
    await c.reload(); await c.waitForSelector('#v-dash:not(.hidden)');
    console.log('client sees:', (await c.locator('#orders .order').first().textContent()).replace(/\s+/g, ' ').slice(0, 140));
  } catch (e) { console.error('E2E ERROR', e.message); }
  console.log('page errors:', errors);
  await b.close(); srv.close();
});
