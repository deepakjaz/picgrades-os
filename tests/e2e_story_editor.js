// Browser test (step 54): the Hub editor edits a Story Hub — sections shown / hidden / moved, the floating Find me (left / right / off), the icon bar (off by default),
// reworded headings, undo, preview, publish (a guest sees it), and back to a card layout.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'STORYEDITOR000000054';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['sH', 'Haldi'], ['sM', 'Mehendi'], ['sS', 'Sangeet'], ['sW', 'Wedding'], ['sR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 20; i++) DRIVE.files['SE' + k + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Ashish & Muskan', eventDate: '2027-01-24' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
call('storyPicks', { g: pub.galleryId, coupleKey: ck, picks: { bride: 'SE301', groom: 'SE304' } });   // step 56: the varmala part shows only once both portraits are chosen
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/g\/[a-z0-9]+$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8832, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.route('https://lh3.googleusercontent.com/**', r => { const pid = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(pid) }); });
  await require('./fonts_local').install(pg);
  await pg.addInitScript(() => { try { localStorage.setItem('pg_storyq_' + location.pathname.split('/').pop(), '1'); } catch (e) {} });
  await pg.goto('http://localhost:8832/g/' + pub.galleryId + '?couple=' + ck); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' });
  await pg.waitForFunction(() => window.PGLayout && PGLayout.list().length);
  await pg.evaluate(() => { GALLERY.faceSearch = true; return PGControl.save({ layout: 'story-living' }).then(r => { GALLERY.layout = r.layout; PGLayout.refresh(); }); });
  await pg.waitForSelector('#pgStory'); await pg.waitForTimeout(600);
  // open the editor: a Story panel instead of the card grid
  await pg.evaluate(() => PGHubEditor.open()); await pg.waitForSelector('.pged-story:not([hidden])');
  const rows = await pg.$$eval('.pged-srow span', l => l.map(x => x.textContent));
  check(rows[0] === 'Cover' && rows.indexOf('Events') > 0 && rows.indexOf('Glancing photos') > 0, 'the editor lists the sections: ' + rows.join(', '));
  check(!(await pg.isVisible('.pged-canvas')) && !(await pg.isVisible('.pged-add')), 'no card grid / Add card for a story');
  const texts = await pg.$$eval('.pged-stext input', l => l.map(i => i.placeholder));
  check(texts.length >= 4 && texts.indexOf('Two Paths, One Promise') > -1, 'headings to reword: ' + texts.length + ' (' + texts.slice(0, 4).join(' | ') + ' …)');
  // hide Glancing photos, move Events up, Find me left, icon bar on, reword the varmala heading
  await pg.click('.pged-srow[data-k="psh-stream"] .pged-stog');
  const evUp = async () => pg.click('.pged-srow[data-k="psh-events-sec"] [data-do=up]');
  await evUp(); await evUp();
  await pg.click('[data-set=findme] [data-v=left]'); await pg.click('[data-set=bar] [data-v=on]');
  await pg.fill('.pged-stext input[placeholder="Two Paths, One Promise"]', 'Ashish meets Muskan'); await pg.press('.pged-stext input[placeholder="Two Paths, One Promise"]', 'Tab');
  const d = await pg.evaluate(() => PGHubEditor.draft().story);
  check(d.kind === 'living' && d.findme === 'left' && d.bar === 'on' && d.sections.find(q => q.k === 'psh-stream').on === false && Object.values(d.texts).indexOf('Ashish meets Muskan') > -1, 'the draft keeps every change ' + JSON.stringify(d));
  await pg.screenshot({ path: '/tmp/s54_editor1.png' }); await pg.evaluate(() => { const x = document.querySelector('.pged-story'); x.scrollTop = x.scrollHeight; }); await pg.screenshot({ path: '/tmp/s54_editor2.png' });
  // undo brings back the icon bar choice
  await pg.click('.pged-undo'); check((await pg.evaluate(() => PGHubEditor.draft().story.texts)) && Object.values(await pg.evaluate(() => PGHubEditor.draft().story.texts)).indexOf('Ashish meets Muskan') < 0, 'Undo takes back the last change');
  await pg.click('.pged-redo');
  // preview: the page follows the draft
  await pg.click('.pged-prev'); await pg.waitForSelector('#pgStory'); await pg.waitForTimeout(700);
  const seen = async () => pg.evaluate(() => {
    const box = document.getElementById('pgStory'), secs = [...box.querySelectorAll('section, footer')].filter(x => { const p = x.parentElement.closest('section, footer'); return !p || !box.contains(p); }).filter(x => getComputedStyle(x).display !== 'none').map(x => x.classList[0]);
    const fm = box.querySelector('.pgs-findme'), rail = box.querySelector('.psh-rail');
    return { secs, fmLeft: !!fm && fm.classList.contains('left') && fm.getBoundingClientRect().left < 60, rail: !!rail && getComputedStyle(rail).display !== 'none', words: box.innerText.indexOf('Ashish meets Muskan') > -1 };
  });
  let v = await seen();
  check(v.secs.indexOf('psh-stream') < 0 && v.secs.indexOf('psh-events-sec') < v.secs.indexOf('psh-varmala-track') && v.secs[0] === 'psh-hero-track', 'preview: Glancing photos hidden, Events moved up: ' + v.secs.join(' > '));
  check(v.fmLeft && v.rail && v.words, 'preview: Find me on the left, icon bar on, new heading ' + JSON.stringify(v));
  await pg.screenshot({ path: '/tmp/s54_preview.png' });
  // publish
  await pg.click('.pged-bp'); await pg.waitForFunction(() => GALLERY.layout === 'custom', null, { timeout: 15000 });
  const saved = await pg.evaluate(() => GALLERY.custom);
  check(saved.story && saved.story.kind === 'living' && saved.story.findme === 'left' && saved.blocks.length === 0, 'published to the wedding: ' + JSON.stringify(saved.story).slice(0, 120));
  // a guest opening the wedding sees the same
  const g = await ctx.newPage(); g.on('pageerror', e => errors.push('guest: ' + e.message));
  await g.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ contentType: 'image/jpeg', body: bytesOf('1') }));
  await g.goto('http://localhost:8832/g/' + pub.galleryId); await g.waitForSelector('#pgStory', { timeout: 15000 }); await g.waitForTimeout(700);
  const gv = await g.evaluate(() => { const box = document.getElementById('pgStory'); return { stream: !!box.querySelector('.psh-stream') && getComputedStyle(box.querySelector('.psh-stream')).display !== 'none', words: box.innerText.indexOf('Ashish meets Muskan') > -1 }; });
  check(!gv.stream && gv.words, 'a guest sees the published story ' + JSON.stringify(gv));
  await g.close();
  // the editor again: back to a card layout from the menu
  await pg.evaluate(() => PGHubEditor.open()); await pg.waitForSelector('.pged-story:not([hidden])');
  check(await pg.locator('.pged-from option', { hasText: 'Editorial Album · story' }).count() === 1, 'the layout menu offers the stories too');
  await pg.selectOption('.pged-from', 'magazine-cover'); await pg.waitForTimeout(400);
  check(await pg.isVisible('.pged-canvas') && !(await pg.isVisible('.pged-story')) && (await pg.evaluate(() => PGHubEditor.draft().blocks.length)) > 0, 'choosing a card layout gives the card grid back');
  await pg.click('.pged-x'); await pg.waitForTimeout(500);
  check(await pg.evaluate(() => !!document.getElementById('pgStory')), 'closing the editor shows the wedding’s story again');
  // step 55: an old story draft must not block the card editor once the Hub is a card layout again
  await pg.evaluate(() => PGHubEditor.open()); await pg.waitForSelector('.pged-wrap, .pged-story', { state: 'attached' });
  await pg.selectOption('.pged-from', 'story-editorial'); await pg.waitForSelector('.pged-story:not([hidden])'); await pg.click('.pged-x'); await pg.waitForTimeout(300);   // leaves a story draft behind
  await pg.evaluate(() => PGControl.save({ layout: 'magazine-cover' }).then(r => { GALLERY.layout = r.layout; PGLayout.refresh(); }));
  await pg.evaluate(() => PGHubEditor.open()); await pg.waitForTimeout(500);
  check(await pg.isVisible('.pged-canvas') && !(await pg.isVisible('.pged-story')) && (await pg.locator('.pged-canvas [draggable], .pged-canvas .pged-card, .pged-canvas > *').count()) > 0, 'after going back to a card Hub the editor opens the cards to drag, not the old story draft');
  await pg.click('.pged-x');
  console.log(bad ? 'FAIL ' + bad + ' checks' : 'all story editor checks passed');
  console.log('page errors:', JSON.stringify(errors)); await b.close(); srv.close(); process.exit(0);
});
