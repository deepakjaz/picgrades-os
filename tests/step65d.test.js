// Step 65d: after the 30-day trial a sign-up wedding becomes the free basic gallery (a year from when it was made):
// Find me, Reel Edits, Post Edits and guest moments lock — and the server refuses them, not only the buttons.
// Emails: 7 days before the end and on the day. Order-based weddings are never touched.
global.__autoOpen = false;
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
const codeOf = email => { const m = mail.slice().reverse().find(x => x.to === email && /code: (\d{6})/.test(x.subject)); return m && /code: (\d{6})/.exec(m.subject)[1]; };
const W = 'TRIALENDWEDDING00065D'; DRIVE.folders[W] = { name: 'T', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files['TE' + i] = { name: i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
DB.Settings.push(['supportEmail', 'hello@picgrades.com', 'test']);
call('signUp', { email: 'tara@example.com', name: 'Tara', kind: 'couple' });
const tok = call('verifyCode', { email: 'tara@example.com', code: codeOf('tara@example.com') }).token;
const w = call('createWedding', { token: tok, folderUrl: W, title: 'Tara & Dev' }), gid = w.galleryId;
const hd = DB.Galleries[0], row = () => DB.Galleries.slice(1).find(g => g[hd.indexOf('galleryId')] === gid);
const ck = call('facesStatus', { token: tok, g: gid }).gallery.coupleKey;
const setEnds = days => { const d = new Date(Date.now() + days * 86400000); row()[hd.indexOf('trialEnds')] = d.toISOString().slice(0, 19).replace('T', ' '); };
const feats = () => call('getGallery', { g: gid, coupleKey: ck }).gallery.features;

let g = call('getGallery', { g: gid, coupleKey: ck }).gallery;
assert(g.plan && g.plan.plan === 'trial' && g.plan.daysLeft === 30 && /mailto:hello@picgrades.com/.test(g.plan.upgrade), 'during the trial: plan "trial", 30 days left, upgrade link');
assert(!call('getGallery', { g: gid }).gallery || !call('getGallery', { g: gid }).gallery.plan, 'guests never see the plan');
assert(['findme', 'reel', 'post', 'upload'].every(k => feats()[k] === 'on'), 'everything is on during the trial');

// 7 days left → one warning email, only once
const nightly = () => { call('health', {}); return global.__nightly(); };   // a fresh run, like the real nightly job (no table cache from earlier calls)
setEnds(6.5); let n = mail.length; nightly();
assert(mail.slice(n).some(m => m.to === 'tara@example.com' && /7 days left in your free trial: Tara & Dev/.test(m.subject)), '7 days before the end: a warning email');
n = mail.length; nightly();
assert(!mail.slice(n).some(m => /free trial/.test(m.subject)), 'the warning is sent only once');

// the trial ends
setEnds(-0.1); n = mail.length; nightly();
assert(mail.slice(n).some(m => m.to === 'tara@example.com' && /Your free trial has ended: Tara & Dev/.test(m.subject) && /stay free until/.test(m.html || m.body || JSON.stringify(m))), 'on the day: "Your free trial has ended" (what stays free, and until when)');
n = mail.length; nightly();
assert(!mail.slice(n).some(m => /free trial/.test(m.subject)), 'the ended email is sent only once');
g = call('getGallery', { g: gid, coupleKey: ck }).gallery;
assert(g.plan.plan === 'basic' && g.plan.daysLeft === 0 && /^\d{4}-\d{2}-\d{2}/.test(g.plan.basicEnds), 'now the free basic gallery, until ' + g.plan.basicEnds);
const f = feats();
assert(['findme', 'reel', 'post', 'upload'].every(k => f[k] === 'locked') && ['notes', 'hearts', 'download', 'share', 'install'].every(k => f[k] === 'on'), 'Find me, Reel, Post and guest moments lock; notes, hearts, downloads… stay');
call('setFeatures', { token: tok, g: gid, features: JSON.stringify({ findme: 'on' }) });
assert(feats().findme === 'locked', 'the couple cannot switch a locked function back on');

// the server refuses, not only the buttons
call('publishGallery', { g: gid, coupleKey: ck, publish: true }); row()[hd.indexOf('facesStatus')] = 'Ready';
const j = call('guestJoin', { g: gid, name: 'Guest', phone: '9811111111', device: 'devtrial01' });
const gb = { g: gid, device: 'devtrial01', guestId: j.guestId, guestKey: j.guestKey };
let r = call('findFaces', Object.assign({ d: 'x' }, gb));
assert(!r.ok && /Find me is not on/.test(r.error), 'a guest asking for Find me directly is refused: ' + r.error);
r = call('uploadMoment', Object.assign({ mime: 'image/jpeg', base64: 'AAAA' }, gb));
assert(!r.ok && /not on for this wedding/.test(r.error), 'a guest uploading a moment directly is refused');
const card = call('myWeddings', { token: tok }).weddings[0];
assert(card.plan === 'basic' && card.basicEnds && card.upgrade, 'the dashboard card knows it is the basic gallery');

// an order-based wedding is never touched
const adminTok = (() => { call('requestCode', { email: 'adcmediaa@gmail.com' }); return call('verifyCode', { email: 'adcmediaa@gmail.com', code: codeOf('adcmediaa@gmail.com') }).token; })();
const W2 = 'ORDERWEDDINGNOTRIAL65'; DRIVE.folders[W2] = { name: 'O', access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W2 + 'h'] = { name: 'Haldi', parent: W2 }; DRIVE.files.OW1 = { name: '1.jpg', parent: W2 + 'h', mime: 'image/jpeg' };
const o = call('setGallery', { token: adminTok, orderId: call('queue', { token: adminTok }).recentDone[0].orderId, folderUrl: W2, title: 'Order wedding' });
const og = call('getGallery', { g: o.galleryId, token: adminTok }).gallery;
assert(!og.plan && og.features.findme === 'on', 'a wedding from an editing order has no trial and keeps every function');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
