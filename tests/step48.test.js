// Step 48: the watermark switch and its words are saved with the wedding's page styles (cleaned, 40 letters at most).
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const W = 'WATERMARKWEDDING0001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 2; i++) DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Asha & Dev' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
let r = call('coupleLook', { g: gid, coupleKey: ck, pages: JSON.stringify({ watermark: 'on', wmtext: '  Asha & Dev · <b>Studio</b> "One"  ' }) });
assert(r.ok && r.pages.watermark === 'on' && r.pages.wmtext === 'Asha & Dev · bStudio/b One', 'the couple turns the watermark on (words cleaned): ' + r.pages.wmtext);
r = call('setLook', { token: admin, g: gid, pages: JSON.stringify({ wmtext: 'x'.repeat(80) }) });
assert(r.ok && r.pages.wmtext.length === 40 && r.pages.watermark === 'on', 'the photographer changes the words (40 letters at most), the switch stays on');
r = call('coupleLook', { g: gid, coupleKey: ck, pages: JSON.stringify({ watermark: 'maybe' }) });
assert(call('getGallery', { g: gid }).gallery.pages.watermark === 'on', 'an unknown value is ignored');
assert(+(call('health', {}).version.match(/^step(\d+)/) || [0, 0])[1] >= 48, 'backend version is step48 or later');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 48 checks passed');
