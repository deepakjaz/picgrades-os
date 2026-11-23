// Step 81: the sameTime switch is a saved, recognised wedding feature.
global.__autoOpen = false;
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0;
const assert = (condition, message) => {
  if (!condition) { fails++; console.error('FAIL', message); }
  else console.log('ok  ', message);
};
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const W = 'SAMETIMEBACKEND81000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
DRIVE.folders[W + 'e'] = { name: 'Ceremony', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files['STB' + i] = { name: 'photo' + i + '.jpg', parent: W + 'e', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const made = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan' });
const ck = call('facesStatus', { token: admin, g: made.galleryId }).gallery.coupleKey;
const saved = call('coupleFeatures', { g: made.galleryId, coupleKey: ck, features: { sameTime: 'off' } });
assert(saved.features && saved.features.sameTime === 'off', 'backend accepts and keeps sameTime switched off');
const enabled = call('coupleFeatures', { g: made.galleryId, coupleKey: ck, features: { sameTime: 'on' } });
assert(enabled.features && enabled.features.sameTime === 'on', 'backend can switch sameTime back on');
process.exit(fails ? 1 : 0);
