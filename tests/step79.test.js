// Step 79: photo framing is kept by the server — a template photo's place in its holder and its zoom ({ fx, fy, z }),
// a free-layout photo's zoom (s.zm) and a section background photo's zoom (bg.z). Bad values are clamped or dropped.
global.__autoOpen = false;
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'FRAMESTEP79000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 6; i++) DRIVE.files['FR79' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;

// a template version with framed photos
const tune = { kind: 'c1', photos: { s58: 'FR793' }, frame: { s58: { fx: 22.4, fy: 140, z: 9 }, e0: { fx: 50, fy: 30, z: 1.25 }, bad: { fx: 1 }, s3: 'x' } };
let r = call('coupleLook', { g: gid, coupleKey: ck, version: JSON.stringify({ id: 'tpl-c1', custom: { base: 'tpl-c1', story: tune, blocks: [] } }) });
const fr = r.versions['tpl-c1'].story.frame;
assert(JSON.stringify(fr) === '{"s58":{"fx":22,"fy":100,"z":3},"e0":{"fx":50,"fy":30,"z":1.25}}', 'template framing kept, clamped to 0–100 % and zoom 1–3, bad slots dropped: ' + JSON.stringify(fr));

// a free layout with a zoomed photo and a zoomed background
const doc = { name: 'Framed', sections: [{ id: 'hero', h: { p: 844 }, bg: { src: { k: 'id', id: 'FR792' }, fx: 40, fy: 20, z: 2.5 }, els: [
  { id: 'c', t: 'photo', p: { x: 0, y: 0, w: 390, h: 560 }, src: { k: 'id', id: 'FR794' }, s: { fx: 30, fy: 60, zm: 1.7 }, sl: { zm: 99 } }] }] };
const lay = call('canvasSave', { g: gid, coupleKey: ck, item: { kind: 'layout', name: 'Framed', scope: 'wedding', doc } });
const got = call('canvasGet', { g: gid, coupleKey: ck, id: lay.id }).doc, sec = got.sections[0], el = sec.els[0];
assert(sec.bg.z === 2.5 && sec.bg.fx === 40 && sec.bg.fy === 20, 'background photo zoom and place kept: ' + JSON.stringify(sec.bg));
assert(el.s.zm === 1.7 && el.s.fx === 30 && el.s.fy === 60, 'photo zoom and place kept: ' + JSON.stringify(el.s));
assert(el.sl.zm === 4, 'zoom is capped: ' + JSON.stringify(el.sl));
process.exit(fails ? 1 : 0);
