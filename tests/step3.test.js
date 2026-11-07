const { call, DB, mail, advance } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const col = (tab, name) => DB[tab][0].indexOf(name);
const coRow = name => DB.Companies.find(r => r[1] === name);
const client = login('alpha@example.com');
const admin = login('adcmediaa@gmail.com');
const start = call('me', { token: client }).company;

// --- place + edit within window
let r = call('placeOrder', { token: client, order: { option: 'Human Touch', catalogName: 'Edit Me', images: 100, hours: 24, catalogLink: 'https://drive.google.com/x' } });
const id = r.order.orderId;
assert(r.order.canEdit && r.order.quotaUsed === 200, '24h order: 200 quota, editable');
let me = call('me', { token: client });
const ord = me.orders.find(o => o.orderId === id);
const hrsLeft = (new Date(ord.editUntil.replace(' ', 'T') + '+05:30') - Date.now()) / 3600000;
assert(hrsLeft > 3.9 && hrsLeft <= 4, '24h order edit window is 4 hours');
r = call('editOrder', { token: client, orderId: id, order: { option: 'Human Touch', catalogName: 'Edit Me v2', images: 100, hours: 96, catalogLink: 'https://drive.google.com/x' } });
assert(r.ok && r.order.quotaUsed === 100 && r.company.usedQuota === start.usedQuota + 100, 'edit 24h→96h returns 100 quota');
// edit window for 96h is 24h → still editable after 5h
advance(5);
assert(call('me', { token: client }).orders.find(o => o.orderId === id).canEdit, '96h order still editable after 5h');
// --- cancel
r = call('cancelOrder', { token: client, orderId: id });
assert(r.ok && r.company.usedQuota === start.usedQuota, 'cancel returns all quota');
assert(!call('cancelOrder', { token: client, orderId: id }).ok, 'cannot cancel twice (no double refund)');
assert(DB.Orders.find(x => x[0] === id)[4] === 'Cancelled', 'order row kept, status Cancelled');

// --- window expiry: 48h order editable 8h only
r = call('placeOrder', { token: client, order: { option: 'Retouching', catalogName: 'Window', images: 10, hours: 48, catalogLink: 'https://drive.google.com/x' } });
const id2 = r.order.orderId;
advance(7.9); assert(call('me', { token: client }).orders.find(o => o.orderId === id2).canEdit, '48h order editable at 7.9h');
advance(0.2); assert(!call('editOrder', { token: client, orderId: id2, order: { option: 'Retouching', catalogName: 'W', images: 5, hours: 48, catalogLink: 'https://drive.google.com/x' } }).ok, '48h order locked after 8h');
assert(!call('cancelOrder', { token: client, orderId: id2 }).ok, 'cancel also locked after window');

// --- editor starts → client can no longer edit
r = call('placeOrder', { token: client, order: { option: 'Human Touch', catalogName: 'Started', images: 10, hours: 96, catalogLink: 'https://drive.google.com/x' } });
const id3 = r.order.orderId;
assert(call('setStatus', { token: admin, orderId: id3, status: 'Editing' }).ok, 'admin sets Editing');
assert(!call('cancelOrder', { token: client, orderId: id3 }).ok, 'client cannot cancel once Editing');
assert(mail[mail.length - 1].subject.indexOf('Editing in progress') === 0, 'Editing email subject');

