// Step 63a: Wedding Highlights — 10–15 public photos of the whole wedding, saved with the story picks.
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'WEDDINGHIGHLIGHTS63A0';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
const ids = []; for (let i = 0; i < 20; i++) { const id = 'WH' + String(i).padStart(2, '0'); ids.push(id); DRIVE.files[id] = { name: id + '.jpg', parent: W + 'h', mime: 'image/jpeg' }; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'T' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;

let r = call('storyPicks', { g: gid, coupleKey: ck, picks: { wh: ['WH01', 'WH02', 'NOTHERE000', 'WH01'], cover: ['WH03'], hl: { Haldi: ['WH04'] } } });
assert(JSON.stringify(r.story.wh) === '["WH01","WH02"]', 'couple saves Wedding Highlights; photos not in the wedding and repeats are dropped: ' + JSON.stringify(r.story.wh));
assert(r.story.cover[0] === 'WH03' && r.story.hl.Haldi[0] === 'WH04', 'cover and event highlights are kept beside it');
r = call('storyPicks', { g: gid, token: admin, picks: { wh: ids } });
assert(r.story.wh.length === 15, 'at most 15 Wedding Highlights: ' + r.story.wh.length);
r = call('getGallery', { g: gid });
assert(r.gallery.story && r.gallery.story.wh.length === 15, 'the gallery sends the Wedding Highlights');
assert(!call('storyPicks', { g: gid, picks: { wh: ['WH05'] } }).ok, 'guests can\'t choose highlights');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
