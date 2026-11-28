// Step 112: the Advanced editor is off for a wedding's couple and photographer until PicGrades (admin) turns it on.
const { call, mail, DRIVE } = require('./gas_mock');
const fs = require('fs'), path = require('path');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'STEP112WEDDING000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files[W + 'p' + i] = { name: 'p' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Mira & Dev', eventDate: '2026-12-20' });
const G = pub.galleryId, ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

ok(call('getGallery', { g: G }).gallery.advanced === false, 'off unless PicGrades turns it on');
ok(call('setAdvanced', { g: G, coupleKey: ck, on: true }).ok === false, 'the couple cannot turn it on');
ok(call('setAdvanced', { token: admin, g: G, on: true }).advanced === true && call('getGallery', { g: G }).gallery.advanced === true, 'PicGrades turns it on for this wedding');
ok(call('setAdvanced', { token: admin, g: G, on: false }).advanced === false && call('getGallery', { g: G }).gallery.advanced === false, '…and off again');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all ok');
