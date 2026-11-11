// Browser test (step 53): the two Story Hubs ("Living Story" by Gemini, "Editorial Album" by ChatGPT) as Hub layouts —
// they draw on phone and laptop, never cover our header, show no photo counts, keep few photos loaded, open events / photos / functions,
// stop when the guest leaves the Hub, come back when the guest returns, ask the first-visit question once, and appear in Control Panel › Look.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'STORYWEDDING00000053';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['sH', 'Haldi'], ['sM', 'Mehendi'], ['sS', 'Sangeet'], ['sW', 'Wedding'], ['sR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 20; i++) DRIVE.files['SY' + k + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Ashish & Muskan', eventDate: '2027-01-24' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8831, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  for (const [scr, w, hh] of [['phone', 390, 844], ['laptop', 1366, 860]]) {
    for (const id of ['story-living', 'story-editorial']) {
      const ctx = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: w < 900 }); const pg = await ctx.newPage();
      pg.on('pageerror', e => errors.push(scr + ' ' + id + ': ' + e.message));
      await pg.route('https://lh3.googleusercontent.com/**', r => { const pid = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(pid) }); });
      await require('./fonts_local').install(pg);
      await pg.goto('http://localhost:8831/g/' + pub.galleryId + '?layout=' + id); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
      await pg.waitForSelector('#pgStory', { timeout: 15000 }); await pg.evaluate(() => { GALLERY.faceSearch = true; PGLayout.reset(); PGLayout.refresh(); }); await pg.waitForTimeout(1200);   // Find me shows once face search is ready
      const tag = scr.padEnd(6) + ' ' + id.padEnd(16);
      // first visit: the question shows once, Skip closes it
      const q = await pg.locator('.psh-question, .pse-question, [class*="-qveil"]').count();
      check(q > 0, tag + ' first-visit question shows');
      const skip = pg.locator('#pgStory button:visible').filter({ hasText: /skip/i }).first(); if (await skip.count()) { await skip.click(); await pg.waitForTimeout(500); }
      const r = await pg.evaluate(() => {
        const at = el => { if (!el) return true; const rc = el.getBoundingClientRect(); if (!rc.width) return true; const t = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2); return !!t && (t === el || el.contains(t)); };
        return { orig: getComputedStyle(document.querySelector('.pgh-wrap')).display, grid: !!document.getElementById('pgLay'),
          header: ['#pgMenuBtn', '.pg-modebtn'].every(s => at([...document.querySelectorAll(s)].find(e => e.offsetParent))),
          counts: (document.getElementById('pgStory').innerText.match(/\b\d+\s+(photos?|images?|pictures?)\b/gi) || []) };
      });
      check(r.orig === 'none' && !r.grid, tag + ' the story replaces the Hub cards');
      check(r.header, tag + ' our header buttons (menu, light/dark) are not covered');
      check(!r.counts.length, tag + ' no photo counts ' + JSON.stringify(r.counts));
      // step 54: no second icon bar; one floating Find me that stays while scrolling; no drawn garland
      const bars = await pg.evaluate(() => [...document.querySelectorAll('.psh-rail, .pse-quickbar')].filter(x => x.offsetParent || getComputedStyle(x).position === 'fixed' && getComputedStyle(x).display !== 'none').length);
      check(bars === 0, tag + ' the story’s own icon bar is off');
      check(!(await pg.locator('.psh-vm-garland').count()), tag + ' no drawn garland');
      await pg.evaluate(() => window.scrollTo(0, 2600)); await pg.waitForTimeout(400);
      const fm = await pg.evaluate(() => { const b = document.querySelector('#pgStory .pgs-findme'); if (!b) return null; const rc = b.getBoundingClientRect(), t = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2); return { y: rc.top, h: innerHeight, top: !!t && b.contains(t) }; });
      check(fm && fm.top && fm.y > fm.h * 0.6, tag + ' Find me floats on screen while scrolling ' + JSON.stringify(fm));
      check(await pg.evaluate(() => { const a = document.querySelector('.pgs-findme').getBoundingClientRect(), t = document.querySelector('.pg-totop.show'); if (!t) return true; const c = t.getBoundingClientRect(); return a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top; }), tag + ' Find me and the back-to-top button do not overlap');
      check(await pg.evaluate(() => getComputedStyle(document.querySelector('.pgs-findme')).color === 'rgb(255, 255, 255)'), tag + ' Find me text is white');
      await pg.evaluate(() => window.scrollTo(0, 0));
      // scroll the whole page: never more than 14 photos loaded at once, no blank picture in the middle of the screen
      const H = await pg.evaluate(() => document.documentElement.scrollHeight); let maxLive = 0, blank = 0;
      for (let y = 0; y <= H; y += Math.round(hh * 0.5)) {
        await pg.evaluate(y => window.scrollTo(0, y), y); await pg.waitForTimeout(450);
        const s = await pg.evaluate(() => {
          const imgs = [...document.querySelectorAll('#pgStory img')];
          const live = imgs.filter(i => i.src && !i.src.startsWith('data:')).length;
          const vh = innerHeight, vw = innerWidth;
          const blankMid = imgs.filter(i => { const rc = i.getBoundingClientRect(); if (rc.width < 80 || rc.height < 80) return false; const st = getComputedStyle(i); if (st.visibility === 'hidden' || +st.opacity === 0) return false;
            return rc.top > vh * 0.15 && rc.bottom < vh * 0.85 && rc.left >= 0 && rc.right <= vw && (!i.src || i.src.startsWith('data:')); }).length;
          return { live, blankMid };
        });
        maxLive = Math.max(maxLive, s.live); blank += s.blankMid;
        if (process.env.SHOTS) await pg.screenshot({ path: '/tmp/s53/' + id + '_' + scr + '_' + String(y).padStart(5, '0') + '.png' });
      }
      console.log(tag, 'page length', Math.round(H / hh * 10) / 10, 'screens | most photos loaded at once', maxLive);
      check(maxLive <= 14, tag + ' few photos loaded at once (' + maxLive + ')');
      check(blank === 0, tag + ' no blank picture in the middle of the screen (' + blank + ')');
      // an event opens its event page; leaving the Hub stops the story; coming back draws it again
      await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(300);
      await pg.evaluate(() => { const t = [...document.querySelectorAll('#pgStory button, #pgStory a')].find(x => /enter|open|chapter|view/i.test((x.getAttribute('aria-label') || '') + ' ' + x.textContent) && /haldi|mehendi|sangeet|wedding|reception/i.test((x.getAttribute('aria-label') || '') + ' ' + x.textContent + ' ' + (x.closest('section,article') || x).textContent)); if (t) t.click(); else window.__noEvent = 1; });
      await pg.waitForTimeout(800);
      const ev = await pg.evaluate(() => ({ none: !!window.__noEvent, view: document.body.dataset.view, story: !!document.getElementById('pgStory'), set: typeof CURRENT_SET !== 'undefined' ? CURRENT_SET : '' }));
      check(!ev.none && ev.view !== 'hub' && !ev.story, tag + ' an event opens (' + ev.view + ' / ' + ev.set + ') and the story stops');
      await pg.evaluate(() => switchViewFromNav('hub')); await pg.waitForTimeout(700);
      check(await pg.evaluate(() => !!document.getElementById('pgStory') && document.body.classList.contains('pg-story-on')), tag + ' back on the Hub the story shows again');
      check(!(await pg.locator('.psh-question:visible, .pse-question:visible').count()), tag + ' the question is not asked a second time');
      // a small icon opens its function (Share has no screen of its own; Notes does)
      await pg.evaluate(() => { const t = [...document.querySelectorAll('#pgStory button[aria-label]')].find(x => /notes/i.test(x.getAttribute('aria-label'))); if (t) t.click(); });
      await pg.waitForTimeout(600);
      check(await pg.evaluate(() => document.body.dataset.view === 'rooms'), tag + ' the Notes icon opens Notes');
      if (scr === 'phone') await pg.screenshot({ path: '/tmp/s53_' + id + '_' + scr + '.png' });
      await ctx.close();
    }
  }
  // Control Panel › Look lists both, drawn as one long page
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push('look: ' + e.message));
    await pg.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('1') }));
    await pg.goto('http://localhost:8831/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForFunction(() => window.PGLayout && PGLayout.list().length);
    const names = await pg.evaluate(() => PGLayout.list().filter(l => l.story).map(l => l.name));
    check(names.join() === 'Living Story,Editorial Album', 'Look offers both story styles: ' + names.join(', '));
    check(await pg.evaluate(() => PGLayout.apply('story-editorial') && !!document.getElementById('pgStory')), 'choosing one shows it straight away');
    check(await pg.evaluate(() => { PGLayout.apply('magazine-cover'); return !document.getElementById('pgStory') && !!document.getElementById('pgLay') && !document.body.classList.contains('pg-story-on'); }), 'choosing a card layout again removes the story');
    await ctx.close(); }
  console.log(bad ? 'FAIL ' + bad + ' checks' : 'all story checks passed');
  console.log('page errors:', JSON.stringify(errors)); await b.close(); srv.close(); process.exit(0);
});
