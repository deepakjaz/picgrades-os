const { call, DB, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
// Build a fake shared wedding folder
const W = 'WEDDINGFOLDER1234567890';
DRIVE.folders[W] = { name: 'Aarav_Kavya_2026', access: 'ANYONE_WITH_LINK' };
const sub = (id, name) => { DRIVE.folders[id] = { name, parent: W }; };
sub('fR', '00_Root_Moment'); sub('fW', 'Wedding'); sub('fH', 'Haldi'); sub('fX', 'Baraat'); sub('fE', 'Empty');
const img = (id, parent, name, mime) => { DRIVE.files[id] = { name, parent, mime: mime || 'image/jpeg' }; };
['r2.jpg', 'r10.jpg', 'r1.jpg'].forEach((n, i) => img('R' + i, 'fR', n));
img('W1', 'fW', 'w1.jpg'); img('W2', 'fW', 'notes.txt', 'text/plain'); img('H1', 'fH', 'h1.jpg'); img('X1', 'fX', 'x1.jpg'); img('L1', W, 'loose.jpg');

const client = login('team@35mmcandids.com'), admin = login('adcmediaa@gmail.com'), other = login('mithil@sandboxstudios.in');
const ord = call('me', { token: client }).orders.find(o => /completed/i.test(o.status));
assert(!call('setGallery', { token: client, orderId: ord.orderId, folderUrl: 'https://example.com/nothing' }).ok, 'bad link rejected');
DRIVE.folders[W].access = 'PRIVATE';
let r = call('setGallery', { token: client, orderId: ord.orderId, folderUrl: 'https://drive.google.com/drive/folders/' + W + '?usp=sharing' });
assert(!r.ok && /not shared publicly/.test(r.error), 'private folder gives a clear sharing message');
DRIVE.folders[W].access = 'ANYONE_WITH_LINK';
assert(!call('setGallery', { token: other, orderId: ord.orderId, folderUrl: W }).ok, 'other studio cannot publish on this order');
r = call('setGallery', { token: client, orderId: ord.orderId, folderUrl: 'https://drive.google.com/drive/folders/' + W + '?usp=sharing', title: 'Aarav & Kavya', eventDate: '2026-11-20' });
assert(r.ok && r.photoCount === 7 && r.rootCount === 3, 'scan: 7 photos, 3 Root Moments (txt ignored)');
assert(r.events.map(e => e.name).join(',') === 'Haldi,Wedding,Baraat,Highlights', 'events ordered Haldi, Wedding, then others, loose photos as Highlights; empty folder skipped');
const gid = r.galleryId;
assert(/^[a-z0-9]{12}$/.test(gid), 'gallery id is a 12-char token');
assert(call('me', { token: client }).orders.find(o => o.orderId === ord.orderId).galleryId === gid, 'order shows gallery id');
// public view
let g = call('getGallery', { g: gid, device: 'deviceAAAA' });
assert(g.ok && g.gallery.title === 'Aarav & Kavya' && g.gallery.root.map(x => x.name).join() === 'r1.jpg,r2.jpg,r10.jpg', 'public gallery: root sorted naturally');
assert(!call('getGallery', { g: 'nope' }).ok, 'unknown gallery id rejected');
// likes
r = call('likePhoto', { g: gid, photoId: 'R0', device: 'deviceAAAA' }); assert(r.ok && r.liked && r.likes === 1, 'like');
r = call('likePhoto', { g: gid, photoId: 'R0', device: 'deviceBBBB' }); assert(r.likes === 2, 'second device like');
r = call('likePhoto', { g: gid, photoId: 'R0', device: 'deviceAAAA' }); assert(!r.liked && r.likes === 1, 'unlike toggles');
g = call('getGallery', { g: gid, device: 'deviceBBBB' }); assert(g.gallery.likes.R0 === 1 && g.gallery.mine.R0, 'counts + my likes returned');
// notes
assert(!call('addNote', { g: gid, photoId: 'R0', device: 'deviceAAAA', name: '', text: 'hi' }).ok, 'note needs a name');
r = call('addNote', { g: gid, photoId: 'R0', device: 'deviceAAAA', name: 'Meera Bhua', text: 'Beautiful <b>light</b>' });
assert(r.ok, 'note added');
r = call('getNotes', { g: gid, photoId: 'R0' }); assert(r.notes.length === 1 && r.notes[0].text === 'Beautiful <b>light</b>', 'notes listed (raw text, page escapes it)');
for (let i = 0; i < 20; i++) call('addNote', { g: gid, photoId: 'R1', device: 'deviceSPAM', name: 'x', text: 'y' + i });
assert(!call('addNote', { g: gid, photoId: 'R1', device: 'deviceSPAM', name: 'x', text: 'z' }).ok && call('addNote', { g: gid, photoId: 'R1', device: 'deviceSPAM', name: 'x', text: 'z' }).error.indexOf('Too many') === 0, 'note rate limit (20/hour/device)');
// republish after adding a photo keeps same id
img('W3', 'fW', 'w3.jpg');
r = call('setGallery', { token: admin, orderId: ord.orderId });
assert(r.ok && r.galleryId === gid && r.photoCount === 8, 'refresh rescans, same gallery id');
assert(call('getGallery', { g: gid }).gallery.events.find(e => e.name === 'Wedding').photos.length === 2, 'cache cleared after refresh');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
