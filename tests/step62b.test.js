// Step 62b: a new wedding starts as a Draft. Guests can't open it; the couple, the photographer and PicGrades can.
// Any of them can Publish (and Unpublish). A wedding that was already live stays live when it is saved again.
const { call, mail, DRIVE } = require('./gas_mock');
global.__autoPublish = false;
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'DRAFTPUBLISH00000062';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
['D1', 'D2', 'D3'].forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: W + 'w', mime: 'image/jpeg' });
const admin = login('adcmediaa@gmail.com');
const orderId = call('queue', { token: admin }).recentDone[0].orderId;
const made = call('setGallery', { token: admin, orderId, folderUrl: W, title: 'Riya & Arjun' });
const gid = made.galleryId;
assert(made.status === 'Draft', 'a new wedding starts as a Draft: ' + made.status);

let r = call('getGallery', { g: gid });
assert(!r.ok && r.draft && /being prepared/.test(r.error) && r.title === 'Riya & Arjun', 'guest link on a Draft → friendly "being prepared" answer with the title');
assert(!r.events && !r.photos, 'a Draft shows guests no photos');
assert(!call('likePhoto', { g: gid, photoId: 'D1', device: 'devdraft01' }).ok, 'guests can\'t like photos in a Draft');

const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
r = call('getGallery', { g: gid, coupleKey: ck });
assert(r.gallery && r.gallery.status === 'Draft', 'the couple link opens the Draft (status Draft)');
r = call('getGallery', { g: gid, token: admin });
assert(r.gallery && r.gallery.status === 'Draft', 'PicGrades / photographer opens the Draft with their sign-in');
assert(call('getGallery', { g: gid, coupleKey: 'wrongkey000000000000' }).draft, 'a wrong couple key is treated as a guest');

r = call('publishGallery', { g: gid });
assert(!r.ok && /Only the couple/.test(r.error), 'a guest can\'t publish');
assert(call('getGallery', { g: gid }).draft, 'still a Draft after the refused publish');

r = call('publishGallery', { g: gid, coupleKey: ck, publish: true });
assert(r.ok !== false && r.status === 'Published', 'the couple publishes');
r = call('getGallery', { g: gid });
assert(r.gallery && !r.draft && r.gallery.status === 'Published', 'now guests can open it');
r = call('likePhoto', { g: gid, photoId: 'D1', device: 'devdraft01' }); assert(r.ok !== false, 'guests can like photos once it is live ' + JSON.stringify(r));

r = call('setGallery', { token: admin, orderId, folderUrl: W, title: 'Riya & Arjun' });
assert(r.status === 'Published', 'saving the wedding again keeps it live');

r = call('publishGallery', { g: gid, token: admin, publish: false });
assert(r.status === 'Draft', 'PicGrades can unpublish (back to Draft)');
assert(call('getGallery', { g: gid }).draft, 'guests are stopped again');
r = call('publishGallery', { g: gid, token: admin, publish: 'true' });
assert(r.status === 'Published', 'and publish again');

let order = call('queue', { token: admin }).recentDone.find(o => o.orderId === orderId);
assert(order && order.galleryStatus === 'Published', 'admin page shows the wedding as live: ' + (order && order.galleryStatus));
call('publishGallery', { g: gid, token: admin, publish: false });
order = call('queue', { token: admin }).recentDone.find(o => o.orderId === orderId);
assert(order && order.galleryStatus === 'Draft', 'and as Draft after unpublish');

console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
