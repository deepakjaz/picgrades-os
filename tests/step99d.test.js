// Step 99d: the app header for every template — how it behaves when the page scrolls, and the couple's own logo.
// Only the couple (or the photographer / PicGrades) can change it; a guest's link cannot. The logo is a small picture.
const { call, mail, DRIVE } = require('./gas_mock');
const fs = require('fs'), path = require('path');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'STEP99DWEDDING000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files[W + 'p' + i] = { name: 'p' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Mira & Dev', eventDate: '2026-12-20' });
const G = pub.galleryId, ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

ok(call('coupleLook', { g: G, coupleKey: 'wrong', logo: png }).ok === false, 'a wrong couple key cannot change the logo');
ok(call('getGallery', { g: G }).gallery.logoUrl === '', 'no logo yet: the app shows the initials');
ok(call('coupleLook', { g: G, coupleKey: ck, logo: 'data:image/svg+xml;base64,PHN2Zz4=' }).ok === false, 'an SVG data URL is not stored (the phone turns SVG into PNG / WebP first)');
ok(call('coupleLook', { g: G, coupleKey: ck, logo: 'data:image/png;base64,abc"><script>' }).ok === false, 'a logo with odd characters is refused');
const r = call('coupleLook', { g: G, coupleKey: ck, logo: png, pages: JSON.stringify({ logo: 'image', header: 'center', hdrmode: 'auto' }) });
ok(r.logoUrl === png && r.pages.header === 'center' && r.pages.hdrmode === 'auto' && r.pages.logo === 'image', 'the couple saves logo + centre + Hides, comes back');
const s = call('setLook', { token: admin, g: G, pages: JSON.stringify({ hdrmode: 'fixed' }) });
ok(s.pages.hdrmode === 'fixed' && s.pages.header === 'center' && s.logoUrl === png, 'PicGrades changes one choice; the others and the logo stay');
ok(call('coupleLook', { g: G, coupleKey: ck, logo: '' }).logoUrl === '', 'Remove: the logo is gone');
// the Code.gs guards
const code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
ok(/header: \['right', 'left', 'center'\], hdrmode: \['scroll', 'fixed', 'auto'\], logo: \['mono', 'image', 'none'\]/.test(code), 'PAGE_STYLES lists the header choices');
ok(/'timeGroups', 'logo'[,\]]/.test(code), 'the Galleries tab has the logo column after the older ones (old rows keep working; later steps add columns after it)');
const js = fs.readFileSync(path.join(__dirname, '..', 'app', 'gallery', '53-header.js'), 'utf8');
ok(!/relay|cloudflare/i.test(js), 'no relay code in the header');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all ok');
