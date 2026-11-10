// Step 47: the wedding's "Notes on photos" style (below / typing / off) is saved with the other page styles.
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const W = 'NOTESTYLEWEDDING0001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 2; i++) DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Asha & Dev' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
assert(!call('getGallery', { g: gid }).gallery.pages.comments, 'no style yet (the app uses "below")');
let r = call('coupleLook', { g: gid, coupleKey: ck, pages: JSON.stringify({ comments: 'typing' }) });
assert(r.ok && r.pages.comments === 'typing', 'the couple picks Typing');
r = call('setLook', { token: admin, g: gid, pages: JSON.stringify({ comments: 'off', viewer: 'classic' }) });
assert(r.ok && r.pages.comments === 'off' && r.pages.viewer === 'classic', 'PicGrades picks Only the button (other styles kept)');
r = call('coupleLook', { g: gid, coupleKey: ck, pages: JSON.stringify({ comments: '<b>' }) });
assert(call('getGallery', { g: gid }).gallery.pages.comments === 'off', 'an unknown style is ignored');
assert(call('health', {}).version === 'step47-comments', 'backend version step47-comments');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 47 checks passed');
