// Step 103: "Try your photos" — every template keeps only the couple's choices (photos per spot, hidden parts, words, framing),
// never a copy of the design. The server cleans every key and value.
const { call, mail, DRIVE } = require('./gas_mock');
const fs = require('fs'), path = require('path');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'STEP103WEDDING000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files[W + 'p' + i] = { name: 'p' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Mira & Dev', eventDate: '2026-12-20' });
const G = pub.galleryId, ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const save = story => call('coupleLook', { g: G, coupleKey: ck, layout: 'custom', custom: JSON.stringify({ base: 'canvas-quiet', story, blocks: [] }) });
let r = save({ kind: 'canvas', photos: { 'bc-cover': 'PHOTOID123', 'bg-hero': 'PHOTOID456', 'bad key!': 'X1' }, hide: ['bc-moment', '<x>'], frame: { 'bc-cover': { fx: 40, fy: 250, z: 9 } }, names: 'Mira <b>& Dev', date: '1 Jan · Goa', colors: { light: { bg: '#ffffff', ink: 'red' } } });
const st = r.custom.story;
ok(r.custom.base === 'canvas-quiet' && st.kind === 'canvas' && !st.doc, 'a canvas template keeps only the choices (no doc)');
ok(st.photos['bc-cover'] === 'PHOTOID123' && st.photos['bg-hero'] === 'PHOTOID456' && !('bad key!' in st.photos), 'photos per spot are kept; a bad spot name is dropped');
ok(st.hide.length === 1 && st.hide[0] === 'bc-moment', 'hidden parts are kept; a bad one is dropped');
ok(st.frame['bc-cover'].fy === 100 && st.frame['bc-cover'].z === 3, 'framing is clamped (fy ≤ 100, zoom ≤ 3)');
ok(/^Mira/.test(st.names) && !/[<>]/.test(st.names), 'names lose < >');
ok(st.colors.light.bg === '#ffffff' && !st.colors.light.ink, 'only real colours are kept');
r = call('coupleLook', { g: G, coupleKey: ck, layout: 'custom', custom: JSON.stringify({ base: 'story-living', story: { kind: 'living', photos: { 'cover-0': 'PHOTOID789', 'ev-1-2': 'PHOTOIDABC' }, hide: ['psh-stream'] }, blocks: [] }) });
ok(r.custom.story.kind === 'living' && r.custom.story.photos['cover-0'] === 'PHOTOID789' && r.custom.story.photos['ev-1-2'] === 'PHOTOIDABC' && r.custom.story.hide[0] === 'psh-stream', 'Living Story keeps cover / event photo choices and hidden parts');
ok(call('coupleLook', { g: G, coupleKey: 'nope', layout: 'custom', custom: JSON.stringify({ base: 'canvas-quiet', story: { kind: 'canvas' }, blocks: [] }) }).ok === false, 'a wrong couple key cannot save choices');
const code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
ok(!/relay|cloudflare/i.test(fs.readFileSync(path.join(__dirname, '..', 'app', 'gallery', '54-tune.js'), 'utf8')), 'no relay code');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all ok');
