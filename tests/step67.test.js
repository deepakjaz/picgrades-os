// Step 67: every wedding has its own address (couple's names first: anika-rohan.picgrades.in); after paying, a couple can use
// their own domain and a photographer one domain for all weddings (studio.com/anika-rohan). Bought domains are in the
// customer's name; the price is the domain's + ₹100 a year. Photographers also get Culling (₹0.80), Culling + Colour
// Correction (₹0.70 culling + the editing they choose) and Retouching (₹120 for any 3 fixes, +₹40 each extra, heavy = 2).
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
DB.Settings.push(['adminNotifyEmail', 'team@picgrades.com', 'test']);
const F = 'DOMAINFOLDER0000067'; DRIVE.folders[F] = { name: 'Wedding', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[F + 'e'] = { name: 'Haldi', parent: F };
for (let i = 0; i < 4; i++) DRIVE.files['DM' + i] = { name: 'h' + i + '.jpg', parent: F + 'e', mime: 'image/jpeg' };
const link = 'https://drive.google.com/drive/folders/' + F, REF = 'https://instagram.com/look';
const login = (email, kind, studio) => { call('signUp', { email, name: email.split('@')[0], kind, studio }); return call('verifyCode', { email, code: codeOf(email) }).token; };

// ---- addresses ----
const tc = login('anika@example.com', 'couple');
let w = call('createWedding', { token: tc, title: 'Anika & Rohan', folderUrl: link });
assert(w.slug === 'anika-rohan' && w.address === 'https://anika-rohan.picgrades.in', 'the address uses the couple’s names first (got ' + w.address + ')');
let w2 = call('createWedding', { token: tc, title: 'Anika weds Rohan', folderUrl: link });
assert(w2.slug === 'anika-rohan-2', 'a second wedding with the same names gets -2');
assert(call('resolveHost', { host: 'anika-rohan.picgrades.in' }).galleryId === w.galleryId, 'anika-rohan.picgrades.in opens that wedding');
assert(call('resolveHost', { host: 'picgrades.in' }).home, 'picgrades.in itself goes home');
assert(call('resolveHost', { host: 'nobody.picgrades.in' }).ok === false, 'an unknown address says it is not set up');
assert(/already taken/.test(call('setAddress', { token: tc, g: w2.galleryId, slug: 'anika-rohan' }).error), 'an address can’t be taken twice');
assert(/small letters/.test(call('setAddress', { token: tc, g: w2.galleryId, slug: 'Anika Rohan!' }).error), 'the address must be small letters and dashes');
assert(call('setAddress', { token: tc, g: w2.galleryId, slug: 'anika-rohan-reception' }).address === 'https://anika-rohan-reception.picgrades.in', 'the couple can change it');
const other = login('x@example.com', 'couple');
assert(call('setAddress', { token: other, g: w.galleryId, slug: 'hijack-this' }).ok === false, 'someone else can’t change it');

assert(!w.addressLive && call('getGallery', { g: w2.galleryId, coupleKey: w2.coupleLink.split('/').pop() }).gallery.address === '', 'until *.picgrades.in is switched on, guests share the PicGrades link');
DB.Settings.push(['addressesLive', 'on', 'wildcard ready']);
assert(call('getGallery', { g: w2.galleryId, coupleKey: w2.coupleLink.split('/').pop() }).gallery.address === 'https://anika-rohan-reception.picgrades.in', 'once switched on, guests share the wedding’s own address');
// ---- own domain: only after paying ----
let r = call('domainRequest', { token: tc, g: w.galleryId, host: 'anikaandrohan.com', mode: 'own' });
assert(!r.ok && /paid plan/.test(r.error) && r.upgrade, 'own domain on the free trial: “comes with the paid plan”, with an upgrade link');
const staff = DB.Users.slice(1).find(u => /admin/i.test(u[DB.Users[0].indexOf('role')]));
const ta = staff ? call('verifyCode', { email: staff[0], code: (call('requestCode', { email: staff[0] }), codeOf(staff[0])) }).token : null;
assert(ta && call('setPlan', { token: ta, g: w.galleryId, plan: 'paid' }).paid, 'PicGrades marks the wedding paid');
r = call('domainRequest', { token: tc, g: w.galleryId, host: 'https://www.AnikaAndRohan.com/', mode: 'own', phone: '98765 43210' });
assert(r.host === 'anikaandrohan.com' && r.records.length === 2 && r.records[0].type === 'A' && r.records[1].name === 'www', 'they have a domain: we show the A and www records (got ' + JSON.stringify(r.records) + ')');
assert(mail.some(m => m.to === 'team@picgrades.com' && /Domain request: anikaandrohan.com \(they have it\)/.test(m.subject)), 'PicGrades is told');
assert(/already asked/.test(call('domainRequest', { token: tc, g: w.galleryId, host: 'anikaandrohan.com' }).error), 'the same domain can’t be asked twice');
assert(call('resolveHost', { host: 'anikaandrohan.com' }).ok === false, 'not live yet: it does not open');
let q = call('queue', { token: ta });
const d1 = q.domains.find(x => x.host === 'anikaandrohan.com');
assert(d1 && d1.status === 'requested', 'the request is on the admin page');
assert(call('domainStatus', { token: tc, domainId: d1.domainId, status: 'live' }).ok === false, 'only PicGrades can mark it live');
call('domainStatus', { token: ta, domainId: d1.domainId, status: 'live', expires: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10), renewal: 1200 });
assert(call('resolveHost', { host: 'www.anikaandrohan.com' }).galleryId === w.galleryId, 'live: www.anikaandrohan.com opens the wedding');
assert(mail.some(m => m.to === 'anika@example.com' && /is live: anikaandrohan.com/.test(m.subject)), 'the couple is told it is live');
assert(call('getGallery', { g: w.galleryId, coupleKey: w.coupleLink.split('/').pop() }).gallery.address === 'https://anikaandrohan.com', 'with their own domain live, guests share anikaandrohan.com');
const card = call('myWeddings', { token: tc }).weddings.find(x => x.galleryId === w.galleryId);
assert(card.paid && card.domain && card.domain.host === 'anikaandrohan.com' && card.domain.status === 'live' && card.domainFee === 100, 'the wedding card shows the domain, paid, and the ₹100 fee');

