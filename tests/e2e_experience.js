// Browser test (step 57): experience cards — World cover, Wedding journey, Event chapters — in a ready layout on phone and laptop,
// edited in the Hub editor (words, photo, event, colours), published, and seen by a guest.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE, DB } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'EXPERIENCE0000000057';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['sH', 'Haldi'], ['sM', 'Mehendi'], ['sS', 'Sangeet'], ['sW', 'Wedding'], ['sR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 20; i++) DRIVE.files['SX' + k + String(i).padStart(2, '0')] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Ashish & Muskan', eventDate: '2027-01-24' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;
const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8835, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const errors = []; let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const open = async (q, w, hh) => {
    const ctx = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: w < 900 }); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message)); pg.on('dialog', d => d.accept());
    await pg.route('https://lh3.googleusercontent.com/**', r => { const pid = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1] || ''; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(pid) }); });
    await require('./fonts_local').install(pg);
    await pg.goto('http://localhost:8835/g/' + pub.galleryId + q); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(900); return { ctx, pg };
  };
  // 1. the ready layout on phone and laptop
  for (const [scr, w, hh] of [['phone', 390, 844], ['laptop', 1366, 860]]) {
    const { ctx, pg } = await open('?layout=x-royal-journey', w, hh);
    const r = await pg.evaluate(() => ({ cards: [...document.querySelectorAll('#pgLay > section')].map(s => s.dataset.block),
      ids: [...document.querySelectorAll('#pgLay .x-chapter')].map(c => [...c.classList].find(k => /^x-id-/.test(k))),
      chapImgs: document.querySelectorAll('#pgLay .x-chapter img').length, stops: document.querySelectorAll('#pgLay .x-stop').length,
      dir: (document.querySelector('#pgLay .x-journey') || {}).className || '', bg: getComputedStyle(document.body).getPropertyValue('--x-bg').trim(),
      title: ((document.querySelector('.x-world .x-title') || {}).textContent || '').replace(/\u00a0/g, ' ') }));
    check(r.cards[0] === 'x-world' && r.cards.indexOf('x-journey') > 0 && r.cards.filter(c => c === 'x-chapter').length === 5, scr + ': world, journey and 5 event chapters ' + r.cards.join(','));
    check(r.ids.join() === 'x-id-haldi,x-id-mehendi,x-id-sangeet,x-id-wedding,x-id-reception', scr + ': every event has its own identity ' + r.ids.join(','));
    check(r.chapImgs === 0, scr + ': the event chapters show the icon, no photos');
    check(r.stops === 5 && (scr === 'phone' ? /x-down/.test(r.dir) : /x-across/.test(r.dir)), scr + ': the journey runs ' + (scr === 'phone' ? 'down' : 'across') + ' (' + r.dir + ')');
    check(r.bg === '#2a0f14' && r.title === 'Ashish & Muskan', scr + ': the layout brings its colours; the names read right (' + r.bg + ', ' + r.title + ')');
    // scrolling moves the cards: --e grows as the journey comes in
    const e0 = await pg.evaluate(() => +getComputedStyle(document.querySelector('.x-journey')).getPropertyValue('--f') || 0);
    await pg.evaluate(() => document.querySelector('.x-journey').scrollIntoView({ block: 'center' })); await pg.waitForTimeout(400);
    const e1 = await pg.evaluate(() => +getComputedStyle(document.querySelector('.x-journey')).getPropertyValue('--f'));
    check(e1 > e0 && e1 > .3, scr + ': the journey fills as it scrolls in (' + e0 + ' → ' + e1 + ')');
    await pg.evaluate(() => document.querySelectorAll('.x-chapter')[3].click()); await pg.waitForTimeout(700);
    check(await pg.evaluate(() => document.body.dataset.view !== 'hub'), scr + ': tapping the Wedding chapter enters the event (' + await pg.evaluate(() => document.body.dataset.view) + ')');
    await ctx.close();
  }
  // 2. the couple edits words, photo, event and colours in the Hub editor, then publishes
  const { ctx, pg } = await open('?couple=' + ck, 390, 844);
  await pg.evaluate(() => PGControl.save({ layout: 'x-royal-journey' }).then(r => { GALLERY.layout = r.layout; PGLayout.refresh(); }));
  await pg.evaluate(() => PGHubEditor.open()); await pg.waitForSelector('.pged-canvas .pged-card');
  const sel = async name => { await pg.evaluate(n => { const i = PGHubEditor.draft().blocks.findIndex(b => b.block === n); document.querySelector('.pged-card[data-i="' + i + '"]').click(); }, name); await pg.waitForSelector('.pged-tools:not([hidden]) .pged-content'); };
  await sel('x-world');
  const labels = await pg.$$eval('.pged-field > span', l => l.map(x => x.textContent));
  check(labels.length >= 6 && labels.some(l => /Title/.test(l)) && labels.some(l => /photo/i.test(l)), 'World cover: every word and the photo can be changed (' + labels.join(' | ') + ')');
  await pg.locator('.pged-field', { hasText: 'Title' }).locator('input').fill('Riya weds Kabir'); await pg.locator('.pged-field', { hasText: 'Title' }).locator('input').press('Tab'); await pg.waitForTimeout(300);
  check(await pg.evaluate(() => document.querySelector('.pged-canvas .x-world .x-title').textContent.replace(/\u00a0/g, ' ') === 'Riya weds Kabir'), 'the new title shows on the card at once');
  await sel('x-world'); await pg.locator('.pged-field', { hasText: 'Scene photo' }).locator('button').first().click(); await pg.waitForSelector('.pged-photosheet');
  await pg.click('.pged-photosheet .pged-phgrid button >> nth=3'); await pg.waitForTimeout(300);
  const ph = await pg.evaluate(() => PGHubEditor.draft().blocks[0].set.photo);
  check(!!ph && await pg.evaluate(id => document.querySelector('.pged-canvas .x-world .x-photo').style.backgroundImage.indexOf(id) > -1, ph), 'a photo chosen from the wedding becomes the scene (' + ph + ')');
  await sel('x-chapter'); await pg.locator('.pged-field', { hasText: 'Which event' }).locator('select').selectOption('Reception'); await pg.waitForTimeout(300);
  check(await pg.evaluate(() => document.querySelector('.pged-canvas .x-chapter').classList.contains('x-id-reception')), 'a chapter switched to Reception takes the night look');
  await sel('x-chapter'); await pg.locator('.pged-field', { hasText: 'Line' }).locator('textarea').fill('Under a thousand lights'); await pg.locator('.pged-field', { hasText: 'Line' }).locator('textarea').press('Tab'); await pg.waitForTimeout(300);
  check(await pg.evaluate(() => document.querySelector('.pged-canvas .x-chapter .x-cline').textContent === 'Under a thousand lights'), 'the chapter line is rewritten');
  await pg.screenshot({ path: '/tmp/s57_editor.png' });
  await pg.click('.pged-pal'); await pg.waitForSelector('.pged-palsheet');
  await pg.click('.pged-pals [data-p=haldi]'); await pg.waitForTimeout(200);
  check(await pg.evaluate(() => getComputedStyle(document.body).getPropertyValue('--x-bg').trim() === '#fff6dc'), 'Colours: the Haldi sunshine palette colours the Hub');
  await pg.locator('.pged-own input[data-k=acc]').evaluate(i => { i.value = '#123456'; i.dispatchEvent(new Event('change')); }); await pg.waitForTimeout(200);
  check(await pg.evaluate(() => { const p = PGHubEditor.draft().palette; return p.id === 'custom' && p.acc === '#123456' && p.bg === '#fff6dc'; }), 'your own colour replaces one colour of the palette');
  await pg.screenshot({ path: '/tmp/s57_colours.png' }); await pg.click('.pged-palsheet .ios-wide');
  // drag still works: a ready size changes the World cover
  await sel('x-world'); await pg.evaluate(() => [...document.querySelectorAll('.pged-sizes button')].find(x => /^Big/.test(x.textContent)).click()); await pg.waitForTimeout(200);
  check(await pg.evaluate(() => PGHubEditor.draft().blocks[0].pos.phone.slice(2).join('x') === '4x3'), 'the experience cards resize like every card');
  await pg.click('.pged-pub'); await pg.waitForFunction(() => GALLERY.layout === 'custom', null, { timeout: 15000 });
  const t = DB.Galleries, hd = t[0], row = t.slice(1).find(r => r[hd.indexOf('galleryId')] === pub.galleryId), saved = JSON.parse(row[hd.indexOf('custom')]);
  check(saved.palette.acc === '#123456' && saved.blocks[0].block === 'x-world' && saved.blocks[0].set.title === 'Riya weds Kabir' && saved.blocks.some(x => x.block === 'x-chapter' && x.set && x.set.event === 'Reception'), 'published: cards, words, photo and colours saved for the wedding');
  await ctx.close();
  // 3. a guest sees it
  { const g = await open('', 390, 844);
    const v = await g.pg.evaluate(() => ({ t: document.querySelector('.x-world .x-title').textContent.replace(/\u00a0/g, ' '), acc: getComputedStyle(document.body).getPropertyValue('--x-acc').trim() }));
    check(v.t === 'Riya weds Kabir' && v.acc === '#123456', 'a guest sees the edited Hub ' + JSON.stringify(v)); await g.ctx.close(); }
  console.log(bad ? 'FAIL ' + bad + ' checks' : 'all experience checks passed');
  console.log('page errors:', JSON.stringify(errors)); await b.close(); srv.close(); process.exit(0);
});
