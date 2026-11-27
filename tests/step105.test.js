// Step 105: "While scrolling" effects are kept on a saved layout, and every value is cleaned (effect, when, strength, direction, shape, colour).
const { call, mail, DRIVE } = require('./gas_mock');
const fs = require('fs'), path = require('path');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'STEP105WEDDING000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files[W + 'p' + i] = { name: 'p' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Mira & Dev', eventDate: '2026-12-20' });
const G = pub.galleryId, ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const el = sc => ({ id: 'a', t: 'shape', p: { x: 0, y: 0, w: 100, h: 100 }, sc });
const save = sc => call('canvasSave', { g: G, coupleKey: ck, item: { kind: 'layout', name: 'fx', scope: 'wedding', doc: { name: 'fx', sections: [{ id: 's', h: { p: 600 }, els: [el(sc)] }] } } });
const got = sc => { const r = save(sc); return call('canvasGet', { g: G, coupleKey: ck, id: r.id }).doc.sections[0].els[0].sc; };
let x = got({ fx: 'grow-shrink', rg: 'stay', str: 80 });
ok(x && x.fx === 'grow-shrink' && x.rg === 'stay' && x.str === 80, 'a scroll effect is kept: grow, then shrink, while the part stays');
x = got({ fx: 'reveal', rg: 'nope', str: 999, sh: 'arch', dir: 'diagonal', c2: 'red' });
ok(x.rg === 'pass' && x.str === 100 && x.sh === 'arch' && !x.dir && !x.c2, 'bad values are cleaned: when → passing, strength ≤ 100, unknown direction and colour dropped');
x = got({ fx: 'colour', c2: '#1D4ED8' });
ok(x.c2 === '#1D4ED8', 'a real colour is kept');
x = got({ fx: 'explode' });
ok(x === undefined, 'an unknown effect is not saved');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all ok');
