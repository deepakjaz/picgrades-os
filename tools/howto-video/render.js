// Renders the how-to video frames + the sound timeline.
const fs = require('fs'), path = require('path'), http = require('http');
const D = '/home/claude/video', FPS = 30;
const T = JSON.parse(fs.readFileSync(D + '/shots/targets.json'));
T.share = { x: 15, y: 670, w: 360, h: 50 };
const n = p => fs.readdirSync(D + '/shots').filter(f => f.startsWith(p + '-') && /-\d{3}\.png$/.test(f)).length;
const VO = JSON.parse(fs.readFileSync(D + '/vo/dur.json'));
// ---- the plan (seconds) ----
const S = [
  { t0: 0, t1: 1.9, cardKind: 'intro' },
  { t0: 1.9, t1: 6.0, parts: [{ at: 0, seq: 's1-hub', n: n('s1-hub'), fps: 8, loop: true }], cap: [{ t0: 2.0, t1: 6.0, text: 'Tap', chip: 'Reel Edits' }],
    taps: [{ t: 5.2, target: 'hub_reel', dy: 30 }], zoom: [{ t0: 3.3, t1: 5.6, s: 1.3, fx: 103, fy: 533 }] },
  { t0: 6.0, t1: 12.6, parts: [{ at: 0, seq: 's2-feed', n: n('s2-feed'), fps: 10, d: 2.9 }, { at: 2.9, seq: 's2b-swipe', n: n('s2b-swipe'), fps: 16, d: 0.85 }, { at: 3.75, seq: 's2c-feed', n: n('s2c-feed'), fps: 10 }],
    cap: [{ t0: 6.1, t1: 9.6, text: 'Swipe through the styles' }, { t0: 9.6, t1: 12.6, text: 'Pick one', chip: 'Use template' }],
    swipes: [{ t: 8.15 }], taps: [{ t: 11.9, target: 'feed_use2' }], zoom: [{ t0: 10.6, t1: 12.3, s: 1.25, fx: 195, fy: 700 }] },
  { t0: 12.6, t1: 15.4, parts: [{ at: 0, img: 's3-picker' }], cap: [{ t0: 12.7, t1: 15.4, text: 'Your Find me photos', chip: 'Already in' }],
    zoom: [{ t0: 13.0, t1: 15.0, s: 1.22, fx: 195, fy: 300 }] },
  { t0: 15.4, t1: 19.6, parts: [{ at: 0, img: 's3-picker', d: 2.0 }, { at: 2.0, img: 's3b-picker' }], cap: [{ t0: 15.5, t1: 19.6, text: 'Add your own photos & videos', chip: 'From your phone' }],
    taps: [{ t: 17.2, target: 'pick_phone', from: [300, 330] }, { t: 19.0, target: 'pick_next', from: [330, 420] }], zoom: [{ t0: 15.6, t1: 18.6, s: 1.35, fx: 150, fy: 200 }], fadeIn: false },
  { t0: 19.6, t1: 22.6, parts: [{ at: 0, img: 's4-editor', d: 0.6 }, { at: 0.6, seq: 's4b-play', n: n('s4b-play'), fps: 12 }], cap: [{ t0: 19.7, t1: 22.6, text: 'Every cut on the beat' }],
    taps: [{ t: 20.1, target: 'ed_play' }] },
  { t0: 22.6, t1: 27.0, parts: [{ at: 0, img: 's5-tools', d: 0.4 }, { at: 0.4, img: 's5b-text', d: 0.7 }, { at: 1.1, img: 's5-tools', d: 0.4 }, { at: 1.5, img: 's6b-draw', d: 0.7 }, { at: 2.2, img: 's5-tools', d: 0.4 }, { at: 2.6, img: 's7b-filter', d: 0.7 }, { at: 3.3, img: 's5-tools', d: 0.4 }, { at: 3.7, img: 's8-music' }],
    cap: [{ t0: 22.7, t1: 23.7, text: 'Make it yours', chip: 'Text' }, { t0: 23.7, t1: 24.8, text: 'Make it yours', chip: 'Drawings' }, { t0: 24.8, t1: 25.9, text: 'Make it yours', chip: 'Filters' }, { t0: 25.9, t1: 27.0, text: 'Make it yours', chip: 'Music' }],
    taps: [{ t: 22.8, target: 't_text', from: [150, 600] }, { t: 23.9, target: 't_draw', from: [230, 600] }, { t: 25.0, target: 't_filter', from: [330, 600] }, { t: 26.1, target: 't_music', from: [120, 600] }], fadeIn: false },
  { t0: 27.0, t1: 30.2, parts: [{ at: 0, img: 's8-music', d: 0.5 }, { at: 0.5, seq: 's9-making', n: n('s9-making'), fps: 7 }], cap: [{ t0: 27.1, t1: 30.2, text: 'Made right on your phone' }],
    taps: [{ t: 27.35, target: 'ed_next', box: { x: 310, y: 9, w: 68, h: 38 }, from: [330, 330] }], fadeIn: false },
  { t0: 30.2, t1: 33.4, parts: [{ at: 0, img: 's9b-ready' }], cap: [{ t0: 30.3, t1: 33.4, text: 'Share it anywhere', chip: 'Instagram · WhatsApp' }],
    taps: [{ t: 32.4, target: 'share' }], zoom: [{ t0: 30.8, t1: 33.2, s: 1.2, fx: 195, fy: 560 }] },
  { t0: 33.4, t1: 37.5, cardKind: 'end' }
];
const END = 37.5;
// sound cues: [file, at, gain]
const VOAT = { l1: 2.0, l2: 6.2, l3: 10.0, l4: 12.8, l5: 15.5, l6: 19.9, l7: 22.75, l8: 27.4, l9: 30.5, l10: 33.7 };
const cues = Object.keys(VOAT).map(k => ['vo/' + k + '.wav', VOAT[k], 1.0]);
S.forEach(s => { (s.taps || []).forEach(tp => cues.push(['vo/sfx_tap.wav', tp.t, 0.9])); (s.swipes || []).forEach(sw => cues.push(['vo/sfx_swipe.wav', sw.t + .1, 0.8])); if (s.t0 > 0) cues.push(['vo/sfx_whoosh.wav', s.t0 - .2, 0.5]); });
cues.push(['vo/sfx_ding.wav', 30.25, 0.8], ['vo/sfx_pop.wav', 0.25, 0.7]);
// check voice lines fit before the next one
Object.keys(VOAT).forEach((k, i, a) => { const nx = a[i + 1] ? VOAT[a[i + 1]] : END; if (VOAT[k] + VO[k] > nx - 0.1) console.log('VO OVERLAP', k, VOAT[k] + VO[k], nx); });
fs.writeFileSync(D + '/cues.json', JSON.stringify({ cues, END }));
const names = fs.readdirSync(D + '/shots').filter(f => f.endsWith('.png')).map(f => f.slice(0, -4));
const srv = http.createServer((q, r) => { const f = path.join(D, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.png') ? 'image/png' : 'application/octet-stream' }); r.end(d); }); }).listen(0, async () => {
  const { chromium } = require('playwright'); const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await require('/home/claude/audit/fonts_route.js')(ctx);
  const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('http://localhost:' + srv.address().port + '/comp.html'); await pg.waitForTimeout(500);
  console.log('images', await pg.evaluate(([s, t, nm]) => setup(s, t, nm), [S, T, names]));
  const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
  const total = Math.round(END * FPS);
  for (let f = 0; f < total; f++) {
    const t = f / FPS; if (only && !only.some(x => Math.abs(x - t) < 0.5 / FPS)) continue;
    await pg.evaluate(t => draw(t), t);
    const data = await pg.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.93));
    fs.writeFileSync(D + '/frames/f' + String(f).padStart(5, '0') + '.jpg', Buffer.from(data.split(',')[1], 'base64'));
  }
  await b.close(); srv.close(); console.log('done');
});
