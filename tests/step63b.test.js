// Step 63b: no photos without Find me. A new wedding is set to 'findme': a guest's phone receives only the Wedding Highlights
// (+ the Hub's cover photos) until Find me finds them; then each event's highlights and their own photos. A found guest can ask
// for all photos of one event; the couple approves. Old weddings stay open. The couple / photographer can switch it.
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'FINDMEGATE00000063B00';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W }; DRIVE.folders[W + 's'] = { name: 'Sangeet', parent: W };
for (let i = 0; i < 10; i++) { DRIVE.files['GH' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' }; DRIVE.files['GS' + i] = { name: 's' + i + '.jpg', parent: W + 's', mime: 'image/jpeg' }; }
const admin = login('adcmediaa@gmail.com');
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'T' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
const row = () => { const t = DB.Galleries, hd = t[0]; return { hd, r: t.slice(1).find(r => r[hd.indexOf('galleryId')] === gid) }; };
call('storyPicks', { g: gid, coupleKey: ck, picks: { wh: ['GH0', 'GS0'], cover: ['GS9'], hl: { Haldi: ['GH1', 'GH2'], Sangeet: ['GS1'] } } });
const ids = gal => { const o = new Set(); (gal.events || []).forEach(e => e.photos.forEach(p => o.add(p.id))); (gal.root || []).forEach(p => o.add(p.id)); (gal.pool || []).forEach(p => o.add(p.id)); (gal.highlights || []).forEach(p => o.add(p.id)); return [...o].sort(); };

let g = call('getGallery', { g: gid }).gallery;
assert(g.guestPhotos === 'findme', 'a new wedding is set to "only after Find me"');
assert(g.gated && !g.found, 'a guest is gated and not found');
assert(JSON.stringify(g.highlights.map(p => p.id)) === '["GH0","GS0"]', 'guest gets the Wedding Highlights');
assert(g.events.length === 2 && g.events.every(e => e.photos.length === 0 && e.locked), 'events are listed, with no photos, locked');
assert(g.events.find(e => e.name === 'Haldi').teaser[0].id === 'GH0', 'an event\'s cover is its own Wedding Highlight');
assert(JSON.stringify(ids(g)) === '["GH0","GS0","GS9"]', 'the phone receives only highlights + cover photos: ' + JSON.stringify(ids(g)));
const all = call('getGallery', { g: gid, coupleKey: ck }).gallery;
assert(!all.gated && all.events.find(e => e.name === 'Haldi').photos.length === 10, 'the couple gets everything');
assert(!call('getGallery', { g: gid, token: admin }).gallery.gated, 'staff get everything');

// the photo relay refuses photos the guest may not see
const join = call('guestJoin', { g: gid, name: 'Ravi', phone: '9876543210', device: 'devgate001' });
const gb = { guestId: join.guestId, guestKey: join.guestKey };
let pd = call('photoData', Object.assign({ g: gid, device: 'devgate001', ids: ['GH5', 'GH0'] }, gb));
assert(pd.images && !('GH5' in pd.images), 'photo relay: no event photo for a guest who has not done Find me');

// found guest (as if Find me found them in GH5, GH6, GH7)
DB.FindMe = DB.FindMe || [];
call('dlRequests', { g: gid, coupleKey: ck });   // makes sure the tabs exist
const fmHd = DB.FindMe[0];
const fmRow = fmHd.map(k => ({ at: '2026-11-15', galleryId: gid, phone: "'9876543210", guestId: join.guestId, name: 'Ravi', sure: 'GH5,GH6,GH7', maybe: '', status: 'ok' })[k] || '');
DB.FindMe.push(fmRow);
g = call('getGallery', Object.assign({ g: gid }, gb)).gallery;
assert(g.found, 'after Find me the guest is found');
assert(JSON.stringify(g.events.find(e => e.name === 'Haldi').photos.map(p => p.id)) === '["GH1","GH2"]', 'found guest: Haldi shows its highlights');
assert(['GH5', 'GH6', 'GH7'].every(id => g.pool.some(p => p.id === id)), 'found guest: their own photos are on the phone');
assert(!ids(g).includes('GH8'), 'found guest: other Haldi photos are not sent');
const mine = call('myFind', Object.assign({ g: gid }, gb));
assert(mine.found.items && mine.found.items.length === 3, 'Find me again sends the photo details too');

// asking for more
assert(!call('askAccess', Object.assign({ g: gid, email: 'x@y.com', event: 'Nowhere' }, gb)).ok, 'unknown event refused');
let r = call('askAccess', Object.assign({ g: gid, email: 'ravi@mail.com', event: 'Haldi' }, gb));
assert(r.reqId && /^mo_/.test(r.reqId), 'found guest asks for all Haldi photos');
assert(call('askAccess', Object.assign({ g: gid, email: 'ravi@mail.com', event: 'Haldi' }, gb)).already, 'asking twice gives the same request');
const req = call('dlRequests', { g: gid, coupleKey: ck }).waiting.find(x => x.reqId === r.reqId);
assert(req && req.kind === 'more' && req.event === 'Haldi', 'the couple sees "more · Haldi" in Requests');
call('dlDecide', { g: gid, coupleKey: ck, reqId: r.reqId, decision: 'approve' });
assert(/All Haldi photos/.test(mail[mail.length - 1].subject), 'the guest gets an email');
g = call('getGallery', Object.assign({ g: gid }, gb)).gallery;
assert(g.events.find(e => e.name === 'Haldi').photos.length === 10 && g.events.find(e => e.name === 'Haldi').full, 'approved: all Haldi photos open for this guest');
assert(g.events.find(e => e.name === 'Sangeet').photos.length === 1, 'Sangeet still shows only its highlights');
pd = call('photoData', Object.assign({ g: gid, device: 'devgate001', ids: ['GH8'] }, gb));
assert(pd.images && 'GH8' in pd.images, 'photo relay now allows Haldi photos');

// a guest who has not registered can't ask
const join2 = call('guestJoin', { g: gid, name: 'Sita', phone: '9876500000', device: 'devgate002' });
assert(!call('askAccess', { g: gid, email: 's@y.com', event: 'Haldi', guestId: join2.guestId, guestKey: join2.guestKey }).ok, 'a guest not found yet cannot ask for more');

// the switch
assert(!call('guestPhotos', { g: gid, mode: 'open' }).ok, 'guests cannot change it');
assert(call('guestPhotos', { g: gid, coupleKey: ck, mode: 'open' }).guestPhotos === 'open', 'the couple switches to open');
g = call('getGallery', { g: gid }).gallery;
assert(!g.gated && g.events.find(e => e.name === 'Haldi').photos.length === 10, 'open: guests see every photo again');
call('guestPhotos', { g: gid, token: admin, mode: 'findme' });
assert(call('getGallery', { g: gid }).gallery.gated, 'staff switch it back');

// an older wedding (empty column) stays open
const { hd, r: gr } = row(); gr[hd.indexOf('guestPhotos')] = '';
g = call('getGallery', { g: gid }).gallery;
assert(!g.gated && g.guestPhotos === 'open', 'a wedding from before stays open');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
