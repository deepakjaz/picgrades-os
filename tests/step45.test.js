// Step 45: Find me once per guest (name + mobile first), guest downloads by request, the couple approves, the guest gets an email link.
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'FINDONCEWEDDING000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: W + 'w', mime: 'image/jpeg' });
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Mira & Kabir' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const face = (v, k) => { const b = Buffer.alloc(128); for (let i = 0; i < 128; i++) b[i] = (v + i * (k || 3)) % 100; return [[0.1, 0.1, 0.2, 0.2], b.toString('base64')]; };
call('saveFaces', { token: admin, g: gid, pass: 1, photos: { Q1: { w: 100, h: 100, f: [face(500)] }, Q2: { w: 100, h: 100, f: [face(10, 1)] }, Q3: { w: 100, h: 100, f: [face(500), face(10, 1)] }, Q4: { w: 100, h: 100, f: [face(500)] }, Q5: { w: 100, h: 100, f: [face(10, 1)] } }  /* step 60: a guest needs 3 matching photos */, done: true });
assert(call('getGallery', { g: gid }).gallery.faceSearch, 'Find me is ready');
const me = face(500)[1];
// guests must say who they are first
let r = call('findFaces', { g: gid, d: me, device: 'devonce0001' });
assert(!r.ok && /name and phone/.test(r.error), 'Find me without name + mobile is refused: ' + r.error);
const neha = call('guestJoin', { g: gid, name: 'Neha', phone: '98765 43210', device: 'devonce0001' });
assert(neha.ok && !neha.found, 'Neha signs in (no earlier search)');
r = call('findFaces', { g: gid, d: me, device: 'devonce0001', guestId: neha.guestId, guestKey: neha.guestKey });
assert(r.ok && r.sure.includes('Q1') && r.sure.includes('Q3') && !r.again, 'first search finds her photos');
r = call('findFaces', { g: gid, d: face(10, 1)[1], device: 'devonce0001', guestId: neha.guestId, guestKey: neha.guestKey });
assert(r.ok && r.again && r.sure.includes('Q1') && !r.sure.includes('Q2'), 'a second search (even with another face) gives back her own result only');
// same number in an incognito window
const again = call('guestJoin', { g: gid, name: 'Neha S', phone: '+91 9876543210', device: 'devonce0002' });
assert(again.ok && again.found && again.found.sure.includes('Q1'), 'the same number on a new phone gets her photos back, no new search');
r = call('findFaces', { g: gid, d: face(10, 1)[1], device: 'devonce0002', guestId: again.guestId, guestKey: again.guestKey });
assert(r.again && !r.sure.includes('Q2'), 'and cannot search for someone else');
assert(call('myFind', { g: gid, guestId: again.guestId, guestKey: again.guestKey }).found.sure.length === 3, 'myFind restores the result');
// a guest with no match may try again (a bad selfie is not their one search)
const ravi = call('guestJoin', { g: gid, name: 'Ravi', phone: '9000000001', device: 'devonce0003' });
r = call('findFaces', { g: gid, d: face(77, 7)[1], device: 'devonce0003', guestId: ravi.guestId, guestKey: ravi.guestKey });
assert(r.ok && !r.sure.length && !r.maybe.length, 'Ravi: no match');
r = call('findFaces', { g: gid, d: face(10, 1)[1], device: 'devonce0003', guestId: ravi.guestId, guestKey: ravi.guestKey });
assert(r.ok && !r.again && r.sure.includes('Q2'), 'after no match he can try again and is found');
// the couple and the photographer search freely
assert(call('findFaces', { g: gid, d: me, device: 'devonce0004', coupleKey: ck }).sure.length === 3 && call('findFaces', { g: gid, d: face(10, 1)[1], device: 'devonce0004', coupleKey: ck }).sure.includes('Q2'), 'the couple searches as often as they like');
assert(call('findFaces', { g: gid, d: me, device: 'devonce0005', token: admin }).ok, 'PicGrades too');
// download requests
const gb = { guestId: neha.guestId, guestKey: neha.guestKey };
assert(!call('askDownload', Object.assign({ g: gid, ids: ['Q2'], email: 'nope' }, gb)).ok, 'a valid email is needed');
assert(!call('askDownload', { g: gid, ids: ['Q2'], email: 'neha@example.com' }).ok, 'a guest must have signed in');
r = call('askDownload', Object.assign({ g: gid, ids: ['Q2', 'NOTHERE', 'Q2'], email: 'Neha@Example.com' }, gb));
assert(r.ok && r.count === 1, 'Neha asks for Q2 (unknown and repeated photos dropped)');
assert(!call('dlRequests', { g: gid }).ok && !call('dlRequests', Object.assign({ g: gid }, gb)).ok, 'guests cannot see the requests');
let q = call('dlRequests', { g: gid, coupleKey: ck });
assert(q.ok && q.waiting.length === 1 && q.waiting[0].email === 'neha@example.com' && q.waiting[0].ids[0] === 'Q2', 'the couple sees the request');
assert(call('dlRequests', { g: gid, token: admin }).waiting.length === 1, 'the photographer / PicGrades see it too');
assert(!call('dlDecide', Object.assign({ g: gid, reqId: q.waiting[0].reqId, decision: 'approve' }, gb)).ok, 'a guest cannot approve');
const before = mail.length;
r = call('dlDecide', { g: gid, coupleKey: ck, reqId: q.waiting[0].reqId, decision: 'approve' });
assert(r.ok && r.status === 'approved', 'the couple approves');
const em = mail.slice(before).find(m => m.to === 'neha@example.com');
assert(em && /Mira &(amp;)? Kabir/.test(em.subject), 'Neha gets an email: ' + (em && em.subject));
const grant = em && (/\?dl=([A-Za-z0-9]+)/.exec(em.htmlBody || em.body || JSON.stringify(em)) || [])[1];
assert(grant, 'the email holds the download link');
r = call('dlGrant', { g: gid, grant });
assert(r.ok && r.ids.join() === 'Q2', 'the link lets her download Q2');
assert(!call('dlGrant', { g: gid, grant: 'wrongwrongwrong' }).ok, 'a made-up link does nothing');
// a declined request
const r2 = call('askDownload', Object.assign({ g: gid, ids: ['Q2'], email: 'neha@example.com' }, gb));
call('dlDecide', { g: gid, token: admin, reqId: r2.reqId, decision: 'decline' });
q = call('dlRequests', { g: gid, coupleKey: ck });
assert(!q.waiting.length && q.decided.length === 2 && q.decided.some(x => x.status === 'declined'), 'declined requests move to the decided list');
assert(+(call('health', {}).version.match(/^step(\d+)/) || [0, 0])[1] >= 45, 'backend version is step45 or later');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 45 checks passed');
