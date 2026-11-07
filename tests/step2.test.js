const { call, DB, mail } = require('./gas_mock');
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
// login
let r = call('requestCode', { email: 'team@35mmcandids.com' });
assert(r.ok && r.sent, 'requestCode for real client');
const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
assert(call('requestCode', { email: 'nobody@x.com' }).sent && mail.length === 1, 'unknown email gets same answer, no email');
assert(call('requestCode', { email: 'jordanwixspecialist@gmail.com' }).sent && mail.length === 1, 'blocked user gets no email');
assert(!call('verifyCode', { email: 'team@35mmcandids.com', code: '000000' }).ok, 'wrong code rejected');
r = call('verifyCode', { email: 'team@35mmcandids.com', code });
assert(r.ok && r.token && r.user.companyName === '35mmcandids', 'right code logs in');
const token = r.token;
assert(!call('verifyCode', { email: 'team@35mmcandids.com', code }).ok, 'code cannot be reused');
assert(call('me', { token: 'bad' }).code === 'AUTH', 'bad token rejected');
// dashboard
r = call('me', { token });
assert(r.ok && r.company.balance === 71993 - 90304 && r.company.totalDue === 91555, 'dashboard balance -18311 and due 91555 match Wix');
assert(r.orders.length > 0 && r.orders[0].placedAt >= r.orders[r.orders.length - 1].placedAt, 'orders newest first');
assert(r.orderForm.canOrder && r.orderForm.options.length === 6, 'CUSTOM gets all 6 options');
// place order: 100 images at 48h = 150 quota
const before = r.company.usedQuota; const n0 = DB.Orders.length;
r = call('placeOrder', { token, order: { option: 'Human Touch', catalogName: 'Test Wedding', images: 100, hours: 48, catalogLink: 'https://drive.google.com/x', bwPercent: '5' } });
assert(r.ok && r.order.quotaUsed === 150 && r.company.usedQuota === before + 150, '48h order uses 1.5x quota (150)');
assert(DB.Orders.length === n0 + 1 && DB.Orders[DB.Orders.length - 1][0] === 'PG00420', 'order row appended with id PG00420');
assert(mail.slice(-2).map(m => m.to).join() === 'team@35mmcandids.com,adcmediaa@gmail.com', 'client + admin emails sent');
// culling only: no editing quota, 72h
assert(/https/.test(call('placeOrder', { token, order: { option: 'Culling', catalogName: 'Bad link', images: 10, catalogLink: 'javascript:alert(1)' } }).error), 'non-https catalog link rejected');
r = call('placeOrder', { token, order: { option: 'Culling', catalogName: 'Cull Test', images: 300, cullingImages: 1200, hours: 24, catalogLink: 'https://drive.google.com/x' } });
assert(r.ok && r.order.quotaUsed === 0 && r.order.hours === 72, 'culling-only: 0 quota, forced 72h');
assert(r.company.totalImagesCulled === 1200, 'culled count added');
// validation
assert(!call('placeOrder', { token, order: { option: 'Human Touch', catalogName: '', images: 10, catalogLink: 'https://drive.google.com/x' } }).ok, 'missing catalog name rejected');
assert(!call('placeOrder', { token, order: { option: 'Hacked', catalogName: 'a', images: 10, catalogLink: 'https://drive.google.com/x' } }).ok, 'unknown option rejected');
// credits: 35mm has credits enabled? use them
const c35 = call('me', { token }).company;
if (c35.creditsEnabled && c35.credits > 0) {
  r = call('placeOrder', { token, order: { option: 'Human Touch', catalogName: 'Credit Test', images: 50, hours: 96, catalogLink: 'https://drive.google.com/x', useCredits: true } });
  assert(r.ok && r.order.creditsRedeemed === Math.min(50, c35.credits) && r.company.credits === c35.credits - r.order.creditsRedeemed, 'credits redeemed and logged');
}
// sample company login + limits
r = call('requestCode', { email: 'ovigraphy7@gmail.com' });
const c2 = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
const t2 = call('verifyCode', { email: 'ovigraphy7@gmail.com', code: c2 }).token;
r = call('me', { token: t2 });
assert(r.company.packageType === 'SAMPLE' && r.orderForm.options[0] === 'Sample (Color Correction)' && r.orderForm.maxImages === 150, 'SAMPLE: one option, max 150');
assert(!call('placeOrder', { token: t2, order: { option: 'Sample (Color Correction)', catalogName: 'S', images: 151, catalogLink: 'https://drive.google.com/x' } }).ok, 'SAMPLE over 150 blocked');
assert(call('placeOrder', { token: t2, order: { option: 'Sample (Color Correction)', catalogName: 'S', images: 150, hours: 96, catalogLink: 'https://drive.google.com/x' } }).ok, 'SAMPLE 150 allowed');
assert(!call('me', { token: t2 }).orderForm.canOrder, 'SAMPLE used up → blocked');
assert(call('logout', { token: t2 }).ok && call('me', { token: t2 }).code === 'AUTH', 'logout ends session');
console.log('emails logged:', DB.EmailLog.length - 1);
