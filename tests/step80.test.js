// Step 80: loose photos are grouped by camera capture time; couple/staff can name the groups.
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0;
const assert = (condition, message) => { if (!condition) { fails++; console.error('FAIL', message); } else console.log('ok  ', message); };
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const at = (id, time, parent, name) => { const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(time || ''); const driveTime = m ? m[1] + ':' + m[2] + ':' + m[3] + ' ' + m[4] + ':' + m[5] + ':00' : ''; DRIVE.files[id] = { name: name || id + '.jpg', parent, mime: 'image/jpeg', time: driveTime }; };
const photo = (id, t) => ({ id, name: id + '.jpg', t });

// 6 late-evening photos, a 2-photo group just after midnight, then 6 next-morning photos.
// The tiny after-midnight group must join the nearer late-evening group.
const grouped = [];
for (let i = 0; i < 6; i++) grouped.push(photo('a' + i, '2026-11-20 ' + ['22:00','22:20','22:40','23:00','23:20','23:40'][i]));
grouped.push(photo('b0', '2026-11-21 00:30'), photo('b1', '2026-11-21 00:45'));
for (let i = 0; i < 6; i++) grouped.push(photo('c' + i, '2026-11-21 ' + ['10:00','10:20','10:40','11:00','11:20','11:40'][i]));
let groups = global.__makeTimeGroups(grouped, {});
assert(groups.length === 2, 'date change starts a group; tiny group is merged into its nearest neighbour');
assert(groups[0].photos.length === 8 && groups[0].start === '2026-11-20 22:00' && groups[0].end === '2026-11-21 00:45', 'small after-midnight group joins the closer previous group');
assert(groups[1].photos.length === 6 && groups[1].name === 'Sat morning', 'next-day morning group remains separate with weekday + part-of-day default');

// Same date: a gap greater than three hours starts a new group.
const gap = [];
for (let i = 0; i < 5; i++) gap.push(photo('d' + i, '2026-11-20 ' + ['08:00','08:20','08:40','09:00','09:20'][i]));
for (let i = 0; i < 5; i++) gap.push(photo('e' + i, '2026-11-20 ' + ['13:00','13:20','13:40','14:00','14:20'][i]));
groups = global.__makeTimeGroups(gap, {});
assert(groups.length === 2 && groups[0].photos.length === 5 && groups[1].photos.length === 5, 'a gap greater than three hours splits groups');

