// Step 99: PicGrades (admin) makes a wedding gallery for a client from a Drive link — no order from the old order system,
// no code from the client. The wedding belongs to the client, who gets an email with the links.
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const folder = (id) => { DRIVE.folders[id] = { name: id, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[id + 'w'] = { name: 'Wedding', parent: id }; for (let i = 0; i < 6; i++) DRIVE.files[id + 'p' + i] = { name: 'p' + i + '.jpg', parent: id + 'w', mime: 'image/jpeg' }; return 'https://drive.google.com/drive/folders/' + id; };
const A = folder('STEP99FOLDERA0000001'), B = folder('STEP99FOLDERB0000001');
const admin = login('adcmediaa@gmail.com');

// a client (not admin) cannot use it
call('signUp', { email: 'someone99@example.com', name: 'Some One', kind: 'couple' });
const someone = login('someone99@example.com');
ok(call('adminMakeWedding', { token: someone, email: 'x99@example.com', name: 'X', title: 'X', folderUrl: A }).ok === false, 'only an admin can make a gallery for someone else');
ok(call('adminMakeWedding', { email: 'x99@example.com', name: 'X', title: 'X', folderUrl: A }).ok === false, 'nobody signed out can');

// checks
ok(/email/.test(call('adminMakeWedding', { token: admin, email: 'nope', title: 'T', folderUrl: A }).error), 'asks for a real email');
ok(/folders/.test(call('adminMakeWedding', { token: admin, email: 'new99@example.com', name: 'Riya Shah', title: 'T', folderUrl: 'https://drive.google.com/file/d/abc' }).error), 'asks for a folder link');
ok(/name/.test(call('adminMakeWedding', { token: admin, email: 'new99@example.com', title: 'Riya & Karan', folderUrl: A }).error), 'a new email needs the client\'s name');
ok(call('adminMakeWedding', { token: admin, email: 'adcmediaa@gmail.com', title: 'T', folderUrl: A }).ok === false, 'a staff email is refused (the wedding must belong to a client)');

// a new client: account + wedding + email
const before = mail.length;
const r = call('adminMakeWedding', { token: admin, email: 'New99@Example.com', name: 'Riya Shah', title: 'Riya & Karan', eventDate: '2026-12-20', folderUrl: A });
ok(r.ok && r.galleryId && r.newAccount === true && r.photoCount === 6, 'admin makes the gallery for a new client ' + JSON.stringify({ ok: r.ok, err: r.error, n: r.photoCount }));
ok(r.plan === 'trial' && r.daysLeft === 30 && r.status === 'Draft', 'it starts as a draft with a 30-day trial');
const sent = mail.slice(before).filter(m => m.to === 'new99@example.com');
ok(sent.length === 1 && /ready/.test(sent[0].subject) && sent[0].htmlBody.indexOf(r.coupleLink) > -1, 'the client is emailed, with their private couple link');
ok(!mail.slice(before).some(m => /code: \d{6}/.test(m.subject)), 'no sign-in code is sent — the admin needs nothing from the client');

// it is the client's wedding: they see it when they sign in themselves
const client = login('new99@example.com');
const mine = call('myWeddings', { token: client }).weddings;
ok(mine.length === 1 && mine[0].galleryId === r.galleryId, 'the client sees it in their own weddings after signing in');
ok(call('myWeddings', { token: admin }).weddings.every(w => w.galleryId !== r.galleryId), 'it is not listed as the admin\'s own wedding');

// an existing client: no name needed, the new wedding joins their account
const r2 = call('adminMakeWedding', { token: admin, email: 'new99@example.com', title: 'Riya & Karan — Reception', folderUrl: B });
ok(r2.ok && r2.newAccount === false, 'an existing client needs only their email');
ok(call('myWeddings', { token: client }).weddings.length === 2, 'the second wedding joins the same client account');

// sign-up still works the same (it now shares the account-making code)
ok(call('signUp', { email: 'studio99@example.com', name: 'Asha', kind: 'photographer', studio: 'Asha Studio' }).ok !== false && !!login('studio99@example.com'), 'normal sign-up still makes an account');

process.exit(fails ? 1 : 0);
