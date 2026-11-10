// Step 50: guest uploads and albums stay private until the couple approves; hiding closes them again;
// the 6-month clean-up also forgets the mobile number in FindMe and the number + email in DownloadRequests.
const { call, mail, DRIVE, DB, advance } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'SECURITYWEDDING00001';
DRIVE.folders[W] = { name: 'Sec_Test', access: 'ANYONE_WITH_LINK' }; DRIVE.folders.sW = { name: 'Wedding', parent: W };
['S1', 'S2', 'S3'].forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: 'sW', mime: 'image/jpeg' });
const admin = login('adcmediaa@gmail.com');
const today = new Date().toISOString().slice(0, 10);
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Sec Test', eventDate: today }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const face = v => { const b = Buffer.alloc(128); for (let i = 0; i < 128; i++) b[i] = (v + i * 3) % 100; return b.toString('base64'); };
call('saveFaces', { token: admin, g: gid, pass: 1, done: true, photos: { S1: { w: 9, h: 9, f: [[[1, 1, 2, 2], face(500)]] }, S2: { w: 9, h: 9, f: [] }, S3: { w: 9, h: 9, f: [] } } });
const j = call('guestJoin', { g: gid, name: 'Riya', phone: '9811122233', device: 'devsec0001' });
const gb = { guestId: j.guestId, guestKey: j.guestKey };
const fileIdOf = pid => { const r = DB.GuestPosts.slice(1).find(x => x.includes(pid)); return String(r[DB.GuestPosts[0].indexOf('fileId')]); };
const sharing = id => (DRIVE.files[id] || {}).sharing || '';
const b64 = Buffer.from('photo').toString('base64');
// one photo upload
const up = call('uploadMoment', Object.assign({ g: gid, mime: 'image/jpeg', base64: b64 }, gb));
assert(up.ok && up.status === 'review', 'guest upload waits for the couple');
assert(/^PRIVATE/.test(sharing(fileIdOf(up.postId))), 'while waiting it is NOT open to anyone with the link: ' + sharing(fileIdOf(up.postId)));
let q = call('coupleQueue', { g: gid, coupleKey: ck });
assert(q.waiting[0].thumb && q.waiting[0].thumb.startsWith('data:image/png;base64,'), 'the couple sees a preview made by the server (no public link needed)');
assert(call('myPosts', Object.assign({ g: gid }, gb)).posts[0].thumb, 'the guest sees their own waiting upload too');
call('couplePost', { g: gid, coupleKey: ck, postId: up.postId, decision: 'approve' });
assert(!call('myPosts', Object.assign({ g: gid }, gb)).posts[0].thumb, 'once approved: no extra preview (the normal link works)');
assert(sharing(fileIdOf(up.postId)) === 'ANYONE_WITH_LINK:VIEW', 'approved → opened so the gallery can show it');
call('couplePost', { g: gid, coupleKey: ck, postId: up.postId, decision: 'hide' });
assert(sharing(fileIdOf(up.postId)) === 'PRIVATE:NONE', 'hidden later → closed again');
// a guest album and the couple's own album
const slide = 'data:image/jpeg;base64,' + b64;
const alb = call('savePost', Object.assign({ g: gid, slides: [slide, slide], caption: 'us' }, gb));
assert(alb.ok && alb.status === 'review' && fileIdOf(alb.postId).split(',').every(id => /^PRIVATE/.test(sharing(id))), 'a guest album waits, every slide private');
call('couplePost', { g: gid, coupleKey: ck, postId: alb.postId, decision: 'approve' });
assert(fileIdOf(alb.postId).split(',').every(id => sharing(id) === 'ANYONE_WITH_LINK:VIEW'), 'approved album → every slide opened');
const own = call('savePost', { g: gid, coupleKey: ck, slides: [slide] });
assert(own.ok && own.status === 'approved' && sharing(fileIdOf(own.postId)) === 'ANYONE_WITH_LINK:VIEW', "the couple's own album is shown straight away");
// Find me record + a download request, then 6 months later
call('findFaces', Object.assign({ g: gid, d: face(500), device: 'devsec0001' }, gb));
call('askDownload', Object.assign({ g: gid, ids: ['S2'], email: 'riya@example.com' }, gb));
const col = (t, n) => DB[t][0].indexOf(n);
const fm = () => DB.FindMe.slice(1).find(r => r.includes(gid)), dr = () => DB.DownloadRequests.slice(1).find(r => r.includes(gid));
assert(String(fm()[col('FindMe', 'phone')]).includes('9811122233') && dr()[col('DownloadRequests', 'email')] === 'riya@example.com', 'before: number and email are kept');
advance(24 * 30); call('health', {}); let r = __nightly();
assert(String(fm()[col('FindMe', 'phone')]).includes('9811122233'), 'one month later: still kept (Find me still works for her)');
advance(24 * 160); r = __nightly();
assert(!String(fm()[col('FindMe', 'phone')]).replace(/'/g, '') && !String(dr()[col('DownloadRequests', 'phone')]).replace(/'/g, '') && !dr()[col('DownloadRequests', 'email')], '6 months: number gone from FindMe, number + email gone from DownloadRequests');
assert(+(call('health', {}).version.match(/^step(\d+)/) || [0, 0])[1] >= 50, 'backend version is step50 or later');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 50 checks passed');