// Integration: Drive metadata is paginated; untimed photos remain Highlights; weddings with event folders are unchanged.
global.__drivePageSize = 4;
const W = 'STEP80WEDDING000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
for (let i = 0; i < 6; i++) {
  at('looseA' + i, '2026-11-20 09:' + String(i * 10).padStart(2, '0'), W);
  at('looseB' + i, '2026-11-20 17:' + String(i * 10).padStart(2, '0'), W);
}
at('noTime', '', W, 'scan-without-capture-time.jpg');
// A second wedding WITH a photographer's event folder: its loose photos stay one Highlights event (no time groups).
const F = 'STEP80FOLDERS000000001', H = F + 'haldi';
DRIVE.folders[F] = { name: F, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[H] = { name: 'Haldi', parent: F };
for (let i = 0; i < 6; i++) {
  at('folderH' + i, '2026-11-20 12:' + String(i * 10).padStart(2, '0'), H);
  at('pickA' + i, '2026-11-20 09:' + String(i * 10).padStart(2, '0'), F);
  at('pickB' + i, '2026-11-20 17:' + String(i * 10).padStart(2, '0'), F);
}
const withFolders = global.__scanWeddingFolder(F);
assert(withFolders.timeGroups.length === 0, 'a wedding with event folders gets no time groups');
assert(withFolders.events.some(e => e.name === 'Highlights' && e.photos.length === 12), 'its loose photos stay one Highlights event, as before');
assert(withFolders.events.some(e => e.name === 'Haldi' && e.photos.length === 6 && e.photos.every(p => /^2026-11-20 12:/.test(p.t))), 'photographer-created Haldi folder stays a normal event, and its photos carry their time (for T2)');
assert(withFolders.events.find(e => e.name === 'Highlights').photos.every(p => !!p.t), 'loose Highlights photos carry their time too');
const admin = login('adcmediaa@gmail.com');
const order = call('queue', { token: admin }).recentDone[0];
const made = call('setGallery', { token: admin, orderId: order.orderId, folderUrl: W, title: 'Anika & Rohan' });
assert(!!made.galleryId, 'gallery scan succeeds with paginated Drive capture metadata');
const coupleKey = call('facesStatus', { token: admin, g: made.galleryId }).gallery.coupleKey;
let manifest = call('getGallery', { g: made.galleryId, token: admin }).gallery;
assert(manifest.timeGroups.length === 2, 'loose photos become two time groups');
assert(manifest.timeGroups.every(g => g.photos.length === 4 && g.count === 6), 'Control Panel metadata keeps four preview photos per group, not duplicate full photo lists');
assert(manifest.events.some(e => e.name === 'Highlights' && e.photos.some(p => p.id === 'noTime')), 'photos without capture time stay in Highlights');
assert(manifest.events.every(e => !e.timeGroupKey || e.photos.every(p => !!p.t)), 'only photos with capture times enter generated groups');
const guestManifest = call('getGallery', { g: made.galleryId }).gallery;
assert(guestManifest.timeGroups.length === 0, 'time-group editor data is not exposed to guests');
global.__driveApiFail = true;
const withoutMetadata = global.__scanWeddingFolder(W);
global.__driveApiFail = false;
assert(withoutMetadata.events.some(e => e.name === 'Highlights' && e.photos.length === 13), 'Drive metadata failure does not fail the scan; loose photos fall back to Highlights');

// Couple saves names; HTML is stripped and values are capped at 40 characters.
const first = manifest.timeGroups[0].key, second = manifest.timeGroups[1].key;
const longName = 'A'.repeat(55);
const saved = call('nameTimeGroups', { g: made.galleryId, coupleKey,
  names: JSON.stringify({ [first]: '<script>alert(1)</script><b>Mehndi</b>', [second]: longName, unknown: 'Ignore me' }) });
assert(saved.timeGroups[0].name === 'Mehndi', 'name save strips HTML and script content');
assert(saved.timeGroups[1].name === 'A'.repeat(40), 'name save caps each name at 40 characters');
assert(saved.events.some(e => e.name === 'Mehndi' && e.timeGroupKey === first), 'saved name becomes a normal Events-page event');
assert(saved.events.some(e => e.name === 'A'.repeat(40) && e.timeGroupKey === second), 'long saved name is reflected in the manifest');
manifest = call('getGallery', { g: made.galleryId, coupleKey }).gallery;
assert(manifest.events.some(e => e.name === 'Mehndi'), 'saved names persist after reloading the gallery manifest');
const staffSave = call('nameTimeGroups', { g: made.galleryId, token: admin, names: JSON.stringify({ [second]: 'Reception' }) });
assert(staffSave.events.some(e => e.name === 'Reception'), 'authorised PicGrades staff can also save event names');

// A guest cannot name groups, even if they know the gallery ID.
const denied = call('nameTimeGroups', { g: made.galleryId, names: JSON.stringify({ [first]: 'Guest edit' }) });
assert(denied.ok === false, 'guest cannot save event names');
assert(call('getGallery', { g: made.galleryId, coupleKey }).gallery.events.some(e => e.name === 'Mehndi'), 'unauthorised save leaves names unchanged');
call('setGallery', { token: admin, orderId: order.orderId, folderUrl: W, title: 'Anika & Rohan' });
const rescanned = call('getGallery', { g: made.galleryId, coupleKey }).gallery;
assert(rescanned.events.some(e => e.name === 'Mehndi') && rescanned.events.some(e => e.name === 'Reception'), 'saved names survive a later folder rescan');

process.exit(fails ? 1 : 0);
