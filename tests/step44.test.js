// Step 44: the wedding's own Hub from the Hub editor (cards with places per screen) and where the logo sits.
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const orders = call('queue', { token: admin }).recentDone;
const W = 'HUBEDWEDDING00000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 3; i++) DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const gid = call('setGallery', { token: admin, orderId: orders[0].orderId, folderUrl: W, title: 'Asha & Dev', eventDate: '2026-03-01' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
assert(call('getGallery', { g: gid }).gallery.custom.blocks.length === 0, 'no own Hub yet');
const custom = { base: 'magazine-cover', blocks: [
  { block: 'hero', variant: 'full-bleed', pos: { phone: [0, 0, 4, 3], wide: [0, 0, 8, 5] } },
  { block: 'findme', variant: 'photo', pos: { phone: [0, 3, 2, 2], wide: [8, 0, 4, 2], tall: [6, 0, 4, 2] } },   // tall: too wide for 8 columns → dropped
  { block: 'nope', variant: 'x', pos: { phone: [0, 5, 1, 1] } },                                                    // unknown card → dropped
  { block: 'events', variant: '<script>', pos: { phone: [0, 5, 4, -1] } }                                           // bad style and size → cleaned
] };
let r = call('coupleLook', { g: gid, coupleKey: ck, custom: JSON.stringify(custom), layout: 'custom', pages: JSON.stringify({ header: 'left' }) });
assert(r.ok && r.layout === 'custom' && r.pages.header === 'left', 'the couple publishes their own Hub, logo on the left');
const c = r.custom;
assert(c.blocks.length === 3 && c.base === 'magazine-cover', 'unknown cards dropped (3 kept)');
assert(JSON.stringify(c.blocks[1].pos) === JSON.stringify({ phone: [0, 3, 2, 2], wide: [8, 0, 4, 2] }), 'a place that does not fit the screen is dropped');
assert(c.blocks[2].variant === '' && JSON.stringify(c.blocks[2].pos) === '{}', 'a bad style and a bad size are cleaned');
const g = call('getGallery', { g: gid }).gallery;
assert(g.layout === 'custom' && g.custom.blocks.length === 3 && g.pages.header === 'left', 'every guest gets the own Hub');
assert(!call('coupleLook', { g: gid, coupleKey: ck, custom: JSON.stringify({ blocks: [] }) }).ok, 'an empty Hub cannot be published');
assert(call('myRole', { token: admin, g: gid }).custom.blocks.length === 3, 'the Control Panel sees it');
assert(+(call('health', {}).version.match(/^step(\d+)/) || [0, 0])[1] >= 44, 'backend version is step44 or later');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 44 checks passed');