// --- hold by client, delivery pauses
const due0 = DB.Orders.find(x => x[0] === id3)[2];
assert(!call('holdOrder', { token: client, orderId: id3, reason: '' }).ok, 'hold needs a reason');
r = call('holdOrder', { token: client, orderId: id3, reason: 'Sending more photos' });
assert(r.ok && r.order.status === 'On Hold' && r.order.canResume, 'client puts order on hold, can resume own hold');
assert(!call('completeOrder', { token: client, orderId: id3, lrFilesLink: 'https://x' }).ok, 'client cannot complete orders');
advance(10);
r = call('resumeOrder', { token: client, orderId: id3 });
const due1 = DB.Orders.find(x => x[0] === id3)[2];
const shift = (new Date(due1.replace(' ', 'T') + '+05:30') - new Date(due0.replace(' ', 'T') + '+05:30')) / 3600000;
assert(r.ok && r.order.status === 'Editing' && Math.abs(shift - 10) < 0.01, 'resume returns to Editing, delivery moved +10h');
// admin hold, client cannot resume
call('holdOrder', { token: admin, orderId: id3, reason: 'Waiting for reference images' });
assert(!call('resumeOrder', { token: client, orderId: id3 }).ok, 'client cannot resume an admin hold');
assert(call('resumeOrder', { token: admin, orderId: id3 }).ok, 'admin resumes');
// complete
assert(!call('completeOrder', { token: admin, orderId: id3, lrFilesLink: 'not a link' }).ok, 'bad LR link rejected');
r = call('completeOrder', { token: admin, orderId: id3, lrFilesLink: 'https://drive.google.com/file/d/abc' });
assert(r.ok && r.order.status === 'Order Completed', 'editor completes order');
assert(/is complete!$/.test(mail[mail.length - 1].subject) && mail[mail.length - 1].htmlBody.indexOf('https://drive.google.com/file/d/abc') > -1, 'completion email with LR link');
assert(!call('holdOrder', { token: client, orderId: id3, reason: 'x' }).ok, 'completed order cannot be held');

// --- roles
assert(call('adminOverview', { token: client }).code === 'ROLE', 'client blocked from admin');
assert(call('queue', { token: client }).code === 'ROLE', 'client blocked from queue');
const other = login('beta@example.com');
assert(!call('cancelOrder', { token: other, orderId: id2 }).ok, 'other studio cannot touch this order');

// --- admin overview
r = call('adminOverview', { token: admin });
assert(r.ok && r.companies.length === 21 && r.months.length === 12, 'overview: 21 studios, 12 months');
const s35 = r.companies.find(c => c.companyName === 'Studio Alpha');
assert(s35.balance === coRow('Studio Alpha')[col('Companies', 'totalQuota')] - coRow('Studio Alpha')[col('Companies', 'usedQuota')], 'overview balance matches sheet');
assert(r.totals.dueINR > 0, 'total INR due: ' + r.totals.dueINR);
// --- payment: 20,000 at 5 = 4,000 images
const t0 = coRow('Studio Alpha')[col('Companies', 'totalQuota')];
r = call('recordPayment', { token: admin, companyName: 'Studio Alpha', amount: 20000, rate: 5, method: 'UPI', note: 'test' });
assert(r.ok && r.payment.imagesAdded === 4000 && coRow('Studio Alpha')[col('Companies', 'totalQuota')] === t0 + 4000, '₹20,000 at ₹5 adds 4,000 images');
assert(DB.Payments.length === 2 && mail[mail.length - 1].subject.indexOf('Payment received') === 0, 'payment logged + receipt emailed');
assert(!call('recordPayment', { token: admin, companyName: 'Studio Alpha', amount: 0, rate: 5 }).ok, 'zero payment rejected');
r = call('recordPayment', { token: admin, companyName: 'Studio Alpha', amount: 1000, rate: 3 });
assert(r.payment.imagesAdded === 333, '₹1000 at ₹3 = 333 images (rounded down)');
r = call('adjustQuota', { token: admin, companyName: 'Studio Alpha', images: -333, note: 'undo test' });
assert(r.ok && DB.Payments[DB.Payments.length - 1][5] === 'Adjustment', 'manual adjustment logged');
assert(!call('adjustQuota', { token: admin, companyName: 'Studio Alpha', images: 10, note: '' }).ok, 'adjustment needs a note');
r = call('addCredits', { token: admin, companyName: 'Studio Alpha', points: 100, title: 'Festive bonus' });
assert(r.ok && r.company.credits === start.credits + 100, 'credits added');
r = call('updateCompany', { token: admin, companyName: 'Studio Alpha', patch: { perImageRate: 5.5, totalQuota: 999999 } });
assert(r.ok && r.company.perImageRate === 5.5 && coRow('Studio Alpha')[col('Companies', 'totalQuota')] !== 999999, 'rate updated; totalQuota cannot be edited directly');
r = call('adminCompany', { token: admin, companyName: 'Studio Alpha' });
assert(r.ok && r.payments.length === 3 && r.orders.length > 0 && r.users.length >= 1, 'studio detail: payments, orders, users');
r = call('queue', { token: admin });
assert(r.ok && r.open.every(o => !/completed|cancel/i.test(o.status)), 'queue has only open orders (' + r.open.length + ')');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
