// Step 113 (Deepak, 28 Nov): inside a wedding, PicGrades staff see only their own saved layouts (and the ones meant for
// that wedding or for everyone) — not another couple's private layouts, which can hold that other wedding's photos.
// Outside a wedding (no g), staff still see everything, as before (step 77).
global.__autoOpen = false;
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com'); let N = 0;
function wedding(W, title) {
  DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
  for (let i = 0; i < 4; i++) DRIVE.files[W.slice(-4) + 'P' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
  const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[N++].orderId, folderUrl: W, title }).galleryId;
  return { gid, ck: call('facesStatus', { token: admin, g: gid }).gallery.coupleKey };
}
const A = wedding('FIXPASSSTEP113AAAAA1', 'Anika & Rohan'), B = wedding('FIXPASSSTEP113BBBBB2', 'Meera & Kabir');
const doc = { name: 'x', sections: [] };
const bPrivate = call('canvasSave', { g: B.gid, coupleKey: B.ck, item: { kind: 'layout', name: 'B private', scope: 'me', doc } });
const bWedding = call('canvasSave', { g: B.gid, coupleKey: B.ck, item: { kind: 'layout', name: 'B wedding copy', scope: 'wedding', doc } });
const mine = call('canvasSave', { token: admin, g: A.gid, item: { kind: 'layout', name: 'Staff test', scope: 'me', doc } });
const forAll = call('canvasSave', { token: admin, g: A.gid, item: { kind: 'layout', name: 'For everyone', scope: 'all', doc } });

const inA = call('canvasList', { token: admin, g: A.gid }).layouts, ids = inA.map(x => x.id);
assert(ids.includes(mine.id) && ids.includes(forAll.id), 'staff in wedding A: their own layouts and the ones for everyone');
assert(!ids.includes(bPrivate.id), 'staff in wedding A: not another couple\'s private layout');
assert(!ids.includes(bWedding.id), 'staff in wedding A: not wedding B\'s copy (step 104)');
assert(inA.find(x => x.id === mine.id).mine && !inA.find(x => x.id === forAll.id).collection, 'their own layout is marked as theirs');
assert(call('canvasList', { token: admin }).layouts.some(x => x.id === bPrivate.id), 'outside a wedding, staff still see everything (step 77)');
// remove = for good
assert(call('canvasDelete', { token: admin, g: A.gid, id: mine.id }).ok && !call('canvasList', { token: admin, g: A.gid }).layouts.some(x => x.id === mine.id), 'staff remove their test layout');
assert(call('canvasDelete', { token: admin, g: A.gid, id: bPrivate.id }).ok === true, 'staff may still remove any layout (unchanged)');
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
