// Step 5: face reading storage, Find me data, send to client.
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'WEDDINGFOLDER5555555555';
DRIVE.folders[W] = { name: 'Riya_Karan', access: 'ANYONE_WITH_LINK' };
DRIVE.folders.f5R = { name: '00_Root_Moment', parent: W }; DRIVE.folders.f5W = { name: 'Wedding', parent: W };
['P1', 'P2'].forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: 'f5R', mime: 'image/jpeg' });
['P2b', 'P3', 'P4'].forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: 'f5W', mime: 'image/jpeg' });
const client = login('team@35mmcandids.com'), admin = login('adcmediaa@gmail.com'), other = login('mithil@sandboxstudios.in');
const ord = call('me', { token: client }).orders.find(o => /completed/i.test(o.status));
const pub = call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: W, title: 'Riya & Karan' });
const gid = pub.galleryId;
assert(pub.ok && pub.photoCount === 5, 'gallery published (5 photos)');
let r = call('facesStatus', { token: admin, g: gid });
assert(r.ok && r.photos.length === 5 && r.gallery.status === '' && r.photos[0].set === 'Root Moment', 'status: 5 photos to read, not started');
assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(r.gallery.dueAt) || r.gallery.dueAt === '', 'due time given when order has a completed time');
assert(!call('facesStatus', { token: other, g: gid }).ok, 'another studio cannot open face reading');
assert(call('facesStatus', { token: client, g: gid }).ok, 'the order\'s own studio can open face reading');
assert(!call('getGallery', { g: gid }).gallery.faceSearch, 'Find me is off before faces are read');
assert(!call('getFaces', { g: gid }).ok, 'faces not public before ready');
const d = Buffer.from(Array.from({ length: 128 }, (_, i) => (i * 7) % 256)).toString('base64');
const face = (x) => [[x, 100, 120, 160], d];
r = call('saveFaces', { token: admin, g: gid, pass: 1, photos: { P1: { w: 1600, h: 1067, f: [face(100), face(500)] }, P2: { w: 1067, h: 1600, f: [] } } });
assert(r.ok && r.status === 'Reading' && r.faceCount === 2 && r.photosRead === 2 && r.photosTotal === 5, 'batch 1 saved: Reading, 2 faces, 2/5 photos');
assert(!call('saveFaces', { token: admin, g: gid, pass: 1, photos: { ZZZ: { w: 1, h: 1, f: [] } } }).ok, 'photo outside gallery rejected');
assert(!call('saveFaces', { token: admin, g: gid, pass: 1, photos: { P3: { w: 10, h: 10, f: [[[1, 2, 3], 'x']] } } }).ok, 'broken face data rejected');
r = call('saveFaces', { token: admin, g: gid, pass: 1, photos: { P2b: { w: 1600, h: 1067, f: [face(10)] }, P3: { w: 1600, h: 1067, f: [] } }, done: true });
assert(r.ok && r.status === 'Reading', 'done=true but a photo still unread → stays Reading');
r = call('saveFaces', { token: admin, g: gid, pass: 1, photos: { P4: { w: 1600, h: 1067, f: [face(300)] } } });
r = call('facesStatus', { token: admin, g: gid });
assert(Object.keys(r.faces.pass).length === 5 && r.faces.photos.P1.f.length === 2, 'resume data: all 5 read in pass 1, faces returned');
r = call('saveFaces', { token: admin, g: gid, pass: 2, photos: { P1: { w: 1600, h: 1067, f: [face(100), face(500), face(800)] } }, done: true });
assert(r.ok && r.status === 'Ready' && r.faceCount === 5, 'pass 2 adds a face; Ready with 5 faces');
assert(call('facesStatus', { token: admin, g: gid }).faces.pass.P1 === 2, 'pass recorded as 2');
let g = call('getGallery', { g: gid }).gallery;
assert(g.faceSearch === true, 'Find me switched on when Ready');
r = call('getFaces', { g: gid });
assert(r.ok && r.faces.scale === 250 && r.faces.photos.P1.f.length === 3 && !r.faces.pass, 'public faces for Find me (no internal fields)');
// proxy
r = call('facesProxy', { token: admin, g: gid, ids: ['P1', 'NOPE', 'P3'] });
assert(r.ok && /^data:image\/jpeg;base64,/.test(r.images.P1) && !r.images.NOPE && r.images.P3, 'photo proxy returns only gallery photos');
assert(!call('facesProxy', { token: other, g: gid, ids: ['P1'] }).ok, 'proxy blocked for other studio');
// refresh with a new photo → Needs update, Find me still on
DRIVE.files.P5 = { name: 'P5.jpg', parent: 'f5W', mime: 'image/jpeg' };
call('setGallery', { token: admin, orderId: ord.orderId, folderUrl: W });
r = call('facesStatus', { token: admin, g: gid });
assert(r.gallery.status === 'Needs update' && r.photos.length === 6, 'new photo after refresh → Needs update');
assert(call('getGallery', { g: gid }).gallery.faceSearch === true, 'Find me still works while update is pending');
// reel maker photo proxy (public, rate-limited)
r = call('photoData', { g: gid, device: 'dev-reel-0001', ids: ['P1', 'NOPE', 'P3', 'P4', 'P2'] });
assert(r.ok && Object.keys(r.images).length === 3 && r.images.P1 && !r.images.NOPE && !r.images.P2, 'photoData: gallery photos only, max 4 asked');
assert(!call('photoData', { g: gid, ids: ['P1'] }).ok, 'photoData needs a device id');
let lim = null; for (let i = 0; i < 60 && !lim; i++) { const x = call('photoData', { g: gid, device: 'dev-reel-0002', ids: ['P1', 'P3', 'P4', 'P1'] }); if (!x.ok) lim = x; }
assert(lim && /Too many/.test(lim.error), 'photoData limited per device per hour');
// send
assert(!call('sendGallery', { token: admin, g: gid, to: 'not-an-email' }).ok, 'bad email rejected');
const before = mail.length;
r = call('sendGallery', { token: admin, g: gid, to: 'Riya.Couple@Example.com' });
assert(r.ok && r.sentTo === 'riya.couple@example.com' && /\/g\/[a-z0-9]{12}$/.test(r.url), 'sent to client');
assert(mail.length === before + 1 && /Riya & Karan/.test(mail[mail.length - 1].subject) && mail[mail.length - 1].htmlBody.indexOf('/g/' + gid) > -1, 'client email has the gallery link');
assert(call('facesStatus', { token: admin, g: gid }).gallery.sentTo === 'riya.couple@example.com', 'sent time + email saved');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
