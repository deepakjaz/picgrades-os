// Step 77 (phase 1): collections and free-canvas layouts kept in the "Canvas" tab.
// Couples, photographers and PicGrades staff can make collections and layouts; each chooses who sees them; the layout
// document is cleaned; a wedding can apply a layout it can see; guests of a "Find me first" wedding may load the photos it picked.
global.__autoOpen = false;
const { call, mail, DRIVE } = require('./gas_mock');
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok  ', m); };
function login(email) { call('requestCode', { email }); const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1]; return call('verifyCode', { email, code }).token; }
function wedding(W, title) {
  DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' }; DRIVE.folders[W + 'h'] = { name: 'Haldi', parent: W };
  for (let i = 0; i < 6; i++) DRIVE.files[W.slice(-4) + 'P' + i] = { name: 'h' + i + '.jpg', parent: W + 'h', mime: 'image/jpeg' };
  const gid = call('setGallery', { token: admin, orderId: call('queue', { token: admin }).recentDone[N++].orderId, folderUrl: W, title }).galleryId;
  return { gid, ck: call('facesStatus', { token: admin, g: gid }).gallery.coupleKey, ph: W.slice(-4) + 'P' };
}
const admin = login('adcmediaa@gmail.com'); let N = 0;
const A = wedding('CANVASSTEP77AAAAAAA1', 'Anika & Rohan'), B = wedding('CANVASSTEP77BBBBBBB2', 'Meera & Kabir');
const doc = { name: 'Mine', colors: { bg: '#112233', ink: 'nope' }, fonts: { head: 'Great Vibes', body: 'Comic Sans' }, evil: 1,
  sections: [{ id: 'hero', h: { p: 844, l: 99999 }, bg: { c: '#000', src: { k: 'id', id: A.ph + '2' }, dim: 5 }, els: [
    { id: 'n', t: 'names', p: { x: 10, y: 600, w: 370, h: 80, r: 400 }, s: { font: 'Great Vibes', size: 52, color: 'red', align: 'middle' }, sl: { size: 90 }, m: 'rise', text: '<b>Hi</b>' },
    { id: 'c', t: 'photo', p: { x: 0, y: 0, w: 390, h: 560 }, src: { k: 'id', id: A.ph + '4' }, m: 'zoom' },
    { id: 'x', t: 'script', p: { x: 0, y: 0, w: 10, h: 10 } },
    { id: 'f', t: 'action', act: 'hack', p: { x: 0, y: 700, w: 100, h: 50 } }] }] };

// a couple makes a collection and a layout for their wedding
let col = call('canvasSave', { g: A.gid, coupleKey: A.ck, item: { kind: 'collection', name: 'Our picks', scope: 'wedding' } });
assert(/^cc-/.test(col.id) && col.kind === 'collection' && col.scope === 'wedding', 'a couple makes a collection');
let lay = call('canvasSave', { g: A.gid, coupleKey: A.ck, item: { kind: 'layout', name: 'Night one', collection: col.id, scope: 'all', doc } });
assert(/^cv-/.test(lay.id) && lay.collection === col.id, 'a couple saves a layout into it');
assert(lay.scope === 'me', 'a couple cannot publish to every wedding (asked "all", kept "me")');
const d = lay.doc, s0 = d.sections[0], els = s0.els;
assert(d.colors.bg === '#112233' && !d.colors.ink && d.fonts.head === 'Great Vibes' && !d.fonts.body && !('evil' in d), 'colours and fonts cleaned');
assert(s0.h.l === 4000 && s0.bg.dim === 0.8 && s0.bg.src.id === A.ph + '2', 'sizes clamped');
assert(els.length === 3 && !els.some(e => e.t === 'script'), 'unknown element types dropped');
assert(els[0].p.r === 180 && els[0].s.font === 'Great Vibes' && !els[0].s.color && !els[0].s.align && els[0].sl.size === 90 && els[0].text === 'bHi/b', 'element cleaned: ' + JSON.stringify(els[0]));
assert(!els[2].act, 'unknown button action dropped');

