// Step 87: Post Edits layout and design visibility on iPhone-sized screens and laptop.
// The 24×24 check samples the visible design with elementFromPoint for every tool.
// Existing Post Edits coverage remains in e2e_post_edits.js; this adds layout checks only.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root = path.join(__dirname, '..');
const FX = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'F1WEDDINGROOT000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['F1EVENTSANGEET00000001', 'Sangeet'], ['F1EVENTWEDDING00000001', 'Wedding'], ['F1EVENTRECEPT00000001', 'Reception']].forEach(([id, name]) => {
  DRIVE.folders[id] = { name, parent: W };
  for (let i = 0; i < 6; i++) DRIVE.files['F1PHOTO0000000000' + id.slice(-1) + i] = { name: 'photo-' + i + '.jpg', parent: id, mime: 'image/jpeg' };
});
function login(email) {
  call('requestCode', { email });
  const code = /code: (\\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const coupleKey = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = id => {
  const f = DRIVE.files[id];
  if (f && f.bytes) return Buffer.from(f.bytes);
  const n = parseInt(String(id).replace(/\\D/g, ''), 10) || 0;
  return fs.readFileSync(path.join(FX, files[n % files.length]));
};
global.__fetchBytes = bytesOf;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => { const p = JSON.parse(body); res.end(JSON.stringify(call(p.action, p))); });
    return;
  }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let url = req.url.split('?')[0];
  if (/^\\/(g|c|ph|pg)\\/[a-z0-9]+(\\/[A-Za-z0-9_-]+)?$/.test(url)) url = '/app/gallery.html';
  fs.readFile(path.join(root, url), (err, data) => {
    if (err) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', url.endsWith('.html') ? 'text/html' : url.endsWith('.css') ? 'text/css' : url.endsWith('.json') ? 'application/json' : 'text/javascript');
    res.end(data);
  });
}).listen(8901, async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const errors = [];
  let failures = 0;
  const check = (ok, label) => { console.log((ok ? 'ok   ' : 'FAIL ') + label); if (!ok) failures++; };
  const tools = {
    post: ['template', 'grid', 'colours', 'text', 'sticker', 'filters', 'order', 'shape'],
    album: ['template', 'colours', 'text', 'sticker', 'filters', 'slides', 'order', 'shape']
  };
  async function designScore(page) {
    return page.evaluate(() => {
      const canvas = document.querySelector('.pe-stage canvas');
      const stage = document.querySelector('.pe-stage');
      if (!canvas || !stage) return { score: 0, points: 0, reason: 'design canvas missing' };
      const c = canvas.getBoundingClientRect(), s = stage.getBoundingClientRect();
      const left = Math.max(c.left, s.left, 0), top = Math.max(c.top, s.top, 0);
      const right = Math.min(c.right, s.right, innerWidth), bottom = Math.min(c.bottom, s.bottom, innerHeight);
      if (right <= left || bottom <= top) return { score: 0, points: 0, reason: 'no visible design area' };
      let hits = 0, points = 0;
      for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
        const px = left + (x + 0.5) * (right - left) / 24;
        const py = top + (y + 0.5) * (bottom - top) / 24;
        const el = document.elementFromPoint(px, py);
        points++;
        if (el && (el === canvas || el.closest('.ps-prev'))) hits++;
      }
      return { score: hits / points, hits, points, visible: { left, top, right, bottom } };
    });
  }
  async function openEditor(page, mode) {
    await page.goto('http://localhost:8901/g/' + pub.galleryId + '?couple=' + coupleKey);
    await page.waitForSelector('#pgBoot.hide', { state: 'attached' });
    await page.waitForTimeout(600);
    await page.click('#pgcPost');
    await page.waitForSelector('.pe-wrap[data-view=pick]');
    if (mode === 'album') await page.click('.pe-tab[data-mode=album]');
    // Select a second photo so the Order tool remains available in both modes.
    if (await page.locator('.pe-pick:not(.on)').count()) await page.locator('.pe-pick:not(.on)').first().click();
    await page.click('.pe-v-pick .pe-next');
    await page.waitForSelector('.pe-wrap[data-view=edit]');
    await page.waitForSelector('.pe-stage canvas');
    await page.waitForTimeout(400);
  }
  async function auditMode(page, mode, sizeLabel) {
    for (const tool of tools[mode]) {
      await page.click('.pe-tool[data-tool="' + tool + '"]');
      if (tool === 'sticker') await page.waitForSelector('.pe-panel .ps-picker');
      else await page.waitForSelector('.pe-panel .pe-sheet');
      if (tool === 'template') await page.waitForSelector('.pe-panel .pe-tpl');
      if (tool === 'text') {
        const field = page.locator('.pe-panel input.ps-in').first();
        await field.focus();
        const viewport = await page.evaluate(() => ({
          height: window.visualViewport ? window.visualViewport.height : innerHeight,
          offsetTop: window.visualViewport ? window.visualViewport.offsetTop : 0,
          wrap: document.querySelector('.pe-wrap').getBoundingClientRect().toJSON(),
          field: fieldRect()
        }));
        function fieldRect() { const r = document.querySelector('.pe-panel input.ps-in').getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }
        check(viewport.field.bottom <= viewport.offsetTop + viewport.height + 1, sizeLabel + ' ' + mode + ' Text field stays inside visualViewport');
      }
      const score = await designScore(page);
      check(score.score >= 0.85, sizeLabel + ' ' + mode + ' ' + tool + ' design visible ' + Math.round(score.score * 100) + '% (' + score.hits + '/' + score.points + ')');
      const controls = await page.evaluate(() => Array.from(document.querySelectorAll('.pe-panel button')).filter(b => b.getClientRects().length).map(b => {
        const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, text: (b.innerText || '').trim() };
      }));
      const small = controls.filter(b => b.w < 44 || b.h < 44);
      check(!small.length, sizeLabel + ' ' + mode + ' ' + tool + ' visible buttons at least 44px' + (small.length ? ': ' + JSON.stringify(small.slice(0, 3)) : ''));
      const close = tool === 'sticker' ? '.pe-panel .ps-x' : '.pe-panel .pe-done';
      await page.click(close);
    }
  }
  try {
    const sizes = [
      { label: 'iPhone 375×667', width: 375, height: 667, touch: true },
      { label: 'iPhone 390×844', width: 390, height: 844, touch: true },
      { label: 'Laptop 1280×800', width: 1280, height: 800, touch: false }
    ];
    for (const size of sizes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(size.label + ': ' + e.message));
      await page.route('https://lh3.googleusercontent.com/**', route => {
        const id = (route.request().url().match(/\\/d\\/([^=?]+)/) || [])[1];
        route.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) });
      });
      await require('./fonts_local').install(page);
      await openEditor(page, 'post');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), size.label + ' no page-wide horizontal overflow (Post)');
      await auditMode(page, 'post', size.label);
      await page.click('.pe-v-edit .pe-ib');
      await page.click('.pe-tab[data-mode=album]');
      await page.click('.pe-v-pick .pe-next');
      await page.waitForSelector('.pe-wrap[data-view=edit]');
      await page.waitForTimeout(400);
      check(await page.locator('.pe-whole').isVisible(), size.label + ' album has Whole album control');
      await page.click('.pe-whole');
      check(await page.locator('.pe-workspace').evaluate(el => el.classList.contains('pe-whole-album')), size.label + ' Whole album view toggles on');
      await page.click('.pe-whole');
      await auditMode(page, 'album', size.label);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), size.label + ' no page-wide horizontal overflow (Album)');
      await page.screenshot({ path: '/tmp/f1-' + size.width + 'x' + size.height + '.png' });
      await context.close();
    }
  } catch (e) {
    failures++;
    console.log('FAIL browser flow: ' + (e && e.stack || e));
  }
  console.log('page errors:', errors);
  await browser.close();
  server.close();
  process.exit(failures || errors.length ? 1 : 0);
});
