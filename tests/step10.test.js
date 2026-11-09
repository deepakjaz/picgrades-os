// Step 10: guests (name + phone), saved Find me collections, Root Moment uploads, couple approval + thank-you note.
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'GUESTWEDDING00000001';
DRIVE.folders[W] = { name: 'Diya_Kabir', access: 'ANYONE_WITH_LINK' }; DRIVE.folders.gW = { name: 'Wedding', parent: W };
['G1', 'G2', 'G3'].forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: 'gW', mime: 'image/jpeg' });
const admin = login('adcmediaa@gmail.com');
const ord = call('queue', { token: admin }).recentDone[0];
const gid = call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: W, title: 'Diya & Kabir' }).galleryId;
// join
assert(!call('guestJoin', { g: gid, name: 'A', phone: '98765' }).ok, 'name and 10-digit phone needed');
const j = call('guestJoin', { g: gid, device: 'dev-guest-0001', name: '  Meera  Bhua ', phone: '+91 98765 43210' });
assert(j.ok && /^gst_/.test(j.guestId) && j.guestKey.length === 24 && j.name === 'Meera Bhua', 'guest joined');
// saved sets
const sv = call('saveSet', { g: gid, device: 'dev-guest-0001', guestId: j.guestId, name: "Meera's photos", ids: ['G1', 'G3', 'NOPE'] });
assert(sv.ok && sv.count === 2 && sv.code.length === 8, 'saved collection (only gallery photos)');
const gs = call('getSet', { g: gid, code: sv.code });
assert(gs.ok && gs.name === "Meera's photos" && gs.ids.join() === 'G1,G3', 'saved collection opens by code');
assert(!call('getSet', { g: gid, code: 'nope1234' }).ok, 'unknown code');
// upload
const b64 = Buffer.from('fake-jpeg-bytes').toString('base64');
assert(!call('uploadMoment', { g: gid, mime: 'image/jpeg', base64: b64 }).ok, 'upload needs name + phone');
assert(!call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: 'wrong', mime: 'image/jpeg', base64: b64 }).ok, 'wrong guest key rejected');
assert(!call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'application/pdf', base64: b64 }).ok, 'only photos/videos');
let u = call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'image/jpeg', base64: 'data:image/jpeg;base64,' + b64, caption: 'Baraat!' });
assert(u.ok && u.status === 'review', 'photo uploaded, waiting for review');
const gf = Object.keys(DRIVE.folders).find(k => DRIVE.folders[k].name === '01_Guest_Moments' && DRIVE.folders[k].parent === W);
const saved = Object.values(DRIVE.files).find(f => f.parent === gf);
assert(gf && saved && Buffer.from(saved.bytes).toString() === 'fake-jpeg-bytes', 'file saved in 01_Guest_Moments in the wedding folder');
const u2 = call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'video/mp4', base64: b64 });
assert(u2.ok, 'video uploaded');
assert(!call('uploadMoment', { g: gid, guestId: j.guestId, guestKey: j.guestKey, mime: 'video/mp4', base64: 'A'.repeat(28 * 1024 * 1024) }).ok, 'over 20 MB rejected');
// guest folder must never become an event; unapproved posts are not public
call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: W });
let g = call('getGallery', { g: gid }).gallery;
assert(!g.events.some(e => /guest/i.test(e.name)) && g.guestPosts.length === 0, 'guest folder is not an event; nothing public before approval');
let mp = call('myPosts', { g: gid, guestId: j.guestId, guestKey: j.guestKey });
assert(mp.ok && mp.posts.length === 2 && mp.posts.every(x => x.status === 'review'), 'guest sees "in review"');
// couple
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
assert(ck && ck.length === 20, 'couple link key made for staff');
assert(!call('coupleQueue', { g: gid, coupleKey: 'nope' }).ok, 'wrong couple key rejected');
let q = call('coupleQueue', { g: gid, coupleKey: ck });
assert(q.ok && q.waiting.length === 2 && q.waiting[0].name === 'Meera Bhua', 'couple sees 2 waiting');
assert(call('couplePost', { g: gid, coupleKey: ck, postId: u.postId, decision: 'approve' }).status === 'approved', 'couple approves photo');
assert(call('couplePost', { g: gid, coupleKey: ck, postId: u2.postId, decision: 'hide' }).status === 'hidden', 'couple hides video');
{ const row = DB.GuestPosts.slice(1).find(r => r.includes(u2.postId)), fid = row.find(v => /^file\d+$/.test(String(v)));
  assert(/^PRIVATE/.test(DRIVE.files[fid].sharing), 'hidden video is no longer open to anyone with its Drive link');
  assert(!call('videoOk', { g: gid, id: fid }).allowed, 'hidden video cannot be streamed'); }
{ const row = DB.GuestPosts.slice(1).find(r => r.includes(u.postId)), fid = row.find(v => /^file\d+$/.test(String(v)));
  assert(/^ANYONE_WITH_LINK/.test(DRIVE.files[fid].sharing), 'approved photo stays viewable'); }