// renewal reminder (expires in 20 days → the 30-day reminder, once)
const nightly = () => { call('health', {}); return global.__nightly(); };
let n = mail.length; nightly();
const rem = mail.slice(n).filter(m => /anikaandrohan.com expires in/.test(m.subject));
assert(rem.length === 2 && rem.some(m => m.to === 'anika@example.com') && /Renewal: ₹1,200 \+ ₹100/.test(JSON.stringify(rem[0])), 'renewal reminder to the couple and PicGrades, with the renewal price');
n = mail.length; nightly();
assert(!mail.slice(n).some(m => /expires in/.test(m.subject)), 'the reminder is sent once');
// buy for them (subdomain host gets a CNAME)
r = call('domainRequest', { token: tc, g: w.galleryId, host: 'shaadi.anikaandrohan.in', mode: 'buy' });
assert(/already asked/.test(r.error || '') || r.domainId, 'buy mode accepted');

// ---- photographer: one domain for all weddings ----
const tp = login('ravi@example.com', 'photographer', 'Ravi Studio');
const pw = call('createWedding', { token: tp, title: 'Meera and Kabir', folderUrl: link });
assert(/paid plan/.test(call('domainRequest', { token: tp, studio: true, host: 'ravistudio.com' }).error), 'photographer on trial: paid plan first');
call('setPlan', { token: ta, g: pw.galleryId, plan: 'paid' });
r = call('domainRequest', { token: tp, studio: true, host: 'ravistudio.com', mode: 'buy' });
assert(r.domainId && r.records.length === 0, 'photographer asks us to buy ravistudio.com');
assert(mail.some(m => m.to === 'ravi@example.com' && /registered in <b>your name<\/b>/.test(JSON.stringify(m)) && /₹100 a year/.test(JSON.stringify(m))), 'buying: registered in their name, domain price + ₹100 a year');
const d2 = call('queue', { token: ta }).domains.find(x => x.host === 'ravistudio.com');
call('domainStatus', { token: ta, domainId: d2.domainId, status: 'live', price: 900 });
assert(call('resolveHost', { host: 'ravistudio.com', path: '/meera-kabir' }).galleryId === pw.galleryId, 'ravistudio.com/meera-kabir opens that wedding');
assert(call('resolveHost', { host: 'ravistudio.com', path: '/anika-rohan' }).ok === false, 'another studio’s wedding does not open there');

// ---- photographer extras ----
let o = call('editOffers', { token: tc });
assert(!o.cull && !o.retouch && !o.photographer, 'couples don’t see culling or retouching');
assert(/for photographers/.test(call('editingEnquiry', { token: tc, kind: 'cull', photos: 100, folderUrl: link }).error), 'couples can’t ask for culling');
o = call('editOffers', { token: tp });
assert(o.photographer && o.cull.price === 0.8 && o.cullcc.price === 0.7 && o.retouch.price === 120 && o.retouch.extraFix === 40, 'photographers: Culling ₹0.80, combo ₹0.70, Retouching ₹120 (+₹40)');
r = call('editingEnquiry', { token: tp, kind: 'cull', photos: 1000, folderUrl: link });
assert(r.total === 800 && r.free === 0, 'Culling 1,000 photos × ₹0.80 = ₹800 (got ' + r.total + ')');
assert(/keep and edit/.test(call('editingEnquiry', { token: tp, kind: 'cullcc', editKind: 'aihuman', photos: 1000, folderUrl: link, reference: REF }).error), 'combo asks how many to keep');
r = call('editingEnquiry', { token: tp, kind: 'cullcc', editKind: 'aihuman', keep: 400, photos: 1000, folderUrl: link, reference: REF, notes: 'Warm' });
assert(r.total === 3500, 'combo: 1,000 × ₹0.70 + 400 kept × ₹7 = ₹3,500 (got ' + r.total + ')');
const E = DB.Enquiries, col = k => E[0].indexOf(k), row = E.slice(1).find(x => x[col('enqId')] === r.enqId);
assert(row[col('editKind')] === 'aihuman' && row[col('keep')] === 400, 'saved: the editing chosen and photos to keep');
assert(/Choose what to retouch/.test(call('editingEnquiry', { token: tp, kind: 'retouch', photos: 10, folderUrl: link }).error), 'retouching needs the fixes');
r = call('editingEnquiry', { token: tp, kind: 'retouch', photos: 10, folderUrl: link, fixes: ['acne', 'spots', 'teeth'] });
assert(r.total === 1200, 'retouching 3 fixes: 10 × ₹120 = ₹1,200 (got ' + r.total + ')');
r = call('editingEnquiry', { token: tp, kind: 'retouch', photos: 10, folderUrl: link, fixes: ['acne', 'spots', 'teeth', 'body'] });
assert(r.total === 2000, 'acne, spots, teeth + body shaping (heavy = 2): ₹120 + 2 × ₹40 = ₹200 × 10 = ₹2,000 (got ' + r.total + ')');
DB.Settings.push(['retouchPrice', '99', 'offer season']);
assert(call('editOffers', { token: tp }).retouch.price === 99, 'prices change in Settings (offer season)');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
