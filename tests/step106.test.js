// Step 106: Try your photos keeps the couple's words for any text on a template and the order of its parts — cleaned on the server.
const { call, mail, DRIVE } = require('./gas_mock');
const fs = require('fs'), path = require('path');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
const W = 'STEP106WEDDING000001'; DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'w'] = { name: 'Wedding', parent: W };
for (let i = 0; i < 4; i++) DRIVE.files[W + 'p' + i] = { name: 'p' + i + '.jpg', parent: W + 'w', mime: 'image/jpeg' };
const admin = login('adcmediaa@gmail.com');
const pub = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[0].orderId, folderUrl: W, title: 'Mira & Dev', eventDate: '2026-12-20' });
const G = pub.galleryId, ck = call('facesStatus', { token: admin, g: G }).gallery.coupleKey;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const save = (base, story) => call('coupleLook', { g: G, coupleKey: ck, layout: 'custom', custom: JSON.stringify({ base, story, blocks: [] }) }).custom.story;
let st = save('canvas-night', { kind: 'canvas', texts: { g_head: 'Our forever <b>begins</b>', 'bad key!': 'x', reel_btn: 'Make our reel' }, sections: [{ k: 'days', on: true }, { k: 'hero', on: false }, { k: '<x>' }] });
ok(st.texts.g_head.indexOf('<') < 0 && st.texts.g_head.indexOf('>') < 0 && /^Our forever/.test(st.texts.g_head), 'canvas words are kept without < >');
ok(st.texts.reel_btn === 'Make our reel' && !('bad key!' in st.texts), 'button words kept; a bad key is dropped');
ok(st.sections.length === 2 && st.sections[0].k === 'days' && st.sections[1].on === false, 'the parts\' order (and a hidden one) is kept; a bad one is dropped');
st = save('story-living', { kind: 'living', texts: { 'psh-stream:0': 'Two families', g_head: 'no' }, sections: [{ k: 'psh-events-sec' }, { k: 'psh-stream' }] });
ok(st.texts['psh-stream:0'] === 'Two families' && !st.texts.g_head && st.sections[0].k === 'psh-events-sec', 'Living Story keeps its own words and order (canvas-style keys are not)');
const long = 'x'.repeat(500); st = save('canvas-night', { kind: 'canvas', texts: { g_head: long } });
ok(st.texts.g_head.length === 120, 'words are at most 120 characters');
if (fails) { console.error(fails + ' failed'); process.exit(1); } console.log('all ok');
