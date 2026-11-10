// Step 42: the wedding's photographer (name, Instagram, website…) and the PicGrades credit switch.
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const orders = call('queue', { token: admin }).recentDone;
const W = 'WFAWEDDING0000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 3; i++) DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const gid = call('setGallery', { token: admin, orderId: orders[0].orderId, folderUrl: W, title: 'Asha & Dev', eventDate: '2026-03-01' }).galleryId;
let g = call('getGallery', { g: gid }).gallery;
const studio = g.studio;
assert(studio && JSON.stringify(g.photographer) === '{}' && g.credit === true, 'by default: the order’s studio, PicGrades credit on');
assert(!call('setPhotographer', { g: gid, photographer: { name: 'X' } }).ok, 'not logged in = no change');
let r = call('setPhotographer', { token: admin, g: gid, photographer: JSON.stringify({ name: 'WFA', instagram: 'https://www.instagram.com/wfa.with.love?psln=dzZm', website: 'wfa.example.com', phone: '+91 98765-43210', email: 'bad', about: 'Wedding films & photographs with love.', extra: 'x' }) });
assert(r.ok && r.photographer.name === 'WFA' && r.photographer.instagram === 'wfa.with.love', 'name and Instagram handle (taken from the link)');
assert(r.photographer.website === 'https://wfa.example.com' && r.photographer.phone === '+91 98765 43210' && !r.photographer.email && !('extra' in r.photographer), 'website gets https, phone cleaned, bad email and unknown fields dropped');
g = call('getGallery', { g: gid }).gallery;
assert(g.studio === 'WFA' && g.photographer.instagram === 'wfa.with.love', 'guests see "Photographed by WFA"');
r = call('setPhotographer', { token: admin, g: gid, credit: 'off' });
assert(r.credit === false && call('getGallery', { g: gid }).gallery.credit === false, 'PicGrades hides its own name for this client');
assert(call('myRole', { token: admin, g: gid }).photographer.name === 'WFA', 'the Control Panel sees the photographer');
r = call('setPhotographer', { token: admin, g: gid, photographer: '{}', credit: 'on' });
assert(call('getGallery', { g: gid }).gallery.studio === studio && r.credit === true, 'cleared: back to the order’s studio, credit back on');
const company = DB.Galleries.slice(1).find(x => x.includes(gid))[DB.Galleries[0].indexOf('companyName')];
const own = DB.Users.slice(1).find(u => u[2] === company && u[3] === 'client');
if (own) { const pt = login(own[0]);
  assert(call('setPhotographer', { token: pt, g: gid, photographer: { name: 'WFA Studio' } }).ok, 'the wedding’s photographer edits their details');
  assert(!call('setPhotographer', { token: pt, g: gid, credit: 'off' }).ok, 'only PicGrades turns its credit off'); }
assert(call('health', {}).version === 'step42-photographer', 'backend version step42-photographer');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 42 checks passed');
