// Browser test for the gallery: real page + mock backend + fake Drive images (portrait + landscape).
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..');
const W = 'WEDDINGFOLDER1234567890';
DRIVE.folders[W] = { name: 'Aarav_Kavya_2026', access: 'ANYONE_WITH_LINK' };
[['fR', '00_Root_Moment'], ['fH', 'Haldi'], ['fW', 'Wedding'], ['fM', 'Mehendi'], ['fS', 'Sangeet'], ['fC', 'Cocktail'], ['fRe', 'Reception']].forEach(([id, n]) => { DRIVE.folders[id] = { name: n, parent: W }; });
let k = 0; [['fR', 3], ['fH', 4], ['fW', 5], ['fM', 2], ['fS', 2], ['fC', 2], ['fRe', 2]].forEach(([p, n]) => { for (let i = 0; i < n; i++) DRIVE.files['IMG' + (k++)] = { name: 'img' + i + '.jpg', parent: p, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const ord = call('queue', { token: admin }).recentDone[0];
const pub = call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: 'https://drive.google.com/drive/folders/' + W, title: 'Aarav & Kavya', eventDate: '2026-11-20' });
console.log('published:', pub.ok, pub.photoCount);
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  let f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8767, async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 390, height: 844, name: 'mobile' }, { width: 1280, height: 860, name: 'desktop' }]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: vp.name === 'mobile' }); const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(vp.name + ': ' + e.message));
    await pg.route('**fonts.g**', r => r.abort());
    // even ids = portrait, odd = landscape
    await pg.route('https://lh3.googleusercontent.com/**', r => { const n = parseInt(r.request().url().match(/IMG(\d+)/)[1], 10); r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(__dirname, 'fixtures', 'sample' + (n % 2 ? 1 : 2) + '.jpg')) }); });
    await pg.goto('http://localhost:8767/g/' + pub.galleryId); await pg.waitForSelector('#pgBoot.hide', { state: 'attached', timeout: 10000 }); console.log(vp.name, '| default landing is Hub:', await pg.isVisible('#view-hub'));
    await pg.goto('http://localhost:8767/g/' + pub.galleryId + '#moments'); await pg.reload();
    await pg.waitForSelector('#pgBoot.hide', { state: 'attached', timeout: 10000 });
    await pg.waitForTimeout(500);
    console.log(vp.name, '| landing view moments:', await pg.isVisible('#view-moments'), '| reels:', await pg.locator('.pgm-item').count(), '| img fit:', await pg.$eval('.pgm-img', e => getComputedStyle(e).objectFit));
    await pg.screenshot({ path: '/tmp/s4_moments_' + vp.name + '.png' });
    // double tap first reel → like
    const box = await pg.locator('.pgm-item').first().boundingBox();
    await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await pg.waitForTimeout(400);
    console.log(vp.name, '| after double-tap: liked=', await pg.locator('.pgm-item').first().locator('.pgm-like.liked').count(), 'count=', await pg.locator('.pgm-item').first().locator('.pgm-like-count').textContent());
    if (vp.name === 'mobile') {
      await pg.locator('.pgm-item').first().locator('.pgm-btn').nth(1).click();
      await pg.fill('#commentName', 'Meera Bhua'); await pg.fill('#commentInput', 'So beautiful <3'); await pg.click('#commentForm button[type=submit]'); await pg.waitForTimeout(400);
      console.log('notes:', await pg.textContent('#commentListContainer'), '| reel note count:', await pg.locator('.pgm-item').first().locator('.pgm-note-count').textContent());
      await pg.mouse.click(10, 10);
      // scroll to the next reel
      await pg.$eval('#pgmFeed', f => f.scrollTo(0, f.clientHeight)); await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/s4_moments2_mobile.png' });
    }
    await pg.click('.tkg-nav-item[data-nav=gallery]'); await pg.waitForTimeout(400);
    console.log(vp.name, '| collections:', await pg.locator('.pg-collection').count(), (await pg.locator('.pg-collection h3').allTextContents()).join(','));
    await pg.screenshot({ path: '/tmp/s4_collections_' + vp.name + '.png' });
    // collections page must scroll so the last collection (Cocktail) can be reached
    await pg.mouse.move(vp.width / 2, vp.height / 2); await pg.mouse.wheel(0, 2000); await pg.waitForTimeout(500);
    console.log(vp.name, '| collections page scrolled to:', await pg.evaluate(() => scrollY), '| Cocktail visible:', await pg.locator('.pg-collection', { hasText: 'Cocktail' }).isVisible());
    await pg.screenshot({ path: '/tmp/s4_collections_scrolled_' + vp.name + '.png' });
    await pg.locator('.pg-collection', { hasText: 'Wedding' }).click(); await pg.waitForTimeout(600);
    const sheetHidden = await pg.$eval('#mkEditorialSheet', e => e.getBoundingClientRect().top >= innerHeight - 2);
    console.log(vp.name, '| viewer full screen:', await pg.$eval('#pgvFeed', e => Math.round(e.getBoundingClientRect().height)) === vp.height, '| text hidden:', sheetHidden, '| nav hidden:', !(await pg.isVisible('.tkg-global-nav')), '| counter:', await pg.textContent('#pgvCount'), '| fit:', await pg.$eval('.pgv-item img', e => getComputedStyle(e).objectFit));
    await pg.screenshot({ path: '/tmp/s4_viewer_' + vp.name + '.png' });
    if (vp.name === 'mobile') {
      // finger scroll = the whole photo moves (native scroll with snap), like the filmstrip
      const scrollTo = async (k) => { await pg.$eval('#pgvFeed', (f, k) => f.scrollTo(0, f.clientHeight * k), k); await pg.waitForTimeout(500); };
      await scrollTo(1); console.log('swipe up ->', await pg.textContent('#pgvCount'), '| rail active:', await pg.locator('.mk-thumb-item.is-active, .mk-thumb-item.active').count());
      await scrollTo(2); console.log('swipe up ->', await pg.textContent('#pgvCount'));
      await scrollTo(1); console.log('swipe down ->', await pg.textContent('#pgvCount'));
      // pinch zoom (two fingers) then pan with one finger
      const pinch = await pg.evaluate(() => {
        const it = document.querySelectorAll('.pgv-item')[1], im = it.querySelector('img');
        const T = (id, x, y) => new Touch({ identifier: id, target: it, clientX: x, clientY: y });
        const ev = (type, list) => it.dispatchEvent(new TouchEvent(type, { touches: list, targetTouches: list, changedTouches: list, bubbles: true, cancelable: true }));
        ev('touchstart', [T(1, 150, 400), T(2, 240, 400)]); ev('touchmove', [T(1, 90, 400), T(2, 300, 400)]); ev('touchend', []);
        const z1 = im.style.transform;
        ev('touchstart', [T(1, 200, 400)]); ev('touchmove', [T(1, 260, 430)]); ev('touchend', []);
        return [z1, im.style.transform, it.classList.contains('is-zoomed'), document.getElementById('pgvFeed').style.overflowY];
      });
      console.log('pinch:', JSON.stringify(pinch));
      await pg.waitForTimeout(400);
      console.log('double-tap on zoomed photo resets zoom:', await (async () => { await pg.mouse.click(200, 420); await pg.waitForTimeout(80); await pg.mouse.click(200, 420); await pg.waitForTimeout(400); return pg.evaluate(() => document.querySelectorAll('.pgv-item img')[1].style.transform === ''); })());
      await pg.screenshot({ path: '/tmp/s4_viewer2_mobile.png' });
    } else {
      await pg.mouse.move(500, 400); await pg.mouse.wheel(0, 120); await pg.waitForTimeout(900); console.log('wheel down ->', await pg.textContent('#pgvCount'));
      await pg.mouse.wheel(0, 120); await pg.waitForTimeout(900); console.log('wheel down ->', await pg.textContent('#pgvCount'));
      await pg.mouse.wheel(0, -120); await pg.waitForTimeout(900); console.log('wheel up ->', await pg.textContent('#pgvCount'));
      await pg.click('#pgvZoom'); await pg.waitForTimeout(200); console.log('zoom button:', await pg.evaluate(() => { const f = document.getElementById('pgvFeed'), i = Math.round(f.scrollTop / f.clientHeight); return document.querySelectorAll('.pgv-item img')[i].style.transform; }));
      await pg.click('#pgvZoom'); await pg.waitForTimeout(200);
      const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 8000 }).catch(() => null), pg.click('#pgvSave')]);
      console.log('download:', dl ? dl.suggestedFilename() : 'none');
      await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(500); console.log('arrow down ->', await pg.textContent('#pgvCount'));
    }
    await pg.waitForTimeout(800);
    // single tap hides controls, tap again shows
    await pg.mouse.click(vp.width / 3, vp.height / 2); await pg.waitForTimeout(500);
    console.log(vp.name, '| tap -> clean:', await pg.evaluate(() => document.body.classList.contains('pgv-clean')));
    await pg.screenshot({ path: '/tmp/s4_viewer_clean_' + vp.name + '.png' });
    await pg.mouse.click(vp.width / 3, vp.height / 2); await pg.waitForTimeout(500);
    // info sheet
    await pg.click('#pgvInfo'); await pg.waitForTimeout(450);
    console.log(vp.name, '| info open:', await pg.$eval('#mkEditorialSheet', e => e.getBoundingClientRect().top < innerHeight - 50));
    await pg.screenshot({ path: '/tmp/s4_viewer_info_' + vp.name + '.png' });
    await pg.click('#pgvInfoClose'); await pg.waitForTimeout(350);
    await pg.click('#pgvLike'); await pg.waitForTimeout(300); console.log(vp.name, '| like in viewer:', await pg.locator('#pgvLike.liked').count(), await pg.textContent('#pgvLikeCount'));
    await pg.click('#pgvBack'); await pg.waitForTimeout(300); console.log(vp.name, '| back to collections:', await pg.isVisible('#view-gallery'), '| nav back:', await pg.isVisible('.tkg-global-nav'));
    await ctx.close();
  }
  console.log('page errors:', errors);
  await b.close(); srv.close();
});
