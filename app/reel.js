/* PicGrades Reel maker — makes a vertical 1080×1920 video from gallery photos, cut on the beat of the music.
   Runs on the guest's phone (canvas + Web Audio + MediaRecorder). Nothing is uploaded.
   Template now: South · Kasavu. Music: PicGrades' own instrumentals (/app/music/tracks.json). */
(function () {
  'use strict';
  var W = 1080, H = 1920, FPS = 30;
  var S = null; // current session

  // ---------- small helpers ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function slug(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'wedding'; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  var CSS = '' +
    '.rl-wrap{position:fixed;inset:0;z-index:300;background:#0b0908;color:#f3eee6;display:flex;flex-direction:column;font-family:"Plus Jakarta Sans",system-ui,sans-serif;overflow:hidden}' +
    '.rl-top{display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px}' +
    '.rl-top h3{margin:0;font:400 1.5rem/1 "Cormorant Garamond",serif}' +
    '.rl-x{width:42px;height:42px;border-radius:21px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:22px;cursor:pointer}' +
    '.rl-stage{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:4px 14px;position:relative}' +
    '.rl-stage canvas,.rl-stage video{height:100%;max-height:100%;max-width:100%;aspect-ratio:9/16;background:#000;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.6)}' +
    '.rl-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:70px;height:70px;border-radius:35px;border:0;background:rgba(0,0,0,.45);color:#fff;font-size:26px;cursor:pointer}' +
    '.rl-play.hide{display:none}' +
    '.rl-panel{flex:none;max-height:44vh;overflow-y:auto;padding:10px 14px calc(env(safe-area-inset-bottom,0px) + 14px);background:#141110;border-top:1px solid rgba(255,255,255,.08)}' +
    '.rl-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0 10px}.rl-row::-webkit-scrollbar{display:none}' +
    '.rl-lbl{font:500 .62rem/1 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.55);margin:6px 0 8px}' +
    '.rl-chip{flex:none;min-height:40px;padding:0 14px;border-radius:20px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#fff;font:600 .78rem/1 inherit;cursor:pointer;white-space:nowrap}' +
    '.rl-chip.on{background:#E7C873;color:#1b140c;border-color:#E7C873}' +
    '.rl-th{flex:none;position:relative;width:58px;height:58px;border:0;padding:0;background:#222;cursor:pointer;border-radius:8px;overflow:hidden}' +
    '.rl-th img{width:100%;height:100%;object-fit:cover;display:block}.rl-th.off img{opacity:.3}' +
    '.rl-th span{position:absolute;right:3px;top:3px;width:18px;height:18px;border-radius:9px;background:#E7C873;color:#1b140c;font:700 11px/18px sans-serif;text-align:center}.rl-th.off span{background:rgba(0,0,0,.6);color:#fff}' +
    '.rl-in{width:100%;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0908;color:#fff;padding:0 12px;font:inherit;font-size:16px;margin-bottom:8px}' +
    '.rl-tog{display:flex;align-items:center;gap:10px;min-height:44px;font-size:.85rem;cursor:pointer}.rl-tog input{width:20px;height:20px;accent-color:#E7C873}' +
    '.rl-go{width:100%;min-height:50px;border:0;border-radius:12px;background:#E7C873;color:#1b140c;font:700 1rem/1 inherit;cursor:pointer;margin-top:8px}' +
    '.rl-go:disabled{opacity:.5}' +
    '.rl-sub{width:100%;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:none;color:#fff;font:600 .9rem/1 inherit;cursor:pointer;margin-top:8px}' +
    '.rl-msg{font-size:.82rem;color:rgba(255,255,255,.75);margin:8px 0 0;min-height:1.2em}' +
    'body.rl-on .tkg-global-nav,body.rl-on .pgv-top,body.rl-on .pgv-bar{display:none!important}' +
    '.rl-status{position:absolute;inset:4px 14px;display:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(0,0,0,.35);text-align:center;pointer-events:none}' +
    '.rl-status.on{display:flex}.rl-status b{font:400 4rem/1 "Cormorant Garamond",serif;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6)}' +
    '.rl-status span{font:600 .95rem/1.3 inherit;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.7)}.rl-status small{font:500 .75rem/1 "IBM Plex Mono",monospace;color:#E7C873;letter-spacing:.06em;text-transform:uppercase}' +
    '.rl-add{display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(231,200,115,.15);border:1px dashed #E7C873;color:#E7C873}.rl-add b{font:300 26px/1 sans-serif}.rl-add small{font:600 10px/1 sans-serif;margin-top:2px}' +
    '.rl-picker{position:absolute;inset:0;z-index:5;background:#0b0908;display:flex;flex-direction:column}' +
    '.rl-picker .rl-top{gap:10px}.rl-pdone{width:auto;margin:0;min-height:40px;padding:0 18px}.rl-pcount{margin-left:auto;font:500 .75rem/1 "IBM Plex Mono",monospace;color:rgba(255,255,255,.7)}' +
    '.rl-ptabs{padding:4px 14px 10px}' +
    '.rl-pgrid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:0 3px calc(env(safe-area-inset-bottom,0px) + 10px);align-content:start}' +
    '.rl-pick{position:relative;aspect-ratio:1;border:0;padding:0;background:#222;cursor:pointer}.rl-pick img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.rl-pick i{position:absolute;right:6px;top:6px;width:22px;height:22px;border-radius:11px;border:2px solid #fff;background:rgba(0,0,0,.25)}' +
    '.rl-pick.on i{background:#E7C873;border-color:#E7C873}.rl-pick.on i::after{content:"✓";display:block;text-align:center;font:700 13px/18px sans-serif;color:#1b140c}.rl-pick.on img{opacity:.8}' +
    '.rl-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:10px}.rl-bar i{display:block;height:100%;width:0;background:#E7C873}';

  // ---------- loading photos (direct from Drive, else through the gallery server) ----------
  // Photos are kept as small compressed files; the phone decodes them only while drawing (a big list of decoded
  // bitmaps made iPhones reload the page).
  var URLS = [];
  function bitmapFromBlob(b) { return new Promise(function (res, rej) { var i = new Image(), u = URL.createObjectURL(b); URLS.push(u); i.onload = function () { res(i); }; i.onerror = rej; i.src = u; }); }
  function freeUrls() { URLS.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); URLS = []; }
  function imgFromSrc(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
  function loadPhotos(ids, onProgress) {
    var out = {}, done = 0, viaServer = false;
    function direct(id) {
      return fetch('https://lh3.googleusercontent.com/d/' + id + '=w1080').then(function (r) { if (!r.ok) throw new Error('x'); return r.blob(); }).then(bitmapFromBlob);
    }
    function server(batch) {
      return S.opt.api('photoData', { ids: batch }).then(function (r) {
        return Promise.all(batch.map(function (id) { return r.images[id] ? imgFromSrc(r.images[id]).then(function (im) { out[id] = im; }) : null; }));
      });
    }
    var queue = ids.slice();
    function next() {
      if (!queue.length) return Promise.resolve();
      var batch = queue.splice(0, 4);
      var p = viaServer ? server(batch) : Promise.all(batch.map(function (id) { return direct(id).then(function (b) { out[id] = b; }, function () { return 'fail'; }); }))
        .then(function (r) { var failed = batch.filter(function (id) { return !out[id]; }); if (failed.length && r.indexOf('fail') > -1) { viaServer = true; return server(failed); } });
      return p.then(function () { done += batch.length; onProgress(done, ids.length); return next(); });
    }
    return next().then(function () { return out; });
  }

  // ---------- templates ----------
  // layouts: how photos are placed in one shot. trans: how one shot changes to the next. fx: effects on the beat.
  var SERIF = '"Cormorant Garamond", Georgia, serif', MONO = '"IBM Plex Mono", monospace', SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
  var TEMPLATES = {
    south: { name: 'South · Kasavu', music: 'kasavu-morning', beats: [4], layouts: ['single'], trans: ['slide', 'fade'], card: 'kasavu', frame: true,
      fx: { pulse: 0.012, flashEvery: 8, flash: '231,200,115', flashA: 0.18 }, paper: '#F3EAD9', ink: '#3B2A1A', gold: '#C9A24A', gold2: '#E7C873', deep: '#5B1F14' },
    soft: { name: 'Soft', music: 'kasavu-morning', beats: [4, 6], layouts: ['single', 'single', 'duo'], trans: ['fade', 'zoomfade'], card: 'minimal',
      fx: { pulse: 0, leak: true }, paper: '#F6EFEA', ink: '#2B2522', gold: '#B89A6A', deep: '#7A5C4A' },
    dynamic: { name: 'Dynamic', music: 'cocktail-night', beats: [2, 2, 1], layouts: ['punch', 'split2', 'single', 'grid3', 'punch'], trans: ['cut', 'whip', 'zoom', 'cut'], card: 'bold',
      fx: { pulse: 0.03, shake: 10, flashEvery: 4, flash: '255,255,255', flashA: 0.35 }, paper: '#0E0E0E', ink: '#FFFFFF', gold: '#FFD23F', deep: '#FFD23F' },
    travel: { name: 'Travel', music: 'road-trip', beats: [4, 2], layouts: ['strip', 'polaroid', 'single', 'tv', 'polaroid'], trans: ['whip', 'slide', 'cut'], card: 'film',
      fx: { pulse: 0.01, leak: true }, paper: '#EFE6D6', ink: '#1E1A16', gold: '#D9822B', deep: '#1E1A16' },
    festival: { name: 'Festival', music: 'dhol-festival', beats: [2, 4, 2], layouts: ['grid4', 'polaroid', 'punch', 'grid3', 'single'], trans: ['flash', 'cut', 'zoom'], card: 'festive',
      fx: { pulse: 0.025, confetti: true, flashEvery: 8, flash: '255,170,40', flashA: 0.3 }, paper: '#FFF4E0', ink: '#3A0D2E', gold: '#FF9F1C', deep: '#C2185B' },
    party: { name: 'Party · Cocktail', music: 'cocktail-night', beats: [1, 1, 2], layouts: ['punch', 'grid4', 'split2', 'strobe', 'rgb', 'punch'], trans: ['cut', 'glitch', 'flash', 'cut'], card: 'neon',
      fx: { pulse: 0.045, shake: 14, flashEvery: 2, flash: '255,255,255', flashA: 0.22, rgb: true }, paper: '#07060B', ink: '#FFFFFF', gold: '#FF2E88', deep: '#21D4FD' }
  };
  var ORDER = ['south', 'soft', 'dynamic', 'travel', 'festival', 'party'];
  var LAYOUT_N = { single: 1, punch: 1, polaroid: 1, tv: 1, strobe: 1, rgb: 1, duo: 2, split2: 2, grid3: 3, grid4: 4, strip: 4 };
  var LAYOUT_MIN = { grid4: 2, grid3: 2, strip: 4, polaroid: 2, tv: 2, duo: 2, split2: 2 };
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- timeline ----------
  function plan() {
    var T = S.T, tr = S.track, bpm = tr ? tr.bpm : 110, beat = 60 / bpm;
    var total = Math.round(S.length / beat), titleB = 4, endB = S.endCard ? 4 : 0;
    var ids = S.photos.filter(function (p) { return p.on && S.bitmaps[p.id]; }).map(function (p) { return p.id; });
    var segs = [{ type: 'title', start: 0, dur: titleB * beat }], t = titleB * beat, bodyEnd = Math.max(t + beat * 2, (total - endB) * beat);
    var r = rng(S.seed), pick = function (a) { return a[Math.floor(r() * a.length)]; }, k = 0, used = {};
    while (ids.length && t < bodyEnd - beat * 0.5) {
      var layout = pick(T.layouts), n = LAYOUT_N[layout], beats = Math.max(pick(T.beats), LAYOUT_MIN[layout] || 1);
      beats = Math.min(beats, Math.round((bodyEnd - t) / beat)); if (beats < 1) break;
      var ph = []; for (var j = 0; j < n; j++) { var id = ids[k % ids.length]; ph.push(id); used[id] = 1; k++; }
      segs.push({ type: 'shot', layout: layout, ids: ph, start: t, dur: beats * beat, trans: segs.length === 1 ? 'fade' : pick(T.trans), k: segs.length, r: r() });
      t += beats * beat;
    }
    if (endB) { segs.push({ type: 'end', start: t, dur: endB * beat }); t += endB * beat; }
    return { segs: segs, dur: t, beat: beat, used: Object.keys(used).length, shots: segs.length - 1 - (endB ? 1 : 0) };
  }

  // ---------- drawing helpers ----------
  function blurOf(img) {   // small, softly blurred copy of the photo (box blur ×3) — smooth when stretched
    var cw = 72, ch = 128, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var x = c.getContext('2d'), r = Math.max(cw / img.width, ch / img.height);
    x.drawImage(img, (cw - img.width * r) / 2, (ch - img.height * r) / 2, img.width * r, img.height * r);
    try {
      var d = x.getImageData(0, 0, cw, ch), a = d.data, tmp = new Uint8ClampedArray(a.length), R = 4;
      for (var pass = 0; pass < 3; pass++) {
        for (var y = 0; y < ch; y++) for (var xx = 0; xx < cw; xx++) { var s0 = 0, s1 = 0, s2 = 0, n = 0;
          for (var k = -R; k <= R; k++) { var q = Math.min(cw - 1, Math.max(0, xx + k)); var o = (y * cw + q) * 4; s0 += a[o]; s1 += a[o + 1]; s2 += a[o + 2]; n++; }
          var w = (y * cw + xx) * 4; tmp[w] = s0 / n; tmp[w + 1] = s1 / n; tmp[w + 2] = s2 / n; tmp[w + 3] = 255; }
        for (var y2 = 0; y2 < ch; y2++) for (var x2 = 0; x2 < cw; x2++) { var t0 = 0, t1 = 0, t2 = 0, m = 0;
          for (var k2 = -R; k2 <= R; k2++) { var q2 = Math.min(ch - 1, Math.max(0, y2 + k2)); var o2 = (q2 * cw + x2) * 4; t0 += tmp[o2]; t1 += tmp[o2 + 1]; t2 += tmp[o2 + 2]; m++; }
          var w2 = (y2 * cw + x2) * 4; a[w2] = t0 / m; a[w2 + 1] = t1 / m; a[w2 + 2] = t2 / m; a[w2 + 3] = 255; }
      }
      x.putImageData(d, 0, 0);
    } catch (e) {}
    return c;
  }
  function blurBg(ctx, id, shade) {
    var img = S.bitmaps[id]; if (!img) return;
    if (!S.blurs[id]) S.blurs[id] = blurOf(img);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(S.blurs[id], -40, -40, W + 80, H + 80);
    ctx.fillStyle = 'rgba(10,8,6,' + (shade == null ? 0.5 : shade) + ')'; ctx.fillRect(0, 0, W, H);
  }
  function contain(ctx, id, bx, by, bw, bh, zoom, panX) {   // whole photo, never cut
    var img = S.bitmaps[id]; if (!img) return;
    var r = Math.min(bw / img.width, bh / img.height) * (zoom || 1), w = img.width * r, h = img.height * r;
    ctx.drawImage(img, bx + (bw - w) / 2 + (panX || 0), by + (bh - h) / 2, w, h);
  }
  function cover(ctx, id, bx, by, bw, bh, zoom) {            // fills a tile (collage layouts)
    var img = S.bitmaps[id]; if (!img) return;
    var r = Math.max(bw / img.width, bh / img.height) * (zoom || 1), w = img.width * r, h = img.height * r;
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    ctx.drawImage(img, bx + (bw - w) / 2, by + (bh - h) * 0.4, w, h); ctx.restore();
  }
  function pop(u) { if (u <= 0) return 0; if (u >= 1) return 1; var c = 1.70158 * 1.4; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } // overshoot
  function scaled(ctx, cx, cy, s, fn) { ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore(); }

  // ---------- one shot ----------
  function drawShot(ctx, sg, t, beat) {
    var T = S.T, u = Math.max(0, Math.min(1, (t - sg.start) / sg.dur)), lt = t - sg.start, ids = sg.ids, id = ids[0];
    switch (sg.layout) {
      case 'single':
        blurBg(ctx, id, 0.5); contain(ctx, id, 70, 90, W - 140, H - 300, 1 + 0.06 * u, (sg.k % 2 ? -1 : 1) * 24 * (u - 0.5)); break;
      case 'punch': {
        blurBg(ctx, id, 0.45); var s = 1 + 0.22 * Math.exp(-lt / (beat * 0.18));
        contain(ctx, id, 40, 60, W - 80, H - 240, s); break; }
      case 'duo': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var a2 = Math.min(1, lt / (beat * 0.6)), b2 = Math.max(0, Math.min(1, (lt - sg.dur * 0.45) / (beat * 0.6)));
        ctx.globalAlpha = a2; cover(ctx, ids[0], 60, 90, W - 120, (H - 270) / 2, 1 + 0.04 * u);
        ctx.globalAlpha = b2; cover(ctx, ids[1], 60, 90 + (H - 270) / 2 + 30, W - 120, (H - 270) / 2, 1.04 - 0.04 * u); ctx.globalAlpha = 1; break; }
      case 'split2': {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        var e1 = 1 - pop(Math.min(1, lt / (beat * 0.5))), e2 = 1 - pop(Math.max(0, Math.min(1, (lt - beat * 0.5) / (beat * 0.5))));
        cover(ctx, ids[0], -W * e1, 0, W, H / 2 - 6, 1.05); cover(ctx, ids[1], W * e2, H / 2 + 6, W, H / 2 - 6, 1.05); break; }
      case 'grid3': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var g = 18, boxes = [[g, g, W - 2 * g, H * 0.52], [g, H * 0.52 + 2 * g, (W - 3 * g) / 2, H * 0.48 - 3 * g], [W / 2 + g / 2, H * 0.52 + 2 * g, (W - 3 * g) / 2, H * 0.48 - 3 * g]];
        boxes.forEach(function (b, i) { var p = pop(Math.max(0, Math.min(1, (lt - i * sg.dur / 3.2) / (beat * 0.45)))); if (p <= 0) return;
          scaled(ctx, b[0] + b[2] / 2, b[1] + b[3] / 2, 0.6 + 0.4 * p, function () { cover(ctx, ids[i], b[0], b[1], b[2], b[3], 1.03); }); });
        break; }
      case 'grid4': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var g4 = 16, cw = (W - 3 * g4) / 2, chh = (H - 3 * g4) / 2;
        [[g4, g4], [2 * g4 + cw, g4], [g4, 2 * g4 + chh], [2 * g4 + cw, 2 * g4 + chh]].forEach(function (b, i) {
          var p = pop(Math.max(0, Math.min(1, (lt - i * sg.dur / 4.5) / (beat * 0.35)))); if (p <= 0) return;
          scaled(ctx, b[0] + cw / 2, b[1] + chh / 2, 0.5 + 0.5 * p, function () { cover(ctx, ids[i], b[0], b[1], cw, chh, 1.04); });
        });
        break; }
      case 'polaroid': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var rot = (sg.r - 0.5) * 0.18, drop = 1 - pop(Math.min(1, lt / (beat * 0.7)));
        var img = S.bitmaps[id]; if (!img) break;
        var pw = W * 0.78, ph = Math.min(H * 0.62, pw * img.height / img.width), fw = pw + 50, fh = ph + 170;
        ctx.save(); ctx.translate(W / 2, H * 0.46 - drop * H * 0.6); ctx.rotate(rot + drop * 0.3);
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 40; ctx.fillStyle = '#fff'; ctx.fillRect(-fw / 2, -fh / 2, fw, fh); ctx.shadowBlur = 0;
        cover(ctx, id, -pw / 2, -fh / 2 + 25, pw, ph, 1 + 0.03 * u);
        ctx.fillStyle = '#3a332c'; ctx.font = 'italic 500 46px ' + SERIF; ctx.textAlign = 'center'; ctx.fillText(S.names, 0, fh / 2 - 60);
        ctx.restore(); break; }
      case 'strip': {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
        var fh2 = 560, gap = 40, y0 = H / 2 - fh2 / 2 - 60, pos = (lt / sg.dur) * (fh2 * 0.8 + gap) * ids.length * 0.55;
        ctx.fillStyle = '#000'; ctx.fillRect(0, y0 - 70, W, fh2 + 140);
        for (var hx = -((pos * 1.1) % 80); hx < W; hx += 80) { ctx.fillStyle = '#EDE3CF'; ctx.fillRect(hx + 20, y0 - 52, 36, 26); ctx.fillRect(hx + 20, y0 + fh2 + 26, 36, 26); }
        ids.forEach(function (pid, i) { var x = 60 + i * (fh2 * 0.8 + gap) - pos; if (x > W || x < -fh2) return; cover(ctx, pid, x, y0, fh2 * 0.8, fh2, 1.02); });
        ctx.fillStyle = '#EDE3CF'; ctx.font = '500 34px ' + MONO; ctx.textAlign = 'center'; ctx.fillText(S.names.toUpperCase() + (S.date ? '  ·  ' + S.date : ''), W / 2, y0 + fh2 + 170);
        break; }
      case 'tv': {
        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
        var roll = Math.max(0, 1 - lt / (beat * 0.6)), jit = Math.sin(t * 90) * 3;
        ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(50, 260, W - 100, H - 620, 60) : ctx.rect(50, 260, W - 100, H - 620); ctx.clip();
        blurBg(ctx, id, 0.55); contain(ctx, id, 50 + jit, 260 - roll * (H - 620), W - 100, H - 620, 1.02);
        if (roll > 0) contain(ctx, id, 50, 260 + (1 - roll) * (H - 620), W - 100, H - 620, 1.02);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (var yy = 260; yy < H - 360; yy += 6) ctx.fillRect(50, yy, W - 100, 2);
        ctx.restore();
        ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(120, 330, 12, 0, Math.PI * 2); if (Math.floor(t * 2) % 2) ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '600 34px ' + MONO; ctx.textAlign = 'left'; ctx.fillText('PLAY ▶', 145, 342);
        ctx.textAlign = 'right'; ctx.fillText(S.date || '', W - 110, H - 400); break; }
      case 'strobe': {
        var half = beat / 2, on = (lt % half) < half * 0.7;
        if (on) { blurBg(ctx, id, 0.35); contain(ctx, id, 30, 50, W - 60, H - 220, 1.04); } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
        break; }
      case 'rgb': {
        blurBg(ctx, id, 0.5); var off = 18 * Math.exp(-(lt % beat) / (beat * 0.2));
        ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'screen';
        contain(ctx, id, 40 - off, 60, W - 80, H - 240, 1.02); contain(ctx, id, 40 + off, 60, W - 80, H - 240, 1.02);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; contain(ctx, id, 40, 60, W - 80, H - 240, 1.02);
        if (off > 6) { for (var sl = 0; sl < 5; sl++) { var sy = ((sg.r * 997 + sl * 331) % 1) * H, sh = 30 + sl * 12; try { ctx.drawImage(S.canvas, 0, sy, W, sh, (sl % 2 ? 1 : -1) * off * 2, sy, W, sh); } catch (e) {} } }
        break; }
    }
    if (T.frame && sg.layout === 'single') frameBorder(ctx, T, 0.55);
  }

  // ---------- title / end cards (one look per template) ----------
  function frameBorder(ctx, T, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = T.gold; ctx.lineWidth = 6; ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.lineWidth = 2; ctx.strokeRect(52, 52, W - 104, H - 104);
    ctx.fillStyle = T.gold; ctx.fillRect(36, H - 150, W - 72, 26); ctx.fillStyle = T.gold2 || T.gold; ctx.fillRect(36, H - 118, W - 72, 8);
    ctx.restore();
  }
  function kolam(ctx, cx, cy, r, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
    for (var i = -2; i <= 2; i++) for (var j = -2; j <= 2; j++) { if (Math.abs(i) + Math.abs(j) > 2) continue; ctx.beginPath(); ctx.arc(cx + i * r, cy + j * r, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); for (var a = 0; a < 4; a++) { var ang = a * Math.PI / 2; ctx.moveTo(cx + Math.cos(ang) * r * 2.6, cy + Math.sin(ang) * r * 2.6); ctx.arc(cx, cy, r * 2.6, ang, ang + Math.PI / 2 * 0.8); }
    ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function wrapText(ctx, text, x, y, maxW, lh) {
    var words = String(text || '').split(' '), line = '', lines = [];
    words.forEach(function (w) { var tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > maxW && line) { lines.push(line); line = w; } else line = tt; });
    if (line) lines.push(line);
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
    return lines.length;
  }
  function drawCard(ctx, sg, t, beat, isEnd) {
    var T = S.T, a = ease((t - sg.start) / (beat * (isEnd ? 1 : 1.5))), lt = t - sg.start;
    var sub = isEnd ? (S.studio ? 'Photos by ' + S.studio : '') : S.date;
    ctx.save(); ctx.textAlign = 'center';
    switch (T.card) {
      case 'kasavu':
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H); frameBorder(ctx, T, 1); kolam(ctx, W / 2, H * 0.3, 34, T.gold);
        ctx.globalAlpha = a; ctx.fillStyle = T.ink; ctx.font = '500 ' + (isEnd ? 92 : 118) + 'px ' + SERIF;
        var n1 = wrapText(ctx, S.names, W / 2, H * 0.47, W - 220, 124);
        ctx.fillStyle = T.deep; ctx.font = '500 ' + (isEnd ? 34 : 38) + 'px ' + MONO; ctx.fillText(sub, W / 2, H * 0.47 + n1 * 124 + 50);
        if (isEnd) { ctx.fillStyle = T.ink; ctx.font = '500 28px ' + MONO; ctx.fillText('made with PicGrades', W / 2, H * 0.47 + n1 * 124 + 110); }
        break;
      case 'minimal':
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = a; ctx.strokeStyle = T.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 160 * a, H * 0.4); ctx.lineTo(W / 2 + 160 * a, H * 0.4); ctx.stroke();
        ctx.fillStyle = T.ink; ctx.font = 'italic 400 110px ' + SERIF; var n2 = wrapText(ctx, S.names, W / 2, H * 0.5, W - 200, 116);
        ctx.fillStyle = T.deep; ctx.font = '500 32px ' + MONO; ctx.fillText(sub, W / 2, H * 0.5 + n2 * 116 + 30);
        if (isEnd) ctx.fillText('made with PicGrades', W / 2, H * 0.5 + n2 * 116 + 80);
        break;
      case 'bold': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var slide = (1 - ease(lt / (beat * 0.6))) * W;
        ctx.fillStyle = T.gold; ctx.fillRect(-slide, H * 0.43, W * 0.7, 18);
        ctx.fillStyle = '#fff'; ctx.font = '800 130px ' + SANS; ctx.textAlign = 'left';
        var parts = String(S.names).toUpperCase().split(/\s*&\s*/);
        parts.forEach(function (p, i) { ctx.fillText((i ? '& ' : '') + p, 80 + (i % 2 ? -slide : slide) * 0.5, H * 0.5 + i * 140); });
        ctx.fillStyle = T.gold; ctx.font = '600 36px ' + MONO; ctx.fillText(sub, 84, H * 0.5 + parts.length * 140 + 20);
        if (isEnd) { ctx.fillStyle = '#bbb'; ctx.font = '500 28px ' + MONO; ctx.fillText('made with PicGrades', 84, H * 0.5 + parts.length * 140 + 76); }
        break; }
      case 'film': {
        ctx.fillStyle = '#141210'; ctx.fillRect(0, 0, W, H);
        for (var y = 30; y < H; y += 90) { ctx.fillStyle = '#EDE3CF'; ctx.fillRect(26, y, 34, 50); ctx.fillRect(W - 60, y, 34, 50); }
        var txt = S.names.toUpperCase(), shown = Math.floor(txt.length * Math.min(1, lt / (beat * 2)));
        ctx.fillStyle = '#EDE3CF'; ctx.font = '600 72px ' + MONO; var n3 = wrapText(ctx, txt.slice(0, shown) + (shown < txt.length && Math.floor(t * 4) % 2 ? '▍' : ''), W / 2, H * 0.46, W - 200, 90);
        ctx.globalAlpha = a; ctx.fillStyle = T.gold; ctx.font = '500 34px ' + MONO; ctx.fillText(sub, W / 2, H * 0.46 + n3 * 90 + 40);
        if (isEnd) { ctx.fillStyle = '#aaa'; ctx.font = '500 26px ' + MONO; ctx.fillText('made with PicGrades', W / 2, H * 0.46 + n3 * 90 + 96); }
        break; }
      case 'festive': {
        var gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#FF9F1C'); gr.addColorStop(0.55, '#E4572E'); gr.addColorStop(1, '#C2185B');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2, H * 0.3); ctx.rotate(lt * 0.4);
        for (var i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? '#FFE66D' : '#fff'; ctx.beginPath(); ctx.arc(110, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(170, 0, 7, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.font = '600 120px ' + SERIF; var n4 = wrapText(ctx, S.names, W / 2, H * 0.5, W - 180, 126);
        ctx.fillStyle = '#FFE66D'; ctx.font = '600 38px ' + MONO; ctx.fillText(sub, W / 2, H * 0.5 + n4 * 126 + 40);
        if (isEnd) { ctx.fillStyle = '#fff'; ctx.font = '500 28px ' + MONO; ctx.fillText('made with PicGrades', W / 2, H * 0.5 + n4 * 126 + 96); }
        break; }
      case 'neon': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var flick = (Math.sin(t * 37) > -0.85) ? 1 : 0.35;
        ctx.globalAlpha = a * flick; ctx.shadowBlur = 40; ctx.shadowColor = T.gold; ctx.fillStyle = '#FFE0F0'; ctx.font = '800 120px ' + SANS;
        var n5 = wrapText(ctx, String(S.names).toUpperCase(), W / 2, H * 0.48, W - 160, 130);
        ctx.shadowColor = T.deep; ctx.fillStyle = '#D9FAFF'; ctx.font = '600 40px ' + MONO; ctx.fillText(sub, W / 2, H * 0.48 + n5 * 130 + 40);
        if (isEnd) { ctx.shadowBlur = 0; ctx.fillStyle = '#aaa'; ctx.font = '500 28px ' + MONO; ctx.fillText('made with PicGrades', W / 2, H * 0.48 + n5 * 130 + 100); }
        break; }
    }
    ctx.restore();
  }
  function lightCard() { return ['kasavu', 'minimal'].indexOf(S.T.card) > -1; }
  function watermark(ctx, onPaper) {
    ctx.save(); ctx.font = '500 26px ' + MONO; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    if (onPaper) ctx.fillStyle = 'rgba(59,42,26,0.35)'; else { ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6; }
    ctx.fillText('PicGrades', W - 70, H - 170); ctx.restore();
  }

  // ---------- one frame ----------
  function one(ctx, sg, t, beat) { if (sg.type === 'shot') drawShot(ctx, sg, t, beat); else drawCard(ctx, sg, t, beat, sg.type === 'end'); }
  function draw(ctx, P, t) {
    var T = S.T, fx = T.fx, segs = P.segs, beat = P.beat;
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    var i = 0; while (i < segs.length - 1 && t >= segs[i + 1].start) i++;
    var seg = segs[i], prev = segs[i - 1], into = t - seg.start, bp = (t % beat) / beat, bn = Math.floor(t / beat);
    // beat pulse + shake on the bar
    var pulse = 1 + (fx.pulse || 0) * Math.exp(-bp * 6);
    var sh = fx.shake && seg.type === 'shot' && bn % 4 === 0 ? fx.shake * Math.exp(-bp * 8) : 0;
    ctx.translate(W / 2 + (sh ? Math.sin(t * 80) * sh : 0), H / 2 + (sh ? Math.cos(t * 70) * sh : 0)); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -H / 2);
    var tr = seg.trans || 'fade', dur = tr === 'cut' ? 0 : tr === 'glitch' || tr === 'flash' ? beat * 0.25 : Math.min(0.45, beat * 0.6);
    if (prev && into < dur) {
      var p = ease(into / dur);
      if (tr === 'slide') { ctx.save(); ctx.translate(0, -H * p); one(ctx, prev, t, beat); ctx.restore(); ctx.save(); ctx.translate(0, H * (1 - p)); one(ctx, seg, t, beat); ctx.restore(); }
      else if (tr === 'whip') { ctx.save(); ctx.translate(-W * p, 0); one(ctx, prev, t, beat); ctx.restore(); ctx.save(); ctx.translate(W * (1 - p), 0); one(ctx, seg, t, beat); ctx.restore();
        ctx.globalAlpha = 0.25 * Math.sin(p * Math.PI); try { ctx.drawImage(S.canvas, 40, 0); ctx.drawImage(S.canvas, -40, 0); } catch (e) {} ctx.globalAlpha = 1; }
      else if (tr === 'zoom' || tr === 'zoomfade') { scaled(ctx, W / 2, H / 2, 1 + p * 0.5, function () { ctx.globalAlpha = 1 - p; one(ctx, prev, t, beat); }); ctx.globalAlpha = p;
        scaled(ctx, W / 2, H / 2, 0.85 + 0.15 * p, function () { one(ctx, seg, t, beat); }); ctx.globalAlpha = 1; }
      else if (tr === 'flash') { one(ctx, seg, t, beat); ctx.fillStyle = 'rgba(255,255,255,' + (1 - p) + ')'; ctx.fillRect(0, 0, W, H); }
      else if (tr === 'glitch') { one(ctx, seg, t, beat); for (var g = 0; g < 7; g++) { var gy = ((g * 0.137 + seg.r) % 1) * H, gh = 40 + g * 15, gx = (g % 2 ? 1 : -1) * 60 * (1 - p); try { ctx.drawImage(S.canvas, 0, gy, W, gh, gx, gy, W, gh); } catch (e) {} } }
      else { one(ctx, prev, t, beat); ctx.globalAlpha = p; one(ctx, seg, t, beat); ctx.globalAlpha = 1; }
    } else one(ctx, seg, t, beat);
    ctx.restore();
    // effects over the frame
    if (fx.flashEvery && seg.type === 'shot' && bn > 0 && bn % fx.flashEvery === 0 && bp < 0.5) { ctx.fillStyle = 'rgba(' + fx.flash + ',' + (fx.flashA * (1 - bp * 2)) + ')'; ctx.fillRect(0, 0, W, H); }
    if (fx.leak && seg.type === 'shot') {
      var lx = W * (0.5 + 0.5 * Math.sin(t * 0.35)), lg = ctx.createRadialGradient(lx, H * 0.15, 10, lx, H * 0.15, W * 0.9);
      lg.addColorStop(0, 'rgba(255,190,120,0.28)'); lg.addColorStop(1, 'rgba(255,190,120,0)'); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    }
    if (fx.confetti && seg.type === 'shot') {
      var cols = ['#FFE66D', '#FF9F1C', '#FF4F79', '#7AE7C7', '#ffffff'];
      for (var c = 0; c < 46; c++) { var sx = ((c * 0.6180339) % 1) * W, sp = 180 + (c % 7) * 40, sy = ((t * sp + c * 211) % (H + 80)) - 40, rot = t * (2 + c % 5) + c;
        ctx.save(); ctx.translate(sx + Math.sin(t * 2 + c) * 30, sy); ctx.rotate(rot); ctx.fillStyle = cols[c % cols.length]; ctx.fillRect(-9, -4, 18, 8); ctx.restore(); }
    }
    var showing = (prev && into < dur && into / dur < 0.5) ? prev : seg;
    watermark(ctx, showing.type !== 'shot' && lightCard());
  }

  // ---------- audio ----------
  function audioCtx() { if (!S.ac) S.ac = new (window.AudioContext || window.webkitAudioContext)(); return S.ac; }
  function loadTrack(tr) {
    if (!tr) return Promise.resolve(null);
    if (S.buffers[tr.id]) return Promise.resolve(S.buffers[tr.id]);
    return fetch(tr.file).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
      return new Promise(function (res, rej) { audioCtx().decodeAudioData(ab, res, rej); });
    }).then(function (buf) { S.buffers[tr.id] = buf; return buf; });
  }
  function startAudio(buf, dest, dur) {
    var ac = audioCtx(); if (!buf) return null;
    var src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.connect(g); g.connect(dest);
    var t0 = ac.currentTime + 0.05;
    g.gain.setValueAtTime(1, t0); g.gain.setValueAtTime(1, t0 + Math.max(0, dur - 1.5)); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    var from = (S.track && S.track.beat0) || 0;   // your own song: start on its first beat
    if (buf.duration - from < dur) from = 0;
    src.start(t0, from, dur + 0.1);
    return { src: src, t0: t0 };
  }
  function clock(aud) { var ac = S.ac; var base = aud ? aud.t0 : null; var p0 = performance.now(); return function () { return aud && ac ? ac.currentTime - base : (performance.now() - p0) / 1000; }; }

  // ---------- preview ----------
  function stopPreview() { if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; if (S.aud) { try { S.aud.src.stop(); } catch (e) {} S.aud = null; } S.playBtn.classList.remove('hide'); }
  function play() {
    stopPreview(); var P = plan(); if (!P.used) { msg('Choose at least one photo.'); return; }
    S.playBtn.classList.add('hide'); msg('');
    var ac = audioCtx(); if (ac.state === 'suspended') ac.resume();
    loadTrack(S.track).then(function (buf) {
      S.aud = startAudio(buf, ac.destination, P.dur); var now = clock(S.aud), ctx = S.canvas.getContext('2d');
      (function loop() { var t = now(); if (t >= P.dur) { draw(ctx, P, P.dur - 0.001); stopPreview(); return; } draw(ctx, P, Math.max(0, t)); S.raf = requestAnimationFrame(loop); })();
    }).catch(function () { msg('The music could not load. Check the internet and try again.'); stopPreview(); });
  }

  // ---------- export ----------
  function pickType() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < list.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  function exportReel() {
    stopPreview();
    var P = plan(); if (!P.used) { msg('Choose at least one photo.'); return; }
    if (!window.MediaRecorder || !S.canvas.captureStream) { msg('This phone cannot make videos in the browser. Please update the phone or try Chrome.'); return; }
    var type = pickType(), ac = audioCtx(); if (ac.state === 'suspended') ac.resume();
    S.goBtn.disabled = true; S.busy = true; msg('Making your reel… keep this screen open.'); S.bar.style.width = '0%'; S.barWrap.style.display = 'block';
    S.ctrls.style.display = 'none'; S.status.classList.add('on'); S.wrap.querySelector('.rl-panel').scrollTop = 0;
    loadTrack(S.track).then(function (buf) {
      var vstream = S.canvas.captureStream(FPS), tracks = vstream.getVideoTracks();
      var dest = null; if (buf) { dest = ac.createMediaStreamDestination(); dest.stream.getAudioTracks().forEach(function (t) { tracks.push(t); }); }
      var stream = new MediaStream(tracks), chunks = [];
      var rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 8000000 } : undefined);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      var ctx = S.canvas.getContext('2d'); draw(ctx, P, 0);
      rec.onstop = function () {
        S.busy = false; S.goBtn.disabled = false; S.barWrap.style.display = 'none'; S.status.classList.remove('on');
        var mt = (rec.mimeType || type || 'video/webm').split(';')[0], blob = new Blob(chunks, { type: mt });
        var ext = mt.indexOf('mp4') > -1 ? 'mp4' : 'webm';
        S.result = new File([blob], slug(S.names) + '_reel.' + ext, { type: mt });
        showResult();
      };
      rec.start(500);
      var lock = null; try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }, function () {}); } catch (e) {}
      var left = false, onHide = function () { if (document.hidden && !left) { left = true; rec.onstop = function () { stopped('The reel stopped because the phone left this screen. Keep the screen open and try again.'); }; try { rec.stop(); } catch (e) {} } };
      document.addEventListener('visibilitychange', onHide);
      var release = function () { document.removeEventListener('visibilitychange', onHide); try { if (lock) lock.release(); } catch (e) {} };
      var stopped = function (t) { release(); cancelAnimationFrame(S.raf); if (aud && aud.src) try { aud.src.stop(); } catch (e) {} chunks = []; S.busy = false; S.goBtn.disabled = false; S.barWrap.style.display = 'none'; S.status.classList.remove('on'); S.ctrls.style.display = ''; msg(t); };
      var _onstop = rec.onstop; rec.onstop = function () { release(); _onstop(); };
      var aud = buf ? startAudio(buf, dest, P.dur) : null, now = clock(aud);
      (function loop() {
        var t = now();
        if (left || !S) return;
        if (t >= P.dur) { draw(ctx, P, P.dur - 0.001); setTimeout(function () { rec.stop(); }, 120); return; }
        draw(ctx, P, Math.max(0, t)); var pc = Math.min(100, t / P.dur * 100); S.bar.style.width = pc.toFixed(1) + '%';
        S.status.firstChild.textContent = Math.floor(pc) + '%'; S.status.children[1].textContent = 'Making your reel · ' + Math.floor(t) + ' / ' + Math.round(P.dur) + ' s';
        msg('Making your reel… ' + Math.floor(t) + ' / ' + Math.round(P.dur) + ' s · keep this screen open');
        S.raf = requestAnimationFrame(loop);
      })();
    }).catch(function (e) { S.busy = false; S.goBtn.disabled = false; S.barWrap.style.display = 'none'; S.status.classList.remove('on'); S.ctrls.style.display = ''; msg('Could not make the reel: ' + (e && e.message || e)); });
  }
  function showResult() {
    var url = URL.createObjectURL(S.result); URLS.push(url);   // freed when the maker closes
    S.video = el('video', { src: url, controls: '', playsinline: '', loop: '' });
    S.canvas.style.display = 'none'; S.playBtn.classList.add('hide'); S.stage.appendChild(S.video);
    S.ctrls.style.display = 'none'; S.done.style.display = 'block';
    msg('Your reel is ready (' + Math.round(S.result.size / 1048576 * 10) / 10 + ' MB).' + (S.result.type.indexOf('mp4') < 0 ? ' This phone made a .webm video — Instagram may need it converted.' : ''));
  }
  function shareResult() {
    var f = S.result; if (!f) return;
    if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: S.names }).catch(function () {}); return; }
    downloadResult();
  }
  function downloadResult() {
    var f = S.result; if (!f) return;
    var u = URL.createObjectURL(f), a = el('a', { href: u, download: f.name }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 10000);
  }

  function msg(t) { if (S && S.msg) S.msg.textContent = t || ''; }

  // ---------- UI ----------
  function chips(row, list, cur, onPick) {
    row.innerHTML = '';
    list.forEach(function (it) {
      var b = el('button', { type: 'button', class: 'rl-chip' + (it.v === cur ? ' on' : ''), text: it.t, onclick: function () { row.querySelectorAll('.rl-chip').forEach(function (c) { c.classList.remove('on'); }); b.classList.add('on'); onPick(it.v); } });
      row.appendChild(b);
    });
  }
  function renderMusic() {
    chips(S.musicRow, S.tracks.map(function (t) { return { t: t.title, v: t.id }; }).concat([{ t: 'No music', v: '' }, { t: '+ Your music…', v: '__own' }]), S.track ? S.track.id : '', function (v) {
      if (v === '__own') { S.ownInput.click(); renderMusic(); return; }
      S.track = S.tracks.filter(function (t) { return t.id === v; })[0] || null; renderThumbs(); stopPreview();
    });
  }
  // ---------- your own music: stays on this phone, never uploaded; gone when the reel maker closes ----------
  function findBeat(buf) {
    var sr = buf.sampleRate, n = Math.min(buf.length, Math.round(sr * 90)), hop = Math.round(sr * 0.01), chs = [];
    for (var c = 0; c < Math.min(2, buf.numberOfChannels); c++) chs.push(buf.getChannelData(c));
    var a = Math.exp(-2 * Math.PI * 160 / sr), y = 0, acc = 0, env = [];
    for (var i = 0; i < n; i++) { var x = chs.length > 1 ? (chs[0][i] + chs[1][i]) / 2 : chs[0][i]; y = (1 - a) * x + a * y; acc += y * y; if ((i + 1) % hop === 0) { env.push(Math.sqrt(acc / hop)); acc = 0; } }
    var on = env.map(function (v, k) { return k ? Math.max(0, v - env[k - 1]) : 0; });
    var best = 0, bestL = 50;
    for (var L = 33; L <= 100; L++) {      // 60–180 beats per minute
      var r = 0; for (var k = 0; k + L < on.length; k++) r += on[k] * on[k + L];
      var bpm = 6000 / L, w = Math.exp(-Math.pow(Math.log2(bpm / 118), 2) / 0.5); r *= w;
      if (r > best) { best = r; bestL = L; }
    }
    // the beat rarely lands on a whole 10 ms step, so fine-tune the gap and the start together
    function comb(P, o) { var sum = 0; for (var q = o; q < on.length; q += P) { var j = Math.round(q); sum += on[j] + 0.5 * ((on[j - 1] || 0) + (on[j + 1] || 0)); } return sum; }
    var P = bestL, phase = 0, pb = -1;
    for (var p = bestL - 1; p <= bestL + 1; p += 0.02) for (var o = 0; o < p; o += 0.5) { var v = comb(p, o); if (v > pb) { pb = v; P = p; phase = o; } }
    var bpm2 = 6000 / P; while (bpm2 < 75) bpm2 *= 2; while (bpm2 > 165) bpm2 /= 2;
    return { bpm: Math.round(bpm2 * 10) / 10, beat0: Math.round(phase * hop / sr * 1000) / 1000 };
  }
  function addOwnMusic(file) {
    if (!file) return;
    stopPreview(); msg('Listening to your music for its beat…');
    file.arrayBuffer().then(function (ab) { return new Promise(function (res, rej) { audioCtx().decodeAudioData(ab, res, rej); }); }).then(function (buf) {
      var b = findBeat(buf), id = 'own';
      S.buffers[id] = buf;
      var tr = { id: id, title: 'Yours: ' + String(file.name || 'music').replace(/\.[^.]+$/, '').slice(0, 24), bpm: b.bpm, beat0: b.beat0, own: true };
      S.tracks = S.tracks.filter(function (t) { return t.id !== id; }).concat([tr]); S.track = tr;
      renderMusic(); renderThumbs();
      msg('Your music: about ' + Math.round(b.bpm) + ' beats per minute — the photos will change on its beat. It stays on this phone only.');
    }).catch(function () { msg('This music file could not be read. Try an MP3 or M4A song.'); });
  }
  function renderThumbs() {
    S.thumbs.innerHTML = '';
    var n = 0;
    S.photos.forEach(function (p) {
      var num = p.on ? ++n : 0;
      var b = el('button', { type: 'button', class: 'rl-th' + (p.on ? '' : ' off'), 'aria-label': p.on ? 'Remove photo' : 'Add photo', onclick: function () { p.on = !p.on; renderThumbs(); stopPreview(); } },
        [el('img', { src: 'https://lh3.googleusercontent.com/d/' + p.id + '=w160', alt: '', loading: 'lazy' }), el('span', { text: p.on ? String(num) : '+' })]);
      S.thumbs.appendChild(b);
    });
    if ((S.opt.collections || []).length) S.thumbs.appendChild(el('button', { type: 'button', class: 'rl-th rl-add', 'aria-label': 'Add more photos', onclick: openPicker }, [el('b', { text: '+' }), el('small', { text: 'Add' })]));
    var P = plan(); S.info.textContent = P.used + ' photos · ' + P.shots + ' shots · ' + Math.round(P.dur) + ' s';
  }

  // ---------- choose photos from every collection ----------
  function openPicker() {
    stopPreview();
    var cols = S.opt.collections || [], cur = 0, chosen = {};
    S.photos.forEach(function (p) { chosen[p.id] = true; });
    var grid = el('div', { class: 'rl-pgrid' }), tabs = el('div', { class: 'rl-row rl-ptabs' }), count = el('span', { class: 'rl-pcount' });
    var box = el('div', { class: 'rl-picker', role: 'dialog', 'aria-label': 'Choose photos' }, [
      el('div', { class: 'rl-top' }, [el('h3', { text: 'Choose photos' }), count, el('button', { type: 'button', class: 'rl-go rl-pdone', text: 'Done', onclick: done })]),
      tabs, grid]);
    function upd() { count.textContent = Object.keys(chosen).length + ' chosen'; }
    function showTab(i) {
      cur = i; tabs.querySelectorAll('.rl-chip').forEach(function (c, k) { c.classList.toggle('on', k === i); });
      grid.innerHTML = '';
      (cols[i].photos || []).forEach(function (p) {
        var t = el('button', { type: 'button', class: 'rl-pick' + (chosen[p.id] ? ' on' : ''), 'aria-pressed': chosen[p.id] ? 'true' : 'false' },
          [el('img', { src: 'https://lh3.googleusercontent.com/d/' + p.id + '=w240', alt: '', loading: 'lazy' }), el('i')]);
        t.addEventListener('click', function () { if (chosen[p.id]) delete chosen[p.id]; else chosen[p.id] = true; t.classList.toggle('on', !!chosen[p.id]); t.setAttribute('aria-pressed', chosen[p.id] ? 'true' : 'false'); upd(); });
        grid.appendChild(t);
      });
      grid.scrollTop = 0;
    }
    cols.forEach(function (c, i) { tabs.appendChild(el('button', { type: 'button', class: 'rl-chip', text: c.name + ' · ' + c.photos.length, onclick: function () { showTab(i); } })); });
    tabs.appendChild(el('button', { type: 'button', class: 'rl-chip', text: 'Select all here', onclick: function () { (cols[cur].photos || []).forEach(function (p) { chosen[p.id] = true; }); showTab(cur); upd(); } }));
    function done() {
      var keep = S.photos.filter(function (p) { return chosen[p.id]; }), have = {};
      keep.forEach(function (p) { have[p.id] = 1; p.on = true; });
      var added = Object.keys(chosen).filter(function (id) { return !have[id]; }).slice(0, Math.max(0, 80 - keep.length));
      S.photos = keep.concat(added.map(function (id) { return { id: id, on: true }; }));
      box.remove(); renderThumbs();
      var need = added.filter(function (id) { return !S.bitmaps[id]; });
      if (!need.length) return;
      S.goBtn.disabled = true; msg('Getting the new photos ready… 0 / ' + need.length);
      loadPhotos(need, function (d, n) { msg('Getting the new photos ready… ' + d + ' / ' + n); }).then(function (got) {
        Object.keys(got).forEach(function (id) { S.bitmaps[id] = got[id]; });
        S.photos = S.photos.filter(function (p) { return S.bitmaps[p.id]; });
        S.goBtn.disabled = false; renderThumbs(); msg('Tap ▶ to preview, then “Make video”.'); draw(S.canvas.getContext('2d'), plan(), 0.9);
      });
    }
    S.wrap.appendChild(box); upd(); if (cols.length) showTab(0);
  }

  function open(opt) {
    if (S && S.wrap) close();
    if (!document.getElementById('rl-css')) document.head.appendChild(el('style', { id: 'rl-css', text: CSS }));
    S = { opt: opt, tid: opt.style && TEMPLATES[opt.style] ? opt.style : 'south', seed: Math.floor(Math.random() * 1e9), T: null, photos: opt.photos.slice(0, 80).map(function (p) { return { id: p.id, on: true }; }), bitmaps: {}, blurs: {}, buffers: {},
      names: opt.title || 'Our Wedding',  date: opt.date || '', studio: opt.studio || '', length: 30, endCard: true, tracks: [], track: null };
    S.T = TEMPLATES[S.tid];
    var wrap = el('div', { class: 'rl-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Make a reel' });
    document.body.classList.add('rl-on');
    S.wrap = wrap;
    var top = el('div', { class: 'rl-top' }, [el('h3', { text: 'Make a reel' }), el('button', { type: 'button', class: 'rl-x', 'aria-label': 'Close', text: '×', onclick: function () { if (S.busy && !confirm('Stop making the reel?')) return; close(); } })]);
    S.stage = el('div', { class: 'rl-stage' });
    S.canvas = el('canvas', { width: W, height: H, 'aria-label': 'Reel preview' });
    S.playBtn = el('button', { type: 'button', class: 'rl-play', 'aria-label': 'Play preview', text: '▶', onclick: play });
    S.canvas.addEventListener('click', function () { if (S.raf) stopPreview(); else play(); });
    S.status = el('div', { class: 'rl-status', 'aria-live': 'polite' }, [el('b', { text: '0%' }), el('span', { text: 'Making your reel' }), el('small', { text: 'Keep this screen open' })]);
    S.stage.appendChild(S.canvas); S.stage.appendChild(S.playBtn); S.stage.appendChild(S.status);
    var panel = el('div', { class: 'rl-panel' });
    S.ctrls = el('div');
    var musicRow = el('div', { class: 'rl-row' }), lenRow = el('div', { class: 'rl-row' });
    S.thumbs = el('div', { class: 'rl-row' }); S.info = el('div', { class: 'rl-lbl', style: 'margin-top:0' });
    var names = el('input', { class: 'rl-in', value: S.names, 'aria-label': 'Names on the reel', maxlength: '40' });
    names.addEventListener('input', function () { S.names = names.value || ' '; });
    var date = el('input', { class: 'rl-in', value: S.date, 'aria-label': 'Date on the reel', maxlength: '30' });
    date.addEventListener('input', function () { S.date = date.value; });
    var endTog = el('input', { type: 'checkbox', checked: '' });
    endTog.addEventListener('change', function () { S.endCard = endTog.checked; renderThumbs(); stopPreview(); });
    S.goBtn = el('button', { type: 'button', class: 'rl-go', text: 'Make video', onclick: exportReel });
    var styleRow = el('div', { class: 'rl-row' }); S.musicRow = musicRow;
    S.ownInput = el('input', { type: 'file', accept: 'audio/*', style: 'display:none' });
    S.ownInput.addEventListener('change', function () { var f = this.files[0]; this.value = ''; addOwnMusic(f); });
    S.ctrls.appendChild(S.ownInput);
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Style' })); S.ctrls.appendChild(styleRow);
    chips(styleRow, ORDER.map(function (k) { return { t: TEMPLATES[k].name, v: k }; }), S.tid, function (v) {
      S.tid = v; S.T = TEMPLATES[v];
      var rec = S.tracks.filter(function (t) { return t.id === S.T.music; })[0]; if (rec) S.track = rec;
      renderMusic(); renderThumbs(); stopPreview(); draw(S.canvas.getContext('2d'), plan(), 0.9);
    });
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Music' })); S.ctrls.appendChild(musicRow);
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Length' })); S.ctrls.appendChild(lenRow);
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Photos · tap to remove or add' })); S.ctrls.appendChild(S.thumbs); S.ctrls.appendChild(S.info);
    S.ctrls.appendChild(el('button', { type: 'button', class: 'rl-chip', text: 'Shuffle photos', style: 'margin-bottom:10px', onclick: function () { S.photos = shuffle(S.photos); S.seed = Math.floor(Math.random() * 1e9); renderThumbs(); stopPreview(); draw(S.canvas.getContext('2d'), plan(), 0.9); } }));
    S.ctrls.appendChild(el('div', { class: 'rl-lbl', text: 'Text' })); S.ctrls.appendChild(names); S.ctrls.appendChild(date);
    S.ctrls.appendChild(el('label', { class: 'rl-tog' }, [endTog, el('span', { text: 'Ending card with the photographer’s name (the small watermark always stays)' })]));
    S.ctrls.appendChild(S.goBtn);
    S.barWrap = el('div', { class: 'rl-bar', style: 'display:none' }); S.bar = el('i'); S.barWrap.appendChild(S.bar);
    S.msg = el('p', { class: 'rl-msg', 'aria-live': 'polite' });
    S.done = el('div', { style: 'display:none' }, [
      el('button', { type: 'button', class: 'rl-go', text: 'Share (Instagram, WhatsApp…)', onclick: shareResult }),
      el('button', { type: 'button', class: 'rl-sub', text: 'Download video', onclick: downloadResult }),
      el('button', { type: 'button', class: 'rl-sub', text: 'Change and make again', onclick: function () { if (S.video) { URL.revokeObjectURL(S.video.src); S.video.removeAttribute('src'); S.video.remove(); } S.video = null; S.result = null; S.canvas.style.display = ''; S.ctrls.style.display = ''; S.done.style.display = 'none'; S.playBtn.classList.remove('hide'); msg(''); } })
    ]);
    panel.appendChild(S.ctrls); panel.appendChild(S.barWrap); panel.appendChild(S.msg); panel.appendChild(S.done);
    wrap.appendChild(top); wrap.appendChild(S.stage); wrap.appendChild(panel);
    document.body.appendChild(wrap);
    audioCtx(); // created on the tap that opened the reel maker (needed on iPhone)

    chips(lenRow, [{ t: '15 s', v: 15 }, { t: '30 s', v: 30 }, { t: '60 s', v: 60 }], 30, function (v) { S.length = v; renderThumbs(); stopPreview(); });
    msg('Getting your photos ready…');
    var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('500 100px "Cormorant Garamond"'), document.fonts.load('500 30px "IBM Plex Mono"')]).catch(function () {}) : Promise.resolve();
    Promise.all([
      fetch('/app/music/tracks.json').then(function (r) { return r.json(); }).catch(function () { return { tracks: [] }; }),
      loadPhotos(S.photos.map(function (p) { return p.id; }), function (d, n) { msg('Getting your photos ready… ' + d + ' / ' + n); }),
      fontsReady
    ]).then(function (r) {
      if (!S || S.wrap !== wrap) return;
      S.tracks = r[0].tracks || [];
      S.bitmaps = r[1]; S.track = S.tracks.filter(function (t) { return t.id === S.T.music; })[0] || S.tracks[0] || null;
      S.photos = S.photos.filter(function (p) { return S.bitmaps[p.id]; });
      renderMusic();
      renderThumbs();
      if (!S.photos.length) { msg('The photos could not be loaded. Check the internet and try again.'); S.goBtn.disabled = true; return; }
      msg('Tap ▶ to preview, then “Make video”.');
      draw(S.canvas.getContext('2d'), plan(), 0.9);
    }).catch(function (e) { msg('Something went wrong: ' + (e && e.message || e)); });
  }
  function close() {
    if (!S) return; stopPreview();
    if (S.wrap) S.wrap.remove(); document.body.classList.remove('rl-on');
    if (S.ac && S.ac.close) S.ac.close().catch(function () {});
    if (S.buffers) delete S.buffers.own;   // your own music is let go right away
    freeUrls(); S = null;
  }
  window.PGReel = { open: open, close: close, styles: ORDER,
    frame: function (t) { if (S) draw(S.canvas.getContext('2d'), plan(), t); return S ? plan().dur : 0; },  // used by tests
    setStyle: function (k) { if (S && TEMPLATES[k]) { S.tid = k; S.T = TEMPLATES[k]; } },
    state: function () { return S ? { track: S.track, own: !!(S.buffers && S.buffers.own) } : null; } };
})();
