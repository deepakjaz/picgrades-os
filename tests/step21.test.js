// Step 21: photographer page backend (getStudio). Picks from 00_Portfolio, never the full wedding; couples can turn it off.
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const orders = call('queue', { token: admin }).recentDone;
function wedding(W, withPortfolio) {
  DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
  DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
  for (let i = 0; i < 12; i++) { DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' }; DRIVE.files[W + 'W' + i] = { name: 'w' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' }; }
  if (withPortfolio) { DRIVE.folders[W + 'p'] = { name: '00_Portfolio', parent: W }; for (let i = 0; i < 4; i++) DRIVE.files[W + 'P' + i] = { name: 'best' + i + '.jpg', parent: W + 'p', mime: 'image/jpeg' }; }
}
wedding('STUDIOWEDDINGA000001', true); wedding('STUDIOWEDDINGB000001', false);
const a = call('setGallery', { token: admin, orderId: orders[0].orderId, folderUrl: 'STUDIOWEDDINGA000001', title: 'Neha & Rohan', eventDate: '2026-02-14' });
const b = call('setGallery', { token: admin, orderId: orders[1].orderId, folderUrl: 'STUDIOWEDDINGB000001', title: 'Isha & Kabir', eventDate: '2026-03-01' });
assert(a.ok && b.ok, 'two weddings published');
assert(!call('getGallery', { g: a.galleryId }).gallery.events.some(e => /portfolio/i.test(e.name)), '00_Portfolio is not shown as an event in the couple\'s app');
const company = DB.Galleries.slice(1).find(r => r.includes(a.galleryId))[DB.Galleries[0].indexOf('companyName')];
DB.Studios = DB.Studios || [['slug', 'companyName', 'name', 'tagline', 'about', 'city', 'phone', 'email', 'instagram', 'website', 'galleries', 'status', 'createdAt']];
DB.Studios.push(['alpha', company, 'Studio Alpha', 'Candid weddings', 'We love real moments.', 'Mumbai', '9876543210', '', 'studioalpha', '', b.galleryId, 'Live', '']);
let r = call('getStudio', { slug: 'alpha' });
const g = r.gallery;
assert(r.ok && g.isStudio && g.title === 'Studio Alpha' && g.studioInfo.instagram === 'studioalpha', 'photographer page loads with its profile');
const A = g.events.find(e => e.name === 'Neha & Rohan'), B = g.events.find(e => e.name === 'Isha & Kabir');
assert(A && A.photos.length === 4 && A.photos.every(p => /P\d$/.test(p.id)), 'wedding with 00_Portfolio shows only those picks (' + (A && A.photos.length) + ')');
assert(B && B.photos.length > 0 && B.photos.length <= 30 && B.photos.length < 24 + 1, 'wedding without 00_Portfolio shows a few photos per event, not the full wedding (' + (B && B.photos.length) + ' of 24)');
assert(g.guestPosts.length === 2 && g.guestPosts.every(p => p.type === 'album'), 'Root Moment = one carousel per wedding');
assert(!JSON.stringify(g).includes('coupleKey') && !JSON.stringify(g).includes('folderId'), 'no couple keys or Drive folders in the page');
// couple turns it off
const col = DB.Galleries[0].indexOf('portfolio'); DB.Galleries.slice(1).find(r => r.includes(a.galleryId))[col] = 'off';
global.__clockSkip = 400000;
r = call('getStudio', { slug: 'alpha' });
assert(!r.gallery.events.some(e => e.name === 'Neha & Rohan'), 'a couple who turned it off is not shown');
// thank-you note becomes a kind word
DB.Galleries.slice(1).find(r => r.includes(b.galleryId))[DB.Galleries[0].indexOf('thanksNote')] = 'Thank you for the most beautiful photos!';
global.__clockSkip = 800000;
r = call('getStudio', { slug: 'alpha' });
assert(r.gallery.recentNotes.length === 1 && r.gallery.recentNotes[0].name === 'Isha & Kabir', 'the couple\'s thank-you note shows as a kind word');
// PicGrades' own page is made on first open
r = call('getStudio', { slug: 'picgrades' });
assert(r.ok && r.gallery.title === 'PicGrades' && DB.Studios.slice(1).some(x => x[0] === 'picgrades'), 'PicGrades page made on first open');
assert(!call('getStudio', { slug: 'nobody' }).ok, 'unknown photographer: friendly error');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
