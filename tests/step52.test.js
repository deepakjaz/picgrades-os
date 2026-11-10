// Step 52: Hide sends a guest moment to Drive's bin at once (its link stops working) unless the couple keeps hidden
// moments 7 days; "Show again" brings it back out of the bin; the couple sees hidden ones with a preview.
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'HIDETRASHWEDDING0001';
DRIVE.folders[W] = { name: 'Hide_Test', access: 'ANYONE_WITH_LINK' }; DRIVE.folders.hW = { name: 'Wedding', parent: W };
['H1', 'H2'].forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: 'hW', mime: 'image/jpeg' });
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Hide Test' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const j = call('guestJoin', { g: gid, name: 'Kabir', phone: '9822233344', device: 'devhide001' });
const b64 = Buffer.from('photo').toString('base64');
const up = n => call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'image/jpeg', base64: b64, caption: 'm' + n });
const fileOf = pid => { const r = DB.GuestPosts.slice(1).find(x => x.includes(pid)); return String(r[DB.GuestPosts[0].indexOf('fileId')]); };
const a = up(1), b = up(2);
let r = call('couplePost', { g: gid, coupleKey: ck, postId: a.postId, decision: 'hide' });
assert(r.ok && DRIVE.files[fileOf(a.postId)].trashed === true, 'Hide (default) → the file is in the bin at once, its link stops working');
r = call('couplePost', { g: gid, coupleKey: ck, postId: b.postId, decision: 'hide', keep: '7d' });
assert(r.ok && !DRIVE.files[fileOf(b.postId)].trashed && /^PRIVATE/.test(DRIVE.files[fileOf(b.postId)].sharing), 'Hide with "keep 7 days" → private, not in the bin');
const q = call('coupleQueue', { g: gid, coupleKey: ck });
assert(q.decided.filter(x => x.status === 'hidden').length === 2 && q.decided.every(x => x.thumb), 'the couple sees both hidden moments with a preview');
r = call('couplePost', { g: gid, coupleKey: ck, postId: a.postId, decision: 'approve' });
assert(r.ok && !DRIVE.files[fileOf(a.postId)].trashed && DRIVE.files[fileOf(a.postId)].sharing === 'ANYONE_WITH_LINK:VIEW', 'Show again → back out of the bin and shown');
assert(call('getGallery', { g: gid }).gallery.guestPosts.some(p => p.fileId === fileOf(a.postId)), 'and it is in Root Moment again');
assert(+(call('health', {}).version.match(/^step(\d+)/) || [0, 0])[1] >= 52, 'backend version is step52 or later');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 52 checks passed');
