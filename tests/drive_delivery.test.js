// Per-gallery direct Drive delivery: a gallery whose folder is already shared "anyone with the link" (Galleries › delivery = 'drive')
// loads its photos straight from Google; its folder sharing is never changed; guest posts / videos (Moments) and every other gallery keep the relay.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { call, mail, DRIVE, DB } = require('./gas_mock');

// ---- two weddings: one stays on the relay, one becomes a 'drive' gallery ----
const relayRoot = 'DDRELAYFOLDER0000001', relayEvent = 'DDRELAYEVENT00000001', relayPhoto = 'DDRELAYPHOTO00000001';
const driveRoot = 'DDDRIVEFOLDER0000001', driveEvent = 'DDDRIVEEVENT00000001';
DRIVE.folders[relayRoot] = { name: 'Relay Wedding', access: 'ANYONE_WITH_LINK' };
DRIVE.folders[relayEvent] = { name: 'Sangeet', parent: relayRoot, access: 'ANYONE_WITH_LINK' };
DRIVE.files[relayPhoto] = { name: '01.jpg', parent: relayEvent, mime: 'image/jpeg', access: 'ANYONE_WITH_LINK' };
DRIVE.folders[driveRoot] = { name: 'Teaser', access: 'ANYONE_WITH_LINK' };
DRIVE.folders[driveEvent] = { name: 'Any Name At All', parent: driveRoot, access: 'ANYONE_WITH_LINK' };
const drivePhotos = [];
for (let i = 1; i <= 104; i++) { const id = 'DDDRIVEPHOTO' + String(i).padStart(8, '0'); drivePhotos.push(id); DRIVE.files[id] = { name: String(i).padStart(3, '0') + '.jpg', parent: i <= 60 ? driveEvent : driveRoot, mime: 'image/jpeg', access: 'ANYONE_WITH_LINK' }; }

function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const token = login('adcmediaa@gmail.com');
const done = call('queue', { token }).recentDone;
assert(done.length >= 2, 'fixture needs two finished orders');
const relayG = call('setGallery', { token, orderId: done[0].orderId, folderUrl: relayRoot, title: 'Relay Wedding' });
const driveG = call('setGallery', { token, orderId: done[1].orderId, folderUrl: driveRoot, title: 'Oshin & Vedant' });
assert(relayG.galleryId && driveG.galleryId, JSON.stringify([relayG, driveG]));
assert.strictEqual(driveG.photoCount, 104, 'all 104 photos read from the folder');

// The 'drive' switch: one cell on the Galleries row. Then the folder is put back to its own sharing ("anyone with the link"),
// as the real Oshin & Vedant folder is today.
const T = DB.Galleries, H = T[0];
assert(H.indexOf('delivery') >= 0, 'Galleries gets a delivery column');
T.slice(1).find(r => r[H.indexOf('galleryId')] === driveG.galleryId)[H.indexOf('delivery')] = 'drive';
[driveRoot, driveEvent].forEach(id => { DRIVE.folders[id].access = 'ANYONE_WITH_LINK'; DRIVE.folders[id].viewers = {}; });
drivePhotos.forEach(id => { DRIVE.files[id].access = 'ANYONE_WITH_LINK'; });

// A Moments guest post (photo) and a guest video on the drive gallery: these must stay on the relay.
if (!DB.GuestPosts) DB.GuestPosts = [['at', 'galleryId', 'postId', 'guestId', 'name', 'phone', 'caption', 'fileId', 'mime', 'type', 'status', 'reviewedAt']];
const GP = DB.GuestPosts, gh = GP[0], row = o => gh.map(h => o[h] === undefined ? '' : o[h]);
GP.push(row({ at: '2026-11-21 04:00', galleryId: driveG.galleryId, postId: 'pst_ddphoto01', name: 'Guest', fileId: 'DDGUESTPHOTO00000001', mime: 'image/jpeg', type: 'photo', status: 'approved' }));
GP.push(row({ at: '2026-11-21 04:01', galleryId: driveG.galleryId, postId: 'pst_ddvideo01', name: 'Guest', fileId: 'DDGUESTVIDEO00000001', mime: 'video/mp4', type: 'video', status: 'approved' }));

