// Step 36: page styles saved per wedding (event page: collage / mosaic / grid), by the couple or the photographer.
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const orders = call('queue', { token: admin }).recentDone;
const W = 'PAGESWEDDING00000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 3; i++) DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const gid = call('setGallery', { token: admin, orderId: orders[0].orderId, folderUrl: W, title: 'Asha & Dev', eventDate: '2026-03-01' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
assert(JSON.stringify(call('getGallery', { g: gid }).gallery.pages) === '{}', 'a new wedding has no page styles (the app uses its defaults)');
let r = call('coupleLook', { g: gid, coupleKey: ck, pages: JSON.stringify({ event: 'mosaic', nope: 'x' }) });
assert(r.ok && r.pages.event === 'mosaic' && !('nope' in r.pages), 'couple picks the mosaic event page (unknown pages dropped)');
r = call('coupleLook', { g: gid, coupleKey: ck, pages: { event: 'banana' } });
assert(r.pages.event === 'mosaic', 'an unknown style changes nothing');
r = call('setLook', { token: admin, g: gid, pages: JSON.stringify({ event: 'grid' }), theme: 'jaipur-rose' });
assert(r.pages.event === 'grid' && r.theme === 'jaipur-rose', 'PicGrades changes it (last change wins), together with the theme');
const g = call('getGallery', { g: gid }).gallery;
assert(g.pages.event === 'grid' && g.theme === 'jaipur-rose' && g.layout === '', 'guests get the page style; layout untouched');
assert(call('myRole', { token: admin, g: gid }).pages.event === 'grid', 'the Control Panel sees the saved style');
r = call('coupleLook', { g: gid, coupleKey: ck, pages: JSON.stringify({ events: 'shapes' }) });
assert(r.pages.events === 'shapes' && r.pages.event === 'grid', 'Events page style saved (step 37) without touching the event page style');
assert(!('events' in call('coupleLook', { g: gid, coupleKey: ck, pages: { events: 'nope' } }).pages) === false, 'an unknown Events style keeps the saved one');
r = call('coupleLook', { g: gid, coupleKey: ck, pages: JSON.stringify({ viewer: 'classic' }) });
assert(r.pages.viewer === 'classic' && r.pages.events === 'shapes', 'photo view style saved (step 38), others kept');
assert(+(call('health', {}).version.match(/^step(\d+)/) || [0, 0])[1] >= 36, 'backend version is step36 or later');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 36 checks passed');
