// Step 63c: the guest welcome — the Welcome photo pick (public, sent before Find me) and the guest's side + attended answer.
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'GUESTWELCOMESERVER63C';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['WC' + i] = { name: i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'T' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
let r = call('storyPicks', { g: gid, coupleKey: ck, picks: { welcome: 'WC4', wh: ['WC0'] } });
assert(r.story.welcome === 'WC4', 'the couple picks a Welcome photo');
assert(call('storyPicks', { g: gid, coupleKey: ck, picks: { welcome: 'NOTHERE' } }).story.welcome === '', 'a photo not in the wedding is refused');
call('storyPicks', { g: gid, coupleKey: ck, picks: { welcome: 'WC4', wh: ['WC0'] } });
const g = call('getGallery', { g: gid }).gallery;
assert(g.gated && g.pool.some(p => p.id === 'WC4') && !g.pool.some(p => p.id === 'WC3'), 'a guest\'s phone gets the Welcome photo (it is public), not other photos');
call('guestJoin', { g: gid, name: 'Asha', phone: '9800000001', device: 'devwel001', side: 'groom', attended: 'yes' });
call('guestJoin', { g: gid, name: 'Bina', phone: '9800000002', device: 'devwel002', side: 'aunty', attended: 'maybe' });
const gt = DB.Guests, hd = gt[0], row = n => gt.slice(1).find(x => x[hd.indexOf('name')] === n);
assert(row('Asha')[hd.indexOf('side')] === 'groom' && row('Asha')[hd.indexOf('attended')] === 'yes', 'side and attended are saved with the guest');
assert(row('Bina')[hd.indexOf('side')] === '' && row('Bina')[hd.indexOf('attended')] === '', 'unknown answers are not saved');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
