// Step 65a: the couple's "Found with Find me" list — face from a wedding photo (never the selfie), name, mobile, side,
// attended, photo count; the exact matched face is saved; only the couple (and PicGrades staff) can see it.
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
const W = 'FOUNDLIST0000000065A0';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
const OTHER = add(base, [u1, -1.4]);
const box = (x, y) => [x, y, 120, 140];
// photos with two people in them: Priya is the SECOND face in P1 and the FIRST in P2/P3
const photos = { P1: [[box(100, 100), pack(OTHER)], [box(600, 200), pack(near(PRIYA, 0.25))]], P2: [[box(300, 300), pack(near(PRIYA, 0.3, u2))]], P3: [[box(50, 60), pack(near(PRIYA, 0.28, u4))], [box(700, 80), pack(OTHER)]],
  N1: [[box(10, 10), pack(near(NIKHIL, 0.3, u1))]], N2: [[box(20, 20), pack(near(NIKHIL, 0.32, u2))]] };
Object.keys(photos).forEach(id => DRIVE.files[id] = { name: id + '.jpg', parent: W + 'w', mime: 'image/jpeg' });
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Riya & Arjun' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const sf = {}; Object.keys(photos).forEach(id => sf[id] = { w: 1600, h: 1000, f: photos[id] });
call('saveFaces', { token: admin, g: gid, pass: 1, photos: sf, done: true });
let n = 0; const guest = (name, extra) => { n++; const r = call('guestJoin', Object.assign({ g: gid, name, phone: '91000000' + String(n).padStart(2, '0'), device: 'devfound' + n }, extra || {})); return { g: gid, device: 'devfound' + n, guestId: r.guestId, guestKey: r.guestKey }; };
const find = (who, v) => call('findFaces', Object.assign({ d: pack(v) }, who));

const priya = guest('Priya', { side: 'bride', attended: 'yes' }); let r = find(priya, near(PRIYA, 0.05, u1));
assert(r.sure.length === 3, 'Priya is found in 3 photos');
const nik = guest('Nikhil', { side: 'groom', attended: 'yes' }); r = find(nik, near(NIKHIL, 0.05, u3));
assert(r.close, 'Nikhil is a close match (2 photos)');
guest('Asha'); // registered, never found
const fm = DB.FindMe, hd = fm[0];
const row = fm.slice(1).find(x => x[hd.indexOf('name')] === 'Priya');
assert(/^P[123]:\d$/.test(row[hd.indexOf('face')]), 'the matched face is saved: ' + row[hd.indexOf('face')]);

let L = call('foundList', { g: gid, coupleKey: ck });
assert(L.guests && L.guests.length === 2, 'the couple sees 2 guests (Asha never found, so not listed): ' + (L.guests || []).map(x => x.name));
const p = L.guests.find(x => x.name === 'Priya');
assert(p.side === 'bride' && p.attended === 'yes' && p.count === 3 && p.status === 'ok' && p.phone === '9100000001', 'Priya: side, attended, 3 photos, found, mobile ' + JSON.stringify(p).slice(0, 160));
const want = { P1: [600, 200], P2: [300, 300], P3: [50, 60] }[p.face.pid];
assert(p.face && want && p.face.box[0] === want[0] && p.face.box[1] === want[1] && p.face.w === 1600, 'her face is the right face in the photo (not the other person): ' + JSON.stringify(p.face));
assert(L.guests.find(x => x.name === 'Nikhil').status === 'close', 'Nikhil is listed as a close match');
assert(!JSON.stringify(L).includes('selfie') && !('d' in p), 'no selfie or face code is sent');

// an older find (no saved face): the face that is in all their photos
const prow = fm.slice(1).find(x => x[hd.indexOf('name')] === 'Priya'); prow[hd.indexOf('face')] = '';
L = call('foundList', { g: gid, coupleKey: ck });
const p2 = L.guests.find(x => x.name === 'Priya'), want2 = { P1: [600, 200], P2: [300, 300], P3: [50, 60] }[p2.face.pid];
assert(p2.face.box[0] === want2[0], 'older finds: her face is worked out from her photos: ' + JSON.stringify(p2.face));

// who may see it
assert(!call('foundList', { g: gid }).ok, 'guests cannot see the list');
assert(!call('foundList', Object.assign({ g: gid }, { guestId: priya.guestId, guestKey: priya.guestKey })).ok, 'a found guest cannot see it either');
const ph = call('foundList', { g: gid, token: admin });
assert(ph.guests && ph.guests.length === 2, 'PicGrades staff can see it (support)');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
