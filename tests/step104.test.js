// Step 104: "Start fresh" removes one wedding's saved designs (and nothing else), and a wedding's Advanced-editor copies are
// listed only in that wedding — another wedding's copy (with its photos) never shows up in this one's lists.
const { call, mail, DRIVE } = require('./gas_mock');
const fs = require('fs'), path = require('path');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'STEP104WEDDING000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files[W + 'p' + i] = { name: 'p' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Mira & Dev', eventDate: '2026-12-20' });
const G = pub.galleryId, ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// a second wedding
const W2 = 'STEP104WEDDING000002'; DRIVE.folders[W2] = { name: W2, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W2 + 'w'] = { name: 'Wedding', parent: W2 };
for (let i = 0; i < 4; i++) DRIVE.files[W2 + 'p' + i] = { name: 'p' + i + '.jpg', parent: W2 + 'w', mime: 'image/jpeg' };
const q = call('queue', { token: admin }).recentDone; const pub2 = call('setGallery', { token: admin, orderId: q[q.length > 1 ? 1 : 0].orderId, folderUrl: W2, title: 'Asha & Kabir', eventDate: '2026-12-21' });
const G2 = pub2.galleryId, ck2 = call('facesStatus', { token: admin, g: G2 }).gallery.coupleKey;
ok(G2 !== G, 'two weddings');
const doc = { name: 'x', sections: [] };
const c1 = call('canvasSave', { g: G, coupleKey: ck, item: { kind: 'layout', name: 'A copy', scope: 'wedding', base: 'canvas-quiet', doc } });
const c2 = call('canvasSave', { g: G2, coupleKey: ck2, item: { kind: 'layout', name: 'B copy', scope: 'wedding', base: 'canvas-quiet', doc } });
const s1 = call('canvasSave', { token: admin, g: G, item: { kind: 'layout', name: 'Staff copy in A', scope: 'wedding', base: 'canvas-night', doc } });
const listed = (gg, extra) => call('canvasList', Object.assign({ g: gg }, extra)).layouts.map(x => x.id);
ok(listed(G2, { token: admin }).indexOf(c1.id) < 0 && listed(G2, { token: admin }).indexOf(s1.id) < 0 && listed(G2, { token: admin }).indexOf(c2.id) > -1, 'PicGrades in wedding B sees only B\'s copies (not A\'s, with A\'s photos)');
ok(listed(G, { token: admin }).indexOf(c1.id) > -1 && listed(G, { token: admin }).indexOf(s1.id) > -1, 'in wedding A, A\'s copies are listed');
// choices, a version, a theme
call('coupleLook', { g: G, coupleKey: ck, theme: 'blush', layout: 'custom', custom: JSON.stringify({ base: 'canvas-quiet', story: { kind: 'canvas', names: 'Mira & Dev' }, blocks: [] }), version: JSON.stringify({ id: 'canvas-quiet', custom: { base: 'canvas-quiet', story: { kind: 'canvas' }, blocks: [] } }) });
ok(call('coupleFreshStart', { g: G, coupleKey: 'wrong' }).ok === false, 'a wrong couple key cannot start fresh');
const r = call('coupleFreshStart', { g: G, coupleKey: ck });
const g1 = call('getGallery', { g: G }).gallery;
ok(r.ok && r.removed === 2 && g1.layout === '' && !(g1.custom && g1.custom.story) && !Object.keys(g1.versions || {}).length, 'Start fresh: no template choices, no own Hub, the 2 copies of this wedding gone');
ok(g1.theme === 'blush' && g1.title, 'the theme and the wedding itself stay');
ok(listed(G2, { coupleKey: ck2 }).indexOf(c2.id) > -1, 'the other wedding\'s copy is untouched');
ok(call('freshStart', { token: admin, g: G2 }).ok === true && listed(G2, { coupleKey: ck2 }).indexOf(c2.id) < 0, 'PicGrades can start fresh for a wedding too');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all ok');
