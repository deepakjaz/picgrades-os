// F3 (step 89): card editor responsive shell, selected-card drawer, and Page settings.
const http = require('http'), fs = require('fs'), path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const PORT = 8906, BASE = 'http://127.0.0.1:' + PORT;
const W = 'F3_WEDDING_DRIVE_FOLDER_00000001';
const EVENTS = [
  ['F3_EVENT_HALDI_FOLDER_00000001', 'Haldi'],
  ['F3_EVENT_SANGEET_FOLDER_00000002', 'Sangeet'],
  ['F3_EVENT_WEDDING_FOLDER_00000003', 'Wedding'],
  ['F3_EVENT_RECEPTION_FOLDER_00000004', 'Reception']
];
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
EVENTS.forEach(([id, name], eventIndex) => {
  DRIVE.folders[id] = { name, parent: W };
  for (let i = 0; i < 6; i++) {
    const photoId = 'F3_PHOTO_' + String(eventIndex + 1).padStart(2, '0') + '_' + String(i + 1).padStart(3, '0') + '_MADEUP';
    DRIVE.files[photoId] = { name: 'made-up-f3-photo-' + (i + 1) + '.jpg', parent: id, mime: 'image/jpeg' };
  }
});
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const admin = login('adcmediaa@gmail.com'), queued = call('queue', { token: admin });
const pub = call('setGallery', { token: admin, orderId: queued.recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
call('coupleLook', { g: pub.galleryId, coupleKey: ck, layout: 'magazine-cover' });
const bytesOf = id => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = ''; req.on('data', chunk => body += chunk);
    req.on('end', () => { try { const p = JSON.parse(body); res.end(JSON.stringify(call(p.action, p))); }
      catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message })); } });
    return;
  }
  if (req.url === '/app/config.js') { res.setHeader('Content-Type', 'text/javascript'); res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let url = req.url.split('?')[0];
  if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/i.test(url)) url = '/app/gallery.html';
  fs.readFile(path.join(root, url), (e, data) => {
    if (e) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', url.endsWith('.html') ? 'text/html' : url.endsWith('.css') ? 'text/css' : url.endsWith('.json') ? 'application/json' : 'text/javascript');
    res.end(data);
  });
});
const sizes = [['375x667',375,667],['390x844',390,844],['430x932',430,932],['1280x800',1280,800]];
const errors = []; let failures = 0;
const check = (ok, label) => { console.log((ok ? 'ok   ' : 'FAIL ') + label); if (!ok) failures++; };
async function metrics(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.pged-card.pged-sel'), stage = document.querySelector('.pged-canvas'), drawer = document.querySelector('.pged-drawer');
    if (!card || !stage || !drawer) return { missing: true };
    const r = card.getBoundingClientRect(), s = stage.getBoundingClientRect(), d = drawer.getBoundingClientRect();
    const w = Math.max(0, Math.min(r.right,s.right,innerWidth)-Math.max(r.left,s.left,0));
    const h = Math.max(0, Math.min(r.bottom,s.bottom,innerHeight)-Math.max(r.top,s.top,0));
    return { card:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)},
      stage:{y:Math.round(s.y),height:Math.round(s.height)},drawer:{y:Math.round(d.y),height:Math.round(d.height)},
      visiblePct:Math.round(w*h/Math.max(1,r.width*r.height)*100),drawerPct:Math.round(d.height/innerHeight*100) };
  });
}
async function run() {
  const { chromium } = require('playwright'), browser = await chromium.launch();
  try {
    for (const [label,width,height] of sizes) {
      const context = await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:width<700?2:1});
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(label + ': ' + e.message));
      page.on('dialog', d => d.accept());
      await page.route('https://lh3.googleusercontent.com/**', route => {
        const m = route.request().url().match(/\/d\/([^=?]+)/);
        route.fulfill({contentType:'image/jpeg',body:bytesOf(m?m[1]:'')});
      });
      await require('./fonts_local').install(page);
      await page.goto(BASE + '/g/' + pub.galleryId + '?couple=' + encodeURIComponent(ck));
      await page.waitForSelector('#pgBoot.hide',{state:'attached',timeout:30000});
      check(await page.evaluate(() => typeof GALLERY !== 'undefined' && !!GALLERY),label+': typeof GALLERY is available');
      await page.evaluate(() => PGHubEditor.open());
      await page.waitForSelector('.pged .pged-card',{timeout:20000});
      await page.locator('.pged-card').first().click();
      await page.waitForSelector('.pged-tools:not([hidden])');
      await page.waitForTimeout(200);

      // Capture the old bottom-overlay geometry as a comparable before baseline, then restore the new drawer shell.
      await page.addStyleTag({content:'.pged-drawer{display:contents!important}.pged-tools{position:fixed!important;left:0!important;right:0!important;bottom:0!important;max-height:46vh!important}.pged-canvas{padding-bottom:150px!important}'});
      const before = await page.evaluate(() => { const c=document.querySelector('.pged-card.pged-sel').getBoundingClientRect();
        const w=Math.max(0,Math.min(c.right,innerWidth)-Math.max(c.left,0)),h=Math.max(0,Math.min(c.bottom,innerHeight)-Math.max(c.top,0));
        return {x:Math.round(c.x),y:Math.round(c.y),width:Math.round(c.width),height:Math.round(c.height),viewportVisiblePct:Math.round(w*h/Math.max(1,c.width*c.height)*100)}; });
      await page.evaluate(() => document.querySelectorAll('style').forEach(el => { if(el.textContent.includes('.pged-drawer{display:contents')) el.remove(); }));
      const after = await metrics(page);
      console.log('F3 BEFORE legacy overlay — '+label+': '+JSON.stringify(before));
      console.log('F3 AFTER drawer — '+label+': '+JSON.stringify(after));
      check(!after.missing && after.visiblePct>0,label+': selected card remains visible in stage');
      if(width<700) check(after.drawerPct<=40,label+': selected-card drawer stays within 40% (AGENTS.md editor rule) — '+after.drawerPct+'%');
      else check(after.drawer.height>0 && after.card.x+after.card.width<=width-350,label+': laptop keeps card stage beside inspector');
      if(width<700) {
        await page.tap('.pged-page-settings');
        check(await page.locator('.pged-settings:not([hidden])').isVisible(),label+': Page settings opens');
        check(await page.locator('.pged-add').isVisible(),label+': + Add card remains in bottom tool row');
        await page.tap('.pged-settings-close');
        check(await page.locator('.pged-settings[hidden]').count()===1,label+': Page settings closes cleanly');
      }
      await page.screenshot({path:'/tmp/f3-'+label+'.png'});
      await context.close();
    }
  } finally {
    console.log('page errors: '+JSON.stringify(errors));
    check(errors.length===0,'no page errors');
    await browser.close();
    server.close();
  }
}
server.listen(PORT,run);
