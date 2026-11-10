// Step 39: demo weddings — the photographer (or PicGrades) turns demo on; getGallery tells the app.
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const orders = call('queue', { token: admin }).recentDone;
const W = 'DEMOWEDDING000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 3; i++) DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const gid = call('setGallery', { token: admin, orderId: orders[0].orderId, folderUrl: W, title: 'Demo Wedding', eventDate: '2026-03-01' }).galleryId;
assert(call('getGallery', { g: gid }).gallery.demo === false, 'a wedding is not a demo by default');
assert(!call('setDemo', { g: gid, on: 'yes' }).ok, 'not logged in = cannot turn demo on');
let r = call('setDemo', { token: admin, g: gid, on: 'yes' });
assert(r.ok && r.demo === true, 'PicGrades / photographer turns demo on');
assert(call('getGallery', { g: gid }).gallery.demo === true, 'the app knows it is a demo');
assert(call('facesStatus', { token: admin, g: gid }).gallery.demo === true, 'the photographer page shows the switch on');
r = call('setDemo', { token: admin, g: gid, on: '' });
assert(r.demo === false && call('getGallery', { g: gid }).gallery.demo === false, 'and off again');
assert(call('health', {}).version === 'step39-demo-mode', 'backend version step39-demo-mode');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 39 checks passed');
