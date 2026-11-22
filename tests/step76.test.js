// Step 76: the Template Studio templates. The backend keeps the couple's own version of each Hub layout (hubVersions),
// accepts the new story kinds (c1–c5, g1–g3) with their photos / colours / hidden parts / motion / words, cleans what is sent,
// shows the versions only to the couple and staff, and lets guests of a "Find me first" wedding see the photos chosen for the Hub.
global.__autoOpen = false;
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'TEMPLATESTEP760000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 8; i++) DRIVE.files['TH76' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;

// save a version without applying it
const tune = { kind: 'c1', photos: { s58: 'TH763', e0: 'TH765', bad: 'x', s1: '<script>' }, colors: { light: { bg: '#112233', nav: '#000000', acc: 'red' }, dark: { ink: '#fff' } }, hide: ['wax-seal', 'Bad Key!'], motion: 'off', names: 'Ani <b>& Ro', date: 'Udaipur · 14 Dec', evil: 1 };
let r = call('coupleLook', { g: gid, coupleKey: ck, version: JSON.stringify({ id: 'tpl-c1', custom: { base: 'tpl-c1', story: tune, blocks: [] } }) });
const v = r.versions && r.versions['tpl-c1'];
assert(v && v.story && v.story.kind === 'c1', 'a version of Darbar Invitation is kept');
assert(r.layout === '' && !r.custom.story, '…and nothing changes for guests yet');
assert(JSON.stringify(v.story.photos) === '{"s58":"TH763","e0":"TH765"}', 'photo slots are kept, bad slots / ids dropped: ' + JSON.stringify(v.story.photos));
assert(JSON.stringify(v.story.colors) === '{"light":{"bg":"#112233"},"dark":{"ink":"#fff"}}', 'only real colours of the allowed kinds: ' + JSON.stringify(v.story.colors));
assert(JSON.stringify(v.story.hide) === '["wax-seal"]' && v.story.motion === 'off', 'hidden parts and motion kept');
assert(v.story.names === 'Ani b& Ro' && v.story.date === 'Udaipur · 14 Dec' && !('evil' in v.story), 'words cleaned: ' + v.story.names);
assert(v.base === 'tpl-c1', 'the version knows its layout');

// guests never get the versions; the couple and staff do
assert(!call('getGallery', { g: gid }).gallery.versions, 'a guest gets no versions');
assert(!!call('getGallery', { g: gid, coupleKey: ck }).gallery.versions['tpl-c1'], 'the couple gets their versions');
assert(!!call('getGallery', { g: gid, token: admin }).gallery.versions['tpl-c1'], 'staff get them too (setLook)');

// apply it: the Hub becomes this template, the version stays
r = call('coupleLook', { g: gid, coupleKey: ck, layout: 'custom', custom: JSON.stringify({ base: 'tpl-c1', story: tune, blocks: [] }), version: JSON.stringify({ id: 'tpl-c1', custom: { base: 'tpl-c1', story: tune } }) });
assert(r.layout === 'custom' && r.custom.base === 'tpl-c1' && r.custom.story.kind === 'c1' && r.custom.story.photos.s58 === 'TH763', 'applied: the Hub is the couple\'s Darbar Invitation');

// a second layout's version, then forget one
r = call('setLook', { token: admin, g: gid, version: JSON.stringify({ id: 'tpl-g2', custom: { story: { kind: 'g2', motion: 'off' } } }) });
assert(Object.keys(r.versions).sort().join() === 'tpl-c1,tpl-g2', 'each layout keeps its own version');
r = call('coupleLook', { g: gid, coupleKey: ck, version: JSON.stringify({ id: 'tpl-g2' }) });
assert(Object.keys(r.versions).join() === 'tpl-c1', 'a version can be forgotten');
assert(call('coupleLook', { g: gid, coupleKey: ck, version: JSON.stringify({ id: 'custom', custom: { story: { kind: 'c2' } } }) }).ok === false, '"custom" is not a layout to keep a version of');
assert(call('coupleLook', { g: gid, coupleKey: ck, version: JSON.stringify({ id: 'tpl-c3', custom: { story: { kind: 'nope' } } }) }).ok === false, 'an unknown template is refused');

// the older story kinds still work as before
r = call('coupleLook', { g: gid, coupleKey: ck, version: JSON.stringify({ id: 'story-living', custom: { story: { kind: 'living', findme: 'left', photos: { s1: 'TH761' } } } }) });
assert(r.versions['story-living'].story.findme === 'left' && !r.versions['story-living'].story.photos, 'Living Story keeps its own settings only');

// a "Find me first" wedding: guests see the photos chosen for the applied template
const g0 = call('getGallery', { g: gid }).gallery;
const seen = new Set(); (g0.pool || []).forEach(p => seen.add(p.id)); (g0.highlights || []).forEach(p => seen.add(p.id)); (g0.events || []).forEach(e => (e.photos || []).forEach(p => seen.add(p.id)));
assert(g0.gated && seen.has('TH763') && seen.has('TH765'), 'a gated guest can load the template\'s chosen photos: ' + [...seen].join(','));
assert(!seen.has('TH762'), '…and still nothing else');

if (fails) { console.error(fails + ' failed'); process.exit(1); } else console.log('all ok');
