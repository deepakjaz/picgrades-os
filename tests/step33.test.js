// Step 33: feature switches per wedding. Couple (couple link) and photographer (own studio only) switch functions on/off;
// PicGrades' master 'allowed' locks a function so nobody else can turn it on.
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const orders = call('queue', { token: admin }).recentDone;
const W = 'SWITCHWEDDING0000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const pub = call('setGallery', { token: admin, orderId: orders[0].orderId, folderUrl: W, title: 'Neha & Rohan', eventDate: '2026-02-14' });
const gid = pub.galleryId, ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
let f = call('getGallery', { g: gid }).gallery.features;
assert(f && Object.keys(f).length === 9 && Object.values(f).every(v => v === 'on'), 'every function starts on (' + JSON.stringify(f) + ')');
assert(!call('coupleFeatures', { g: gid, coupleKey: 'nope', features: { reel: 'off' } }).ok, 'wrong couple key cannot change switches');
let r = call('coupleFeatures', { g: gid, coupleKey: ck, features: JSON.stringify({ reel: 'off', games: 'off', hacker: 'x' }) });
assert(r.features && r.features.reel === 'off' && !('games' in r.features) && !('hacker' in r.features), 'couple switches Reel Edits off; unknown names are ignored');
assert(call('getGallery', { g: gid }).gallery.features.reel === 'off', 'guests now get reel = off');
// photographer: only their own studio
const company = DB.Galleries.slice(1).find(x => x.includes(gid))[DB.Galleries[0].indexOf('companyName')];
const own = DB.Users.slice(1).find(u => u[2] === company && u[3] === 'client'), other = DB.Users.slice(1).find(u => u[2] !== company && u[3] === 'client');
if (own) { r = call('setFeatures', { token: login(own[0]), g: gid, features: { download: 'off', reel: 'on' } }); assert(r.features && r.features.download === 'off' && r.features.reel === 'on', 'the photographer (own studio) switches too'); }
else { r = call('setFeatures', { token: admin, g: gid, features: { download: 'off', reel: 'on' } }); assert(r.features && r.features.download === 'off' && r.features.reel === 'on', 'staff switch too (no client of this studio in the test data)'); }
if (other) assert(!call('setFeatures', { token: login(other[0]), g: gid, features: { download: 'on' } }).ok, 'another studio cannot touch this wedding');
assert(!call('setFeatures', { g: gid, features: { download: 'on' } }).ok, 'not logged in = no change');
// PicGrades master switch
const col = DB.Galleries[0].indexOf('allowed'); DB.Galleries.slice(1).find(x => x.includes(gid))[col] = JSON.stringify({ post: 'off' });
f = call('getGallery', { g: gid }).gallery.features;
assert(f.post === 'locked', 'a function PicGrades has not allowed shows as locked');
r = call('coupleFeatures', { g: gid, coupleKey: ck, features: { post: 'on' } });
assert(r.features.post === 'locked', 'the couple cannot switch on a locked function');
assert(+(call('health', {}).version.match(/^step(\d+)/) || [0, 0])[1] >= 33, 'backend version is step33 or later');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 33 checks passed');
