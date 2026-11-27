// Step 99b: the 6 story templates rebuilt as canvas layouts (they open in the one editor, with a laptop design).
const fs = require('fs'), path = require('path');
const { call, mail } = require('./gas_mock');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const root = path.join(__dirname, '..'), L = JSON.parse(fs.readFileSync(path.join(root, 'app/themes/layouts.json'), 'utf8')).layouts;
const els = JSON.parse(fs.readFileSync(path.join(root, 'app/elements/index.json'), 'utf8')).items, artIds = new Set(els.map(x => x.occasion + '/' + x.id));
const src34 = fs.readFileSync(path.join(root, 'app/gallery/34-canvas.js'), 'utf8');
const list = n => JSON.parse('[' + new RegExp('\\b' + n + ' = \\[([^\\]]*)\\]').exec(src34)[1].replace(/'/g, '"') + ']');
const MOTIONS = new Set([].concat(list('ENTER'), list('LOOP'), list('SCROLLM'))), FONTS = new Set(list('FONTS'));
call('requestCode', { email: 'adcmediaa@gmail.com' }); const admin = call('verifyCode', { email: 'adcmediaa@gmail.com', code: /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1] }).token;
const MAP = { 'tpl-c3': 'canvas-cloud-pages', 'tpl-c4': 'canvas-haldi-splash', 'tpl-c5': 'canvas-cinema-chapters', 'tpl-g1': 'canvas-heritage-courtyard', 'tpl-g2': 'canvas-misty-tea', 'tpl-g3': 'canvas-alabaster' };
ok(L.filter(l => l.story).every(l => l.editor && L.some(x => x.id === l.editor && x.canvas)), 'every story layout now has an editor version');
for (const [from, id] of Object.entries(MAP)) {
  const l = L.find(x => x.id === id), d = l && l.canvas;
  ok(d && L.find(x => x.id === from).editor === id && L.filter(x => x.id === id).length === 1, id + ': in the list once, linked from ' + from);
  const all = d.sections.flatMap(s => s.els);
  ok(d.sections.every(s => s.h && s.h.p && s.h.l), id + ': every section has its own laptop height');
  ok(all.every(e => e.l && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(e.l[k]))), id + ': every part has its own laptop spot (no phone layout stretched onto a laptop)');
  ok(all.every(e => !e.m || MOTIONS.has(e.m)), id + ': motions are from the motion library');
  ok([d.fonts.head, d.fonts.body].concat(all.flatMap(e => [e.s && e.s.font, e.sl && e.sl.font])).filter(Boolean).every(f => FONTS.has(f)), id + ': fonts are the app\'s own');
  ok(all.filter(e => e.t === 'art').every(e => artIds.has(e.src.o + '/' + e.src.id) && fs.existsSync(path.join(root, 'app/elements', e.src.o, e.src.id + '.webp'))), id + ': every element picture exists');
  ok(d.sections[0].els.filter(e => ['text', 'names', 'date'].includes(e.t)).every(e => e.p.y >= 64 && e.l.y >= 88), id + ': no words start under the app header');
  ok(all.some(e => e.t === 'action' && e.act === 'findme') && (all.some(e => e.t === 'photo' && e.src.k === 'cover') || d.sections.some(s => s.bg && s.bg.src && s.bg.src.k === 'cover')) && all.some(e => e.t === 'events'), id + ': has Find me, the cover photo (a part or the background) and the events');
  const saved = call('canvasSave', { token: admin, item: { kind: 'layout', name: l.name, scope: 'me', doc: d } });
  ok(saved.doc && saved.doc.sections.flatMap(s => s.els).length === all.length, id + ': saving keeps every part');
}
process.exit(fails ? 1 : 0);