assert(!call('videoOk', { g: gid, id: 'SOMEOTHERDRIVEFILE000' }).allowed, 'videoOk refuses files from outside the gallery');
assert(call('coupleThanks', { g: gid, coupleKey: ck, text: 'Thank you Meera Bhua! — Diya & Kabir' }).ok, 'thank-you note saved');
g = call('getGallery', { g: gid, coupleKey: ck }).gallery;
assert(g.guestPosts.length === 1 && g.guestPosts[0].caption === 'Baraat!' && g.guestPosts[0].name === 'Meera Bhua' && g.isCouple === true, 'approved post is public; couple mode on with key');
assert(call('getGallery', { g: gid }).gallery.isCouple === false, 'no couple mode without key');
mp = call('myPosts', { g: gid, guestId: j.guestId, guestKey: j.guestKey });
assert(mp.posts.find(x => x.postId === u.postId).status === 'approved' && /Thank you Meera Bhua/.test(mp.thanks), 'guest sees approved + thank-you note');
// no edit access on the wedding folder → clear message
const W2 = 'GUESTWEDDING00000002'; DRIVE.folders[W2] = { name: 'RO', access: 'ANYONE_WITH_LINK', readOnly: true }; DRIVE.folders.gW2 = { name: 'Wedding', parent: W2 }; DRIVE.files.H1 = { name: 'h.jpg', parent: 'gW2', mime: 'image/jpeg' };
const gid2 = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[1].orderId, folderUrl: W2, title: 'RO' }).galleryId;
const j2 = call('guestJoin', { g: gid2, name: 'Ravi', phone: '9876543210' });
const bad = call('uploadMoment', { g: gid2, guestId: j2.guestId, guestKey: j2.guestKey, mime: 'image/jpeg', base64: b64 });
assert(!bad.ok && /not switched on/.test(bad.error), 'no edit access → friendly message');
// posts & albums
const slide = 'data:image/jpeg;base64,' + Buffer.from('slide-bytes').toString('base64');
assert(!call('savePost', { g: gid, slides: [slide] }).ok, 'post needs couple, photographer or a named guest');
let sp = call('savePost', { g: gid, coupleKey: ck, slides: [slide, slide, slide], caption: 'Our sangeet' });
assert(sp.ok && sp.status === 'approved' && sp.slides === 3, 'couple post goes live straight away (3 slides)');
const st = call('savePost', { g: gid, token: admin, slides: [slide] });
assert(st.ok && st.status === 'approved', 'photographer/PicGrades post goes live straight away');
const sg = call('savePost', { g: gid, guestId: j.guestId, guestKey: j.guestKey, slides: [slide, slide] });
assert(sg.ok && sg.status === 'review', 'guest post waits for the couple');
g = call('getGallery', { g: gid }).gallery;
const alb = g.guestPosts.filter(x => x.type === 'album');
assert(alb.length === 2 && alb.some(x => x.fileId.split(',').length === 3 && x.caption === 'Our sangeet'), 'approved albums are public with all slide ids');
assert(Object.values(DRIVE.folders).some(f => f.name === '02_Posts_Albums' && f.parent === W), 'slides saved in 02_Posts_Albums');
call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: W });
assert(!call('getGallery', { g: gid }).gallery.events.some(e => /post|album/i.test(e.name)), 'posts folder is never an event');
assert(call('getGallery', { g: gid }).gallery.guestGate === 'open', 'demo: open by default');
DB.Settings.push(['guestGate', 'on', '']); assert(call('getGallery', { g: gid }).gallery.guestGate === 'on', 'Settings › guestGate = on switches guest checks on');
// health no longer shows Settings to everyone
{ const h = call('health', {}); assert(typeof h.version === 'string' && h.version.length > 0 && !h.settings, 'public health check shows status + version only'); }
// secure ids: right length, only the friendly letters, no repeats
{ const ids = new Set(); let good = true; for (let i = 0; i < 300; i++) { const k = call('guestJoin', { g: gid, name: 'Test ' + i, phone: '98' + String(10000000 + i), device: 'devjoin' + i }).guestKey; if (!k || !/^[a-km-z2-9]{24}$/.test(k)) good = false; ids.add(k); }
  assert(good && ids.size === 300, 'guest keys: 24 safe random letters, all different'); }
// sign-ups per phone are limited
{ let n = 0; for (let i = 0; i < 8; i++) if (call('guestJoin', { g: gid, name: 'Spam', phone: '9811111111', device: 'devSPAM01' }).ok) n++; assert(n === 5, 'guest sign-ups: 5 per phone per hour'); }
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
