// Apps Script integration: gallery creation restricts Drive and emits signed relay URLs.
const assert = require('assert');
const crypto = require('crypto');
const { call, mail, DRIVE } = require('./gas_mock');
const root = 'RELAYPRIVATEFOLDER00001', event = 'RELAYPRIVATEEVENT0001', photo = 'RELAYPHOTO000000001';
DRIVE.folders[root] = { name: 'Wedding', access: 'ANYONE_WITH_LINK' };
DRIVE.folders[event] = { name: 'Wedding', parent: root, access: 'ANYONE_WITH_LINK' };
DRIVE.files[photo] = { name: '01.jpg', parent: event, mime: 'image/jpeg', access: 'ANYONE_WITH_LINK' };
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const token = login('adcmediaa@gmail.com');
const order = call('queue', { token }).recentDone[0];
const made = call('setGallery', { token, orderId: order.orderId, folderUrl: root, title: 'Private Relay Test' });
assert(made.galleryId, JSON.stringify(made));
assert.strictEqual(DRIVE.folders[root].access, 'PRIVATE');
assert.strictEqual(DRIVE.folders[event].access, 'PRIVATE');
assert.strictEqual(DRIVE.files[photo].access, 'PRIVATE');
assert.strictEqual(DRIVE.folders[root].viewers['relay@picgrades-test.iam.gserviceaccount.com'], 'VIEW');

const gallery = call('getGallery', { g: made.galleryId }).gallery;
assert(gallery.relayPhotos && gallery.relayPhotos[photo], 'gallery returns relay URL index');
const relayUrl = new URL(gallery.relayPhotos[photo].preview);
assert.strictEqual(relayUrl.pathname, '/d/' + photo);
const [payload64, signature] = relayUrl.searchParams.get('token').split('.');
const secret = 'test-secret-key-that-is-at-least-thirty-two-characters';
const expected = crypto.createHmac('sha256', secret).update(payload64).digest('base64url');
assert.strictEqual(signature, expected, 'Apps Script HMAC signature verifies');
const payload = JSON.parse(Buffer.from(payload64, 'base64url').toString('utf8'));
assert.strictEqual(payload.gid, made.galleryId);
assert.strictEqual(payload.pid, photo);
assert.strictEqual(payload.w, 1280);
assert(payload.exp > Math.floor(Date.now() / 1000));
console.log('PASS Drive folder and photo permissions are restricted');
console.log('PASS relay service account has Viewer access');
console.log('PASS gallery returns a valid per-photo HMAC relay URL');
