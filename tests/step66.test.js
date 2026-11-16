// Step 66: editing offers — Human touch (₹8, 4 days), AI + Human (₹7, 48 h), AI (₹3, 24 h, a style profile).
// The first request of a sign-up account may take 150 photos free (AI or AI + Human) with permission to use the edits to
// improve PicGrades' own editing; paid requests may give that permission or not. Prices and profiles come from Settings.
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
DB.Settings.push(['adminNotifyEmail', 'team@picgrades.com', 'test']);
const W = 'EDITOFFERSFOLDER00066'; DRIVE.folders[W] = { name: 'Raw', access: 'ANYONE_WITH_LINK' };
const REF = 'https://instagram.com/somestudio', link = 'https://drive.google.com/drive/folders/' + W, later = d => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
call('signUp', { email: 'zoya@example.com', name: 'Zoya', kind: 'couple' });
const tok = call('verifyCode', { email: 'zoya@example.com', code: codeOf('zoya@example.com') }).token;
const E = () => DB.Enquiries, col = k => DB.Enquiries[0].indexOf(k), rowOf = id => E().slice(1).find(x => x[col('enqId')] === id);

let o = call('editOffers', { token: tok });
assert(o.human.price === 8 && o.aihuman.price === 7 && o.ai.price === 3, 'prices: Human ₹8, AI + Human ₹7, AI ₹3');
assert(o.human.hours === 96 && o.aihuman.hours === 48 && o.ai.hours === 24, 'delivery: 4 days, 48 hours, 24 hours');
assert(o.profiles.length >= 2 && o.freeLeft === 150, 'AI style profiles, and 150 free photos left');

// AI needs a profile; 24 h earliest
assert(/style profile/.test(call('editingEnquiry', { token: tok, kind: 'ai', photos: 100, folderUrl: link }).error), 'AI needs a style profile');
// free sample needs permission
let r = call('editingEnquiry', { token: tok, kind: 'aihuman', photos: 400, folderUrl: link, reference: REF });
assert(!r.ok && /permission/.test(r.error), 'the free sample needs the permission box');
r = call('editingEnquiry', { token: tok, kind: 'aihuman', photos: 400, folderUrl: link, reference: REF, consent: true, notes: 'Soft pastel tones', wantBy: later(3) });
assert(r.free === 150 && r.total === 1750, 'AI + Human, 400 photos: first 150 free → (400 − 150) × ₹7 = ₹1,750 (got ' + r.total + ')');
const row = rowOf(r.enqId);
assert(row[col('kind')] === 'aihuman' && row[col('consent')] === 'yes' && row[col('freePhotos')] === 150 && row[col('pricePer')] === 7, 'saved: kind, permission yes, 150 free, ₹7 a photo');
assert(mail.some(m => m.to === 'team@picgrades.com' && /Editing request: AI \+ Human, 400 photos/.test(m.subject) && /use these edits to improve its editing: <b>yes/.test(JSON.stringify(m))), 'PicGrades sees the choice and the permission');
assert(call('editOffers', { token: tok }).freeLeft === 0, 'the free sample is used once');

// paid AI request, permission optional
r = call('editingEnquiry', { token: tok, kind: 'ai', profile: o.profiles[0], photos: 200, folderUrl: link, wantBy: later(2) });
assert(r.free === 0 && r.total === 600 && rowOf(r.enqId)[col('consent')] === 'no', 'AI, 200 photos, no free left: 200 × ₹3 = ₹600, permission "no" is fine');
// human: 4 days
r = call('editingEnquiry', { token: tok, kind: 'human', photos: 50, folderUrl: link, reference: REF, wantBy: later(2) });
assert(!r.ok && /Human touch takes 4 days/.test(r.error), 'Human touch: not sooner than 4 days');
r = call('editingEnquiry', { token: tok, kind: 'human', photos: 50, folderUrl: link, reference: REF, wantBy: later(5), consent: 'yes' });
assert(r.total === 400 && r.free === 0, 'Human touch, 50 photos: ₹400 (no free sample for Human touch)');

// After AI: ₹3, 48 hours, needs a style reference, no free sample
assert(o.afterai && o.afterai.price === 3 && o.afterai.hours === 48 && !o.afterai.free, 'After AI: ₹3 a photo, 48 hours');
r = call('editingEnquiry', { token: tok, kind: 'afterai', photos: 300, folderUrl: link });
assert(!r.ok && /style reference/.test(r.error), 'After AI (and Human, AI + Human) needs a style reference');
r = call('editingEnquiry', { token: tok, kind: 'afterai', photos: 300, folderUrl: link, reference: REF, aiTool: 'Imagen', wantBy: later(3) });
assert(r.total === 900 && rowOf(r.enqId)[col('aiTool')] === 'Imagen' && rowOf(r.enqId)[col('reference')] === REF, 'After AI, 300 photos: ₹900; the AI they used and the reference are saved');
assert(mail.some(m => /Editing request: After AI, 300 photos/.test(m.subject) && /AI they used: Imagen/.test(JSON.stringify(m)) && /Style reference/.test(JSON.stringify(m))), 'PicGrades sees the AI they used and the reference');
assert(call('editingEnquiry', { token: tok, kind: 'ai', profile: o.profiles[0], photos: 10, folderUrl: link }).enqId, 'AI alone needs no reference (it uses a profile)');

// a new account: free sample, but it can choose to pay for all
call('signUp', { email: 'ira@example.com', name: 'Ira', kind: 'photographer', studio: 'Ira Studio' });
const tok2 = call('verifyCode', { email: 'ira@example.com', code: codeOf('ira@example.com') }).token;
r = call('editingEnquiry', { token: tok2, kind: 'ai', profile: o.profiles[1], photos: 100, folderUrl: link, useFree: 'no' });
assert(r.free === 0 && r.total === 300 && call('editOffers', { token: tok2 }).freeLeft === 150, 'choosing to pay for all keeps the free sample for later');

// prices from Settings
DB.Settings.push(['editPriceAI', '2.5', 'test']);
assert(call('editOffers', { token: tok2 }).ai.price === 2.5, 'prices can be changed in Settings');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
