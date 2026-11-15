// Step 65b: sign up yourself. A couple or a photographer makes an account (no editing package, so editing orders stay closed),
// signs in with the email code, and makes a wedding gallery from a Drive folder: a Draft, 30-day trial, at most 500 photos,
// the functions they ticked. The wedding has no editing order ('W' id), so billing and credits never see it.
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
const W = 'SELFSIGNUPWEDDING065B'; DRIVE.folders[W] = { name: 'Riya_Arjun_Wedding', access: 'ANYONE_WITH_LINK' };
['Haldi', 'Sangeet'].forEach((ev, k) => { DRIVE.folders[W + k] = { name: ev, parent: W }; for (let i = 0; i < 5; i++) DRIVE.files['SU' + k + i] = { name: ev + i + '.jpg', parent: W + k, mime: 'image/jpeg' }; });
const BIG = 'SELFSIGNUPBIGFOLDER65'; DRIVE.folders[BIG] = { name: 'Big', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[BIG + 'e'] = { name: 'Wedding', parent: BIG };
for (let i = 0; i < 501; i++) DRIVE.files['BG' + i] = { name: i + '.jpg', parent: BIG + 'e', mime: 'image/jpeg' };

// 1. sign up as a couple
const ordersBefore = DB.Orders.length, companiesBefore = DB.Companies.length;
let r = call('signUp', { email: 'Riya.Shah@Example.com', name: 'Riya Shah', kind: 'couple', phone: '98765 43210' });
assert(r.sent && /6-digit code/.test(r.message), 'sign up → the usual "code is on its way" answer');
const cu = DB.Users[0], urow = DB.Users.slice(1).find(u => u[0] === 'riya.shah@example.com');
assert(urow && urow[cu.indexOf('role')] === 'client' && urow[cu.indexOf('profession')] === 'couple' && urow[cu.indexOf('status')] === 'Active', 'a user is made (client, couple, active)');
const cc = DB.Companies[0], crow = DB.Companies.slice(1).find(c => c[cc.indexOf('adminEmail')] === 'riya.shah@example.com');
assert(crow && crow[cc.indexOf('companyName')] === 'Riya Shah' && crow[cc.indexOf('packageType')] === '' && /^C\d{3,}$/.test(crow[cc.indexOf('companyId')]), 'an account is made with NO editing package: ' + crow[cc.indexOf('companyId')]);
assert(mail.some(m => /New sign-up: Riya Shah \(couple\)/.test(m.subject)), 'PicGrades is emailed about the sign-up');
const tok = call('verifyCode', { email: 'riya.shah@example.com', code: codeOf('riya.shah@example.com') }).token;
assert(tok, 'she signs in with the email code');
const me = call('me', { token: tok });
assert(me.orderForm && !me.orderForm.canOrder, 'editing orders stay closed for a self-made account (no package)');
r = call('signUp', { email: 'riya.shah@example.com', name: 'Someone Else', kind: 'photographer', studio: 'XY Studio' });
assert(r.sent && DB.Users.filter(u => u[0] === 'riya.shah@example.com').length === 1, 'signing up again with the same email makes nothing new (same answer)');

// photographer, and a studio name that is taken
r = call('signUp', { email: 'studio@lens.in', name: 'Karan', kind: 'photographer', studio: 'Studio Alpha' });
const prow = DB.Companies.slice(1).find(c => c[cc.indexOf('adminEmail')] === 'studio@lens.in');
assert(prow && prow[cc.indexOf('companyName')] === 'Studio Alpha (2)', 'a studio name already used gets a number: ' + prow[cc.indexOf('companyName')]);
assert(!call('signUp', { email: 'x@y.in', name: 'K', kind: 'photographer', studio: '' }).ok, 'a photographer must give a studio name');
assert(!call('signUp', { email: 'bad', name: 'Kiran' }).ok, 'a bad email is refused');

// 2. make a wedding
r = call('createWedding', { token: tok, folderUrl: 'https://drive.google.com/drive/folders/' + W, title: 'Riya & Arjun', eventDate: '2026-12-12', functions: { findme: 'on', reel: 'off', post: 'on' } });
assert(r.galleryId && r.status === 'Draft' && r.photoCount === 10 && r.events.length === 2, 'the wedding is made as a Draft: 10 photos, 2 collections ' + JSON.stringify(r.events));
assert(r.plan === 'trial' && r.daysLeft === 30 && /^\d{4}-\d{2}-\d{2}/.test(r.trialEnds), '30-day trial: ends ' + r.trialEnds);
assert(r.features.findme === 'on' && r.features.reel === 'off' && r.features.post === 'on' && r.features.notes === 'on', 'the ticked functions are saved (reel off)');
assert(/\/c\/[a-z0-9]+\/[A-Za-z0-9_-]+$/.test(r.coupleLink) && /\/g\//.test(r.guestLink), 'couple and guest links come back');
const gh = DB.Galleries[0], grow = DB.Galleries.slice(1).find(g => g[gh.indexOf('galleryId')] === r.galleryId);
assert(/^W[A-Za-z0-9]+$/.test(grow[gh.indexOf('orderId')]) && grow[gh.indexOf('guestPhotos')] === 'findme', 'no editing order behind it (W id), guests see photos only after Find me');
assert(DB.Orders.length === ordersBefore, 'no order row was made (billing and credits never see it)');
assert(mail.some(m => /New wedding: Riya & Arjun \(10 photos\)/.test(m.subject)), 'PicGrades is emailed about the new wedding');
const gid = r.galleryId;

// 3. she manages her own wedding, nobody else's
let L = call('myWeddings', { token: tok });
assert(L.weddings.length === 1 && L.weddings[0].galleryId === gid, '"My weddings" lists it');
assert(call('facesStatus', { token: tok, g: gid }).gallery, 'she can open the faces / send page for it');
assert(call('publishGallery', { token: tok, g: gid }).status === 'Published', 'she can publish it');
assert(call('setGallery', { token: tok, orderId: grow[gh.indexOf('orderId')], folderUrl: W }).galleryId === gid, 'she can refresh its photos');
const ktok = call('verifyCode', { email: 'studio@lens.in', code: codeOf('studio@lens.in') }).token;
assert(!call('facesStatus', { token: ktok, g: gid }).ok, 'another account cannot open it');
assert(!call('setGallery', { token: ktok, orderId: grow[gh.indexOf('orderId')], folderUrl: W }).ok, 'another account cannot change it');
assert(call('myWeddings', { token: ktok }).weddings.length === 0, 'another account\'s "My weddings" is empty');
assert(!call('setGallery', { token: tok, orderId: 'WNOTREAL0000', folderUrl: W }).ok, 'nobody can make a W wedding through the normal save');

// 4. the 500-photo trial limit
r = call('createWedding', { token: tok, folderUrl: BIG, title: 'Too big' });
assert(!r.ok && r.tooMany && r.photoCount === 501 && /up to 500 photos/.test(r.error), 'more than 500 photos: refused with a clear message');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
