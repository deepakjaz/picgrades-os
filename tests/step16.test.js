// Step 16: nightly clean-up. Old login codes go; hidden uploads are deleted after 7 days; guest phone numbers go
// 6 months after the wedding and face data 12 months after it. Posts, albums, approved moments, names and notes stay.
const { call, mail, DRIVE, DB, advance } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'CLEANWEDDING00000001';
DRIVE.folders[W] = { name: 'Clean_Test', access: 'ANYONE_WITH_LINK' }; DRIVE.folders.cW = { name: 'Wedding', parent: W };
['C1', 'C2', 'C3'].forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: 'cW', mime: 'image/jpeg' });
const admin = login('adcmediaa@gmail.com');
const ord = call('queue', { token: admin }).recentDone[0];
const today = new Date().toISOString().slice(0, 10);
const gid = call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: W, title: 'Clean Test', eventDate: today }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const d = Buffer.from(Array.from({ length: 128 }, (_, i) => (i * 7) % 256)).toString('base64');
assert(call('saveFaces', { token: admin, g: gid, pass: 1, photos: { C1: { w: 1600, h: 1067, f: [[[100, 100, 120, 160], d]] }, C2: { w: 1600, h: 1067, f: [] }, C3: { w: 1600, h: 1067, f: [] } }, done: true }).ok, 'faces read');
const j = call('guestJoin', { g: gid, name: 'Meera Bhua', phone: '9876543210', device: 'devclean01' });
const b64 = Buffer.from('photo').toString('base64');
const keep = call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'image/jpeg', base64: b64 });
const hide = call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'image/jpeg', base64: b64 });
call('couplePost', { g: gid, coupleKey: ck, postId: keep.postId, decision: 'approve' });
call('couplePost', { g: gid, coupleKey: ck, postId: hide.postId, decision: 'hide' });
const fileOf = (pid) => DB.GuestPosts.slice(1).find(r => r.includes(pid));
const hiddenFile = fileOf(hide.postId).find(v => /^file\d+$/.test(String(v)));
const col = (tab, name) => DB[tab][0].indexOf(name);
const phoneOf = () => DB.Guests.slice(1).find(r => r.includes(j.guestId))[col('Guests', 'phone')];
const otpRows = () => DB.Sessions.slice(1).filter(r => r[col('Sessions', 'type')] === 'otp').length;

__setupNightly(); __setupNightly();
assert(ScriptApp.getProjectTriggers().length === 1 && ScriptApp.getProjectTriggers()[0].getHandlerFunction() === 'nightlyCleanup', 'setupNightly makes one nightly job (running it twice does not make two)');

const otpBefore = otpRows();
advance(26); let r = __nightly();
assert(otpBefore > 0 && otpRows() < otpBefore && r.sessions > 0, 'old login codes removed (' + otpBefore + ' → ' + otpRows() + ')');
assert(call('me', { token: admin }).ok, 'a valid login still works after the clean-up');
assert(!DRIVE.files[hiddenFile].trashed && fileOf(hide.postId).includes('hidden'), 'day 1: hidden upload kept (the couple can still change their mind)');
assert(phoneOf() === '9876543210', 'day 1: phone kept');

advance(24 * 7); r = __nightly();
assert(DRIVE.files[hiddenFile].trashed && fileOf(hide.postId).includes('deleted') && r.hiddenDeleted === 1, 'after 7 days: hidden upload deleted from Drive');
assert(fileOf(keep.postId).includes('approved') && call('getGallery', { g: gid }).gallery.guestPosts.length === 1, 'approved moment stays');

advance(24 * 175); r = __nightly();
assert(phoneOf() === '' && !fileOf(keep.postId).includes('9876543210') && r.phonesRemoved === 1, '6 months after the wedding: phone numbers removed');
assert(DB.Guests.slice(1).find(r => r.includes(j.guestId)).includes('Meera Bhua'), 'guest name stays (shown on their moments)');
assert(call('getGallery', { g: gid }).gallery.faceSearch === true, '6 months: Find me still on');

advance(24 * 190); r = __nightly();
const g = call('getGallery', { g: gid }).gallery;
assert(r.facesRemoved === 1 && !g.faceSearch && !call('findFaces', { g: gid, d, device: 'devclean02' }).ok, '12 months after the wedding: face data removed, Find me off');
assert(g.guestPosts.length === 1 && g.events.length === 1, 'photos and approved moments stay forever');
// hearts: 40 phones tap, some change their mind; after packing, counts stay the same and taking a heart back still works
{ for (let i = 0; i < 40; i++) { call('likePhoto', { g: gid, photoId: 'C1', device: 'heartdev' + i, liked: true }); if (i % 5 === 0) call('likePhoto', { g: gid, photoId: 'C1', device: 'heartdev' + i, liked: false }); }
  call('likePhoto', { g: gid, photoId: 'C2', device: 'heartdev1', liked: true });
  const rows = () => DB.MomentNotes.slice(1).filter(r => r.includes(gid)).length;
  advance(1); const before = call('getGallery', { g: gid }).gallery.likes, n0 = rows();
  advance(72); r = __nightly(); advance(1);
  const after = call('getGallery', { g: gid }).gallery.likes, n1 = rows();
  assert(before.C1 === 32 && after.C1 === 32 && after.C2 === 1 && n1 === 2 && n0 === 49, 'hearts packed: ' + n0 + ' rows → ' + n1 + ', counts kept (C1 ' + before.C1 + ' → ' + after.C1 + ')');
  call('likePhoto', { g: gid, photoId: 'C1', device: 'heartdev1', liked: false }); advance(1);
  assert(call('getGallery', { g: gid }).gallery.likes.C1 === 31, 'a phone can still take back a heart that was packed');
  call('likePhoto', { g: gid, photoId: 'C1', device: 'heartdev1', liked: true }); advance(1);
  assert(call('getGallery', { g: gid }).gallery.likes.C1 === 32, '…and give it again');
  advance(72); __nightly(); advance(1);
  assert(call('getGallery', { g: gid }).gallery.likes.C1 === 32 && rows() === 2, 'packing again keeps the same count and rows'); }
r = __nightly(); assert(r.facesRemoved === 0 && r.phonesRemoved === 0 && r.hiddenDeleted === 0, 'running again changes nothing');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