// who sees what
const listA = call('canvasList', { g: A.gid, coupleKey: A.ck }), listB = call('canvasList', { g: B.gid, coupleKey: B.ck });
assert(listA.layouts.some(x => x.id === lay.id) && listA.collections.some(x => x.id === col.id), 'the couple sees their own');
assert(!listB.layouts.some(x => x.id === lay.id) && !listB.collections.some(x => x.id === col.id), 'another wedding does not');
assert(call('canvasList', { token: admin }).layouts.some(x => x.id === lay.id), 'PicGrades staff see everything');
assert(call('canvasGet', { g: B.gid, coupleKey: B.ck, id: lay.id }).ok === false, 'another wedding cannot open it');
assert(call('canvasSave', { g: B.gid, coupleKey: B.ck, item: { id: lay.id, kind: 'layout', name: 'Taken', doc } }).ok === false, '…nor change it');

// staff publish one to every wedding
const pub = call('canvasSave', { token: admin, item: { kind: 'layout', name: 'For everyone', scope: 'all', doc } });
assert(pub.scope === 'all' && call('canvasList', { g: B.gid, coupleKey: B.ck }).layouts.some(x => x.id === pub.id), 'staff publish a layout every wedding sees');

// applying
let r = call('coupleLook', { g: B.gid, coupleKey: B.ck, layout: lay.id });
assert(r.ok === false, 'a wedding cannot apply a layout it cannot see');
r = call('coupleLook', { g: A.gid, coupleKey: A.ck, layout: lay.id });
assert(r.layout === lay.id, 'a wedding applies its own layout (scope "me" of the couple)');
let G = call('getGallery', { g: A.gid }).gallery;
assert(G.layout === lay.id && G.canvas && G.canvas.id === lay.id && G.canvas.doc.sections[0].els.length === 3, 'guests get the layout with the wedding');
const seen = new Set(); (G.pool || []).forEach(p => seen.add(p.id)); (G.highlights || []).forEach(p => seen.add(p.id)); (G.events || []).forEach(e => (e.photos || []).forEach(p => seen.add(p.id)));
assert(G.gated && seen.has(A.ph + '2') && seen.has(A.ph + '4') && !seen.has(A.ph + '1'), 'a gated guest can load the photos the layout picked, and nothing else');

// a couple's own version of a canvas layout (custom story kind 'canvas')
r = call('coupleLook', { g: A.gid, coupleKey: A.ck, layout: 'custom', custom: JSON.stringify({ base: pub.id, story: { kind: 'canvas', doc } }) });
assert(r.custom.story.kind === 'canvas' && r.custom.story.doc.sections[0].els.length === 3, 'a couple\'s own version of a canvas layout is kept, cleaned');

// delete
assert(call('canvasDelete', { g: B.gid, coupleKey: B.ck, id: lay.id }).ok === false, 'only the maker deletes');
assert(call('canvasDelete', { g: A.gid, coupleKey: A.ck, id: lay.id }).ok === true, 'the maker deletes');
call('coupleLook', { g: A.gid, coupleKey: A.ck, layout: '' });
assert(!call('canvasList', { g: A.gid, coupleKey: A.ck }).layouts.some(x => x.id === lay.id), 'deleted layouts are gone from the list');

// step 78: motion, delay / speed / scroll depth, "stays while scrolling"
const mdoc = { sections: [{ id: 's', h: { p: 600 }, stay: 9000, els: [{ id: 'a', t: 'text', p: { x: 0, y: 0, w: 100, h: 40 }, m: 'iris', mo: { d: 99999, t: 400, p: 3, x: 1 } }, { id: 'b', t: 'text', p: { x: 0, y: 0, w: 100, h: 40 }, m: 'spin' }] }] };
const md = call('canvasSave', { token: admin, item: { kind: 'layout', name: 'Motion', doc: mdoc } }).doc;
assert(md.sections[0].stay === 3000 && md.sections[0].els[0].m === 'iris' && JSON.stringify(md.sections[0].els[0].mo) === '{"d":5000,"t":400,"p":0.6}' && !md.sections[0].els[1].m, 'motion kept and clamped, unknown motion dropped: ' + JSON.stringify(md.sections[0]));

// size limit
const big = { sections: Array.from({ length: 24 }, (x, i) => ({ id: 's' + i, h: { p: 500 }, els: Array.from({ length: 60 }, (y, j) => ({ id: 'e' + j, t: 'text', p: { x: 1, y: 1, w: 10, h: 10 }, text: 'x'.repeat(400) })) })) };
assert(call('canvasSave', { token: admin, item: { kind: 'layout', name: 'Huge', doc: big } }).ok === false, 'a layout too big for one cell is refused with a clear message');

if (fails) { console.error(fails + ' failed'); process.exit(1); } else console.log('all ok');
