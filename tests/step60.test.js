// Step 60: strict Find me for guests. Very close faces only (0.42), one clear person (not two look-alikes), at least 3 photos;
// 1–2 photos = a close match: nothing shown, the guest leaves an email, the couple approves, the guest gets the photos.
// The couple and the photographer keep the old rules (with "Maybe you").
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
// real-looking face codes: 128 numbers, distances set exactly
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
const unit = () => { const v = Array.from({ length: 128 }, rnd); const n = Math.hypot(...v); return v.map(x => x / n); };
const orth = (v, ...others) => { let w = v.slice(); others.forEach(o => { const d = w.reduce((s, x, i) => s + x * o[i], 0); w = w.map((x, i) => x - d * o[i]); }); const n = Math.hypot(...w); return w.map(x => x / n); };
const add = (a, ...parts) => a.map((x, i) => parts.reduce((s, [v, k]) => s + v[i] * k, x));
const pack = v => Buffer.from(Int8Array.from(v.map(x => Math.max(-127, Math.min(127, Math.round(x * 250))))).buffer).toString('base64');
const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const base = unit().map(x => x * 0.9), u1 = unit(), u2 = orth(unit(), u1), u3 = orth(unit(), u1, u2), u4 = orth(unit(), u1, u2, u3);
const PRIYA = base, GROOM = add(base, [u1, 0.9]), BROTHER = add(GROOM, [u2, 0.45]);   // the brother's selfie is 0.45 from the groom
const twinA = add(base, [u3, 1.2]), twinB = add(twinA, [u4, 0.6]), mixed = add(twinA, [u4, 0.287], [u2, 0.249]);    // 0.38 from A, 0.40 from B
const NIKHIL = add(base, [u4, 1.5]);
const face = v => [[0.1, 0.1, 0.2, 0.2], pack(v)];
const near = (v, d, dir) => add(v, [dir || u3, d]);
const W = 'STRICTFINDME00000060';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
const photos = {
  P1: [near(PRIYA, 0.25)], P2: [near(PRIYA, 0.3, u2)], P3: [near(PRIYA, 0.28, u4)],                 // Priya: 3 photos
  G1: [GROOM], G2: [near(GROOM, 0.1, u3)], G3: [near(GROOM, 0.12, u4)], G4: [near(GROOM, 0.1, u1)], // the groom: 4 photos
  A1: [near(twinA, 0.05, u1)], A2: [near(twinA, 0.06, u2)], A3: [near(twinA, 0.05, u3)],          // look-alike A
  B1: [near(twinB, 0.05, u1)], B2: [near(twinB, 0.06, u2)], B3: [near(twinB, 0.05, u3)],          // look-alike B
  N1: [near(NIKHIL, 0.3, u1)], N2: [near(NIKHIL, 0.32, u2)],                                         // Nikhil: only 2 photos
};
Object.keys(photos).forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: W + 'w', mime: 'image/jpeg' });
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const sf = {}; Object.keys(photos).forEach(id => sf[id] = { w: 100, h: 100, f: photos[id].map(face) });
call('saveFaces', { token: admin, g: gid, pass: 1, photos: sf, done: true });
console.log('distances: brother→groom', dist(BROTHER, GROOM).toFixed(2), '· mixed→A', dist(mixed, twinA).toFixed(2), 'mixed→B', dist(mixed, twinB).toFixed(2), 'A→B', dist(twinA, twinB).toFixed(2));
let n = 0; const guest = name => { n++; const r = call('guestJoin', { g: gid, name, phone: '90000000' + String(n).padStart(2, '0'), device: 'devstrict' + n }); return { g: gid, device: 'devstrict' + n, guestId: r.guestId, guestKey: r.guestKey }; };
const find = (who, v) => call('findFaces', Object.assign({ d: pack(v) }, who));

const priya = guest('Priya'); let r = find(priya, near(PRIYA, 0.05, u1));
assert(r.ok && r.sure.length === 3 && !r.maybe.length && !r.close, 'Priya: 3 very close photos → let in: ' + r.sure.join());
const bro = guest('Brother'); r = find(bro, BROTHER);
assert(r.ok && !r.sure.length && !r.maybe.length && !r.close, 'the groom\'s brother (0.45 from the groom) is NOT let in, and sees no "maybe"');
const mix = guest('Look-alike'); r = find(mix, mixed);
assert(r.ok && r.unclear && !r.sure.length, 'a selfie close to two different people is rejected as unclear');
const nik = guest('Nikhil'); r = find(nik, near(NIKHIL, 0.05, u3));
assert(r.ok && r.close && !r.sure.length && !r.maybe.length && r.need === 3, 'Nikhil: only 2 photos → a close match, no photos shown');
assert(!call('askAccess', Object.assign({ email: 'bad' }, nik)).ok, 'a valid email is needed');
assert(!call('askAccess', Object.assign({ email: 'pri@example.com' }, priya)).ok, 'no close match → nothing to ask');
r = call('askAccess', Object.assign({ email: 'Nikhil@Example.com', ids: ['G1', 'G2'] }, nik));
assert(r.ok && r.reqId, 'Nikhil leaves his email (photos chosen by the server, not the phone)');
assert(call('askAccess', Object.assign({ email: 'nikhil@example.com' }, nik)).already, 'asking twice does not make two requests');
let q = call('dlRequests', { g: gid, coupleKey: ck });
const req = q.waiting.find(x => x.kind === 'access');
assert(req && req.ids.sort().join() === 'N1,N2' && req.email === 'nikhil@example.com', 'the couple sees an access request with Nikhil\'s 2 photos: ' + (req && req.ids.join()));
assert(!call('myFind', nik).found, 'before approval his phone gets nothing');
const before = mail.length;
r = call('dlDecide', { g: gid, coupleKey: ck, reqId: req.reqId, decision: 'approve' });
const em = mail.slice(before).find(m => m.to === 'nikhil@example.com');
assert(r.status === 'approved' && em && /You can see your photos now/.test(JSON.stringify(em)), 'approved: Nikhil gets the "see your photos" email');
assert(call('myFind', nik).found.sure.sort().join() === 'N1,N2', 'and Find me on his number now gives his 2 photos');
const grant = (/\?dl=([A-Za-z0-9]+)/.exec(JSON.stringify(em)) || [])[1];
assert(call('dlGrant', { g: gid, grant }).ids.length === 2, 'the emailed link opens them');
// the couple keeps the old rules: the brother's selfie shows the groom as "maybe"
r = call('findFaces', { g: gid, d: pack(BROTHER), device: 'devcouple01', coupleKey: ck });
assert(r.maybe.length + r.sure.length >= 4, 'the couple searching the brother\'s selfie still sees the groom (as sure / maybe)');
// the limit is a setting
const st = DB.Settings, hd = st[0];
st.push(hd.map(c => c === 'key' ? 'findmeLimit' : c === 'value' ? '0.5' : ''));
const bro2 = guest('Brother again'); r = find(bro2, BROTHER);
assert(r.sure.length === 4, 'with findmeLimit 0.5 in Settings, the same selfie would get in (so the setting works)');
console.log(fails ? fails + ' FAILED' : 'all step 60 checks passed'); process.exit(fails ? 1 : 0);
