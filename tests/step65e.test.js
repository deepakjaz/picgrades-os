// Step 65e: human editing enquiry. A self-made account asks PicGrades to edit raw photos by hand (4 days, no AI);
// PicGrades is emailed, the person gets a thank-you, the admin queue lists it, staff mark it replied / closed.
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
DB.Settings.push(['adminNotifyEmail', 'team@picgrades.com', 'test']);
const W = 'EDITINGENQUIRY000065E'; DRIVE.folders[W] = { name: 'Raw', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W }; DRIVE.files.EQ1 = { name: '1.jpg', parent: W + 'h', mime: 'image/jpeg' };
call('signUp', { email: 'nina@example.com', name: 'Nina Kapoor', kind: 'couple', phone: '9800011122' });
const tok = call('verifyCode', { email: 'nina@example.com', code: codeOf('nina@example.com') }).token;
const wed = call('createWedding', { token: tok, folderUrl: W, title: 'Nina & Raj' });
const later = d => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const link = 'https://drive.google.com/drive/folders/' + W, REF = 'https://instagram.com/somestudio';

assert(!call('editingEnquiry', { token: tok, photos: 0, folderUrl: link, reference: REF }).ok, 'needs a number of photos');
assert(!call('editingEnquiry', { token: tok, photos: 300, folderUrl: 'hello', reference: REF }).ok, 'needs a Drive folder link');
let r = call('editingEnquiry', { token: tok, photos: 300, folderUrl: link, wantBy: later(2), reference: REF });
assert(!r.ok && /takes 4 days/.test(r.error), 'a date sooner than 4 days is refused: ' + r.error);
const n = mail.length;
r = call('editingEnquiry', { token: tok, photos: 300, folderUrl: link, reference: REF, wantBy: later(6), phone: '98000 11122', notes: 'Warm tones please', galleryId: wed.galleryId });
assert(r.enqId && /^E/.test(r.enqId), 'the enquiry is saved');
const sent = mail.slice(n);
assert(sent.some(m => m.to === 'team@picgrades.com' && /Editing request: Human touch, 300 photos from Nina Kapoor/.test(m.subject)), 'PicGrades is emailed');
assert(sent.some(m => m.to === 'nina@example.com' && /We got your editing request/.test(m.subject) && /edited by a person/.test(JSON.stringify(m))), 'Nina gets a thank-you (human editing, 4 days)');
const E = DB.Enquiries, h = E[0], row = E.slice(1).find(x => x[h.indexOf('enqId')] === r.enqId);
assert(row[h.indexOf('title')] === 'Nina & Raj' && row[h.indexOf('status')] === 'new' && row[h.indexOf('notes')] === 'Warm tones please', 'linked to her wedding, status "new", notes kept');

call('requestCode', { email: 'adcmediaa@gmail.com' });
const admin = call('verifyCode', { email: 'adcmediaa@gmail.com', code: codeOf('adcmediaa@gmail.com') }).token;
const q = call('queue', { token: admin });
const e = (q.enquiries || []).find(x => x.enqId === r.enqId);
assert(e && e.photos === 300 && e.phone === '98000 11122' && e.status === 'new', 'the admin queue lists it with the details');
assert(!call('enquiryStatus', { token: tok, enqId: r.enqId, status: 'replied' }).ok, 'only PicGrades can change its status');
assert(call('enquiryStatus', { token: admin, enqId: r.enqId, status: 'replied' }).status === 'replied', 'staff mark it replied');
assert(call('queue', { token: admin }).enquiries.find(x => x.enqId === r.enqId).status === 'replied', 'and the queue shows it');
// another account's wedding id is not attached
call('signUp', { email: 'om@example.com', name: 'Om', kind: 'couple' });
const tok2 = call('verifyCode', { email: 'om@example.com', code: codeOf('om@example.com') }).token;
const r2 = call('editingEnquiry', { token: tok2, photos: 50, folderUrl: link, reference: REF, galleryId: wed.galleryId });
assert(E.slice(1).find(x => x[h.indexOf('enqId')] === r2.enqId)[h.indexOf('galleryId')] === '', 'someone else\'s wedding is not attached to an enquiry');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
