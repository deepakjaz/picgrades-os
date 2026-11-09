// Step 34: Control Panel. The wedding's look (theme + layout) is saved per wedding by the couple or the photographer (last change wins);
// myRole tells the app who is signed in (PicGrades staff / the wedding's photographer); PicGrades' admin sets the master switches.
const { call, mail, DRIVE, DB } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const admin = login('adcmediaa@gmail.com');
const orders = call('queue', { token: admin }).recentDone;
const W = 'LOOKWEDDING000000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files[W + 'H' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
const gid = call('setGallery', { token: admin, orderId: orders[0].orderId, folderUrl: W, title: 'Asha & Dev', eventDate: '2026-03-01' }).galleryId;
const ck = call('facesStatus', { token: admin, g: gid }).gallery.coupleKey;
let g = call('getGallery', { g: gid }).gallery;
assert(g.theme === '' && g.layout === '', 'a new wedding starts with the original look');
assert(!call('coupleLook', { g: gid, coupleKey: 'bad', theme: 'jaipur-rose' }).ok, 'wrong couple key cannot change the look');
let r = call('coupleLook', { g: gid, coupleKey: ck, theme: 'jaipur-rose' });
assert(r.ok && r.theme === 'jaipur-rose' && r.layout === '', 'couple sets the theme (layout untouched)');
r = call('coupleLook', { g: gid, coupleKey: ck, layout: 'Bento-Concierge', theme: '<script>' });
assert(r.layout === 'bento-concierge' && r.theme === '', 'layout saved; a bad theme name falls back to the original');
g = call('getGallery', { g: gid }).gallery;
assert(g.layout === 'bento-concierge', 'every guest now gets the couple’s layout');
assert(!call('coupleLook', { g: gid, coupleKey: ck }).ok, 'nothing to change = refused');
// photographer / staff
const company = DB.Galleries.slice(1).find(x => x.includes(gid))[DB.Galleries[0].indexOf('companyName')];
const own = DB.Users.slice(1).find(u => u[2] === company && u[3] === 'client'), other = DB.Users.slice(1).find(u => u[2] !== company && u[3] === 'client');
const ptok = own ? login(own[0]) : admin;
r = call('setLook', { token: ptok, g: gid, theme: 'midnight-velvet' });
assert(r.ok && r.theme === 'midnight-velvet' && r.layout === 'bento-concierge', 'photographer changes the theme; last change wins');
assert(call('getGallery', { g: gid }).gallery.theme === 'midnight-velvet', 'guests get the photographer’s change');
assert(!call('setLook', { g: gid, theme: 'x' }).ok, 'not logged in = no change');
let me = call('myRole', { token: admin, g: gid });
assert(me.ok && me.role === 'picgrades' && me.canLock === true, 'PicGrades admin is recognised (and may lock functions)');
if (own) { me = call('myRole', { token: ptok, g: gid }); assert(me.ok && me.role === 'photographer' && !me.canLock && me.theme === 'midnight-velvet', 'the wedding’s photographer is recognised'); }
if (other) { const ot = login(other[0]); assert(!call('myRole', { token: ot, g: gid }).ok, 'another studio is not this wedding’s photographer'); assert(!call('setLook', { token: ot, g: gid, theme: 'x' }).ok, 'another studio cannot change the look'); }
assert(!call('myRole', { g: gid }).ok, 'no login = guest');
// master switches
r = call('setAllowed', { token: admin, g: gid, allowed: JSON.stringify({ games: 'off', reel: 'off' }) });
assert(r.ok && r.features.reel === 'locked' && !('games' in r.allowed), 'PicGrades locks Reel Edits (unknown names ignored)');
assert(call('coupleFeatures', { g: gid, coupleKey: ck, features: { reel: 'on' } }).features.reel === 'locked', 'the couple cannot unlock it');
r = call('setAllowed', { token: admin, g: gid, allowed: { reel: 'on' } });
assert(r.features.reel === 'on', 'PicGrades allows it again');
if (own) assert(!call('setAllowed', { token: ptok, g: gid, allowed: { reel: 'off' } }).ok, 'only PicGrades admins hold the master switches');
assert(call('health', {}).version === 'step34-control-panel', 'backend version step34-control-panel');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all step 34 checks passed');
