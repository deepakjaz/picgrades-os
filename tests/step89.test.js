// Step 89: invite links ("Who can see"). Only the couple or photographer manage them; a guest on a link that is on
// sees every photo without Find me; full / off / removed means normal guest rules again; downloads follow the switch.
global.__autoOpen = false;
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0;
const assert = (condition, message) => {
  if (!condition) { fails++; console.error('FAIL', message); }
  else console.log('ok  ', message);
};
function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}
const W = 'ACCESSLINKSBACKEND89000001';
DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };
DRIVE.folders[W + 'e'] = { name: 'Ceremony', parent: W };
for (let i = 0; i < 12; i++) DRIVE.files['ALB' + i] = { name: 'photo' + i + '.jpg', parent: W + 'e', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const made = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Anika & Rohan', eventDate: '2026-12-14' });
const g = made.galleryId;
const ck = call('facesStatus', { token: admin, g }).gallery.coupleKey;
call('guestPhotos', { g, coupleKey: ck, mode: 'findme' });

// how many photos a guest's phone receives (all 12 = not gated)
const seen = gu => { const m = call('getGallery', { g, guestId: gu.guestId, guestKey: gu.guestKey }).gallery; return (m.events || []).reduce((n, e) => n + (e.photos || []).length, 0); };
const join = (n, inv) => call('guestJoin', Object.assign({ g, name: 'Guest ' + n, phone: '98765432' + String(n).padStart(2, '0'), device: 'dev-' + n + '-' + Math.random() }, inv ? { inv } : {}));

// 1. strangers are refused
['inviteList', 'inviteSave', 'inviteState', 'inviteRemove', 'inviteUndo'].forEach(a => {
  const r = call(a, { g, name: 'Hack', size: 10, linkId: 'x', guestId: 'x', status: 'on' });
  assert(r.ok === false && /couple or the photographer/.test(r.error), a + ' is refused without the couple key or a login');
});
const normal = join(90);
assert(call('inviteList', { g, guestId: normal.guestId, guestKey: normal.guestKey }).ok === false, 'a signed-in guest cannot see the links');

// 2. make + check input
assert(call('inviteSave', { g, coupleKey: ck, name: 'Family', size: 12, download: 'on' }).ok === false, 'only 10 / 25 / 50 / 100 are allowed');
assert(call('inviteSave', { g, coupleKey: ck, name: 'F', size: 10, download: 'on' }).ok === false, 'a one-letter name is refused');
const fam = call('inviteSave', { g, coupleKey: ck, name: '<b>Family</b>', size: 10, download: 'on' }).link;
assert(fam && fam.used === 0 && fam.status === 'on' && fam.name === 'Family', 'couple makes Family (limit 10), HTML stripped, 0 used');
assert(call('inviteSave', { g, token: admin, name: 'Friends', size: 25, download: 'off' }).link.size === 25, 'the photographer / PicGrades login can make a link too');

// 3. joining
const first = join(1, fam.code);
const firstAgain = join(1, fam.code);   // same number, second phone
let list = call('inviteList', { g, coupleKey: ck }).links.find(x => x.linkId === fam.linkId);
assert(list.used === 1, 'the same mobile number on two phones counts once');
assert(seen(first) === 12 && seen(firstAgain) === 12, 'both phones of the invited guest see all 12 photos');
assert(seen(normal) < 12, 'a normal guest is still behind Find me (' + seen(normal) + ' photos)');
assert(seen(join(91, 'wrongcode0000')) < 12, 'a wrong code joins as a normal guest');

// 4. full
for (let n = 2; n <= 10; n++) join(n, fam.code);
const full = join(11, fam.code);
assert(full.inviteFull === true && seen(full) < 12, 'the 11th person on a limit-10 link gets "full" and normal rules');
assert(join(5, fam.code).inviteFull !== true, 'someone already on a full link can still sign in on a new phone');
assert(call('inviteSave', { g, coupleKey: ck, linkId: fam.linkId, name: 'Family', size: 10, download: 'on' }).ok !== false, 'editing keeps working when full');
for (let n = 20; n <= 30; n++) join(n, call('inviteList', { g, coupleKey: ck }).links.find(x => x.name === 'Friends').code);
const fr = call('inviteList', { g, coupleKey: ck }).links.find(x => x.name === 'Friends');
const shrink = call('inviteSave', { g, coupleKey: ck, linkId: fr.linkId, name: 'Friends', size: 10, download: 'off' });
assert(shrink.ok === false && /11 people already joined\. Pick 25 or more/.test(shrink.error), 'a limit smaller than the people already on the link is refused');

// 5. off / on
call('inviteState', { g, coupleKey: ck, linkId: fam.linkId, status: 'off' });
assert(seen(first) < 12, 'link off: the invited guest goes back to Find me rules');
call('inviteState', { g, coupleKey: ck, linkId: fam.linkId, status: 'on' });
assert(seen(first) === 12, 'link on again: all photos again');

// 6. remove / undo
assert(call('inviteRemove', { g, coupleKey: ck, linkId: fam.linkId, guestId: first.guestId }).guestId === first.guestId, 'Remove answers with the guest id');
assert(seen(first) < 12 && seen(firstAgain) < 12, 'removed: both phones of that person lose full access');
assert(call('inviteList', { g, coupleKey: ck }).links.find(x => x.linkId === fam.linkId).used === 9, 'removing frees one place');
assert(call('inviteUndo', { g, coupleKey: ck, linkId: fam.linkId, guestId: first.guestId }).guestId === first.guestId, 'Undo brings them back');
assert(seen(first) === 12, 'after Undo: all photos again');

// 6b. a guest who joined earlier without the link opens it later
const later = join(40);
assert(seen(later) < 12, 'joined without a link: Find me rules');
const lj = call('inviteJoin', { g, guestId: later.guestId, guestKey: later.guestKey, inv: fam.code });
assert(lj.inviteFull === true && seen(later) < 12, 'opening a full link later: not added');
const fam2 = call('inviteList', { g, coupleKey: ck }).links.find(x => x.linkId === fam.linkId);
call('inviteSave', { g, coupleKey: ck, linkId: fam.linkId, name: 'Family', size: 25, download: 'on' });
assert(call('inviteJoin', { g, guestId: later.guestId, guestKey: later.guestKey, inv: fam2.code }).invited === true && seen(later) === 12, 'opening a link with room later: added, all photos');
assert(call('inviteJoin', { g, inv: fam2.code }).ok === false, 'inviteJoin needs a real guest');
assert(call('getGallery', { g, guestId: later.guestId, guestKey: later.guestKey }).gallery.invite.download === 'on', 'the invited guest\'s app learns downloads are on');
assert(!call('getGallery', { g, guestId: normal.guestId, guestKey: normal.guestKey }).gallery.invite, 'a normal guest gets no invite info');

// 7. no phone numbers in the list
const reply = JSON.stringify(call('inviteList', { g, coupleKey: ck }));
assert(!/98765432/.test(reply) && !/keyHash/.test(reply), 'the link list never contains phone numbers or keys');

// 8. downloads follow the switch
const ask = () => call('askDownload', { g, guestId: first.guestId, guestKey: first.guestKey, email: 'guest@example.com', ids: ['ALB0'] });
const on = ask();
assert(on.status === 'approved' && on.grant && (call('dlGrant', { g, grant: on.grant }).ids || []).includes('ALB0'), 'download on: approved straight away and the grant works');
call('inviteSave', { g, coupleKey: ck, linkId: fam.linkId, name: 'Family', size: 25, download: 'off' });
const off = ask();
assert(off.status !== 'approved' && !off.grant, 'download off: the normal waiting request');
const plain = call('askDownload', { g, guestId: normal.guestId, guestKey: normal.guestKey, email: 'n@example.com', ids: ['ALB0'] });
assert(plain.ok !== false && !plain.grant, 'a normal guest still waits for approval');
process.exit(fails ? 1 : 0);
