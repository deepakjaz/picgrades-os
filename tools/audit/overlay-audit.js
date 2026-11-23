// Audit tool (not a test): opens every editor on phone and laptop sizes, measures how much of the preview stays visible,
// and saves screenshots to /tmp/audit. Run: node tools/audit/overlay-audit.js [--layouts]   (made-up photos only; --layouts adds every layout's Hub and Design screen)
const http = require('http'); const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('../../tests/gas_mock');
const root = path.join(__dirname, '..', '..'), FX = path.join(__dirname, '..', '..', 'tests', 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const W = 'AUDITWEDDING00000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
[['tH', 'Haldi'], ['tS', 'Sangeet'], ['tW', 'Wedding'], ['tR', 'Reception']].forEach(([id, n], k) => { DRIVE.folders[id] = { name: n, parent: W }; for (let i = 0; i < 6; i++) DRIVE.files['TP' + k + i] = { name: 'p' + i + '.jpg', parent: id, mime: 'image/jpeg' }; });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const ck = call('facesStatus', { token: admin, g: pub.galleryId }).gallery.coupleKey;
const bytesOf = (id) => { const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0; return fs.readFileSync(path.join(FX, files[n % files.length])); };
global.__fetchBytes = bytesOf;


const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') { let b = ''; req.on('data', d => b += d); req.on('end', () => { const p = JSON.parse(b); res.end(JSON.stringify(call(p.action, p))); }); return; }
  if (req.url === '/app/config.js') { res.end("window.PG_CONFIG={apiUrl:'/api'}"); return; }
  let u = req.url.split('?')[0]; if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/.test(u)) u = '/app/gallery.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.statusCode = 404; res.end(); } else { res.setHeader('Content-Type', u.endsWith('.html') ? 'text/html' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/javascript'); res.end(d); } });
}).listen(8950, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); fs.mkdirSync('/tmp/audit', { recursive: true });
  const URL = 'http://localhost:8950/g/' + pub.galleryId + '?couple=' + ck, rows = [];
  // how much of the preview can be seen: a 24×24 grid of points over the preview (inside the screen); a point counts if the preview is on top there
  const measure = (sel) => { const p = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length); if (!p) return { missing: true };
    const r = p.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(vw, r.right), y1 = Math.min(vh, r.bottom);
    if (x1 <= x0 || y1 <= y0) return { onScreen: 0, visible: 0, w: Math.round(r.width), h: Math.round(r.height) };
    let on = 0, n = 0, by = {}; for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) { const x = x0 + (i + .5) * (x1 - x0) / 24, y = y0 + (j + .5) * (y1 - y0) / 24, hit = document.elementFromPoint(x, y); n++;
      if (hit && (p === hit || p.contains(hit))) on++; else if (hit) { const k = (hit.closest('[class]') || hit).className.toString().split(' ')[0]; by[k] = (by[k] || 0) + 1; } }
    const cover = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ' ' + Math.round(v / n * 100) + '%');
    return { w: Math.round(r.width), h: Math.round(r.height), onScreen: Math.round((x1 - x0) * (y1 - y0) / (vw * vh) * 100), visible: Math.round(on / n * 100), cover }; };
  const RH = require('../../tests/reel_helper');
  const postEdit = async (pg, mode) => { await pg.evaluate(() => document.getElementById('pgcPost').click()); await pg.waitForSelector('.pe-wrap[data-view=pick]', { timeout: 30000 });
    if (mode === 'album') await pg.click('.pe-tab[data-mode=album]'); await pg.click('.pe-v-pick .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=edit]', { timeout: 30000 }); await pg.waitForTimeout(500); };
  const reelEdit = async pg => { await pg.evaluate(() => document.getElementById('pghReel').click()); await RH.toEditor(pg); };
  const free = async pg => { await pg.evaluate(() => PGCanvasEditor.open('canvas-quiet')); await pg.waitForSelector('.pce .pgc-sec'); await pg.waitForTimeout(400); };
  const S = [
    ['Free editor — nothing selected', '.pce-page', free],
    ['Free editor — a part selected', '.pce-page', async pg => { await free(pg); await pg.evaluate(() => { const e = PGCanvasEditor.state().doc.sections[0].els.find(x => x.t === 'names'); PGCanvasEditor.select(e.id); }); }],
    ['Free editor — Living Story converted', '.pce-page', async pg => { await pg.evaluate(() => PGCanvasEditor.open('story-living')); await pg.waitForSelector('.pce .pgc-sec', { timeout: 15000 }); }],
    ['Template editor (tpl-c1)', '.pgte-scroll', async pg => { await pg.evaluate(() => PGTemplateEditor.open('tpl-c1')); await pg.waitForSelector('.pgte-scroll .pss', { timeout: 15000 }); }],
    ['Template editor — choose a photo', '.pgte-scroll', async pg => { await pg.evaluate(() => PGTemplateEditor.open('tpl-c1')); await pg.waitForSelector('.pgte-scroll .pss', { timeout: 15000 }); await pg.evaluate(() => PGTemplateEditor.tab('photos')); await pg.waitForTimeout(300); await pg.click('.pgte-slot'); }],
    ['Framing sheet', '.pgfr-hold', async pg => { await pg.evaluate(() => PGFrame.open({ id: 'TP00', ratio: 0.8 })); }],
    ['Card editor (grid Hub)', '.pged-canvas', async pg => { await pg.evaluate(() => PGHubEditor.open()); await pg.waitForSelector('.pged-canvas .pged-card'); }],
    ['Card editor — a card selected', '.pged-canvas', async pg => { await pg.evaluate(() => PGHubEditor.open()); await pg.waitForSelector('.pged-canvas .pged-card'); await pg.locator('.pged-canvas .pged-card').first().click(); }],
    ['Card editor from Living Story', '.pged-story', async pg => { await pg.evaluate(() => PGHubEditor.open({ from: 'story-living' })); await pg.waitForTimeout(1500); }],
  ];
  for (const m of ['post', 'album']) {
    S.push(['Post Edits — ' + m + ', editing', '.pe-stage canvas', pg => postEdit(pg, m)]);
    for (const t of ['template', 'colours', 'text', 'sticker', 'filters', 'order', 'shape']) S.push(['Post Edits — ' + m + ', ' + t + ' open', '.pe-stage canvas', async pg => { await postEdit(pg, m); if (await pg.$('.pe-tool[data-tool=' + t + ']')) await pg.click('.pe-tool[data-tool=' + t + ']'); else throw new Error('no ' + t + ' tool in ' + m); }]);
  }
  S.push(['Reel Edits — editing', '.re-v-edit .re-stage canvas', reelEdit]);
  S.push(['Reel Edits — clip sheet open', '.re-v-edit .re-stage canvas', async pg => { await reelEdit(pg);
    const sg = await pg.evaluate(() => { const st = PGReel.state(); return st.segs.find(g => g.type === 'shot'); }); await pg.evaluate(t => document.querySelector('.re-tl').scrollTo(t * 48, 0), sg.start + sg.dur * 0.6); await pg.waitForTimeout(400);
    const bx = await pg.locator('.re-v-edit .re-stage canvas').boundingBox(); await pg.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); }]);
  for (const t of ['audio', 'text', 'sticker', 'filters', 'adjust', 'style', 'length', 'title', 'add']) S.push(['Reel Edits — ' + t + ' open', '.re-v-edit .re-stage canvas', async pg => { await reelEdit(pg); await pg.click('.re-tool[data-tool=' + t + ']'); }]);
  for (const t of ['home', 'look', 'layout', 'theme', 'features']) S.push(['Control Panel — ' + t, '#view-hub', async pg => { await pg.evaluate(t => PGControl.go(t), t); await pg.waitForSelector('.pgcp-sheet'); }]);
  if (process.argv.includes('--layouts')) {   // every layout: the Hub itself, then its Design screen
    const ids = JSON.parse(fs.readFileSync(path.join(root, 'app/themes/layouts.json'), 'utf8')); const L = Array.isArray(ids) ? ids : ids.layouts;
    for (const l of L) {
      S.push(['Layout ' + l.group + ' ' + l.id + ' — Hub', null, async pg => { await pg.goto(URL + '&layout=' + l.id); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(1500); }, true]);
      S.push(['Layout ' + l.group + ' ' + l.id + ' — Design', '.pce-page, .pgte-scroll, .pged-story:not([hidden]), .pged-canvas:not([hidden])', async pg => { await pg.evaluate(id => PGControl.designLayout(id), l.id); }]);
    }
  }
  for (const vp of [['phone', 390, 844], ['laptop', 1280, 800]]) for (const [name, sel, go, full] of S) {
    const ctx = await b.newContext({ viewport: { width: vp[1], height: vp[2] }, hasTouch: vp[0] === 'phone' }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
    await pg.route('https://lh3.googleusercontent.com/**', r => { const id = (r.request().url().match(/\/d\/([^=?]+)/) || [])[1]; r.fulfill({ contentType: 'image/jpeg', body: bytesOf(id) }); });
    await require('../../tests/fonts_local').install(pg);
    let m; try { await pg.goto(URL); await pg.waitForSelector('#pgBoot.hide', { state: 'attached' }); await pg.waitForTimeout(600); await go(pg); await pg.waitForTimeout(1200); m = sel ? await pg.evaluate(measure, sel) : {}; }
    catch (e) { m = { error: e.message.split('\n')[0].slice(0, 120) }; }
    const dir = '/tmp/audit/pack/' + (name.startsWith('Layout') ? 'layouts' : 'editors'); fs.mkdirSync(dir, { recursive: true });
    const file = dir + '/' + vp[0] + '_' + name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/-+$/, '') + '.jpg'; await pg.screenshot({ path: file, type: 'jpeg', quality: 70, fullPage: !!full }).catch(() => {});
    rows.push(Object.assign({ screen: vp[0], editor: name }, m, errs.length ? { pageErrors: errs.slice(0, 2) } : {})); console.log(JSON.stringify(rows[rows.length - 1])); await ctx.close();
  }
  fs.writeFileSync('/tmp/audit/pack/overlay.json', JSON.stringify(rows, null, 1)); await b.close(); srv.close(); process.exit(0);
});
