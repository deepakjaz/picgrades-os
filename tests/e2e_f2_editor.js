// F2 (step 88): measure both editor previews at three iPhone sizes and laptop.
// The visibility calculation matches tests/e2e_iphone.js: a 24 x 24 elementFromPoint sample.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root = path.join(__dirname, '..');
const FX = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const PORT = 8905;
const BASE = 'http://127.0.0.1:' + PORT;
const W = 'F2_WEDDING_DRIVE_FOLDER_00000001';
const EVENTS = [
  ['F2_EVENT_HALDI_FOLDER_00000001', 'Haldi'],
  ['F2_EVENT_SANGEET_FOLDER_00000002', 'Sangeet'],
  ['F2_EVENT_WEDDING_FOLDER_00000003', 'Wedding'],
  ['F2_EVENT_RECEPTION_FOLDER_00000004', 'Reception']
];

DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
EVENTS.forEach(([id, name], eventIndex) => {
  DRIVE.folders[id] = { name, parent: W };
  for (let i = 0; i < 8; i++) {
    const photoId = 'F2_PHOTO_' + String(eventIndex + 1).padStart(2, '0') +
      '_' + String(i + 1).padStart(3, '0') + '_MADEUP';
    DRIVE.files[photoId] = {
      name: 'made-up-f2-photo-' + (i + 1) + '.jpg',
      parent: id,
      mime: 'image/jpeg'
    };
  }
});

function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}

const admin = login('adcmediaa@gmail.com');
const queued = call('queue', { token: admin });
const pub = call('setGallery', {
  token: admin,
  orderId: queued.recentDone[0].orderId,
  folderUrl: W,
  title: 'Anika & Rohan',
  eventDate: '2026-12-14'
});
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;

const bytesOf = id => {
  const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0;
  return fs.readFileSync(path.join(FX, files[n % files.length]));
};
global.__fetchBytes = bytesOf;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        res.end(JSON.stringify(call(payload.action, payload)));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, error: error.message }));
      }
    });
    return;
  }
  if (req.url === '/app/config.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end("window.PG_CONFIG={apiUrl:'/api'}");
    return;
  }
  let url = req.url.split('?')[0];
  if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/i.test(url)) {
    url = '/app/gallery.html';
  }
  fs.readFile(path.join(root, url), (error, data) => {
    if (error) { res.statusCode = 404; res.end(); return; }
    if (url.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
    else if (url.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    else if (url.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    else res.setHeader('Content-Type', 'text/javascript');
    res.end(data);
  });
});

const sizes = [
  ['iPhone SE / mini', 375, 667],
  ['iPhone 15/16/17', 390, 844],
  ['iPhone Pro Max', 430, 932],
  ['Laptop', 1280, 800]
];
const errors = [];
let failures = 0;

function check(condition, message) {
  console.log((condition ? 'ok   ' : 'FAIL ') + message);
  if (!condition) failures++;
}

async function measure(page, selector, stageSelector) {
  return page.evaluate(({ selector, stageSelector }) => {
    const preview = document.querySelector(selector);
    const stage = document.querySelector(stageSelector);
    if (!preview || !stage) return { missing: true, visible: 0 };
    const rect = preview.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const x0 = Math.max(0, rect.left, stageRect.left), y0 = Math.max(0, rect.top, stageRect.top);
    const x1 = Math.min(innerWidth, rect.right, stageRect.right), y1 = Math.min(innerHeight, rect.bottom, stageRect.bottom);
    if (x1 <= x0 || y1 <= y0) {
      return { missing: false, visible: 0, width: Math.round(rect.width), height: Math.round(rect.height) };
    }
    let visible = 0, total = 0;
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 24; col++) {
        const x = x0 + (col + .5) * (x1 - x0) / 24;
        const y = y0 + (row + .5) * (y1 - y0) / 24;
        const hit = document.elementFromPoint(x, y);
        total++;
        if (hit && (preview === hit || preview.contains(hit))) visible++;
      }
    }
    return {
      missing: false,
      visible: Math.round(visible / total * 100),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }, { selector, stageSelector });
}

