// Step 111: the wedding's films (YouTube / Shorts / Drive) — only clean links are kept, at most 12; a films card is a canvas part type.
const { call, mail, DRIVE } = require('./gas_mock');
const fs = require('fs'), path = require('path');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'STEP111WEDDING000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files[W + 'p' + i] = { name: 'p' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Mira & Dev', eventDate: '2026-12-20' });
const G = pub.galleryId, ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const save = f => call('coupleLook', { g: G, coupleKey: ck, films: JSON.stringify(f) }).films;
let f = save([{ k: 'yt', id: 'dQw4w9WgXcQ' }, { k: 'yt', id: 'aBcDeFgHiJk', sh: true }, { k: 'drive', id: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345' }, { k: 'vimeo', id: '12345678' }, { k: 'yt', id: '<script>' }]);
ok(f.length === 3 && f[1].sh === 1 && !f[0].sh && f[2].k === 'drive', 'YouTube, a Short and a Drive video are kept; other links are dropped');
ok(call('getGallery', { g: G }).gallery.films.length === 3, 'every guest gets the films list');
f = save(Array.from({ length: 20 }, (_, i) => ({ k: 'yt', id: 'abcdefgh' + String(i).padStart(3, '0') })));
ok(f.length === 12, 'at most 12 films');
ok(call('coupleLook', { g: G, coupleKey: 'nope', films: '[]' }).ok === false, 'a wrong couple key cannot change them');
const r = call('canvasSave', { g: G, coupleKey: ck, item: { kind: 'layout', name: 'tv', scope: 'wedding', doc: { name: 'tv', sections: [{ id: 's', h: { p: 400 }, els: [{ id: 'tv', t: 'films', p: { x: 0, y: 0, w: 300, h: 200 } }] }] } } });
ok(call('canvasGet', { g: G, coupleKey: ck, id: r.id }).doc.sections[0].els[0].t === 'films', 'a films card can be saved in a layout');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all ok');
