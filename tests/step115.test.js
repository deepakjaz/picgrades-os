// Step 115: Gemini's iPhone-first story templates (c1i–g3i) are real template kinds for the backend too:
// a couple's Try your photos choices (photos in s/e slots) are kept and applied, and unknown kinds stay refused.
global.__autoOpen = false;
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'GEMINIIPHONESTEP115001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['GI15' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
for (const k of ['c1i', 'c2i', 'c3i', 'c4i', 'c5i', 'g1i', 'g2i', 'g3i']) {
  const tune = { kind: k, photos: { s58: 'GI152', e0: 'GI153', bad: 'x' }, motion: 'off' };
  const r = call('coupleLook', { g: gid, coupleKey: ck, layout: 'custom', custom: JSON.stringify({ base: 'tpl-' + k, story: tune, blocks: [] }) });
  assert(r.layout === 'custom' && r.custom.story && r.custom.story.kind === k && JSON.stringify(r.custom.story.photos) === '{"s58":"GI152","e0":"GI153"}', k + ': the couple\'s photos are kept and applied');
}
const bad = call('coupleLook', { g: gid, coupleKey: ck, layout: 'custom', custom: JSON.stringify({ base: 'tpl-c9i', story: { kind: 'c9i', photos: { s1: 'GI151' } }, blocks: [] }) });
assert(!(bad.custom && bad.custom.story && bad.custom.story.kind === 'c9i'), 'an unknown kind is still refused');
console.log(fails ? fails + ' FAILED' : 'all ok'); process.exit(fails ? 1 : 0);