async function run() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    for (const [name, width, height] of sizes) {
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 700,
        hasTouch: width < 700,
        deviceScaleFactor: width < 700 ? 2 : 1
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(width + 'x' + height + ': ' + error.message));
      page.on('dialog', dialog => dialog.accept());
      await page.route('https://lh3.googleusercontent.com/**', route => {
        const match = route.request().url().match(/\/d\/([^=?]+)/);
        route.fulfill({ contentType: 'image/jpeg', body: bytesOf(match ? match[1] : '') });
      });
      await require('./fonts_local').install(page);
      await page.goto(BASE + '/g/' + pub.galleryId + '?couple=' + encodeURIComponent(ck));
      await page.waitForSelector('#pgBoot.hide', { state: 'attached', timeout: 30000 });
      check(await page.evaluate(() => typeof GALLERY !== 'undefined' && !!GALLERY),
        name + ': typeof GALLERY is available');

      await page.evaluate(() => PGCanvasEditor.open('canvas-quiet'));
      await page.waitForSelector('.pce .pce-page .pgc-sec', { timeout: 20000 });
      const selected = await page.evaluate(() => {
        const state = PGCanvasEditor.state();
        const part = state.doc.sections.flatMap(section => section.els)
          .find(el => el.t === 'names' && !(el.p && el.p.hide));
        if (!part) return false;
        PGCanvasEditor.select(part.id);
        return !!PGCanvasEditor.state().sel;
      });
      check(selected, name + ': free editor part selected');
      const free = await measure(page, '.pce-page', '.pce-stage');
      console.log('DESIGN VISIBLE — Free editor — ' + name + ' (' + width + 'x' + height + '): ' + JSON.stringify(free));
      check(free.visible >= 85, name + ': free editor design visible ≥85% with a part selected');
      const freeWidth = await page.evaluate(() => ({
        preview: document.querySelector('.pce-page').getBoundingClientRect().width,
        screen: innerWidth
      }));
      check(freeWidth.preview <= freeWidth.screen + 1,
        name + ': free design fits screen width (' + freeWidth.preview + ' / ' + freeWidth.screen + ')');
      await page.click('.pce-tabs [data-tab="style"]');
      await page.waitForTimeout(100);
      const freeOpen = await measure(page, '.pce-page', '.pce-stage');
      console.log('DESIGN VISIBLE — Free editor drawer open — ' + name + ': ' + JSON.stringify(freeOpen));
      check(freeOpen.visible >= 85, name + ': free editor remains ≥85% visible with drawer open');
      if (width < 700) check(await page.evaluate(() =>
        document.querySelector('.pce-panel').getBoundingClientRect().height <= innerHeight * .4 + 2
      ), name + ': free editor drawer stays within 40%');
      if (width >= 700) {
        const layout = await page.evaluate(() => ({
          stage: document.querySelector('.pce-stage').getBoundingClientRect(),
          panel: document.querySelector('.pce-panel').getBoundingClientRect()
        }));
        check(layout.panel.width >= 350 && layout.panel.width <= 370 && layout.stage.left < layout.panel.left,
          name + ': free editor keeps left stage + 360px right panel');
      }
      await page.evaluate(() => PGCanvasEditor.close(true));

      await page.evaluate(() => PGTemplateEditor.open('tpl-c1'));
      await page.waitForSelector('.pgte-scroll .pss', { timeout: 20000 });
      await page.waitForTimeout(200);
      const tpl = await measure(page, '.pgte-scroll .pss', '.pgte-stage');
      console.log('DESIGN VISIBLE — Template editor — ' + name + ' (' + width + 'x' + height + '): ' + JSON.stringify(tpl));
      check(tpl.visible >= 85, name + ': template editor design visible ≥85%');
      const tplWidth = await page.evaluate(() => ({
        preview: document.querySelector('.pgte-scroll .pss').getBoundingClientRect().width,
        screen: innerWidth
      }));
      check(tplWidth.preview <= tplWidth.screen + 1,
        name + ': template design fits screen width (' + tplWidth.preview + ' / ' + tplWidth.screen + ')');
      await page.click('.pgte-tabs [data-tab="photos"]');
      await page.waitForTimeout(100);
      const tplOpen = await measure(page, '.pgte-scroll .pss', '.pgte-stage');
      console.log('DESIGN VISIBLE — Template editor drawer open — ' + name + ': ' + JSON.stringify(tplOpen));
      check(tplOpen.visible >= 85, name + ': template editor remains ≥85% visible with drawer open');
      if (width < 700) check(await page.evaluate(() =>
        document.querySelector('.pgte-panel').getBoundingClientRect().height <= innerHeight * .4 + 2
      ), name + ': template editor drawer stays within 40%');
      await page.click('.pgte-slot');
      await page.waitForSelector('.pgte-pick');
      if (width < 700) check(await page.evaluate(() =>
        document.querySelector('.pgte-pick').getBoundingClientRect().height <= innerHeight * .4 + 2
      ), name + ': photo picker stays within 40% drawer');
      await context.close();
    }
  } finally {
    await browser.close();
    console.log('page errors: ' + JSON.stringify(errors));
    check(errors.length === 0, 'no page errors');
    server.close();
  }
  process.exitCode = failures ? 1 : 0;
}

server.listen(PORT, '127.0.0.1', () => {
  run().catch(error => {
    console.error(error);
    errors.push(error.message);
    console.log('page errors: ' + JSON.stringify(errors));
    process.exitCode = 1;
    server.close();
  });
});
