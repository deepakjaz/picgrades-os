// Step 110: the photographer marks a tagged person as the bride / the groom (faces page); their photos (biggest face first)
// fill the couple's spots in templates when the couple has not picked — the server keeps only photo ids.
const fs = require('fs'); const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');
const root = path.join(__dirname, '..'), FX = path.join(__dirname, 'fixtures'), files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
const unit = () => { const v = Array.from({ length: 128 }, rnd); const n = Math.hypot(...v); return v.map(x => x / n); };
const add = (a, ...parts) => a.map((x, i) => parts.reduce((s, [v, k]) => s + v[i] * k, x));
const pack = v => Buffer.from(Int8Array.from(v.map(x => Math.max(-127, Math.min(127, Math.round(x * 250))))).buffer).toString('base64');
const BRIDE = unit().map(x => x * 0.4), GROOM = add(unit().map(x => x * 0.4), [unit(), 0.1]), BRO = add(GROOM, [unit(), 0.5]);
const bSide = unit(), gSide = unit();
const box = (x) => [x, 200, 160, 180];
const photos = {}, W = 'STEP110COUPLEFACES0001';
let n = 0; const ph = (...faces) => { const id = 'FP' + String(++n).padStart(2, '0'); photos[id] = faces.map((v, k) => [box(100 + k * 300), pack(add(v, [unit(), 0.1]))]); return id; };
const brideFront = [], brideSide = [], groomFront = [], groomSide = [], bro = [];
for (let i = 0; i < 6; i++) brideFront.push(ph(BRIDE));
for (let i = 0; i < 4; i++) brideSide.push(ph(add(BRIDE, [bSide, 0.5])));     // a side pose the reader can join on its own
for (let i = 0; i < 5; i++) groomFront.push(ph(GROOM));
for (let i = 0; i < 3; i++) groomSide.push(ph(add(GROOM, [gSide, 0.72])));    // too different: needs joining by hand
for (let i = 0; i < 3; i++) bro.push(ph(BRO, GROOM));                         // the brother, always next to the groom
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
Object.keys(photos).forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: W + 'w', mime: 'image/jpeg' });
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan' }).galleryId;
const sf = {}; Object.keys(photos).forEach(id => sf[id] = { w: 1600, h: 1000, f: photos[id] });
call('saveFaces', { token: admin, g: gid, pass: 1, photos: sf, done: true });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const bk = id => (photos[id] || []).map((_, k) => id + ':' + k);
const bride = brideFront.concat(brideSide).map(id => id + ':0'), groom = groomFront.map(id => id + ':0').concat(bro.map(id => id + ':1'));
let r = call('savePeople', { token: admin, g: gid, people: [{ id: 'pbr1', name: '', role: 'bride', faces: bride }, { id: 'pgr1', name: 'Rohan', role: 'groom', faces: groom }, { id: 'px1', name: 'Bro', role: 'king', faces: bro.map(id => id + ':0') }] });
ok(r.people && r.people[0].role === 'bride' && r.people[1].role === 'groom' && !r.people[2].role, 'roles are kept: bride, groom; an unknown role is dropped');
let g = call('getGallery', { g: gid }).gallery;
ok(g.couplePhotos.bride.length === bride.length && g.couplePhotos.groom.length === groom.length, 'every wedding page gets the bride\'s and the groom\'s photos (ids only)');
ok(g.couplePhotos.both.length === 0, 'no photo has both of them yet');
r = call('savePeople', { token: admin, g: gid, people: [{ id: 'pbr1', role: 'bride', faces: bride }, { id: 'pbr2', role: 'bride', faces: [groomSide[0] + ':0'] }] });
ok(r.people.filter(p => p.role === 'bride').length === 1 && r.people[1].role === 'bride', 'only one bride: the latest one keeps the mark');
ok(call('savePeople', { g: gid, people: [{ id: 'pbr1', role: 'bride', faces: bride }] }).ok === false, 'a guest cannot mark anyone');
const page = JSON.stringify(call('getGallery', { g: gid }).gallery);
ok(!/"name":"Rohan"/.test(page) && !/"role":"groom"/.test(page), 'no names or roles reach the wedding page');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all ok');