// ---- refresh keeps the folder's sharing exactly as it is ----
const again = call('setGallery', { token, orderId: done[1].orderId });
assert(again.galleryId === driveG.galleryId && again.photoCount === 104, JSON.stringify(again));
assert.strictEqual(DRIVE.folders[driveRoot].access, 'ANYONE_WITH_LINK', 'refresh must not make the drive folder private');
assert.strictEqual(DRIVE.folders[driveEvent].access, 'ANYONE_WITH_LINK');
drivePhotos.forEach(id => assert.strictEqual(DRIVE.files[id].access, 'ANYONE_WITH_LINK', 'refresh must not touch photo sharing'));
assert(!Object.keys(DRIVE.folders[driveRoot].viewers || {}).length, 'no new viewer added to the drive folder');
console.log('PASS refreshing a drive gallery leaves its folder sharing unchanged');

// ---- the drive gallery: all 104 photos direct, guest post + video on the relay ----
const dg = call('getGallery', { g: driveG.galleryId }).gallery;
assert.strictEqual(dg.delivery, 'drive');
const ids = [].concat(dg.root || [], ...(dg.events || []).map(e => e.photos)).map(p => p.id);
assert.strictEqual(new Set(ids).size, 104, 'gallery lists all 104 photos');
ids.forEach(id => assert.deepStrictEqual(dg.relayPhotos[id], { direct: true }, 'photo ' + id + ' is delivered direct'));
assert(!JSON.stringify(dg.events).includes('token='), 'no relay token on any drive-gallery photo');
const gp = dg.relayPhotos.DDGUESTPHOTO00000001;
assert(gp && /\/d\/DDGUESTPHOTO00000001\?g=.*&token=/.test(gp.preview), 'Moments guest photo keeps the signed relay: ' + JSON.stringify(gp));
const vid = (dg.guestPosts || []).find(p => p.type === 'video');
assert(vid && /\/stream\?g=.*&token=/.test(vid.streamUrl), 'Moments guest video keeps the relay stream');
console.log('PASS drive gallery: all 104 photos direct from Drive');
console.log('PASS Moments guest photo and video still use the relay');

// ---- the other gallery is untouched ----
const rg = call('getGallery', { g: relayG.galleryId }).gallery;
assert.strictEqual(rg.delivery, 'relay');
assert(rg.relayPhotos[relayPhoto] && /token=/.test(rg.relayPhotos[relayPhoto].preview), 'relay gallery keeps signed links');
assert.strictEqual(DRIVE.files[relayPhoto].access, 'PRIVATE', 'relay gallery stays private');
console.log('PASS other galleries keep the private relay');

// ---- reel / post makers: photo bytes ----
const pdDrive = call('photoData', { g: driveG.galleryId, device: 'device-test-0001', ids: drivePhotos.slice(0, 4) });
drivePhotos.slice(0, 4).forEach(id => assert(/^data:image\/jpeg;base64,/.test(pdDrive.images[id]), 'drive gallery photoData returns bytes'));
const pdRelay = call('photoData', { g: relayG.galleryId, device: 'device-test-0002', ids: [relayPhoto] });
assert(/token=/.test(pdRelay.images[relayPhoto]), 'relay gallery photoData keeps the relay');
console.log('PASS Reel/Post makers read drive photos through the server, relay galleries unchanged');

// ---- the browser side: pgImg turns {direct:true} into Google image links, relay records stay relay ----
const core = fs.readFileSync(path.join(__dirname, '../app/gallery/01-core.js'), 'utf8');
const pick = name => { const i = core.indexOf('function ' + name + '('); assert(i >= 0, name); let d = 0, j = core.indexOf('{', i); for (; j < core.length; j++) { if (core[j] === '{') d++; else if (core[j] === '}' && !--d) break; } return core.slice(i, j + 1); };
const ctx = { GALLERY: { relayPhotos: { A1234567890: { direct: true }, B1234567890: { thumb: 'R/t', preview: 'R/p', full: 'R/f' } } } };
vm.runInNewContext(['pgPhotoRecord', 'pgDriveImg', 'pgImg', 'pgImgFallback'].map(pick).join('\n') + '\nthis.out = [pgImg("A1234567890", 200), pgImg("A1234567890", 2048), pgImgFallback("A1234567890", 400), pgImg("B1234567890", 200), pgImg("B1234567890", 2048), pgImg("ZZ", 200)];', ctx);
assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.out)), ['https://lh3.googleusercontent.com/d/A1234567890=w200', 'https://lh3.googleusercontent.com/d/A1234567890=w2048', 'https://drive.google.com/thumbnail?id=A1234567890&sz=w400', 'R/t', 'R/f', '/photo-unavailable']);
console.log('PASS gallery page: direct photos use Google links, relay photos keep relay links');
